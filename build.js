#!/usr/bin/env node
/* ============================================================
   INNOVA GROUP — SITE BUILDER
   ------------------------------------------------------------
   Reads:   content/site.json, content/services.json, src/assets/
   Writes:  everything into dist/ — the folder that gets published.

   dist/ is generated. Never edit it by hand; edit content/ instead.

   Run with:   node build.js

   Layout and markup live in this file. Words and packages live
   in the content/ folder. Colours and fonts live in
   assets/css/theme.css.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const site = require('./content/site.json');
const services = require('./content/services.json');

const C = site.company;

/* ---------------- Icons ---------------- */
const ICONS = {
  shell:     '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5"/>',
  tasks:     '<path d="M4 5h16M4 12h10M4 19h6"/><circle cx="18.5" cy="17.5" r="3.5"/>',
  tools:     '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.5-.5-.5-2.5 2.5-2.5z"/>',
  screen:    '<rect x="2" y="4" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
  magnifier: '<circle cx="10.5" cy="10.5" r="7"/><path d="M20.5 20.5l-5-5M8 10.5l1.8 1.8L13.5 8.5"/>',
  megaphone: '<path d="M3 10v4h4l6 4V6l-6 4H3zM17.5 8.5a5 5 0 010 7M20.5 5.5a9 9 0 010 13"/>',
  bars:      '<path d="M3 20V10M9 20V4M15 20v-7M21 20V7"/>',
  chip:      '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  shield:    '<path d="M12 3l7.5 3.5v5c0 4.4-3.1 8.5-7.5 9.5-4.4-1-7.5-5.1-7.5-9.5v-5L12 3z"/><path d="M9 12l2 2 4-4"/>',
  clock:     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  chart:     '<path d="M4 19V9M10 19V5M16 19v-6M22 19H2"/>',
  spark:     '<path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/><circle cx="12" cy="12" r="3.2"/>',
  building:  '<path d="M3 21V7l9-4 9 4v14"/><path d="M9 21v-6h6v6"/><path d="M3 12h18"/>',
  check:     '<path d="M20 6L9 17l-5-5"/>'
};

const icon = (key, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key] || ''}</svg>`;

const ARROW = '<svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 5h11M8.5 1.5L12 5l-3.5 3.5"/></svg>';
const TICK  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
const MAIL  = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M3 6l9 6.5L21 6"/></svg>';
const PHONE = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16.5v3a2 2 0 01-2.2 2 19.5 19.5 0 01-8.5-3 19.2 19.2 0 01-6-6 19.5 19.5 0 01-3-8.6A2 2 0 013.3 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1L7.4 9.8a16 16 0 006 6l1.1-1.1a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7a2 2 0 011.7 2z"/></svg>';
const PIN   = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-5.7 7-11a7 7 0 10-14 0c0 5.3 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>';

/* ---------------- Shared partials ---------------- */

/* Structured data — tells Google and other engines what the company is and
   what each page covers. Invisible to visitors; improves how the business is
   shown in search results. */
function organisationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: C.name,
    url: C.domain + '/',
    email: C.email,
    telephone: C.phoneLink,
    image: C.domain + '/assets/img/logo.png',
    logo: C.domain + '/assets/img/mark.png',
    description: site.home.metaDescription,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Meydan',
      addressLocality: 'Dubai',
      addressCountry: 'AE'
    },
    areaServed: { '@type': 'Country', name: 'United Arab Emirates' },
    makesOffer: services.map(s => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: stripTags(s.nav),
        description: stripTags(s.cardText),
        url: `${C.domain}/${s.slug}/`
      }
    }))
  };
}

function faqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: stripTags(f.q),
      acceptedAnswer: { '@type': 'Answer', text: stripTags(f.a) }
    }))
  };
}

const schemaTag = obj =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

function head(page) {
  const schemas = [organisationSchema()].concat(page.schema || []);
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.metaTitle}</title>
${schemas.map(schemaTag).join('\n')}
<meta name="description" content="${page.metaDescription}">
<link rel="canonical" href="${C.domain}${page.path}">
<meta property="og:title" content="${page.metaTitle}">
<meta property="og:description" content="${page.metaDescription}">
<meta property="og:type" content="website">
<meta property="og:url" content="${C.domain}${page.path}">
<meta name="theme-color" content="#142240">
<link rel="icon" href="/assets/img/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@200;300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/theme.css">
<link rel="stylesheet" href="/assets/css/site.css">`;
}

