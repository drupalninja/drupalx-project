#!/usr/bin/env node
/**
 * verify-contrast — is the text on our filled brand surfaces actually legible?
 *
 *   node scripts/verify-contrast.mjs           # check, exit 1 on a failure
 *   node scripts/verify-contrast.mjs --fix     # also write the correct token
 *
 * WHY THIS EXISTS
 * ---------------
 * Components used to hardcode `text-white` on `bg-accent-*`, which is only
 * legible when the accent is dark. That became `--color-on-accent`, which was
 * necessary but NOT sufficient: the token DEFAULTS TO WHITE, and nothing sets
 * it per engagement. A light accent therefore still ships white-on-light.
 *
 * cbtrust 20260731 is the proof. The pilot had the token and zero hardcoded
 * `text-white`, and its `audit:all` still failed with **327 a11y violations,
 * 277 of them `color-contrast` — one per page**. Its accent is #00a596; white
 * on it is 3.08:1 against a 4.5:1 requirement. The fix was a one-line token
 * change nobody knew to make, and it was only discovered by a full-site audit
 * at the END of a run.
 *
 * Four seconds of arithmetic here replaces that. It is the same argument as
 * verify-design-rules: measurable rules should be MEASURED, not left to a
 * vision judge or an end-of-run audit to notice.
 *
 * A NOTE ON THE RAMP. Contrast is per-SHADE, so one token cannot be right for
 * every `bg-accent-*` used behind text. This checks each shade the components
 * actually use and reports per shade. When no ink clears AA on a shade, the
 * ramp itself is the problem — that shade should not carry text — and the
 * message says so rather than pretending a token can fix it.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

// Path-portable so the SAME file can live in every stack (stack-parity):
// the Astro+Drupal starter keeps its theme in src/styles/global.css and its
// source in src/; the Astro+WP starter uses web/src/styles/tokens.css and web/src/. One
// implementation, copied verbatim, rather than a fork per stack that drifts.
// Stack layouts differ: the Astro+Drupal starter is the app root and names its
// theme global.css; the Astro+WP starter puts the app under web/ and names it tokens.css;
// the Drupal THEME stacks (drupalx_theme among them) keep a Tailwind-v4 source at src/css/global.css and render
// from a committed dist/. Probe every name from the app root so ONE file can be
// copied verbatim into every stack instead of forking a copy per stack that
// drifts. dist/css/global.css is deliberately NOT a candidate: it is a build
// artifact, so a fix written there would be erased by the next `npm run build`.
const CSS_CANDIDATES = [
  'src/styles/global.css', // Astro+Drupal starter
  'src/styles/tokens.css', // Astro+WP starter
  'src/css/global.css', // drupalx_theme
  // drupalx-canvas ships its static FRONTEND separately from the theme that
  // styles it, so a run from frontend/ finds no stylesheet at all and exits 2.
  // Reach across to the theme rather than making the caller remember.
  '../web/themes/custom/drupalx_theme/src/css/global.css',
  '../web/themes/custom/provus_theme/src/css/global.css',
]
let CSS = process.argv.find((a) => a.startsWith('--css='))?.slice(6) || ''
for (const rel of CSS_CANDIDATES) {
  if (CSS) break
  const cand = resolve(ROOT, rel)
  if (existsSync(cand)) { CSS = cand; break }
}
if (!CSS) {
  console.error(`verify-contrast: no theme stylesheet found (looked for ${CSS_CANDIDATES.join(', ')})`)
  process.exit(2)   // infrastructure, not a finding — never fail a build on this
}
// Astro stacks keep markup under src/; the Drupal themes keep SDC components in
// components/ and template overrides in templates/. Listing both and filtering
// to what exists keeps this one file valid everywhere.
// Scan markup relative to WHERE THE STYLESHEET LIVES, not to cwd. When
// drupalx-canvas's frontend reaches across to the theme for its CSS, the
// components it styles are over there too — scanning frontend/ found no markup
// at all and the checker reported a cheerful "advisory only", which is a pass
// that measured nothing.
const CSS_ROOT = resolve(dirname(CSS), '../..')
const SRC_DIRS = []
for (const base of [ROOT, CSS_ROOT]) {
  for (const d of ['src/components', 'src/layouts', 'src/pages', 'components', 'templates']) {
    const abs = resolve(base, d)
    if (existsSync(abs) && !SRC_DIRS.includes(abs)) SRC_DIRS.push(abs)
  }
}
const FIX = process.argv.includes('--fix')
const AA = 4.5 // WCAG 2.1 AA, normal-size text

// ── colour maths ────────────────────────────────────────────────────────────
function srgbToLinear(v) {
  const x = v / 255
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = m[1]
  const [r, g, b] = [0, 2, 4].map((i) => srgbToLinear(parseInt(n.slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b)
  if (la == null || lb == null) return null
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}
const r2 = (n) => Math.round(n * 100) / 100

// ── read the theme ──────────────────────────────────────────────────────────
const css = readFileSync(CSS, 'utf8')
const tokenValue = (name) => (new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1] || '').trim()
const hexToken = (name) => {
  const v = tokenValue(name)
  return /^#[0-9a-f]{6}$/i.test(v) ? v : null
}

// Which accent shades actually sit behind ON-ACCENT text?
//
// Not every `bg-accent-*` does. The light tints (50/100) are background washes
// that carry ordinary dark body text and are perfectly legible; flagging them
// is noise that would train people to ignore this check. So require BOTH the
// accent background AND the on-accent ink in the same class attribute — that
// is the combination this token governs.
// "<shade>|<ink>" -> { shade, ink, sites: [ "file:line", … ] }. Keeping the
// sites is the point: a checker that says "shade 500 fails" without saying
// WHERE repeats the mistake of the a11y report that stored `{ id, nodes: 2 }`
// and left 277 violations undiagnosable.
const pairs = new Map()
{
  // Scan every QUOTED STRING, not just `class="…"` attributes.
  //
  // Attribute-only matching missed provus_theme's `components/button/button.twig`
  // — the shared button component, the single widest-reach surface in the theme
  // — because its variants live in a Twig map:
  //     'accent': 'bg-accent-700 text-white hover:bg-accent-600',
  // Same story for Astro/JS `const variants = { accent: '…' }` and clsx calls.
  // Any quoted run of utilities is a class list; treat it as one.
  //
  // Done in Node rather than by shelling out to grep: the pattern needs to match
  // both quote styles, which is exactly the thing that cannot be passed through
  // a shell one-liner cleanly, and the old `try { execSync } catch {}` silently
  // turned any failure into "no usage found" — which reaches the fallback and
  // reports on shades nothing uses.
  const files = []
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue
      const p = resolve(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(astro|twig|html|jsx?|tsx?|vue|svelte|php|md[x]?)$/.test(e.name)) files.push(p)
    }
  }
  for (const d of SRC_DIRS) walk(d)

  const hits = []
  for (const file of files) {
    const rel = file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((text, i) => {
      for (const m of text.matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)) {
        const s = m[1] ?? m[2]
        if (s && /(^|\s)(bg|text)-/.test(s)) hits.push(`${rel}:${i + 1}:${s}`)
      }
    })
  }
  // Variant prefixes matter. `bg-accent-50 text-accent-700 group-hover:bg-accent-600
  // group-hover:text-[on-accent]` puts DARK ink on the tint and the on-accent ink
  // only on hover — pairing accent-50 with white there is a false positive. So
  // bucket every utility by its variant prefix and only pair within a bucket.
  const shades = new Set()
  // Split on the last variant colon OUTSIDE any [...] — an arbitrary value is
  // atomic. `lastIndexOf(':')` split `text-[color:var(--color-on-accent)]`
  // inside its own brackets, so the token form was never recognised, detection
  // came back empty, and the fallback shade list produced a FALSE failure on a
  // stack that was already correct.
  const prefixOf = (tok) => {
    let depth = 0, cut = -1
    for (let i = 0; i < tok.length; i++) {
      const c = tok[i]
      if (c === '[') depth++
      else if (c === ']') depth--
      else if (c === ':' && depth === 0) cut = i
    }
    return cut === -1 ? '' : tok.slice(0, cut + 1)
  }
  const baseOf = (tok) => tok.slice(prefixOf(tok).length)
  // Name the ink a utility sets, or null if it sets no colour.
  //
  // Measuring only `text-white` / the on-accent token would have PASSED
  // drupalx_theme without checking it: its buttons are `bg-accent-500
  // text-primary-900` — dark ink on gold, a perfectly valid convention this
  // checker simply did not know about. A checker that silently skips the one
  // pairing a stack actually ships is worse than no checker. So resolve
  // whatever ink is there and measure THAT.
  const inkOf = (b) => {
    if (b === 'text-white') return 'white'
    if (b === 'text-[color:var(--color-on-accent)]') return 'on-accent'
    if (b === 'text-black') return 'black'
    const named = /^text-([a-z]+)-([0-9]{2,3})$/.exec(b)
    if (named) return `${named[1]}-${named[2]}`
    if (/^text-\[/.test(b)) return '?' // an arbitrary value we cannot resolve
    return null // text-sm, text-center, … not a colour
  }

  for (const line of hits) {
    // `path:line:<class list>` — split off the location, keep it.
    const m = /^(.*?:[0-9]+):(.*)$/.exec(line)
    if (!m) continue
    const [, where, attr] = m
    const toks = attr.match(/[A-Za-z0-9:_\[\]()\-\.\/]+/g) || []
    const byPrefix = new Map()
    for (const tok of toks) {
      const p = prefixOf(tok), b = baseOf(tok)
      if (!byPrefix.has(p)) byPrefix.set(p, { bg: null, ink: null })
      const slot = byPrefix.get(p)
      const bg = /^bg-accent-([0-9]{2,3})$/.exec(b)
      if (bg) slot.bg = bg[1]
      const ink = inkOf(b)
      if (ink) slot.ink = ink
    }
    // Ink CASCADES into variants. `bg-accent-700 text-white hover:bg-accent-600`
    // paints white on accent-600 for the whole hover state, but the ink token
    // lives in the unprefixed bucket — so bucketing alone scored shade 600 as
    // text-free and passed a hover state that is 3.4:1. A variant inherits the
    // base ink unless it sets a colour of its own. (WCAG applies to :hover.)
    const base = byPrefix.get('')
    for (const [p, slot] of byPrefix) {
      const ink = slot.ink ?? (p !== '' ? base?.ink : null)
      if (!slot.bg || !ink || ink === '?') continue
      const key = `${slot.bg}|${ink}`
      if (!pairs.has(key)) pairs.set(key, { shade: slot.bg, ink, sites: [] })
      const label = p ? `${where} (${p.slice(0, -1)})` : where
      const list = pairs.get(key).sites
      if (!list.includes(label)) list.push(label)
    }
  }
}

const onAccent = hexToken('color-on-accent') ?? '#ffffff'
const darkInk = hexToken('color-primary-900') ?? '#000000'
const WHITE = '#ffffff'

/** Resolve an ink NAME to a hex, or null when the theme defines no such token. */
const inkHex = (ink) =>
  ink === 'white' ? WHITE
  : ink === 'black' ? '#000000'
  : ink === 'on-accent' ? onAccent
  : hexToken(`color-${ink}`)

