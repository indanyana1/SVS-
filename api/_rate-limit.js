// Shared rate-limit helper for api/*.js (Vercel serverless functions).
//
// server-utils/rate-limit.js (used by server.js, the local-dev Express
// mirror) keeps its counters in an in-memory Map, which only works within
// one long-lived process. These functions are the real production surface
// and each invocation can land on a different, short-lived instance, so
// this instead calls check_and_record_rate_limit() in Supabase — see
// supabase/api-rate-limiting.sql — which is the shared counter every
// invocation reads/writes, regardless of which instance handled it.
const { createClient } = require('@supabase/supabase-js');

let cachedClient;
const getClient = () => {
  if (cachedClient !== undefined) return cachedClient;
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
  cachedClient = url && key ? createClient(url, key) : null;
  return cachedClient;
};

const getClientIp = (req) => {
  const xff = req.headers?.['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
};

// Call at the top of a handler: `if (await enforceRateLimit(req, res, {...})) return;`
// Writes the 429 response itself when the caller should stop; returns
// false (and does nothing else) when the request may proceed.
//
// Fails OPEN — allows the request through — if Supabase isn't configured
// or the check itself errors. A rate limiter is a defensive layer, not the
// primary correctness guarantee for anything here; it must never become
// the reason a legitimate request fails just because its own dependency
// (or the network hop to it) had a bad moment.
const enforceRateLimit = async (req, res, { name, windowSeconds = 60, max = 60, keyOverride } = {}) => {
  const client = getClient();
  if (!client) return false;

  const identity = keyOverride || getClientIp(req);
  const bucketKey = `${name}:${identity}`;

  try {
    const { data, error } = await client.rpc('check_and_record_rate_limit', {
      p_bucket_key: bucketKey,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error || !Array.isArray(data) || !data.length) return false;

    const { allowed, current_count: currentCount } = data[0];
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - (Number(currentCount) || 0))));

    if (!allowed) {
      res.setHeader('Retry-After', String(windowSeconds));
      res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
      return true;
    }
    return false;
  } catch (_error) {
    return false;
  }
};

module.exports = { enforceRateLimit };
