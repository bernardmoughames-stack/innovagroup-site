#!/usr/bin/env node
/* Builds a single-file, fully browsable preview of the whole site
   (all pages inlined, images embedded) for sharing before hosting. */
const fs = require('fs');
const path = require('path');
const services = require('./content/services.json');

const R = f => fs.readFileSync(path.join(__dirname, 'dist', f), 'utf8');
const B64 = f => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'dist', f)).toString('base64');

const routes = [
  { p: '/', f: 'index.html' },
  ...services.map(s => ({ p: `/${s.slug}/`, f: `${s.slug}/index.html` })),
  { p: '/about/', f: 'about/index.html' },
  { p: '/contact/', f: 'contact/index.html' }
];

const grab = (html, tag) => {
  const open = html.indexOf(`<${tag}`);
  const start = html.indexOf('>', open) + 1;
  const end = html.lastIndexOf(`</${tag}>`);
  return html.slice(start, end);
};

const home = R('index.html');
let header = home.slice(home.indexOf('<header class="site-header">'), home.indexOf('<main id="main">'));
let footer = home.slice(home.indexOf('<footer class="site-footer">'), home.indexOf('</footer>') + 9);

const panels = routes.map(r => {
  const main = grab(R(r.f), 'main');
  return `<div class="route" data-route="${r.p}" hidden>${main}</div>`;
}).join('\n');

let out = `<title>Innova Group</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@200;300;400;500&display=swap" rel="stylesheet">
<style>
${R('assets/css/theme.css')}
${R('assets/css/site.css')}
.preview-flag{position:fixed;left:12px;bottom:12px;z-index:300;background:var(--navy-800);color:#fff;
  font:400 11px/1 var(--font-body);letter-spacing:.12em;text-transform:uppercase;
  padding:.6rem .9rem;border-radius:100px;opacity:.85;pointer-events:none}
</style>
${header}
<div id="routes">
${panels}
</div>
${footer}
<div class="preview-flag">Preview — navigation works</div>
<script>
${R('assets/js/site.js')}
</script>
<script>
(function(){
  var panels = [].slice.call(document.querySelectorAll('.route'));
  function show(p){
    p = p.split('?')[0].split('#')[0] || '/';
    var target = panels.filter(function(x){return x.getAttribute('data-route')===p;})[0] || panels[0];
    panels.forEach(function(x){ x.hidden = x!==target; });
    document.querySelectorAll('.nav a, .dropdown a').forEach(function(a){
      if(a.getAttribute('href')===p) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0,0);
    target.querySelectorAll('[data-reveal]').forEach(function(el){ el.classList.add('is-visible'); });
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href') || '';
    if(href.indexOf('#')===0){ return; }
    if(href.indexOf('/')!==0) return;
    e.preventDefault();
    show(href);
  });
  show('/');
})();
</script>
`;

for (const img of ['assets/img/logo.png', 'assets/img/logo-inverse.png']) {
  out = out.split('/' + img).join(B64(img));
}

fs.writeFileSync(path.join(__dirname, 'preview-build.html'), out);
console.log('preview-build.html written —', (out.length / 1024).toFixed(0) + ' KB');
