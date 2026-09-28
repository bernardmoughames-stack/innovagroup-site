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

## Generation records

_None yet. For every approved job, record here: date, tool, model, prompt,
settings, job/generation ID, credits debited, output URL, and the committed
file path._
