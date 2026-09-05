# Innova Group website — how to change things

There are two ways to edit this site. Use the first one for everyday changes.

---

## 1. The admin panel (no code)

Go to **[app.pagescms.org](https://app.pagescms.org)** and sign in with the
GitHub account that owns this repository. You'll see two sections:

**Services** — the eight service pages. Click one and you get a form for
everything on it: the headline, the scope list, the FAQ, and the package tiers.
Package items can be added, removed and dragged into order. Tick *Highlight this
one* to give a tier the gold border and the "Most requested" badge.

**Company & pages** — your email, phone and address, plus all the wording on the
home, about and contact pages.

Press **Save**. The site rebuilds itself and the change is live in about a
minute.

Everything you save is a normal commit in the repository, so nothing is ever
lost — you can look back at any previous version and restore it.

### Adding a whole new service

In **Services**, click *Add an entry*. Fill in the service name, give it a web
address (lowercase, no spaces — `landscaping` becomes
`innovagroup.co.ae/landscaping/`), pick an icon, and complete the rest. It
appears automatically in the menu, the footer, the home page grid, the sitemap
and the contact form dropdown.

To remove one, delete the entry. To reorder them, drag them — the home page
numbering (01, 02, 03…) follows the order.

---

## 2. The files (for design changes)

| I want to change…                          | Open this file            |
|--------------------------------------------|---------------------------|
| Colours, fonts, spacing, corners            | `src/assets/css/theme.css`|
| Page layout and structure                   | `build.js`                |
| Buttons, menus, form behaviour              | `src/assets/js/site.js`   |
| The logo                                    | `src/assets/img/`         |
| Text and packages (same as the admin panel) | `content/*.json`          |

### Colours and type — `src/assets/css/theme.css`

Every colour, typeface and size is a variable in this one file. Change a value,
and it updates across all twelve pages at once.

```css
--brand-navy:   #142240;   /* from the logo */
--brand-gold:   #C99A3F;   /* from the logo */
--bg:           #FBFAF8;   /* page background */
--font-display: "Cormorant Garamond", serif;   /* headings */
--font-body:    "Jost", sans-serif;            /* everything else */
```

To change a typeface, edit `--font-display` or `--font-body`, then update the
Google Fonts link in the `head()` function near the top of `build.js`.

To remove dark mode, delete the `[data-theme="dark"] { … }` block at the bottom
of `theme.css` and the `data-theme-toggle` button in `build.js`.

### The logo — `src/assets/img/`

| File                   | Used for                               |
|------------------------|----------------------------------------|
| `logo.png`             | Header on light backgrounds            |
| `logo-inverse.png`     | Footer, and the header in dark mode    |
| `mark.png`             | The diamond mark on its own            |
| `favicon.png`          | Browser tab icon                       |
| `apple-touch-icon.png` | Icon when saved to a phone home screen |

Replace them with files of the same names. Keep the transparent background. An
SVG version of the logo would look sharper at every size — worth getting from
whoever designed it.

---

## 3. Rebuilding

`dist/` holds the generated website. It is rebuilt automatically every time you
save in the admin panel or push a change, so you normally never touch it.

To build it yourself:

```bash
node build.js
```

To preview locally:

```bash
cd dist && python3 -m http.server
```

then open `http://localhost:8000`.

> Never edit anything inside `dist/` — it is overwritten on every build.

---

## 4. Adding prices to the packages

Prices were deliberately left out. To add them, two small changes:

1. In `.pages.yml`, inside the `tiers` field list, add:
   ```yaml
   - { name: price, label: Price, type: string }
   ```
2. In `build.js`, find `<p class="pkg__for">` inside `buildService()` and add a
   line above it:
   ```js
   ${t.price ? `<p class="pkg__price">${t.price}</p>` : ''}
   ```

A price field then appears in the admin panel for every tier. Ask and this can
be wired up with proper styling.

---

## 5. The contact form

Submissions are sent through [Web3Forms](https://web3forms.com) straight to the
company inbox — the visitor never leaves the page and no email app opens. Both
the English and Arabic forms use the same access key.

- **To change where enquiries arrive:** create a new access key at
  https://app.web3forms.com/onboarding/create using the new email address
  (Web3Forms emails the key to that address), then paste it into the admin
  panel under **Company details → Contact form key**, or into `formKey` in
  `content/site.json`. Push, and the site rebuilds.
- **Wording** of the "Sending…", success and error messages lives in
  `content/ui.json` (`formSending`, `formSuccess`, `formError`).
- **Spam:** the form carries a hidden honeypot field that bots tend to fill
  in; Web3Forms drops those submissions. The free plan allows 250 submissions
  a month.
- If JavaScript is disabled, the browser submits the form directly and
  Web3Forms shows its own thank-you page.

---

## 6. Search engine basics

- Page titles and descriptions are editable in the admin panel under *Search
  engines* on each page. Keep titles under about 60 characters, descriptions
  under about 155.
- `sitemap.xml` and `robots.txt` are generated on every build.
- If the domain ever changes, update *Website address* under Company details and
  every canonical URL and sitemap entry follows it.
