// Generates the nine service pages (<slug>.html) from the structured
// content extracted from the live innovagroup.co.ae service pages
// (src/content/services-full.en.json) plus the Arabic translations
// (src/content/ar/<slug>.json). Each page is full static HTML — the same
// chrome as index.html, a film hero, and the COMPLETE service content in
// both languages (dual .l10n blocks toggled by the language switch).
//
// Run: node tools/build-pages.mjs   (also runs as part of `npm run build`)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const EN = JSON.parse(readFileSync(join(root, 'src/content/services-full.en.json'), 'utf8'));

const ORDER = [
  'contracting', 'project-management', 'facility-management', 'cinema',
  'snagging', 'marketing', 'consultancy', 'ai', 'home-watch',
];
// slug -> i18n id used by copy.ts keys (svc.<id>.name etc.)
const I18N = {
  contracting: 'contracting', 'project-management': 'pm', 'facility-management': 'facility',
  cinema: 'cinema', snagging: 'snagging', marketing: 'marketing',
  consultancy: 'consultancy', ai: 'ai', 'home-watch': 'homewatch',
};
const NAME_EN = {
  contracting: 'Turnkey Contracting', 'project-management': 'Project Management',
  'facility-management': 'Maintenance & Facility Management', cinema: 'Cinema & Home Theatre',
  snagging: 'Snagging', marketing: 'Marketing, PR & Communication',
  consultancy: 'Management Consultancies', ai: 'AI Research & Consultancy',
  'home-watch': 'Home Watch & Property Concierge',
};

// Home Watch runs on its own dedicated line; every other page uses the
// main company number.
const PHONES = {
  default: { tel: '+971505097758', wa: '971505097758', pretty: '+971 50 509 7758',
             call: ['Call +971 50 509 7758', 'اتصل بنا 7758 509 50 971+'] },
  'home-watch': { tel: '+971581851231', wa: '971581851231', pretty: '+971 58 185 1231',
                  call: ['Call +971 58 185 1231', 'اتصل بنا 1231 185 58 971+'] },
};
const phoneFor = (slug) => PHONES[slug] ?? PHONES.default;

const esc = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

// Fixed bilingual labels for the static sections
const L = {
  home: ['Home', 'الرئيسية'],
  services: ['Services', 'خدماتنا'],
  service: ['Service', 'الخدمة'],
  soon: ['Coming soon', 'قريباً'],
  offer: ['The offer', 'العرض'],
  packages: ['Packages', 'الباقات'],
  homecare: ['Home Care', 'العناية المنزلية'],
  how: ['How it works', 'كيف نعمل'],
  questions: ['Questions', 'الأسئلة'],
  related: ['Also from the group', 'من المجموعة أيضاً'],
  relatedT: ['Often engaged alongside this', 'كثيراً ما تُطلب مع هذه الخدمة'],
  seePackages: ['See packages', 'اطّلع على الباقات'],
  enquire: ['Enquire', 'استفسر'],
  quote: ['Request a quote', 'اطلب عرض سعر'],
  register: ['Register interest', 'سجّل اهتمامك'],
  whatsapp: ['WhatsApp us', 'راسلنا على واتساب'],
  call: ['Call +971 50 509 7758', 'اتصل بنا 7758 509 50 971+'],
  email: ['Email us', 'راسلنا بالبريد'],
  addr: ['Meydan, Dubai, United Arab Emirates', 'ميدان، دبي، الإمارات العربية المتحدة'],
};

const langAttrs = (lang) => lang === 'ar' ? 'class="l10n" lang="ar" dir="rtl"' : 'class="l10n" lang="en" dir="ltr"';
const pick = (pair, i) => pair[i];

