import express from 'express';

export const PLAYER_EVENT_CATEGORIES = {
  booking_court_viewed: 'booking',
  booking_slot_selected: 'booking',
  booking_checkout_opened: 'booking',
  booking_completed: 'booking',
  booking_blocked: 'booking',
  booking_failed: 'booking',
  booking_abandoned: 'booking',
  search_no_results: 'search',
  login_failed: 'auth',
  signup_failed: 'auth',
  quiz_started: 'onboarding',
  quiz_completed: 'onboarding',
  quiz_abandoned: 'onboarding',
  client_error: 'error',
};

const MAX_BATCH = 25;
const MAX_PROPERTIES_BYTES = 2048;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const TOKEN_CACHE_MS = 5 * 60 * 1000;

const optionalId = (value) => (typeof value === 'string' && ID_PATTERN.test(value) ? value : null);

const validateEvent = (event) => {
  if (!event || typeof event !== 'object') return 'Event must be an object.';
  if (!Object.hasOwn(PLAYER_EVENT_CATEGORIES, event.name)) return `Unknown event: ${String(event.name).slice(0, 40)}`;
  const properties = event.properties ?? {};
  if (typeof properties !== 'object' || Array.isArray(properties)) return 'properties must be an object.';
  if (Buffer.byteLength(JSON.stringify(properties), 'utf8') > MAX_PROPERTIES_BYTES) return 'properties too large.';
  return null;
};

export const createPlayerEventsRouter = ({ supabaseAdmin, requireSupabaseAdmin, limiter }) => {
  const router = express.Router();
  if (limiter) router.use(limiter);

  const tokenCache = new Map();

  const resolveUserId = async (req) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return null;
    const cached = tokenCache.get(token);
    if (cached && cached.expiresAt > Date.now()) return cached.userId;

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    const userId = error ? null : data?.user?.id || null;
    if (tokenCache.size > 2000) tokenCache.clear();
    tokenCache.set(token, { userId, expiresAt: Date.now() + TOKEN_CACHE_MS });
    return userId;
  };

  router.post('/', async (req, res) => {
    try {
      const guard = requireSupabaseAdmin();
      if (!guard.ok) return res.status(503).json({ error: guard.message });

      const events = req.body?.events;
      if (!Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'events must be a non-empty array.' });
      if (events.length > MAX_BATCH) return res.status(400).json({ error: `At most ${MAX_BATCH} events per batch.` });
      for (const event of events) {
        const problem = validateEvent(event);
        if (problem) return res.status(400).json({ error: problem });
      }

      const userId = await resolveUserId(req);
      const anonymousId = optionalId(req.body.anonymousId);
      const sessionId = optionalId(req.body.sessionId);
      const now = Date.now();

      const rows = events.map((event) => {
        const clientTime = Date.parse(event.at);
        // Accept client timestamps up to 1 day old so queued events keep their real time.
        const createdAt = Number.isFinite(clientTime) && clientTime <= now && now - clientTime < 86400000 ? clientTime : now;
        return {
          user_id: userId,
          anonymous_id: anonymousId,
          session_id: sessionId,
          event_name: event.name,
          category: PLAYER_EVENT_CATEGORIES[event.name],
          properties: event.properties ?? {},
          path: typeof event.path === 'string' ? event.path.slice(0, 200) : null,
          created_at: new Date(createdAt).toISOString(),
        };
      });

      const { error } = await supabaseAdmin.from('player_events').insert(rows);
      if (error) {
        // Before Documentation/migrations/2026/10/26/20261026_player_events.sql is applied, accept and drop so clients don't log errors.
        if (error.code === 'PGRST205' || error.code === '42P01') return res.status(202).json({ accepted: 0, stored: false });
        console.warn('Unable to store player events:', error.message);
        return res.status(500).json({ error: 'Unable to store events.' });
      }
      res.status(202).json({ accepted: rows.length });
    } catch (err) {
      console.error('Player events failed:', err);
      res.status(500).json({ error: 'Unable to store events.' });
    }
  });

  return router;
};
