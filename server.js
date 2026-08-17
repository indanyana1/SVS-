require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { rateLimit } = require('./server-utils/rate-limit');
const logger = require('./server-utils/logger');

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
app.use(express.json({ limit: '8mb' }));

// ────────────────────────────────────────────────────────────────────
//  Rate limits per route family.
//   • payments / webhook  → tight  (low volume, high impact)
//   • AI endpoints        → medium (expensive, per-IP fairness)
//   • address lookups     → looser (cheap, autocomplete fires often)
// ────────────────────────────────────────────────────────────────────
const limits = {
  payments: rateLimit({ windowMs: 60_000, max: 20 }),
  ai: rateLimit({ windowMs: 60_000, max: 30 }),
  address: rateLimit({ windowMs: 60_000, max: 120 }),
};

// ────────────────────────────────────────────────────────────────────
//  Stripe webhook (local dev mirror)
//  Production lives in api/stripe-webhook.js on Vercel. This local
//  version lets you point Stripe CLI at http://localhost:5000 during
//  development. The route uses `express.raw` because signature
//  verification must run against the unmodified request body.
// ────────────────────────────────────────────────────────────────────
app.post(
  '/api/stripe-webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('Stripe webhook called without STRIPE_WEBHOOK_SECRET');
      return res.status(500).json({ error: 'Webhook not configured' });
    }
    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing stripe-signature header' });

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      logger.warn('Stripe signature verification failed', { error_message: err.message });
      return res.status(400).json({ error: `Invalid signature: ${err.message}` });
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          logger.info('payment_intent.succeeded', {
            payment_intent_id: event.data.object.id,
            amount: event.data.object.amount,
            currency: event.data.object.currency,
          });
          break;
        case 'payment_intent.payment_failed':
          logger.warn('payment_intent.payment_failed', {
            payment_intent_id: event.data.object.id,
            error_message: event.data.object.last_payment_error?.message || null,
          });
          break;
        case 'charge.refunded':
          logger.info('charge.refunded', {
            charge_id: event.data.object.id,
            amount_refunded: event.data.object.amount_refunded,
          });
          break;
        case 'charge.dispute.created':
          logger.warn('charge.dispute.created', {
            dispute_id: event.data.object.id,
            reason: event.data.object.reason,
          });
          break;
        default:
          logger.info('stripe.event.ignored', { type: event.type });
      }
      return res.json({ received: true, type: event.type, id: event.id });
    } catch (err) {
      logger.error('stripe.dispatch.failed', err, { type: event.type });
      return res.status(500).json({ error: 'Dispatch failed' });
    }
  }
);

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

