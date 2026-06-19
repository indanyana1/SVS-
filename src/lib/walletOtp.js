import { supabase, hasSupabaseEnv } from './supabase';

// Email one-time-code (OTP) confirmation for wallet money movements.
//
// The 6-digit code is generated and hashed server-side by the
// `wallet_request_otp` Postgres function (see
// supabase/wallet-security-and-beneficiaries.sql) and returned to this
// module exactly once. We immediately hand it to EmailJS — the same
// client-side email pipeline `src/lib/passwordReset.js` already uses —
// and never display, log, or persist it anywhere else. `wallet_verify_otp`
// checks a hash comparison and returns a one-time verification id, which
// the caller then passes through to wallet_topup/transfer/spend/withdraw,
// so the database itself enforces that a fresh code was verified —
// calling those RPCs directly without one is rejected server-side.
//
// Reuses the existing REACT_APP_EMAILJS_SERVICE_ID / PUBLIC_KEY. By
// default it reuses REACT_APP_EMAILJS_TEMPLATE_ID too (the same template
// used for password resets) so this works with zero extra setup; set
// REACT_APP_EMAILJS_OTP_TEMPLATE_ID to use a dedicated template with
// wording written for a one-time code instead of a reset link.

const PURPOSE_LABELS = {
  topup: 'Add funds to your wallet',
  transfer: 'Send money from your wallet',
  withdraw: 'Withdraw money from your wallet',
  spend: 'Pay with your wallet',
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const sendOtpEmail = async ({ email, name, code, purpose }) => {
  const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
  const templateId = process.env.REACT_APP_EMAILJS_OTP_TEMPLATE_ID || process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    // eslint-disable-next-line no-console
    console.warn('[walletOtp] EmailJS env vars not set — cannot email the code.');
    return { delivered: false, reason: 'emailjs-not-configured' };
  }

  const displayName = name || 'there';
  const actionLabel = PURPOSE_LABELS[purpose] || 'Confirm this wallet action';

  // Provide multiple aliases so whichever variable the EmailJS template
  // uses in its "To Email" / body setting will resolve correctly — same
  // approach as passwordReset.js. `reset_link` / `link` are populated
  // with the code too so this also reads sensibly on the existing
  // password-reset template if no dedicated OTP template is configured.
  const templateParams = {
    to_email: email,
    user_email: email,
    email,
    recipient: email,
    reply_to: email,
    to_name: displayName,
    user_name: displayName,
    name: displayName,
    otp_code: code,
    code,
    reset_link: code,
    link: code,
    role_label: actionLabel,
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      // eslint-disable-next-line no-console
      console.error('[walletOtp] EmailJS rejected the request:', response.status, text);
      return { delivered: false, reason: text || `http-${response.status}` };
    }
    return { delivered: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[walletOtp] EmailJS fetch threw:', err);
    return { delivered: false, reason: err?.message || 'fetch-failed' };
  }
};

// Generates + emails a fresh code for the given purpose. Returns
// `delivered: false` (with an optional `devCode` outside production) if
// EmailJS isn't configured, so the flow stays testable without it.
export const requestWalletOtp = async ({ email, name, purpose }) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, error: 'You need to be signed in to continue.' };
  if (!hasSupabaseEnv || !supabase) {
    return { ok: false, error: 'Verification codes need a connected Supabase project.' };
  }

  try {
    const { data, error } = await supabase.rpc('wallet_request_otp', {
      p_email: normalized,
      p_purpose: purpose,
    });
    if (error) throw error;

    const emailResult = await sendOtpEmail({ email: normalized, name, code: data, purpose });
    if (!emailResult.delivered) {
      return {
        ok: true,
        delivered: false,
        devCode: process.env.NODE_ENV !== 'production' ? data : undefined,
      };
    }
    return { ok: true, delivered: true };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not send a verification code.' };
  }
};

// Verifies a code and returns a one-time verification id on success.
export const verifyWalletOtp = async ({ email, purpose, code }) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, error: 'You need to be signed in to continue.' };
  if (!code || !String(code).trim()) return { ok: false, error: 'Enter the 6-digit code from your email.' };
  if (!hasSupabaseEnv || !supabase) {
    return { ok: false, error: 'Verification codes need a connected Supabase project.' };
  }

  try {
    const { data, error } = await supabase.rpc('wallet_verify_otp', {
      p_email: normalized,
      p_purpose: purpose,
      p_code: String(code).trim(),
    });
    if (error) throw error;
    return { ok: true, verificationId: data };
  } catch (error) {
    return { ok: false, error: error?.message || 'Incorrect or expired code.' };
  }
};
