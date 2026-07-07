/**
 * Component library (kitchen sink) — EVERY component once. Used by the
 * static↔Drupal parity check; not linked from the nav.
 */
const {
  img, button, heading, icon, image, divider, spacer,
  hero, pageHero, statBand, stat, cardGrid, card, split, cta, richtext,
  quote, gallery, accordion, accordionItem, alert, newsCard, eventCard, docItem, docList,
} = require('./_helpers.cjs');

const P = {
  a: img('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600&q=80', 'City street at dusk', 1600, 1067),
  b: img('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80', 'Skyline aerial view', 1600, 1067),
  c: img('https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80', 'Team collaborating', 1200, 800),
};

module.exports = {
  title: 'Component library',
  description: 'Every DrupalX Canvas component, once — the parity-check page.',
  components: [
    alert('<p>This is the kitchen-sink page — every component renders here once.</p>', { tone: 'info', id: 'kitchen-sink' }),
    hero({
      eyebrow: 'Component library',
      title: 'Every component, on one page',
      body: 'Glass hero, stat band, cards, splits, galleries, accordions — the whole set.',
      image: P.b,
      style: 'glass',
      height: 'short',
      buttons: [button('Primary', '/', { variant: 'glass', icon: 'chevron-right' })],
    }),
    pageHero('Page hero (light)', { eyebrow: 'Inner pages', lede: 'The inner-page banner.', tone: 'light' }),
    heading('Heading primitive', { eyebrow: 'With an eyebrow', style: 'title' }),
    spacer('sm'),
    { component: 'icon', props: { name: 'sparkles', size: 'lg' } },
    divider(),
    image(P.a.src, P.a.alt, { aspect: '16x9', frame: 'offset-accent', caption: 'Image primitive with offset-accent frame.' }),
    statBand(
      [stat('98%', 'satisfaction'), stat('42', 'components', 'sky'), stat('7', 'days to launch', 'clay'), stat('AA', 'accessibility', 'accent')],
      { eyebrow: 'Stat band', title: 'Numbers as graphic', tone: 'dark', columns: '4' },
    ),
    cardGrid(
      [
        card({ title: 'Featured card', body: 'featured_first makes this one span two columns.', url: '/', image: P.c, c: 'none' }),
        card({ title: 'Icon card (sky)', body: 'Icon-led with a wayfinding chip.', url: '/', icon: 'map', c: 'sky' }),
        card({ title: 'Icon card (clay)', body: 'Same card, clay family.', url: '/', icon: 'leaf', c: 'clay' }),
      ],
      { eyebrow: 'Card grid', title: 'spark-card rollovers', columns: '3', featured: true },
    ),
    cardGrid(
      [
        newsCard({ title: 'News card', date: 'Jul 4, 2026', summary: 'Dated, image-led teaser.', url: '/', image: P.a }),
        eventCard({ title: 'Event card', month: 'AUG', day: '02', time: '9:00 AM', location: 'Main Hall', url: '/', c: 'sky' }),
      ],
      { eyebrow: 'Dated cards', title: 'News & events', columns: '2' },
    ),
    split({
      eyebrow: 'Split',
      title: 'Text beside media',
      body: '<p>Alternate <code>media_side</code> to zig-zag down the page.</p>',
      image: P.c,
      side: 'left',
      tone: 'tint',
      buttons: [button('Ghost button', '/', { variant: 'ghost', icon: 'none' })],
    }),
    quote('<p>A pull-quote with an oversized serif mark and attribution.</p>', { attribution: 'Alex Rivera', role: 'Product Lead' }),
    gallery(
      [
        image(P.a.src, P.a.alt, { aspect: 'square', caption: 'Square crop' }),
        image(P.b.src, P.b.alt, { aspect: 'square', caption: 'Another square' }),
        image(P.c.src, P.c.alt, { aspect: 'square', caption: 'Third square' }),
      ],
      { eyebrow: 'Gallery', title: 'Captioned image grid', columns: '3' },
    ),
    accordion(
      [
        accordionItem('First question, open by default', '<p>Native details/summary — zero JS.</p>', true),
        accordionItem('Second question', '<p>Answer two.</p>'),
      ],
      { eyebrow: 'Accordion', title: 'Disclosure list' },
    ),
    docList(
      [
        docItem({ title: 'Annual report', filetype: 'pdf', url: '/', meta: 'PDF · 2.4 MB' }),
        docItem({ title: 'Budget worksheet', filetype: 'xls', url: '/', meta: 'XLS · 300 KB' }),
      ],
      { eyebrow: 'Documents', title: 'Document list', moreLabel: 'Browse all documents', moreUrl: '/' },
    ),
    richtext('<h2>Rich text</h2><p>Editorial prose with the typography plugin. <a href="/">Links</a>, <strong>bold</strong>, and lists:</p><ul><li>One</li><li>Two</li></ul>', { width: 'prose' }),
    cta({
      eyebrow: 'CTA',
      title: 'The one dark ask',
      body: 'Accent and glass buttons both read on the brand-glow band.',
      buttons: [button('Accent', '/', { variant: 'accent' }), button('Glass', '/', { variant: 'glass', icon: 'none' })],
    }),
  ],
};
