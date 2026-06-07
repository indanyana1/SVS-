const DEFAULT_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

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

const stripDataUrl = (input) => {
  const value = String(input || '').trim();
  if (!value) return { base64: '', mimeType: '' };
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { base64: match[2], mimeType: match[1] };
  return { base64: value, mimeType: '' };
};

const SUPPORTED_MARKET_KEYS = [
  'beverages', 'homeCare', 'tickets', 'constructionTools', 'hardwareSoftware',
  'fashionStyle', 'fastFood', 'groceries', 'ecommerce', 'mobilityVehicles',
  'naturalResources', 'wellness', 'property', 'secondhand', 'stationery',
  'traditionalMedicines', 'beautyFitnessSports', 'toysKids',
  'jewelleryAccessories', 'livestock', 'informalMarket',
];

const buildSystemPrompt = (marketKeys) => (
  [
    'You are SVS Listing Assistant. You look at a single product photo and write a marketplace listing for it.',
    'Return STRICT JSON only. No prose, no markdown fences. Schema:',
    '{',
    '  "title": string (3-8 words, the product name + key descriptor),',
    '  "description": string (1-3 short sentences highlighting what the product is, what it is used for, and 2-3 key features the photo shows),',
    '  "suggestedMarketKey": one of ' + JSON.stringify(marketKeys) + ',',
    '  "suggestedPrice": number (a sensible retail price in the suggested currency, no currency symbol),',
    '  "suggestedCurrency": ISO-4217 string (USD, ZAR, EUR, etc; default ZAR if local-looking African product, USD otherwise),',
    '  "suggestedQuantity": integer (default 1, or higher if photo clearly shows multiple identical units),',
    '  "category": short string (optional generic category like "Soft drinks" or "T-Shirts"),',
    '  "brand": short string (only if a brand is clearly readable in the photo, otherwise empty string),',
    '  "color": short string (dominant colour visible, optional),',
    '  "confidence": number 0-1 (how confident you are this is a real listable product photo)',
    '}',
    'Pick the BEST single marketKey from the list. Do not invent keys.',
    'If you cannot tell what the product is, set confidence < 0.4 and still return your best guess for the rest.',
    'Never include any text outside the JSON object.',
  ].join('\n')
);

const safeJsonExtract = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  // Try plain parse first.
  try { return JSON.parse(trimmed); } catch (_e) { /* continue */ }
  // Strip markdown fences if any.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch (_e) { /* continue */ }
  }
  // Last resort: locate the first { ... } block.
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch (_e) { /* continue */ }
  }
  return null;
};

const normalizeResult = (parsed, allowedMarketKeys) => {
  const safe = parsed && typeof parsed === 'object' ? parsed : {};
  const allowedSet = new Set(allowedMarketKeys);
  const marketKey = allowedSet.has(safe.suggestedMarketKey) ? safe.suggestedMarketKey : 'ecommerce';
  const priceNumber = Number(safe.suggestedPrice);
  const quantityNumber = Math.max(1, Math.round(Number(safe.suggestedQuantity) || 1));
  const confidenceNumber = Math.min(1, Math.max(0, Number(safe.confidence) || 0));
  return {
    title: String(safe.title || '').trim().slice(0, 120) || 'Untitled product',
    description: String(safe.description || '').trim().slice(0, 600),
    suggestedMarketKey: marketKey,
    suggestedPrice: Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber : 0,
    suggestedCurrency: String(safe.suggestedCurrency || 'USD').trim().toUpperCase().slice(0, 6) || 'USD',
    suggestedQuantity: quantityNumber,
    category: String(safe.category || '').trim().slice(0, 60),
    brand: String(safe.brand || '').trim().slice(0, 60),
    color: String(safe.color || '').trim().slice(0, 40),
    confidence: confidenceNumber,
  };
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  const body = parseBody(req.body);
  const imageInput = body?.imageBase64 || body?.image || body?.src || '';
  const stripped = stripDataUrl(imageInput);
  const base64 = stripped.base64;
  const mimeType = String(body?.mimeType || stripped.mimeType || 'image/jpeg');

  if (!base64) {
    return res.status(400).json({ error: 'imageBase64 is required.' });
  }

  // Cap payload at ~6MB after base64 (~4.5MB raw image).
  if (base64.length > 6_500_000) {
    return res.status(413).json({ error: 'Image too large (max ~4.5MB).' });
  }

  const marketKeys = Array.isArray(body?.marketKeys) && body.marketKeys.length
    ? body.marketKeys.filter((key) => typeof key === 'string')
    : SUPPORTED_MARKET_KEYS;

  try {
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const payload = {
      model: DEFAULT_VISION_MODEL,
      temperature: 0.1,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(marketKeys) },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Look at this product photo and produce the listing JSON.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
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
    try { result = raw ? JSON.parse(raw) : {}; } catch (_e) { result = {}; }

    if (!response.ok) {
      const detail = result?.error?.message || result?.message || 'Groq vision request failed.';
      return res.status(response.status).json({ error: detail });
    }

    const content = String(result?.choices?.[0]?.message?.content || '').trim();
    const parsed = safeJsonExtract(content);
    if (!parsed) {
      return res.status(502).json({ error: 'AI returned an unparseable response.', raw: content.slice(0, 240) });
    }

    const normalized = normalizeResult(parsed, marketKeys);
    return res.status(200).json({
      listing: normalized,
      provider: 'groq',
      model: result?.model || DEFAULT_VISION_MODEL,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'AI listing request failed.' });
  }
};
