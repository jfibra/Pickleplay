/**
 * Build-time settings. Expo inlines `process.env.EXPO_PUBLIC_*` when it bundles, so each key
 * is referenced literally (no dynamic lookup). Set them in .env (see .env.example), or run
 * `npm run start:prototype`, which uses .env.prototype instead.
 */
const flag = (value) => value === 'true' || value === '1';

/** Offline prototype: sample accounts and data, no Supabase or API calls. */
export const USE_MOCKS = flag(process.env.EXPO_PUBLIC_USE_MOCKS);
