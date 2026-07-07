/**
 * About — page hero → richtext → quote → light stat band → split.
 */
const { img, pageHero, richtext, quote, statBand, stat, split, button } = require('./_helpers.cjs');

module.exports = {
  title: 'About',
  description: 'Who we are and how the DrupalX Canvas starter came to be.',
  components: [
    pageHero('Who we are', {
      eyebrow: 'About',
      lede: 'A small team of Drupal engineers and designers who believe editors deserve pages as good as the demos.',
      image: img('https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80', 'Team collaborating at a table', 1920, 1280),
    }),
    richtext(
      `<h2>Editors first, always</h2>
       <p>Most component libraries look great in the pattern library and fall apart the first time an editor touches them. DrupalX Canvas starts from the opposite end: every component is designed as a <strong>Canvas edit form first</strong> — enums become selects, images use the media library, repeatable content is a slot of real nested components.</p>
       <p>The same twig renders a static preview site, so designers iterate in milliseconds and stakeholders review a real URL — then the identical pages land in Drupal, fully editable.</p>`,
    ),
    quote('<p>The static preview sold the design; Canvas sold the CMS. Same components, no re-build in between.</p>', {
      attribution: 'Jordan Blake',
      role: 'Communications Director',
    }),
    statBand(
      [
        stat('2019', 'building decoupled Drupal', 'none'),
        stat('40+', 'launches on this stack', 'sky'),
        stat('95+', 'median Lighthouse performance', 'clay'),
      ],
      { tone: 'light', columns: '3' },
    ),
    split({
      eyebrow: 'How it works',
      title: 'The bridge, in one sentence',
      body: '<p>Pages are component trees in data files; the bridge converts each tree into Canvas page YAML with deterministic UUIDs and imports it — so a re-push <em>updates</em> pages instead of duplicating them.</p>',
      image: img('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80', 'Notebook and laptop on a desk', 1600, 1067),
      side: 'left',
      tone: 'tint',
      buttons: [button('See the components', '/sections', { variant: 'primary' })],
    }),
  ],
};