// Nothing pairs an accent fill with any resolvable ink — this stack never puts
// text on the accent at all. Still SHOW the mid/dark shades, because knowing
// which ones could not carry text is useful before someone reaches for one. But
// do NOT fail on it: there is no offending markup to fix, and a red build with
// no file to open is the false failure this checker exists to avoid. The
// regression it guards is caught the moment a pairing appears, by detection.
const ADVISORY = pairs.size === 0
if (ADVISORY) for (const shade of ['500', '600', '700']) pairs.set(`${shade}|on-accent`, { shade, ink: 'on-accent', sites: [] })

const failures = []
const rows = []
for (const { shade, ink, sites: where } of [...pairs.values()].sort(
  (a, b) => Number(a.shade) - Number(b.shade) || a.ink.localeCompare(b.ink),
)) {
  const bg = hexToken(`color-accent-${shade}`)
  const fg = inkHex(ink)
  if (!bg || !fg) continue
  const cur = contrast(bg, fg)
  const row = { shade, bg, ink, fg, cur, where, alt: { white: contrast(bg, WHITE), dark: contrast(bg, darkInk) } }
  rows.push(row)
  if (cur == null || cur < AA) failures.push(row)
}

console.log(
  `verify-contrast — every accent fill that carries text, measured against AA (${AA}:1).` +
    `\n--color-on-accent is ${onAccent}.\n`,
)
for (const r of rows) {
  console.log(
    `  ${r.cur >= AA ? '✓' : '✗'} bg-accent-${r.shade} ${r.bg}  +  text-${r.ink} ${r.fg}` +
      `   ${r2(r.cur)}:1`,
  )
}

