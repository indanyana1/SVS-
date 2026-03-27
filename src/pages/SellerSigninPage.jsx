import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store } from 'lucide-react';
import StandalonePageShell from '../components/layout/StandalonePageShell';
import { hasSupabaseEnv, supabase } from '../lib/supabase';
import { hasCompleteSellerProfile } from './SellerOnboardingPage';
import { clearPendingSellerSignupDraft } from './sellerSignupDraft';

const verifyPasswordHash = async (password, storedHash) => {
	if (!storedHash || !storedHash.includes(':')) {
		return false;
	}

	const [saltHex, expectedHashHex] = storedHash.split(':');
	const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g)?.map((hex) => parseInt(hex, 16)) ?? []);

	if (!saltBytes.length || !expectedHashHex) {
		return false;
	}

	const encoder = new TextEncoder();
	const passwordBytes = encoder.encode(password);
	const combined = new Uint8Array(saltBytes.length + passwordBytes.length);
	combined.set(saltBytes, 0);
	combined.set(passwordBytes, saltBytes.length);

	const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
	const actualHashHex = Array.from(new Uint8Array(hashBuffer))
		.map((v) => v.toString(16).padStart(2, '0'))
		.join('');

	return actualHashHex === expectedHashHex;
};

const SellerSigninPage = () => {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({ email: '', password: '' });
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState('');
	const [messageType, setMessageType] = useState('idle');

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		if (!hasSupabaseEnv || !supabase) {
			setMessage(
				'Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env and restart the app.',
			);
			setMessageType('error');
			return;
		}

		setIsSubmitting(true);
		setMessage('');
		setMessageType('idle');

		const { email, password } = formData;
		const normalizedEmail = email.trim().toLowerCase();

		const { data, error } = await supabase
			.from('account_users')
			.select('id, full_name, email_address, password_hash')
			.eq('email_address', normalizedEmail)
			.maybeSingle();

		if (error) {
			setMessage(error.message);
			setMessageType('error');
			setIsSubmitting(false);
			return;
		}

		if (!data) {
			setMessage('Invalid email or password.');
			setMessageType('error');
			setIsSubmitting(false);
			return;
		}

		const isValid = await verifyPasswordHash(password, data.password_hash);

		if (!isValid) {
			setMessage('Invalid email or password.');
			setMessageType('error');
			setIsSubmitting(false);
			return;
		}

		const { data: sellerProfile, error: sellerProfileError } = await supabase
			.from('seller_profiles')
			.select('*')
			.eq('user_email', data.email_address)
			.maybeSingle();

		if (sellerProfileError) {
			setMessage(sellerProfileError.message);
			setMessageType('error');
			setIsSubmitting(false);
			return;
		}

		const sellerProfileIsComplete = hasCompleteSellerProfile(sellerProfile);

		setMessage(`Welcome back, ${data.full_name}. Redirecting to your store…`);
		setMessageType('success');
		clearPendingSellerSignupDraft();
		window.localStorage.setItem('svs-authenticated', 'true');
		window.localStorage.setItem('svs-user-email', normalizedEmail);
		window.localStorage.setItem('svs-user-name', data.full_name);
		if (sellerProfileIsComplete) {
			window.localStorage.setItem('svs-has-seller-access', 'true');
			window.localStorage.setItem('svs-seller-home-path', '/seller/dashboard');
		} else {
			window.localStorage.removeItem('svs-has-seller-access');
			window.localStorage.removeItem('svs-seller-home-path');
		}
		window.dispatchEvent(new Event('svs-auth-changed'));
		setFormData({ email: '', password: '' });
		setIsSubmitting(false);

		setTimeout(() => {
			navigate(sellerProfileIsComplete ? '/seller/dashboard' : '/sell/onboarding');
		}, 500);
	};

	return (
		<StandalonePageShell title="Sign in to Seller Central" brandHref="/sell" mainClassName="px-4 py-8 sm:px-6 sm:py-10">
			<div className="mx-auto w-full max-w-md">
				{/* Icon + Title */}
				<div className="mb-6 text-center">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--svs-cyan-surface)]">
						<Store className="h-7 w-7 text-[var(--svs-primary)]" />
					</div>
					<h1 className="text-2xl font-black">Sign in to Seller Central</h1>
					<p className="mt-2 text-sm text-[var(--svs-muted)]">
						Use your SVS account credentials to access your store.
					</p>
				</div>

				{/* Form Card */}
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
							<label
								htmlFor="seller-signin-email"
								className="mb-1.5 block text-sm font-semibold"
							>
								Email Address
							</label>
							<input
								id="seller-signin-email"
								type="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								required
								placeholder="your@email.com"
								className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
							/>
						</div>

						<div>
							<label
								htmlFor="seller-signin-password"
								className="mb-1.5 block text-sm font-semibold"
							>
								Password
							</label>
							<input
								id="seller-signin-password"
								type="password"
								name="password"
								value={formData.password}
								onChange={handleChange}
								required
								placeholder="Enter your password"
								className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
							/>
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full rounded-xl bg-[var(--svs-primary)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
						>
							{isSubmitting ? 'Signing in…' : 'Sign in to Seller Central'}
						</button>
					</form>

					<p className="mt-6 text-center text-sm text-[var(--svs-muted)]">
						Don&apos;t have a seller account?{' '}
						<Link
							to="/sell/signup"
							className="font-bold text-[var(--svs-primary)] transition hover:underline"
						>
							Register as a seller
						</Link>
					</p>
					<p className="mt-3 text-center text-xs text-[var(--svs-muted)]">
						<Link to="/signin" className="transition hover:text-[var(--svs-text)]">
							Sign in to your buyer account instead
						</Link>
					</p>
				</div>

				<p className="mt-6 text-center text-sm text-[var(--svs-muted)]">
					<Link
						to="/sell"
						className="inline-flex items-center gap-1.5 transition hover:text-[var(--svs-primary)]"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						Back to Seller Central
					</Link>
				</p>
			</div>
		</StandalonePageShell>
	);
};

export default SellerSigninPage;
