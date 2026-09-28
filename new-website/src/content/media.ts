/**
 * Generated-film registry. Files live in public/assets/media/ (committed,
 * durable — visitors never trigger generation). Every film ships as H.264
 * .mp4 with a VP9 .webm twin; posters live in posters/. Full generation
 * records: ASSETS.md.
 */

const BASE = `${import.meta.env.BASE_URL}assets/media/`;

export const FILM = (name: string, ext: 'mp4' | 'webm'): string => `${BASE}${name}.${ext}`;

export const HERO_STILL = `${BASE}hero.webp`;
