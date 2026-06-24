import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import StandalonePageShell from '../components/layout/StandalonePageShell';
import { hasSupabaseEnv, supabase } from '../lib/supabase';
import { generatePasswordHash } from '../lib/passwordReset';
import { hasCompleteSellerProfile } from './SellerOnboardingPage';
import { clearPendingSellerSignupDraft } from './sellerSignupDraft';

const PASSWORD_MIN_LENGTH = 8;

const ResetPasswordPage = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const token = searchParams.get('token') || '';

	const [tokenState, setTokenState] = useState('validating'); // validating | valid | invalid
	const [tokenError, setTokenError] = useState('');
	const [tokenRow, setTokenRow] = useState(null);

	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');
	const [completed, setCompleted] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const validateToken = async () => {
			if (!hasSupabaseEnv || !supabase) {
				if (!isMounted) return;
				setTokenState('invalid');
				setTokenError(
					'Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env and restart the app.',
				);
				return;
			}
			if (!token) {
				if (!isMounted) return;
				setTokenState('invalid');
				setTokenError('This reset link is missing its security token. Request a new one to continue.');
				return;
			}

			const { data, error } = await supabase
				.from('password_reset_tokens')
				.select('token, email_address, intended_role, expires_at, used_at')
				.eq('token', token)
				.maybeSingle();

			if (!isMounted) return;

			if (error) {
				setTokenState('invalid');
				setTokenError(error.message);
				return;
			}
			if (!data) {
				setTokenState('invalid');
				setTokenError('This reset link is invalid. Request a new one to continue.');
				return;
			}
			if (data.used_at) {
				setTokenState('invalid');
				setTokenError('This reset link has already been used. Request a new one if you need to change your password again.');
				return;
			}
			if (new Date(data.expires_at).getTime() < Date.now()) {
				setTokenState('invalid');
				setTokenError('This reset link has expired. Request a new one to continue.');
				return;
			}

			setTokenRow(data);
			setTokenState('valid');
		};

		validateToken();
		return () => {
			isMounted = false;
		};
	}, [token]);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setSubmitError('');

		if (!tokenRow) {
			setSubmitError('Reset session is no longer valid. Please request a new link.');
			return;
		}
		if (password.length < PASSWORD_MIN_LENGTH) {
			setSubmitError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
			return;
		}
		if (password !== confirmPassword) {
			setSubmitError('Passwords do not match.');
			return;
		}

		setIsSubmitting(true);

		const passwordHash = await generatePasswordHash(password);

		const { data: updatedRows, error: updateError } = await supabase
			.from('account_users')
			.update({ password_hash: passwordHash })
			.eq('email_address', tokenRow.email_address)
			.select('id, full_name, email_address');

		if (updateError) {
			setSubmitError(updateError.message);
			setIsSubmitting(false);
			return;
		}

		const account = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;
		if (!account) {
			setSubmitError('Could not find the account associated with this reset link.');
			setIsSubmitting(false);
			return;
		}

		// Burn the token so it can't be reused.
		await supabase
			.from('password_reset_tokens')
			.update({ used_at: new Date().toISOString() })
			.eq('token', tokenRow.token);

		// Auto sign-in the user and route them to the dashboard they intended.
		let sellerProfileIsComplete = false;
		let sellerProfileIsApproved = false;
		if (tokenRow.intended_role === 'seller') {
			const { data: sellerProfile } = await supabase
				.from('seller_profiles')
				.select('*')
				.eq('user_email', account.email_address)
				.maybeSingle();
			sellerProfileIsComplete = hasCompleteSellerProfile(sellerProfile);
			sellerProfileIsApproved = sellerProfile?.compliance_status === 'approved';
			clearPendingSellerSignupDraft();
		} else {
			const { data: sellerProfile } = await supabase
				.from('seller_profiles')
				.select('*')
				.eq('user_email', account.email_address)
				.maybeSingle();
			sellerProfileIsComplete = hasCompleteSellerProfile(sellerProfile);
			sellerProfileIsApproved = sellerProfile?.compliance_status === 'approved';
		}

		window.localStorage.setItem('svs-authenticated', 'true');
		window.localStorage.setItem('svs-user-email', account.email_address);
		window.localStorage.setItem('svs-user-name', account.full_name);
		if (sellerProfileIsApproved) {
			window.localStorage.setItem('svs-has-seller-access', 'true');
			window.localStorage.setItem('svs-seller-home-path', '/seller/dashboard');
		} else {
			window.localStorage.removeItem('svs-has-seller-access');
			window.localStorage.removeItem('svs-seller-home-path');
		}
		window.dispatchEvent(new Event('svs-auth-changed'));

		setCompleted(true);
		setIsSubmitting(false);

		const destination = (() => {
			if (tokenRow.intended_role === 'seller') {
				if (sellerProfileIsApproved) return '/seller/dashboard';
				return sellerProfileIsComplete ? '/sell/pending-approval' : '/sell/onboarding';
			}
			return '/markets';
		})();

		setTimeout(() => navigate(destination), 1200);
	};

	return (
		<StandalonePageShell title="Reset Password" mainClassName="px-4 py-8 sm:px-6 sm:py-10">
			<section className="px-0 text-slate-100">
				<div className="mx-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 md:p-8">
					<div className="mb-5 flex items-center gap-3">
						<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
							<ShieldCheck className="h-5 w-5" />
						</div>
						<div>
							<h1 className="text-xl font-bold text-white">Set a new password</h1>
							<p className="text-xs text-slate-300">
								{tokenRow?.email_address
									? `For ${tokenRow.email_address}`
									: 'Choose a strong password you haven\u2019t used before.'}
							</p>
						</div>
					</div>

					{tokenState === 'validating' ? (
						<p className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
							Validating your reset link…
						</p>
					) : null}

					{tokenState === 'invalid' ? (
						<div className="space-y-4">
							<p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
								{tokenError}
							</p>
							<Link
								to="/forgot-password"
								className="inline-block w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400"
							>
								Request a new reset link
							</Link>
						</div>
					) : null}

					{tokenState === 'valid' ? (
						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label
									htmlFor="reset-password"
									className="mb-1 block text-sm font-medium text-slate-200"
								>
									New Password
								</label>
								<div className="relative">
									<input
										id="reset-password"
										type={showPassword ? 'text' : 'password'}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										minLength={PASSWORD_MIN_LENGTH}
										autoComplete="new-password"
										placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
										className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 pr-10 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
									/>
									<button
										type="button"
										onClick={() => setShowPassword((c) => !c)}
										aria-label={showPassword ? 'Hide password' : 'Show password'}
										className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-200"
									>
										{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</button>
								</div>
							</div>

							<div>
								<label
									htmlFor="reset-password-confirm"
									className="mb-1 block text-sm font-medium text-slate-200"
								>
									Confirm New Password
								</label>
								<input
									id="reset-password-confirm"
									type={showPassword ? 'text' : 'password'}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
									minLength={PASSWORD_MIN_LENGTH}
									autoComplete="new-password"
									placeholder="Re-enter your new password"
									className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
								/>
							</div>

							{submitError ? (
								<p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
									{submitError}
								</p>
							) : null}

							{completed ? (
								<div className="flex items-start gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
									<CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
									<p>Password updated. Signing you in…</p>
								</div>
							) : null}

							<button
								type="submit"
								disabled={isSubmitting || completed}
								className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400 disabled:opacity-60"
							>
								{isSubmitting ? 'Updating password…' : completed ? 'Success' : 'Update password'}
							</button>
						</form>
					) : null}
				</div>
			</section>
		</StandalonePageShell>
	);
};

export default ResetPasswordPage;
