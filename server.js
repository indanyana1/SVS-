require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.SERVER_PORT || 5000;
const NOMINATIM_USER_AGENT = 'SVS E-Commerce/1.0 (local development address lookup)';

// CORS: allow local dev plus any deployed origins listed in CORS_ALLOWED_ORIGINS
// (comma-separated). Also allows any *.vercel.app preview by default.
const staticAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  ...(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // server-to-server / curl
      // Trim trailing slash and match.
      const normalized = origin.replace(/\/$/, '');
      if (staticAllowedOrigins.includes(normalized)) return callback(null, true);
      if (/^http:\/\/localhost(:\d+)?$/i.test(normalized)) return callback(null, true);
      if (/^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(normalized)) return callback(null, true);
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
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

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const normalizeSupportAgentHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-10)
    .map((entry) => {
      const role = String(entry?.role || '').trim().toLowerCase();
      if (role !== 'user' && role !== 'assistant') return null;
      const content = String(entry?.content || '').trim();
      if (!content) return null;
      return { role, content };
    })
    .filter(Boolean);
};

const buildSupportAgentSystemPrompt = (context = {}) => {
  const role = String(context?.userRole || 'user').trim();
  const issueType = String(context?.issueType || 'General Support').trim();
  const orderReference = String(context?.orderReference || '').trim();
  const dealStatus = String(context?.dealStatus || '').trim();

  return [
    'You are SVS Agent, the official support assistant for SVS E-Commerce.',
    'You help users with only the features and screens that are currently visible in SVS E-Commerce.',
    'Be concise, practical, and accurate. Prefer 4-7 short bullets for how-to answers.',
    'If the user sends only a greeting (for example hey, hi, hello), reply in one short line and ask what they want to do (buy, sell, list property, list livestock, track order, payment help).',
    'When asked how to perform an action, provide exact in-app navigation steps and do not guess additional steps.',
    'If a feature is not clearly visible in the app, say you cannot confirm it in SVS and suggest the closest visible path.',
    "Use these canonical areas and paths when relevant: Markets (/markets), Seller Dashboard (/seller/dashboard), Upload Products (/seller/upload), Seller Orders (/seller/orders), Property Hub (/property-hub), Livestock Hub (/livestock-hub), Orders (/orders), Let's Talk Business chat (/support/chat), Sign in (/signin), Sign up (/signup), Seller Sign Up (/sell/signup), Seller Verification (/sell/onboarding).",
    'Seller registration flow you may describe exactly: go to /sell/signup, enter full name, email address, contact number, password, and confirm password, then click Next; after that, the app takes the user to /sell/onboarding to complete seller verification and compliance fields such as business name, legal full name, ID number, business type, registration number, tax number, phone number, address, payout bank details, and returns contact information.',
    'Cover website help for buyers, sellers, property listers, and livestock traders.',
    // ------- Let's Talk Business chat tools -------
    "The user may send STRUCTURED CARDS through Let's Talk Business chat. They are marked with bracketed prefixes in the message text:",
    '- "[Offer card] The user is offering R<amount>" — acknowledge the amount, summarise what to consider (delivery, condition, payment method), and suggest accepting, countering, or declining. Remind them they can hit Accept or Decline directly on the card.',
    '- "[Offer response] The user ACCEPTED/DECLINED the offer of R<amount>" — congratulate or commiserate briefly, then guide the next step (paying / requesting payment / arranging handover).',
    '- "[Payment request] The user is requesting a payment of R<amount>" — explain that the recipient can tap Pay now on the card to go to /checkout, and remind both parties to confirm delivery before marking the deal as paid.',
    '- "[Shared location] Coordinates ..." — confirm receipt, encourage meeting in a safe public place, and suggest sharing the Google Maps link in return.',
    '- "[Photo attachment]" — acknowledge that the photo was received; do NOT pretend to describe the image. Politely ask for any clarifying question.',
    '- "[Voice note Xs, transcribed] <text>" — treat the transcribed text as the user message and respond accordingly.',
    '- "[Voice note Xs]" with no transcript — politely say you couldn\'t catch the audio (browser transcription unavailable) and ask the user to type their question.',
    '- "[Deal status update] The user marked the deal as: <status>" — confirm the status change and outline the next action (e.g., if "agreed" suggest sending a payment request; if "paid" suggest scheduling delivery; if "cancelled" ask if you can help refund).',
    "When helping close a deal inside Let's Talk Business, suggest these in-chat buttons by name when relevant: Offer (amber), Request payment (cyan), Photo, Voice note, Location, and the Mark... status dropdown.",
    'Never provide or discuss API keys, secrets, tokens, environment variables, internal source code, datasets, model configuration, or how the website is built.',
    'If asked for restricted technical details, refuse briefly and redirect to end-user help only.',
    'Important: do not invent policies, legal guarantees, fees, or account actions. If unsure, say what to check in-app and suggest contacting human support.',
    'Never ask for passwords, OTPs, card numbers, CVV, or other secrets.',
    'Do not mention external platforms or competitors unless the user explicitly asks.',
    'Avoid repeating the same intro text every turn; focus on the user question.',
    `Current user role context: ${role}.`,
    `Current issue type: ${issueType}.`,
    orderReference ? `Current order reference: ${orderReference}.` : 'No order reference provided.',
    dealStatus ? `Current Let's Talk Business deal status: ${dealStatus}.` : '',
  ].filter(Boolean).join('\n');
};

