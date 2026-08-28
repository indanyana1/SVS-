import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from 'https://esm.sh/@simplewebauthn/server@13';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const ok = (body: unknown) => new Response(JSON.stringify(body), { headers: CORS });
const err = (message: string) => new Response(JSON.stringify({ error: message }), { headers: CORS });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_) {
    return err('Invalid JSON body');
  }

  const { step, admin_email, authentication_response } = body as Record<string, unknown>;

  if (!admin_email) return err('admin_email required');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return err('Supabase env vars not set');

  const supabase = createClient(supabaseUrl, serviceKey);

  // Same IP block list the password login path (api/admin-login.js) checks
  // — see supabase/admin-login-security.sql. Edge Functions sit behind
  // Supabase's own edge, which appends the real connecting IP the same way
  // Vercel's does, so this is just as trustworthy as the password path's.
  // Checked on every call (both the 'options' and 'verify' steps) so a
  // blocked IP can't even enumerate which credentials exist.
  const clientIp = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const { data: isBlocked } = await supabase.rpc('admin_check_ip_block', { p_ip_address: clientIp });
  if (isBlocked) {
    return err('Too many failed attempts from this network. Try again later.');
  }

  const requestOrigin = req.headers.get('origin') ?? '';
  let rpID: string;
  let expectedOrigin: string;
  try {
    const u = new URL(requestOrigin);
    rpID = u.hostname;
    expectedOrigin = u.origin;
  } catch {
    rpID = Deno.env.get('WEBAUTHN_RP_ID') ?? 'localhost';
    expectedOrigin = Deno.env.get('WEBAUTHN_ORIGIN') ?? 'http://localhost:3000';
  }

  // ── Step 1: generate authentication options ──────────────────────────────
  if (step === 'options') {
    try {
      const { data: credentials, error: credsErr } = await supabase
        .from('admin_webauthn_credentials')
        .select('credential_id')
        .eq('admin_email', (admin_email as string).toLowerCase());

      if (credsErr) return err('DB error: ' + credsErr.message);
      if (!credentials || credentials.length === 0) {
        return err('No biometric credentials registered for this account.');
      }

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: credentials.map((c: { credential_id: string }) => ({
          id: c.credential_id,
          type: 'public-key' as const,
        })),
        userVerification: 'preferred',
      });

      await supabase.from('admin_webauthn_challenges').delete().lt('expires_at', new Date().toISOString());
      const { error: insertErr } = await supabase.from('admin_webauthn_challenges').insert({
        admin_email: (admin_email as string).toLowerCase(),
        challenge: options.challenge,
        type: 'authentication',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      if (insertErr) return err('DB error storing challenge: ' + insertErr.message);

      return ok(options);
    } catch (e) {
      return err('options error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // ── Step 2: verify & issue session token ────────────────────────────────
  if (step === 'verify') {
    // Records every outcome (success or fail, and why) to the same ledger
    // the password login path writes to, keyed by the same IP already
    // checked against the block list above — so the auto-block threshold
    // in admin_record_login_attempt() catches a brute-force attempt
    // regardless of which of the two login paths it comes through.
    const recordAttempt = (success: boolean, reason?: string) =>
      supabase.rpc('admin_record_login_attempt', {
        p_attempted_email: (admin_email as string).toLowerCase(),
        p_ip_address: clientIp,
        p_user_agent: req.headers.get('user-agent') ?? null,
        p_method: 'webauthn',
        p_success: success,
        p_failure_reason: success ? null : (reason ?? null),
      });

    try {
      const { data: challengeRow } = await supabase
        .from('admin_webauthn_challenges')
        .select('challenge, id')
        .eq('admin_email', (admin_email as string).toLowerCase())
        .eq('type', 'authentication')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!challengeRow) {
        await recordAttempt(false, 'challenge_expired');
        return err('Challenge expired. Try again.');
      }

      const credentialId = (authentication_response as Record<string, string>)?.id;
      const { data: stored, error: storedErr } = await supabase
        .from('admin_webauthn_credentials')
        .select('*')
        .eq('credential_id', credentialId)
        .eq('admin_email', (admin_email as string).toLowerCase())
        .maybeSingle();

      if (storedErr) {
        await recordAttempt(false, 'db_error');
        return err('DB error: ' + storedErr.message);
      }
      if (!stored) {
        await recordAttempt(false, 'credential_not_found');
        return err('Credential not found.');
      }

      const publicKeyBytes = Uint8Array.from(atob(stored.public_key), (c: string) => c.charCodeAt(0));

      const verification = await verifyAuthenticationResponse({
        response: authentication_response as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
        expectedChallenge: challengeRow.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: stored.credential_id,
          publicKey: publicKeyBytes,
          counter: stored.counter,
        },
        requireUserVerification: false,
      });

      if (!verification.verified) {
        await recordAttempt(false, 'verification_failed');
        return err('Biometric authentication failed.');
      }

      await supabase
        .from('admin_webauthn_credentials')
        .update({ counter: verification.authenticationInfo.newCounter })
        .eq('credential_id', credentialId);

      await supabase.from('admin_webauthn_challenges').delete().eq('id', challengeRow.id);

      const { data: tokenData, error: tokenErr } = await supabase.rpc('admin_webauthn_issue_token', {
        p_email: (admin_email as string).toLowerCase(),
      });

      if (tokenErr || !tokenData) {
        await recordAttempt(false, 'token_issue_failed');
        return err('Could not create session: ' + (tokenErr?.message ?? 'unknown'));
      }

      await recordAttempt(true);
      return ok({ verified: true, ...tokenData });
    } catch (e) {
      await recordAttempt(false, 'exception');
      return err('verify error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  return err('Invalid step: ' + String(step));
});
