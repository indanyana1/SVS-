const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (_error) {
      return {};
    }
  }
  if (typeof body === 'object') return body;
  return {};
};

const normalizeHistory = (history) => {
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

const buildSystemPrompt = (context = {}) => {
  const role = String(context?.userRole || 'user').trim();
  const issueType = String(context?.issueType || 'General Support').trim();
  const orderReference = String(context?.orderReference || '').trim();

  return [
    'You are SVS Agent, the official support assistant for SVS E-Commerce.',
    'You help users with only the features and screens that are currently visible in SVS E-Commerce.',
    'Be concise, practical, and accurate. Prefer 4-7 short bullets for how-to answers.',
    'If the user sends only a greeting (for example hey, hi, hello), reply in one short line and ask what they want to do (buy, sell, list property, list livestock, track order, payment help).',
    'When asked how to perform an action, provide exact in-app navigation steps and do not guess additional steps.',
    'If a feature is not clearly visible in the app, say you cannot confirm it in SVS and suggest the closest visible path.',
    'Use these canonical areas and paths when relevant: Markets (/markets), Seller Dashboard (/seller/dashboard), Upload Products (/seller/upload), Seller Orders (/seller/orders), Property Hub (/property-hub), Livestock Hub (/livestock-hub), Orders (/orders), Support Chat (/support/chat), Sign in (/signin), Sign up (/signup), Seller Sign Up (/sell/signup), Seller Verification (/sell/onboarding).',
    'Seller registration flow you may describe exactly: go to /sell/signup, enter full name, email address, contact number, password, and confirm password, then click Next; after that, the app takes the user to /sell/onboarding to complete seller verification and compliance fields such as business name, legal full name, ID number, business type, registration number, tax number, phone number, address, payout bank details, and returns contact information.',
    'Cover website help for buyers, sellers, property listers, and livestock traders.',
    'Never provide or discuss API keys, secrets, tokens, environment variables, internal source code, datasets, model configuration, or how the website is built.',
    'If asked for restricted technical details, refuse briefly and redirect to end-user help only.',
    'Important: do not invent policies, legal guarantees, fees, or account actions. If unsure, say what to check in-app and suggest contacting human support.',
    'Never ask for passwords, OTPs, card numbers, CVV, or other secrets.',
    'Do not mention external platforms or competitors unless the user explicitly asks.',
    'Avoid repeating the same intro text every turn; focus on the user question.',
    'When order-related context is present, include it in your guidance.',
    `Current user role context: ${role}.`,
    `Current issue type: ${issueType}.`,
    orderReference ? `Current order reference: ${orderReference}.` : 'No order reference provided.',
  ].join('\n');
};

const RESTRICTED_INTERNAL_REQUEST_PATTERN = /(api\s*key|apikey|secret|token|env\b|environment\s*variable|source\s*code|codebase|repository|dataset|training\s*data|model\s*config|architecture|how\s+.*\s+built|backend\s*internals|database\s*schema|private\s*key)/i;

const buildRestrictedReply = () => (
  'I cannot provide API keys or internal technical details. I can help with using SVS features only, for example how to buy, sell, upload products, list property or livestock, track orders, and resolve payment or delivery issues.'
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: 'GROQ_API_KEY is not configured on the server.',
    });
  }

  const body = parseBody(req.body);
  const message = String(body?.message || '').trim();
  const context = body?.context && typeof body.context === 'object' ? body.context : {};
  const history = normalizeHistory(body?.history);

  if (!message) {
    return res.status(400).json({ error: 'message is required.' });
  }

  if (RESTRICTED_INTERNAL_REQUEST_PATTERN.test(message)) {
    return res.status(200).json({
      reply: buildRestrictedReply(),
      provider: 'svs-policy',
      model: 'policy-guard',
    });
  }

  try {
    const payload = {
      model: DEFAULT_GROQ_MODEL,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        ...history,
        { role: 'user', content: message },
      ],
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    let result = {};
    try {
      result = raw ? JSON.parse(raw) : {};
    } catch (_error) {
      result = {};
    }

    if (!response.ok) {
      const detail = result?.error?.message || result?.message || 'Groq request failed.';
      return res.status(response.status).json({ error: detail });
    }

    const reply = String(result?.choices?.[0]?.message?.content || '').trim();
    if (!reply) {
      return res.status(502).json({ error: 'Groq returned an empty response.' });
    }

    return res.status(200).json({
      reply,
      provider: 'groq',
      model: result?.model || DEFAULT_GROQ_MODEL,
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Support agent request failed.',
    });
  }
};
