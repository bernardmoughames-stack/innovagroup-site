# Assumption log — things to confirm with the owner

1. **Reference sites unreachable from the build environment.** igloo.inc and
   kaitechsolutions.net are blocked by the sandbox network policy, so the
   build follows their publicly known patterns (continuous 3D world,
   scroll-driven camera, cinematic transitions, custom cursor, sound toggle)
   from prior knowledge rather than a live inspection. Send screenshots or a
   screen recording if a specific moment should be matched.
2. **Resolved 2026-09-28** (network policy opened): the official logo, all
   service-page URLs, service copy, package names and the six "Why Innova"
   pillars now come from the live site. Still open:
   - The **canonical tag** and absolute **og:image / og:url** in `index.html`
     wait for the final URL of this page.
   - The "Scoped in packages" pillar description and the four "How we work"
     steps are written in the site's voice, not copied from it (the source
     text wasn't on the fetched pages).
   - Home Watch & Property Concierge has no page on the live site yet; its
     copy here is original, marked "coming soon".
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
