/**
 * Generic data-driven component-tree renderer.
 *
 * A page is authored as a list of component nodes:
 *   { component: 'heading', props: { title: '...' } }
 *   { component: 'three_column', props: {...},
 *     slots: { column_1: [ ...nodes ], column_2: [...] } }
 *
 * This is the same information a Canvas page stores (component_id + inputs +
 * parent_uuid/slot), so pages authored as data mirror what editors compose in
 * the Canvas editor.
 *
 * For each node we generate a tiny Twig source string and render it with Twing:
 *  - leaf component:  {% include '@dx/<name>' with <props> only %}
 *  - slotted component: {% embed '@dx/<name>' with <props> only %}
 *                         {% block <slot> %}<pre-rendered children HTML>{% endblock %}
 *                       {% endembed %}
 * Slot children are rendered first (recursively) and injected as raw HTML, so we
 * never have to hand-write per-component embed code.
 */
const { attributes } = require('./attributes.cjs');

let environment;

function setEnvironment(env) {
  environment = env;
}

function renderTree(nodes) {
  if (!Array.isArray(nodes)) return '';
  return nodes.map(renderNode).join('\n');
}

// Make raw HTML safe to embed literally inside a generated Twig template:
// render it from a one-off var rather than inlining (avoids Twig parsing the
// child markup). We pass slot HTML in via the render context.
function renderNode(node) {
  if (!node || !node.component) return '';

  const tpl = `@dx/${node.component}`;
  const ctx = { __props: node.props || {}, attributes: attributes() };

  const slots = node.slots || {};
  const slotNames = Object.keys(slots);

  let source;
  if (slotNames.length === 0) {
    // Leaf: include with the props from __props. `only` isolates the component
    // context to exactly its props (+ attributes, which we add to __props).
    ctx.__props = { ...ctx.__props, attributes: ctx.attributes };
    source = `{% include '${tpl}' with __props only %}`;
  } else {
    // Slotted: embed and fill each block from a context var holding the
    // pre-rendered child HTML. We do NOT use `only` here so the slot_* vars
    // (and __props) remain visible inside the overridden blocks; the component
    // still reads its props from the merged context.
    ctx.__props = { ...ctx.__props, attributes: ctx.attributes };
    for (const name of slotNames) {
      ctx[`slot_${name}`] = renderTree(slots[name]);
    }
    const blocks = slotNames
      .map((name) => `{% block ${name} %}{{ slot_${name}|raw }}{% endblock %}`)
      .join('\n');
    // Spread __props into the embed context so the parent component sees its
    // props by name, while slot_* vars stay in scope for the blocks.
    source = `{% embed '${tpl}' with __props %}\n${blocks}\n{% endembed %}`;
  }

  return environment.createTemplate(source).render(ctx);
}

module.exports = { renderTree, setEnvironment };
