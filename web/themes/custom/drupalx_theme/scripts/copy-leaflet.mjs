/**
 * Copies Leaflet's built CSS/JS (and the marker sprites its CSS references)
 * into dist/vendor/leaflet/. Same contract as copy-fonts.mjs: dist is
 * COMMITTED so Drupal renders with no node build, and nothing is ever loaded
 * from a CDN — the theme self-hosts every asset.
 *
 * leaflet.css resolves its sprites as url(images/…) RELATIVE TO ITSELF, so
 * the images directory has to sit beside the stylesheet. We ship them even
 * though section_map draws its pins as SVG divIcons: layers-control and the
 * default-icon fallback still reach for them, and a 404 in the network panel
 * on every map page is the kind of thing that gets re-debugged annually.
 */
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/leaflet/dist');
const out = resolve(root, 'dist/vendor/leaflet');
mkdirSync(resolve(out, 'images'), { recursive: true });

for (const f of ['leaflet.js', 'leaflet.css']) {
  copyFileSync(resolve(src, f), resolve(out, f));
  console.log(`leaflet: ${f}`);
}

const images = readdirSync(resolve(src, 'images'));
for (const f of images) {
  copyFileSync(resolve(src, 'images', f), resolve(out, 'images', f));
}
console.log(`Copied leaflet + ${images.length} sprite(s) to dist/vendor/leaflet/`);
