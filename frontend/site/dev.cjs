/**
 * Live-reload dev server for the frontend-first workflow (`npm run dev`).
 *
 * Serves the data pages and rebuilds + reloads the browser on change — no
 * Drupal in the loop. Watches:
 *   - site/pages-data/*.cjs + site/pages.config.cjs  (the page definitions)
 *   - pages/* (the layout twig)
 *   - <theme>/components/** and <theme>/templates/** (component + partial twig)
 *   - <theme>/src/**  (Tailwind input CSS + global.js)
 * A twig/data/css change re-runs the theme's Tailwind CLI build FIRST (twig
 * edits change Tailwind's scanned class set — ~100ms), then the static build,
 * then pings connected browsers over a websocket to reload.
 *
 * Run: npm run dev    (preloads lib/node-compat.cjs like the other tools)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const chokidar = require('chokidar');
const { WebSocketServer } = require('ws');

const { build, DIST } = require('./build.cjs');
const { validatePages } = require('./validate.cjs');
const { themeRoot: THEME } = require('../lib/theme-paths.cjs');

const PORT = process.env.PORT ? Number(process.env.PORT) : 5050;

// ---- Cache busting: drop the page definitions from require cache so a rebuild
//      reflects edits to data files / pages.config / helpers. ----
function bustPageCaches() {
  for (const id of Object.keys(require.cache)) {
    if (
      id.includes(`${path.sep}site${path.sep}pages-data${path.sep}`) ||
      id.endsWith(`${path.sep}site${path.sep}pages.config.cjs`)
    ) {
      delete require.cache[id];
    }
  }
}

// ---- Tailwind CSS rebuild (the theme's real build — same output Drupal
//      loads). Runs the @tailwindcss/cli from the THEME's node_modules. ----
const TW_BIN = path.resolve(THEME, 'node_modules/.bin/tailwindcss');
function compileCss() {
  if (!fs.existsSync(TW_BIN)) {
    console.warn('  (tailwindcss CLI not found — run `npm install` in the theme dir; skipping CSS rebuild)');
    return;
  }
  execFileSync(
    TW_BIN,
    ['-i', 'src/css/global.css', '-o', 'dist/css/global.css', '--minify'],
    { cwd: THEME, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  // Keep dist/js in sync too (trivial copy).
  fs.copyFileSync(path.join(THEME, 'src/js/global.js'), path.join(THEME, 'dist/js/global.js'));
}

// ---- Rebuild (recompiling CSS first — twig/data edits change the class set) ----
let building = false;
function rebuild({ css = true } = {}) {
  if (building) return;
  building = true;
  const t0 = Date.now();
  try {
    if (css) compileCss();
    bustPageCaches();
    build();
    // Static Drupal/Canvas-compat check — warn (don't break the loop) so you
    // see enum/required/slot issues live.
    try {
      const { pages } = require('./pages.config.cjs');
      const { errors } = validatePages(pages.filter((p) => p.data));
      if (errors.length) {
        console.warn(`  ⚠ ${errors.length} Drupal-compat issue(s) (run \`npm run validate\` for the list):`);
        for (const e of errors.slice(0, 5)) console.warn('     - ' + e);
        if (errors.length > 5) console.warn(`     … and ${errors.length - 5} more`);
      }
    } catch (_) { /* validation is best-effort in the dev loop */ }
    console.log(`  ↻ rebuilt in ${Date.now() - t0}ms`);
    broadcast('reload');
  } catch (err) {
    console.error('  ✗ build error:\n', err.message || err);
    broadcast('error');
  } finally {
    building = false;
  }
}

// ---- Tiny live-reload client injected into served HTML ----
const RELOAD_SNIPPET = `
<script>
(function(){
  function connect(){
    var ws = new WebSocket('ws://' + location.host + '/__livereload');
    ws.onmessage = function(e){ if (e.data === 'reload') location.reload(); };
    ws.onclose = function(){ setTimeout(connect, 1000); };
  }
  connect();
})();
</script>`;

// ---- Static file server (serves dist/, clean URLs, injects reload snippet) ----
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};
function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/') p = '/index.html';
  let file = path.join(DIST, p);
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html'; // clean URLs
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  return file;
}
const server = http.createServer((req, res) => {
  const file = resolveFile(req.url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404</h1><p>No such page in dist/. Is it registered in pages.config.cjs?</p>' + RELOAD_SNIPPET);
    return;
  }
  const ext = path.extname(file);
  if (ext === '.html') {
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace('</body>', RELOAD_SNIPPET + '\n</body>');
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    res.end(html);
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// ---- WebSocket for reloads ----
const wss = new WebSocketServer({ server, path: '/__livereload' });
function broadcast(msg) {
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

// ---- Watchers ----
const watchOpts = { ignoreInitial: true, ignored: /node_modules|[\\/]dist[\\/]|\.git/ };
chokidar
  .watch([
    path.resolve(__dirname, 'pages-data'),
    path.resolve(__dirname, 'pages.config.cjs'),
    path.resolve(__dirname, '..', 'pages'),
    path.resolve(THEME, 'components'),
    path.resolve(THEME, 'templates'),
    path.resolve(THEME, 'src'),
  ], watchOpts)
  .on('all', (event, file) => {
    console.log(`  • ${event} ${path.relative(THEME, file)}`);
    rebuild();
  });

// ---- Start: build once, listen ----
console.log('DrupalX Canvas — dev server starting…');
rebuild();
server.listen(PORT, () => {
  console.log(`\n  ➜  http://localhost:${PORT}\n  Watching pages-data, pages, components, templates, src. Ctrl-C to stop.\n`);
});