const RESTRICTED_INTERNAL_REQUEST_PATTERN = /(api\s*key|apikey|secret|token|env\b|environment\s*variable|source\s*code|codebase|repository|dataset|training\s*data|model\s*config|architecture|how\s+.*\s+built|backend\s*internals|database\s*schema|private\s*key)/i;

const buildRestrictedSupportReply = () => (
  'I cannot provide API keys or internal technical details. I can help with using SVS features only, for example how to buy, sell, upload products, list property or livestock, track orders, and resolve payment or delivery issues.'
);

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

const normalizeFallbackReverseResult = (result) => {
  const city = String(
    result.locality
    || result.city
    || result.principalSubdivision
    || result.localityInfo?.administrative?.[0]?.name
    || '',
  ).trim();
  const province = String(
    result.principalSubdivision
    || result.localityInfo?.administrative?.[1]?.name
    || result.principalSubdivisionCode
    || '',
  ).trim();
  const country = String(result.countryName || result.country || '').trim();
  const formattedAddress = [city, province, country].filter(Boolean).join(', ') || String(result.label || '').trim();

  return {
    formattedAddress,
    address1: '',
    address2: '',
    city,
    province,
    postalCode: '',
    country,
  };
};

const fetchFallbackReverseGeocode = async (latitude, longitude) => {
  const searchParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: 'en',
  });

  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${searchParams.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': NOMINATIM_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error('Address lookup request failed.');
  }

  const payload = await response.json().catch(() => ({}));
  return normalizeFallbackReverseResult(payload);
};

const isPrivateOrLocalIp = (ipAddress) => {
  const ip = String(ipAddress || '').trim().toLowerCase();
  if (!ip) return true;
  if (ip === '::1' || ip === '127.0.0.1') return true;

  // IPv6 local ranges
  if (ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;

  // IPv4 private ranges
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;

  return false;
};

const fetchIpDetectedLocation = async (requestIp = '') => {
  const ip = String(requestIp || '').replace(/^::ffff:/, '').trim();
  const searchParams = new URLSearchParams({ localityLanguage: 'en' });
  if (ip && !isPrivateOrLocalIp(ip)) {
    searchParams.set('ip', ip);
  }

  const response = await fetch(`https://api.bigdatacloud.net/data/ip-geolocation?${searchParams.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': NOMINATIM_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error('IP geolocation request failed.');
  }

  const payload = await response.json().catch(() => ({}));
  return normalizeFallbackReverseResult(payload);
};

app.post('/api/address-reverse', async (req, res) => {
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: 'latitude and longitude are required.' });
  }

  try {
    const searchParams = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'jsonv2',
      addressdetails: '1',
    });

    try {
      const payload = await fetchAddressJson(`https://nominatim.openstreetmap.org/reverse?${searchParams.toString()}`);
      if (!payload || (!payload.address && !payload.display_name)) {
        throw new Error('Address lookup request failed.');
      }
      res.json(normalizeAddressResult(payload));
      return;
    } catch (_primaryError) {
      const fallbackPayload = await fetchFallbackReverseGeocode(latitude, longitude);
      res.json(fallbackPayload);
      return;
    }
  } catch (error) {
    console.error('Address reverse error:', error.message);
    res.status(400).json({ error: error.message || 'Unable to resolve current location.' });
  }
});

