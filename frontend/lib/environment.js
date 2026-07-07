/* eslint-disable camelcase, max-len */
/* global require, __dirname, module */

/**
 * Shared Twing environment for rendering drupalx_theme SDC components in the
 * static build (site/build.cjs, dev.cjs) — the single
 * Node-side render resolver for the whole pipeline.
 *
 * The component .twig files are the same Single-Directory Components Drupal/
 * Canvas use, so a few Drupal-specific Twig features are shimmed here for
 * Twing to compile them:
 *  - the `@dx` namespace so `drupalx_theme:button` style SDC ids resolve,
 *  - the `@drupalx_theme` namespace mirroring Drupal's auto-registered
 *    theme-root namespace (shared partials + `source()` icon paths resolve
 *    identically in BOTH targets),
 *  - an `attributes` object stub supporting the chainable .addClass() etc.,
 *  - no-op `attach_library`, a passthrough `t` filter, and a `dx_image` stub
 *    (the real one is the dx_image Drupal module).
 */

// --- Node 23+ compat -------------------------------------------------------
// Twing 2.x/3.x call util.isNullOrUndefined(), which Node removed in v23.
// Restore it on the util module before Twing's compiler runs.
const util = require('util');
if (typeof util.isNullOrUndefined !== 'function') {
  util.isNullOrUndefined = (v) => v === null || v === undefined;
}

const path = require('path');
const {
  TwingEnvironment,
  TwingLoaderFilesystem,
  TwingFunction,
  TwingFilter,
} = require('twing');

const { themeRoot, componentsDir: componentsPath } = require('./theme-paths.cjs');

// Map of SDC machine-name -> twig path (built by scanning components/), so we
// resolve a bare component name to its real, possibly-nested file regardless of
// directory depth — exactly like Drupal SDC discovery.
let componentMap = {};
try {
  ({ componentMap } = require('./component-map.cjs'));
} catch (e) {
  componentMap = {};
}

// Normalize an SDC reference to a path the filesystem loader can find:
//   drupalx_theme:button  -> @dx/button/button.twig
//   @dx/heading           -> @dx/heading/heading.twig
//   canvas:image          -> @shims/image.twig
//   (anything else: unchanged)
function normalizeName(name) {
  if (typeof name !== 'string') return name;
  if (name === 'canvas:image') return '@shims/image.twig';

  // theme/module:component  (Drupal SDC id)
  const sdc = name.match(/^[a-z0-9_]+:([a-z0-9_-]+)$/);
  if (sdc && componentMap[sdc[1]]) return `@dx/${componentMap[sdc[1]]}`;

  // @dx/<name> shorthand -> @dx/<resolved nested path>
  const ns = name.match(/^@dx\/([a-z0-9_-]+)$/);
  if (ns && componentMap[ns[1]]) return `@dx/${componentMap[ns[1]]}`;

  return name;
}

// A filesystem loader that normalizes component names before resolving.
class DxLoader extends TwingLoaderFilesystem {
  getSourceContext(name, from) { return super.getSourceContext(normalizeName(name), from); }
  getCacheKey(name, from) { return super.getCacheKey(normalizeName(name), from); }
  exists(name, from) { return super.exists(normalizeName(name), from); }
  isFresh(name, time, from) { return super.isFresh(normalizeName(name), time, from); }
  resolve(name, from) { return super.resolve(normalizeName(name), from); }
}

const loader = new DxLoader(componentsPath);

if (typeof loader.addPath === 'function') {
  loader.addPath(componentsPath, 'dx');
  // shims + pages live in THIS repo (the static-build frontend).
  loader.addPath(path.resolve(__dirname, '../shims'), 'shims');
  loader.addPath(path.resolve(__dirname, '../pages'), 'pages');
  // Mirror Drupal's auto-registered theme namespace so shared partials AND
  // `source('@drupalx_theme/dist/icons/…')` resolve identically in BOTH
  // targets:  @drupalx_theme/components/_section/_section.twig
  loader.addPath(themeRoot, 'drupalx_theme');
}

const environment = new TwingEnvironment(loader, {
  autoescape: false,
  auto_reload: true,
});

// --- Drupal Twig shims ------------------------------------------------------
// This module/environment can be initialized more than once in a process;
// re-registering a function/filter throws ("already registered"). Guard each
// registration so it's idempotent.

const safe = (fn) => {
  try {
    fn();
  } catch (e) {
    if (!/already registered/i.test(String(e && e.message))) throw e;
  }
};

// attach_library() -> no-op. Return '' (NOT a Promise) so `{{ attach_library() }}`
// renders nothing in the raw-Node static build instead of "[object Promise]".
safe(() =>
  environment.addFunction(new TwingFunction('attach_library', () => '')),
);

// dx_image(image, sizes) -> no-op in the static build.
// In Drupal this resolves a managed file to a width-stepped WebP srcset (the
// dx_image module). The static build has no managed files / image styles, so
// it returns the EMPTY shape — `srcset: null` — and the section twigs fall
// back to the plain `<img src>`. The optimization is a pure ENHANCEMENT on
// the Drupal side and never breaks the static render.
safe(() =>
  environment.addFunction(
    new TwingFunction('dx_image', (image, sizes) =>
      Promise.resolve({
        srcset: null,
        sizes: sizes || '100vw',
        width: null,
        height: null,
      }),
    ),
  ),
);

// |t -> identity
safe(() => environment.addFilter(new TwingFilter('t', (str) => Promise.resolve(str))));

// |clean_class -> basic slug
safe(() =>
  environment.addFilter(
    new TwingFilter('clean_class', (str) =>
      Promise.resolve(String(str).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')),
    ),
  ),
);

// |render -> passthrough, but unwrap Drupal text-field objects { value, format }
// (rich-text props in the data format) to their HTML string.
safe(() =>
  environment.addFilter(
    new TwingFilter('render', (value) => {
      if (value === null || value === undefined) return Promise.resolve('');
      if (typeof value === 'object' && value !== null && 'value' in value) {
        return Promise.resolve(value.value);
      }
      return Promise.resolve(value);
    }),
  ),
);

module.exports = environment;
