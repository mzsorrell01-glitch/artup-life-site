// Minimal signed-session auth for the single-admin ArtUP Life dashboard.
// No JWT / bcrypt dependency: the credential is a single shared secret
// (ADMIN_USERNAME/ADMIN_PASSWORD env vars) compared in constant time,
// and the session is a JSON payload + HMAC-SHA256 signature using
// ADMIN_SESSION_SECRET, so it can't be forged without that secret.
const crypto = require('crypto');

const COOKIE_NAME = 'artup_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sign(payloadObj) {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') === -1) return null;
  const [payload, sig] = token.split('.');
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!obj.exp || Date.now() > obj.exp) return null;
    return obj;
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function checkCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME || '';
  const expectedPass = process.env.ADMIN_PASSWORD || '';
  const u = Buffer.from(String(username || ''));
  const p = Buffer.from(String(password || ''));
  const eu = Buffer.from(expectedUser);
  const ep = Buffer.from(expectedPass);
  const userOk = u.length === eu.length && crypto.timingSafeEqual(u, eu);
  const passOk = p.length === ep.length && crypto.timingSafeEqual(p, ep);
  return userOk && passOk;
}

function issueSessionCookie(res, username) {
  const token = sign({ u: username, exp: Date.now() + SESSION_TTL_MS });
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

function requireAdmin(req) {
  const cookies = parseCookies(req);
  return verify(cookies[COOKIE_NAME]);
}

module.exports = { checkCredentials, issueSessionCookie, clearSessionCookie, requireAdmin, COOKIE_NAME };