app.get('/api/address-ip', async (req, res) => {
  const forwardedIp = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const socketIp = String(req.socket?.remoteAddress || '').trim();
  const candidateIp = forwardedIp || socketIp;

  try {
    const payload = await fetchIpDetectedLocation(candidateIp);
    res.json(payload);
  } catch (error) {
    console.error('IP location lookup error:', error.message);
    res.status(400).json({ error: error.message || 'Unable to detect location from IP.' });
  }
});

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

app.post('/api/support-agent', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  const context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {};
  const history = normalizeSupportAgentHistory(req.body?.history);

  if (!message) {
    return res.status(400).json({ error: 'message is required.' });
  }

  if (RESTRICTED_INTERNAL_REQUEST_PATTERN.test(message)) {
    return res.status(200).json({
      reply: buildRestrictedSupportReply(),
      provider: 'svs-policy',
      model: 'policy-guard',
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          { role: 'system', content: buildSupportAgentSystemPrompt(context) },
          ...history,
          { role: 'user', content: message },
        ],
      }),
    });

    const raw = await groqResponse.text();
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch (_error) {
      payload = {};
    }

    if (!groqResponse.ok) {
      const detail = payload?.error?.message || payload?.message || 'Groq request failed.';
      return res.status(groqResponse.status).json({ error: detail });
    }

    const reply = String(payload?.choices?.[0]?.message?.content || '').trim();
    if (!reply) {
      return res.status(502).json({ error: 'Groq returned an empty response.' });
    }

    return res.json({
      reply,
      provider: 'groq',
      model: payload?.model || DEFAULT_GROQ_MODEL,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Support agent request failed.' });
  }
});

const DEFAULT_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo';

const stripVoiceDataUrl = (input) => {
  const value = String(input || '').trim();
  if (!value) return { base64: '', mimeType: '' };
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { base64: match[2], mimeType: match[1] };
  return { base64: value, mimeType: '' };
};

const voiceExtensionForMime = (mimeType) => {
  const mt = String(mimeType || '').toLowerCase();
  if (mt.includes('webm')) return 'webm';
  if (mt.includes('ogg')) return 'ogg';
  if (mt.includes('mp4') || mt.includes('m4a') || mt.includes('aac')) return 'm4a';
  if (mt.includes('mpeg') || mt.includes('mp3')) return 'mp3';
  if (mt.includes('wav')) return 'wav';
  return 'webm';
};

app.post('/api/transcribe-voice', express.json({ limit: '8mb' }), async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  const audioInput = req.body?.audioBase64 || req.body?.audio || req.body?.src || '';
  const stripped = stripVoiceDataUrl(audioInput);
  const base64 = stripped.base64;
  const mimeType = String(req.body?.mimeType || stripped.mimeType || 'audio/webm');
  const language = String(req.body?.language || '').trim();

  if (!base64) {
    return res.status(400).json({ error: 'audioBase64 is required.' });
  }

  let audioBuffer;
  try {
    audioBuffer = Buffer.from(base64, 'base64');
  } catch (_error) {
    return res.status(400).json({ error: 'audioBase64 is not valid base64.' });
  }

  if (!audioBuffer.length) {
    return res.status(400).json({ error: 'Audio payload is empty.' });
  }

  if (audioBuffer.length > 5_000_000) {
    return res.status(413).json({ error: 'Audio payload too large (max ~5MB).' });
  }

  try {
    const filename = `voice-note.${voiceExtensionForMime(mimeType)}`;
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('model', DEFAULT_WHISPER_MODEL);
    formData.append('response_format', 'json');
    formData.append('temperature', '0');
    if (language) formData.append('language', language);

    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: formData,
    });

    const raw = await groqResponse.text();
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch (_error) {
      payload = {};
    }

    if (!groqResponse.ok) {
      const detail = payload?.error?.message || payload?.message || 'Groq transcription failed.';
      return res.status(groqResponse.status).json({ error: detail });
    }

    const text = String(payload?.text || '').trim();
    return res.json({ text, provider: 'groq', model: DEFAULT_WHISPER_MODEL });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Voice transcription failed.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    addressLookup: 'openstreetmap-nominatim',
  });
});

app.listen(PORT, () => {
  console.log(`Payment server running on http://localhost:${PORT}`);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('WARNING: STRIPE_SECRET_KEY is not set in .env');
  }
});
