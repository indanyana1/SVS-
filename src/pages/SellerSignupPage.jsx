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

const FIELD_ORDER = ['name', 'email', 'contact', 'password', 'confirmPassword'];

const validate = ({ name, email, contact, password, confirmPassword }) => {
	const errors = {};
	if (!name.trim()) errors.name = 'Full name is required.';
	if (!email.trim()) {
		errors.email = 'Email address is required.';
	} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
		errors.email = 'Enter a valid email address.';
	}
	if (!contact.trim()) errors.contact = 'Contact number is required.';
	if (!password) {
		errors.password = 'Password is required.';
	} else if (password.length < 6) {
		errors.password = 'Password must be at least 6 characters.';
	}
	if (!confirmPassword) {
		errors.confirmPassword = 'Please confirm your password.';
	} else if (password && confirmPassword !== password) {
		errors.confirmPassword = 'Passwords do not match.';
	}
	return errors;
};

const scrollToFirstError = (errors) => {
	for (const key of FIELD_ORDER) {
		if (errors[key]) {
			const el = document.getElementById(`seller-reg-${key === 'confirmPassword' ? 'confirm' : key}`);
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				el.focus();
			}
			break;
		}
	}
};

const ErrorMsg = ({ id, message }) =>
	message ? (
		<p id={id} className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
			<svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
				<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
			</svg>
			{message}
		</p>
	) : null;

const SellerSignupPage = () => {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		contact: '',
		password: '',
		confirmPassword: '',
	});
	const [fieldErrors, setFieldErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState('');
	const [messageType, setMessageType] = useState('idle');

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		if (fieldErrors[name]) {
			setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
		}
		// When editing password, also clear confirmPassword mismatch error
		if (name === 'password' && fieldErrors.confirmPassword) {
			setFieldErrors((prev) => { const next = { ...prev }; delete next.confirmPassword; return next; });
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		const errors = validate(formData);
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			scrollToFirstError(errors);
			return;
		}

		setIsSubmitting(true);
		setMessage('');
		setMessageType('idle');
		setFieldErrors({});

		const { name, email, contact, password } = formData;
		const passwordHash = await generatePasswordHash(password);

		const normalizedEmail = email.trim().toLowerCase();
		const trimmedName = name.trim();
		const trimmedContact = contact.trim();

		savePendingSellerSignupDraft({
			name: trimmedName,
			email: normalizedEmail,
			contact: trimmedContact,
			passwordHash,
		});

		setMessage('Basic details saved. Continue to business verification…');
		setMessageType('success');
		setFormData({ name: '', email: '', contact: '', password: '', confirmPassword: '' });
		setIsSubmitting(false);

		setTimeout(() => {
			navigate('/sell/onboarding');
		}, 500);
	};

	const inputClass = (fieldName) =>
		`w-full rounded-xl border px-4 py-3 text-sm text-[var(--svs-text)] outline-none transition focus:ring-2 ${
			fieldErrors[fieldName]
				? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
				: 'border-[var(--svs-border)] bg-[var(--svs-surface-soft)] focus:border-[var(--svs-primary)] focus:ring-[#33b9f2]/30'
		}`;

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
					<form onSubmit={handleSubmit} noValidate className="space-y-5">
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
							<label htmlFor="seller-reg-name" className="mb-1.5 block text-sm font-semibold">
								Full Name <span className="text-red-500">*</span>
							</label>
							<input
								id="seller-reg-name"
								type="text"
								name="name"
								value={formData.name}
								onChange={handleChange}
								placeholder="Your full name"
								autoComplete="name"
								className={inputClass('name')}
								aria-invalid={Boolean(fieldErrors.name)}
								aria-describedby={fieldErrors.name ? 'sr-name-error' : undefined}
							/>
							<ErrorMsg id="sr-name-error" message={fieldErrors.name} />
						</div>

						<div>
							<label htmlFor="seller-reg-email" className="mb-1.5 block text-sm font-semibold">
								Email Address <span className="text-red-500">*</span>
							</label>
							<input
								id="seller-reg-email"
								type="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								placeholder="your@email.com"
								autoComplete="email"
								className={inputClass('email')}
								aria-invalid={Boolean(fieldErrors.email)}
								aria-describedby={fieldErrors.email ? 'sr-email-error' : undefined}
							/>
							<ErrorMsg id="sr-email-error" message={fieldErrors.email} />
						</div>

						<div>
							<label htmlFor="seller-reg-contact" className="mb-1.5 block text-sm font-semibold">
								Contact Number <span className="text-red-500">*</span>
							</label>
							<input
								id="seller-reg-contact"
								type="tel"
								name="contact"
								value={formData.contact}
								onChange={handleChange}
								placeholder="+27 ..."
								autoComplete="tel"
								className={inputClass('contact')}
								aria-invalid={Boolean(fieldErrors.contact)}
								aria-describedby={fieldErrors.contact ? 'sr-contact-error' : undefined}
							/>
							<ErrorMsg id="sr-contact-error" message={fieldErrors.contact} />
						</div>

						<div>
							<label htmlFor="seller-reg-password" className="mb-1.5 block text-sm font-semibold">
								Password <span className="text-red-500">*</span>
							</label>
							<input
								id="seller-reg-password"
								type="password"
								name="password"
								value={formData.password}
								onChange={handleChange}
								placeholder="Create a strong password (min 6 chars)"
								autoComplete="new-password"
								className={inputClass('password')}
								aria-invalid={Boolean(fieldErrors.password)}
								aria-describedby={fieldErrors.password ? 'sr-password-error' : undefined}
							/>
							<ErrorMsg id="sr-password-error" message={fieldErrors.password} />
						</div>

						<div>
							<label htmlFor="seller-reg-confirm" className="mb-1.5 block text-sm font-semibold">
								Confirm Password <span className="text-red-500">*</span>
							</label>
							<input
								id="seller-reg-confirm"
								type="password"
								name="confirmPassword"
								value={formData.confirmPassword}
								onChange={handleChange}
								placeholder="Repeat your password"
								autoComplete="new-password"
								className={inputClass('confirmPassword')}
								aria-invalid={Boolean(fieldErrors.confirmPassword)}
								aria-describedby={fieldErrors.confirmPassword ? 'sr-confirm-error' : undefined}
							/>
							<ErrorMsg id="sr-confirm-error" message={fieldErrors.confirmPassword} />
						</div>

						<p className="text-xs text-[var(--svs-muted)]">
							By registering, you agree to Biznisdil&apos;s{' '}
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
