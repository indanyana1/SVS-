const fs = require('fs');
const [target, blockFile, anchorFile, mode = 'before'] = process.argv.slice(2);
const source = fs.readFileSync(target, 'utf8');
const usesCrlf = source.includes('\r\n');
const toEol = (text) => (usesCrlf ? text.replace(/\r?\n/g, '\r\n') : text.replace(/\r\n/g, '\n'));
const block = toEol(fs.readFileSync(blockFile, 'utf8'));
const anchor = toEol(fs.readFileSync(anchorFile, 'utf8')).replace(/(\r?\n)$/, '');
const count = source.split(anchor).length - 1;
if (count !== 1) { console.error(`${target}: anchor matched ${count} times — aborting`); process.exit(1); }
const replacement = mode === 'after' ? anchor + block : mode === 'replace' ? block : block + anchor;
fs.writeFileSync(target, source.replace(anchor, replacement));
console.log(`${target}: spliced (${mode})`);
