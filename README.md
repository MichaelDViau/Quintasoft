# Quintasoft — Website

Bilingual (Spanish default / English secondary) static single-page site for Quintasoft, a custom software studio based in Quintana Roo, México.

## Design language: Liquid Glass

The site is built around a dark, editorial "liquid glass" design system:

- **Glass surfaces** (navigation capsule, mobile dock, hero lens, cards, form) use a layered recipe that works in every browser: backdrop blur + saturation, a mask-composited gradient rim, and a specular top sheen.
- **True refraction** on Chromium: `js/main.js` (section 11) generates a per-element displacement map on a canvas (signed-distance-field of the rounded shape, smoothstep bezel profile) and applies it through an SVG `feDisplacementMap` via `backdrop-filter: url(#...)`, so the page content genuinely bends at the edges of glass surfaces. Safari and Firefox keep the layered fallback.
- **Typography**: Inter (UI/body), Instrument Serif italic (display accents), IBM Plex Mono (micro-labels, numerals).
- **Mobile-first**: chapter navigation lives in an iOS-style glass dock fixed to the bottom of the screen on small viewports.
- Honors `prefers-reduced-motion` and `prefers-reduced-transparency`.

## Project structure

```
.
├── index.html              # The page — semantic, commented markup only
├── css/
│   ├── styles.css          # Source stylesheet (documented, table of contents)
│   └── styles.min.css      # Minified production build (referenced by index.html)
├── js/
│   ├── i18n.js             # ES/EN translation dictionaries
│   ├── main.js             # Site behavior (nav, glass engine, carousels, form)
│   └── app.min.js          # Minified production bundle (referenced by index.html)
├── assets/
│   └── images/
│       └── logo.svg        # Brand mark (all other visuals are generated in code)
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
- The choice persists in `localStorage` (`quintasoft.lang`).
