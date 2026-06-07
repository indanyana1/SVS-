const DEFAULT_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo';

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
  if (match) {
    return { base64: match[2], mimeType: match[1] };
  }
  return { base64: value, mimeType: '' };
};

const extensionForMime = (mimeType) => {
  const mt = String(mimeType || '').toLowerCase();
  if (mt.includes('webm')) return 'webm';
  if (mt.includes('ogg')) return 'ogg';
  if (mt.includes('mp4') || mt.includes('m4a') || mt.includes('aac')) return 'm4a';
  if (mt.includes('mpeg') || mt.includes('mp3')) return 'mp3';
  if (mt.includes('wav')) return 'wav';
  return 'webm';
};

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
  const audioInput = body?.audioBase64 || body?.audio || body?.src || '';
  const stripped = stripDataUrl(audioInput);
  const base64 = stripped.base64;
  const mimeType = String(body?.mimeType || stripped.mimeType || 'audio/webm');
  const language = String(body?.language || '').trim();

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
    const filename = `voice-note.${extensionForMime(mimeType)}`;
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('model', DEFAULT_WHISPER_MODEL);
    formData.append('response_format', 'json');
    formData.append('temperature', '0');
    if (language) formData.append('language', language);

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: formData,
    });

    const raw = await response.text();
    let result = {};
    try {
      result = raw ? JSON.parse(raw) : {};
    } catch (_error) {
      result = {};
    }

    if (!response.ok) {
      const detail = result?.error?.message || result?.message || 'Groq transcription failed.';
      return res.status(response.status).json({ error: detail });
    }

    const text = String(result?.text || '').trim();
    return res.status(200).json({
      text,
      provider: 'groq',
      model: DEFAULT_WHISPER_MODEL,
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Voice transcription failed.',
    });
  }
};
