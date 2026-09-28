import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const SHOTS = process.env.SHOTS ?? '/tmp/qa-shots';
mkdirSync(SHOTS, { recursive: true });
const BASE = 'http://localhost:4173';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function run(name, { width, height, url = BASE, actions }) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => {
    if (!r.url().includes('fonts.g')) errors.push(`[${name}] reqfail: ${r.url()} ${r.failure()?.errorText}`);
  });
  await page.goto(url, { waitUntil: 'networkidle' }).catch((e) => errors.push(`[${name}] goto: ${e.message}`));
  await page.waitForTimeout(3500);
  await actions?.(page).catch((e) => errors.push(`[${name}] action: ${e.message}`));
  await page.close();
}

const enter = async (page, shotPrefix) => {
  await page.screenshot({ path: `${SHOTS}/${shotPrefix}-0-loader.png` });
  const btn = page.locator('.loader-enter button[data-sound="0"]');
  await btn.waitFor({ state: 'visible', timeout: 8000 });
  await btn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/${shotPrefix}-1-hero.png` });
};

await run('desktop', {
  width: 1440, height: 900,
  actions: async (page) => {
    await enter(page, 'desktop');
    // scroll through the journey
    const steps = [0.12, 0.2, 0.3, 0.42, 0.55, 0.7, 0.85, 1];
    for (let i = 0; i < steps.length; i++) {
      await page.evaluate((f) => window.scrollTo(0, (document.body.scrollHeight - innerHeight) * f), steps[i]);
      await page.waitForTimeout(1100);
      await page.screenshot({ path: `${SHOTS}/desktop-2-scroll-${i}.png` });
    }
    // fast jump back up + down
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
    // enter a world via card button
    await page.evaluate(() => document.querySelector('.service-card[data-service="cinema"] .enter-world')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(700);
    await page.click('.service-card[data-service="cinema"] .enter-world');
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${SHOTS}/desktop-3-world-cinema.png` });
    await page.click('.world-nav button:last-child');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOTS}/desktop-4-world-next.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/desktop-5-back.png` });
    // arabic
    await page.click('.lang-switch button[data-lang="ar"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/desktop-6-arabic.png` });
    const dir = await page.evaluate(() => document.documentElement.dir);
    if (dir !== 'rtl') errors.push('[desktop] RTL dir not applied');
  },
});

await run('mobile', {
  width: 390, height: 844,
  actions: async (page) => {
    await enter(page, 'mobile');
    await page.evaluate(() => window.scrollTo(0, (document.body.scrollHeight - innerHeight) * 0.35));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SHOTS}/mobile-2-services.png` });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SHOTS}/mobile-3-footer.png` });
    // sticky bar visible?
    const bar = await page.locator('.sticky-bar').isVisible();
    if (!bar) errors.push('[mobile] sticky bar not visible');
    // menu
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('#menu-toggle');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/mobile-4-menu.png` });
  },
});

await run('lite', {
  width: 1280, height: 800, url: `${BASE}/?lite=1`,
  actions: async (page) => {
    await page.screenshot({ path: `${SHOTS}/lite-1-hero.png` });
    const stage = await page.locator('#stage').count();
    if (stage > 0) errors.push('[lite] WebGL stage mounted in lite mode');
    const corner = await page.evaluate(() =>
      document.elementsFromPoint(4, 4).map((el) => `${el.tagName}.${el.className}`.slice(0, 60))
    );
    console.log('corner stack:', corner.join(' | '));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.4));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SHOTS}/lite-2-services.png` });
  },
});

await run('tablet', {
  width: 834, height: 1112,
  actions: async (page) => {
    await enter(page, 'tablet');
  },
});

await browser.close();
console.log(errors.length ? `ERRORS (${errors.length}):\n` + errors.join('\n') : 'NO ERRORS');
