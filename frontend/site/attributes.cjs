/**
 * CommonJS Attribute stub for the static build (mirrors stories/_drupal.js).
 * Components call attributes.addClass(...) and print the object; it stringifies
 * to ` class="a b c"`.
 */
function attributes(initialClasses = []) {
  const classes = [];
  const add = (val) => {
    if (val === null || val === undefined || val === false || val === '') return;
    if (Array.isArray(val)) { val.forEach(add); return; }
    // Twing 3 passes Twig array/hash literals to functions as JS Map objects —
    // iterate their values (mirrors how Drupal's Attribute flattens a class array).
    if (val instanceof Map) { for (const v of val.values()) add(v); return; }
    if (typeof val !== 'string' && typeof val[Symbol.iterator] === 'function') {
      for (const v of val) add(v); return;
    }
    String(val).split(/\s+/).forEach((c) => { if (c) classes.push(c); });
  };
  add(initialClasses);
  const obj = {
    addClass(val) { add(val); return obj; },
    removeClass() { return obj; },
    setAttribute() { return obj; },
    toString() {
      return classes.length ? ` class="${[...new Set(classes)].join(' ')}"` : '';
    },
  };
  return obj;
}
module.exports = { attributes };
