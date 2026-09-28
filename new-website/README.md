# The Innova Film — innovagroup.co.ae, rebuilt film-first

The replacement website for **Innova Group LLC** (Meydan, Dubai). Every
screen is a full-bleed generated film (Higgsfield / Seedance 2.5 — real
buildings under construction, real rooms, a living diamond) with the copy
set over it. No WebGL, no audio, no runtime dependencies: Vite + TypeScript,
~14 KB of gzipped JS.

## Pages

- `index.html` — the film journey: hero, manifesto, nine service chapters,
  why, process, contact finale.
- One full page per service, each with its own film hero and the **complete**
  content of the corresponding live-site page (offer, full scope list,
  packages with every feature, Home Care on facility, how-it-works, FAQs) in
  **English and Arabic**:
  `contracting.html`, `project-management.html`, `facility-management.html`,
  `cinema.html`, `snagging.html`, `marketing.html`, `consultancy.html`,
  `ai.html`, `home-watch.html` (coming-soon service, original copy).

Service pages are **generated** — don't edit them by hand:

- English content: `src/content/services-full.en.json`
  (extracted from the live site, plus the authored Home Watch entry)
- Arabic content: `src/content/ar/<slug>.json`
- Template/generator: `tools/build-pages.mjs` (`npm run pages`)

Page-level copy is duplicated per language in `.l10n` blocks; the language
switch flips `html[dir]` and CSS shows the matching block. Shared chrome
(nav, footer, sticky bar) still uses the `data-i18n` dictionary in
`src/content/copy.ts`.

## Commands

```bash
npm install          # once
npm run dev          # local dev server (http://localhost:5173)
npm run pages        # regenerate the nine service pages from the JSON
npm run build        # pages + typecheck + production build into dist/
npm run preview      # serve the production build (http://localhost:4173)
node tools/sweep.mjs # headless QA: every page, AR/RTL, themes, mobile, lite,
                     # click-fuzz (needs `npm run preview` running)
```

**Production deploy:** pushing to `main` runs `.github/workflows/deploy.yml`,
which builds this folder (`vite build --base=/` + `tools/prepare-deploy.mjs`)
and publishes to GitHub Pages at **https://innovagroup.co.ae** — with
directory-style service URLs, `/ar/...` + `/contact/` + `/about/` redirects,
robots.txt, sitemap.xml, llms.txt and a 404 page. No env vars, no server code.

**URL parity:** handled by `tools/prepare-deploy.mjs` — every URL the old
site served keeps working (`/<service>/` real pages, `/ar/…`, `/contact/`,
`/about/` redirects). Canonical/og tags point at innovagroup.co.ae.

## Where to edit things

| What | Where |
|---|---|
| Service page content (EN/AR) | `src/content/services-full.en.json`, `src/content/ar/*.json`, then `npm run pages` |
| Homepage + chrome copy (EN/AR) | `src/content/copy.ts` (+ static English in `index.html`) |
| Films & posters | `public/assets/media/` (`ASSETS.md` is the generation ledger) |
| Film behaviour (lazy load, play/pause) | `src/app/chapters.ts` |
| Header, theme, language, menus | `src/app/ui.ts` |
| All styling & the day/night palettes | `src/styles/main.css` |
