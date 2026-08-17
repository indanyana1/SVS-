const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_VISION_MODEL = process.env.ANTHROPIC_VISION_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

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

const ALLOWED_CONDITIONS = ['New', 'Like new', 'Used - good', 'Used - fair', 'For parts'];

const buildSystemPrompt = (marketKeys) => (
  [
    'You are SVS Listing Assistant. You look at one or more photos of a SINGLE product (e.g. front view, back view, tag, packaging close-up) and write ONE marketplace listing that fuses everything you see across all of them.',
    'IMPORTANT: All photos belong to the SAME product. Do not list each photo separately. Combine what you see (logo, tag, size label, material label, colour, condition) into one cohesive listing.',
    'Read any visible text on labels, tags, packaging or stickers and extract size, material, brand, model, country of origin, batch, etc.',
    'Pick the BEST single marketKey from the list. Do not invent keys.',
    'If you cannot tell what the product is, set confidence < 0.4 and still return your best guess for the rest.',
  ].join('\n')
);

const buildOutputSchema = (marketKeys) => ({
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
      condition: { type: 'string', enum: ALLOWED_CONDITIONS },
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

const safeJsonExtract = (text) => {
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
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
    const client = new Anthropic();
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

    const response = await client.messages.create({
      model: DEFAULT_VISION_MODEL,
      max_tokens: 1024,
      output_config: { format: buildOutputSchema(marketKeys) },
      system: buildSystemPrompt(marketKeys),
      messages: [{ role: 'user', content: userContent }],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(502).json({ error: 'Claude declined to analyse this image.' });
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    const content = String(textBlock?.text || '').trim();
    const parsed = safeJsonExtract(content);
    if (!parsed) {
      return res.status(502).json({ error: 'AI returned an unparseable response.', raw: content.slice(0, 240) });
    }

    const normalized = normalizeResult(parsed, marketKeys);
    return res.status(200).json({
      listing: normalized,
      provider: 'anthropic',
      model: response.model || DEFAULT_VISION_MODEL,
    });
  } catch (error) {
    return res.status(error?.status || 500).json({ error: error?.message || 'AI listing request failed.' });
  }
};
