const fs = require('fs');
const path = require('path');

const root = path.resolve('src/locales');
const en = JSON.parse(fs.readFileSync(path.join(root, 'en', 'translation.json'), 'utf8'));

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const flatten = (obj, prefix = '', out = {}) => {
  for (const key of Object.keys(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (isObj(val)) flatten(val, next, out);
    else out[next] = val;
  }
  return out;
};

const enFlat = flatten(en);
const dirs = fs.readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((n) => n !== 'en');

for (const lang of dirs) {
  const file = path.join(root, lang, 'translation.json');
  const locale = JSON.parse(fs.readFileSync(file, 'utf8'));
  const flat = flatten(locale);
  const same = Object.keys(enFlat).filter((k) => flat[k] !== undefined && String(flat[k]) === String(enFlat[k]));
  console.log(`${lang}: ${same.length} english-equal keys`);
}
