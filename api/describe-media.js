const Anthropic = require('@anthropic-ai/sdk');
const { enforceRateLimit } = require('./_rate-limit');

const DEFAULT_VISION_MODEL = process.env.ANTHROPIC_VISION_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch (_e) { return {}; }
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

const buildSystemPrompt = (context) => (
  [
    'You are SVS Vision Assistant. You look at a single image and describe what is visible so a chat AI agent can talk about it accurately.',
    'Keep the summary factual and concise.',
    context ? `Context from the user: ${String(context).slice(0, 240)}` : '',
  ].filter(Boolean).join('\n')
);

const OUTPUT_SCHEMA = {
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

const normalize = (parsed) => {
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (await enforceRateLimit(req, res, { name: 'describe-media', windowSeconds: 60, max: 20 })) return;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  const body = parseBody(req.body);
  const imageInput = body?.imageBase64 || body?.image || body?.src || '';
  const stripped = stripDataUrl(imageInput);
  const base64 = stripped.base64;
  const mimeType = String(body?.mimeType || stripped.mimeType || 'image/jpeg');
  const context = String(body?.context || '').slice(0, 240);

  if (!base64) {
    return res.status(400).json({ error: 'imageBase64 is required.' });
  }
  if (base64.length > 6_500_000) {
    return res.status(413).json({ error: 'Image too large (max ~4.5MB).' });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: DEFAULT_VISION_MODEL,
      max_tokens: 512,
      output_config: { format: OUTPUT_SCHEMA },
      system: buildSystemPrompt(context),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image so a chat assistant can reference it accurately.' },
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          ],
        },
      ],
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

    const description = normalize(parsed);
    return res.status(200).json({
      description,
      provider: 'anthropic',
      model: response.model || DEFAULT_VISION_MODEL,
    });
  } catch (error) {
    return res.status(error?.status || 500).json({ error: error?.message || 'Failed to describe image.' });
  }
};