const FORM = (slug) => `
      <form class="enquiry-form" novalidate>
        <input type="hidden" name="access_key" value="9d13a26f-c140-4c17-a421-2141ea9f6343" />
        <input type="hidden" name="subject" value="Website enquiry" />
        <input type="hidden" name="from_name" value="Innova Group website" />
        <input type="hidden" name="language" value="en"${slug === 'en' ? ' selected' : ''} />
        <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <p class="form-title" data-i18n="form.title">Or send it from right here</p>
        <div class="field">
          <label for="cf-name" data-i18n="form.name">Your name</label>
          <input id="cf-name" name="name" type="text" autocomplete="name" required />
        </div>
        <div class="field-row">
          <div class="field">
            <label for="cf-email" data-i18n="form.email">Email (optional)</label>
            <input id="cf-email" name="email" type="email" autocomplete="email" dir="ltr" />
          </div>
          <div class="field">
            <label for="cf-phone" data-i18n="form.phone">Phone</label>
            <input id="cf-phone" name="phone" type="tel" autocomplete="tel" dir="ltr" required />
          </div>
        </div>
        <div class="field">
          <label for="cf-service" data-i18n="form.service">Which service?</label>
          <select id="cf-service" name="service">
          <option value="" data-i18n="form.notSure">Not sure yet</option>
          <option value="contracting"${slug === 'contracting' ? ' selected' : ''} data-i18n="svc.contracting.name">contracting</option>
          <option value="project-management"${slug === 'project-management' ? ' selected' : ''} data-i18n="svc.pm.name">project-management</option>
          <option value="facility-management"${slug === 'facility-management' ? ' selected' : ''} data-i18n="svc.facility.name">facility-management</option>
          <option value="cinema"${slug === 'cinema' ? ' selected' : ''} data-i18n="svc.cinema.name">cinema</option>
          <option value="snagging"${slug === 'snagging' ? ' selected' : ''} data-i18n="svc.snagging.name">snagging</option>
          <option value="marketing"${slug === 'marketing' ? ' selected' : ''} data-i18n="svc.marketing.name">marketing</option>
          <option value="consultancy"${slug === 'consultancy' ? ' selected' : ''} data-i18n="svc.consultancy.name">consultancy</option>
          <option value="ai"${slug === 'ai' ? ' selected' : ''} data-i18n="svc.ai.name">ai</option>
          <option value="home-watch"${slug === 'home-watch' ? ' selected' : ''} data-i18n="svc.homewatch.name">home-watch</option>
          </select>
        </div>
        <div class="field">
          <label for="cf-message" data-i18n="form.message">What are you planning?</label>
          <textarea id="cf-message" name="message" rows="5" required></textarea>
        </div>
        <button class="btn btn-gold" type="submit" data-i18n="form.send">Send enquiry</button>
        <p class="form-status" role="alert"></p>
        <p class="form-note" data-i18n="form.note">Prefer email? Write to us directly at info@innovagroup.co.ae — we reply to every enquiry.</p>
      </form>`;

function heroBlock(d, lang, i, soon) {
  const seeP = pick(L.seePackages, i); const enq = pick(soon ? L.register : L.enquire, i);
  return `      <div ${langAttrs(lang)}>
        <p class="crumbs"><a href="index.html">${pick(L.home, i)}</a><span>/</span><a href="index.html#services">${pick(L.services, i)}</a><span>/</span>${esc(d.crumb)}</p>
        <h1 class="display">${esc(d.h1)}</h1>
        <p class="lede">${esc(d.lede)}</p>
        <div class="cta-row">
          <a class="btn btn-gold" href="#packages">${seeP}</a>
          <a class="btn btn-ghost" href="#talk">${enq}</a>
        </div>
      </div>`;
}

function offerBlock(d, lang, i) {
  const paras = d.offer.paras.map((p, n) => `          <p${n === 0 ? ' class="lead"' : ''}>${esc(p)}</p>`).join('\n');
  return `      <div ${langAttrs(lang)}>
        <div class="svc-split">
          <div data-reveal>
            <p class="eyebrow">${pick(L.offer, i)}</p>
            <h2>${esc(d.offer.title)}</h2>
          </div>
          <div data-reveal>
${paras}
          </div>
        </div>
      </div>`;
}

function scopeBlock(d, lang, i) {
  const items = d.scope.items.map((it) => `          <li>${esc(it)}</li>`).join('\n');
  return `      <div ${langAttrs(lang)}>
        <div class="svc-head" data-reveal>
          <p class="eyebrow">${esc(d.scope.eyebrow)}</p>
          <h2>${esc(d.scope.title)}</h2>
          <p>${esc(d.scope.intro)}</p>
        </div>
        <ul class="scope-cols" data-reveal>
${items}
        </ul>
      </div>`;
}

