import express from 'express';
import { UUID_PATTERN, createAdminToolkit, displayNameOf, normalizeStatus, sendAdminError } from './adminAuth.js';

const DAY_MS = 86400000;
const UNIVERSE_TTL_MS = 60 * 1000;
const PAGE_SIZES = [10, 25, 50, 100];
const EVENT_RANGES = { '7d': 7, '30d': 30, '90d': 90 };
const STALE_REQUEST_HOURS = 48;
const DORMANT_DAYS = 90;

// Booking or playing does not require the skill quiz, so skill rating is tracked as a
// separate struggle rather than a funnel step.
const FUNNEL_STAGES = [
  { id: 'signed_up', label: 'Signed up', stuckSegment: null },
  { id: 'confirmed', label: 'Email confirmed', stuckSegment: 'stuck_unconfirmed' },
  { id: 'profile', label: 'Profile complete', stuckSegment: 'stuck_profile' },
  { id: 'first_activity', label: 'First activity', stuckSegment: 'stuck_first_activity' },
  { id: 'repeat', label: 'Came back (2+)', stuckSegment: 'one_and_done' },
];

const CHECKLIST_ITEMS = [
  ...FUNNEL_STAGES.slice(0, 3),
  { id: 'skill', label: 'Skill rated', optional: true },
  ...FUNNEL_STAGES.slice(3),
];

const STUCK_REASONS = {
  stuck_unconfirmed: 'Email not confirmed',
  stuck_profile: 'No profile, username, or avatar yet',
  stuck_skill: 'Has not rated their skill (quiz or DUPR)',
  stuck_first_activity: 'No booking, match, or tournament yet',
  one_and_done: 'Only one activity, never came back',
};

const SEGMENT_TYPES = [
  ...Object.keys(STUCK_REASONS),
  'dormant',
  'unanswered_requests',
  'stale_matches',
  'booking_issues',
  'registration_issues',
];

const STRUGGLE_EVENT_NAMES = [
  'booking_blocked',
  'booking_failed',
  'booking_abandoned',
  'search_no_results',
  'login_failed',
  'signup_failed',
  'quiz_abandoned',
  'client_error',
];

const manilaDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(date);

const isMissingTable = (error) => error?.code === 'PGRST205' || error?.code === '42P01';

const fetchAll = async (buildQuery, chunk = 1000) => {
  const rows = [];
  for (let from = 0; ; from += chunk) {
    const { data, error } = await buildQuery().range(from, from + chunk - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < chunk) break;
  }
  return rows;
};

const listAllAuthUsers = async (supabaseAdmin) => {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...(data?.users || []));
    if (!data?.users || data.users.length < 1000) break;
  }
  return users;
};

const isPlayerProfile = (profile) => {
  const roles = Array.isArray(profile.roles) ? profile.roles : [];
  if (profile.active_role === 'ADMIN' || roles.includes('ADMIN')) return false;
  return profile.active_role === 'PLAYER' || roles.includes('PLAYER');
};

const daysSince = (iso, now) => (iso ? (now - new Date(iso).getTime()) / DAY_MS : Infinity);

const countBy = (items, keyFn) => {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (key == null || key === '') continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
};

