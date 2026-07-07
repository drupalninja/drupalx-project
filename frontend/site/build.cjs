/**
 * Static site generator for the DrupalX Canvas starter.
 *
 * Uses the shared Twing environment (lib/environment.js: shims, @dx /
 * @drupalx_theme / @pages / @shims namespaces, component-name resolution) to
 * render each page's component tree inside the shared layout, then writes
 * static HTML to dist/ and copies the theme's committed dist/ assets
 * (css/js/icons/fonts). The output is a pure static site, deployable to
 * Vercel with no server.
 *
 * Run:  npm run build:site   (which preloads lib/node-compat.cjs)
 */
const fs = require('fs');
const path = require('path');

const environment = require('../lib/environment.js');
const { attributes } = require('./attributes.cjs');
const { renderTree, setEnvironment } = require('./render-tree.cjs');

setEnvironment(environment);

const ROOT = path.resolve(__dirname, '..'); // frontend/
const { themeRoot: THEME, distDir: THEME_DIST } = require('../lib/theme-paths.cjs');
const DIST = path.resolve(ROOT, 'dist');
// Canonical/OG/sitemap base. Set BASE_URL per engagement (the deployed
// domain); no trailing slash.
const BASE_URL = (process.env.BASE_URL || 'https://demo.example.com').replace(/\/$/, '');

function render(template, context) {
  return environment.render(template, context);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function build() {
  // Re-require the page list each build so the dev server picks up edits
  // (the dev server busts its require cache before calling us).
  const { pages, nav, site } = require('./pages.config.cjs');
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Same-origin font preloads for the two variable faces (the @font-face
  // rules are compiled into the theme's global.css; files live in
  // dist/fonts/, copied below with the rest of the theme dist).
  const fontLinks = [
    'inter-latin-wght-normal.woff2',
    'fraunces-latin-wght-normal.woff2',
  ]
    .filter((f) => fs.existsSync(path.join(THEME_DIST, 'fonts', f)))
    .map((f) => `<link rel="preload" href="/fonts/${f}" as="font" type="font/woff2" crossorigin>`)
    .join('\n  ');

  // 1) For each page: render its component tree, wrap in the shared layout.
  for (const page of pages) {
    if (!page.data) continue;
    const data = require(`./pages-data/${page.data}`);
    const content = renderTree(data.components);

    const description = data.description || (site && site.footer && site.footer.blurb) || '';
    const canonical = `${BASE_URL}${page.slug === 'index' ? '/' : '/' + page.slug}`;

    const html = render('@pages/_layout.twig', {
      title: page.title,
      nav,
      site: site || {},
      description,
      canonical,
      og_image: (site && site.ogImage) || '',
      font_links: fontLinks,
      is_front: page.slug === 'index',
      content,
      attributes: attributes(),
    });
    const outFile = path.join(DIST, `${page.slug === 'index' ? 'index' : page.slug}.html`);
    fs.writeFileSync(outFile, html);
    console.log(`  ✓ ${path.relative(process.cwd(), outFile)}`);
  }

  // 1b) sitemap.xml + robots.txt — basic SEO essentials.
  const sitemapUrls = pages
    .filter((p) => p.data)
    .map((p) => `  <url><loc>${BASE_URL}${p.slug === 'index' ? '/' : '/' + p.slug}</loc></url>`)
    .join('\n');
  fs.writeFileSync(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`,
  );
  fs.writeFileSync(
    path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`,
  );

  // 2) Copy the theme's committed dist/ (css/js/icons/fonts) — the SAME
  //    compiled assets Drupal loads — plus the logo and any static extras.
  copyDir(path.join(THEME_DIST, 'css'), path.join(DIST, 'css'));
  copyDir(path.join(THEME_DIST, 'js'), path.join(DIST, 'js'));
  copyDir(path.join(THEME_DIST, 'icons'), path.join(DIST, 'icons'));
  copyDir(path.join(THEME_DIST, 'fonts'), path.join(DIST, 'fonts'));
  for (const f of ['logo.svg']) {
    const src = path.join(THEME, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST, f));
  }
  copyDir(path.resolve(ROOT, 'static'), DIST);
}

module.exports = { build, DIST };

if (require.main === module) {
  build().then(() => console.log(`\nBuilt static site in ${DIST}\n`));
}
