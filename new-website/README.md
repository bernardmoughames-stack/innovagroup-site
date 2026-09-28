# The Innova Diamond — innovagroup.co.ae cinematic experience

A single-page cinematic website for **Innova Group LLC** (Meydan, Dubai).
The navy-and-gold diamond from the brand mark becomes a living 3D object:
it assembles from gold particles, splits open along its facets ("Most projects
fail in the gaps"), is ringed by nine service portals you can spin and dive
through, and finally takes its place above the Dubai skyline at night.

Built with **Vite + TypeScript + Three.js + GSAP ScrollTrigger** — no React,
by design: the page is one continuous 3D scene with DOM content over it, and a
framework re-render layer would add weight without adding structure. All copy
is real, crawlable HTML; the WebGL canvas sits behind it.

## Commands

```bash
npm install        # once
npm run dev        # local dev server (http://localhost:5173)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build (http://localhost:4173)
node tools/qa.mjs  # headless-browser QA pass (needs `npm run preview` running)
```

Deploy: any static host (Vercel: framework preset "Vite", output `dist/`).
No environment variables, no server code, no credentials anywhere.

## Where to edit things

| What | Where |
|---|---|
| All copy (EN + AR) | `src/content/copy.ts` **and** the static English in `index.html` (keep both in sync — the HTML is what crawlers and no-JS visitors read) |
| Service list, "Explore" URLs, coming-soon flags | `SERVICES` in `src/content/copy.ts` |
| Contact links (enquiry / WhatsApp / phone) | `index.html` + constants at the top of `src/content/copy.ts` |
| Colors, type scale, spacing | CSS tokens at the top of `src/styles/main.css` |
| Logo | `public/logo-mark.svg` — **placeholder**; drop the official file over it |
| Diamond shape & material | `src/app/diamond.ts` |
| Scroll choreography (camera keyframes per section, effect windows) | `STATES` + `frame()` in `src/app/scrollScenes.ts` |
| The nine service worlds | `src/app/worlds.ts` (one factory per service) |
| Dive/return transition & world panel | `src/app/worldManager.ts` |
| Loader / particles / portal ring | `src/app/loader.ts`, `particles.ts`, `orbit.ts` |
| Ambient sound & UI ticks (synthesised, no files) | `src/app/audio.ts` |
| Language switching / RTL | `src/app/i18n.ts` (dictionaries in `copy.ts`) |

## Modes

- **Full** — WebGL2 experience with loader, particle assembly, scroll-driven
  camera, portals, worlds. Forced with `?full=1`.
- **Lite** — static, normal document flow, no canvas, all content and CTAs.
  Chosen automatically for `prefers-reduced-motion`, Save-Data, no WebGL2, or
  very low-memory devices. Forced with `?lite=1`.
- **Arabic** — the ع toggle (or `?lang=ar`) switches all copy and flips the
  document to RTL. Preference is remembered in `localStorage`.

## Structure

```
index.html            semantic content: hero, gaps, services (9 cards), why,
                      process, contact, footer, sticky mobile bar, JSON-LD
src/main.ts           boot: capability detection → full or lite
src/app/…             the experience modules (see table above)
src/content/copy.ts   EN/AR dictionaries + service registry
public/               logo placeholder, favicon
tools/qa.mjs          Playwright QA: screenshots + console/error sweep at
                      desktop/mobile/tablet widths, EN/AR, full/lite
ASSETS.md             generated-asset manifest & Higgsfield generation records
NOTES.md              assumption log (things to confirm with the client)
```

## Integrations: real vs. placeholder

- **Real:** enquiry button → `https://innovagroup.co.ae/contact/`, WhatsApp
  (`wa.me/971505097758`), `tel:` link, `mailto:`, Instagram, LinkedIn. These
  are the only outbound destinations, all supplied by the owner.
- **No form is embedded** — the CTA intentionally routes to the existing
  contact page, so no fake submit can occur.
- **Placeholder:** the logo SVG, per-service "Explore" URLs (currently the
  homepage — set the real service-page URLs in `src/content/copy.ts`), and the
  "Why Innova" six points + package names (paraphrased from the brief; see
  NOTES.md).
- **Visuals are 100% procedural** right now (no downloaded media). Approved
  Higgsfield footage can be layered in later — the plan and records live in
  ASSETS.md; place approved files under `public/assets/media/`.