if (ADVISORY) {
  console.log(
    `\nAdvisory only — nothing in ${SRC_DIRS.length} scanned dir(s) puts text on an accent fill,` +
      `\nso nothing here is broken. The table is the ramp's CAPACITY: a shade marked ✗` +
      `\ncannot carry ${onAccent} text if you reach for one.`,
  )
  process.exit(0)
}

if (!failures.length) {
  console.log(`\nAll ${rows.length} text-bearing accent surface(s) clear AA.`)
  process.exit(0)
}

console.log(`\n✗ ${failures.length} of ${rows.length} text-bearing accent surface(s) fail AA.`)
for (const f of failures) {
  console.log(`\n  bg-accent-${f.shade} + text-${f.ink} — ${r2(f.cur)}:1, used at:`)
  for (const w of f.where.slice(0, 8)) console.log(`    ${w}`)
  if (f.where.length > 8) console.log(`    … and ${f.where.length - 8} more`)
  const better = [
    ['white', WHITE, f.alt.white],
    [`primary-900`, darkInk, f.alt.dark],
  ].filter(([, , c]) => c >= AA)
  console.log(
    better.length
      ? `    → this shade CAN carry ${better.map(([n, h, c]) => `text-${n} ${h} (${r2(c)}:1)`).join(' or ')}`
      : `    → NO ink clears AA on ${f.bg}: it is too mid-tone either way (white ${r2(f.alt.white)}, ` +
        `${darkInk} ${r2(f.alt.dark)}). Darken the shade, or stop putting text on it.`,
  )
}

// --fix only has a lever when the failing ink is the on-accent TOKEN. If a
// component hardcodes `text-white` or picks a named shade, the fix is in the
// markup and rewriting the token would silently change unrelated surfaces.
const tokenFailures = failures.filter((f) => f.ink === 'on-accent')
const tokenRows = rows.filter((r) => r.ink === 'on-accent')
const scoreFor = (ink) => tokenRows.filter((r) => (contrast(r.bg, ink) ?? 0) >= AA).length
const best = [WHITE, darkInk].sort((a, b) => scoreFor(b) - scoreFor(a))[0]

if (tokenFailures.length && scoreFor(best) === tokenRows.length) {
  console.log(`\n→ Set --color-on-accent: ${best};  (clears AA on all ${tokenRows.length} token-inked surfaces)`)
  if (FIX) {
    writeFileSync(CSS, css.replace(/--color-on-accent:\s*[^;]+;/, `--color-on-accent: ${best};`))
    console.log(`✓ written to ${CSS}`)
    process.exit(0)
  }
  console.log('  Re-run with --fix to apply it.')
} else {
  console.log(
    `\n→ No token change fixes this — the failures above are in the MARKUP or the RAMP.` +
      `\n  Fix them at the sites listed.`,
  )
}
process.exit(1)
