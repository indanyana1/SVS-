import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hasSupabaseEnv, supabase } from '../lib/supabase';

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
		.map((value) => value.toString(16).padStart(2, '0'))
		.join('');

	return actualHashHex === expectedHashHex;
};

const SigninPage = () => {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		email: '',
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

		const { email, password } = formData;

		const { data, error } = await supabase
			.from('account_users')
			.select('id, full_name, email_address, password_hash')
			.eq('email_address', email)
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

		setMessage(`Welcome back, ${data.full_name}. Sign in successful.`);
		setMessageType('success');
		window.localStorage.setItem('svs-authenticated', 'true');
		window.localStorage.setItem('svs-user-email', data.email_address);
		window.localStorage.setItem('svs-user-name', data.full_name);
		setFormData({ email: '', password: '' });
		setIsSubmitting(false);

		setTimeout(() => {
			navigate('/markets');
		}, 500);
	};

	return (
		<section className="min-h-screen bg-[#0b1220] px-4 pt-28 pb-12 text-slate-100">
			<div className="mx-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 md:p-8">
				<h1 className="text-2xl font-bold text-white">Sign In</h1>
				<p className="mt-2 text-sm text-slate-300">Enter your account details to continue.</p>

				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<div>
						<label htmlFor="signin-email" className="mb-1 block text-sm font-medium text-slate-200">
							Email Address
						</label>
						<input
							id="signin-email"
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
						<label htmlFor="signin-password" className="mb-1 block text-sm font-medium text-slate-200">
							Password
						</label>
						<input
							id="signin-password"
							type="password"
							name="password"
							value={formData.password}
							onChange={handleChange}
							required
							placeholder="Enter your password"
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
						{isSubmitting ? 'Signing In...' : 'Sign In'}
					</button>
				</form>

				<p className="mt-5 text-center text-sm text-slate-300">
					No account yet?{' '}
					<Link to="/signup" className="font-semibold text-cyan-300 hover:text-cyan-200">
						Create one
					</Link>
				</p>
			</div>
		</section>
	);
};

export default SigninPage;
