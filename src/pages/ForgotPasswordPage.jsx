import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import StandalonePageShell from '../components/layout/StandalonePageShell';
import { hasSupabaseEnv, supabase } from '../lib/supabase';
import {
	buildResetLink,
	generateResetToken,
	getResetTokenExpiry,
	isDevEnvironment,
	RESET_TOKEN_TTL_MINUTES,
	sendResetEmail,
} from '../lib/passwordReset';

const ForgotPasswordPage = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const role =
		searchParams.get('role') === 'seller' || location.pathname.startsWith('/sell/')
			? 'seller'
			: 'buyer';

	const [email, setEmail] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [status, setStatus] = useState('idle'); // idle | error | sent
	const [message, setMessage] = useState('');
	const [devLink, setDevLink] = useState('');

	const signinHref = role === 'seller' ? '/sell/signin' : '/signin';

	const handleSubmit = async (event) => {
		event.preventDefault();

		if (!hasSupabaseEnv || !supabase) {
			setStatus('error');
			setMessage(
				'Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env and restart the app.',
			);
			return;
		}

		const normalizedEmail = email.trim().toLowerCase();
		if (!normalizedEmail) {
			setStatus('error');
			setMessage('Please enter your email address.');
			return;
		}

		setIsSubmitting(true);
		setStatus('idle');
		setMessage('');
		setDevLink('');

		const escapedEmail = normalizedEmail.replace(/[\\%_]/g, (match) => `\\${match}`);
		const { data: account, error: lookupError } = await supabase
			.from('account_users')
			.select('id, full_name, email_address')
			.ilike('email_address', escapedEmail)
			.maybeSingle();

		if (lookupError) {
			setStatus('error');
			setMessage(lookupError.message);
			setIsSubmitting(false);
			return;
		}

		if (!account) {
			setStatus('error');
			setMessage('That email is not registered. Please check the address or create an account.');
			setIsSubmitting(false);
			return;
		}

		const token = generateResetToken();
		const expiresAt = getResetTokenExpiry();

		const { error: insertError } = await supabase.from('password_reset_tokens').insert({
			token,
			email_address: account.email_address,
			intended_role: role,
			expires_at: expiresAt,
		});

		if (insertError) {
			setStatus('error');
			setMessage(insertError.message);
			setIsSubmitting(false);
			return;
		}

		const resetLink = buildResetLink(token);
		const delivery = await sendResetEmail(supabase, {
			email: account.email_address,
			resetLink,
			role,
			fullName: account.full_name,
		});

		if (delivery.delivered) {
			setStatus('sent');
			setMessage(
				`We've sent a password reset link to ${account.email_address}. The link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.`,
			);
		} else if (isDevEnvironment()) {
			// Dev fallback: surface the link inline so QA can complete the
			// flow without configuring EmailJS yet.
			setStatus('sent');
			setMessage(
				`Reset link generated for ${account.email_address}. (Email delivery isn't configured — use the dev link below.)`,
			);
			setDevLink(resetLink);
		} else {
			setStatus('error');
			setMessage(
				'We couldn\u2019t deliver the reset email. Please contact support, or ask the site administrator to configure EmailJS (REACT_APP_EMAILJS_SERVICE_ID / TEMPLATE_ID / PUBLIC_KEY).',
			);
		}
		setIsSubmitting(false);
	};

	return (
		<StandalonePageShell title="Forgot Password" mainClassName="px-4 py-8 sm:px-6 sm:py-10">
			<section className="px-0 text-slate-100">
				<div className="mx-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 md:p-8">
					<div className="mb-5 flex items-center gap-3">
						<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
							<Mail className="h-5 w-5" />
						</div>
						<div>
							<h1 className="text-xl font-bold text-white">Reset your password</h1>
							<p className="text-xs text-slate-300">
								{role === 'seller' ? 'Seller Central account recovery' : 'Buyer account recovery'}
							</p>
						</div>
					</div>

					<p className="text-sm text-slate-300">
						Enter the email address you used to register. If it matches an account, we&apos;ll email
						you a secure link to set a new password.
					</p>

					<form onSubmit={handleSubmit} className="mt-6 space-y-4">
						<div>
							<label
								htmlFor="forgot-email"
								className="mb-1 block text-sm font-medium text-slate-200"
							>
								Email Address
							</label>
							<input
								id="forgot-email"
								type="email"
								name="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoComplete="email"
								placeholder="you@example.com"
								className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
							/>
						</div>

						{status === 'error' && message ? (
							<p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
								{message}
							</p>
						) : null}

						{status === 'sent' && message ? (
							<div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
								<div className="flex items-start gap-2">
									<CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
									<p>{message}</p>
								</div>
								{devLink ? (
									<div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
										<p className="mb-1 font-semibold">
											Dev mode: email delivery is not configured. Use this link to test the flow:
										</p>
										<a
											href={devLink}
											className="break-all font-mono text-amber-100 underline hover:text-white"
										>
											{devLink}
										</a>
									</div>
								) : null}
							</div>
						) : null}

						<button
							type="submit"
							disabled={isSubmitting || status === 'sent'}
							className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400 disabled:opacity-60"
						>
							{isSubmitting ? 'Sending link…' : status === 'sent' ? 'Email sent' : 'Send reset link'}
						</button>
					</form>

					<div className="mt-6 flex items-center justify-between text-sm">
						<button
							type="button"
							onClick={() => navigate(signinHref)}
							className="inline-flex items-center gap-1.5 text-slate-300 transition hover:text-white"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to sign in
						</button>
						<Link
							to={role === 'seller' ? '/sell/signup' : '/signup'}
							className="font-semibold text-cyan-300 hover:text-cyan-200"
						>
							Create an account
						</Link>
					</div>
				</div>
			</section>
		</StandalonePageShell>
	);
};

export default ForgotPasswordPage;
