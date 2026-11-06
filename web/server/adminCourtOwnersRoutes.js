import express from 'express';
import {
  UUID_PATTERN,
  createAdminToolkit,
  displayNameOf,
  normalizeStatus,
  sanitizeSearch,
  sendAdminError,
} from './adminAuth.js';

const COURT_STATUSES = ['Available', 'Fully Booked', 'Coming Soon', 'Maintenance', 'Setup Required'];
const LOCATION_STATUSES = ['Active', 'Closed', 'Maintenance', 'Coming Soon'];
const PENDING_VERIFICATION_STATUSES = ['PENDING', 'UNDER_REVIEW', 'RESUBMISSION_REQUESTED', 'READY_FOR_REVIEW', 'PENDING_REVIEW'];
const OWNER_FILTERS = ['all', 'has_courts', 'no_courts', 'pending_verification', 'suspended'];
const OWNER_SORTS = ['revenue', 'bookings', 'name', 'joined'];
const PAGE_SIZES = [10, 25, 50, 100];

const PROFILE_COLUMNS = 'id, full_name, username, email, avatar_url, active_role, roles, account_status, created_at, deleted_at';
const LOCATION_COLUMNS = 'id, owner_id, name, address, city, region, barangay, phone, status, is_active, image_url, court_type, created_at, updated_at';
const COURT_COLUMNS = 'id, owner_id, location_id, name, num_courts, court_type, surface_type, base_price, status, is_active, image_url, setup_complete, has_pricing, created_at, updated_at';
const BOOKING_COLUMNS = 'id, court_id, player_id, date, start_time, end_time, total_price, status, payment_status, payment_method, is_checked_in, is_no_show, guest_name, guest_email, cancelled_reason, created_at';

const manilaDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(date);

const shiftDate = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const isCancelled = (booking) => String(booking.status || '').toLowerCase() === 'cancelled';

const SERIES_RANGES = {
  '14d': { bucket: 'day', count: 14 },
  '30d': { bucket: 'day', count: 30 },
  '3m': { bucket: 'week', count: 13 },
  '6m': { bucket: 'month', count: 6 },
  '12m': { bucket: 'month', count: 12 },
};

const mondayOf = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return shiftDate(isoDate, -((d.getUTCDay() + 6) % 7));
};

const shiftMonth = (isoMonth, months) => {
  const [year, month] = isoMonth.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1 + months, 1));
  return d.toISOString().slice(0, 7);
};

const bucketKeyOf = (bucket, isoDate) =>
  bucket === 'day' ? isoDate : bucket === 'week' ? mondayOf(isoDate) : isoDate.slice(0, 7);

