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
	const origin =
		process.env.REACT_APP_APP_URL ||
		(typeof window !== 'undefined' ? window.location.origin : '');
	return `${origin}/reset-password?token=${token}`;
};

const roleLabel = (role) => (role === 'seller' ? 'Seller Central' : 'Biznisdil');

// Tries the local Express server first (full HTML, no dashboard dependency).
// Falls back to EmailJS if the server is unreachable (e.g. static deploy).
export const sendResetEmail = async (_supabase, { email, resetLink, role, fullName }) => {
	const label = roleLabel(role);

	// ── 1. Server-side nodemailer (preferred) ───────────────────────────
	try {
		const response = await fetch('/api/send-reset-email', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, resetLink, fullName: fullName || 'there', roleLabel: label }),
		});
		if (response.ok) return { delivered: true };
		const err = await response.json().catch(() => ({}));
		// If SMTP isn't configured the server returns 503 — fall through to EmailJS.
		if (response.status !== 503) {
			return { delivered: false, reason: err.error || `server-${response.status}` };
		}
	} catch {
		// Server unreachable (static deploy) — fall through.
	}

	// ── 2. EmailJS browser fallback ─────────────────────────────────────
	const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
	const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
	const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

	if (!serviceId || !templateId || !publicKey) {
		return { delivered: false, reason: 'emailjs-not-configured' };
	}

	try {
		const emailjs = await import('@emailjs/browser');
		await emailjs.send(serviceId, templateId, {
			to_email: email,
			to_name: fullName || 'there',
			reset_link: resetLink,
			role_label: label,
		}, { publicKey });
		return { delivered: true };
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error('[passwordReset] EmailJS send failed:', err);
		return { delivered: false, reason: err?.message || 'send-failed' };
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
