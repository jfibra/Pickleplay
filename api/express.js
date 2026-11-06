// Single entry point for every Express-backed API path that is more than one segment deep
// (e.g. /api/admin/players/overview, /api/court-managers/invite/<token>).
//
// Vercel only routes the `[...path].js` files in this folder for ONE segment after their prefix
// (/api/admin/users works, /api/admin/users/<id> returns Vercel's NOT_FOUND), so vercel.json
// rewrites those prefixes here and passes the original path as `__route`.
import app from '../web/server.js';

/** Restore the path the browser asked for, so the routes in web/server.js match as they do locally. */
export function restoreOriginalUrl(rawUrl) {
  const url = new URL(rawUrl || '/', 'http://localhost');
  const route = url.searchParams.get('__route');
  if (!route) return rawUrl;
  url.searchParams.delete('__route');
  // Vercel normally keeps the original path on a rewrite; only fall back to __route when it didn't.
  const path = url.pathname === '/api/express' || url.pathname === '/api/express.js' ? route : url.pathname;
  const query = url.searchParams.toString();
  return path + (query ? `?${query}` : '');
}

export default function handler(req, res) {
  req.url = restoreOriginalUrl(req.url);
  return app(req, res);
}
