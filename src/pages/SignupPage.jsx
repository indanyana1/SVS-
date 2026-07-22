import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StandalonePageShell from '../components/layout/StandalonePageShell';
import { hasSupabaseEnv, supabase } from '../lib/supabase';

const generatePasswordHash = async (password) => {
	const saltBytes = crypto.getRandomValues(new Uint8Array(16));
	const encoder = new TextEncoder();
	const passwordBytes = encoder.encode(password);
	const combined = new Uint8Array(saltBytes.length + passwordBytes.length);
	combined.set(saltBytes, 0);
	combined.set(passwordBytes, saltBytes.length);
	const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const saltHex = Array.from(saltBytes).map((v) => v.toString(16).padStart(2, '0')).join('');
	const hashHex = hashArray.map((v) => v.toString(16).padStart(2, '0')).join('');
	return `${saltHex}:${hashHex}`;
};

// Field order used for scroll-to-first-error
const FIELD_ORDER = ['name', 'email', 'contact', 'password'];

const validate = ({ name, email, contact, password }) => {
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
	return errors;
};

const scrollToFirstError = (errors) => {
	for (const key of FIELD_ORDER) {
		if (errors[key]) {
			const el = document.getElementById(`signup-${key}`);
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				el.focus();
			}
			break;
		}
	}
};

const SignupPage = () => {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({ name: '', email: '', contact: '', password: '' });
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
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		const errors = validate(formData);
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			scrollToFirstError(errors);
			return;
		}

		if (!hasSupabaseEnv || !supabase) {
			setMessage('Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env and restart the app.');
			setMessageType('error');
			return;
		}

		setIsSubmitting(true);
		setMessage('');
		setMessageType('idle');
		setFieldErrors({});

		const { name, email, contact, password } = formData;
		const trimmedName = name.trim();
		const normalizedEmail = email.trim().toLowerCase();
		const trimmedContact = contact.trim();
		const passwordHash = await generatePasswordHash(password);

		const { error: profileError } = await supabase.from('account_users').insert({
			full_name: trimmedName,
			email_address: normalizedEmail,
			contact_number: trimmedContact,
			password_hash: passwordHash,
		});

		if (profileError) {
			let friendlyMessage = profileError.message || 'Unable to create your account.';
			if (profileError.code === '23505') {
				if (profileError.message?.includes('account_users_contact_number_key')) {
					friendlyMessage = 'That contact number is already linked to another account. Use a different number or sign in with the existing account.';
				} else if (profileError.message?.includes('account_users_email_address_key')) {
					friendlyMessage = 'That email is already registered. Sign in with the existing account or use a different email.';
				}
			}
			setMessage(friendlyMessage);
			setMessageType('error');
			setIsSubmitting(false);
			return;
		}

		setMessage('Account created successfully. Redirecting to markets...');
		setMessageType('success');
		window.localStorage.setItem('svs-authenticated', 'true');
		window.localStorage.setItem('svs-user-email', normalizedEmail);
		window.localStorage.setItem('svs-user-name', trimmedName);
		window.localStorage.setItem('svs-user-contact', trimmedContact);
		window.localStorage.removeItem('svs-has-seller-access');
		window.localStorage.removeItem('svs-seller-home-path');
		window.dispatchEvent(new Event('svs-auth-changed'));
		setFormData({ name: '', email: '', contact: '', password: '' });
		setIsSubmitting(false);

		setTimeout(() => navigate('/markets'), 500);
	};

	const fieldClass = (name) =>
		`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:ring-2 ${
			fieldErrors[name]
				? 'border-red-500 bg-red-950/30 focus:border-red-400 focus:ring-red-500/30'
				: 'border-slate-700 bg-slate-950/70 focus:border-blue-500 focus:ring-blue-500/30'
		}`;

	return (
		<StandalonePageShell title="Create Your Account" mainClassName="px-4 py-8 sm:px-6 sm:py-10">
			<section className="px-0 text-slate-100">
				<div className="relative mx-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 md:p-8">
					<button
						type="button"
						onClick={() => navigate(-1)}
						aria-label="Cancel"
						className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-900/30 hover:text-rose-400"
					>
						<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
					<h1 className="text-2xl font-bold text-white">Create Your Account</h1>
					<p className="mt-2 text-sm text-slate-300">Enter your details to sign up on Biznisdil.</p>

					<form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
						{/* Full name */}
						<div>
							<label htmlFor="signup-name" className="mb-1 block text-sm font-medium text-slate-200">
								Full name <span className="text-red-400">*</span>
							</label>
							<input
								id="signup-name"
								type="text"
								name="name"
								value={formData.name}
								onChange={handleChange}
								placeholder="Enter your full name"
								autoComplete="name"
								className={fieldClass('name')}
								aria-invalid={Boolean(fieldErrors.name)}
								aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
							/>
							{fieldErrors.name && (
								<p id="signup-name-error" className="mt-1 flex items-center gap-1 text-xs font-medium text-red-400">
									<svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
									{fieldErrors.name}
								</p>
							)}
						</div>

						{/* Email */}
						<div>
							<label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-slate-200">
								Email address <span className="text-red-400">*</span>
							</label>
							<input
								id="signup-email"
								type="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								placeholder="Enter your email address"
								autoComplete="email"
								className={fieldClass('email')}
								aria-invalid={Boolean(fieldErrors.email)}
								aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
							/>
							{fieldErrors.email && (
								<p id="signup-email-error" className="mt-1 flex items-center gap-1 text-xs font-medium text-red-400">
									<svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
									{fieldErrors.email}
								</p>
							)}
						</div>

						{/* Contact */}
						<div>
							<label htmlFor="signup-contact" className="mb-1 block text-sm font-medium text-slate-200">
								Contact number <span className="text-red-400">*</span>
							</label>
							<input
								id="signup-contact"
								type="tel"
								name="contact"
								value={formData.contact}
								onChange={handleChange}
								placeholder="Enter your contact number"
								autoComplete="tel"
								className={fieldClass('contact')}
								aria-invalid={Boolean(fieldErrors.contact)}
								aria-describedby={fieldErrors.contact ? 'signup-contact-error' : undefined}
							/>
							{fieldErrors.contact && (
								<p id="signup-contact-error" className="mt-1 flex items-center gap-1 text-xs font-medium text-red-400">
									<svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
									{fieldErrors.contact}
								</p>
							)}
						</div>

						{/* Password */}
						<div>
							<label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-slate-200">
								Password <span className="text-red-400">*</span>
							</label>
							<input
								id="signup-password"
								type="password"
								name="password"
								value={formData.password}
								onChange={handleChange}
								placeholder="Create your password (min 6 chars)"
								autoComplete="new-password"
								className={fieldClass('password')}
								aria-invalid={Boolean(fieldErrors.password)}
								aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
							/>
							{fieldErrors.password && (
								<p id="signup-password-error" className="mt-1 flex items-center gap-1 text-xs font-medium text-red-400">
									<svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
									{fieldErrors.password}
								</p>
							)}
						</div>

						{message && (
							<p className={`rounded-lg border px-3 py-2 text-sm ${
								messageType === 'success'
									? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
									: 'border-red-500/50 bg-red-500/10 text-red-300'
							}`}>
								{message}
							</p>
						)}

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400 disabled:opacity-60"
						>
							{isSubmitting ? 'Creating Account...' : 'Create Account'}
						</button>
					</form>
				</div>
			</section>
		</StandalonePageShell>
	);
};

export default SignupPage;
