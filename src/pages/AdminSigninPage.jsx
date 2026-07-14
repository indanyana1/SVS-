import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Fingerprint, MonitorSmartphone, X } from 'lucide-react';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import StandalonePageShell from '../components/layout/StandalonePageShell';
import { hasSupabaseEnv, supabase } from '../lib/supabase';

const LAST_EMAIL_KEY = 'svs-admin-last-email';

const AdminSigninPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('idle');
  const [showPassword, setShowPassword] = useState(false);

  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricWorking, setBiometricWorking] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [registerDeviceName, setRegisterDeviceName] = useState('');
  const [registerWorking, setRegisterWorking] = useState(false);
  const [registerMessage, setRegisterMessage] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  useEffect(() => {
    setBiometricSupported(browserSupportsWebAuthn());
    const saved = window.localStorage.getItem(LAST_EMAIL_KEY);
    if (saved) setFormData((prev) => ({ ...prev, email: saved }));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveSession = useCallback((data, email) => {
    window.localStorage.setItem('svs-admin-token', data.token);
    window.localStorage.setItem('svs-admin-name', data.full_name || 'Admin');
    window.localStorage.setItem(LAST_EMAIL_KEY, email);
  }, []);

  // ── Password login ───────────────────────────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasSupabaseEnv || !supabase) {
      setMessage('Supabase is not configured.');
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    const { data, error } = await supabase.rpc('admin_login', {
      p_email: formData.email.trim().toLowerCase(),
      p_password: formData.password,
    });

    if (error || !data?.token) {
      setMessage('Invalid email or password.');
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    const email = formData.email.trim().toLowerCase();
    saveSession(data, email);
    setSessionToken(data.token);
    setIsSubmitting(false);

    if (browserSupportsWebAuthn()) {
      setShowRegisterPrompt(true);
      setRegisterDeviceName(getDefaultDeviceName());
      setMessage('Signed in successfully.');
      setMessageType('success');
    } else {
      setMessage('Signed in. Redirecting…');
      setMessageType('success');
      setTimeout(() => navigate('/admin/dashboard'), 400);
    }
  };

  // ── Biometric login ──────────────────────────────────────────────────────
  const handleBiometricLogin = useCallback(async () => {
    if (!supabase) return;
    const email = formData.email.trim().toLowerCase();
    if (!email) {
      setMessage('Enter your email address first.');
      setMessageType('error');
      return;
    }

    setBiometricWorking(true);
    setMessage('');

    try {
      const { data: opts, error: optsErr } = await supabase.functions.invoke('webauthn-authenticate', {
        body: { step: 'options', admin_email: email },
      });
      if (optsErr || opts?.error) {
        setMessage(opts?.error || 'No biometric registered for this account. Sign in with password first.');
        setMessageType('error');
        setBiometricWorking(false);
        return;
      }

      // startAuthentication handles all base64url decoding/encoding internally
      const authResponse = await startAuthentication({ optionsJSON: opts });

      const { data: result, error: verifyErr } = await supabase.functions.invoke('webauthn-authenticate', {
        body: { step: 'verify', admin_email: email, authentication_response: authResponse },
      });

      if (verifyErr || !result?.verified) {
        setMessage(result?.error || 'Biometric authentication failed.');
        setMessageType('error');
        setBiometricWorking(false);
        return;
      }

      saveSession(result, email);
      setMessage('Signed in with biometric. Redirecting…');
      setMessageType('success');
      setTimeout(() => navigate('/admin/dashboard'), 400);
    } catch (err) {
      setMessage(err?.name === 'NotAllowedError' ? 'Biometric cancelled.' : (err?.message || 'Biometric login failed.'));
      setMessageType('error');
    }
    setBiometricWorking(false);
  }, [formData.email, navigate, saveSession]);

  // ── Register this device ─────────────────────────────────────────────────
  const handleRegisterDevice = useCallback(async () => {
    if (!supabase || !sessionToken) return;
    const email = formData.email.trim().toLowerCase();

    setRegisterWorking(true);
    setRegisterMessage('');

    try {
      const { data: opts, error: optsErr } = await supabase.functions.invoke('webauthn-register', {
        body: { step: 'options', admin_email: email, admin_token: sessionToken },
      });
      if (optsErr || opts?.error) {
        setRegisterMessage(opts?.error || 'Could not start registration.');
        setRegisterWorking(false);
        return;
      }

      // startRegistration handles all base64url decoding/encoding internally
      const regResponse = await startRegistration({ optionsJSON: opts });

      const { data: result, error: verifyErr } = await supabase.functions.invoke('webauthn-register', {
        body: {
          step: 'verify',
          admin_email: email,
          admin_token: sessionToken,
          registration_response: regResponse,
          device_name: registerDeviceName.trim() || getDefaultDeviceName(),
        },
      });

      if (verifyErr || !result?.verified) {
        setRegisterMessage(result?.error || 'Registration failed.');
        setRegisterWorking(false);
        return;
      }

      navigate('/admin/dashboard');
    } catch (err) {
      setRegisterMessage(
        err?.name === 'NotAllowedError'
          ? 'Biometric cancelled. You can enable it later from the dashboard.'
          : (err?.message || 'Registration failed.'),
      );
    }
    setRegisterWorking(false);
  }, [sessionToken, formData.email, registerDeviceName, navigate]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <StandalonePageShell title="Admin Sign In" mainClassName="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--svs-cyan-surface)]">
            <ShieldCheck className="h-7 w-7 text-[var(--svs-primary)]" />
          </div>
          <h1 className="text-2xl font-black">Admin Sign In</h1>
          <p className="mt-2 text-sm text-[var(--svs-muted)]">Restricted access for platform administrators only.</p>
        </div>

        {showRegisterPrompt ? (
          <div className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6 shadow-sm md:p-8">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--svs-cyan-surface)]">
                <Fingerprint className="h-5 w-5 text-[var(--svs-primary)]" />
              </div>
              <div>
                <p className="font-bold text-[var(--svs-text)]">Enable biometric sign-in?</p>
                <p className="mt-0.5 text-sm text-[var(--svs-muted)]">
                  Use Face ID, fingerprint, or Windows Hello to sign in instantly next time — no password needed.
                </p>
              </div>
            </div>

            {registerMessage ? (
              <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
                {registerMessage}
              </div>
            ) : null}

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--svs-muted)]">
                Device name (optional)
              </label>
              <div className="flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4 shrink-0 text-[var(--svs-muted)]" />
                <input
                  type="text"
                  value={registerDeviceName}
                  onChange={(e) => setRegisterDeviceName(e.target.value)}
                  placeholder={getDefaultDeviceName()}
                  maxLength={60}
                  className="flex-1 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none focus:border-[var(--svs-primary)]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRegisterDevice}
                disabled={registerWorking}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--svs-primary)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                <Fingerprint className="h-4 w-4" />
                {registerWorking ? 'Registering…' : 'Enable biometric'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--svs-muted)] transition hover:text-[var(--svs-text)]"
              >
                <X className="h-4 w-4" />
                Skip
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-[var(--svs-muted)]">
              Your biometric data never leaves this device. Only a cryptographic key is stored on our server.
            </p>
          </div>
        ) : (
          <div className="space-y-5 rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6 shadow-sm md:p-8">
            {message ? (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium ${messageType === 'success' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                {message}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="admin-signin-email" className="mb-1.5 block text-sm font-semibold">Email Address</label>
                <input
                  id="admin-signin-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="admin@svs.app"
                  className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
                />
              </div>

              <div>
                <label htmlFor="admin-signin-password" className="mb-1.5 block text-sm font-semibold">Password</label>
                <div className="relative">
                  <input
                    id="admin-signin-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 pr-11 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--svs-muted)] transition hover:text-[var(--svs-text)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[var(--svs-primary)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in…' : 'Sign In with Password'}
              </button>
            </form>

            {biometricSupported ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--svs-border)]" />
                  <span className="text-xs font-semibold text-[var(--svs-muted)]">or</span>
                  <div className="h-px flex-1 bg-[var(--svs-border)]" />
                </div>
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={biometricWorking}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-[var(--svs-primary)] bg-[var(--svs-cyan-surface)] px-4 py-3 text-sm font-bold text-[var(--svs-primary)] transition hover:bg-[var(--svs-primary)] hover:text-white disabled:opacity-60"
                >
                  <Fingerprint className="h-5 w-5" />
                  {biometricWorking ? 'Authenticating…' : 'Sign in with Biometric'}
                </button>
                <p className="text-center text-[11px] text-[var(--svs-muted)]">Face ID · Fingerprint · Windows Hello</p>
              </>
            ) : null}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-[var(--svs-muted)]">
          <Link to="/" className="transition hover:text-[var(--svs-text)]">Back to SVS E-Commerce</Link>
        </p>
      </div>
    </StandalonePageShell>
  );
};

function getDefaultDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android device';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'This device';
}

export default AdminSigninPage;
