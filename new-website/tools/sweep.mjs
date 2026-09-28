// Multi-page sweep: homepage journey, every service page, language/theme
// toggles, mobile, lite — plus a click-fuzz pass that hammers the chrome
// while watching for console/page errors.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const SHOTS = process.env.SHOTS ?? '/tmp/sweep';
mkdirSync(SHOTS, { recursive: true });
const BASE = 'http://localhost:4173';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function newPage(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('CERT')) errors.push(`console [${page.url()}]: ${m.text()}`);
  });
  page.on('load', () => {
    page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; }).catch(() => {});
  });
  return page;
}

async function clickNav(page, sel, pattern, label) {
  try {
    await page.click(sel, { timeout: 8000 });
    await page.waitForURL(pattern, { timeout: 12000 });
  } catch (e) {
    errors.push(`${label} did not navigate: ${e.message.split('\n')[0]}`);
  }
}

// A pinned deck chapter always reports top:0, so scrolling "to it" means
// scrolling to its flow position inside .chapters (index * viewport height).
async function showChapter(page, svc) {
  await page.evaluate((s) => {
    const cont = document.querySelector('.chapters');
    const list = [...cont.querySelectorAll('.chapter')];
    const i = list.findIndex((c) => c.dataset.service === s);
    const contTop = cont.getBoundingClientRect().top + scrollY;
    scrollTo({ top: contTop + i * innerHeight + 2, behavior: 'instant' });
  }, svc);
}

async function home(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  await page.waitForTimeout(600);
}

const PAGES = ['contracting', 'project-management', 'facility-management', 'cinema',
  'snagging', 'marketing', 'consultancy', 'ai', 'home-watch'];

// ---- Homepage journey ----
{
  const page = await newPage(1440, 900);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/01-hero.png` });
  for (const svc of ['contracting', 'cinema', 'homewatch']) {
    await showChapter(page, svc);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${SHOTS}/ch-${svc}.png` });
  }
  // Chapter button navigates to the service page
  await showChapter(page, 'contracting');
  await page.waitForTimeout(600);
  await clickNav(page, '[data-service="contracting"] .chapter-actions a.btn', '**/contracting.html', 'chapter button');
  await home(page);
  // Chapter TITLE click navigates too
  await showChapter(page, 'cinema');
  await page.waitForTimeout(700);
  await clickNav(page, '[data-service="cinema"] .chapter-copy h2', '**/cinema.html', 'chapter title');
  await home(page);
  // Dropdown navigates
  await page.click('.nav-drop-btn', { timeout: 8000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/02-dropdown.png` });
  await clickNav(page, '#services-menu a[href="snagging.html"]', '**/snagging.html', 'dropdown link');
  await home(page);
  for (const [name, id] of [['03-why', 'why'], ['04-process', 'process'], ['05-cta', 'contact']]) {
    await page.evaluate((i) => document.getElementById(i)?.scrollIntoView(), id);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
  }
  // No leftover story markup
  if (await page.evaluate(() => document.querySelector('.story, .open-story') !== null)) {
    errors.push('story remnants on homepage');
  }
  await page.close();
}

// ---- Every service page: load, sections, no errors ----
for (const slug of PAGES) {
  const page = await newPage(1440, 900);
  await page.goto(`${BASE}/${slug}.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${SHOTS}/p-${slug}-hero.png` });
  // hero film attached & playing
  const playing = await page.evaluate(() => {
    const v = document.querySelector('.svc-hero video');
    return v && v.src && !v.paused;
  });
  if (!playing) errors.push(`${slug}: hero film not playing`);
  // Arabic block hidden in EN
  const arVisible = await page.evaluate(() =>
    [...document.querySelectorAll('.l10n[lang="ar"]')].some((el) => el.offsetParent !== null));
  if (arVisible) errors.push(`${slug}: Arabic block visible in EN mode`);
  await page.evaluate(() => document.getElementById('packages')?.scrollIntoView());
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/p-${slug}-packages.png` });
  // FAQ opens
  await page.evaluate(() => document.getElementById('faq')?.scrollIntoView());
  await page.waitForTimeout(600);
  const enFaq = page.locator('#faq .l10n[lang="en"] details').first();
  await enFaq.locator('summary').click();
  if (!(await enFaq.evaluate((el) => el.open))) errors.push(`${slug}: FAQ does not open`);
  await page.close();
}

