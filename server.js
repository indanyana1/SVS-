require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.SERVER_PORT || 5000;
const NOMINATIM_USER_AGENT = 'SVS E-Commerce/1.0 (local development address lookup)';

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));
app.use(express.json());

const fetchAddressJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'User-Agent': NOMINATIM_USER_AGENT,
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.error || payload.message || 'Address lookup request failed.';
    throw new Error(message);
  }

  return payload;
};

const buildOsmIdentifier = (result) => {
  const typePrefix = String(result.osm_type || '').trim().charAt(0).toUpperCase();
  const osmId = String(result.osm_id || '').trim();

  return typePrefix && osmId ? `${typePrefix}${osmId}` : '';
};

const normalizeAddressResult = (result) => {
  const address = result.address || {};
  const address1 = [address.house_number, address.road].filter(Boolean).join(' ').trim()
    || address.road
    || result.name
    || '';
  const address2 = address.suburb
    || address.neighbourhood
    || address.residential
    || address.quarter
    || '';
  const city = address.city
    || address.town
    || address.village
    || address.municipality
    || address.county
    || '';
  const province = address.state || address.province || '';
  const postalCode = address.postcode || '';
  const country = address.country || 'South Africa';

  return {
    formattedAddress: result.display_name || '',
    address1,
    address2,
    city,
    province,
    postalCode,
    country,
  };
};

app.post('/api/address-autocomplete', async (req, res) => {
  const input = String(req.body?.input || '').trim();
  const countryCode = String(req.body?.countryCode || 'za').trim().toLowerCase();

  if (input.length < 3) {
    return res.json({ suggestions: [] });
  }

  try {
    const searchParams = new URLSearchParams({
      q: input,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      countrycodes: countryCode,
    });
    const payload = await fetchAddressJson(`https://nominatim.openstreetmap.org/search?${searchParams.toString()}`);

    const suggestions = Array.isArray(payload)
      ? payload.map((result) => ({
        placeId: buildOsmIdentifier(result),
        fullText: result.display_name || '',
        primaryText: [result.address?.house_number, result.address?.road].filter(Boolean).join(' ').trim()
          || result.name
          || result.display_name
          || '',
        secondaryText: [
          result.address?.suburb || result.address?.neighbourhood || result.address?.residential || result.address?.quarter,
          result.address?.city || result.address?.town || result.address?.village || result.address?.municipality || result.address?.county,
          result.address?.state,
        ].filter(Boolean).join(', '),
      })).filter((result) => result.placeId && result.fullText)
      : [];

    res.json({ suggestions });
  } catch (error) {
    console.error('Address autocomplete error:', error.message);
    res.status(400).json({ error: error.message || 'Unable to fetch address suggestions.' });
  }
});

app.post('/api/address-details', async (req, res) => {
  const placeId = String(req.body?.placeId || '').trim();

  if (!placeId) {
    return res.status(400).json({ error: 'placeId is required.' });
  }

  try {
    const searchParams = new URLSearchParams({
      osm_ids: placeId,
      format: 'jsonv2',
      addressdetails: '1',
    });
    const payload = await fetchAddressJson(`https://nominatim.openstreetmap.org/lookup?${searchParams.toString()}`);
    const result = Array.isArray(payload) ? payload[0] : null;

    if (!result) {
      return res.status(404).json({ error: 'Address details not found.' });
    }

    res.json(normalizeAddressResult(result));
  } catch (error) {
    console.error('Address details error:', error.message);
    res.status(400).json({ error: error.message || 'Unable to fetch address details.' });
  }
});

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
  res.json({
    status: 'ok',
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    addressLookup: 'openstreetmap-nominatim',
  });
});

app.listen(PORT, () => {
  console.log(`Payment server running on http://localhost:${PORT}`);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('WARNING: STRIPE_SECRET_KEY is not set in .env');
  }
});
