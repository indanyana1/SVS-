/**
 * Stamps the current git commit hash + date into public/service-worker.js
 * as APP_VERSION before every production build.
 *
 * Runs automatically via the "prebuild" npm hook.
 * No manual version bumping required — every `npm run build` produces a
 * unique SW version, which the browser treats as a new service worker and
 * prompts users to update.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'public', 'service-worker.js');

let version;
try {
  const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const date = new Date().toISOString().slice(0, 10);
  version = `${date}-${hash}`;
} catch {
  // Fallback when git is unavailable (e.g. zip-based deploys).
  version = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

const sw = fs.readFileSync(swPath, 'utf8');
const updated = sw.replace(/const APP_VERSION = '[^']*';/, `const APP_VERSION = '${version}';`);

if (updated === sw) {
  console.warn('[version-sw] WARNING: APP_VERSION line not found in service-worker.js — no change made.');
} else {
  fs.writeFileSync(swPath, updated);
  console.log(`[version-sw] APP_VERSION set to '${version}'`);
}