const cur = (p, active) => (p === active ? ' aria-current="page"' : '');

function header(active) {
  return `<header class="site-header">
  <div class="container">
    <a class="brand" href="/" aria-label="${C.name} — home">
      <img class="logo-light" src="/assets/img/logo.png" alt="${C.name}" width="240" height="35">
      <img class="logo-inverse" src="/assets/img/logo-inverse.png" alt="${C.name}" width="240" height="35">
    </a>

    <nav class="nav" aria-label="Main">
      <a href="/"${cur('/', active)}>Home</a>
      <div class="has-menu" data-open="false">
        <button type="button" aria-expanded="false">Services
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </button>
        <div class="dropdown">
${services.map(s => `          <a href="/${s.slug}/"${cur('/' + s.slug + '/', active)}>${s.nav}</a>`).join('\n')}
        </div>
      </div>
      <a href="/about/"${cur('/about/', active)}>About</a>
      <a href="/contact/"${cur('/contact/', active)}>Contact</a>
    </nav>

    <button class="icon-btn" type="button" data-theme-toggle aria-label="Switch colour theme">
      <svg class="sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5"/></svg>
      <svg class="moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/></svg>
    </button>

    <a class="btn btn--navy header-cta" href="/contact/">Start a conversation</a>

    <button class="icon-btn burger" type="button" data-drawer-open aria-label="Open menu">
      <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M1 1h16M1 7h16M1 13h16"/></svg>
    </button>
  </div>
</header>

<div class="drawer" data-open="false" aria-label="Menu">
  <button class="icon-btn drawer__close" type="button" data-drawer-close aria-label="Close menu">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2 2l12 12M14 2L2 14"/></svg>
  </button>
  <h4>Menu</h4>
  <a href="/">Home</a>
  <a href="/about/">About</a>
  <a href="/contact/">Contact</a>
  <h4>Services</h4>
${services.map(s => `  <a href="/${s.slug}/">${s.nav}</a>`).join('\n')}
  <a class="btn btn--primary" href="mailto:${C.email}">${C.email}</a>
</div>`;
}

function ctaBand(cta) {
  return `<section class="section">
    <div class="container">
      <div class="cta" data-reveal>
        <div>
          <h2>${cta.heading}</h2>
          <p>${cta.text}</p>
          <div class="contact-lines">
            <a href="mailto:${C.email}">${MAIL} ${C.email}</a>
            <a href="tel:${C.phoneLink}">${PHONE} ${C.phone}</a>
          </div>
        </div>
        <a class="btn btn--primary" href="${cta.button.href}">${cta.button.label}</a>
      </div>
    </div>
  </section>`;
}

function footer() {
  const f = site.footer;
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer__grid">
      <div class="footer__brand">
        <img src="/assets/img/logo-inverse.png" alt="${C.name}" width="240" height="35">
        <p>${C.tagline}</p>
      </div>
      <div>
        <h4>${f.columns.servicesHeading}</h4>
        <ul class="footer__list">
${services.map(s => `          <li><a href="/${s.slug}/">${s.nav}</a></li>`).join('\n')}
        </ul>
      </div>
      <div>
        <h4>${f.columns.contactHeading}</h4>
        <ul class="footer__list">
          <li><a href="mailto:${C.email}">${C.email}</a></li>
          <li><a href="tel:${C.phoneLink}">${C.phone}</a></li>
          <li class="footer__plain">${C.locationLong}</li>
        </ul>
        <h4 style="margin-top:2rem">${f.columns.companyHeading}</h4>
        <ul class="footer__list">
${f.companyLinks.map(l => `          <li><a href="${l.href}">${l.label}</a></li>`).join('\n')}
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <span>&copy; <span data-year>2026</span> ${C.name}. All rights reserved.</span>
      <span>${C.licenceLine}</span>
    </div>
  </div>
</footer>`;
}

function layout(page, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${head(page)}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

${header(page.path)}

<main id="main">
${body}
</main>

${footer()}

<script src="/assets/js/site.js" defer></script>
</body>
</html>
`;
}

