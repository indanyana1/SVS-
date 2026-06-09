// Lightweight transactional email helper.
//
// Wraps Resend (https://resend.com) — a developer-friendly transactional
// email API — behind a tiny `sendEmail({ to, subject, html, text })` surface
// so the rest of the codebase doesn't need to know which provider we use.
//
// Env-gated by design:
//   * If RESEND_API_KEY is not set the helper logs a warning and returns
//     `{ skipped: true }` so local dev and preview builds keep working
//     without an account configured.
//   * In production set RESEND_API_KEY plus EMAIL_FROM (e.g.
//     "SVS <no-reply@svs-commerce.app>") in your hosting environment.
//
// Templates live alongside their call sites (e.g. order confirm in
// stripe-webhook.js) so business copy can be tweaked without touching this
// transport layer.

const logger = require('./logger');

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = process.env.EMAIL_FROM || 'SVS Commerce <onboarding@resend.dev>';

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

async function sendEmail({ to, subject, html, text, from, replyTo, tags }) {
  if (!isConfigured()) {
    logger.warn('Email skipped: RESEND_API_KEY is not configured', { to, subject });
    return { skipped: true };
  }

  if (!to || !subject || (!html && !text)) {
    throw new Error('sendEmail requires `to`, `subject`, and at least one of `html` or `text`.');
  }

  const payload = {
    from: from || DEFAULT_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  };
  if (replyTo) payload.reply_to = replyTo;
  if (Array.isArray(tags)) payload.tags = tags;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error('Resend send failed', { status: response.status, body, to, subject });
      return { ok: false, status: response.status, error: body };
    }

    const data = await response.json().catch(() => ({}));
    logger.info('Email sent', { to, subject, id: data.id });
    return { ok: true, id: data.id };
  } catch (err) {
    logger.error('Email transport error', { error_message: err.message, to, subject });
    return { ok: false, error: err.message };
  }
}

// ─── Common templates ────────────────────────────────────────────────
function orderConfirmationEmail({ customerName, orderReference, total, currency, items }) {
  const itemRows = (items || [])
    .map((item) => `<li><strong>${escapeHtml(item.title)}</strong> × ${item.quantity} — ${formatMoney(item.price * item.quantity, currency)}</li>`)
    .join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h1 style="margin: 0 0 8px; font-size: 22px; color: #0f6674;">Thanks for your order, ${escapeHtml(customerName || 'there')}!</h1>
      <p style="margin: 0 0 16px; color: #475569;">Your order <strong>${escapeHtml(orderReference)}</strong> was received. We'll send another note when it ships.</p>
      <h2 style="margin: 24px 0 8px; font-size: 16px;">Order summary</h2>
      <ul style="padding-left: 18px; color: #1e293b;">${itemRows}</ul>
      <p style="margin: 24px 0 0; font-size: 18px; font-weight: 700;">Total: ${formatMoney(total, currency)}</p>
      <p style="margin: 32px 0 0; font-size: 12px; color: #94a3b8;">SVS Commerce · Need help? Reply to this email or visit /support/chat</p>
    </div>
  `;
  const text = `Thanks for your order, ${customerName || 'there'}!\n\nOrder ${orderReference}\nTotal: ${formatMoney(total, currency)}\n\nWe'll send another email when it ships.`;
  return { subject: `Order received — ${orderReference}`, html, text };
}

function passwordResetEmail({ resetUrl, customerName }) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h1 style="margin: 0 0 8px; font-size: 22px; color: #0f6674;">Reset your password</h1>
      <p style="margin: 0 0 16px;">Hi ${escapeHtml(customerName || 'there')}, click the button below to choose a new password. This link is valid for 60 minutes.</p>
      <p style="margin: 24px 0;"><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #0f6674; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset password</a></p>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
  const text = `Reset your password: ${resetUrl}\n\nThis link is valid for 60 minutes. If you didn't request this you can ignore this email.`;
  return { subject: 'Reset your SVS password', html, text };
}

function payoutRequestedEmail({ sellerName, amount, currency, reference }) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h1 style="margin: 0 0 8px; font-size: 22px; color: #0f6674;">Payout request received</h1>
      <p style="margin: 0 0 16px;">Hi ${escapeHtml(sellerName || 'Seller')}, we received your payout request for <strong>${formatMoney(amount, currency)}</strong>. Reference: <code>${escapeHtml(reference)}</code>.</p>
      <p style="margin: 0 0 16px;">Our finance team will review and disburse it within 1–3 business days to the bank account on your profile.</p>
      <p style="margin: 32px 0 0; font-size: 12px; color: #94a3b8;">SVS Commerce · Seller payouts</p>
    </div>
  `;
  const text = `Payout request received: ${formatMoney(amount, currency)} (ref ${reference}). We'll process within 1-3 business days.`;
  return { subject: 'Payout request received', html, text };
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount, currency) {
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(num);
  } catch (_e) {
    return `${currency || 'USD'} ${num.toFixed(2)}`;
  }
}

module.exports = {
  isConfigured,
  sendEmail,
  orderConfirmationEmail,
  passwordResetEmail,
  payoutRequestedEmail,
};
