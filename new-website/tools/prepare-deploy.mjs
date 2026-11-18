// Turns a `vite build --base=/` output into the production layout for
// innovagroup.co.ae on GitHub Pages, preserving every URL the old site
// served:
//   /<service>/            real page (directory copy of <service>.html)
//   /contact/  /about/     redirects into the one-page sections
//   /ar/<page>/            the Arabic version of every page (step 2b)
//   /ar/contact/ /ar/about/ redirects into the Arabic one-page sections
// plus robots.txt, sitemap.xml, llms.txt, 404.html and .nojekyll.
//
// Run AFTER: node tools/build-pages.mjs && vite build --base=/
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const DOMAIN = 'https://innovagroup.co.ae';

const SERVICES = ['contracting', 'project-management', 'facility-management', 'cinema',
  'snagging', 'marketing', 'consultancy', 'ai', 'home-watch'];

// Guides: source file (without .html) -> public path
const GUIDES = [
  ['guide-snagging-checklist-dubai', 'guides/snagging-checklist-dubai'],
  ['guide-home-cinema-cost-dubai', 'guides/home-cinema-cost-dubai'],
];
// Every standalone page (guides plus the privacy policy): source -> path
const DOCS = [...GUIDES, ['privacy', 'privacy']];

// ---- 1) root-absolute internal references on every page ----
const pages = readdirSync(dist).filter((f) => f.endsWith('.html'));
for (const f of pages) {
  let html = readFileSync(join(dist, f), 'utf8');
  html = html
    .replaceAll('href="./', 'href="/')
    .replaceAll('src="./', 'src="/')
    .replaceAll('poster="./', 'poster="/')
    .replaceAll('href="index.html#', 'href="/#')
    .replaceAll('href="index.html"', 'href="/"');
  for (const s of SERVICES) {
    html = html.replaceAll(`href="${s}.html"`, `href="/${s}/"`);
    html = html.replaceAll(`href="${s}.html#`, `href="/${s}/#`);
  }
  for (const [src, path] of DOCS) html = html.replaceAll(`href="${src}.html"`, `href="/${path}/"`);
  writeFileSync(join(dist, f), html);
}

// ---- 2) directory-style service pages (the URLs the old site ranks on) ----
for (const s of SERVICES) {
  const src = join(dist, `${s}.html`);
  mkdirSync(join(dist, s), { recursive: true });
  writeFileSync(join(dist, s, 'index.html'), readFileSync(src));
  rmSync(src);
}
for (const [src, path] of DOCS) {
  mkdirSync(join(dist, path), { recursive: true });
  writeFileSync(join(dist, path, 'index.html'), readFileSync(join(dist, `${src}.html`)));
  rmSync(join(dist, `${src}.html`));
}