/* ---------------- Home page ---------------- */
function buildHome() {
  const h = site.home;

  const cards = services.map((s, i) => `
        <article class="card" data-reveal${i % 3 ? ` data-reveal-delay="${(i % 3) * 60}"` : ''}>
          <span class="card__num">${String(i + 1).padStart(2, '0')}</span>
          <div class="card__icon">${icon(s.icon)}</div>
          <h3>${s.cardTitle}</h3>
          <p>${s.cardText}</p>
          <a class="card__link card__stretch" href="/${s.slug}/">Explore ${ARROW}</a>
        </article>`).join('\n');

  const values = h.why.items.map((v, i) => `
        <div class="value" data-reveal${i % 3 ? ` data-reveal-delay="${(i % 3) * 80}"` : ''}>
          <div class="value__icon">${icon(v.icon, 20)}</div>
          <h3>${v.title}</h3>
          <p>${v.text}</p>
        </div>`).join('\n');

  const steps = h.process.steps.map((s, i) => `
        <div class="step" data-reveal${i ? ` data-reveal-delay="${i * 70}"` : ''}><h3>${s.title}</h3><p>${s.text}</p></div>`).join('\n');

  const body = `
  <section class="hero">
    <div class="container">
      <div class="hero__inner">
        <p class="eyebrow eyebrow--light">${h.hero.eyebrow}</p>
        <h1>${h.hero.heading}</h1>
        <p>${h.hero.intro}</p>
        <div class="btn-row">
          <a class="btn btn--primary" href="${h.hero.primaryCta.href}">${h.hero.primaryCta.label}</a>
          <a class="btn btn--ghost-light" href="${h.hero.secondaryCta.href}">${h.hero.secondaryCta.label}</a>
        </div>
        <dl class="hero__meta">
${h.hero.meta.map(m => `          <div><dt>${m.label}</dt><dd>${m.value}</dd></div>`).join('\n')}
        </dl>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="split">
        <div data-reveal>
          <p class="eyebrow">${h.intro.eyebrow}</p>
          <h2>${h.intro.heading}</h2>
        </div>
        <div data-reveal data-reveal-delay="120">
          <p class="lead">${h.intro.lead}</p>
${h.intro.body.map(p => `          <p>${p}</p>`).join('\n')}
        </div>
      </div>
    </div>
  </section>

  <section class="section section--alt" id="services">
    <div class="container">
      <div class="section-head section-head--center" data-reveal>
        <p class="eyebrow eyebrow--center">${h.servicesSection.eyebrow}</p>
        <h2>${h.servicesSection.heading}</h2>
        <p>${h.servicesSection.sub}</p>
      </div>
      <div class="grid grid--services">${cards}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head" data-reveal>
        <p class="eyebrow">${h.why.eyebrow}</p>
        <h2>${h.why.heading}</h2>
      </div>
      <div class="grid grid--3">${values}
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      <div class="section-head section-head--center" data-reveal>
        <p class="eyebrow eyebrow--center">${h.process.eyebrow}</p>
        <h2>${h.process.heading}</h2>
      </div>
      <div class="steps">${steps}
      </div>
    </div>
  </section>

${ctaBand(h.cta)}`;

  write('index.html', layout({
    path: '/', metaTitle: h.metaTitle, metaDescription: h.metaDescription
  }, body));
}

