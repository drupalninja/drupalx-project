# AGENTS.md — working on DrupalX

Guidance for AI coding agents (and humans) working in this repository.
`README.md` covers the what; this file covers the constraints that aren't
obvious from the code.

## Architecture in one breath

Drupal 11 + Canvas (Experience Builder) composer template. The component
library is `web/themes/custom/drupalx_theme/components/*` — Single-Directory
Components (SDCs) whose `.component.yml` schemas drive the Canvas edit
forms. The same Twig renders in a Twing static preview (`frontend/`), so
components can be designed with live reload and no Drupal in the loop.
`recipes/drupalx_canvas/` installs everything, including the five-page demo
site as default content.

## Commands

- `ddev install` — clean install (Drupal CMS base → recipe → theme → demo)
- `ddev drush cr` — after adding/changing a component so Canvas rediscovers it
- Theme build (run after ANY twig/CSS/token change, commit `dist/`):
  `cd web/themes/custom/drupalx_theme && npm run build`
- Static preview: `cd frontend && npm run dev` (:5050) · `npm run validate` ·
  `npm run manifest` (regenerates `COMPONENTS.md` + icon drift check)

## Non-negotiable constraints

- **`drupal/canvas` is pinned EXACTLY in composer.json.** Canvas changes
  its component/prop-shape schema between releases and every
  `canvas.component.sdc.*` config carries a version hash. After any bump:
  `ddev drush updb && ddev drush cr`, re-test the Canvas editor (open
  several component edit forms), and run `composer audit`.
- **Component schema rules (Canvas is strict):**
  - Enum props must never contain `''` — use `'none'`. Canvas silently
    refuses to register a component with an empty-string enum value.
  - A **required** image prop needs `examples:` (with a `{src, alt}`
    entry) or Canvas skips the component ("required, but does not have
    example value").
  - Repeatable content is a **slot of child components**, never an
    array-of-objects prop. Slots render as twig `{% block %}`s.
  - Image props: `type: object` + `$ref: json-schema-definitions://canvas.module/image`.
    Links: `format: uri-reference`. Rich text: `contentMediaType: text/html`.
  - If a component seems to be missing from Canvas, ask the
    `ComponentIncompatibilityReasonRepository` service — it names the
    schema problem exactly.
- **Twig constraints (the same file compiles in Drupal AND Twing):**
  - Block names are unique per template. If a slot renders in more than
    one conditional branch, capture it once:
    `{% set html %}{% block slot %}{% endblock %}{% endset %}` and print
    the variable.
  - Twing 3 cannot compile a filter inside a subscript —
    `map[x|default('y')]` throws. Resolve the key to a variable first.
  - Cross-component imports use the theme-root namespace
    (`@drupalx_theme/components/...`); SDC includes use
    `drupalx_theme:<name>`.
- **Tailwind v4 only generates classes it sees literally.** Conditional
  styling goes through STATIC class maps in twig
  (`{% set map = { 'sky': 'bg-sky-100 …' } %}`), never string
  interpolation like `bg-{{ c }}-100`. New markup locations must be
  covered by an `@source` line in the theme's `src/css/global.css`.
- **Never pair Tailwind's `hidden` with a responsive display override**
  (`hidden lg:block`). Drupal core ships `.hidden{display:none!important}`
  which wins — and the static preview masks the bug. Use `max-lg:hidden` /
  `max-sm:hidden` instead.
- **Full-viewport CSS must be displacement-aware.** Drupal's admin
  navigation sets `--drupal-displace-offset-*`; raw `100vw` bands bleed
  under the sidebar for logged-in users. `.full-bleed` and `header.sticky`
  already compensate — follow their pattern for any new full-viewport CSS.
- **Never use raw `vh` heights in components** — the Canvas editor's
  preview iframe is unbounded and they blow it up. Use the capped
  `hero-h-*` classes (`min(vh, px)`).
- **Icons are build-time Lucide.** The curated list lives in the theme's
  `scripts/copy-icons.mjs` → committed `dist/icons/`, inlined via twig
  `source()`. No icon CDNs, no client-side icon JS. Icon enums in
  component schemas must stay a subset of the curated list —
  `npm run manifest` warns on drift.
- **Fonts are self-hosted** (`@fontsource-variable` → `dist/fonts/` +
  `src/css/fonts.css`). Never add a Google Fonts import — it costs ~20
  Lighthouse points on mobile.
- **The theme's `dist/` is committed.** Drupal renders from it with zero
  node builds; rebuild + commit it with any theme change.
- **`recipes/` is tracked in git** (unlike stock drupal/cms):
  `core-recipe-unpack` removes recipe packages from composer.lock, so a
  fresh clone cannot restore them via composer. Don't re-add `/recipes`
  to `.gitignore`.
- **Recipes apply via `vendor/bin/dr recipe <path>`** — `drush recipe`
  was removed in Drupal 11.4. Our recipe is `type: 'Site addon'`, not
  `Site` (the installer scans `Site` recipes as site templates and
  asserts each ships a screenshot).

## Debug quick hits

- Canvas edit form 500s (`explode(): null given` / StorablePropShape
  assert) → `ddev drush cr`.
- A 503 on a `styles/…` image derivative is Drupal's generation lock — it
  self-heals on retry; not a bug.
- Tailwind class missing in the browser → is the file covered by an
  `@source`? Did you rebuild + was `drush cr` run (CSS aggregation)?
- Demo page UUIDs are stable — the install command's alias/front-page
  step depends on them; don't regenerate the recipe content without
  updating `DEMO_PAGES` in `.ddev/commands/host/install`.
