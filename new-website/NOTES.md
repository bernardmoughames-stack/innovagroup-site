# Assumption log — things to confirm with the owner

1. **Reference sites unreachable from the build environment.** igloo.inc and
   kaitechsolutions.net are blocked by the sandbox network policy, so the
   build follows their publicly known patterns (continuous 3D world,
   scroll-driven camera, cinematic transitions, custom cursor, sound toggle)
   from prior knowledge rather than a live inspection. Send screenshots or a
   screen recording if a specific moment should be matched.
2. **innovagroup.co.ae is also unreachable** from the sandbox, therefore:
   - `public/logo-mark.svg` is a placeholder drawn from the brand description
     (stacked navy-and-gold diamond). Replace with the official mark.
   - Per-service **"Explore" URLs** default to the homepage. Set the real
     service-page URLs in `src/content/copy.ts` (`SERVICES`), so existing SEO
     URLs are preserved.
   - The **canonical tag** in `index.html` is commented out until the final
     URL of this page is decided.
3. **"Why Innova" six points** — the brief references the existing site's six
   points but does not list them; the six here are written from the brief's
   own language (one accountable partner, licensed multi-disciplinary, no
   finger-pointing, continuity, transparent scope, smarter by design). Swap
   in the official copy if it differs.
4. **Package names per service** (e.g. "Fit-out · Renovation · New build")
   are descriptive placeholders in the same spirit — not published price
   plans. No prices are shown anywhere.
5. **Arabic copy** is a fresh professional translation of the English; have a
   native reviewer confirm tone (especially service names like "سناجينج").
6. **No enquiry form is embedded** — CTAs route to the live contact page and
   WhatsApp, both supplied by the owner. Nothing fakes a submission.
7. **Fonts** load from Google Fonts (Marcellus, Manrope, Noto Kufi Arabic)
   with system fallbacks; the sandbox blocks the fetch, production won't.
   Self-host the WOFF2 files if you prefer zero third-party requests.
8. **Sound** is synthesised in WebAudio (no licensed audio files), starts only
   after the visitor chooses "Enter with sound", and can be muted any time
   from the header.
