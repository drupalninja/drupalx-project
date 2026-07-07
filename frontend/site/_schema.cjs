/**
 * Shared component-schema reader. Scans the theme's components/, parses each
 * .component.yml, and returns a normalized map used by both the validator
 * (site/validate.cjs) and the manifest generator (site/gen-manifest.cjs).
 *
 * For each component: its props (type/enum/required/kind), its slots, and whether
 * it's REGISTERED in the recipe (canvas.component.sdc.drupalx_theme.<name>.yml) —
 * i.e. pushable to Canvas. Single source so the docs + validation never drift
 * from the actual SDC schemas.
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { componentMap, componentsRoot } = require('../lib/component-map.cjs');
// The recipe's Canvas component configs — resolved from DRUPALX_THEME_PATH
// (lib/theme-paths.cjs derives the recipe dir next to the theme, or honors
// DRUPALX_RECIPE_CONFIG_PATH), not a fixed relative climb.
const { recipeConfigDir: CONFIG_DIR } = require('../lib/theme-paths.cjs');

// Classify a prop's "kind" from its JSON-schema spec — the same logic the bridge
// uses to decide how to wrap it for Canvas. Authors care about this because the
// plain-form they write in data differs by kind.
function propKind(spec) {
  if (!spec || typeof spec !== 'object') return 'unknown';
  const ref = spec.$ref || '';
  if (spec.contentMediaType === 'text/html' || spec['x-formatting-context']) return 'richtext';
  if (ref.endsWith('canvas.module/image')) return 'image';
  if (spec.format === 'uri-reference') return 'link';
  return spec.type || 'string';
}

function registeredComponents() {
  const set = new Set();
  if (!fs.existsSync(CONFIG_DIR)) return set;
  for (const f of fs.readdirSync(CONFIG_DIR)) {
    const m = f.match(/^canvas\.component\.sdc\.drupalx_theme\.(.+)\.yml$/);
    if (m) set.add(m[1]);
  }
  return set;
}

// name -> { name, registered, props: { name: {type, kind, enum, required} }, slots: [] }
function readSchemas() {
  const registered = registeredComponents();
  const out = {};
  for (const [name, rel] of Object.entries(componentMap)) {
    const ymlPath = path.join(componentsRoot, rel.replace(/\.twig$/, '.component.yml'));
    let schema = {};
    try {
      schema = yaml.load(fs.readFileSync(ymlPath, 'utf8')) || {};
    } catch (e) {
      // No schema file -> still record the component (props unknown).
    }
    const props = (schema.props && schema.props.properties) || {};
    const required = (schema.props && schema.props.required) || [];
    const normProps = {};
    for (const [pn, spec] of Object.entries(props)) {
      normProps[pn] = {
        kind: propKind(spec),
        enum: spec && spec.enum ? spec.enum : null,
        required: required.includes(pn),
        title: (spec && spec.title) || '',
      };
    }
    out[name] = {
      name,
      registered: registered.has(name),
      props: normProps,
      slots: Object.keys((schema && schema.slots) || {}),
    };
  }
  return out;
}

module.exports = { readSchemas, propKind, registeredComponents };
