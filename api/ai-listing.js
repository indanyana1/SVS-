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
    'You are SVS Listing Assistant. You look at one or more photos of a SINGLE product (e.g. front view, back view, tag, packaging close-up) and write ONE marketplace listing that fuses everything you see across all of them.',
    'IMPORTANT: All photos belong to the SAME product. Do not list each photo separately. Combine what you see (logo, tag, size label, material label, colour, condition) into one cohesive listing.',
    'Read any visible text on labels, tags, packaging or stickers and extract size, material, brand, model, country of origin, batch, etc.',
    'Return STRICT JSON only. No prose, no markdown fences. Schema:',
    '{',
    '  "title": string (3-8 words, the product name + key descriptor, e.g. "Nike Hyverse Dri-Fit Training Jogger"),',
    '  "description": string (2-4 short sentences describing what the product is, who it is for, and 3-5 key features you observed across the photos),',
    '  "suggestedMarketKey": one of ' + JSON.stringify(marketKeys) + ',',
    '  "suggestedPrice": number (a sensible retail price in the suggested currency, no currency symbol),',
    '  "suggestedCurrency": ISO-4217 string (USD, ZAR, EUR, etc; default ZAR if local-looking African product, USD otherwise),',
    '  "suggestedQuantity": integer (default 1; only set higher if a photo clearly shows multiple identical units, e.g. a stack of the same shirt),',
    '  "category": short string (specific category like "Joggers", "Soft drinks", "Smartphones"),',
    '  "brand": short string (only if a brand is clearly readable on any photo, otherwise empty string),',
    '  "color": short string (dominant or named colour visible, e.g. "Black", "Navy blue"),',
    '  "size": short string (size read from a tag/label, e.g. "M", "42", "500ml", "XL", empty if unknown),',
    '  "material": short string (material read from a label, e.g. "100% Polyester", "Cotton", "Leather", empty if unknown),',
    '  "condition": one of ["New", "Like new", "Used - good", "Used - fair", "For parts"] (default "New" if it looks new/packaged),',
    '  "keyFeatures": array of 3-6 short bullet strings (each a single feature or selling point read off the photos, no leading dashes or asterisks),',
    '  "confidence": number 0-1 (how confident you are this is a real listable product photo set)',
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

const ALLOWED_CONDITIONS = ['New', 'Like new', 'Used - good', 'Used - fair', 'For parts'];

const normalizeResult = (parsed, allowedMarketKeys) => {
  const safe = parsed && typeof parsed === 'object' ? parsed : {};
  const allowedSet = new Set(allowedMarketKeys);
  const marketKey = allowedSet.has(safe.suggestedMarketKey) ? safe.suggestedMarketKey : 'ecommerce';
  const priceNumber = Number(safe.suggestedPrice);
  const quantityNumber = Math.max(1, Math.round(Number(safe.suggestedQuantity) || 1));
  const confidenceNumber = Math.min(1, Math.max(0, Number(safe.confidence) || 0));
  const conditionRaw = String(safe.condition || '').trim();
  const condition = ALLOWED_CONDITIONS.find((c) => c.toLowerCase() === conditionRaw.toLowerCase()) || 'New';
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  const body = parseBody(req.body);

  // Accept either a single-image payload (legacy) or images: [{imageBase64, mimeType}, ...]
  // (preferred). All images are treated as different angles of the SAME product
  // and fused into one listing.
  const rawImages = Array.isArray(body?.images) && body.images.length
    ? body.images
    : [{ imageBase64: body?.imageBase64 || body?.image || body?.src || '', mimeType: body?.mimeType }];

  const images = rawImages.slice(0, 4).map((entry) => {
    const stripped = stripDataUrl(entry?.imageBase64 || entry?.image || entry?.src || '');
    return {
      base64: stripped.base64,
      mimeType: String(entry?.mimeType || stripped.mimeType || 'image/jpeg'),
    };
  }).filter((img) => img.base64);

  if (!images.length) {
    return res.status(400).json({ error: 'images[] or imageBase64 is required.' });
  }

  // Cap total payload to keep us well under serverless limits (~4MB raw across all images).
  const totalBase64Length = images.reduce((sum, img) => sum + img.base64.length, 0);
  if (totalBase64Length > 6_500_000) {
    return res.status(413).json({ error: 'Total image payload too large (max ~4.5MB across all photos).' });
  }

  const marketKeys = Array.isArray(body?.marketKeys) && body.marketKeys.length
    ? body.marketKeys.filter((key) => typeof key === 'string')
    : SUPPORTED_MARKET_KEYS;

  try {
    const userContent = [
      {
        type: 'text',
        text: images.length > 1
          ? `Here are ${images.length} photos of the SAME product (different angles or close-ups). Fuse them into ONE listing JSON.`
          : 'Look at this product photo and produce the listing JSON.',
      },
      ...images.map((img) => ({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      })),
    ];
    const payload = {
      model: DEFAULT_VISION_MODEL,
      temperature: 0.1,
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(marketKeys) },
        { role: 'user', content: userContent },
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
