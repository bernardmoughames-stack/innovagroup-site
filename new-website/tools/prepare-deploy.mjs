// Turns a `vite build --base=/` output into the production layout for
// innovagroup.co.ae on GitHub Pages, preserving every URL the old site
// served:
//   /<service>/            real page (directory copy of <service>.html)
//   /contact/  /about/     redirects into the one-page sections
//   /ar/...                redirects to the same page with ?lang=ar
// plus robots.txt, sitemap.xml, llms.txt, 404.html and .nojekyll.
//
// Run AFTER: node tools/build-pages.mjs && vite build --base=/
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const DOMAIN = 'https://innovagroup.co.ae';

const SERVICES = ['contracting', 'project-management', 'facility-management', 'cinema',
  'snagging', 'marketing', 'consultancy', 'ai', 'home-watch'];

// Guides: source file (without .html) -> public path
const GUIDES = [['guide-snagging-checklist-dubai', 'guides/snagging-checklist-dubai']];

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
  for (const [src, path] of GUIDES) html = html.replaceAll(`href="${src}.html"`, `href="/${path}/"`);
  writeFileSync(join(dist, f), html);
}

// ---- 2) directory-style service pages (the URLs the old site ranks on) ----
for (const s of SERVICES) {
  const src = join(dist, `${s}.html`);
  mkdirSync(join(dist, s), { recursive: true });
  writeFileSync(join(dist, s, 'index.html'), readFileSync(src));
  rmSync(src);
}
for (const [src, path] of GUIDES) {
  mkdirSync(join(dist, path), { recursive: true });
  writeFileSync(join(dist, path, 'index.html'), readFileSync(join(dist, `${src}.html`)));
  rmSync(join(dist, `${src}.html`));
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
redirect('ar', '/?lang=ar');
redirect('ar/contact', '/?lang=ar#contact');
redirect('ar/about', '/?lang=ar#why');
for (const s of SERVICES) redirect(`ar/${s}`, `/${s}/?lang=ar`);

// ---- 4) robots.txt, sitemap.xml, llms.txt, 404, .nojekyll ----
writeFileSync(join(dist, 'robots.txt'), `User-agent: *
Allow: /

# AI assistants and answer engines are welcome to read and cite this site.
User-agent: GPTBot
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

const today = new Date().toISOString().slice(0, 10);
const urls = ['/', ...SERVICES.map((s) => `/${s}/`), ...GUIDES.map(([, p]) => `/${p}/`)];
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.flatMap((u) => {
  const alts = [
    `    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}${u}"/>`,
    `    <xhtml:link rel="alternate" hreflang="ar" href="${DOMAIN}${u}?lang=ar"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}${u}"/>`,
  ].join('\n');
  return [`${DOMAIN}${u}`, `${DOMAIN}${u}?lang=ar`].map((loc) =>
    `  <url>\n    <loc>${loc.replaceAll('&', '&amp;')}</loc>\n${alts}\n    <lastmod>${today}</lastmod>\n  </url>`);
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

Contact: info@innovagroup.co.ae · +971 50 509 7758 · ${DOMAIN}/#contact
`);

const home = readFileSync(join(dist, 'index.html'), 'utf8');
writeFileSync(join(dist, '404.html'), home
  .replace('<title>', '<title>Page not found — ')
  .replace('</head>', '<meta name="robots" content="noindex"></head>'));

writeFileSync(join(dist, '.nojekyll'), '');

console.log('deploy layout ready:', readdirSync(dist).join(', '));