/* ---------------- Service pages ---------------- */
function buildService(s) {
  const half = Math.ceil(s.scope.items.length / 2);
  const scopeCols = [s.scope.items.slice(0, half), s.scope.items.slice(half)]
    .map(col => `        <ul class="scope">\n${col.map(i => `          <li>${i}</li>`).join('\n')}\n        </ul>`)
    .join('\n');

  const tiers = s.packages.tiers.map((t, i) => `
        <article class="pkg${t.featured ? ' pkg--featured' : ''}" data-reveal${i ? ` data-reveal-delay="${i * 80}"` : ''}>
          ${t.featured ? '<span class="pkg__tag">Most requested</span>' : ''}
          <h3>${t.name}</h3>
          <p class="pkg__for">${t.for}</p>
          <ul>
${t.items.map(f => `            <li>${TICK}<span>${f}</span></li>`).join('\n')}
          </ul>
          <a class="btn ${t.featured ? 'btn--primary' : 'btn--ghost'}" href="/contact/?service=${s.slug}&amp;package=${encodeURIComponent(t.name.replace(/&amp;/g, '&'))}">Request a quote</a>
        </article>`).join('\n');

  const steps = s.steps.map((st, i) => `
        <div class="step" data-reveal${i ? ` data-reveal-delay="${i * 70}"` : ''}><h3>${st.title}</h3><p>${st.text}</p></div>`).join('\n');

  const faqs = s.faqs.map(f => `
        <details>
          <summary>${f.q}</summary>
          <p>${f.a}</p>
        </details>`).join('\n');

  const others = services.filter(o => o.slug !== s.slug).slice(0, 3).map(o => `
        <article class="card" data-reveal>
          <div class="card__icon">${icon(o.icon)}</div>
          <h3>${o.cardTitle}</h3>
          <p>${o.cardText}</p>
          <a class="card__link card__stretch" href="/${o.slug}/">Explore ${ARROW}</a>
        </article>`).join('\n');

  const body = `
  <section class="page-head">
    <div class="container">
      <p class="crumbs"><a href="/">Home</a><span>/</span><a href="/#services">Services</a><span>/</span>${s.nav}</p>
      <p class="eyebrow eyebrow--light">${s.eyebrow}</p>
      <h1>${s.heading}</h1>
      <p>${s.intro}</p>
      <div class="btn-row" style="margin-top:2rem">
        <a class="btn btn--primary" href="#packages">See packages</a>
        <a class="btn btn--ghost-light" href="/contact/?service=${s.slug}">Enquire</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="split">
        <div data-reveal>
          <p class="eyebrow">${s.overview.eyebrow}</p>
          <h2>${s.overview.heading}</h2>
        </div>
        <div data-reveal data-reveal-delay="120">
          <p class="lead">${s.overview.lead}</p>
${s.overview.body.map(p => `          <p>${p}</p>`).join('\n')}
        </div>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      <div class="section-head" data-reveal>
        <p class="eyebrow">${s.scope.eyebrow}</p>
        <h2>${s.scope.heading}</h2>
        <p>${s.scope.lead}</p>
      </div>
      <div class="scope-grid" data-reveal>
${scopeCols}
      </div>
    </div>
  </section>

  <section class="section" id="packages">
    <div class="container">
      <div class="section-head section-head--center" data-reveal>
        <p class="eyebrow eyebrow--center">${s.packages.eyebrow}</p>
        <h2>${s.packages.heading}</h2>
        <p>${s.packages.sub}</p>
      </div>
      <div class="grid grid--packages">${tiers}
      </div>
      <p class="pkg-note" data-reveal>Packages are a starting point, not a limit. If none of them matches what you need, tell us what does and we will scope it.</p>
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      <div class="section-head section-head--center" data-reveal>
        <p class="eyebrow eyebrow--center">How it works</p>
        <h2>From first call to close-out</h2>
      </div>
      <div class="steps">${steps}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container container--slim">
      <div class="section-head" data-reveal>
        <p class="eyebrow">Questions</p>
        <h2>Before you ask</h2>
      </div>
      <div class="faq" data-reveal>${faqs}
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="container">
      <div class="section-head section-head--center" data-reveal>
        <p class="eyebrow eyebrow--center">Also from the group</p>
        <h2>Often engaged alongside this</h2>
      </div>
      <div class="grid grid--services">${others}
      </div>
    </div>
  </section>

${ctaBand({
    heading: 'Talk to us about ' + stripTags(s.nav).toLowerCase(),
    text: 'Tell us the scope, the site and the date it has to happen by. We will come back with questions and a written proposal.',
    button: { label: 'Make an enquiry', href: '/contact/?service=' + s.slug }
  })}`;

  write(`${s.slug}/index.html`, layout({
    path: `/${s.slug}/`, metaTitle: s.metaTitle, metaDescription: s.metaDescription,
    schema: s.faqs && s.faqs.length ? [faqSchema(s.faqs)] : []
  }, body));
}