const DEFAULT_CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const normalizeSupportAgentHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-10)
    .map((entry) => {
      const role = String(entry?.role || '').trim().toLowerCase();
      if (role !== 'user' && role !== 'assistant') return null;
      let content = String(entry?.content || '').trim();
      if (!content) return null;
      // Strip markdown from the assistant's prior turns so the model does not
      // mimic an old bulleted style when generating the next reply.
      if (role === 'assistant') content = humaniseSupportReply(content);
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
    // ------- Tone & formatting -------
    'Reply in a warm, natural, human conversational tone — like a helpful friend who knows the site well, not like a manual. Use plain prose in 2-4 short paragraphs.',
    'STRICT FORMAT RULES (the chat UI renders raw text, not markdown):',
    '- Never start a line with *, -, • or with "1.", "1)", "2.", etc. Those characters appear literally on screen as ugly bullets.',
    '- Never use ** for bold, * or _ for italics, # for headings, ``` for code, [text](url) for links, or | for tables.',
    '- Write everything as flowing English sentences in 2-4 short paragraphs. Use commas, semicolons, and connector words like "first", "then", "after that", "finally" to sequence steps.',
    '- Mention URL paths and button labels inline in the sentence (e.g. write head to /sell/signup, not a starred line like * go to /sell/signup).',
    '- Keep answers brief — typically 60-150 words. Only go longer if the user explicitly asks for full detail.',
    'GOOD example (do this): "Sure! To register, head over to /signup and fill in your name, email, contact number and a password, then tap Next. If you want to sell, start at /sell/signup instead — after the first step it will walk you through /sell/onboarding where you add your business details, ID, tax number and payout bank account. Want me to walk you through the seller side?"',
    'BAD example (never do this): "To register on SVS, follow these steps:\\n* Go to /signup\\n* Enter your name and email\\n* Click Next". Those asterisks and line-broken bullets are exactly what you must NOT produce.',
    'If the user sends only a greeting (for example hey, hi, hello), reply in one short friendly line and ask what they want to do (buy, sell, list property, list livestock, track order, payment help).',
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
    '- "[Photo attachment] AI vision description (you can rely on this to answer the user): <summary>" — the system has already analysed the photo for you. Use the summary, scene, visible items, and text-in-image to answer the user\'s question accurately. Do NOT say you cannot see images.',
    '- "[Photo attachment]" without a vision summary — acknowledge that the photo was received; do NOT pretend to describe the image. Politely ask for any clarifying question.',
    '- "[Voice note Xs, transcribed] <text>" — treat the transcribed text as the user message and respond accordingly.',
    '- "[Voice note Xs]" with no transcript — politely say you couldn\'t catch the audio (browser transcription unavailable) and ask the user to type their question.',
    '- "[Video message Xs] AI analysis (you can rely on this to answer the user): Audio transcript: \'...\'. Visual summary: ..." - the system has already transcribed the audio and described a keyframe for you. Use both freely to answer the user\'s question. Do NOT say you cannot view videos.',
    '- "[Video message Xs]" without an analysis block — acknowledge that a short video was received; do NOT pretend to describe its contents. Ask the user what you should help confirm about it.',
    '- "[Document attachment]" — acknowledge the document was received (you cannot read its contents) and ask what they\'d like you to help with regarding it.',
    '- "[Deal status update] The user marked the deal as: <status>" — confirm the status change and outline the next action (e.g., if "agreed" suggest sending a payment request; if "paid" suggest scheduling delivery; if "cancelled" ask if you can help refund).',
    "When helping close a deal inside Let's Talk Business, suggest these in-chat buttons by name when relevant: Offer (amber), Request payment (cyan), Photo, Voice note, Video, Document, Location, and the Mark... status dropdown. Also point users to the Search button (find any past message, offer, transcript) and the Export PDF button (download the conversation as proof of agreement).",
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

// Strip markdown that the chat UI does not render. The system prompt tells
// the model to reply in plain prose, but models routinely ignore that
// instruction, so we clean the output as a belt-and-braces safety net.
function humaniseSupportReply(text) {
  let out = String(text || '');
  // Drop code fences entirely (keep their inner text).
  out = out.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, '');
  // Strip leading ATX headings (#, ##, ###) on their own lines.
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  // Drop leading bullet markers (-, *, •).
  out = out.replace(/^\s*[*\-•]\s+/gm, '');
  // Strip leading numbered list markers like "1. " or "1) ".
  out = out.replace(/^\s*\d+[.)]\s+/gm, '');
  // Remove bold/italic asterisk and underscore wrappers but keep inner text.
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
  out = out.replace(/\*([^*\n]+)\*/g, '$1');
  out = out.replace(/__([^_]+)__/g, '$1');
  out = out.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?]|$)/g, '$1$2');
  // Inline code backticks.
  out = out.replace(/`([^`\n]+)`/g, '$1');
  // Markdown links → "label (url)".
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
  // Blockquote prefix.
  out = out.replace(/^\s{0,3}>\s?/gm, '');
  // Horizontal rules.
  out = out.replace(/^\s*(?:-\s*){3,}$/gm, '');
  out = out.replace(/^\s*(?:\*\s*){3,}$/gm, '');
  // Collapse 3+ blank lines down to 2.
  out = out.replace(/\n{3,}/g, '\n\n');
  // Trim trailing whitespace on each line.
  out = out.split('\n').map((line) => line.replace(/[ \t]+$/g, '')).join('\n');
  return out.trim();
}

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

app.post('/api/address-reverse', limits.address, async (req, res) => {
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

app.get('/api/address-ip', limits.address, async (req, res) => {
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

app.post('/api/address-autocomplete', limits.address, async (req, res) => {
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

app.post('/api/address-details', limits.address, async (req, res) => {
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

// ────────────────────────────────────────────────────────────────────
//  Transactional email (Resend) — env-gated. Mirrors api/send-email.js
//  so local dev works without deploying to Vercel.
// ────────────────────────────────────────────────────────────────────
const {
  isConfigured: isEmailConfigured,
  sendEmail,
  orderConfirmationEmail,
  passwordResetEmail,
  payoutRequestedEmail,
} = require('./server-utils/email');

app.post('/api/send-email', limits.payments, async (req, res) => {
  const { type, to, payload } = req.body || {};
  if (!type || !to) return res.status(400).json({ error: 'Missing required fields: type, to' });
  if (!isEmailConfigured()) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'RESEND_API_KEY not configured' });
  }
  let template;
  try {
    switch (type) {
      case 'order_confirmation': template = orderConfirmationEmail(payload || {}); break;
      case 'password_reset': template = passwordResetEmail(payload || {}); break;
      case 'payout_requested': template = payoutRequestedEmail(payload || {}); break;
      default: return res.status(400).json({ error: `Unknown email type: ${type}` });
    }
  } catch (err) {
    return res.status(400).json({ error: `Could not build template: ${err.message}` });
  }
  const result = await sendEmail({ to, subject: template.subject, html: template.html, text: template.text });
  if (result.ok === false) return res.status(502).json(result);
  return res.status(200).json(result);
});

app.post('/api/payment-intent', limits.payments, async (req, res) => {
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

app.post('/api/support-agent', limits.ai, async (req, res) => {
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system: buildSupportAgentSystemPrompt(context),
      messages: [
        ...history,
        { role: 'user', content: message },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return res.json({
        reply: 'I can\'t help with that. I can help with using SVS features — how to buy, sell, upload products, list property or livestock, track orders, and resolve payment or delivery issues.',
        provider: 'anthropic',
        model: response.model || DEFAULT_CLAUDE_MODEL,
      });
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    const reply = String(textBlock?.text || '').trim();
    if (!reply) {
      return res.status(502).json({ error: 'Claude returned an empty response.' });
    }

    return res.json({
      reply: humaniseSupportReply(reply),
      provider: 'anthropic',
      model: response.model || DEFAULT_CLAUDE_MODEL,
    });
  } catch (error) {
    return res.status(error?.status || 500).json({ error: error?.message || 'Support agent request failed.' });
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

app.post('/api/transcribe-voice', limits.ai, express.json({ limit: '8mb' }), async (req, res) => {
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

// ── Vision model helper ───────────────────────────────────────────────
// Runs image understanding through Claude. `outputSchema` (when given) is
// passed as output_config.format to guarantee valid, schema-conformant JSON
// back instead of relying on prompt-based "return JSON only" instructions.
const DEFAULT_VISION_MODEL = process.env.ANTHROPIC_VISION_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const callVisionChat = async ({ systemPrompt, userContent, maxTokens = 900, outputSchema }) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error(
      'AI photo analysis is not available. ANTHROPIC_API_KEY is not configured on the server.',
    );
    err.statusCode = 503;
    throw err;
  }

  const client = new Anthropic();
  let response;
  try {
    response = await client.messages.create({
      model: DEFAULT_VISION_MODEL,
      max_tokens: maxTokens,
      ...(outputSchema ? { output_config: { format: outputSchema } } : {}),
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });
  } catch (error) {
    const err = new Error(error?.message || 'Vision API request failed.');
    err.statusCode = error?.status || 500;
    throw err;
  }

  if (response.stop_reason === 'refusal') {
    const err = new Error('Claude declined to analyse this image.');
    err.statusCode = 502;
    throw err;
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  return {
    content: String(textBlock?.text || '').trim(),
    provider: 'anthropic',
    model: response.model || DEFAULT_VISION_MODEL,
  };
};

// ---------------------------------------------------------------------
// /api/ai-listing — Bulk product listing from a single product photo.
// Uses callVisionChat (Claude vision) and returns strict JSON the seller
// upload page maps into listing fields.
// ---------------------------------------------------------------------

const SUPPORTED_LISTING_MARKET_KEYS = [
  'beverages', 'homeCare', 'tickets', 'constructionTools', 'hardwareSoftware',
  'fashionStyle', 'fastFood', 'groceries', 'ecommerce', 'mobilityVehicles',
  'naturalResources', 'wellness', 'property', 'secondhand', 'stationery',
  'traditionalMedicines', 'beautyFitnessSports', 'toysKids',
  'jewelleryAccessories', 'livestock', 'informalMarket',
];

const buildAiListingSystemPrompt = (marketKeys) => (
  [
    'You are SVS Listing Assistant. You look at one or more photos of a SINGLE product (e.g. front view, back view, tag, packaging close-up) and write ONE marketplace listing that fuses everything you see across all of them.',
    'IMPORTANT: All photos belong to the SAME product. Do not list each photo separately. Combine what you see (logo, tag, size label, material label, colour, condition) into one cohesive listing.',
    'Read any visible text on labels, tags, packaging or stickers and extract size, material, brand, model, country of origin, batch, etc.',
    'Pick the BEST single marketKey from the list. Do not invent keys.',
    'If you cannot tell what the product is, set confidence < 0.4 and still return your best guess for the rest.',
  ].join('\n')
);

const ALLOWED_LISTING_CONDITIONS = ['New', 'Like new', 'Used - good', 'Used - fair', 'For parts'];

const buildAiListingOutputSchema = (marketKeys) => ({
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: '3-8 words, the product name + key descriptor, e.g. "Nike Hyverse Dri-Fit Training Jogger"' },
      description: { type: 'string', description: '2-4 short sentences describing what the product is, who it is for, and 3-5 key features observed across the photos' },
      suggestedMarketKey: { type: 'string', enum: marketKeys },
      suggestedPrice: { type: 'number', description: 'a sensible retail price in the suggested currency, no currency symbol' },
      suggestedCurrency: { type: 'string', description: 'ISO-4217 string (USD, ZAR, EUR, etc; default ZAR if local-looking African product, USD otherwise)' },
      suggestedQuantity: { type: 'integer', description: 'default 1; only set higher if a photo clearly shows multiple identical units' },
      category: { type: 'string', description: 'specific category like "Joggers", "Soft drinks", "Smartphones"' },
      brand: { type: 'string', description: 'only if a brand is clearly readable on any photo, otherwise empty string' },
      color: { type: 'string', description: 'dominant or named colour visible, e.g. "Black", "Navy blue"' },
      size: { type: 'string', description: 'size read from a tag/label, empty if unknown' },
      material: { type: 'string', description: 'material read from a label, empty if unknown' },
      condition: { type: 'string', enum: ALLOWED_LISTING_CONDITIONS },
      keyFeatures: {
        type: 'array',
        items: { type: 'string' },
        description: '3-6 short bullet strings, each a single feature or selling point, no leading dashes or asterisks',
      },
      confidence: { type: 'number', description: 'how confident you are this is a real listable product photo set, 0-1' },
    },
    required: [
      'title', 'description', 'suggestedMarketKey', 'suggestedPrice', 'suggestedCurrency',
      'suggestedQuantity', 'category', 'brand', 'color', 'size', 'material', 'condition',
      'keyFeatures', 'confidence',
    ],
    additionalProperties: false,
  },
});

const safeJsonExtractListing = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch (_e) { /* continue */ }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch (_e) { /* continue */ }
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch (_e) { /* continue */ }
  }
  return null;
};

const normalizeListingResult = (parsed, allowedMarketKeys) => {
  const safe = parsed && typeof parsed === 'object' ? parsed : {};
  const allowedSet = new Set(allowedMarketKeys);
  const marketKey = allowedSet.has(safe.suggestedMarketKey) ? safe.suggestedMarketKey : 'ecommerce';
  const priceNumber = Number(safe.suggestedPrice);
  const quantityNumber = Math.max(1, Math.round(Number(safe.suggestedQuantity) || 1));
  const confidenceNumber = Math.min(1, Math.max(0, Number(safe.confidence) || 0));
  const conditionRaw = String(safe.condition || '').trim();
  const condition = ALLOWED_LISTING_CONDITIONS.find((c) => c.toLowerCase() === conditionRaw.toLowerCase()) || 'New';
  const keyFeatures = Array.isArray(safe.keyFeatures)
    ? safe.keyFeatures
        .map((f) => String(f || '').trim().replace(/^[-*•\s]+/, '').slice(0, 120))
        .filter(Boolean)
        .slice(0, 6)
    : [];
  return {
    title: String(safe.title || '').trim().slice(0, 120) || 'Untitled product',
    description: String(safe.description || '').trim().slice(0, 800),
    suggestedMarketKey: marketKey,
    suggestedPrice: Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber : 0,
    suggestedCurrency: String(safe.suggestedCurrency || 'USD').trim().toUpperCase().slice(0, 6) || 'USD',
    suggestedQuantity: quantityNumber,
    category: String(safe.category || '').trim().slice(0, 60),
    brand: String(safe.brand || '').trim().slice(0, 60),
    color: String(safe.color || '').trim().slice(0, 40),
    size: String(safe.size || '').trim().slice(0, 40),
    material: String(safe.material || '').trim().slice(0, 80),
    condition,
    keyFeatures,
    confidence: confidenceNumber,
  };
};

const stripListingDataUrl = (input) => {
  const value = String(input || '').trim();
  if (!value) return { base64: '', mimeType: '' };
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { base64: match[2], mimeType: match[1] };
  return { base64: value, mimeType: '' };
};

app.post('/api/ai-listing', limits.ai, express.json({ limit: '8mb' }), async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  // Accept either a single-image payload (legacy) or images: [{imageBase64, mimeType}, ...]
  // (preferred). All images are treated as different angles of the SAME product
  // and fused into one listing.
  const rawImages = Array.isArray(req.body?.images) && req.body.images.length
    ? req.body.images
    : [{ imageBase64: req.body?.imageBase64 || req.body?.image || req.body?.src || '', mimeType: req.body?.mimeType }];

  const images = rawImages.slice(0, 4).map((entry) => {
    const stripped = stripListingDataUrl(entry?.imageBase64 || entry?.image || entry?.src || '');
    return {
      base64: stripped.base64,
      mimeType: String(entry?.mimeType || stripped.mimeType || 'image/jpeg'),
    };
  }).filter((img) => img.base64);

  if (!images.length) {
    return res.status(400).json({ error: 'images[] or imageBase64 is required.' });
  }

  const totalBase64Length = images.reduce((sum, img) => sum + img.base64.length, 0);
  if (totalBase64Length > 6_500_000) {
    return res.status(413).json({ error: 'Total image payload too large (max ~4.5MB across all photos).' });
  }

  const marketKeys = Array.isArray(req.body?.marketKeys) && req.body.marketKeys.length
    ? req.body.marketKeys.filter((key) => typeof key === 'string')
    : SUPPORTED_LISTING_MARKET_KEYS;

  try {
    const userContent = [
      {
        type: 'text',
        text: images.length > 1
          ? `Here are ${images.length} photos of the SAME product (different angles or close-ups). Fuse them into ONE listing.`
          : 'Look at this product photo and produce the listing.',
      },
      ...images.map((img) => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mimeType, data: img.base64 },
      })),
    ];

    const { content, provider, model } = await callVisionChat({
      systemPrompt: buildAiListingSystemPrompt(marketKeys),
      userContent,
      maxTokens: 1024,
      outputSchema: buildAiListingOutputSchema(marketKeys),
    });

    const parsed = safeJsonExtractListing(content);
    if (!parsed) {
      return res.status(502).json({ error: 'AI returned an unparseable response.', raw: content.slice(0, 240) });
    }

    const normalized = normalizeListingResult(parsed, marketKeys);
    return res.json({ listing: normalized, provider, model });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error?.message || 'AI listing request failed.' });
  }
});

// ── /api/describe-media ──────────────────────────────────────────────
// Generic vision endpoint used by the chat to describe a photo or a
// keyframe captured from a video so the AI agent can talk about visual
// content accurately. Returns a strict JSON payload (summary, objects,
// scene, tone, warnings).
const buildDescribeMediaSystemPrompt = (context) => (
  [
    'You are SVS Vision Assistant. You look at a single image and describe what is visible so a chat AI agent can talk about it accurately.',
    'Keep the summary factual and concise.',
    context ? `Context from the user: ${String(context).slice(0, 240)}` : '',
  ].filter(Boolean).join('\n')
);

const DESCRIBE_MEDIA_OUTPUT_SCHEMA = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: '1-2 short sentences describing what the image shows, in plain language' },
      objects: { type: 'array', items: { type: 'string' }, description: 'the key visible items/subjects, max 8' },
      text: { type: 'string', description: 'any clearly readable text visible in the image, or empty string' },
      scene: { type: 'string', description: 'e.g. "indoor kitchen", "outdoor street market", "product close-up", "selfie", "vehicle interior"' },
      tone: { type: 'string', description: 'e.g. "promotional", "casual snapshot", "evidence of damage", "ID document"' },
      warnings: { type: 'array', items: { type: 'string' }, description: 'only if you see sensitive content like exposed ID numbers, faces of minors, weapons, blood; otherwise []' },
    },
    required: ['summary', 'objects', 'text', 'scene', 'tone', 'warnings'],
    additionalProperties: false,
  },
};

const normalizeDescribeMedia = (parsed) => {
  const safe = parsed && typeof parsed === 'object' ? parsed : {};
  return {
    summary: String(safe.summary || '').trim().slice(0, 400),
    objects: Array.isArray(safe.objects)
      ? safe.objects.map((o) => String(o || '').trim().slice(0, 40)).filter(Boolean).slice(0, 8)
      : [],
    text: String(safe.text || '').trim().slice(0, 400),
    scene: String(safe.scene || '').trim().slice(0, 80),
    tone: String(safe.tone || '').trim().slice(0, 60),
    warnings: Array.isArray(safe.warnings)
      ? safe.warnings.map((w) => String(w || '').trim().slice(0, 80)).filter(Boolean).slice(0, 6)
      : [],
  };
};

app.post('/api/describe-media', limits.ai, express.json({ limit: '8mb' }), async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  const imageInput = req.body?.imageBase64 || req.body?.image || req.body?.src || '';
  const stripped = stripListingDataUrl(imageInput);
  const base64 = stripped.base64;
  const mimeType = String(req.body?.mimeType || stripped.mimeType || 'image/jpeg');
  const context = String(req.body?.context || '').slice(0, 240);

  if (!base64) {
    return res.status(400).json({ error: 'imageBase64 is required.' });
  }
  if (base64.length > 6_500_000) {
    return res.status(413).json({ error: 'Image too large (max ~4.5MB).' });
  }

  try {
    const { content, provider, model } = await callVisionChat({
      systemPrompt: buildDescribeMediaSystemPrompt(context),
      userContent: [
        { type: 'text', text: 'Describe this image so a chat assistant can reference it accurately.' },
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
      ],
      maxTokens: 512,
      outputSchema: DESCRIBE_MEDIA_OUTPUT_SCHEMA,
    });

    const parsed = safeJsonExtractListing(content);
    if (!parsed) {
      return res.status(502).json({ error: 'AI returned an unparseable response.', raw: content.slice(0, 240) });
    }

    const description = normalizeDescribeMedia(parsed);
    return res.json({ description, provider, model });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error?.message || 'AI describe request failed.' });
  }
});

// ────────────────────────────────────────────────────────────────────
//  Password-reset email  (nodemailer — full HTML, no dashboard needed)
//  Set in .env:
//    SMTP_HOST=smtp.gmail.com
//    SMTP_PORT=587
//    SMTP_USER=your@gmail.com
//    SMTP_PASS=your-app-password      ← Gmail → Account → App Passwords
//    SMTP_FROM="Biznisdil <your@gmail.com>"
// ────────────────────────────────────────────────────────────────────
app.post('/api/send-reset-email', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { email, resetLink, fullName, roleLabel } = req.body || {};
  if (!email || !resetLink) {
    return res.status(400).json({ error: 'email and resetLink are required.' });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `Biznisdil <${smtpUser}>`;

  if (!smtpHost || !smtpUser || !smtpPass) {
    logger.warn('[send-reset-email] SMTP env vars not set — cannot deliver.');
    return res.status(503).json({ error: 'Email service not configured on server.' });
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const displayName = fullName || 'there';
  const label = roleLabel || 'Biznisdil';
  const logoPath = path.join(__dirname, 'src/assets/icons/biznisdil-logo.jpeg');
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:20px 14px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="background:linear-gradient(135deg,#1e40af 0%,#06b6d4 100%);padding:24px 14px 20px;">
            <img src="cid:biznisdil-logo" alt="Biznisdil" width="72" height="72"
              style="display:block;width:72px;height:72px;object-fit:cover;border-radius:16px;border:3px solid rgba(255,255,255,0.25);margin:0 auto 12px;" />
            <h2 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:3px;">Biznisdil</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;">
            <h1 style="font-size:22px;margin:0 0 20px;color:#0f172a;">Reset your ${label} password</h1>
            <p style="margin:0 0 14px;color:#1f2937;">Hi ${displayName},</p>
            <p style="margin:0 0 24px;line-height:1.6;color:#374151;">We received a request to reset the password for your <strong>${label}</strong> account. Click the button below to choose a new password.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="border-radius:8px;background:linear-gradient(135deg,#1e40af 0%,#06b6d4 100%);">
                  <a href="${resetLink}" target="_blank" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">Reset my password</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 6px;color:#64748b;font-size:13px;">Or copy this link into your browser:</p>
            <p style="margin:0 0 24px;word-break:break-all;font-size:13px;"><a href="${resetLink}" style="color:#1e40af;">${resetLink}</a></p>
            <p style="margin:0 0 6px;color:#64748b;font-size:13px;">This link expires in <strong>30 minutes</strong> and can only be used once.</p>
            <p style="margin:0;color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:18px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">Best regards,<br><strong>The Biznisdil Team</strong></p>
            <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;">This email was sent to ${email}<br>You received this because you are registered with Biznisdil.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: `Reset your ${label} password`,
      html,
      attachments: [
        {
          filename: 'biznisdil-logo.jpeg',
          path: logoPath,
          cid: 'biznisdil-logo',
        },
      ],
    });
    logger.info('[send-reset-email] Delivered', { to: email });
    return res.json({ delivered: true });
  } catch (err) {
    logger.error('[send-reset-email] Failed', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  const visionProvider = process.env.ANTHROPIC_API_KEY ? `anthropic (${DEFAULT_VISION_MODEL})` : 'none';
  res.json({
    status: 'ok',
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    vision: visionProvider,
    addressLookup: 'openstreetmap-nominatim',
  });
});

app.listen(PORT, () => {
  console.log(`Payment server running on http://localhost:${PORT}`);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('WARNING: STRIPE_SECRET_KEY is not set in .env');
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('WARNING: STRIPE_WEBHOOK_SECRET is not set — /api/stripe-webhook will reject all calls.');
  }
});
