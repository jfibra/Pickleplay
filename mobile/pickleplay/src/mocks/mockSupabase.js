/**
 * In-memory stand-in for the Supabase client, used only when EXPO_PUBLIC_USE_MOCKS=true.
 *
 * Screens call supabase.from(...) directly, so this answers the same calls: auth, the query
 * builder (filters, order, limit, single, counts, insert/update/upsert/delete) and PostgREST
 * embeds such as `profiles:player_id ( full_name )`, `courts(*)` or `community_post_likes(count)`,
 * resolved through the foreign keys below. Data comes from fixtures.js and lives in memory:
 * writes last until the app reloads. The signed-in session is kept in AsyncStorage.
 *
 * It is lenient where PostgREST is strict: unknown columns read as undefined instead of failing,
 * and there is no row-level security. Use it for screens and flows, not to validate queries.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createFixtures } from './fixtures';
import { MOCK_ACCOUNTS, MOCK_PASSWORD_MIN, mockAccountForEmail } from './accounts';

const SESSION_KEY = 'pickleplay.mock-session';
const LATENCY = 200;
const PLACEHOLDER_UPLOAD = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800';

const delay = (ms = LATENCY) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
let seq = 0;
const newId = (table) => `${table}-${Date.now().toString(36)}${(seq++).toString(36)}`;
const newUserId = () => `00000000-0000-4000-b000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;

/** Foreign keys: table -> { column: referenced table }. Columns not listed fall back to the heuristics in fkTarget. */
const FKS = {
  bookings: { court_id: 'courts', player_id: 'profiles', user_id: 'profiles' },
  courts: { owner_id: 'profiles', location_id: 'locations' },
  locations: { owner_id: 'profiles' },
  court_reviews: { court_id: 'courts', user_id: 'profiles', player_id: 'profiles', reviewer_id: 'profiles' },
  community_posts: { profile_id: 'profiles', user_id: 'profiles', author_id: 'profiles' },
  community_post_likes: { post_id: 'community_posts', profile_id: 'profiles', user_id: 'profiles' },
  community_post_comments: { post_id: 'community_posts', profile_id: 'profiles', user_id: 'profiles' },
  squads: { created_by: 'profiles', owner_id: 'profiles' },
  squad_members: { squad_id: 'squads', profile_id: 'profiles', user_id: 'profiles' },
  tournaments: { organizer_id: 'profiles', created_by: 'profiles', court_id: 'courts', location_id: 'locations' },
  tournament_registrations: { tournament_id: 'tournaments', player_id: 'profiles', user_id: 'profiles' },
  lessons: { coach_id: 'profiles', student_id: 'profiles', court_id: 'courts' },
  clinics: { coach_id: 'profiles', court_id: 'courts' },
  clinic_participants: { clinic_id: 'clinics', player_id: 'profiles', profile_id: 'profiles' },
  coach_reviews: { coach_id: 'profiles', reviewer_id: 'profiles', student_id: 'profiles', player_id: 'profiles' },
  coach_students: { coach_id: 'profiles', student_id: 'profiles' },
  coaching_sessions: { coach_id: 'profiles', student_id: 'profiles', court_id: 'courts' },
  professional_applications: { profile_id: 'profiles', user_id: 'profiles' },
  player_profiles: { profile_id: 'profiles', user_id: 'profiles' },
  user_preferences: { user_id: 'profiles' },
  user_statistics: { user_id: 'profiles' },
};
const PROFILE_COLUMNS = ['player_id', 'user_id', 'profile_id', 'coach_id', 'student_id', 'owner_id', 'reviewer_id', 'created_by', 'organizer_id', 'author_id'];

let db = createFixtures();

/** Restores the sample data (writes made in this session are lost). */
export function resetMockData() {
  db = createFixtures();
}

const tableRows = (table) => {
  if (!db[table]) db[table] = [];
  return db[table];
};