// ---- 2b) one language per page: English at /<page>/, Arabic at /ar/<page>/ ----
// The built pages hold both languages (.l10n blocks plus the copy.ts
// dictionary, switched in place by the browser). Search engines need one
// language per URL, so each page is written twice: the English version
// keeps only English, and the Arabic version gets the Arabic blocks, the
// Arabic dictionary baked into its HTML, Arabic head tags and structured
// data, and links that stay inside /ar/.
const { MESSAGES } = await import('data:text/javascript;base64,' + Buffer.from(
  ts.transpileModule(readFileSync(join(root, 'src/content/copy.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText).toString('base64'));
const AR_META = JSON.parse(readFileSync(join(root, 'src/content/ar/meta.json'), 'utf8'));
const AR_SVC = Object.fromEntries(SERVICES.map((s) =>
  [s, JSON.parse(readFileSync(join(root, `src/content/ar/${s}.json`), 'utf8'))]));
const AR_BRAND = 'إنوفا جروب';

const escHtml = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const textOf = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  .replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');

/** Index just past the end tag that closes the element whose start tag ends at `from`. */
function closeOf(html, name, from) {
  const re = new RegExp(`<(/?)${name}\\b[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 1;
  for (let m; (m = re.exec(html));) {
    if (m[0].endsWith('/>')) continue;
    depth += m[1] ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  throw new Error(`unbalanced <${name}> after ${from}`);
}

/** Drops every `.l10n` element in the given language, with its contents. */
function dropLang(html, lang) {
  const start = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let out = '';
  let pos = 0;
  for (let m; (m = start.exec(html));) {
    const attrs = m[2];
    if (!/\bclass="[^"]*\bl10n\b[^"]*"/.test(attrs) || !attrs.includes(`lang="${lang}"`)) continue;
    const end = closeOf(html, m[1], m.index + m[0].length);
    out += html.slice(pos, m.index).replace(/[ \t]*$/, '');
    pos = end;
    start.lastIndex = end;
  }
  return out + html.slice(pos);
}

/** Bakes a copy.ts dictionary into the HTML, as setLang() would in the browser. */
function bakeDict(html, lang) {
  const dict = MESSAGES[lang];
  const pick = (key) => dict[key] ?? MESSAGES.en[key];
  let missed = 0;
  html = html.replace(/(<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g,
    (all, open, _tag, key, _text, close) => {
      const v = pick(key);
      if (v === undefined) { missed++; return all; }
      return open + escHtml(v) + close;
    });
  html = html.replace(/<[^>]*\sdata-i18n-aria="([^"]+)"[^>]*>/g, (tag, key) => {
    const v = pick(key);
    return v === undefined ? tag : tag.replace(/aria-label="[^"]*"/, `aria-label="${escHtml(v)}"`);
  });
  if (missed) console.warn(`  ${missed} data-i18n keys missing in ${lang}`);
  return html;
}

const setMeta = (html, attr, key, value) => html.replace(
  new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), `$1${escHtml(value)}$2`);

/** Arabic structured data: same blocks, Arabic names, /ar/ URLs, FAQ from the visible Arabic FAQ. */
function arabicJsonLd(html, urlPath, arUrl, title, desc) {
  const faq = [...html.matchAll(/<details\b[^>]*>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)]
    .map((m) => ({ '@type': 'Question', name: textOf(m[1]), acceptedAnswer: { '@type': 'Answer', text: textOf(m[2]) } }));
  const toAr = (u) => typeof u === 'string' && u.startsWith(`${DOMAIN}/`) && !u.includes('/assets/') && !/\.(png|jpe?g|webp|svg)$/.test(u)
    ? `${DOMAIN}/ar${u.slice(DOMAIN.length)}` : u;
  const svcName = (u) => {
    const s = SERVICES.find((x) => u === `${DOMAIN}/${x}/`);
    return s ? AR_SVC[s].crumb : null;
  };
  const h1 = textOf((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/) || [, title])[1]);
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (all, body) => {
    const d = JSON.parse(body);
    const type = [].concat(d['@type']).join(',');
    if (type === 'FAQPage') {
      if (!faq.length) return '';
      d.mainEntity = faq;
    } else if (type === 'BreadcrumbList') {
      d.itemListElement = d.itemListElement.map((it, i, all) => ({
        ...it,
        name: i === 0 ? MESSAGES.ar['nav.home'] : i === all.length - 1 ? (svcName(it.item) ?? h1) : (svcName(it.item) ?? it.name),
        item: toAr(it.item),
      }));
    } else if (type === 'Service') {
      const s = SERVICES.find((x) => urlPath === `/${x}/`);
      if (s) { d.name = AR_SVC[s].crumb; d.serviceType = AR_SVC[s].crumb; }
      const pk = s && AR_SVC[s].packages;
      if (d.hasOfferCatalog && pk?.list?.length === d.hasOfferCatalog.itemListElement.length) {
        d.hasOfferCatalog = { ...d.hasOfferCatalog, name: pk.title,
          itemListElement: pk.list.map((p) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: p.name, description: p.for } })) };
      }
      if (Array.isArray(d.offers)) d.offers = d.offers.map((o) => (o.name === 'November offer' ? { ...o, name: 'عرض نوفمبر' } : o));
      d.description = desc;
      d.url = arUrl;
    } else if (type === 'Article') {
      d.headline = h1;
      d.description = desc;
      d.url = arUrl;
      d.inLanguage = 'ar';
      if (d.about?.url) d.about = { ...d.about, name: svcName(d.about.url) ?? d.about.name, url: toAr(d.about.url) };
    } else {
      return all;
    }
    return `<script type="application/ld+json">${JSON.stringify(d)}</script>`;
  });
}

const PAGE_PATHS = ['/', ...SERVICES.map((s) => `/${s}/`), ...DOCS.map(([, p]) => `/${p}/`)];
const fileOf = (u) => join(dist, u === '/' ? 'index.html' : `${u.slice(1)}index.html`);

for (const u of PAGE_PATHS) {
  const both = readFileSync(fileOf(u), 'utf8');

  // English: only English, marked as one page of a pair
  const en = dropLang(both, 'ar').replace('<html lang="en" dir="ltr">', '<html lang="en" dir="ltr" data-localized>');
  writeFileSync(fileOf(u), en);

  // Arabic
  const arUrl = `${DOMAIN}/ar${u}`;
  let ar = bakeDict(dropLang(both, 'en'), 'ar')
    .replace('<html lang="en" dir="ltr">', '<html lang="ar" dir="rtl" data-localized>')
    .replace('<button type="button" data-lang="en" aria-pressed="true"', '<button type="button" data-lang="en" aria-pressed="false"')
    .replace('<button type="button" data-lang="ar" aria-pressed="false"', '<button type="button" data-lang="ar" aria-pressed="true"')
    .replace('<input type="hidden" name="language" value="en" />', '<input type="hidden" name="language" value="ar" />');
  const h1 = textOf((ar.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1]);
  const lede = textOf((ar.match(/<p class="lede"[^>]*>([\s\S]*?)<\/p>/) || [, ''])[1]);
  const title = AR_META[u]?.title ?? `${h1} | ${AR_BRAND}`;
  const svc = SERVICES.find((x) => u === `/${x}/`);
  const desc = AR_META[u]?.description ?? (svc && AR_SVC[svc].seoDescription) ?? lede;
  ar = ar
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${arUrl}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${arUrl}$2`)
    .replace('<meta property="og:locale" content="en_AE" />', '<meta property="og:locale" content="ar_AE" />')
    .replace('<meta property="og:locale:alternate" content="ar_AE" />', '<meta property="og:locale:alternate" content="en_AE" />');
  ar = setMeta(ar, 'name', 'description', desc);
  for (const [attr, key] of [['property', 'og:title'], ['name', 'twitter:title']]) ar = setMeta(ar, attr, key, title);
  for (const [attr, key] of [['property', 'og:description'], ['name', 'twitter:description']]) ar = setMeta(ar, attr, key, desc);
  // links between pages stay in Arabic
  ar = ar.replace(/(<a\b[^>]*\bhref=")(\/[^"]*)"/g, (all, pre, href) => {
    const path = href.split('#')[0];
    const known = path === '/' || PAGE_PATHS.includes(path) || path === '';
    return known && !href.startsWith('/ar/') ? `${pre}/ar${href}"` : all;
  });
  ar = arabicJsonLd(ar, u, arUrl, title, desc);
  mkdirSync(dirname(join(dist, 'ar', u === '/' ? 'index.html' : `${u.slice(1)}index.html`)), { recursive: true });
  writeFileSync(join(dist, 'ar', u === '/' ? 'index.html' : `${u.slice(1)}index.html`), ar);
}

// ---- 3) redirects for the remaining old URLs ----
function redirect(path, target) {
  mkdirSync(join(dist, path), { recursive: true });
  writeFileSync(join(dist, path, 'index.html'), `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<link rel="canonical" href="${DOMAIN}${target.split('#')[0].split('?')[0]}">
<meta http-equiv="refresh" content="0;url=${target}">
<script>location.replace(${JSON.stringify(target)});</script>
<title>Innova Group</title>
</head><body><p><a href="${target}">Continue to Innova Group</a></p></body></html>
`);
}
redirect('contact', '/#contact');
redirect('about', '/#why');
redirect('ar/contact', '/ar/#contact');
redirect('ar/about', '/ar/#why');

// ---- 4) robots.txt, sitemap.xml, llms.txt, 404, .nojekyll ----
writeFileSync(join(dist, 'robots.txt'), `User-agent: *
Allow: /

# AI assistants and answer engines are welcome to read and cite this site.
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
# Plain-language summary for language models: ${DOMAIN}/llms.txt
`);

// lastmod = when the page's own sources last changed in git, so the date
// only moves when the content does. CI checks out one commit, so fetch the
// history first (quietly carrying on with today's date if that fails).
const today = new Date().toISOString().slice(0, 10);
try {
  if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root }).toString().trim() === 'true') {
    execFileSync('git', ['fetch', '--quiet', '--unshallow'], { cwd: root, stdio: 'ignore' });
  }
} catch { /* no git or no network: dates fall back below */ }
const SOURCES = (u) => {
  if (u === '/') return ['index.html', 'src/content/copy.ts'];
  const s = SERVICES.find((x) => u === `/${x}/`);
  if (s) return ['src/content/services-full.en.json', `src/content/ar/${s}.json`, 'tools/build-pages.mjs'];
  const g = DOCS.find(([, p]) => u === `/${p}/`);
  return g ? [`${g[0]}.html`] : [];
};
const lastmod = (u) => {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...SOURCES(u)], { cwd: root }).toString().trim() || today;
  } catch { return today; }
};
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${PAGE_PATHS.flatMap((u) => {
  const alts = [
    `    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}${u}"/>`,
    `    <xhtml:link rel="alternate" hreflang="ar" href="${DOMAIN}/ar${u}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}${u}"/>`,
  ].join('\n');
  const mod = lastmod(u);
  return [`${DOMAIN}${u}`, `${DOMAIN}/ar${u}`].map((loc) =>
    `  <url>\n    <loc>${loc}</loc>\n${alts}\n    <lastmod>${mod}</lastmod>\n  </url>`);
}).join('\n')}
</urlset>
`);

writeFileSync(join(dist, 'llms.txt'), `# Innova Group LLC

