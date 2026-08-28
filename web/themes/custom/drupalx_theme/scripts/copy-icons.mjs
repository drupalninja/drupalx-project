/**
 * Copies the CURATED Lucide icon set from lucide-static into dist/icons/.
 *
 * This list is the single source of truth for which icons exist in the theme.
 * The `icon` SDC's `name` enum (and every other component's icon prop enum)
 * must be a subset of this list — the frontend's gen-manifest drift check
 * warns when a component enum references an icon that isn't here.
 *
 * Icons are inlined at render time via twig `source('@drupalx_theme/dist/
 * icons/<name>.svg')` — build-time SVG, no CDN, no client-side JS.
 * lucide-static SVGs use stroke="currentColor" so color inherits.
 */
import { copyFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ICONS = [
  'arrow-right',
  'arrow-up-right',
  'briefcase',
  'building',
  'building-2',
  'bus',
  'calendar',
  'car',
  'chart-column',
  'check',
  'chevron-down',
  'chevron-right',
  'circle-check-big',
  'clipboard-check',
  'clock',
  'dollar-sign',
  'download',
  'droplet',
  'external-link',
  'factory',
  'file-text',
  'flag',
  'flask-conical',
  'folder',
  'git-branch',
  'globe',
  'graduation-cap',
  'heart-handshake',
  'house',
  'info',
  'landmark',
  'layers',
  'leaf',
  'library',
  'life-buoy',
  'lightbulb',
  'mail',
  'map',
  'map-pin',
  'megaphone',
  'menu',
  'newspaper',
  'paw-print',
  'pen-line',
  'phone',
  'play',
  'rocket',
  'search',
  'send',
  'shield-check',
  'sparkles',
  'sprout',
  'star',
  'trash',
  'triangle-alert',
  'users',
  'wifi',
  'x',
  'zap',
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(root, 'node_modules/lucide-static/icons');
const out = resolve(root, 'dist/icons');
mkdirSync(out, { recursive: true });

// Remove icons no longer in the curated list (keeps dist/ == the list).
for (const f of readdirSync(out)) {
  if (f.endsWith('.svg') && !ICONS.includes(f.replace(/\.svg$/, ''))) {
    unlinkSync(resolve(out, f));
    console.log(`removed stale icon: ${f}`);
  }
}

let missing = 0;
for (const name of ICONS) {
  try {
    copyFileSync(resolve(srcDir, `${name}.svg`), resolve(out, `${name}.svg`));
  } catch {
    console.error(`MISSING in lucide-static: ${name}`);
    missing++;
  }
}
if (missing) process.exit(1);
console.log(`Copied ${ICONS.length} curated Lucide icon(s) to dist/icons/`);
