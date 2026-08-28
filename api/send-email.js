// Transactional email endpoint.
//
// Accepts: { type: 'order_confirmation' | 'password_reset' | 'payout_requested', payload: {...} }
// Returns: { ok, id?, skipped?, error? }
//
// Auth: not currently required because the body fields (order ref, reset url,
// payout ref) are themselves opaque tokens generated server-side. Add a JWT
// check if you ever start emailing arbitrary recipients from this route.

const {
  isConfigured,
  sendEmail,
  orderConfirmationEmail,
  passwordResetEmail,
  payoutRequestedEmail,
} = require('../server-utils/email');
const { enforceRateLimit } = require('./_rate-limit');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Tighter than the other limits: this endpoint accepts an arbitrary `to`
  // with no auth (see the file header comment), so it's the one most
  // exposed to being used as a spam/harassment relay if left unbounded.
  if (await enforceRateLimit(req, res, { name: 'send-email', windowSeconds: 60, max: 10 })) return;

  const { type, to, payload } = req.body || {};
  if (!type || !to) {
    return res.status(400).json({ error: 'Missing required fields: type, to' });
  }

  if (!isConfigured()) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'RESEND_API_KEY not configured' });
  }

  let template;
  try {
    switch (type) {
      case 'order_confirmation':
        template = orderConfirmationEmail(payload || {});
        break;
      case 'password_reset':
        template = passwordResetEmail(payload || {});
        break;
      case 'payout_requested':
        template = payoutRequestedEmail(payload || {});
        break;
      default:
        return res.status(400).json({ error: `Unknown email type: ${type}` });
    }
  } catch (err) {
    return res.status(400).json({ error: `Could not build template: ${err.message}` });
  }

  const result = await sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  if (result.ok === false) {
    return res.status(502).json(result);
  }
  return res.status(200).json(result);
};
