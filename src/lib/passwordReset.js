// Shared helpers for the forgot-password / reset-password flow.
// Mirrors the salt:hash format used by SignupPage and SigninPage so
// rotated passwords stay compatible with the existing verifier.

const TOKEN_TTL_MINUTES = 30;

const toHex = (bytes) =>
	Array.from(bytes)
		.map((value) => value.toString(16).padStart(2, '0'))
		.join('');

export const generatePasswordHash = async (password) => {
	const saltBytes = crypto.getRandomValues(new Uint8Array(16));
	const encoder = new TextEncoder();
	const passwordBytes = encoder.encode(password);
	const combined = new Uint8Array(saltBytes.length + passwordBytes.length);
	combined.set(saltBytes, 0);
	combined.set(passwordBytes, saltBytes.length);

	const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
	return `${toHex(saltBytes)}:${toHex(new Uint8Array(hashBuffer))}`;
};

export const generateResetToken = () => {
	const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
	return toHex(tokenBytes);
};

export const getResetTokenExpiry = () =>
	new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

export const RESET_TOKEN_TTL_MINUTES = TOKEN_TTL_MINUTES;

export const buildResetLink = (token) => {
	if (typeof window === 'undefined') return `/reset-password?token=${token}`;
	return `${window.location.origin}/reset-password?token=${token}`;
};

// Best-effort email delivery via EmailJS (https://www.emailjs.com).
// EmailJS has a generous free tier (200 emails/month) and runs entirely
// from the browser — no Supabase Edge Functions, no SMTP server, no
// backend to host. Configure these three env vars in your `.env`
// (CRA-style names so they work with the existing build):
//
//   REACT_APP_EMAILJS_SERVICE_ID=service_xxxxxxx
//   REACT_APP_EMAILJS_TEMPLATE_ID=template_xxxxxxx
//   REACT_APP_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxx
//
// IMPORTANT — EmailJS template configuration:
// In the EmailJS dashboard, open your template → Settings tab, and set
// the "To Email" field to `{{to_email}}` (NOT a hardcoded address).
// Otherwise every reset email goes to whatever literal address you
// typed when you created the template.
//
// The template body can reference any of these variables:
//   {{to_email}} / {{user_email}} / {{email}}   — recipient (aliases)
//   {{to_name}}  / {{user_name}} / {{name}}     — recipient name
//   {{reset_link}}                              — the link to click
//   {{role_label}}                              — "Seller Central" or "SVS"
//
// If the env vars aren't set the UI gracefully falls back to showing
// the reset link inline so the developer / user can still complete
// the flow during testing.
export const sendResetEmail = async (_supabase, { email, resetLink, role, fullName }) => {
	const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
	const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
	const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

	if (!serviceId || !templateId || !publicKey) {
		// eslint-disable-next-line no-console
		console.warn('[passwordReset] EmailJS env vars not set:', {
			hasServiceId: Boolean(serviceId),
			hasTemplateId: Boolean(templateId),
			hasPublicKey: Boolean(publicKey),
		});
		return { delivered: false, reason: 'emailjs-not-configured' };
	}

	const roleLabel = role === 'seller' ? 'Seller Central' : 'Biznisdil';
	const displayName = fullName || 'there';

	// Provide multiple aliases for the recipient so whichever variable
	// the EmailJS template uses in its "To Email" setting will resolve
	// to the registered address.
	const templateParams = {
		to_email: email,
		user_email: email,
		email,
		recipient: email,
		reply_to: email,
		to_name: displayName,
		user_name: displayName,
		name: displayName,
		reset_link: resetLink,
		link: resetLink,
		role_label: roleLabel,
	};

	// eslint-disable-next-line no-console
	console.info('[passwordReset] Sending reset email via EmailJS', {
		serviceId,
		templateId,
		to: email,
	});

	try {
		const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				service_id: serviceId,
				template_id: templateId,
				user_id: publicKey,
				template_params: templateParams,
			}),
		});

		if (!response.ok) {
			const text = await response.text().catch(() => '');
			// eslint-disable-next-line no-console
			console.error('[passwordReset] EmailJS rejected the request:', response.status, text);
			return { delivered: false, reason: text || `http-${response.status}` };
		}
		return { delivered: true };
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error('[passwordReset] EmailJS fetch threw:', err);
		return { delivered: false, reason: err?.message || 'fetch-failed' };
	}
};

export const isDevEnvironment = () => {
	// Hostname check is the most reliable signal across CRA / Vite / SSR.
	if (typeof window !== 'undefined') {
		const host = window.location.hostname;
		if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')) {
			return true;
		}
	}
	try {
		if (import.meta.env?.DEV) return true;
	} catch (_) {
		/* import.meta unavailable */
	}
	if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') return true;
	return false;
};