/* ---------------- About ---------------- */
function buildAbout() {
  const a = site.about;
  const sections = a.sections.map((sec, i) => `
  <section class="section${i % 2 ? ' section--alt' : ''}">
    <div class="container">
      <div class="split">
        <div data-reveal>
          <p class="eyebrow">${sec.eyebrow}</p>
          <h2>${sec.heading}</h2>
        </div>
        <div data-reveal data-reveal-delay="120">
${sec.body.map(p => `          <p>${p}</p>`).join('\n')}
        </div>
      </div>
    </div>
  </section>`).join('\n');

  const values = a.values.items.map((v, i) => `
        <div class="value" data-reveal${i ? ` data-reveal-delay="${i * 80}"` : ''}>
          <div class="value__icon">${icon('check', 20)}</div>
          <h3>${v.title}</h3>
          <p>${v.text}</p>
        </div>`).join('\n');

  const body = `
  <section class="page-head">
    <div class="container">
      <p class="crumbs"><a href="/">Home</a><span>/</span>About</p>
      <p class="eyebrow eyebrow--light">${a.eyebrow}</p>
      <h1>${a.heading}</h1>
      <p>${a.intro}</p>
    </div>
  </section>
${sections}

  <section class="section${a.sections.length % 2 ? ' section--alt' : ''}">
    <div class="container">
      <div class="section-head" data-reveal>
        <p class="eyebrow">${a.values.eyebrow}</p>
        <h2>${a.values.heading}</h2>
      </div>
      <div class="grid grid--3">${values}
      </div>
    </div>
  </section>

${ctaBand({
    heading: 'Work with the group',
    text: 'Start with the discipline you need today. The rest is there when you need it.',
    button: { label: 'Contact us', href: '/contact/' }
  })}`;

  write('about/index.html', layout({
    path: '/about/', metaTitle: a.metaTitle, metaDescription: a.metaDescription
  }, body));
}

/* ---------------- Contact ---------------- */
function buildContact() {
  const c = site.contact;
  const body = `
  <section class="page-head">
    <div class="container">
      <p class="crumbs"><a href="/">Home</a><span>/</span>Contact</p>
      <p class="eyebrow eyebrow--light">${c.eyebrow}</p>
      <h1>${c.heading}</h1>
      <p>${c.intro}</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="contact-layout">

        <div class="contact-panel" data-reveal>
          <h3>Direct</h3>
          <ul class="contact-list">
            <li>${MAIL}<a href="mailto:${C.email}">${C.email}</a></li>
            <li>${PHONE}<a href="tel:${C.phoneLink}">${C.phone}</a></li>
            <li>${PIN}<span>${C.locationLong}</span></li>
          </ul>
          <h3 style="margin-top:2.5rem">Service lines</h3>
          <ul class="contact-services">
${services.map(s => `            <li><a href="/${s.slug}/">${s.nav}</a></li>`).join('\n')}
          </ul>
        </div>

        <form class="contact-form" data-reveal data-reveal-delay="100" novalidate>
          <!-- This form opens the visitor's email client with the message
               pre-filled. To send it through a form service instead, see
               CUSTOMIZE.md, section "Making the contact form send email". -->
          <div class="field">
            <label for="cf-name">Your name</label>
            <input id="cf-name" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="cf-email">Email</label>
              <input id="cf-email" name="email" type="email" autocomplete="email" required>
            </div>
            <div class="field">
              <label for="cf-phone">Phone <span class="opt">(optional)</span></label>
              <input id="cf-phone" name="phone" type="tel" autocomplete="tel">
            </div>
          </div>
          <div class="field">
            <label for="cf-service">Which service?</label>
            <select id="cf-service" name="service">
              <option value="">Not sure yet</option>
${services.map(s => `              <option value="${s.slug}">${stripTags(s.nav)}</option>`).join('\n')}
            </select>
          </div>
          <div class="field">
            <label for="cf-message">What are you planning?</label>
            <textarea id="cf-message" name="message" rows="6" required></textarea>
          </div>
          <button class="btn btn--primary" type="submit">Send enquiry</button>
          <p class="form-note">${c.formNote}</p>
        </form>

      </div>
    </div>
  </section>`;

  write('contact/index.html', layout({
    path: '/contact/', metaTitle: c.metaTitle, metaDescription: c.metaDescription
  }, body));
}

