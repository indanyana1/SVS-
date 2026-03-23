require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.SERVER_PORT || 5000;

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));
app.use(express.json());

app.post('/api/payment-intent', async (req, res) => {
  const { amount, currency, email, fullName } = req.body;

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe secret key not configured. Add STRIPE_SECRET_KEY to your .env file.' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid payment amount.' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount)),
      currency: currency || 'usd',
      receipt_email: email || undefined,
      metadata: {
        customer_name: fullName || '',
        platform: 'SVS E-Commerce',
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', stripe: Boolean(process.env.STRIPE_SECRET_KEY) });
});

app.listen(PORT, () => {
  console.log(`Payment server running on http://localhost:${PORT}`);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('WARNING: STRIPE_SECRET_KEY is not set in .env');
  }
});
