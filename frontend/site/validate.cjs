/**
 * Static validator — proves a data page is Drupal/Canvas-compatible WITHOUT
 * touching Drupal. Run: `npm run validate` (or `validate <page.cjs>`).
 *
 * For every component node in every registered data page, checks against the SDC
 * schemas (site/_schema.cjs):
 *   - the component exists and is REGISTERED (has a canvas.component config → pushable)
 *   - every required prop is present
 *   - enum props use a valid value (Canvas validates these strictly)
 *   - slot names are valid for that component
 *   - image/link/rich-text props are in the PLAIN data form the bridge expects
 *     (e.g. image = {src,...}, not pre-wrapped; rich-text = a string, not {value,format})
 *
 * Exit code is non-zero if any errors are found, so it can gate the build.
 */
const path = require('path');
const { readSchemas } = require('./_schema.cjs');

const schemas = readSchemas();

// Validate the given pages ([{slug, data}]). Returns { errors, warnings } —
// does NOT exit, so the dev server can call it non-fatally.
function validatePages(toCheck) {
  const errors = [];
  const warnings = [];
  const check = makeCheck(errors, warnings);
  for (const page of toCheck) {
    let data;
    try {
      delete require.cache[require.resolve(`./pages-data/${page.data}`)];
      data = require(`./pages-data/${page.data}`);
    } catch (e) {
      errors.push(`${page.data}: failed to load (${e.message})`);
      continue;
    }
    (data.components || []).forEach((node, i) => check(node, `${page.slug}.cjs[${i}]`));
  }
  return { errors, warnings };
}

function makeCheck(errors, warnings) {
  return function check(node, where) {
  if (!node || typeof node !== 'object' || !node.component) {
    errors.push(`${where}: node is missing a "component" name`);
    return;
  }
  const name = node.component;
  const def = schemas[name];
  if (!def) {
    errors.push(`${where}: unknown component "${name}" (no component.yml found)`);
    return;
  }
  if (!def.registered) {
    errors.push(`${where}: component "${name}" is NOT registered for Canvas (no canvas.component.sdc.drupalx_theme.${name}.yml in the recipe)`);
  }

  const props = node.props || {};

  // Required props present.
  for (const [pn, spec] of Object.entries(def.props)) {
    if (spec.required && !(pn in props)) {
      errors.push(`${where} [${name}]: missing required prop "${pn}"`);
    }
  }

  // Per-prop checks.
  for (const [pn, val] of Object.entries(props)) {
    const spec = def.props[pn];
    if (!spec) {
      warnings.push(`${where} [${name}]: unknown prop "${pn}" (not in component.yml)`);
      continue;
    }
    if (spec.enum && val != null) {
      // Boolean enums are commonly authored as the strings 'true'/'false' (the
      // twig checks `== 'true'`), which Canvas tolerates — compare stringified.
      const allowed = spec.enum.map(String);
      if (!allowed.includes(String(val))) {
        errors.push(`${where} [${name}].${pn}: "${val}" is not a valid enum value. Allowed: ${spec.enum.join(' | ')}`);
      }
    }
    if (spec.kind === 'image' && val != null) {
      if (typeof val !== 'object' || !val.src) {
        errors.push(`${where} [${name}].${pn}: image prop must be a plain { src, alt, width, height } object (use the img() helper)`);
      }
    }
    if (spec.kind === 'link' && val != null && typeof val !== 'string') {
      errors.push(`${where} [${name}].${pn}: link/url prop must be a plain string in data (the bridge wraps it), got ${typeof val}`);
    }
    if (spec.kind === 'richtext' && val != null && typeof val !== 'string') {
      errors.push(`${where} [${name}].${pn}: rich-text prop must be a plain HTML string (use rt()), not ${typeof val} — pre-wrapping renders [object Object]`);
    }
  }

  // Slots: names must be declared by the component; children recurse.
  const slots = node.slots || {};
  for (const [slotName, children] of Object.entries(slots)) {
    if (!def.slots.includes(slotName)) {
      errors.push(`${where} [${name}]: unknown slot "${slotName}". Valid slots: ${def.slots.join(', ') || '(none)'}`);
    }
    (children || []).forEach((child, i) => check(child, `${where} > ${slotName}[${i}]`));
    }
  };
}

module.exports = { validatePages, schemas };

// CLI: validate one page (arg) or all data pages in pages.config, and exit
// non-zero on errors (so it can gate the build).
if (require.main === module) {
  const arg = process.argv[2];
  const toCheck = arg
    ? [{ slug: path.basename(arg, '.cjs'), data: path.basename(arg) }]
    : require('./pages.config.cjs').pages.filter((p) => p.data);

  const { errors, warnings } = validatePages(toCheck);

  if (warnings.length) {
    console.warn(`\n⚠️  ${warnings.length} warning(s):`);
    for (const w of warnings) console.warn('  - ' + w);
  }
  if (errors.length) {
    console.error(`\n✗ ${errors.length} validation error(s) — these components will not work in Canvas:`);
    for (const e of errors) console.error('  - ' + e);
    console.error('\nFix these before using the components in Drupal.\n');
    process.exit(1);
  }
  console.log(`\n✓ All data pages are Drupal/Canvas-compatible (${toCheck.length} page(s) checked, 0 errors).\n`);
}