/* ---------------- 404 ---------------- */
function build404() {
  const body = `
  <section class="page-head">
    <div class="container">
      <p class="eyebrow eyebrow--light">Error 404</p>
      <h1>That page isn't here.</h1>
      <p>The link may be out of date, or the address slightly off. Everything we do is listed below.</p>
      <div class="btn-row" style="margin-top:2rem">
        <a class="btn btn--primary" href="/">Back to home</a>
        <a class="btn btn--ghost-light" href="/contact/">Contact us</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="grid grid--services">
${services.map(s => `        <article class="card">
          <div class="card__icon">${icon(s.icon)}</div>
          <h3>${s.cardTitle}</h3>
          <p>${s.cardText}</p>
          <a class="card__link card__stretch" href="/${s.slug}/">Explore ${ARROW}</a>
        </article>`).join('\n')}
      </div>
    </div>
  </section>`;

  write('404.html', layout({
    path: '/404.html', metaTitle: 'Page not found | ' + C.name,
    metaDescription: 'The page you were looking for could not be found.'
  }, body));
}

/* ---------------- sitemap + robots ---------------- */
function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = ['/', '/about/', '/contact/', ...services.map(s => `/${s.slug}/`)];
  write('sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${C.domain}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    `\n</urlset>\n`);
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${C.domain}/sitemap.xml\n`);
  // Tells GitHub Pages which domain this site answers on.
  write('CNAME', C.domain.replace(/^https?:\/\//, '').replace(/\/$/, '') + '\n');
}

/* ---------------- style previews (for Pinegrow) ----------------
   Two sample pages written into src/ with RELATIVE asset paths, so a visual
   editor opening them edits src/assets/css/*.css — the real source files —
   rather than the throwaway copies inside dist/. */
function buildStylePreviews() {
  const banner = '<!-- GENERATED for visual styling only. Edits to this file are\n' +
                 '     overwritten on every build. Style changes you make here land in\n' +
                 '     src/assets/css/ and DO survive. See PINEGROW.md. -->\n';
  const relative = html => banner + html.replace(/(href|src)="\/assets\//g, '$1="assets/');
  const pages = [
    ['style-preview-home.html', 'index.html'],
    ['style-preview-service.html', path.join(services[0].slug, 'index.html')]
  ];
  for (const [dest, from] of pages) {
    fs.writeFileSync(
      path.join(__dirname, 'src', dest),
      relative(fs.readFileSync(path.join(OUT, from), 'utf8'))
    );
  }
  console.log('\nStyling previews (open these in Pinegrow):');
  pages.forEach(([d]) => console.log('  src/' + d));
}

/* ---------------- helpers ---------------- */
function stripTags(s) { return String(s).replace(/&amp;/g, '&'); }

const OUT = path.join(__dirname, 'dist');

const written = [];
function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  written.push(rel);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

function copyAssets() {
  // Clear the previous build where the filesystem allows it. Some sandboxed or
  // synced folders disallow deletion; overwriting in place works there too, so
  // a failure to clear is not fatal.
  try {
    fs.rmSync(OUT, { recursive: true, force: true });
  } catch (e) {
    console.warn('Note: could not clear dist/ (' + e.code + ') — overwriting in place.');
  }
  copyDir(path.join(__dirname, 'src', 'assets'), path.join(OUT, 'assets'));
}

/* ---------------- run ---------------- */
copyAssets();
buildHome();
services.forEach(buildService);
buildAbout();
buildContact();
build404();
buildSitemap();
buildStylePreviews();

console.log('Built ' + written.length + ' pages into dist/');
written.forEach(f => console.log('  dist/' + f));
