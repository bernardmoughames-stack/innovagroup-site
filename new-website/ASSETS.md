# Asset manifest & generation records

## Current state — all visuals are procedural (zero downloads, zero spend)

| Asset | Source | Where |
|---|---|---|
| 3D diamond (33 facets, navy metal + gold edges) | procedural geometry | `src/app/diamond.ts` |
| Gold assembly particles (loader) | procedural GLSL points | `src/app/particles.ts` |
| 9 portal ring + glow discs | procedural GLSL | `src/app/orbit.ts` |
| 9 service worlds (villa build, blueprint tower, heartbeat building, cinema, laser snagging, shatter/reform mark, order-from-chaos, gold neural lattice, guarded villa at dusk) | procedural Three.js scenes | `src/app/worlds.ts` |
| Dubai night skyline (CTA finale) | procedural, seeded | `src/app/scrollScenes.ts` |
| Ambient sound + UI ticks | synthesised WebAudio (no files) | `src/app/audio.ts` |
| Logo mark | **placeholder SVG** (official PNG unreachable from build env) | `public/logo-mark.svg` |

Visitors never trigger AI generation — generation happens at build/design
time only, and approved outputs are committed under `public/assets/media/`.

## Proposed Higgsfield batch (awaiting approval — nothing generated yet)

Credits available at time of writing: **1,210** (Plus plan). The MCP API does
not expose per-job pricing, so the plan starts with a paid **pilot** whose
exact debit is measured from the balance/transactions before continuing.

| # | Asset | Model & settings | Purpose |
|---|---|---|---|
| P | Pilot: 1 still + 1 4s 720p video | image model + Seedance 2.5 t2v | measure real credit cost, then re-estimate the batch |
| 1 | Hero key-art still (21:9) | image model, navy/gold diamond in darkness | OG/social image + lite-mode hero backdrop + video start frame |
| 2–10 | 9 service-world loop backdrops, 6–8s, 21:9, 1080p, no audio | Seedance 2.5 (t2v or image-ref from #1 for consistency) | video planes behind each world's procedural scene |
| 11 | Dubai skyline night aerial, slow dolly, 8s 21:9 | Seedance 2.5 | CTA finale backdrop |
| 12 | (optional) logo-faithful 3D GLB | Meshy image-to-3D from the official logo file | replace the procedural diamond with the exact mark |

Integration notes: each video gets a poster frame, `preload="none"`,
lazy-mount on section approach, and the procedural scene remains as the
loading/failure fallback. #12 requires the official logo image (upload it to
the repo or make it reachable), since innovagroup.co.ae is blocked from this
build environment.

## Generation records — batch of 2026-09-28

All prompts (written by a write→adversarial-refine→harmonize agent workflow)
are archived verbatim in `ASSETS-prompts.json`. Settings for every video:
Seedance 2.5, 6s, 21:9, 1080p, no audio, text-to-video. Source files arrived
as HEVC 10-bit and were re-encoded to H.264 yuv420p 1680px (`ffmpeg -crf 22
-preset medium -movflags +faststart -an`) for universal browser playback.
Originals remain in the Higgsfield library under the same job IDs.

| File | Job ID | Credits |
|---|---|---|
| `hero.webp` + `og.jpg` (GPT Image 2.5, 21:9, high, 2K) | b57e024b-4696-4e58-9278-318e15b77545 | 2.75 |
| `contracting.mp4` | 26b9f1f9-16c7-440c-9246-d2f0afa6ef7f | 72 |
| `pm.mp4` | bb405154-5e79-4ef4-b219-de69d55fdb77 | 72 |
| `facility.mp4` | cd18b47e-6b5e-427f-9d40-c3487040b77a | 72 |
| `cinema.mp4` | ccc0b2c8-60f7-48d0-88f2-9205cbd1916e | 72 |
| `snagging.mp4` | d7e3b8c0-b92d-4f75-ba49-0be22817a30f | 72 |
| (marketing, attempt 1 — rejected by IP filter, refunded) | 6941fb17-1d27-4440-94d0-54e747ae0725 | 0 |
| `marketing.mp4` (attempt 2, "emblem" reworded to abstract light) | 09802d09-c5d4-4b7f-b131-67297ebe0da3 | 72 |
| `consultancy.mp4` | 85ab3f88-d9fb-4e18-b852-21348ffb190b | 72 |
| `ai.mp4` | b53e3d12-a3da-437f-920f-26b1a5387e61 | 72 |
| `homewatch.mp4` | ac0c2c5b-b90f-4f7c-bbc4-d8e70255504f | 72 |
| `skyline.mp4` | aaa5ef56-c604-457a-86ee-2cfdf453185d | 72 |
| **Total** | | **722.75** |

Balance after batch: 487.25 credits (from 1,210). A re-roll of any single
clip costs 72 credits.

The official logo was fetched from innovagroup.co.ae once the build
environment's network policy allowed it: `public/logo-mark-inverse.png`
(cropped from `logo-inverse.png`) is used in the header, footer and loader;
`public/logo-full-inverse.png` holds the full lock-up.

## Batch 2 — 2026-09-28, film-first rebuild

| File | Job ID | Credits |
|---|---|---|
| `herofilm.mp4` — the living diamond (image-to-video from the key art, 8s) | 881f60b6-a6d3-4608-8c23-46b762e30f22 | 96 |
| `contracting.mp4` — real supertall under construction, dusk (replaces abstract v1) | 62b5ade0-fe6d-4d7e-9a98-e568774c20ee | 72 |
| `marketing.mp4` — rooftop launch event, skyline (replaces abstract v1) | 1c07eb84-59f6-4be5-9ec5-588c2a7e3130 | 72 |
| `consultancy.mp4` — boardroom over the city (replaces abstract v1) | a445e512-447c-481a-b572-20f5dbe1c5dd | 72 |
| **Batch 2 total** | | **312** |

Running total spent: 1,034.75 of 1,210 · reserve 175.25. The replaced
abstract clips remain in the Higgsfield library under their original
job IDs (Batch 1). Site v2 is film-first: the WebGL scene, ambient
audio and orbit were removed; posters/ holds a poster frame per film.