function packagesBlock(d, lang, i, slug, soon) {
  const cards = d.packages.list.map((p) => {
    const feats = p.features.map((f) => `              <li>${esc(f)}</li>`).join('\n');
    const cta = pick(soon ? L.register : L.quote, i);
    const btn = p.tag ? 'btn-gold' : 'btn-line';
    return `          <article class="pkg-card${p.tag ? ' featured' : ''}" data-reveal>
${p.tag ? `            <span class="pkg-tag">${esc(p.tag)}</span>\n` : ''}            <h3>${esc(p.name)}</h3>
            <p class="pkg-for">${esc(p.for)}</p>
            <ul class="pkg-feats">
${feats}
            </ul>
            <a class="btn ${btn}" href="#talk">${cta}</a>
          </article>`;
  }).join('\n');
  return `      <div ${langAttrs(lang)}>
        <div class="svc-head center" data-reveal>
          <p class="eyebrow">${pick(L.packages, i)}</p>
          <h2>${esc(d.packages.title)}</h2>
          <p>${esc(d.packages.intro)}</p>
        </div>
        <div class="pkg-grid">
${cards}
        </div>
        <p class="pkg-note" data-reveal>${esc(d.packages.note)}</p>
      </div>`;
}

function homecareBlock(d, lang, i) {
  const cards = d.homecare.cards.map((c) =>
    `          <li data-reveal><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p></li>`).join('\n');
  return `      <div ${langAttrs(lang)}>
        <div class="svc-head" data-reveal>
          <p class="eyebrow">${pick(L.homecare, i)}</p>
          <h2>${esc(d.homecare.title)}</h2>
          <p>${esc(d.homecare.lede)}</p>
        </div>
        <ul class="hc-grid">
${cards}
        </ul>
        <p class="hc-outro" data-reveal>${esc(d.homecare.outro)} <a class="text-link" href="#talk">${esc(d.homecare.cta)}</a></p>
      </div>`;
}

function howBlock(d, lang, i) {
  const steps = d.how.steps.map((s, n) =>
    `          <li data-reveal><span class="step-n">${String(n + 1).padStart(2, '0')}</span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`).join('\n');
  return `      <div ${langAttrs(lang)}>
        <div class="svc-head center" data-reveal>
          <p class="eyebrow">${pick(L.how, i)}</p>
          <h2>${esc(d.how.title)}</h2>
        </div>
        <ol class="steps-grid">
${steps}
        </ol>
      </div>`;
}

function faqBlock(d, lang, i) {
  const qs = d.faq.map((f) =>
    `        <details data-reveal><summary>${esc(f.q)}<span class="faq-mark" aria-hidden="true"></span></summary><p>${esc(f.a)}</p></details>`).join('\n');
  return `      <div ${langAttrs(lang)}>
        <div class="svc-head" data-reveal>
          <p class="eyebrow">${pick(L.questions, i)}</p>
          <h2>${d.faqTitle ? esc(d.faqTitle) : (lang === 'ar' ? 'قبل أن تسأل' : 'Before you ask')}</h2>
        </div>
${qs}
      </div>`;
}

function relatedHead(lang, i) {
  return `      <div ${langAttrs(lang)}>
        <div class="svc-head" data-reveal>
          <p class="eyebrow">${pick(L.related, i)}</p>
          <h2>${pick(L.relatedT, i)}</h2>
        </div>
      </div>`;
}

// The cards swap their text through data-i18n, so they are emitted ONCE —
// one copy per language here would show both grids at the same time.
function relatedGrid(slug) {
  const others = ORDER.filter((s) => s !== slug && s !== 'home-watch').slice(0, 3);
  const cards = others.map((s) => `          <a class="rel-card" href="${s}.html" data-reveal>
            <h3 data-i18n="svc.${I18N[s]}.name">${esc(NAME_EN[s])}</h3>
            <p data-i18n="svc.${I18N[s]}.desc"></p>
            <span class="rel-go" data-i18n="ui.explore">Full service page</span>
          </a>`).join('\n');
  return `      <div class="rel-grid">
${cards}
      </div>`;
}

