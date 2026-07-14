import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from 'https://esm.sh/@simplewebauthn/server@13';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Always 200 — errors go in the body so the client can read them
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

  const { step, admin_email, admin_token, registration_response, device_name } = body as Record<string, string>;

  if (!admin_email) return err('admin_email required');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return err('Supabase env vars not set');

  const supabase = createClient(supabaseUrl, serviceKey);

  // Verify admin session (only admins can register a device)
  const { data: session, error: sessionErr } = await supabase.rpc('admin_verify_session', {
    p_token: admin_token ?? '',
  });
  if (sessionErr || !session?.admin_email) {
    return err('Unauthorized: ' + (sessionErr?.message ?? 'no session'));
  }
  if (session.admin_email.toLowerCase() !== admin_email.toLowerCase()) {
    return err('Unauthorized: email mismatch');
  }

  const rpID = Deno.env.get('WEBAUTHN_RP_ID') ?? 'localhost';
  const expectedOrigin = Deno.env.get('WEBAUTHN_ORIGIN') ?? `http://localhost:3000`;

  // ── Step 1: generate options ─────────────────────────────────────────────
  if (step === 'options') {
    try {
      const { data: existing } = await supabase
        .from('admin_webauthn_credentials')
        .select('credential_id')
        .eq('admin_email', admin_email.toLowerCase());

      const options = await generateRegistrationOptions({
        rpName: 'SVS E-COMMERCE Admin',
        rpID,
        userID: new TextEncoder().encode(admin_email.toLowerCase()),
        userName: admin_email.toLowerCase(),
        userDisplayName: admin_email.toLowerCase(),
        attestationType: 'none',
        excludeCredentials: (existing ?? []).map((c: { credential_id: string }) => ({
          id: c.credential_id,
          type: 'public-key' as const,
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform',
        },
      });

      // Expire old challenges then store new one
      await supabase.from('admin_webauthn_challenges').delete().lt('expires_at', new Date().toISOString());
      const { error: insertErr } = await supabase.from('admin_webauthn_challenges').insert({
        admin_email: admin_email.toLowerCase(),
        challenge: options.challenge,
        type: 'registration',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      if (insertErr) return err('DB error storing challenge: ' + insertErr.message);

      return ok(options);
    } catch (e) {
      return err('options error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // ── Step 2: verify ───────────────────────────────────────────────────────
  if (step === 'verify') {
    try {
      const { data: challengeRow } = await supabase
        .from('admin_webauthn_challenges')
        .select('challenge, id')
        .eq('admin_email', admin_email.toLowerCase())
        .eq('type', 'registration')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!challengeRow) return err('Challenge expired. Try again.');

      const verification = await verifyRegistrationResponse({
        response: registration_response as unknown as Parameters<typeof verifyRegistrationResponse>[0]['response'],
        expectedChallenge: challengeRow.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return err('Biometric verification failed.');
      }

      const { credential } = verification.registrationInfo;
      const publicKeyBase64 = btoa(String.fromCharCode(...credential.publicKey));

      const { error: upsertErr } = await supabase.from('admin_webauthn_credentials').upsert(
        {
          admin_email: admin_email.toLowerCase(),
          credential_id: credential.id,
          public_key: publicKeyBase64,
          counter: credential.counter,
          device_name: (device_name as string) ?? 'Unknown device',
        },
        { onConflict: 'credential_id' },
      );
      if (upsertErr) return err('DB error saving credential: ' + upsertErr.message);

      await supabase.from('admin_webauthn_challenges').delete().eq('id', challengeRow.id);

      return ok({ verified: true });
    } catch (e) {
      return err('verify error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  return err('Invalid step: ' + step);
});
