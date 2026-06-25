import { chromium } from 'playwright';
import fs from 'fs';

const TEST_EMAIL = 'qa-contacts-list-test@example.com';
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.evaluate((email) => {
  window.localStorage.setItem('svs-authenticated', 'true');
  window.localStorage.setItem('svs-user-email', email);
}, TEST_EMAIL);

await page.goto('http://localhost:3000/general-labour-market/sell', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

await page.fill('#gl-name', 'QA Listable Contact Worker').catch(async () => page.fill('input[name="name"]', 'QA Listable Contact Worker'));
await page.selectOption('select[name="category"]', { label: 'Mason' });
await page.selectOption('select[name="gender"]', { label: 'Male' });
await page.selectOption('select[name="experienceLevel"]', { label: '3-5 Years' });
await page.selectOption('select[name="skillLevel"]', { label: 'Semi-Skilled' });
await page.selectOption('select[name="rateType"]', { label: 'Daily' });
await page.selectOption('select[name="serviceType"]', { label: 'Weekly' });
await page.fill('input[name="rate"]', '900');
await page.fill('input[name="country"]', 'South Africa');
await page.fill('input[name="city"]', 'Pretoria');
await page.fill('input[name="phone"]', '+27 83 222 3344');

await page.click('#gl-currency');
await page.fill('#gl-currency + div input[type="text"]', 'ZAR');
await page.waitForTimeout(200);
await page.locator('ul[role="listbox"] li button:has-text("ZAR")').first().click().catch(() => {});

if (!fs.existsSync('tmp-screenshots')) fs.mkdirSync('tmp-screenshots');
fs.writeFileSync('tmp-screenshots/tiny.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CyJggg==', 'base64'));
await page.setInputFiles('input[type="file"]', 'tmp-screenshots/tiny.png');
await page.waitForTimeout(300);

await page.click('button:has-text("Publish Profile")').catch(async () => page.click('button[type="submit"]:has-text("Publish")'));
await page.waitForTimeout(2500);

// Reload the sell page fresh to see "My Worker Profiles" with the new listing
await page.goto('http://localhost:3000/general-labour-market/sell', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const listText = await page.locator('body').innerText();
console.log('Phone visible in My Worker Profiles list (expect true):', listText.includes('+27 83 222 3344'));
await page.screenshot({ path: 'tmp-screenshots/my-worker-profiles.png', fullPage: true });

await browser.close();