function talkBlock(d, lang, i, ph) {
  return `      <div ${langAttrs(lang)}>
        <h2 class="display-lg">${esc(d.talk.title)}</h2>
        <p class="lede dim">${esc(d.talk.p)}</p>
        <div class="cta-row center">
          <a class="btn btn-gold" href="mailto:info@innovagroup.co.ae">${pick(L.email, i)}</a>
          <a class="btn btn-ghost" href="https://wa.me/${ph.wa}" rel="noopener">${pick(L.whatsapp, i)}</a>
          <a class="btn btn-ghost" href="tel:${ph.tel}">${pick(ph.call, i)}</a>
        </div>
        <address class="contact-lines">
          <span>${pick(L.addr, i)}</span>
          <a href="mailto:info@innovagroup.co.ae">info@innovagroup.co.ae</a>
          <a href="tel:${ph.tel}" dir="ltr">${ph.pretty}</a>
        </address>
      </div>`;
}

function dual(fn, ...args) {
  return `${fn('en', 0, ...args)}\n${fn('ar', 1, ...args)}`;
}

function page(slug) {
  const en = EN[slug];
  const ar = JSON.parse(readFileSync(join(root, `src/content/ar/${slug}.json`), 'utf8'));
  const soon = Boolean(en.soon);
  const film = en.film;
  const name = NAME_EN[slug];

  const dropdown = ORDER.map((s) =>
    `          <a href="${s}.html"${s === slug ? ' aria-current="page"' : ''} data-i18n="svc.${I18N[s]}.name">${esc(NAME_EN[s])}</a>`).join('\n');

  const dd = (fn, ...args) => `${fn(en, 'en', 0, ...args)}\n${fn(ar, 'ar', 1, ...args)}`;

  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(name)} — Innova Group LLC | Meydan, Dubai</title>
  <meta name="description" content="${esc(en.lede)}" />
  <meta name="theme-color" content="#070d1c" />
  <meta name="google-site-verification" content="JLOmlqU0SaIaebH7DH5JGgVPuXdMjjIgGqIN8e8WMPA" />
  <link rel="canonical" href="https://innovagroup.co.ae/${slug}/" />
  <link rel="alternate" hreflang="en" href="https://innovagroup.co.ae/${slug}/" />
  <link rel="alternate" hreflang="ar" href="https://innovagroup.co.ae/${slug}/?lang=ar" />
  <link rel="alternate" hreflang="x-default" href="https://innovagroup.co.ae/${slug}/" />
  <link rel="preload" as="image" href="./assets/media/posters/${film}.webp" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://innovagroup.co.ae/${slug}/" />
  <meta property="og:title" content="${esc(name)} — Innova Group LLC" />
  <meta property="og:description" content="${esc(en.lede)}" />
  <meta property="og:image" content="https://innovagroup.co.ae/assets/media/og.jpg" />
  <meta property="og:locale" content="en_AE" />
  <meta property="og:locale:alternate" content="ar_AE" />
  <link rel="icon" type="image/png" href="./favicon.png" />
  <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Manrope:wght@300;400;600;700&family=Noto+Kufi+Arabic:wght@300;400;600;700&display=swap" rel="stylesheet" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "${esc(name)}",
    "serviceType": "${esc(name)}",
    "description": "${esc(en.lede)}",
    "url": "https://innovagroup.co.ae/${slug}/",
    "areaServed": { "@type": "City", "name": "Dubai" },
    "provider": {
      "@type": "Organization",
      "name": "Innova Group LLC",
      "url": "https://innovagroup.co.ae/",
      "telephone": "+971505097758",
      "email": "info@innovagroup.co.ae"
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://innovagroup.co.ae/" },
      { "@type": "ListItem", "position": 2, "name": "${esc(name)}", "item": "https://innovagroup.co.ae/${slug}/" }
    ]
  }
  </script>
</head>
<body class="preload svc-page">
  <a class="skip-link" href="#main" data-i18n="ui.skip">Skip to content</a>

  <header class="site-header" id="site-header">
    <a class="brand" href="index.html" data-i18n-aria="aria.home" aria-label="Innova Group — home">
      <img class="brand-mark" src="./logo-mark-inverse.png" width="34" height="34" alt="Innova Group diamond mark" />
      <span class="brand-name">INNOVA <b>GROUP</b></span>
    </a>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <a href="index.html" data-i18n="nav.home">Home</a>
      <div class="nav-item">
        <button type="button" class="nav-drop-btn" aria-expanded="false" aria-controls="services-menu">
          <span data-i18n="nav.services">Services</span><span class="drop-caret" aria-hidden="true">▾</span>
        </button>
        <div class="nav-drop" id="services-menu">
