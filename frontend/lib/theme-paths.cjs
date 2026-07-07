/**
 * theme-paths — the single source of truth for WHERE the Drupal theme lives.
 *
 * This frontend is VENDORED inside the drupalx-canvas repo, so the theme
 * resolves by default to the sibling web/themes/custom/drupalx_theme — no
 * .env needed. Set DRUPALX_THEME_PATH (env or .env) only to point at a
 * different checkout.
 *
 * Everything the build scripts need to reach into the theme
 * resolves through the exports below.
 */
const fs = require('fs');
const path = require('path');

// --- load .env (minimal parser; no dependency) -----------------------------
(function loadDotEnv() {
  const envFile = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envFile)) return;
  for (const raw of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
})();

// --- resolve the theme root ------------------------------------------------
function resolveThemeRoot() {
  const raw = process.env.DRUPALX_THEME_PATH
    // Single-repo default: frontend/ and web/ are siblings at the repo root.
    || path.resolve(__dirname, '..', '..', 'web', 'themes', 'custom', 'drupalx_theme');
  const expanded = raw.startsWith('~')
    ? path.join(require('os').homedir(), raw.slice(1))
    : raw;
  const themeRoot = path.resolve(expanded);
  if (!fs.existsSync(path.join(themeRoot, 'components'))) {
    throw new Error(
      `Theme root does not look like drupalx_theme (no components/ dir):\n  ${themeRoot}\n` +
        'Set DRUPALX_THEME_PATH if your theme lives elsewhere.',
    );
  }
  return themeRoot;
}

const themeRoot = resolveThemeRoot();

module.exports = {
  /** The Drupal theme root (…/themes/custom/drupalx_theme). */
  themeRoot,
  /** The SDC source of truth the static build renders. */
  componentsDir: path.join(themeRoot, 'components'),
  /** Committed build artifacts the static build copies into dist/. */
  distDir: path.join(themeRoot, 'dist'),
  /** Where `npm run manifest` writes the generated component reference. */
  componentsMd: path.join(themeRoot, 'COMPONENTS.md'),
  /**
   * The recipe's Canvas component configs — which SDCs are registered (have a
   * canvas.component.sdc.* config → pushable/editable). `_schema.cjs` reads
   * these. Default: the sibling recipes/drupalx_canvas/config at the repo
   * root. Override with DRUPALX_RECIPE_CONFIG_PATH if your layout differs.
   */
  recipeConfigDir:
    process.env.DRUPALX_RECIPE_CONFIG_PATH
      ? path.resolve(process.env.DRUPALX_RECIPE_CONFIG_PATH)
      : path.resolve(__dirname, '..', '..', 'recipes', 'drupalx_canvas', 'config'),
};
