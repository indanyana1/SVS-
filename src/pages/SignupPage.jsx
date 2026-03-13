import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
	const saltHex = Array.from(saltBytes)
		.map((value) => value.toString(16).padStart(2, '0'))
		.join('');
	const hashHex = hashArray.map((value) => value.toString(16).padStart(2, '0')).join('');

	return `${saltHex}:${hashHex}`;
};

const SignupPage = () => {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		contact: '',
		password: '',
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState('');
	const [messageType, setMessageType] = useState('idle');

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormData((current) => ({ ...current, [name]: value }));
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

		const { name, email, contact, password } = formData;
		const passwordHash = await generatePasswordHash(password);

		const { error: profileError } = await supabase.from('account_users').insert({
			full_name: name,
			email_address: email,
			contact_number: contact,
			password_hash: passwordHash,
		});

		if (profileError) {
			setMessage(profileError.message);
			setMessageType('error');
			setIsSubmitting(false);
			return;
		}

		setMessage('Account created successfully. Redirecting to markets...');
		setMessageType('success');
		window.localStorage.setItem('svs-authenticated', 'true');
		window.localStorage.setItem('svs-user-email', email);
		window.localStorage.setItem('svs-user-name', name);
		setFormData({ name: '', email: '', contact: '', password: '' });
		setIsSubmitting(false);

		setTimeout(() => {
			navigate('/markets');
		}, 500);
	};

	return (
		<section className="min-h-screen bg-[#0b1220] px-4 pt-28 pb-12 text-slate-100">
			<div className="mx-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 md:p-8">
				<h1 className="text-2xl font-bold text-white">Create Your Account</h1>
				<p className="mt-2 text-sm text-slate-300">
					Enter your details to sign up on SVS E-COMMERCE.
				</p>

				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<div>
						<label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-200">
							Name
						</label>
						<input
							id="name"
							type="text"
							name="name"
							value={formData.name}
							onChange={handleChange}
							required
							placeholder="Enter your full name"
							className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
						/>
					</div>

					<div>
						<label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-200">
							Email Address
						</label>
						<input
							id="email"
							type="email"
							name="email"
							value={formData.email}
							onChange={handleChange}
							required
							placeholder="Enter your email address"
							className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
						/>
					</div>

					<div>
						<label htmlFor="contact" className="mb-1 block text-sm font-medium text-slate-200">
							Contact Number
						</label>
						<input
							id="contact"
							type="tel"
							name="contact"
							value={formData.contact}
							onChange={handleChange}
							required
							placeholder="Enter your contact number"
							className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
						/>
					</div>

					<div>
						<label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-200">
							Password
						</label>
						<input
							id="password"
							type="password"
							name="password"
							value={formData.password}
							onChange={handleChange}
							required
							placeholder="Create your password"
							minLength={6}
							className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
						/>
					</div>

					{message && (
						<p
							className={`rounded-lg border px-3 py-2 text-sm ${
								messageType === 'success'
									? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
									: 'border-red-500/50 bg-red-500/10 text-red-300'
							}`}
						>
							{message}
						</p>
					)}

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400"
					>
						{isSubmitting ? 'Creating Account...' : 'Create Account'}
					</button>
				</form>
			</div>
		</section>
	);
};

export default SignupPage;
