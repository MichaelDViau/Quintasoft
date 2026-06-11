# Quintasoft — Website

Bilingual (English default / Spanish secondary) static single-page marketing site for Quintasoft, a software development company based in Quintana Roo, México.

## Project structure

```
.
├── index.html              # The page — semantic, commented markup only
├── css/
│   ├── styles.css          # Source stylesheet (documented, table of contents)
│   └── styles.min.css      # Minified production build (referenced by index.html)
├── js/
│   ├── i18n.js             # EN/ES translation dictionaries
│   ├── main.js             # Site behavior (nav, i18n, slider, form, reveal)
│   └── app.min.js          # Minified production bundle (referenced by index.html)
├── assets/
│   └── images/
│       ├── hero-bg.webp    # Hero background (WebP, ~76 KB)
│       └── hero-bg.jpg     # JPEG fallback (~184 KB)
├── package.json            # Build scripts (esbuild minification)
└── README.md
```

## Development

Edit the **source** files (`css/styles.css`, `js/i18n.js`, `js/main.js`), then rebuild the minified production assets:

```bash
npm install     # one time — installs esbuild
npm run build   # regenerates css/styles.min.css and js/app.min.js
npm run serve   # local preview at http://localhost:8080
```

`index.html` references only the minified builds, so a rebuild is required for source edits to appear in production.

## Languages

- Spanish is the default render language (static HTML is Spanish, `<html lang="es">`).
- English is applied at runtime via `data-i18n` attributes mapped to keys in `js/i18n.js`.
- The visitor's choice persists in `localStorage` (`quintasoft.lang`).
- When adding text, add the key to **both** dictionaries in `js/i18n.js`.
- House style: no em dashes anywhere in the copy.

## Performance notes

- Hero background preloaded as WebP (with JPEG fallback via CSS `image-set()`); it is the LCP element.
- JS is a single deferred bundle — nothing render-blocking except the minified CSS.
- Only used Inter font weights (400–900) are loaded, with `display=swap`.
- Animations honor `prefers-reduced-motion`.
- Icons and favicon are inline SVG, so there are zero extra image requests.
- The technology marquee is a pure-CSS infinite loop (one pill set is cloned by JS; the track translates by exactly one set width for a seamless, jump-free scroll). It pauses for `prefers-reduced-motion` users.
