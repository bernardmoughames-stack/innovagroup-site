# innovagroup.co.ae

The Innova Group website. Static HTML generated from JSON content files — no
database, no dependencies, no framework.

## Editing the website

Go to **[app.pagescms.org](https://app.pagescms.org)** and sign in with GitHub.
Edit the text, save, and the live site updates itself in about a minute.

Full guide: [CUSTOMIZE.md](CUSTOMIZE.md) — visual styling: [PINEGROW.md](PINEGROW.md)

## Structure

```
content/site.json       Company details + home, about and contact page copy
content/services.json   The eight service pages, including package tiers
src/assets/             CSS, JavaScript, logo and icons
build.js                Generates the site into dist/
preview.js              Builds a single-file preview of the whole site
.pages.yml              Tells the admin panel which fields to show
dist/                   Generated output — never edit, never committed
```

## Building locally

Requires Node (any recent version). No `npm install` needed.

```bash
node build.js                      # generates dist/
cd dist && python3 -m http.server  # preview at http://localhost:8000
```

## Deployment



GitHub Pages, built automatically by `.github/workflows/deploy.yml` on every
push to `main`. No configuration needed beyond setting Pages source to
"GitHub Actions" once.