function fkTarget(table, column) {
  const explicit = FKS[table]?.[column];
  if (explicit) return explicit;
  if (PROFILE_COLUMNS.includes(column)) return 'profiles';
  if (column.endsWith('_id')) {
    const base = column.slice(0, -3);
    if (db[`${base}s`]) return `${base}s`;
    if (db[base]) return base;
  }
  return null;
}

function fkColumns(table, target, sampleRow) {
  const columns = new Set(Object.keys(FKS[table] || {}));
  if (sampleRow) Object.keys(sampleRow).forEach((c) => columns.add(c));
  return [...columns].filter((c) => fkTarget(table, c) === target);
}

/* ---------- select parsing and embedding ---------- */

function splitTopLevel(str, sep = ',') {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseSelect(str) {
  const clean = String(str ?? '*').replace(/\s+/g, '');
  return splitTopLevel(clean || '*').map((item) => {
    const open = item.indexOf('(');
    if (open < 0) {
      if (item === '*') return { type: 'star' };
      const [alias, name] = item.includes(':') ? item.split(':') : [null, item];
      return { type: 'col', alias, name: name.split('::')[0] };
    }
    let head = item.slice(0, open);
    const inner = item.slice(open + 1, item.lastIndexOf(')'));
    let alias = null;
    if (head.includes(':')) [alias, head] = head.split(':');
    const [target, ...hints] = head.split('!');
    const isInner = hints.includes('inner');
    const hint = hints.find((h) => h !== 'inner' && h !== 'left') || null;
    const countOnly = inner === 'count';
    return { type: 'embed', alias, target, hint, isInner, countOnly, children: countOnly ? [] : parseSelect(inner) };
  });
}

function shape(table, row, nodes) {
  const out = {};
  const list = nodes.length ? nodes : [{ type: 'star' }];
  for (const node of list) {
    if (node.type === 'star') Object.assign(out, clone(row));
    else if (node.type === 'col') out[node.alias || node.name] = clone(row[node.name]);
    else out[node.alias || node.target] = embed(table, row, node);
  }
  return out;
}

function pickColumn(columns, hint) {
  if (!columns.length) return null;
  if (hint) return columns.find((c) => hint.includes(c)) || columns[0];
  return columns[0];
}

function embed(table, row, node) {
  // `alias:fk_column(...)`: the target names a foreign-key column on this table.
  const viaColumn = fkTarget(table, node.target) && node.target in row ? fkTarget(table, node.target) : null;
  if (viaColumn) {
    const ref = tableRows(viaColumn).find((r) => r.id === row[node.target]);
    return ref ? shape(viaColumn, ref, node.children) : null;
  }
  const target = node.target;
  // Many-to-one: this table holds a column pointing at the target table.
  const own = pickColumn(fkColumns(table, target, row), node.hint);
  if (own) {
    const ref = tableRows(target).find((r) => r.id === row[own]);
    return ref ? shape(target, ref, node.children) : null;
  }
  // One-to-many: the target table holds a column pointing back at this one.
  const rows = tableRows(target);
  const back = pickColumn(fkColumns(target, table, rows[0]), node.hint);
  const children = back ? rows.filter((r) => r[back] === row.id) : [];
  if (node.countOnly) return [{ count: children.length }];
  return children.map((child) => shape(target, child, node.children));
}

/* ---------- filters ---------- */

const getPath = (obj, path) => path.split('.').reduce((v, k) => (v == null ? v : Array.isArray(v) ? v[0]?.[k] : v[k]), obj);
const same = (a, b) => a === b || (a != null && b != null && String(a) === String(b));
const comparable = (v) => (typeof v === 'number' ? v : v == null ? v : isNaN(Number(v)) || /[-:T]/.test(String(v)) ? String(v) : Number(v));
const likeToRegex = (pattern, flags) =>
  new RegExp(`^${String(pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`, flags);
const parseList = (v) => (Array.isArray(v) ? v : String(v).replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')));
const parseLiteral = (v) => (v === 'null' ? null : v === 'true' ? true : v === 'false' ? false : v);

function test(op, actual, expected) {
  switch (op) {
    case 'eq': return same(actual, expected);
    case 'neq': return !same(actual, expected);
    case 'gt': return actual != null && comparable(actual) > comparable(expected);
    case 'gte': return actual != null && comparable(actual) >= comparable(expected);
    case 'lt': return actual != null && comparable(actual) < comparable(expected);
    case 'lte': return actual != null && comparable(actual) <= comparable(expected);
    case 'in': return parseList(expected).some((e) => same(actual, e));
    case 'is': return expected === null || expected === 'null' ? actual == null : actual === parseLiteral(expected);
    case 'like': return actual != null && likeToRegex(expected, '').test(String(actual));
    case 'ilike': return actual != null && likeToRegex(expected, 'i').test(String(actual));
    case 'contains':
    case 'cs': {
      if (Array.isArray(actual)) return parseList(expected).every((e) => actual.some((a) => same(a, e)));
      if (actual && typeof actual === 'object') return Object.entries(expected || {}).every(([k, v]) => same(actual[k], v));
      return typeof actual === 'string' && actual.includes(expected);
    }
    case 'containedBy':
    case 'cd': return Array.isArray(actual) && actual.every((a) => parseList(expected).some((e) => same(a, e)));
    case 'overlaps':
    case 'ov': return Array.isArray(actual) && parseList(expected).some((e) => actual.some((a) => same(a, e)));
    default: return true;
  }
}

/** `a.eq.1,b.ilike.%x%,and(c.gt.2,d.is.null)` as used by .or() */
function orClause(expr) {
  const terms = splitTopLevel(expr);
  return (row) => terms.some((term) => {
    const nested = /^(and|or)\((.*)\)$/.exec(term);
    if (nested) {
      const inner = splitTopLevel(nested[2]).map((t) => orClause(t));
      return nested[1] === 'and' ? inner.every((f) => f(row)) : inner.some((f) => f(row));
    }
    const [column, ...rest] = term.split('.');
    let op = rest.shift();
    let negate = false;
    if (op === 'not') { negate = true; op = rest.shift(); }
    const result = test(op, getPath(row, column), parseLiteral(rest.join('.')));
    return negate ? !result : result;
  });
}

/* ---------- query builder ---------- */

class Query {
  constructor(table) {
    this.table = table;
    this.action = 'select';
    this.columns = '*';
    this.filters = [];
    this.orders = [];
    this.limitCount = null;
    this.rangeFrom = null;
    this.mode = null; // 'single' | 'maybeSingle'
    this.countOption = null;
    this.head = false;
    this.returning = false;
    this.payload = null;
    this.upsertOptions = {};
  }

  select(columns = '*', options = {}) {
    this.columns = columns;
    if (options.count) this.countOption = options.count;
    if (options.head) this.head = true;
    if (this.action !== 'select') this.returning = true;
    return this;
  }
  insert(values) { this.action = 'insert'; this.payload = values; return this; }
  update(values) { this.action = 'update'; this.payload = values; return this; }
  upsert(values, options = {}) { this.action = 'upsert'; this.payload = values; this.upsertOptions = options; return this; }
  delete() { this.action = 'delete'; return this; }

  where(column, op, value, negate = false) {
    this.filters.push((row) => {
      const result = test(op, getPath(row, column), value);
      return negate ? !result : result;
    });
    return this;
  }
  eq(c, v) { return this.where(c, 'eq', v); }
  neq(c, v) { return this.where(c, 'neq', v); }
  gt(c, v) { return this.where(c, 'gt', v); }
  gte(c, v) { return this.where(c, 'gte', v); }
  lt(c, v) { return this.where(c, 'lt', v); }
  lte(c, v) { return this.where(c, 'lte', v); }
  like(c, v) { return this.where(c, 'like', v); }
  ilike(c, v) { return this.where(c, 'ilike', v); }
  is(c, v) { return this.where(c, 'is', v); }
  in(c, v) { return this.where(c, 'in', v); }
  contains(c, v) { return this.where(c, 'contains', v); }
  containedBy(c, v) { return this.where(c, 'containedBy', v); }
  overlaps(c, v) { return this.where(c, 'overlaps', v); }
  textSearch(c, v) { return this.where(c, 'ilike', `%${String(v).replace(/'/g, '')}%`); }
  match(obj) { Object.entries(obj).forEach(([c, v]) => this.eq(c, v)); return this; }
  not(c, op, v) { return this.where(c, op, parseLiteral(v), true); }
  filter(c, op, v) { return op.startsWith('not.') ? this.where(c, op.slice(4), v, true) : this.where(c, op, v); }
  or(expr) { this.filters.push(orClause(expr)); return this; }

  order(column, { ascending = true, nullsFirst = false } = {}) { this.orders.push({ column, ascending, nullsFirst }); return this; }
  limit(n) { this.limitCount = n; return this; }
  range(from, to) { this.rangeFrom = from; this.limitCount = to - from + 1; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybeSingle'; return this; }
  abortSignal() { return this; }
  returns() { return this; }
  throwOnError() { this.throws = true; return this; }

  then(resolve, reject) {
    return this.run().then((result) => {
      if (this.throws && result.error) throw result.error;
      return result;
    }).then(resolve, reject);
  }
  catch(reject) { return this.then(undefined, reject); }
  finally(fn) { return this.then((v) => { fn(); return v; }, (e) => { fn(); throw e; }); }

  matches(row) {
    // Plain filters see the stored row plus its embeds, so `courts.owner_id` style paths work too.
    return this.filters.every((f) => f(row));
  }

  async run() {
    await delay();
    const rows = tableRows(this.table);
    const nodes = parseSelect(this.columns);
    let affected = [];

    if (this.action === 'insert' || this.action === 'upsert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload];
      const conflict = (this.upsertOptions.onConflict || 'id').split(',').map((s) => s.trim());
      for (const values of list) {
        const existing = this.action === 'upsert'
          ? rows.find((r) => conflict.every((c) => values[c] !== undefined && same(r[c], values[c])))
          : null;
        if (existing) {
          if (!this.upsertOptions.ignoreDuplicates) Object.assign(existing, clone(values), { updated_at: new Date().toISOString() });
          affected.push(existing);
        } else {
          const row = { id: newId(this.table), created_at: new Date().toISOString(), ...clone(values) };
          rows.push(row);
          affected.push(row);
        }
      }
      return this.respond(affected, nodes, 201);
    }

    const withEmbeds = (row) => ({ row, view: { ...row, ...shapeEmbedsForFilters(this.table, row, nodes) } });
    let matched = rows.map(withEmbeds).filter(({ view }) => this.matches(view));
    // `table!inner(...)` drops rows without a match.
    for (const node of nodes) {
      if (node.type === 'embed' && node.isInner) {
        matched = matched.filter(({ row }) => {
          const value = embed(this.table, row, node);
          return Array.isArray(value) ? value.length > 0 : value != null;
        });
      }
    }

    if (this.action === 'update') {
      affected = matched.map(({ row }) => Object.assign(row, clone(this.payload)));
      return this.respond(affected, nodes, 200);
    }
    if (this.action === 'delete') {
      affected = matched.map(({ row }) => row);
      db[this.table] = rows.filter((r) => !affected.includes(r));
      return this.respond(affected, nodes, 200);
    }

    let result = matched.map(({ row }) => row);
    for (const { column, ascending, nullsFirst } of [...this.orders].reverse()) {
      result = [...result].sort((a, b) => {
        const x = comparable(getPath(a, column));
        const y = comparable(getPath(b, column));
        if (x == null && y == null) return 0;
        if (x == null) return nullsFirst ? -1 : 1;
        if (y == null) return nullsFirst ? 1 : -1;
        return (x < y ? -1 : x > y ? 1 : 0) * (ascending ? 1 : -1);
      });
    }
    const total = result.length;
    if (this.rangeFrom != null || this.limitCount != null) {
      const from = this.rangeFrom || 0;
      result = result.slice(from, this.limitCount != null ? from + this.limitCount : undefined);
    }
    return this.finish(result.map((row) => shape(this.table, row, nodes)), total, 200);
  }

  respond(rows, nodes, status) {
    if (!this.returning) return { data: null, error: null, count: this.countOption ? rows.length : null, status, statusText: 'OK' };
    return this.finish(rows.map((row) => shape(this.table, row, nodes)), rows.length, status);
  }

  finish(data, total, status) {
    const count = this.countOption ? total : null;
    if (this.head) return { data: null, error: null, count, status, statusText: 'OK' };
    if (this.mode) {
      if (data.length === 1) return { data: data[0], error: null, count, status, statusText: 'OK' };
      if (data.length === 0 && this.mode === 'maybeSingle') return { data: null, error: null, count, status, statusText: 'OK' };
      return {
        data: null,
        count,
        status: 406,
        statusText: 'Not Acceptable',
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
          details: `The result contains ${data.length} rows`,
          hint: null,
        },
      };
    }
    return { data, error: null, count, status, statusText: 'OK' };
  }
}

/** Embedded values keyed by alias/target, so filters like `.eq('courts.owner_id', id)` can read them. */
function shapeEmbedsForFilters(table, row, nodes) {
  const out = {};
  for (const node of nodes) if (node.type === 'embed') out[node.alias || node.target] = embed(table, row, node);
  return out;
}

/* ---------- auth ---------- */

const listeners = new Set();
let session = null;
let loaded = null;

function userFor(account, metadata = {}) {
  const [first, ...rest] = (account.fullName || '').split(' ');
  return {
    id: account.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: account.email,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: account.fullName, first_name: first || '', last_name: rest.join(' '), ...metadata },
    created_at: new Date().toISOString(),
  };
}

function sessionFor(user) {
  return {
    access_token: `mock.${user.id}.${Date.now()}`,
    refresh_token: 'mock-refresh',
    token_type: 'bearer',
    expires_in: 3600 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
    user,
  };
}

async function loadSession() {
  if (!loaded) {
    loaded = AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => { session = raw ? JSON.parse(raw) : null; })
      .catch(() => { session = null; });
  }
  return loaded;
}

