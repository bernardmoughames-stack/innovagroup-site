// Film-first sweep: every chapter, a story overlay, AR, mobile, lite.
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
    if (m.type() === 'error' && !m.text().includes('CERT')) errors.push(`console: ${m.text()}`);
  });
  return page;
}

// Desktop journey
{
  const page = await newPage(1440, 900);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/01-hero.png` });
  await page.evaluate(() => document.getElementById('gaps')?.scrollIntoView());
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/02-manifesto.png` });
  for (const svc of ['contracting', 'pm', 'cinema', 'marketing', 'consultancy', 'homewatch']) {
    await page.evaluate((s) => document.querySelector(`[data-service="${s}"]`)?.scrollIntoView(), svc);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOTS}/ch-${svc}.png` });
  }
  // Story overlay: open, scroll inside, close via Escape
  await page.click('[data-service="contracting"] .open-story');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/10-story-top.png` });
  await page.evaluate(() => document.querySelector('[data-service="contracting"] .story-inner')?.scrollTo(0, 600));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/11-story-scrolled.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const stillOpen = await page.evaluate(() => Boolean(document.querySelector('.story:not([hidden])')));
  if (stillOpen) errors.push('story dialog did not close on Escape');
  for (const [name, id] of [['12-why', 'why'], ['13-process', 'process'], ['14-cta', 'contact']]) {
    await page.evaluate((i) => document.getElementById(i)?.scrollIntoView(), id);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
  }
  // Day mode + services dropdown
  await page.click('#theme-toggle');
  await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById('why')?.scrollIntoView());
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/16-day-quiet.png` });
  await page.evaluate(() => document.querySelector('[data-service="snagging"]')?.scrollIntoView());
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${SHOTS}/17-day-chapter.png` });
  await page.click('[data-service="snagging"] .open-story');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/18-day-story.png` });
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.click('.nav-drop-btn');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/19-dropdown.png` });
  await page.click('#theme-toggle');
  await page.waitForTimeout(300);
  // Arabic
  await page.click('.lang-switch button[data-lang="ar"]');
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('[data-service="pm"]')?.scrollIntoView());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/15-arabic.png` });
  if ((await page.evaluate(() => document.documentElement.dir)) !== 'rtl') errors.push('RTL not applied');
  await page.close();
}

// Mobile
{
  const page = await newPage(390, 844);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${SHOTS}/m1-hero.png` });
  await page.evaluate(() => document.querySelector('[data-service="contracting"]')?.scrollIntoView());
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${SHOTS}/m2-chapter.png` });
  await page.click('[data-service="contracting"] .open-story');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/m3-story.png` });
  await page.keyboard.press('Escape');
  if (!(await page.locator('.sticky-bar').isVisible())) errors.push('sticky bar missing on mobile');
  await page.close();
}

// Lite
{
  const page = await newPage(1280, 800);
  await page.goto(`${BASE}/?lite=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const playing = await page.evaluate(() =>
    [...document.querySelectorAll('video')].some((v) => v.src && !v.paused)
  );
  if (playing) errors.push('lite mode is playing video');
  await page.screenshot({ path: `${SHOTS}/l1-lite.png` });
  await page.close();
}

await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
