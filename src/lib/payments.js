import { loadStripe } from '@stripe/stripe-js';

const stripePublicKey = process.env.REACT_APP_STRIPE_PUBLIC_KEY;
const defaultCurrency = process.env.REACT_APP_STRIPE_CURRENCY || 'usd';

let stripePromise;

export const hasStripePublicKey = Boolean(stripePublicKey);
export const stripeCurrency = defaultCurrency;
export const embeddedCardCheckoutEnabled = hasStripePublicKey;

export const getStripeInstance = async () => {
  if (!stripePromise && embeddedCardCheckoutEnabled) {
    stripePromise = loadStripe(stripePublicKey);
  }
  return stripePromise;
};

export const startCardPayment = async ({ amount, email, fullName, phone, itemCount, stripe, confirmPayment }) => {
  if (!embeddedCardCheckoutEnabled) {
    throw new Error('Card payments are currently unavailable. Please choose another payment method.');
  }

  const numericAmount = Number(amount) || 0;

  if (!numericAmount || numericAmount <= 0) {
    throw new Error('Invalid payment amount.');
  }

  if (!stripe) {
    throw new Error('Secure payment is not ready yet. Please try again.');
  }

  if (!confirmPayment) {
    throw new Error('Payment elements not ready.');
  }

  try {
    const { error, paymentIntent } = await confirmPayment({
      elements: confirmPayment.elements,
      confirmParams: {
        return_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/orders`,
        receipt_email: email,
      },
    });

    if (error) {
      throw new Error(error.message || 'Card payment failed.');
    }

    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      return {
        provider: 'Stripe',
        status: paymentIntent.status === 'succeeded' ? 'paid' : 'processing',
        reference: paymentIntent.id,
        currency: defaultCurrency,
      };
    }

    throw new Error('Payment was not processed successfully.');
  } catch (err) {
    throw err instanceof Error ? err : new Error('An unexpected error occurred during payment.');
  }
};