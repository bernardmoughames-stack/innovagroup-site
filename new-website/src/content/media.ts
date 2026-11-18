/**
 * Generated-film registry. Files live in public/assets/media/ (committed,
 * durable — visitors never trigger generation). Every film ships as H.264
 * .mp4 with a VP9 .webm twin; posters live in posters/. Full generation
 * records: ASSETS.md.
 */

const BASE = `${import.meta.env.BASE_URL}assets/media/`;

export const FILM = (name: string, ext: 'mp4' | 'webm', phone = false): string =>
  `${BASE}${name}${phone ? '-m' : ''}.${ext}`;

/**
 * Phone cuts (`<name>-m.mp4` / `-m.webm`) are 720×946 crops of the 2206×946
 * films, about a fifth of the weight. On a portrait screen `object-fit:
 * cover` only ever shows a slice of the wide frame, and the crop keeps every
 * pixel of that slice (cropped at the film's own object-position, so the
 * visible window is identical). Used while the film's box is no wider than
 * this ratio.
 */
export const PHONE_CUT_MAX_RATIO = 720 / 946;

export const HERO_STILL = `${BASE}hero.webp`;