async function setSession(next, event) {
  session = next;
  try {
    if (next) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(SESSION_KEY);
  } catch {}
  listeners.forEach((cb) => { try { cb(event, session); } catch {} });
}

const authError = (message, status = 400) => ({ name: 'AuthApiError', message, status });

/** Accounts created through Register during this session. */
const registered = new Map();

function accountFor(email) {
  return mockAccountForEmail(email) || registered.get(String(email).trim().toLowerCase()) || null;
}

const auth = {
  async getSession() {
    await loadSession();
    return { data: { session }, error: null };
  },
  async getUser() {
    await loadSession();
    return session
      ? { data: { user: session.user }, error: null }
      : { data: { user: null }, error: authError('Auth session missing!', 401) };
  },
  onAuthStateChange(callback) {
    listeners.add(callback);
    loadSession().then(() => { if (listeners.has(callback)) callback('INITIAL_SESSION', session); });
    return { data: { subscription: { id: String(Math.random()), unsubscribe: () => listeners.delete(callback) } } };
  },
  async signInWithPassword({ email, password }) {
    await delay();
    if (!String(email || '').includes('@') || String(password || '').length < MOCK_PASSWORD_MIN) {
      return { data: { user: null, session: null }, error: authError('Invalid login credentials') };
    }
    const account = accountFor(email) || { ...MOCK_ACCOUNTS.player };
    const next = sessionFor(userFor(account));
    await setSession(next, 'SIGNED_IN');
    return { data: { user: next.user, session: next }, error: null };
  },
  async signUp({ email, password, options = {} }) {
    await delay();
    const lower = String(email || '').trim().toLowerCase();
    if (!lower.includes('@')) return { data: { user: null, session: null }, error: authError('Unable to validate email address: invalid format') };
    if (String(password || '').length < MOCK_PASSWORD_MIN) return { data: { user: null, session: null }, error: authError(`Password should be at least ${MOCK_PASSWORD_MIN} characters.`) };
    if (accountFor(lower) || tableRows('profiles').some((p) => same(p.email, lower))) {
      return { data: { user: null, session: null }, error: authError('User already registered', 422) };
    }
    const meta = options.data || {};
    const fullName = meta.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || lower.split('@')[0];
    const account = { id: newUserId(), email: lower, fullName, roles: ['PLAYER'] };
    registered.set(lower, account);
    const next = sessionFor(userFor(account, meta));
    await setSession(next, 'SIGNED_IN');
    return { data: { user: next.user, session: next }, error: null };
  },
  async signInWithIdToken() {
    await delay();
    const next = sessionFor(userFor(MOCK_ACCOUNTS.player));
    await setSession(next, 'SIGNED_IN');
    return { data: { user: next.user, session: next }, error: null };
  },
  async signOut() {
    await setSession(null, 'SIGNED_OUT');
    return { error: null };
  },
  async resetPasswordForEmail() {
    await delay();
    return { data: {}, error: null };
  },
  async updateUser(attributes = {}) {
    await loadSession();
    if (!session) return { data: { user: null }, error: authError('Auth session missing!', 401) };
    const user = {
      ...session.user,
      email: attributes.email || session.user.email,
      user_metadata: { ...session.user.user_metadata, ...(attributes.data || {}) },
      updated_at: new Date().toISOString(),
    };
    await setSession({ ...session, user }, 'USER_UPDATED');
    return { data: { user }, error: null };
  },
  async refreshSession() {
    await loadSession();
    return { data: { session, user: session?.user ?? null }, error: null };
  },
  startAutoRefresh() {},
  stopAutoRefresh() {},
};