${dropdown}
        </div>
      </div>
      <a href="index.html#why" data-i18n="nav.why">Why Innova</a>
      <a href="index.html#process" data-i18n="nav.process">How we work</a>
      <a class="nav-cta" href="#talk" data-i18n="nav.enquire">Enquire</a>
    </nav>
    <div class="header-tools">
      <button id="theme-toggle" class="icon-btn" type="button" data-i18n-aria="ui.theme" aria-label="Switch between day and night mode">
        <svg class="ic-sun" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>
        <svg class="ic-moon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>
      </button>
      <div class="lang-switch" role="group" aria-label="Language">
        <button type="button" data-lang="en" aria-pressed="true" lang="en">EN</button>
        <button type="button" data-lang="ar" aria-pressed="false" lang="ar">ع</button>
      </div>
      <button id="menu-toggle" class="icon-btn menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">
        <span class="menu-lines" aria-hidden="true"><i></i><i></i></span>
        <span class="visually-hidden" data-i18n="ui.menu">Menu</span>
      </button>
    </div>
  </header>

  <main id="main">

    <section class="chapter svc-hero hero-${film}" id="top">
      <video class="film" muted playsinline autoplay
             poster="./assets/media/posters/${film}.webp" data-film="${film}" aria-hidden="true"></video>
      <div class="scrim" aria-hidden="true"></div>
      <div class="chapter-copy">
${dd((d, lang, i) => heroBlock(d, lang, i, soon))}
      </div>
    </section>

    <section class="svc-section" id="offer">
${dd((d, lang, i) => offerBlock(d, lang, i))}
    </section>

    <section class="svc-section alt" id="scope">
${dd((d, lang, i) => scopeBlock(d, lang, i))}
    </section>

    <section class="svc-section" id="packages">
${dd((d, lang, i) => packagesBlock(d, lang, i, slug, soon))}
    </section>
${en.homecare ? `
    <section class="svc-section alt" id="homecare">
${dd((d, lang, i) => homecareBlock(d, lang, i))}
    </section>
` : ''}
    <section class="svc-section${en.homecare ? '' : ' alt'}" id="how">
${dd((d, lang, i) => howBlock(d, lang, i))}
    </section>

    <section class="svc-section" id="faq">
${dd((d, lang, i) => faqBlock(d, lang, i))}
    </section>

    <section class="svc-section alt" id="related">
${dual((lang, i) => relatedHead(lang, i))}
${relatedGrid(slug)}
    </section>

    <section class="chapter chapter-cta svc-talk" id="talk">
      <video class="film" muted playsinline preload="none"
             poster="./assets/media/posters/skyline.webp" data-film="skyline" aria-hidden="true"></video>
      <div class="scrim scrim-heavy" aria-hidden="true"></div>
      <div class="chapter-copy center">
${dd((d, lang, i) => talkBlock(d, lang, i, phoneFor(slug)))}
${FORM(slug)}
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="foot-brand">
      <img src="./logo-mark-inverse.png" width="26" height="26" alt="" aria-hidden="true" />
      <span>INNOVA <b>GROUP</b> LLC</span>
    </div>
    <p class="foot-tag" data-i18n="footer.tag">Build. Manage. Innovate.</p>
    <nav class="foot-social" aria-label="Social media">
      <a href="https://www.instagram.com/innovagroupuae" rel="noopener">Instagram</a>
      <a href="https://www.linkedin.com/company/innova-group-llc/" rel="noopener">LinkedIn</a>
    </nav>
    <p class="foot-legal">© <span id="year">2026</span> Innova Group LLC · Meydan, Dubai</p>
  </footer>

  <nav class="sticky-bar" aria-label="Quick contact">
    <a href="tel:${phoneFor(slug).tel}" data-i18n="sticky.call">Call</a>
    <a href="https://wa.me/${phoneFor(slug).wa}" rel="noopener">WhatsApp</a>
    <a class="is-gold" href="#talk" data-i18n="sticky.enquire">Enquire</a>
  </nav>

  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`;
}

for (const slug of ORDER) {
  writeFileSync(join(root, `${slug}.html`), page(slug));
  console.log(`wrote ${slug}.html`);
}
