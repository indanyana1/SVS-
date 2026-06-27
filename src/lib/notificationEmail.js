// Emails a copy of an in-app notification (booking confirmed/rescheduled/
// declined, order placed/status updates, seller application reviewed, new
// chat messages, etc.) so a user who isn't actively in the app still finds
// out. Reuses the same client-side EmailJS pipeline as
// src/lib/passwordReset.js / src/lib/walletOtp.js — no backend needed.
//
// Configure REACT_APP_EMAILJS_NOTIFICATION_TEMPLATE_ID in `.env` with a
// template whose body uses {{notification_title}} / {{notification_message}}
// / {{action_url}}. Falls back to REACT_APP_EMAILJS_TEMPLATE_ID (the
// password-reset template) when unset, passing the title/message into its
// `reset_link`/`link` variables too so it still renders something readable
// without any extra EmailJS setup.
//
// Best-effort only: every call site treats a failed/unconfigured send as a
// no-op (the in-app notification itself already succeeded independently),
// matching the rest of this app's "email is a bonus channel" philosophy.

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const sendNotificationEmail = async ({ email, name, title, message, link }) => {
	const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
	const templateId = process.env.REACT_APP_EMAILJS_NOTIFICATION_TEMPLATE_ID || process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
	const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

	const normalizedEmail = normalizeEmail(email);
	if (!normalizedEmail) {
		return { delivered: false, reason: 'no-recipient' };
	}

	if (!serviceId || !templateId || !publicKey) {
		// eslint-disable-next-line no-console
		console.warn('[notificationEmail] EmailJS env vars not set — skipping email for:', title);
		return { delivered: false, reason: 'emailjs-not-configured' };
	}

	const displayName = name || 'there';
	const actionUrl = link || (typeof window !== 'undefined' ? window.location.origin : '');

	// Same alias strategy as passwordReset.js / walletOtp.js: populate every
	// variable name a template might use, plus the password-reset template's
	// own variables (reset_link/link/role_label) so this still reads
	// sensibly if a dedicated notification template hasn't been configured.
	const templateParams = {
		to_email: normalizedEmail,
		user_email: normalizedEmail,
		email: normalizedEmail,
		recipient: normalizedEmail,
		reply_to: normalizedEmail,
		to_name: displayName,
		user_name: displayName,
		name: displayName,
		notification_title: title || 'Notification',
		notification_message: message || '',
		action_url: actionUrl,
		reset_link: actionUrl,
		link: actionUrl,
		role_label: title || 'SVS',
	};

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
			console.error('[notificationEmail] EmailJS rejected the request:', response.status, text);
			return { delivered: false, reason: text || `http-${response.status}` };
		}
		return { delivered: true };
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error('[notificationEmail] EmailJS fetch threw:', err);
		return { delivered: false, reason: err?.message || 'fetch-failed' };
	}
};
