// Full visual sweep: every scroll beat + all nine service worlds.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const SHOTS = process.env.SHOTS ?? '/tmp/sweep';
mkdirSync(SHOTS, { recursive: true });
const BASE = 'http://localhost:4173';
const SERVICES = ['contracting', 'pm', 'facility', 'cinema', 'snagging', 'marketing', 'consultancy', 'ai', 'homewatch'];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('CERT')) errors.push(`console: ${m.text()}`); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('.loader-enter button[data-sound="0"]').click({ timeout: 10000 });
await page.waitForTimeout(2200);

const beats = [
  ['01-hero', 0], ['02-gaps-open', 0.14], ['03-gaps-close', 0.2], ['04-orbit', 0.29],
  ['05-cards', 0.42], ['06-why', 0.62], ['07-process', 0.74], ['08-cta', 0.9], ['09-footer', 1],
];
for (const [name, f] of beats) {
  await page.evaluate((v) => window.scrollTo(0, (document.body.scrollHeight - innerHeight) * v), f);
  await page.waitForTimeout(name === '08-cta' ? 3000 : 1100);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

for (const svc of SERVICES) {
  await page.evaluate((s) => document.querySelector(`.service-card[data-service="${s}"] .enter-world`)?.scrollIntoView({ block: 'center' }), svc);
  await page.waitForTimeout(500);
  await page.click(`.service-card[data-service="${svc}"] .enter-world`);
  await page.waitForTimeout(3200); // world mount + clip fade-in
  await page.screenshot({ path: `${SHOTS}/world-${svc}.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1300);
}

await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