Licensed multi-disciplinary company in Meydan, Dubai (UAE). Slogan:
Build. Manage. Innovate. One team, one point of accountability.

Services (each page carries the full offer, scope, packages and FAQs,
in English and Arabic):
${SERVICES.map((s) => `- ${DOMAIN}/${s}/`).join('\n')}

Guides:
${GUIDES.map(([, p]) => `- ${DOMAIN}/${p}/`).join('\n')}

Arabic (every page above also exists in Arabic under /ar/):
- ${DOMAIN}/ar/
${SERVICES.map((s) => `- ${DOMAIN}/ar/${s}/`).join('\n')}

Contact: info@innovagroup.co.ae · +971 50 509 7758 · ${DOMAIN}/#contact
`);

const home = readFileSync(join(dist, 'index.html'), 'utf8');
writeFileSync(join(dist, '404.html'), home
  .replace('<title>', '<title>Page not found — ')
  .replace('</head>', '<meta name="robots" content="noindex"></head>'));

writeFileSync(join(dist, '.nojekyll'), '');

// ---- 5) inline the stylesheet ----
// The site's one stylesheet is about 9 KB compressed. Inlined, a phone can
// paint as soon as the HTML arrives instead of waiting for a second request.
// (It only holds data: URLs, so moving it into each page breaks nothing.)
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (e.name === 'assets' ? [] : walk(join(dir, e.name))) : e.name.endsWith('.html') ? [join(dir, e.name)] : []);
const cssCache = {};
let inlined = 0;
for (const file of walk(dist)) {
  const html = readFileSync(file, 'utf8');
  const out = html.replace(/<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g, (_, href) => {
    cssCache[href] ??= readFileSync(join(dist, href), 'utf8').trim();
    inlined++;
    return `<style>${cssCache[href]}</style>`;
  });
  if (out !== html) writeFileSync(file, out);
}
console.log(`stylesheet inlined into ${inlined} pages`);

console.log('deploy layout ready:', readdirSync(dist).join(', '));
