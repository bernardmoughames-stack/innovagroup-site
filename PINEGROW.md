# Using Pinegrow with this site

Pinegrow edits files on your computer — it doesn't host anything. The site still
lives on Cloudflare Pages. Think of Pinegrow as the tool you use to change how
the site *looks*, while the admin panel at
[app.pagescms.org](https://app.pagescms.org) changes what it *says*.

---

## The one rule

**Never open anything inside `dist/`.**

`dist/` is rebuilt from scratch every single time the site deploys. Any edit you
make in there disappears on the next build, which looks exactly like Pinegrow
losing your work.

Everything you should touch lives in `src/`.

---

## Setting up

1. Run the build once so the preview pages exist:

   ```bash
   cd ~/Desktop/innovagroup-site
   node build.js
   ```

2. In Pinegrow: **File → Open Project** → choose the `src` folder.

3. Open one of these two pages:

   | File                              | Shows you                          |
   |-----------------------------------|------------------------------------|
   | `style-preview-home.html`         | The home page                      |
   | `style-preview-service.html`      | A full service page with packages  |

   These are full copies of the real pages, wired to the real stylesheets. Style
   them and the changes apply to all twelve pages of the live site.

> The preview pages themselves are regenerated on every build, so don't bother
> editing their text or moving their sections — that work would be lost. They
> exist to give you something realistic to style against.

---

## Where your changes go

| You edit in Pinegrow          | Saved to                        | Survives a build? |
|-------------------------------|---------------------------------|-------------------|
| Colours, fonts, spacing, CSS  | `src/assets/css/theme.css` or `site.css` | **Yes** |
| Images and logo               | `src/assets/img/`               | **Yes**           |
| Interactions and scripts      | `src/assets/js/site.js`         | **Yes**           |
| Text or structure on a page   | `src/style-preview-*.html`      | **No** — use the admin panel |

**Check this before your first edit.** In Pinegrow's Style panel there's a
selector for which stylesheet a rule is written to. Make sure it says
`site.css` or `theme.css` — not "inline style" and not a new stylesheet
Pinegrow offers to create. If it writes elsewhere, the rule won't reach the
live site.

---

## Change the variable, not the rule

`theme.css` is the top of the cascade. Every colour, typeface and size on the
site comes from a variable defined there:

```css
--brand-navy:   #142240;
--brand-gold:   #C99A3F;
--bg:           #FBFAF8;
--font-display: "Cormorant Garamond", serif;
--font-body:    "Jost", sans-serif;
--radius-lg:    16px;
--section-y:    clamp(4.5rem, 9vw, 8rem);
```

Change `--brand-gold` once and every button, badge, icon, underline and hover
state across the site follows. Restyle individual buttons instead and you'll be
doing it again on the next element, and the two will drift apart.

So: reach for the variable first. Use Pinegrow's element styling for things the
variables genuinely don't cover — a new component, a one-off layout tweak.

Dark mode is a second block of the same variables at the bottom of `theme.css`.
If you change a colour, check it in both — the toggle is in the site header.

---

## Publishing what you changed

1. Save in Pinegrow.
2. Run `node build.js` to refresh your local `dist/` if you want to check it.
3. Open GitHub Desktop, write a short summary, **Commit to main**, then **Push**.
4. Cloudflare rebuilds and the change is live in about a minute.

---

## What Pinegrow can't do here

Pages are generated from `content/services.json` and `content/site.json`, so
adding a service, reordering the packages or rewording a headline has to happen
in the admin panel — Pinegrow would only be editing a preview copy.

If you'd rather have full visual control of the pages themselves, the site can
be converted to twelve standalone HTML files that Pinegrow owns completely. The
trade is that the admin panel goes away and edits like a phone number change
mean touching every page. Ask and it can be converted either direction.