export const createAdminPlayersRouter = ({ supabaseAdmin, requireSupabaseAdmin, requireAuthenticatedSession, limiter }) => {
  const router = express.Router();
  if (limiter) router.use(limiter);

  const { requireAdmin } = createAdminToolkit({ supabaseAdmin, requireSupabaseAdmin, requireAuthenticatedSession });

  let universeCache = null;

  // Everything the overview and segments need, computed in one pass and reused briefly.
  const loadUniverse = async () => {
    if (universeCache && universeCache.expiresAt > Date.now()) return universeCache.value;

    const [authUsers, profiles, quizzes, bookings, matchPlayers, matches, registrations, requests, sessions] = await Promise.all([
      listAllAuthUsers(supabaseAdmin),
      fetchAll(() =>
        supabaseAdmin
          .from('profiles')
          .select('id, full_name, username, email, avatar_url, active_role, roles, account_status, skill_rating, dupr_rating, created_at, deleted_at')
      ),
      fetchAll(() => supabaseAdmin.from('user_quiz_results').select('user_id, is_completed')),
      fetchAll(() => supabaseAdmin.from('bookings').select('player_id, date, status, payment_status')),
      fetchAll(() => supabaseAdmin.from('match_players').select('match_id, player_id')),
      fetchAll(() => supabaseAdmin.from('matches').select('id, host_id, status, match_date')),
      fetchAll(() => supabaseAdmin.from('tournament_registrations').select('player_id, status')),
      fetchAll(() => supabaseAdmin.from('match_requests').select('sender_id, receiver_id, status, created_at')),
      fetchAll(() => supabaseAdmin.from('sessions').select('user_id, created_at')),
    ]);

    const now = Date.now();
    const today = manilaDate();
    const profileById = new Map(profiles.map((p) => [p.id, p]));
    const quizDone = new Set(quizzes.filter((q) => q.is_completed !== false).map((q) => q.user_id));
    const matchById = new Map(matches.map((m) => [m.id, m]));

    const perUser = new Map();
    const statsFor = (id) => {
      if (!perUser.has(id)) {
        perUser.set(id, {
          bookings: 0,
          matches: 0,
          registrations: 0,
          bookingIssues: [],
          staleMatches: 0,
          registrationIssues: [],
          pendingRequests: 0,
        });
      }
      return perUser.get(id);
    };

    for (const b of bookings) {
      if (!b.player_id) continue;
      const s = statsFor(b.player_id);
      const status = String(b.status || '').toLowerCase();
      if (status !== 'cancelled') s.bookings += 1;
      if (status === 'cancelled') s.bookingIssues.push('cancelled booking');
      else if (status === 'no_show') s.bookingIssues.push('no-show');
      else if (b.date < today && status === 'pending' && String(b.payment_status || '').toLowerCase() !== 'paid') {
        s.bookingIssues.push('unpaid pending booking past its date');
      }
    }

    const matchMembership = new Map();
    for (const mp of matchPlayers) {
      if (!matchMembership.has(mp.player_id)) matchMembership.set(mp.player_id, new Set());
      matchMembership.get(mp.player_id).add(mp.match_id);
    }
    for (const m of matches) {
      if (!m.host_id) continue;
      if (!matchMembership.has(m.host_id)) matchMembership.set(m.host_id, new Set());
      matchMembership.get(m.host_id).add(m.id);
    }
    for (const [playerId, matchIds] of matchMembership) {
      const s = statsFor(playerId);
      for (const matchId of matchIds) {
        const match = matchById.get(matchId);
        if (!match) continue;
        s.matches += 1;
        if (match.status === 'Upcoming' && match.match_date && match.match_date < today) s.staleMatches += 1;
      }
    }

    for (const r of registrations) {
      if (!r.player_id) continue;
      const s = statsFor(r.player_id);
      const status = String(r.status || '').toLowerCase();
      if (status !== 'withdrawn' && status !== 'rejected') s.registrations += 1;
      if (['rejected', 'withdrawn', 'waitlisted'].includes(status)) s.registrationIssues.push(status);
    }

    for (const req of requests) {
      if (req.status !== 'pending' || !req.sender_id) continue;
      if ((now - new Date(req.created_at).getTime()) / 3600000 < STALE_REQUEST_HOURS) continue;
      statsFor(req.sender_id).pendingRequests += 1;
    }

    const players = [];
    for (const authUser of authUsers) {
      const profile = profileById.get(authUser.id) || null;
      if (profile?.deleted_at) continue;
      if (profile && !isPlayerProfile(profile)) continue;

      const s = statsFor(authUser.id);
      const activities = s.bookings + s.matches + s.registrations;
      const stages = {
        signed_up: true,
        confirmed: Boolean(authUser.email_confirmed_at),
        profile: Boolean(profile && profile.username && profile.avatar_url),
        skill: Boolean(quizDone.has(authUser.id) || profile?.skill_rating || Number(profile?.dupr_rating) > 0),
        first_activity: activities >= 1,
        repeat: activities >= 2,
      };
      const stuckStage = FUNNEL_STAGES.find((stage) => !stages[stage.id]) || null;

      players.push({
        id: authUser.id,
        fullName: profile?.full_name || '',
        username: profile?.username || '',
        email: profile?.email || authUser.email || '',
        avatarUrl: profile?.avatar_url || null,
        hasProfile: Boolean(profile),
        status: normalizeStatus(profile?.account_status),
        createdAt: authUser.created_at || profile?.created_at || null,
        lastSignInAt: authUser.last_sign_in_at || null,
        emailConfirmed: stages.confirmed,
        stages,
        stuckStageId: stuckStage?.id || null,
        activities,
        ...s,
      });
    }

    const sessionsByMonth = new Map();
    for (const session of sessions) {
      if (!session.created_at || !session.user_id) continue;
      const month = session.created_at.slice(0, 7);
      if (!sessionsByMonth.has(month)) sessionsByMonth.set(month, new Set());
      sessionsByMonth.get(month).add(session.user_id);
    }

    const value = { players, sessionsByMonth, computedAt: new Date(now).toISOString() };
    universeCache = { value, expiresAt: Date.now() + UNIVERSE_TTL_MS };
    return value;
  };

  const segmentMembers = (players, type, now) => {
    switch (type) {
      case 'stuck_skill':
        return players
          .filter((p) => p.hasProfile && !p.stages.skill)
          .map((p) => ({ player: p, reason: STUCK_REASONS.stuck_skill }));
      case 'stuck_unconfirmed':
      case 'stuck_profile':
      case 'stuck_first_activity':
      case 'one_and_done': {
        const stageId = FUNNEL_STAGES.find((stage) => stage.stuckSegment === type).id;
        return players.filter((p) => p.stuckStageId === stageId).map((p) => ({ player: p, reason: STUCK_REASONS[type] }));
      }
      case 'dormant':
        return players
          .filter((p) => daysSince(p.createdAt, now) > 7 && daysSince(p.lastSignInAt, now) > DORMANT_DAYS)
          .map((p) => ({
            player: p,
            reason: p.lastSignInAt ? `No sign-in for ${Math.floor(daysSince(p.lastSignInAt, now))} days` : 'Never signed in',
          }));
      case 'unanswered_requests':
        return players
          .filter((p) => p.pendingRequests > 0)
          .map((p) => ({
            player: p,
            reason: `${p.pendingRequests} match request${p.pendingRequests === 1 ? '' : 's'} unanswered for ${STALE_REQUEST_HOURS}h+`,
          }));
      case 'stale_matches':
        return players
          .filter((p) => p.staleMatches > 0)
          .map((p) => ({ player: p, reason: `${p.staleMatches} past match${p.staleMatches === 1 ? '' : 'es'} never completed` }));
      case 'booking_issues':
        return players
          .filter((p) => p.bookingIssues.length > 0)
          .map((p) => ({ player: p, reason: summarizeIssues(p.bookingIssues) }));
      case 'registration_issues':
        return players
          .filter((p) => p.registrationIssues.length > 0)
          .map((p) => ({ player: p, reason: summarizeIssues(p.registrationIssues.map((s) => `${s} registration`)) }));
      default:
        return [];
    }
  };

  const summarizeIssues = (issues) =>
    countBy(issues, (issue) => issue)
      .map(({ key, count }) => `${count} ${key}${count > 1 && !key.endsWith('s') ? 's' : ''}`)
      .join(', ');

  router.get('/overview', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const { players, sessionsByMonth, computedAt } = await loadUniverse();
      const now = Date.now();

      let reached = players.length;
      const funnel = FUNNEL_STAGES.map((stage, index) => {
        const count = players.filter((p) => FUNNEL_STAGES.slice(0, index + 1).every((s) => p.stages[s.id])).length;
        const previous = reached;
        reached = count;
        return {
          id: stage.id,
          label: stage.label,
          count,
          dropOff: index === 0 ? 0 : previous - count,
          dropOffRate: index === 0 || previous === 0 ? 0 : (previous - count) / previous,
          stuckSegment: stage.stuckSegment,
        };
      });

      const months = [];
      const current = manilaDate().slice(0, 7);
      for (let i = 11; i >= 0; i -= 1) {
        const [y, m] = current.split('-').map(Number);
        months.push(new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 7));
      }
      const signupsByMonth = new Map(countBy(players, (p) => p.createdAt?.slice(0, 7)).map(({ key, count }) => [key, count]));
      const activityTrend = months.map((month) => ({
        month,
        label: `${new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })} '${month.slice(2, 4)}`,
        signups: signupsByMonth.get(month) || 0,
        activeUsers: sessionsByMonth.get(month)?.size || 0,
      }));

      const struggles = ['dormant', 'stuck_skill', 'unanswered_requests', 'stale_matches', 'booking_issues', 'registration_issues'].map((type) => ({
        type,
        count: segmentMembers(players, type, now).length,
      }));

      res.json({
        computedAt,
        kpis: {
          players: players.length,
          active7d: players.filter((p) => daysSince(p.lastSignInAt, now) <= 7).length,
          active30d: players.filter((p) => daysSince(p.lastSignInAt, now) <= 30).length,
          dormant90d: players.filter((p) => p.lastSignInAt && daysSince(p.lastSignInAt, now) > DORMANT_DAYS).length,
          neverSignedIn: players.filter((p) => !p.lastSignInAt).length,
          unconfirmed: players.filter((p) => !p.emailConfirmed).length,
        },
        funnel,
        activityTrend,
        struggles,
      });
    } catch (err) {
      sendAdminError(res, err, 'Failed to load player analytics.');
    }
  });

  router.get('/segment', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const type = req.query.type;
      if (!SEGMENT_TYPES.includes(type)) return res.status(400).json({ error: 'Unknown segment.' });
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const pageSize = PAGE_SIZES.includes(Number(req.query.pageSize)) ? Number(req.query.pageSize) : 25;

      const { players } = await loadUniverse();
      const members = segmentMembers(players, type, Date.now()).sort((a, b) =>
        String(b.player.lastSignInAt || b.player.createdAt || '').localeCompare(String(a.player.lastSignInAt || a.player.createdAt || ''))
      );
      const from = (page - 1) * pageSize;

      res.json({
        type,
        total: members.length,
        page,
        pageSize,
        items: members.slice(from, from + pageSize).map(({ player, reason }) => ({
          id: player.id,
          fullName: player.fullName,
          username: player.username,
          email: player.email,
          avatarUrl: player.avatarUrl,
          hasProfile: player.hasProfile,
          status: player.status,
          createdAt: player.createdAt,
          lastSignInAt: player.lastSignInAt,
          activities: player.activities,
          reason,
        })),
      });
    } catch (err) {
      sendAdminError(res, err, 'Failed to load player segment.');
    }
  });

  router.get('/events', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const range = Object.hasOwn(EVENT_RANGES, req.query.range) ? req.query.range : '30d';
      const since = new Date(Date.now() - EVENT_RANGES[range] * DAY_MS).toISOString();

      const first = await supabaseAdmin.from('player_events').select('created_at').order('created_at', { ascending: true }).limit(1);
      if (first.error) {
        if (isMissingTable(first.error)) {
          return res.json({ available: false, range, message: 'Run Documentation/migrations/2026/10/26/20261026_player_events.sql to start tracking.' });
        }
        throw first.error;
      }

      const events = await fetchAll(() =>
        supabaseAdmin
          .from('player_events')
          .select('event_name, properties, user_id, anonymous_id, session_id, created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: true })
      );

      const visitorOf = (e) => e.session_id || e.anonymous_id || e.user_id || 'unknown';
      const visitorsWith = (name) => new Set(events.filter((e) => e.event_name === name).map(visitorOf)).size;
      const ofName = (name) => events.filter((e) => e.event_name === name);
      const prop = (e, key) => (e.properties && e.properties[key] != null ? String(e.properties[key]) : null);

      const slotVisitors = visitorsWith('booking_slot_selected');
      const completedVisitors = visitorsWith('booking_completed');

      const errorGroups = new Map();
      for (const e of ofName('client_error')) {
        const key = prop(e, 'message') || 'Unknown error';
        if (!errorGroups.has(key)) errorGroups.set(key, { message: key, source: prop(e, 'source'), count: 0, users: new Set(), lastSeen: null });
        const group = errorGroups.get(key);
        group.count += 1;
        group.users.add(e.user_id || visitorOf(e));
        group.lastSeen = e.created_at;
      }

      const searchGroups = new Map();
      for (const e of ofName('search_no_results')) {
        const key = prop(e, 'query') || '';
        if (!key) continue;
        if (!searchGroups.has(key)) searchGroups.set(key, { query: key, surface: prop(e, 'surface'), count: 0, lastSeen: null });
        const group = searchGroups.get(key);
        group.count += 1;
        group.lastSeen = e.created_at;
      }

      const days = new Map();
      for (let i = EVENT_RANGES[range] - 1; i >= 0; i -= 1) {
        days.set(manilaDate(new Date(Date.now() - i * DAY_MS)), 0);
      }
      for (const e of events) {
        if (!STRUGGLE_EVENT_NAMES.includes(e.event_name)) continue;
        const day = manilaDate(new Date(e.created_at));
        if (days.has(day)) days.set(day, days.get(day) + 1);
      }

      const quizStarted = ofName('quiz_started').length;
      const quizCompleted = ofName('quiz_completed').length;

      res.json({
        available: true,
        range,
        trackingStartedAt: first.data?.[0]?.created_at || null,
        totalEvents: events.length,
        bookingFunnel: {
          steps: [
            { id: 'booking_court_viewed', label: 'Viewed a court', visitors: visitorsWith('booking_court_viewed') },
            { id: 'booking_slot_selected', label: 'Picked a time', visitors: slotVisitors },
            { id: 'booking_checkout_opened', label: 'Opened payment', visitors: visitorsWith('booking_checkout_opened') },
            { id: 'booking_completed', label: 'Booked', visitors: completedVisitors },
          ],
          abandoned: ofName('booking_abandoned').length,
          abandonRate: slotVisitors ? Math.max(0, 1 - completedVisitors / slotVisitors) : 0,
        },
        bookingBlockers: countBy(ofName('booking_blocked'), (e) => prop(e, 'reason')),
        bookingFailures: countBy(ofName('booking_failed'), (e) => prop(e, 'message')).slice(0, 10),
        noResultSearches: [...searchGroups.values()].sort((a, b) => b.count - a.count).slice(0, 15),
        authFailures: {
          login: countBy(ofName('login_failed'), (e) => prop(e, 'reason')),
          signup: countBy(ofName('signup_failed'), (e) => prop(e, 'reason')),
        },
        quiz: {
          started: quizStarted,
          completed: quizCompleted,
          abandoned: ofName('quiz_abandoned').length,
          completionRate: quizStarted ? Math.min(1, quizCompleted / quizStarted) : 0,
          abandonedAt: countBy(ofName('quiz_abandoned'), (e) =>
            prop(e, 'reason') === 'login_prompt' ? 'Login prompt' : `Question ${prop(e, 'question') || '?'}`
          ),
        },
        clientErrors: [...errorGroups.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 15)
          .map((g) => ({ message: g.message, source: g.source, count: g.count, affectedUsers: g.users.size, lastSeen: g.lastSeen })),
        dailyStruggles: [...days.entries()].map(([date, count]) => ({
          date,
          label: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
          count,
        })),
      });
    } catch (err) {
      sendAdminError(res, err, 'Failed to load tracked events.');
    }
  });

  const describeEvent = (e) => {
    const p = e.properties || {};
    switch (e.event_name) {
      case 'booking_blocked':
        return `Booking blocked: ${String(p.reason || 'unknown').replace(/_/g, ' ')}`;
      case 'booking_failed':
        return `Booking failed: ${p.message || 'unknown error'}`;
      case 'booking_abandoned':
        return `Left booking with ${p.slots || 0} slot(s) selected`;
      case 'booking_completed':
        return 'Completed a booking';
      case 'search_no_results':
        return `Search found nothing: "${p.query || ''}"`;
      case 'login_failed':
        return `Login failed: ${String(p.reason || 'other').replace(/_/g, ' ')}`;
      case 'signup_failed':
        return `Signup failed: ${String(p.reason || 'other').replace(/_/g, ' ')}`;
      case 'quiz_abandoned':
        return p.reason === 'login_prompt' ? 'Quiz stopped at the login prompt' : `Quiz abandoned at question ${p.question || '?'}`;
      case 'quiz_started':
        return 'Started the skill quiz';
      case 'quiz_completed':
        return 'Completed the skill quiz';
      case 'client_error':
        return `App error: ${p.message || 'unknown'}`;
      default:
        return e.event_name.replace(/_/g, ' ');
    }
  };

  router.get('/:playerId', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const playerId = req.params.playerId;
      if (!UUID_PATTERN.test(playerId || '')) return res.status(400).json({ error: 'Invalid player id.' });

      const [{ data: authData, error: authError }, profileRes] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(playerId),
        supabaseAdmin
          .from('profiles')
          .select('id, full_name, username, email, avatar_url, active_role, roles, account_status, skill_rating, dupr_rating, location, created_at, deleted_at')
          .eq('id', playerId)
          .maybeSingle(),
      ]);
      if (profileRes.error) throw profileRes.error;
      const authUser = authError ? null : authData?.user || null;
      const profile = profileRes.data;
      if (!authUser && !profile) return res.status(404).json({ error: 'Player not found.' });

      const safe = async (promise) => {
        const { data, error, count } = await promise;
        if (error) {
          if (isMissingTable(error)) return { data: [], count: 0 };
          throw error;
        }
        return { data: data || [], count: count ?? null };
      };

      const [quizRes, bookingsRes, memberRes, hostedRes, sentRes, receivedRes, regsRes, sessionsRes, messagesRes, achievementsRes, eventsRes] =
        await Promise.all([
          safe(supabaseAdmin.from('user_quiz_results').select('id, skill_rating, total_score, is_completed, created_at').eq('user_id', playerId).order('created_at', { ascending: false }).limit(20)),
          safe(supabaseAdmin.from('bookings').select('id, court_id, date, start_time, status, payment_status, total_price, cancelled_reason, is_no_show, created_at').eq('player_id', playerId).order('created_at', { ascending: false }).limit(50)),
          safe(supabaseAdmin.from('match_players').select('match_id').eq('player_id', playerId)),
          safe(supabaseAdmin.from('matches').select('id').eq('host_id', playerId)),
          safe(supabaseAdmin.from('match_requests').select('id, receiver_id, status, game_type, created_at, responded_at').eq('sender_id', playerId).order('created_at', { ascending: false }).limit(30)),
          safe(supabaseAdmin.from('match_requests').select('id, sender_id, status, game_type, created_at, responded_at').eq('receiver_id', playerId).order('created_at', { ascending: false }).limit(30)),
          safe(supabaseAdmin.from('tournament_registrations').select('id, tournament_id, status, rejection_reason, created_at').eq('player_id', playerId).order('created_at', { ascending: false }).limit(30)),
          safe(supabaseAdmin.from('sessions').select('device_name, last_activity, created_at', { count: 'exact' }).eq('user_id', playerId).order('created_at', { ascending: false }).limit(5)),
          safe(supabaseAdmin.from('direct_messages').select('id', { count: 'exact', head: true }).eq('sender_id', playerId)),
          safe(supabaseAdmin.from('player_achievements').select('id', { count: 'exact', head: true }).eq('player_id', playerId).eq('is_completed', true)),
          safe(supabaseAdmin.from('player_events').select('event_name, properties, path, created_at').eq('user_id', playerId).order('created_at', { ascending: false }).limit(100)),
        ]);

      const matchIds = [...new Set([...memberRes.data.map((m) => m.match_id), ...hostedRes.data.map((m) => m.id)])];
      const matchesRes = matchIds.length
        ? await safe(supabaseAdmin.from('matches').select('id, host_id, type, status, match_date, court_id, created_at').in('id', matchIds).order('match_date', { ascending: false }).limit(50))
        : { data: [] };

      const courtIds = [...new Set([...bookingsRes.data.map((b) => b.court_id), ...matchesRes.data.map((m) => m.court_id)].filter(Boolean))];
      const tournamentIds = [...new Set(regsRes.data.map((r) => r.tournament_id).filter(Boolean))];
      const otherIds = [...new Set([...sentRes.data.map((r) => r.receiver_id), ...receivedRes.data.map((r) => r.sender_id)].filter(Boolean))];
      const [courtsRes, tournamentsRes, othersRes] = await Promise.all([
        courtIds.length ? safe(supabaseAdmin.from('courts').select('id, name').in('id', courtIds)) : { data: [] },
        tournamentIds.length ? safe(supabaseAdmin.from('tournaments').select('id, name').in('id', tournamentIds)) : { data: [] },
        otherIds.length ? safe(supabaseAdmin.from('profiles').select('id, full_name, username, email').in('id', otherIds)) : { data: [] },
      ]);
      const courtName = new Map(courtsRes.data.map((c) => [c.id, c.name]));
      const tournamentName = new Map(tournamentsRes.data.map((t) => [t.id, t.name]));
      const otherName = new Map(othersRes.data.map((p) => [p.id, displayNameOf(p)]));

      const today = manilaDate();
      const activeBookings = bookingsRes.data.filter((b) => String(b.status || '').toLowerCase() !== 'cancelled').length;
      const activeRegs = regsRes.data.filter((r) => !['withdrawn', 'rejected'].includes(String(r.status || '').toLowerCase())).length;
      const activities = activeBookings + matchesRes.data.length + activeRegs;
      const stages = {
        signed_up: true,
        confirmed: Boolean(authUser?.email_confirmed_at),
        profile: Boolean(profile && profile.username && profile.avatar_url),
        skill: Boolean(quizRes.data.some((q) => q.is_completed !== false) || profile?.skill_rating || Number(profile?.dupr_rating) > 0),
        first_activity: activities >= 1,
        repeat: activities >= 2,
      };
      const stuck = FUNNEL_STAGES.find((stage) => !stages[stage.id]) || null;

      const timeline = [];
      const push = (item) => {
        if (item.at) timeline.push(item);
      };
      push({ kind: 'account', at: authUser?.created_at || profile?.created_at, title: 'Signed up', detail: authUser?.app_metadata?.provider ? `via ${authUser.app_metadata.provider}` : null });
      if (authUser?.email_confirmed_at) push({ kind: 'account', at: authUser.email_confirmed_at, title: 'Confirmed email', detail: null });
      for (const q of quizRes.data) {
        push({ kind: 'onboarding', at: q.created_at, title: 'Completed skill quiz', detail: q.skill_rating ? `Rated ${q.skill_rating}` : null });
      }
      for (const b of bookingsRes.data) {
        const status = String(b.status || '').toLowerCase();
        const struggle = status === 'cancelled' || status === 'no_show' || Boolean(b.is_no_show) || (b.date < today && status === 'pending');
        push({
          kind: 'booking',
          at: b.created_at,
          title: `Booked ${courtName.get(b.court_id) || 'a court'} for ${b.date}`,
          detail: `${b.status}${b.payment_status ? ` · ${b.payment_status}` : ''}${b.cancelled_reason ? ` · ${b.cancelled_reason}` : ''}`,
          struggle,
        });
      }
      for (const m of matchesRes.data) {
        const stale = m.status === 'Upcoming' && m.match_date && m.match_date < today;
        push({
          kind: 'match',
          at: m.created_at,
          title: `${m.host_id === playerId ? 'Hosted' : 'Joined'} a ${m.type || ''} match`.replace(/\s+/g, ' '),
          detail: `${m.match_date || 'No date'} · ${m.status}${m.court_id && courtName.get(m.court_id) ? ` · ${courtName.get(m.court_id)}` : ''}`,
          struggle: Boolean(stale),
        });
      }
      for (const r of sentRes.data) {
        push({
          kind: 'match',
          at: r.created_at,
          title: `Sent a match request to ${otherName.get(r.receiver_id) || 'a player'}`,
          detail: r.status,
          struggle: r.status === 'pending' && (Date.now() - new Date(r.created_at).getTime()) / 3600000 > STALE_REQUEST_HOURS,
        });
      }
      for (const r of receivedRes.data) {
        push({ kind: 'match', at: r.created_at, title: `Received a match request from ${otherName.get(r.sender_id) || 'a player'}`, detail: r.status });
      }
      for (const r of regsRes.data) {
        const status = String(r.status || '').toLowerCase();
        push({
          kind: 'tournament',
          at: r.created_at,
          title: `Registered for ${tournamentName.get(r.tournament_id) || 'a tournament'}`,
          detail: `${r.status}${r.rejection_reason ? ` · ${r.rejection_reason}` : ''}`,
          struggle: ['rejected', 'withdrawn', 'waitlisted'].includes(status),
        });
      }
      for (const e of eventsRes.data) {
        if (!STRUGGLE_EVENT_NAMES.includes(e.event_name) && !['quiz_started', 'booking_completed'].includes(e.event_name)) continue;
        push({
          kind: 'event',
          at: e.created_at,
          title: describeEvent(e),
          detail: e.path || null,
          struggle: STRUGGLE_EVENT_NAMES.includes(e.event_name),
        });
      }
      timeline.sort((a, b) => String(b.at).localeCompare(String(a.at)));

      res.json({
        player: {
          id: playerId,
          fullName: profile?.full_name || '',
          username: profile?.username || '',
          email: profile?.email || authUser?.email || '',
          avatarUrl: profile?.avatar_url || null,
          roles: Array.isArray(profile?.roles) && profile.roles.length ? profile.roles : [profile?.active_role || 'PLAYER'],
          status: normalizeStatus(profile?.account_status),
          hasProfile: Boolean(profile),
          isDeleted: Boolean(profile?.deleted_at),
          location: profile?.location || null,
          skillRating: profile?.skill_rating || null,
          duprRating: Number(profile?.dupr_rating) || 0,
          createdAt: authUser?.created_at || profile?.created_at || null,
          lastSignInAt: authUser?.last_sign_in_at || null,
          emailConfirmedAt: authUser?.email_confirmed_at || null,
          provider: authUser?.app_metadata?.provider || null,
        },
        checklist: CHECKLIST_ITEMS.map((item) => ({
          id: item.id,
          label: item.label,
          done: stages[item.id],
          optional: Boolean(item.optional),
        })),
        stuckStage: stuck ? { id: stuck.id, label: stuck.label, reason: stuck.stuckSegment ? STUCK_REASONS[stuck.stuckSegment] : null } : null,
        stats: {
          bookings: activeBookings,
          matches: matchesRes.data.length,
          matchRequestsSent: sentRes.data.length,
          matchRequestsReceived: receivedRes.data.length,
          tournaments: activeRegs,
          messagesSent: messagesRes.count ?? 0,
          achievements: achievementsRes.count ?? 0,
          sessions: sessionsRes.count ?? sessionsRes.data.length,
          struggles: timeline.filter((t) => t.struggle).length,
        },
        recentSessions: sessionsRes.data.map((s) => ({ device: s.device_name || 'Unknown device', lastActivity: s.last_activity || s.created_at })),
        timeline: timeline.slice(0, 150),
      });
    } catch (err) {
      sendAdminError(res, err, 'Failed to load player journey.');
    }
  });

  return router;
};