// ---- Deep pass on contracting: AR, theme, related, talk ----
{
  const page = await newPage(1440, 900);
  await page.goto(`${BASE}/contracting.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // Arabic
  await page.click('.lang-switch button[data-lang="ar"]');
  await page.waitForTimeout(700);
  if ((await page.evaluate(() => document.documentElement.dir)) !== 'rtl') errors.push('service page: RTL not applied');
  const enVisible = await page.evaluate(() =>
    [...document.querySelectorAll('.l10n[lang="en"]')].some((el) => el.offsetParent !== null));
  if (enVisible) errors.push('service page: English still visible in AR mode');
  await page.screenshot({ path: `${SHOTS}/deep-ar-hero.png` });
  await page.evaluate(() => document.getElementById('scope')?.scrollIntoView());
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/deep-ar-scope.png` });
  await page.evaluate(() => document.getElementById('packages')?.scrollIntoView());
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/deep-ar-packages.png` });
  await page.click('.lang-switch button[data-lang="en"]');
  await page.waitForTimeout(500);
  // Day mode
  await page.click('#theme-toggle');
  await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById('offer')?.scrollIntoView());
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/deep-day-offer.png` });
  await page.evaluate(() => document.getElementById('packages')?.scrollIntoView());
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/deep-day-packages.png` });
  await page.click('#theme-toggle');
  // Related card navigates
  await page.evaluate(() => document.getElementById('related')?.scrollIntoView());
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/deep-related.png` });
  await clickNav(page, '.rel-card[href="project-management.html"]', '**/project-management.html', 'related card');
  await page.waitForTimeout(700);
  const backTop = await page.evaluate(() => scrollY);
  if (backTop > 4) errors.push(`service->service navigation landed at scrollY=${backTop}, not top`);
  await page.goto(`${BASE}/contracting.html`, { waitUntil: 'networkidle' });
  // Talk finale
  await page.evaluate(() => document.getElementById('talk')?.scrollIntoView());
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${SHOTS}/deep-talk.png` });
  await page.close();
}

// ---- Click-fuzz: hammer the chrome, watch for errors ----
for (const url of [BASE, `${BASE}/contracting.html`]) {
  const page = await newPage(1440, 900);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const targets = ['.nav-drop-btn', '#theme-toggle', '.lang-switch button[data-lang="ar"]',
    '.lang-switch button[data-lang="en"]', '.nav-drop-btn', '#theme-toggle'];
  for (let round = 0; round < 3; round++) {
    for (const sel of targets) {
      await page.click(sel, { force: true }).catch(() => {});
      await page.waitForTimeout(120);
    }
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.scrollBy(0, 900));
    await page.waitForTimeout(200);
  }
  // End state must be sane: EN, night, dropdown closed
  await page.click('.lang-switch button[data-lang="en"]', { force: true }).catch(() => {});
  await page.waitForTimeout(400);
  const sane = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    drop: document.querySelector('.nav-item.open') === null,
  }));
  if (sane.dir !== 'ltr') errors.push(`fuzz ${url}: dir stuck at ${sane.dir}`);
  if (!sane.drop) errors.push(`fuzz ${url}: dropdown stuck open`);
  await page.screenshot({ path: `${SHOTS}/fuzz-${url.endsWith('.html') ? 'svc' : 'home'}.png` });
  await page.close();
}

// ---- Mobile ----
{
  const page = await newPage(390, 844);
  await page.goto(`${BASE}/contracting.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/m1-svc-hero.png` });
  await page.evaluate(() => document.getElementById('packages')?.scrollIntoView());
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/m2-svc-packages.png` });
  if (!(await page.locator('.sticky-bar').isVisible())) errors.push('sticky bar missing on mobile service page');
  // burger menu opens and its dropdown links show
  await page.click('#menu-toggle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/m3-menu.png` });
  await page.close();
}

// ---- Lite ----
{
  const page = await newPage(1280, 800);
  await page.goto(`${BASE}/contracting.html?lite=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const playing = await page.evaluate(() =>
    [...document.querySelectorAll('video')].some((v) => v.src && !v.paused));
  if (playing) errors.push('lite mode is playing video on service page');
  await page.screenshot({ path: `${SHOTS}/l1-lite-svc.png` });
  await page.close();
}

await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
