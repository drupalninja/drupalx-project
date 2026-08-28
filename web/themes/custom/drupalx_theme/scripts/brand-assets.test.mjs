/**
 * The brand assets a page actually renders — the header/footer mark and the
 * favicon, which in this theme are the same file (logo.svg).
 *
 * These are the one class of file a build cannot check. Nothing throws when
 * the header shows another company's mark; it just ships, and it is the first
 * thing anyone sees. The sibling Astro starters shipped their agency's own mark as the
 * favicon of every pilot for months. This theme had the quieter version: a
 * hand-drawn DrupalX mark with the old DrupalX blue baked in, which went
 * off-brand the moment the palette moved to the shared teal-navy (2026-08-09)
 * and said nothing.
 *
 * Ported from the Astro twins' scripts/brand-assets.test.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const THEME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(resolve(THEME, rel), 'utf8');

test('the mark is derived from the site name, not drawn by hand', () => {
  // The actual fix for the inherited-logo class of bug. A DRAWN mark is an
  // identity and survives a fork silently — wrong one generation later. A
  // monogram is a function of PUBLIC_SITE_NAME, so it cannot be inherited
  // wrongly. If someone replaces the generator's output with a bespoke glyph,
  // this is the tripwire.
  const svg = read('logo.svg');
  assert.match(svg, /<text\b/, 'logo.svg should render the monogram letter, not a bespoke glyph');
  assert.doesNotMatch(
    svg,
    /<image\b/,
    'logo.svg embeds a raster — that is how another agency’s bolt shipped on the Astro side. Generate the mark.',
  );
  assert.match(
    read('scripts/generate-logo.mjs'),
    /LOGO_MONO/,
    'generate-logo.mjs should still derive the monogram from the site name',
  );
});

test('the mark uses the palette, so a recolor cannot leave it behind', () => {
  // The regression this test exists for: logo.svg hardcoded #1e4a86 (the old
  // DrupalX blue). Syncing the palette to the shared teal-navy left a blue
  // mark on a teal site, and nothing in the build noticed.
  const css = read('src/css/global.css');
  const svg = read('logo.svg');
  const tokenOf = (name) => {
    const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
    assert.ok(m, `global.css should define --${name}`);
    return m[1].trim().toLowerCase();
  };
  for (const name of ['color-primary-800', 'color-accent-500']) {
    assert.ok(
      svg.toLowerCase().includes(tokenOf(name)),
      `logo.svg does not use --${name} (${tokenOf(name)}). Run \`npm run gen:logo\` after a recolor.`,
    );
  }
});

test('no upstream or placeholder brand survives in the shipped mark', () => {
  const svg = read('logo.svg');
  const foreign = [
    ['#1e4a86', 'the old DrupalX blue'],
    ['Riverbend', 'the Riverbend demo-engagement name'],
  ];
  for (const [needle, what] of foreign) {
    assert.ok(
      !svg.toLowerCase().includes(needle.toLowerCase()),
      `logo.svg still carries ${what} — run \`npm run gen:logo\`.`,
    );
  }
});
