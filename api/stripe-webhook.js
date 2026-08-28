// Stripe webhook receiver for Vercel serverless.
//
// Stripe POSTs payment lifecycle events here (payment_intent.succeeded,
// charge.refunded, etc.). We verify the signature, then dispatch each
// event to the appropriate side-effect (mark order paid, schedule
// payout, notify seller, etc.).
//
// IMPORTANT: Stripe signature validation requires the RAW request body.
// On Vercel we disable bodyParser via the exported `config` block so
// we can read the raw bytes ourselves.
//
// Env vars:
//   STRIPE_SECRET_KEY        - server-side secret
//   STRIPE_WEBHOOK_SECRET    - signing secret from the Stripe dashboard

import Stripe from 'stripe';
import { initErrorMonitoring, captureError } from '../server-utils/errorMonitoring';

initErrorMonitoring();

export const config = {
  api: {
    bodyParser: false, // required for signature verification
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err) => reject(err));
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    // eslint-disable-next-line no-console
    console.error('[stripe-webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const stripe = new Stripe(secretKey);
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    return res.status(400).json({ error: `Could not read body: ${err.message}` });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[stripe-webhook] signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
  }

  try {
    await dispatch(event);
    return res.status(200).json({ received: true, type: event.type, id: event.id });
  } catch (err) {
    // Returning 500 tells Stripe to retry, which is what we want for
    // transient failures (DB unavailable, network blip). Idempotency
    // keys + the unique event.id on our side keep duplicates safe.
    // eslint-disable-next-line no-console
    console.error('[stripe-webhook] dispatch failed:', err);
    captureError(err, { source: 'stripe-webhook', eventType: event.type, eventId: event.id });
    return res.status(500).json({ error: err.message || 'Dispatch failed' });
  }
}

// Side-effects — extend as new payment flows are added.
async function dispatch(event) {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      // eslint-disable-next-line no-console
      console.log('[stripe-webhook] payment_intent.succeeded', {
        id: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        customer_email: pi.receipt_email,
        order_id: pi.metadata?.order_id || null,
      });
      // TODO: mark order paid in Supabase, send buyer/seller emails,
      //       and schedule seller payout. Hook your services here.
      return;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      // eslint-disable-next-line no-console
      console.warn('[stripe-webhook] payment_intent.payment_failed', {
        id: pi.id,
        last_payment_error: pi.last_payment_error?.message || null,
      });
      return;
    }
    case 'charge.refunded': {
      const charge = event.data.object;
      // eslint-disable-next-line no-console
      console.log('[stripe-webhook] charge.refunded', {
        id: charge.id,
        amount_refunded: charge.amount_refunded,
        payment_intent: charge.payment_intent,
      });
      return;
    }
    case 'charge.dispute.created': {
      const dispute = event.data.object;
      // eslint-disable-next-line no-console
      console.warn('[stripe-webhook] charge.dispute.created', {
        id: dispute.id,
        reason: dispute.reason,
        amount: dispute.amount,
        charge: dispute.charge,
      });
      return;
    }
    default:
      // eslint-disable-next-line no-console
      console.log('[stripe-webhook] ignored event', event.type);
  }
}
