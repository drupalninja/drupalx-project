/**
 * Critical-CSS post-build step — the last mobile-perf lever.
 *
 * The full theme stylesheet (style.min.css, ~310KB) is render-blocking: on a
 * throttled mobile connection it pushes First Contentful Paint past 3.5s even
 * though it's minified and mostly used. This step, per page:
 *
 *   1. Extracts the ABOVE-THE-FOLD critical CSS with penthouse (real render at
 *      a mobile viewport), inlines it in a <style> in <head>.
 *   2. Defers the full stylesheets with the rel=preload → onload swap pattern
 *      (+ a <noscript> fallback), so they no longer block first paint.
 *
 * Result: the browser paints the header + hero from the small inline critical
 * block immediately, then swaps in the full CSS without a flash.
 *
 * Runs against a locally-served copy of dist/ (penthouse needs to resolve the
 * stylesheet URLs). Set SKIP_CRITICAL_CSS=1 to skip during fast iteration.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

let penthouse;
try {
  penthouse = require('penthouse');
} catch (e) {
  penthouse = null;
}

// Minimal static file server over dist/ so penthouse can fetch /css/*.css.
function serve(dist, port) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    if (!path.extname(p)) p += '.html';
    const file = path.join(dist, p);
    if (!file.startsWith(dist) || !fs.existsSync(file)) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

// The stylesheet <link>s we defer (full theme + section layer). brand.css is
// tiny (just --ps-* tokens) and must apply before the inline critical paints,
// so it stays a normal blocking link.
const DEFER_HREFS = ['/css/style.min.css', '/css/sections.min.css'];

async function inlineCriticalCss(dist) {
  if (!penthouse) {
    console.log('  (penthouse not installed — skipping critical CSS)');
    return;
  }
  const PORT = 4555;
  const server = await serve(dist, PORT);
  const cssFile = path.join(dist, 'css', 'style.min.css');
  const sectionsFile = path.join(dist, 'css', 'sections.min.css');
  const combinedCss =
    (fs.existsSync(cssFile) ? fs.readFileSync(cssFile, 'utf8') : '') +
    (fs.existsSync(sectionsFile) ? fs.readFileSync(sectionsFile, 'utf8') : '');

  const htmlFiles = fs.readdirSync(dist).filter((f) => f.endsWith('.html'));
  let done = 0;
  try {
    for (const file of htmlFiles) {
      const filePath = path.join(dist, file);
      let html = fs.readFileSync(filePath, 'utf8');
      const slug = file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, '');

      let critical = '';
      try {
        critical = await penthouse({
          url: `http://localhost:${PORT}${slug}`,
          cssString: combinedCss,
          width: 412,
          height: 823,
          timeout: 30000,
          puppeteer: { getBrowser: undefined },
        });
      } catch (e) {
        // If extraction fails for a page, leave it blocking (correct, just slower).
        console.log(`    (critical CSS failed for ${file}: ${e.message.slice(0, 60)})`);
        continue;
      }
      if (!critical || critical.length < 200) continue;

      // 1) Inline the critical CSS just before the first stylesheet link.
      const styleTag = `<style id="critical-css">${critical}</style>`;
      // 2) Defer the heavy stylesheets (preload swap + noscript fallback).
      for (const href of DEFER_HREFS) {
        const blockingRe = new RegExp(`<link rel="stylesheet" href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`, 'i');
        if (blockingRe.test(html)) {
          const deferred =
            `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
            `<noscript><link rel="stylesheet" href="${href}"></noscript>`;
          html = html.replace(blockingRe, deferred);
        }
      }
      // Inject the inline critical block right after <title> (early in head).
      html = html.replace(/(<\/title>)/i, `$1\n  ${styleTag}`);
      fs.writeFileSync(filePath, html);
      done++;
    }
  } finally {
    server.close();
  }
  console.log(`  ✓ inlined critical CSS + deferred full stylesheet on ${done} page(s)`);
}

module.exports = { inlineCriticalCss };
