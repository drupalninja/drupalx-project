# DrupalX

A modern Drupal 11 project template built around **Canvas (Experience
Builder)** and **drupalx_theme** — a Tailwind v4 Single-Directory-Component
library with a real design system: editorial display type, a token-driven
brand palette, glass-panel heroes, big-number stat bands, and card grids
with polished hover states. Editors compose landing pages from the
component library in Canvas; the design system's guardrails (enums, slots,
schema-validated props) keep every page on-brand.

**`ddev install` lands a complete five-page demo site** — Home, About,
Services, Contact, plus a Component library page showing every component —
so you see the theming system working before you write a line of code.

## Requirements

- [DDEV](https://ddev.readthedocs.io/) (Docker-based local dev)
- Node 20+ on the host (only needed when changing the theme or using the
  static preview — the committed `dist/` means Drupal runs without it)

## Quick start

```bash
git clone https://github.com/nextagencyio/drupalx-project.git
cd drupalx-project
ddev start
ddev install
```

Log in with `admin` / `admin`. Every demo page is a Canvas page — open
**Content → Pages** and click **Edit** to compose with the component
library (drag components, fill in form fields, nest cards into grids).

## What's inside

| Piece | What it is |
| --- | --- |
| `web/themes/custom/drupalx_theme/` | The component library: 24 SDCs (heroes, stat bands, card grids, splits, CTAs, quotes, galleries, accordions, alerts, news/event cards, document lists + primitives), Tailwind v4 CSS-first tokens, self-hosted variable fonts (Inter + Fraunces), and a curated build-time Lucide icon set — no CDNs anywhere. |
| `web/themes/custom/drupalx_theme/COMPONENTS.md` | Generated reference for every component: props, enums, required fields, slots. |
| `recipes/drupalx_canvas/` | The site recipe: Canvas modules, dx_image, the theme, registered component configs, responsive image styles, and the five-page demo content. |
| `web/modules/custom/dx_image/` | `dx_image()` Twig function — serves width-stepped WebP derivatives (300–1600w) for managed images automatically. |
| `frontend/` | A Twing-powered static preview: live-reload dev server that renders the *same* component Twig outside Drupal, plus a static-site build you can deploy anywhere. |

## The theming system

All brand decisions live in one place —
`web/themes/custom/drupalx_theme/src/css/global.css`:

- **`@theme` tokens**: a full `primary` 50–900 scale, a warm `accent`
  scale, and two secondary **wayfinding families** (`sky`, `clay`) used to
  color-code cards, stats, and tags so pages don't read single-hue.
- **Type**: Inter (UI) + Fraunces (display serif), self-hosted as variable
  fonts; fluid display scales (`.display-hero`, `.display-xl`).
- **Design primitives**: `.spark-card` (lift + accent-bar + arrow-slide
  hover), `.spark-dropdown` (hover-intent nav), `.brand-glow` dark bands,
  scroll-reveal, an accessible focus ring, and two-tier container widths.

To rebrand: recolor the token block, swap the `@fontsource` packages and
`logo.svg`, then:

```bash
cd web/themes/custom/drupalx_theme
npm install
npm run build     # icons + fonts + Tailwind CSS + JS → committed dist/
```

Site chrome strings (tagline, header CTA, footer contact) are theme
settings — no template edits:

```bash
ddev drush config:set drupalx_theme.settings dx_tagline "Your tagline" -y
```

## Building components

Each component is a Single-Directory Component under
`web/themes/custom/drupalx_theme/components/<name>/`:

```
components/card/
├── card.component.yml   # schema: props, enums, slots — this drives the Canvas edit form
└── card.twig            # Tailwind markup
```

1. Copy an existing component as a starting point (see `COMPONENTS.md`
   for the catalog and `AGENTS.md` for the schema conventions).
2. Rebuild the theme (`npm run build`) so Tailwind picks up the new
   markup's classes.
3. `ddev drush cr` — Canvas discovers the component and it appears in the
   editor's library.

## The static preview (`frontend/`)

Design components without Drupal in the loop:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5050 — live reload on twig/data edits
npm run validate   # checks demo pages against the component schemas
npm run build      # static dist/ build, deployable to any static host
```

The dev server renders the same demo pages from plain data files
(`site/pages-data/*.cjs`) using the same Twig components Drupal uses, and
rebuilds the theme's CSS on every change — edit a component and see it in
milliseconds.

## License

GPL-2.0-or-later, like Drupal itself. Demo photography is from
[Unsplash](https://unsplash.com/license).
