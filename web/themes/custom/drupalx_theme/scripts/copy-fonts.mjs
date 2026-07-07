/**
 * Copies the self-hosted variable webfonts from @fontsource-variable into
 * dist/fonts/. The @font-face rules live in src/css/fonts.css (hand-authored —
 * fontsource's own CSS uses relative ./files/ URLs that don't survive our
 * dist layout). dist/fonts is COMMITTED so Drupal renders with no node build.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist/fonts');
mkdirSync(out, { recursive: true });

const FONTS = [
  '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2',
  '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2',
  '@fontsource-variable/fraunces/files/fraunces-latin-ext-wght-normal.woff2',
];

for (const rel of FONTS) {
  const src = resolve(root, 'node_modules', rel);
  const dest = resolve(out, rel.split('/').pop());
  copyFileSync(src, dest);
  console.log(`font: ${rel.split('/').pop()}`);
}
console.log(`Copied ${FONTS.length} font file(s) to dist/fonts/`);
