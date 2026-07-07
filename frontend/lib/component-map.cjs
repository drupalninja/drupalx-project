/**
 * Build a map of SDC component machine-name -> twig path (relative to the
 * components/ root), by scanning the theme's components/ directory. Components
 * are nested at varying depths (button/button.twig,
 * card/card_text/card_text.twig, layout/three_column/three_column.twig), so we
 * resolve by the <name>.twig filename whose parent directory is <name> —
 * matching Drupal's SDC discovery, where a component id is just its machine
 * name regardless of location.
 */
const fs = require('fs');
const path = require('path');

// The theme's components/ dir — resolved from DRUPALX_THEME_PATH (see
// lib/theme-paths.cjs), not a hard-coded relative path, so this frontend can
// live outside the theme repo.
const { componentsDir: componentsRoot } = require('./theme-paths.cjs');

function buildMap(root) {
  const map = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.twig')) {
        const base = path.basename(entry.name, '.twig');
        if (path.basename(dir) === base) {
          map[base] = path.relative(root, full).split(path.sep).join('/');
        }
      }
    }
  };
  walk(root);
  return map;
}

module.exports = { componentMap: buildMap(componentsRoot), componentsRoot };