/* ---------- storage, rpc, realtime ---------- */

const storage = {
  from(bucket) {
    return {
      async upload(path) { await delay(); return { data: { path, fullPath: `${bucket}/${path}` }, error: null }; },
      async update(path) { await delay(); return { data: { path }, error: null }; },
      async remove(paths) { return { data: (paths || []).map((name) => ({ name })), error: null }; },
      async download() { return { data: null, error: { message: 'Downloads are not available in prototype mode' } }; },
      async list() { return { data: [], error: null }; },
      // Uploaded files are not kept, so every upload shows the same placeholder image.
      getPublicUrl() { return { data: { publicUrl: PLACEHOLDER_UPLOAD } }; },
      async createSignedUrl() { return { data: { signedUrl: PLACEHOLDER_UPLOAD }, error: null }; },
    };
  },
};

function channel() {
  const ch = { on: () => ch, subscribe: (cb) => { cb?.('SUBSCRIBED'); return ch; }, unsubscribe: async () => 'ok', send: async () => 'ok' };
  return ch;
}

export function createMockSupabase() {
  return {
    auth,
    storage,
    from: (table) => new Query(table),
    rpc: async (fn) => ({ data: null, error: { message: `rpc ${fn} is not available in prototype mode` } }),
    channel,
    removeChannel: async () => 'ok',
    removeAllChannels: async () => [],
    functions: { invoke: async (name) => ({ data: null, error: { message: `function ${name} is not available in prototype mode` } }) },
  };
}
