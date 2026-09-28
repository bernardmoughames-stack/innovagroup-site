/**
 * Generated-media registry. Files live in public/assets/media/ (committed,
 * durable — visitors never trigger generation). An entry whose file is
 * missing simply never fades in: the procedural scene is the fallback.
 * Generation records for every file: see ASSETS.md.
 */

const BASE = `${import.meta.env.BASE_URL}assets/media/`;

export const WORLD_VIDEO: Record<string, string> = {
  contracting: `${BASE}contracting.mp4`,
  pm: `${BASE}pm.mp4`,
  facility: `${BASE}facility.mp4`,
  cinema: `${BASE}cinema.mp4`,
  snagging: `${BASE}snagging.mp4`,
  marketing: `${BASE}marketing.mp4`,
  consultancy: `${BASE}consultancy.mp4`,
  ai: `${BASE}ai.mp4`,
  homewatch: `${BASE}homewatch.mp4`,
};

export const SKYLINE_VIDEO = `${BASE}skyline.mp4`;
export const HERO_STILL = `${BASE}hero.webp`;
