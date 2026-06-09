// Lightweight in-memory rate limiter middleware for Express.
//
// Why not use express-rate-limit? Keeping this dependency-free so the
// local dev server stays slim. For multi-instance production deploys
// swap the in-memory Map for Redis (e.g. ioredis + lua script).
//
// Usage:
//   const { rateLimit } = require('./server-utils/rate-limit');
//   app.use('/api/payment-intent', rateLimit({ windowMs: 60_000, max: 10 }));
//
// Behaviour:
//   * Per-IP sliding window (effectively a fixed window per `windowMs`).
//   * Returns 429 with Retry-After header when exceeded.
//   * Exposes X-RateLimit-* headers so clients can back off intelligently.

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX = 60;           // 60 requests / minute / IP

const buckets = new Map(); // key -> { count, resetAt }

function getClientKey(req) {
  // Trust the leftmost public IP in X-Forwarded-For when behind a proxy
  // (Vercel, Cloudflare). Fall back to req.ip / connection address.
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function rateLimit(options = {}) {
  const windowMs = Number(options.windowMs) || DEFAULT_WINDOW_MS;
  const max = Number(options.max) || DEFAULT_MAX;
  const keyFn = typeof options.keyGenerator === 'function' ? options.keyGenerator : getClientKey;
  const messageBody = options.message || { error: 'Too many requests. Please slow down and try again shortly.' };

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = `${keyFn(req)}:${req.baseUrl || ''}${req.path || ''}`;

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    const resetSec = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSec));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(resetSec));
      return res.status(429).json(messageBody);
    }

    return next();
  };
}

// Periodic cleanup so old buckets don't pile up forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60_000).unref?.();

module.exports = { rateLimit };
