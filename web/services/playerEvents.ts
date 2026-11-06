import { supabase } from './supabase';

export type PlayerEventName =
  | 'booking_court_viewed'
  | 'booking_slot_selected'
  | 'booking_checkout_opened'
  | 'booking_completed'
  | 'booking_blocked'
  | 'booking_failed'
  | 'booking_abandoned'
  | 'search_no_results'
  | 'login_failed'
  | 'signup_failed'
  | 'quiz_started'
  | 'quiz_completed'
  | 'quiz_abandoned'
  | 'client_error';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

interface QueuedEvent {
  name: PlayerEventName;
  properties: EventProperties;
  path: string;
  at: string;
}

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 25;
const MAX_QUEUE = 200;
const ANON_KEY = 'pp_anon_id';
const SESSION_KEY = 'pp_session_id';
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/g;

let queue: QueuedEvent[] = [];
let timer: number | null = null;
let initialized = false;
const reportedErrors = new Set<string>();

const randomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const readOrCreate = (storage: Storage | undefined, key: string) => {
  try {
    if (!storage) return null;
    const existing = storage.getItem(key);
    if (existing) return existing;
    const created = randomId();
    storage.setItem(key, created);
    return created;
  } catch {
    return null;
  }
};

const getServerBaseUrl = () => {
  if (import.meta.env.DEV) return '';
  return import.meta.env.VITE_SERVER_URL?.trim() || '';
};

/** Strips emails and caps length so free text from errors or search never carries PII. */
export const scrubText = (value: unknown, max = 200) =>
  String(value ?? '')
    .replace(EMAIL_PATTERN, '[email]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const flush = async () => {
  if (queue.length === 0) return;
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);

  let accessToken = '';
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token || '';
  } catch {
    accessToken = '';
  }

  try {
    await fetch(`${getServerBaseUrl()}/api/events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        anonymousId: readOrCreate(typeof window !== 'undefined' ? window.localStorage : undefined, ANON_KEY),
        sessionId: readOrCreate(typeof window !== 'undefined' ? window.sessionStorage : undefined, SESSION_KEY),
        events: batch,
      }),
    });
  } catch {
    // Analytics must never interrupt the player; dropped batches are acceptable.
  }

  if (queue.length > 0) void flush();
};

const scheduleFlush = () => {
  if (timer !== null || typeof window === 'undefined') return;
  timer = window.setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
};

export const trackEvent = (name: PlayerEventName, properties: EventProperties = {}) => {
  if (typeof window === 'undefined') return;
  const clean: EventProperties = {};
  Object.entries(properties).forEach(([key, value]) => {
    if (value === undefined) return;
    clean[key] = typeof value === 'string' ? scrubText(value) : value;
  });
  queue.push({ name, properties: clean, path: window.location.pathname, at: new Date().toISOString() });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  scheduleFlush();
};

/** Flushes immediately; use for events fired as the page is being left. */
export const flushPlayerEvents = () => {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  void flush();
};

export const reportClientError = (error: unknown, source: string) => {
  const err = error as { message?: string; stack?: string } | undefined;
  const message = scrubText(err?.message || error || 'Unknown error', 160);
  const key = `${source}:${message}`;
  if (reportedErrors.has(key)) return;
  reportedErrors.add(key);
  trackEvent('client_error', {
    source,
    message,
    location: scrubText(err?.stack?.split('\n').find((line) => line.includes('at ')) || '', 160) || undefined,
  });
};

export const initPlayerEvents = () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event) => {
    if (!event.message && !event.error) return;
    reportClientError(event.error || event.message, 'window');
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason, 'promise');
  });
  window.addEventListener('pagehide', flushPlayerEvents);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPlayerEvents();
  });
};

export const normalizeAuthError = (message: unknown) => {
  const text = String(message || '').toLowerCase();
  if (text.includes('invalid login') || text.includes('invalid credentials')) return 'invalid_credentials';
  if (text.includes('not confirmed') || text.includes('confirm')) return 'email_not_confirmed';
  if (text.includes('rate') || text.includes('too many')) return 'rate_limited';
  if (text.includes('already registered') || text.includes('already exists')) return 'already_registered';
  if (text.includes('password')) return 'weak_password';
  if (text.includes('network') || text.includes('fetch')) return 'network';
  return 'other';
};
