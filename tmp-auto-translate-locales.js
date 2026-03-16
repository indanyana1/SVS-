const fs = require('fs');
const path = require('path');

const root = path.resolve('src/locales');
const enPath = path.join(root, 'en', 'translation.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const onlyPrefixes = String(process.env.ONLY_PREFIXES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const forceTranslate = String(process.env.FORCE_TRANSLATE || '').toLowerCase() === 'true';

const langMap = {
  af: 'af', ar: 'ar', bn: 'bn', de: 'de', es: 'es', fil: 'tl', fr: 'fr', hi: 'hi',
  id: 'id', it: 'it', ja: 'ja', ko: 'ko', mr: 'mr', nl: 'nl', pcm: null, pl: 'pl',
  pt: 'pt', ro: 'ro', ru: 'ru', st: 'st', sw: 'sw', ta: 'ta', te: 'te', th: 'th',
  tr: 'tr', uk: 'uk', vi: 'vi', zh: 'zh-CN', zu: 'zu'
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

const getByPath = (obj, p) => p.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
const setByPath = (obj, p, value) => {
  const parts = p.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!isObj(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
};

const flatten = (obj, prefix = '', out = {}) => {
  for (const key of Object.keys(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (isObj(val)) flatten(val, next, out);
    else out[next] = val;
  }
  return out;
};

const preserveTokens = (text) => {
  const tokens = [];
  let output = String(text);
  const addToken = (raw) => {
    const marker = `__TOK_${tokens.length}__`;
    tokens.push(raw);
    output = output.replace(raw, marker);
  };

  const mustKeep = output.match(/\{\{[^}]+\}\}/g) || [];
  for (const m of mustKeep) addToken(m);

  const brands = ['SVS E-Commerce', 'SVS'];
  for (const b of brands) {
    if (output.includes(b)) addToken(b);
  }

  return { text: output, tokens };
};

const restoreTokens = (text, tokens) => {
  let out = String(text);
  for (let i = 0; i < tokens.length; i++) {
    const marker = `__TOK_${i}__`;
    out = out.replaceAll(marker, tokens[i]);
  }
  return out;
};

async function translateText(input, targetLang) {
  const { text, tokens } = preserveTokens(input);
  if (!targetLang) return input;

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated = Array.isArray(data?.[0]) ? data[0].map((part) => part[0]).join('') : text;
      return restoreTokens(translated, tokens);
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  return input;
}

(async () => {
  const enFlat = flatten(en);
  const filteredKeys = Object.keys(enFlat).filter((key) => {
    if (typeof enFlat[key] !== 'string') return false;
    if (!onlyPrefixes.length) return true;
    return onlyPrefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}.`));
  });
  const localeDirs = fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => n !== 'en');

  for (const code of localeDirs) {
    const targetLang = langMap[code];
    const filePath = path.join(root, code, 'translation.json');
    const locale = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const localeFlat = flatten(locale);

    const keysToTranslate = forceTranslate
      ? filteredKeys
      : filteredKeys.filter((k) => localeFlat[k] === undefined || String(localeFlat[k]) === String(enFlat[k]));

    if (keysToTranslate.length === 0) {
      console.log(`${code}: nothing to translate`);
      continue;
    }

    if (!targetLang) {
      for (const key of keysToTranslate) {
        setByPath(locale, key, enFlat[key]);
      }
      fs.writeFileSync(filePath, JSON.stringify(locale, null, 2) + '\n', 'utf8');
      console.log(`${code}: filled ${keysToTranslate.length} keys with English fallback - no reliable MT language code`);
      continue;
    }

    console.log(`${code}: translating ${keysToTranslate.length} keys...`);

    let translatedCount = 0;
    for (const key of keysToTranslate) {
      const src = enFlat[key];
      setByPath(locale, key, src);
      try {
        const out = await translateText(src, targetLang);
        setByPath(locale, key, out);
        translatedCount++;
      } catch (err) {
        // keep English fallback on failure
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(locale, null, 2) + '\n', 'utf8');
    console.log(`${code}: translated ${translatedCount}/${keysToTranslate.length}`);
  }

  console.log('done');
})();
