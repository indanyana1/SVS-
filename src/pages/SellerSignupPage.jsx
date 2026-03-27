import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store } from 'lucide-react';
import StandalonePageShell from '../components/layout/StandalonePageShell';
import { savePendingSellerSignupDraft } from './sellerSignupDraft';

const generatePasswordHash = async (password) => {
	const saltBytes = crypto.getRandomValues(new Uint8Array(16));
	const encoder = new TextEncoder();
	const passwordBytes = encoder.encode(password);
	const combined = new Uint8Array(saltBytes.length + passwordBytes.length);
	combined.set(saltBytes, 0);
	combined.set(passwordBytes, saltBytes.length);

	const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const saltHex = Array.from(saltBytes)
		.map((v) => v.toString(16).padStart(2, '0'))
		.join('');
	const hashHex = hashArray.map((v) => v.toString(16).padStart(2, '0')).join('');

	return `${saltHex}:${hashHex}`;
};

const SellerSignupPage = () => {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		contact: '',
		password: '',
		confirmPassword: '',
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState('');
	const [messageType, setMessageType] = useState('idle');

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		if (formData.password !== formData.confirmPassword) {
			setMessage('Passwords do not match.');
			setMessageType('error');
			return;
		}

		setIsSubmitting(true);
		setMessage('');
		setMessageType('idle');

		const { name, email, contact, password } = formData;
		const passwordHash = await generatePasswordHash(password);

		const normalizedEmail = email.trim().toLowerCase();
		const trimmedName = name.trim();
		const trimmedContact = contact.trim();

		if (!trimmedName || !normalizedEmail || !trimmedContact) {
			setMessage('Complete your basic account details before continuing.');
			setMessageType('error');
			setIsSubmitting(false);
			return;
		}

		savePendingSellerSignupDraft({
			name: trimmedName,
			email: normalizedEmail,
			contact: trimmedContact,
			passwordHash,
		});

		setMessage('Basic details saved. Continue to business verification…');
		setMessageType('success');
		setFormData({
			name: '',
			email: '',
			contact: '',
			password: '',
			confirmPassword: '',
		});
		setIsSubmitting(false);

		setTimeout(() => {
			navigate('/sell/onboarding');
		}, 500);
	};

	return (
		<StandalonePageShell title="Register as a seller" brandHref="/sell" mainClassName="px-4 py-8 sm:px-6 sm:py-10">
			<div className="mx-auto w-full max-w-md">
				{/* Icon + Title */}
				<div className="mb-6 text-center">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--svs-cyan-surface)]">
						<Store className="h-7 w-7 text-[var(--svs-primary)]" />
					</div>
					<h1 className="text-2xl font-black">Register as a seller</h1>
					<p className="mt-2 text-sm text-[var(--svs-muted)]">
						Already have a buyer account? Use the same email and password to get started.
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
								htmlFor="seller-reg-name"
								className="mb-1.5 block text-sm font-semibold"
							>
								Full Name
							</label>
							<input
								id="seller-reg-name"
								type="text"
								name="name"
								value={formData.name}
								onChange={handleChange}
								required
								placeholder="Your full name"
								className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
							/>
						</div>

						<div>
							<label
								htmlFor="seller-reg-email"
								className="mb-1.5 block text-sm font-semibold"
							>
								Email Address
							</label>
							<input
								id="seller-reg-email"
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
								htmlFor="seller-reg-contact"
								className="mb-1.5 block text-sm font-semibold"
							>
								Contact Number
							</label>
							<input
								id="seller-reg-contact"
								type="tel"
								name="contact"
								value={formData.contact}
								onChange={handleChange}
								required
								placeholder="+27 ..."
								className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
							/>
						</div>

						<div>
							<label
								htmlFor="seller-reg-password"
								className="mb-1.5 block text-sm font-semibold"
							>
								Password
							</label>
							<input
								id="seller-reg-password"
								type="password"
								name="password"
								value={formData.password}
								onChange={handleChange}
								required
								placeholder="Create a strong password"
								className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
							/>
						</div>

						<div>
							<label
								htmlFor="seller-reg-confirm"
								className="mb-1.5 block text-sm font-semibold"
							>
								Confirm Password
							</label>
							<input
								id="seller-reg-confirm"
								type="password"
								name="confirmPassword"
								value={formData.confirmPassword}
								onChange={handleChange}
								required
								placeholder="Repeat your password"
								className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
							/>
						</div>

						<p className="text-xs text-[var(--svs-muted)]">
							By registering, you agree to SVS&apos;s{' '}
							<Link to="/terms" className="text-[var(--svs-primary)] hover:underline">
								Terms of Service
							</Link>{' '}
							and{' '}
							<Link to="/privacy" className="text-[var(--svs-primary)] hover:underline">
								Privacy Policy
							</Link>
							.
						</p>

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full rounded-xl bg-[var(--svs-primary)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
						>
							{isSubmitting ? 'Saving…' : 'Next'}
						</button>
					</form>

					<p className="mt-6 text-center text-sm text-[var(--svs-muted)]">
						Already have an account?{' '}
						<Link
							to="/sell/signin"
							className="font-bold text-[var(--svs-primary)] transition hover:underline"
						>
							Sign in to Seller Central
						</Link>
					</p>
					<p className="mt-3 text-center text-xs text-[var(--svs-muted)]">
						<Link to="/signup" className="transition hover:text-[var(--svs-text)]">
							Register as a buyer instead
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

export default SellerSignupPage;
