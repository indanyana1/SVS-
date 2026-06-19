import { useCallback, useRef, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { requestWalletOtp, verifyWalletOtp } from '../../lib/walletOtp';
import { hasSupabaseEnv } from '../../lib/supabase';

const RESEND_COOLDOWN_MS = 30000;

const PURPOSE_TITLES = {
  topup: 'Confirm adding funds',
  transfer: 'Confirm sending money',
  withdraw: 'Confirm withdrawal',
  spend: 'Confirm wallet payment',
};

// Gates a wallet action behind an emailed 6-digit code.
//
// Usage: const { confirmWithOtp, otpModalElement } = useWalletOtp({ email, name });
// ...
// const verificationId = await confirmWithOtp('transfer', 'Send R500 to jane@example.com');
// if (!verificationId) return; // user cancelled
// await transferWallet({ ..., otpVerificationId: verificationId });
//
// Render `otpModalElement` once near the top of the page.
export default function useWalletOtp({ email, name }) {
  const [state, setState] = useState(null);
  const [code, setCode] = useState('');
  const resolverRef = useRef(null);

  const close = useCallback((result) => {
    setState(null);
    setCode('');
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (resolve) resolve(result);
  }, []);

  const sendCode = useCallback(async (purpose) => {
    setState((prev) => (prev ? { ...prev, status: 'sending', error: '' } : prev));
    const result = await requestWalletOtp({ email, name, purpose });
    if (!result.ok) {
      setState((prev) => (prev ? { ...prev, status: 'error', error: result.error } : prev));
      return;
    }
    setState((prev) => (prev ? {
      ...prev,
      status: 'awaiting-code',
      error: '',
      delivered: result.delivered,
      devCode: result.devCode,
      cooldownUntil: Date.now() + RESEND_COOLDOWN_MS,
    } : prev));
  }, [email, name]);

  const confirmWithOtp = useCallback((purpose, summary = '') => {
    // The localStorage-only demo path (no Supabase configured) has no
    // server to verify a code against and is already a single-browser
    // demo with no real security model — nothing to gate there.
    if (!hasSupabaseEnv) {
      return Promise.resolve('demo-mode');
    }
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setCode('');
      setState({ purpose, summary, status: 'sending', error: '' });
      sendCode(purpose);
    });
  }, [sendCode]);

  const handleVerify = useCallback(async () => {
    if (!state || code.length !== 6) return;
    setState((prev) => ({ ...prev, status: 'verifying', error: '' }));
    const result = await verifyWalletOtp({ email, purpose: state.purpose, code });
    if (!result.ok) {
      setState((prev) => ({ ...prev, status: 'awaiting-code', error: result.error }));
      return;
    }
    close(result.verificationId);
  }, [state, email, code, close]);

  const canResend = state ? !state.cooldownUntil || Date.now() >= state.cooldownUntil : false;

  const otpModalElement = state ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Verify with one-time code">
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-[var(--svs-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--svs-border)] px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--svs-primary)]">
            <ShieldCheck className="h-4 w-4" />
            {PURPOSE_TITLES[state.purpose] || 'Confirm with a code'}
          </p>
          <button type="button" onClick={() => close(null)} className="rounded-md p-1 text-[var(--svs-muted)] hover:text-[var(--svs-text)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-4 py-4">
          {state.summary ? <p className="text-xs text-[var(--svs-muted)]">{state.summary}</p> : null}
          <p className="text-sm text-[var(--svs-text)]">
            {state.status === 'sending'
              ? 'Sending a 6-digit code to your email…'
              : `Enter the 6-digit code we sent to ${email}.`}
          </p>
          {state.devCode ? (
            <p className="rounded-md border border-dashed border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-xs text-[var(--svs-muted)]">
              EmailJS isn't configured, so here's the code for testing: <span className="font-mono font-bold text-[var(--svs-text)]">{state.devCode}</span>
            </p>
          ) : null}
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            disabled={state.status === 'sending'}
            className="w-full rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-center text-lg font-mono tracking-[0.4em] text-[var(--svs-text)] focus:border-[var(--svs-primary)] focus:outline-none"
          />
          {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
          <button
            type="button"
            onClick={() => sendCode(state.purpose)}
            disabled={state.status === 'sending' || !canResend}
            className="text-xs font-semibold text-[var(--svs-primary)] underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Resend code
          </button>
        </div>
        <div className="flex gap-3 border-t border-[var(--svs-border)] px-4 py-3">
          <button type="button" onClick={() => close(null)} className="flex-1 rounded-md border border-[var(--svs-border)] px-4 py-2 text-sm font-semibold text-[var(--svs-text)]">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={state.status === 'sending' || state.status === 'verifying' || code.length !== 6}
            className="flex-1 rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.status === 'verifying' ? 'Verifying…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirmWithOtp, otpModalElement };
}