const formatBucketLabel = (bucket, key) => {
  const date = new Date(`${bucket === 'month' ? `${key}-01` : key}T00:00:00Z`);
  return bucket === 'month'
    ? `${date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })} '${key.slice(2, 4)}`
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

// Buckets end at today (Manila); weekly buckets start on Monday, monthly on the 1st.
const buildSeriesBuckets = (range, today) => {
  const { bucket, count } = SERIES_RANGES[range];
  let keys;
  if (bucket === 'day') {
    keys = Array.from({ length: count }, (_, i) => shiftDate(today, i - count + 1));
  } else if (bucket === 'week') {
    const currentWeek = mondayOf(today);
    keys = Array.from({ length: count }, (_, i) => shiftDate(currentWeek, (i - count + 1) * 7));
  } else {
    const currentMonth = today.slice(0, 7);
    keys = Array.from({ length: count }, (_, i) => shiftMonth(currentMonth, i - count + 1));
  }
  const startDate = bucket === 'month' ? `${keys[0]}-01` : keys[0];
  return { bucket, keys, startDate };
};

const parsePage = (req) => ({
  page: Math.max(1, Number.parseInt(req.query.page, 10) || 1),
  pageSize: PAGE_SIZES.includes(Number(req.query.pageSize)) ? Number(req.query.pageSize) : 25,
});

const hasCourtOwnerRole = (profile) =>
  profile.active_role === 'COURT_OWNER' || (Array.isArray(profile.roles) && profile.roles.includes('COURT_OWNER'));

const toOwnerProfile = (profile) => ({
  id: profile.id,
  fullName: profile.full_name || '',
  username: profile.username || '',
  email: profile.email || '',
  avatarUrl: profile.avatar_url || null,
  activeRole: profile.active_role || 'PLAYER',
  roles: Array.isArray(profile.roles) && profile.roles.length > 0 ? profile.roles : [profile.active_role || 'PLAYER'],
  status: normalizeStatus(profile.account_status),
  createdAt: profile.created_at || null,
});

const toLocation = (location) => ({
  id: location.id,
  ownerId: location.owner_id,
  name: location.name || 'Unnamed location',
  address: location.address || null,
  city: location.city || null,
  region: location.region || null,
  barangay: location.barangay || null,
  phone: location.phone || null,
  status: location.status || (location.is_active ? 'Active' : 'Closed'),
  isActive: location.is_active !== false,
  imageUrl: location.image_url || null,
  courtType: location.court_type || null,
  createdAt: location.created_at || null,
  updatedAt: location.updated_at || null,
});

const toCourt = (court) => ({
  id: court.id,
  ownerId: court.owner_id,
  locationId: court.location_id || null,
  name: court.name || 'Unnamed court',
  numCourts: Number(court.num_courts) || 1,
  courtType: court.court_type || null,
  surfaceType: court.surface_type || null,
  basePrice: Number(court.base_price) || 0,
  status: court.status || 'Setup Required',
  isActive: court.is_active !== false,
  imageUrl: court.image_url || null,
  setupComplete: Boolean(court.setup_complete),
  hasPricing: Boolean(court.has_pricing),
  createdAt: court.created_at || null,
  updatedAt: court.updated_at || null,
});

const toVerification = (row) =>
  row
    ? {
        id: row.id,
        status: row.status,
        verificationPath: row.verification_path || null,
        courtLocationName: row.court_location_name || null,
        submittedAt: row.submitted_at || row.created_at || null,
        reviewedAt: row.reviewed_at || null,
        adminNotes: row.admin_notes || null,
      }
    : null;

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

export const createAdminCourtOwnersRouter = ({
  supabaseAdmin,
  requireSupabaseAdmin,
  requireAuthenticatedSession,
  limiter,
}) => {
  const router = express.Router();
  if (limiter) router.use(limiter);

  const { requireAdmin, logAction } = createAdminToolkit({
    supabaseAdmin,
    requireSupabaseAdmin,
    requireAuthenticatedSession,
  });

  const notifyOwner = async (ownerId, { title, message, metadata }) => {
    const { error } = await supabaseAdmin.from('notifications').insert({
      user_id: ownerId,
      type: 'SYSTEM',
      title,
      message,
      action_url: '/locations',
      is_read: false,
      created_at: new Date().toISOString(),
      metadata,
    });
    if (error) console.warn('Unable to notify court owner:', error.message);
  };

  const fetchProfilesByIds = async (ids) => {
    if (ids.length === 0) return [];
    const { data, error } = await supabaseAdmin.from('profiles').select(PROFILE_COLUMNS).in('id', ids);
    if (error) throw error;
    return data || [];
  };

  const fetchNameMap = async (ids) => {
    const unique = [...new Set(ids.filter(Boolean))];
    const profiles = await fetchProfilesByIds(unique);
    return new Map(profiles.map((p) => [p.id, displayNameOf(p)]));
  };

  // Owners are anyone holding the COURT_OWNER role plus anyone who owns a location or court.
  const loadOwnerOverview = async () => {
    const today = manilaDate();
    const windowStart = shiftDate(today, -29);

    const [roleProfiles, locations, courts, verifications] = await Promise.all([
      fetchAll(() =>
        supabaseAdmin
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .is('deleted_at', null)
          .or('active_role.eq.COURT_OWNER,roles.cs.{COURT_OWNER}')
          .order('created_at', { ascending: false })
      ),
      fetchAll(() => supabaseAdmin.from('locations').select('id, owner_id')),
      fetchAll(() => supabaseAdmin.from('courts').select('id, owner_id, location_id, status, is_active')),
      fetchAll(() =>
        supabaseAdmin
          .from('court_owner_verifications')
          .select('profile_id, status, submitted_at')
          .order('submitted_at', { ascending: false })
      ),
    ]);

    const profileById = new Map(roleProfiles.map((p) => [p.id, p]));
    const extraIds = [...new Set([...locations, ...courts].map((r) => r.owner_id).filter((id) => id && !profileById.has(id)))];
    for (const profile of await fetchProfilesByIds(extraIds)) {
      if (!profile.deleted_at) profileById.set(profile.id, profile);
    }

    const courtIds = courts.map((c) => c.id);
    const bookings = courtIds.length
      ? await fetchAll(() =>
          supabaseAdmin
            .from('bookings')
            .select('court_id, date, status, total_price')
            .in('court_id', courtIds)
            .gte('date', windowStart)
        )
      : [];

    const courtOwner = new Map(courts.map((c) => [c.id, c.owner_id]));
    const latestVerification = new Map();
    for (const row of verifications) {
      if (!latestVerification.has(row.profile_id)) latestVerification.set(row.profile_id, row.status);
    }

    const stats = new Map();
    const statFor = (ownerId) => {
      if (!stats.has(ownerId)) {
        stats.set(ownerId, { locations: 0, courts: 0, activeCourts: 0, bookings30d: 0, revenue30d: 0, upcomingBookings: 0 });
      }
      return stats.get(ownerId);
    };

    locations.forEach((l) => statFor(l.owner_id).locations++);
    courts.forEach((c) => {
      const s = statFor(c.owner_id);
      s.courts += 1;
      if (c.is_active !== false && c.status === 'Available') s.activeCourts += 1;
    });
    bookings.forEach((b) => {
      if (isCancelled(b)) return;
      const s = statFor(courtOwner.get(b.court_id));
      if (b.date <= today) s.bookings30d += 1;
      if (b.date >= today) s.upcomingBookings += 1;
      if (b.date <= today) s.revenue30d += Number(b.total_price) || 0;
    });

    return [...profileById.values()].map((profile) => ({
      ...toOwnerProfile(profile),
      hasOwnerRole: hasCourtOwnerRole(profile),
      verificationStatus: latestVerification.get(profile.id) || null,
      ...statFor(profile.id),
    }));
  };

  const summarize = (owners) => ({
    total: owners.length,
    withCourts: owners.filter((o) => o.courts > 0).length,
    noCourts: owners.filter((o) => o.courts === 0).length,
    pendingVerification: owners.filter((o) => PENDING_VERIFICATION_STATUSES.includes(o.verificationStatus)).length,
    suspended: owners.filter((o) => o.status === 'Suspended').length,
    revenue30d: owners.reduce((sum, o) => sum + o.revenue30d, 0),
    bookings30d: owners.reduce((sum, o) => sum + o.bookings30d, 0),
  });

  const loadOwnerCourts = async (ownerId) => {
    const { data: locations, error: locError } = await supabaseAdmin
      .from('locations')
      .select(LOCATION_COLUMNS)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: true });
    if (locError) throw locError;

    const locationIds = (locations || []).map((l) => l.id);
    const courtFilter = locationIds.length
      ? `owner_id.eq.${ownerId},location_id.in.(${locationIds.join(',')})`
      : `owner_id.eq.${ownerId}`;
    const { data: courts, error: courtError } = await supabaseAdmin
      .from('courts')
      .select(COURT_COLUMNS)
      .or(courtFilter)
      .order('created_at', { ascending: true });
    if (courtError) throw courtError;

    return { locations: locations || [], courts: courts || [] };
  };

  const loadOwnerProfile = async (req, res) => {
    const ownerId = req.params.ownerId;
    if (!UUID_PATTERN.test(ownerId || '')) {
      res.status(400).json({ error: 'Invalid owner id.' });
      return null;
    }
    const { data, error } = await supabaseAdmin.from('profiles').select(PROFILE_COLUMNS).eq('id', ownerId).maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'Court owner not found.' });
      return null;
    }
    return data;
  };

  router.get('/', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const { page, pageSize } = parsePage(req);
      const filter = OWNER_FILTERS.includes(req.query.filter) ? req.query.filter : 'all';
      const sort = OWNER_SORTS.includes(req.query.sort) ? req.query.sort : 'revenue';
      const search = sanitizeSearch(req.query.search).toLowerCase();

      let owners = await loadOwnerOverview();
      if (search) {
        owners = owners.filter((o) =>
          [o.fullName, o.email, o.username].some((value) => value.toLowerCase().includes(search))
        );
      }
      if (filter === 'has_courts') owners = owners.filter((o) => o.courts > 0);
      if (filter === 'no_courts') owners = owners.filter((o) => o.courts === 0);
      if (filter === 'pending_verification') {
        owners = owners.filter((o) => PENDING_VERIFICATION_STATUSES.includes(o.verificationStatus));
      }
      if (filter === 'suspended') owners = owners.filter((o) => o.status === 'Suspended');

      const byJoined = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      const comparators = {
        revenue: (a, b) => b.revenue30d - a.revenue30d || b.bookings30d - a.bookings30d || b.courts - a.courts || byJoined(a, b),
        bookings: (a, b) => b.bookings30d - a.bookings30d || b.upcomingBookings - a.upcomingBookings || byJoined(a, b),
        name: (a, b) => displayNameOf({ full_name: a.fullName, email: a.email }).localeCompare(displayNameOf({ full_name: b.fullName, email: b.email })),
        joined: byJoined,
      };
      owners.sort(comparators[sort]);

      const from = (page - 1) * pageSize;
      res.json({ items: owners.slice(from, from + pageSize), total: owners.length, page, pageSize });
    } catch (err) {
      sendAdminError(res, err, 'Failed to load court owners.');
    }
  });

  router.get('/summary', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      res.json(summarize(await loadOwnerOverview()));
    } catch (err) {
      sendAdminError(res, err, 'Failed to load court owner summary.');
    }
  });

  router.get('/:ownerId', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const profile = await loadOwnerProfile(req, res);
      if (!profile) return;

      const today = manilaDate();
      const windowStart = shiftDate(today, -29);
      const { locations, courts } = await loadOwnerCourts(profile.id);
      const courtIds = courts.map((c) => c.id);

      const empty = { data: [], error: null };
      const [bookingsRes, recentRes, reviewsRes, managersRes, eventsRes, verificationRes] = await Promise.all([
        courtIds.length
          ? supabaseAdmin.from('bookings').select('court_id, date, status, total_price').in('court_id', courtIds).gte('date', windowStart)
          : empty,
        courtIds.length
          ? supabaseAdmin.from('bookings').select(BOOKING_COLUMNS).in('court_id', courtIds).order('created_at', { ascending: false }).limit(8)
          : empty,
        courtIds.length ? supabaseAdmin.from('court_reviews').select('court_id, rating').in('court_id', courtIds) : empty,
        courtIds.length
          ? supabaseAdmin.from('court_manager_assignments').select('*').in('court_id', courtIds).order('created_at', { ascending: false })
          : empty,
        courtIds.length
          ? supabaseAdmin
              .from('court_events')
              .select('id, court_id, title, description, event_type, start_datetime, end_datetime, blocks_bookings')
              .in('court_id', courtIds)
              .gte('end_datetime', new Date().toISOString())
              .order('start_datetime', { ascending: true })
              .limit(10)
          : empty,
        supabaseAdmin
          .from('court_owner_verifications')
          .select('*')
          .eq('profile_id', profile.id)
          .order('submitted_at', { ascending: false })
          .limit(1),
      ]);
      for (const result of [bookingsRes, recentRes, reviewsRes, managersRes, eventsRes, verificationRes]) {
        if (result.error) throw result.error;
      }

      const courtStats = new Map(courtIds.map((id) => [id, { bookings30d: 0, revenue30d: 0, upcomingBookings: 0, ratingSum: 0, ratingCount: 0 }]));
      let cancelled30d = 0;
      let total30d = 0;

      for (const b of bookingsRes.data || []) {
        const s = courtStats.get(b.court_id);
        if (!s) continue;
        if (b.date <= today) {
          total30d += 1;
          if (isCancelled(b)) cancelled30d += 1;
        }
        if (isCancelled(b)) continue;
        if (b.date <= today) s.bookings30d += 1;
        if (b.date >= today) s.upcomingBookings += 1;
        if (b.date <= today) s.revenue30d += Number(b.total_price) || 0;
      }
      for (const r of reviewsRes.data || []) {
        const s = courtStats.get(r.court_id);
        if (!s) continue;
        s.ratingSum += Number(r.rating) || 0;
        s.ratingCount += 1;
      }

      const mappedCourts = courts.map((court) => {
        const s = courtStats.get(court.id);
        return {
          ...toCourt(court),
          bookings30d: s.bookings30d,
          revenue30d: s.revenue30d,
          upcomingBookings: s.upcomingBookings,
          averageRating: s.ratingCount ? s.ratingSum / s.ratingCount : null,
          reviewCount: s.ratingCount,
        };
      });
      const courtNameById = new Map(mappedCourts.map((c) => [c.id, c.name]));

      const recent = recentRes.data || [];
      const managers = managersRes.data || [];
      const nameMap = await fetchNameMap([...recent.map((b) => b.player_id), ...managers.map((m) => m.manager_user_id)]);

      const totalRatings = mappedCourts.reduce((sum, c) => sum + c.reviewCount, 0);
      const ratingSum = [...courtStats.values()].reduce((sum, s) => sum + s.ratingSum, 0);

      res.json({
        owner: { ...toOwnerProfile(profile), hasOwnerRole: hasCourtOwnerRole(profile) },
        verification: toVerification((verificationRes.data || [])[0]),
        locations: locations.map(toLocation),
        courts: mappedCourts,
        stats: {
          locations: locations.length,
          courts: mappedCourts.length,
          activeCourts: mappedCourts.filter((c) => c.isActive && c.status === 'Available').length,
          bookings30d: mappedCourts.reduce((sum, c) => sum + c.bookings30d, 0),
          revenue30d: mappedCourts.reduce((sum, c) => sum + c.revenue30d, 0),
          upcomingBookings: mappedCourts.reduce((sum, c) => sum + c.upcomingBookings, 0),
          cancellationRate: total30d ? cancelled30d / total30d : 0,
          averageRating: totalRatings ? ratingSum / totalRatings : null,
          reviewCount: totalRatings,
          activeManagers: managers.filter((m) => m.status === 'active').length,
        },
        recentBookings: recent.map((b) => ({
          id: b.id,
          courtId: b.court_id,
          courtName: courtNameById.get(b.court_id) || 'Court',
          playerName: nameMap.get(b.player_id) || b.guest_name || 'Guest',
          date: b.date,
          startTime: b.start_time,
          endTime: b.end_time,
          totalPrice: Number(b.total_price) || 0,
          status: b.status,
          paymentStatus: b.payment_status,
          createdAt: b.created_at,
        })),
        upcomingEvents: (eventsRes.data || []).map((e) => ({
          id: e.id,
          courtId: e.court_id,
          courtName: courtNameById.get(e.court_id) || 'Court',
          title: e.title,
          description: e.description || null,
          eventType: e.event_type,
          start: e.start_datetime,
          end: e.end_datetime,
          blocksBookings: Boolean(e.blocks_bookings),
        })),
        managers: managers.map((m) => ({
          id: m.id,
          courtId: m.court_id,
          courtName: courtNameById.get(m.court_id) || 'Court',
          managerUserId: m.manager_user_id || null,
          managerName: m.manager_name || nameMap.get(m.manager_user_id) || 'Manager',
          managerEmail: m.manager_email || null,
          managerContactNumber: m.manager_contact_number || null,
          status: m.status,
          inviteSentAt: m.invite_sent_at || null,
          approvedAt: m.approved_at || null,
          removedAt: m.removed_at || null,
          createdAt: m.created_at || null,
        })),
      });
    } catch (err) {
      sendAdminError(res, err, 'Failed to load court owner.');
    }
  });

  router.get('/:ownerId/bookings', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const profile = await loadOwnerProfile(req, res);
      if (!profile) return;

      const { page, pageSize } = parsePage(req);
      const range = ['upcoming', 'past', 'all'].includes(req.query.range) ? req.query.range : 'upcoming';
      const status = typeof req.query.status === 'string' && /^[a-z_]{1,30}$/.test(req.query.status) ? req.query.status : 'all';
      const { courts } = await loadOwnerCourts(profile.id);
      const courtNameById = new Map(courts.map((c) => [c.id, c.name || 'Court']));

      let courtIds = courts.map((c) => c.id);
      if (req.query.courtId && req.query.courtId !== 'all') {
        courtIds = courtIds.filter((id) => id === req.query.courtId);
      }
      if (courtIds.length === 0) return res.json({ items: [], total: 0, page, pageSize });

      const today = manilaDate();
      let query = supabaseAdmin.from('bookings').select(BOOKING_COLUMNS, { count: 'exact' }).in('court_id', courtIds);
      if (range === 'upcoming') query = query.gte('date', today);
      if (range === 'past') query = query.lt('date', today);
      if (status !== 'all') query = query.eq('status', status);
      const ascending = range === 'upcoming';
      query = query.order('date', { ascending }).order('start_time', { ascending });

      const from = (page - 1) * pageSize;
      const { data, error, count } = await query.range(from, from + pageSize - 1);
      if (error) throw error;

      const rows = data || [];
      const nameMap = await fetchNameMap(rows.map((b) => b.player_id));
      res.json({
        items: rows.map((b) => ({
          id: b.id,
          courtId: b.court_id,
          courtName: courtNameById.get(b.court_id) || 'Court',
          playerId: b.player_id || null,
          playerName: nameMap.get(b.player_id) || b.guest_name || 'Guest',
          playerEmail: b.guest_email || null,
          date: b.date,
          startTime: b.start_time,
          endTime: b.end_time,
          totalPrice: Number(b.total_price) || 0,
          status: b.status,
          paymentStatus: b.payment_status,
          paymentMethod: b.payment_method,
          isCheckedIn: Boolean(b.is_checked_in),
          isNoShow: Boolean(b.is_no_show),
          cancelledReason: b.cancelled_reason || null,
          createdAt: b.created_at,
        })),
        total: count ?? rows.length,
        page,
        pageSize,
      });
    } catch (err) {
      sendAdminError(res, err, 'Failed to load bookings.');
    }
  });

  router.get('/:ownerId/series', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const profile = await loadOwnerProfile(req, res);
      if (!profile) return;

      const range = Object.hasOwn(SERIES_RANGES, req.query.range) ? req.query.range : '14d';
      const today = manilaDate();
      const { bucket, keys, startDate } = buildSeriesBuckets(range, today);
      const { courts } = await loadOwnerCourts(profile.id);
      const courtIds = courts.map((c) => c.id);

      const totals = new Map(keys.map((key) => [key, { bookings: 0, value: 0 }]));
      if (courtIds.length > 0) {
        const bookings = await fetchAll(() =>
          supabaseAdmin
            .from('bookings')
            .select('date, status, total_price')
            .in('court_id', courtIds)
            .gte('date', startDate)
            .lte('date', today)
            .order('date', { ascending: true })
        );
        for (const b of bookings) {
          if (isCancelled(b)) continue;
          const entry = totals.get(bucketKeyOf(bucket, b.date));
          if (!entry) continue;
          entry.bookings += 1;
          entry.value += Number(b.total_price) || 0;
        }
      }

      res.json({
        range,
        bucket,
        points: keys.map((key) => ({ key, label: formatBucketLabel(bucket, key), ...totals.get(key) })),
      });
    } catch (err) {
      sendAdminError(res, err, 'Failed to load booking trend.');
    }
  });

  router.get('/:ownerId/reviews', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const profile = await loadOwnerProfile(req, res);
      if (!profile) return;

      const { page, pageSize } = parsePage(req);
      const { courts } = await loadOwnerCourts(profile.id);
      const courtIds = courts.map((c) => c.id);
      if (courtIds.length === 0) return res.json({ items: [], total: 0, page, pageSize });
      const courtNameById = new Map(courts.map((c) => [c.id, c.name || 'Court']));

      const from = (page - 1) * pageSize;
      const { data, error, count } = await supabaseAdmin
        .from('court_reviews')
        .select('id, court_id, user_id, rating, comment, created_at', { count: 'exact' })
        .in('court_id', courtIds)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;

      const rows = data || [];
      const nameMap = await fetchNameMap(rows.map((r) => r.user_id));
      res.json({
        items: rows.map((r) => ({
          id: r.id,
          courtId: r.court_id,
          courtName: courtNameById.get(r.court_id) || 'Court',
          playerName: nameMap.get(r.user_id) || 'Player',
          rating: Number(r.rating) || 0,
          comment: r.comment || null,
          createdAt: r.created_at,
        })),
        total: count ?? rows.length,
        page,
        pageSize,
      });
    } catch (err) {
      sendAdminError(res, err, 'Failed to load reviews.');
    }
  });

  const handleVenueUpdate = (kind) => async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const isCourt = kind === 'court';
      const id = isCourt ? req.params.courtId : req.params.locationId;
      if (!UUID_PATTERN.test(id || '')) return res.status(400).json({ error: 'Invalid id.' });

      const table = isCourt ? 'courts' : 'locations';
      const columns = isCourt ? COURT_COLUMNS : LOCATION_COLUMNS;
      const allowedStatuses = isCourt ? COURT_STATUSES : LOCATION_STATUSES;
      const openStatus = isCourt ? 'Available' : 'Active';

      const { data: current, error: loadError } = await supabaseAdmin.from(table).select(columns).eq('id', id).maybeSingle();
      if (loadError) throw loadError;
      if (!current) return res.status(404).json({ error: `${isCourt ? 'Court' : 'Location'} not found.` });

      const { status, isActive, reason } = req.body || {};
      const patch = {};
      if (status !== undefined) {
        if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
        if (status !== current.status) patch.status = status;
      }
      if (isActive !== undefined) {
        if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be true or false.' });
        if (isActive !== (current.is_active !== false)) patch.is_active = isActive;
      }
      if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nothing changed.' });

      const trimmedReason = String(reason || '').trim().slice(0, 500);
      const restricts = patch.is_active === false || (patch.status !== undefined && patch.status !== openStatus);
      if (restricts && !trimmedReason) {
        return res.status(400).json({ error: 'A reason is required when deactivating or restricting availability.' });
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from(table)
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(columns)
        .single();
      if (updateError) throw updateError;

      const label = isCourt ? 'Court' : 'Location';
      const name = updated.name || label;
      const changes = [
        patch.status !== undefined ? `status ${current.status || '—'} -> ${patch.status}` : null,
        patch.is_active !== undefined ? (patch.is_active ? 'reactivated' : 'deactivated') : null,
      ].filter(Boolean);
      const details = `${changes.join(', ')}${trimmedReason ? ` (reason: ${trimmedReason})` : ''}`;

      await logAction(admin, {
        action: isCourt ? 'COURT_STATUS_UPDATE' : 'LOCATION_STATUS_UPDATE',
        target: updated,
        targetName: name,
        details,
      });

      if (updated.owner_id) {
        const summary = [
          patch.status !== undefined ? `set to ${patch.status}` : null,
          patch.is_active !== undefined ? (patch.is_active ? 'reactivated' : 'deactivated') : null,
        ].filter(Boolean).join(' and ');
        await notifyOwner(updated.owner_id, {
          title: `${label} updated by PicklePlay admin`,
          message: `${name} was ${summary}.${trimmedReason ? ` Reason: ${trimmedReason}` : ''}`,
          metadata: {
            kind: isCourt ? 'admin_court_update' : 'admin_location_update',
            [isCourt ? 'courtId' : 'locationId']: updated.id,
            status: updated.status,
            isActive: updated.is_active !== false,
          },
        });
      }

      res.json(isCourt ? { court: toCourt(updated) } : { location: toLocation(updated) });
    } catch (err) {
      sendAdminError(res, err, `Failed to update ${kind}.`);
    }
  };

  router.patch('/courts/:courtId', handleVenueUpdate('court'));
  router.patch('/locations/:locationId', handleVenueUpdate('location'));

  return router;
};
