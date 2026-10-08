// Small in-memory rate limiting (no extra dependency). Counters reset when the server restarts.

const hits = new Map();

// Generic limiter: max requests per window per key (default: client IP)
export const rateLimit = ({ windowMs, max, message = 'Too many requests, slow down.', key = (req) => req.ip }) => (req, res, next) => {
  const k = key(req);
  const now = Date.now();
  const e = hits.get(k);
  if (!e || e.reset < now) { hits.set(k, { count: 1, reset: now + windowMs }); return next(); }
  if (++e.count > max) {
    res.set('Retry-After', String(Math.ceil((e.reset - now) / 1000)));
    return res.status(429).json({ message });
  }
  next();
};

// Failed-attempt tracker for sign-in and password checks (brute-force protection)
const failures = new Map();
const MAX_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;

export const loginGuard = {
  // seconds left if this key is locked, otherwise 0
  blockedFor(key) {
    const e = failures.get(key);
    if (!e || e.reset < Date.now() || e.count < MAX_FAILS) return 0;
    return Math.ceil((e.reset - Date.now()) / 1000);
  },
  fail(key) {
    const now = Date.now();
    const e = failures.get(key);
    if (!e || e.reset < now) failures.set(key, { count: 1, reset: now + LOCK_MS });
    else e.count++;
  },
  clear(key) { failures.delete(key); },
};

setInterval(() => {
  const now = Date.now();
  for (const [k, e] of hits) if (e.reset < now) hits.delete(k);
  for (const [k, e] of failures) if (e.reset < now) failures.delete(k);
}, 60_000).unref();
