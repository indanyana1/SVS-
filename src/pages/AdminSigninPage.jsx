import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import StandalonePageShell from '../components/layout/StandalonePageShell';
import { hasSupabaseEnv, supabase } from '../lib/supabase';

const AdminSigninPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('idle');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!hasSupabaseEnv || !supabase) {
      setMessage('Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env and restart the app.');
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setMessageType('idle');

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

    window.localStorage.setItem('svs-admin-token', data.token);
    window.localStorage.setItem('svs-admin-name', data.full_name || 'Admin');
    setMessage('Signed in. Redirecting to the admin dashboard...');
    setMessageType('success');
    setIsSubmitting(false);

    setTimeout(() => {
      navigate('/admin/dashboard');
    }, 400);
  };

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

        <div className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6 shadow-sm md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {message ? (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  messageType === 'success'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                }`}
              >
                {message}
              </div>
            ) : null}

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
                  onClick={() => setShowPassword((current) => !current)}
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
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--svs-muted)]">
          <Link to="/" className="transition hover:text-[var(--svs-text)]">Back to SVS E-Commerce</Link>
        </p>
      </div>
    </StandalonePageShell>
  );
};

export default AdminSigninPage;
