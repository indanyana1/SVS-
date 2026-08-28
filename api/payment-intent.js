const Stripe = require('stripe');
const { enforceRateLimit } = require('./_rate-limit');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (await enforceRateLimit(req, res, { name: 'payment-intent', windowSeconds: 60, max: 20 })) return;

  if (!process.env.STRIPE_SECRET_KEY) {
    return res
      .status(500)
      .json({ error: 'Stripe secret key not configured on the server.' });
  }

  const body =
    typeof req.body === 'string'
      ? (() => {
          try {
            return JSON.parse(req.body);
          } catch (_error) {
            return {};
          }
        })()
      : req.body || {};

  const { amount, currency, email, fullName } = body;
  const numericAmount = Number(amount);

  if (!numericAmount || numericAmount <= 0) {
    return res.status(400).json({ error: 'Invalid payment amount.' });
  }

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(numericAmount),
      currency: String(currency || process.env.REACT_APP_STRIPE_CURRENCY || 'usd').toLowerCase(),
      receipt_email: email || undefined,
      metadata: {
        customer_name: fullName || '',
        platform: 'SVS E-Commerce',
      },
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe error:', error.message);
    return res.status(400).json({ error: error.message || 'Stripe request failed.' });
  }
};
