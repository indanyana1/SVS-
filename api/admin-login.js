// Proxies the admin password-login RPC so it can be gated by a trustworthy,
// server-detected IP address instead of trusting whatever a client claims.
//
// Why this can't just be a direct supabase.rpc('admin_login', ...) call
// from the browser (as it was before): Postgres/PostgREST never sees the
// real caller's IP unless something in front of it puts one there — a
// client-supplied "my IP is X" parameter is trivially spoofable by exactly
// the attacker this feature exists to stop. Vercel's edge, on the other
// hand, appends the real connecting IP to X-Forwarded-For before this
// function ever runs, the same way api/_rate-limit.js already relies on
// for its own IP-keyed buckets.
//
// Flow: check supabase/admin-login-security.sql's block list first (before
// touching a password at all) -> call the existing, unmodified admin_login
// RPC from admin-panel.sql -> record the attempt (success or fail) either
// way. The record step runs whether or not admin_login succeeded, so the
// attempt ledger is always complete.
const { createClient } = require('@supabase/supabase-js');
const { enforceRateLimit } = require('./_rate-limit');

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // Separate from the IP block list below — this just stops a single IP
  // from flooding the endpoint with raw request volume regardless of
  // whether individual attempts look like real login tries.
  if (await enforceRateLimit(req, res, { name: 'admin-login', windowSeconds: 60, max: 20 })) return;

  const client = getClient();
  if (!client) {
    return res.status(500).json({ error: 'Supabase is not configured on the server.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const ip = getClientIp(req);
  const userAgent = String(req.headers?.['user-agent'] || '').slice(0, 500);

  try {
    const { data: isBlocked } = await client.rpc('admin_check_ip_block', { p_ip_address: ip });
    if (isBlocked) {
      // Deliberately no record_login_attempt call here — an already-blocked
      // IP hammering the endpoint shouldn't keep padding out the attempt
      // ledger with entries that don't add any new information.
      return res.status(403).json({ error: 'Too many failed attempts from this network. Try again later.' });
    }

    const { data: loginResult, error: loginError } = await client.rpc('admin_login', {
      p_email: email,
      p_password: password,
    });

    const success = Boolean(loginResult?.token);

    await client.rpc('admin_record_login_attempt', {
      p_attempted_email: email,
      p_ip_address: ip,
      p_user_agent: userAgent,
      p_method: 'password',
      p_success: success,
      p_failure_reason: success ? null : (loginError?.message || 'invalid_credentials'),
    });

    if (!success) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.status(200).json(loginResult);
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Login failed.' });
  }
};
