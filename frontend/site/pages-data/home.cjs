/**
 * Home — the bold-design composition: light editorial split hero (photo card
 * + offset frame + stat chip) → dark big-number proof band → wayfinding card
 * grid (sky/clay/accent) → split (zig) → dark CTA. Alternating backgrounds,
 * one full-bleed dark band, asymmetry ×2 — per the bold-design directives.
 */
const { img, button, hero, statBand, stat, cardGrid, card, split, cta } = require('./_helpers.cjs');

// Royalty-free placeholder photography (Unsplash) — swap per engagement.
const PHOTOS = {
  hero: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80',
  planning: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1600&q=80',
};

module.exports = {
  title: 'Home',
  description:
    'DrupalX Canvas starter — one Tailwind component library rendered as a static site and as editable Drupal Canvas pages.',
  components: [
    hero({
      eyebrow: 'DrupalX Canvas starter',
      title: 'One component library, two render targets',
      body: 'Author pages as data, preview them instantly as a static site, then push the same pages into Drupal Canvas — where editors compose with the very same components.',
      image: img(PHOTOS.hero, 'City skyline at dusk', 1920, 1280),
      style: 'split',
      height: 'medium',
      statChip: { number: '20+', label: 'Canvas-ready components' },
      buttons: [
        button('Explore the components', '/sections', { variant: 'primary' }),
        button('How it works', '/about', { variant: 'ghost', icon: 'none' }),
      ],
    }),

    statBand(
      [
        stat('20+', 'SDC components'),
        stat('2', 'render targets, one source'),
        stat('100%', 'editable in Canvas'),
        stat('0', 'CDN dependencies'),
      ],
      { tone: 'dark', columns: '4' },
    ),

    cardGrid(
      [
        card({
          title: 'Design in the browser',
          body: 'A live-reload static preview with no Drupal in the loop — components rebuild in milliseconds.',
          url: '/services',
          icon: 'lightbulb',
          c: 'sky',
          more: 'See the workflow',
        }),
        card({
          title: 'Push to Canvas',
          body: 'The same data pages import as real, editable Canvas pages — deterministic UUIDs keep re-pushes idempotent.',
          url: '/services',
          icon: 'sparkles',
          c: 'clay',
          more: 'About the bridge',
        }),
        card({
          title: 'Editors own the pages',
          body: 'Every prop is a Canvas form field: enums become selects, images use the media library, slots nest components.',
          url: '/about',
          icon: 'users',
          c: 'accent',
          more: 'Meet the editor',
        }),
      ],
      {
        eyebrow: 'What you get',
        title: 'A starter that ships working pages',
        lede: 'Every card, band, and hero on this page is a Single-Directory Component — the same twig renders here and in Drupal.',
        columns: '3',
      },
    ),

    split({
      eyebrow: 'The pipeline',
      title: 'Author once, render everywhere',
      body: '<p>Pages are component trees in plain data files. The static build renders them with Twing for instant preview and deploys anywhere — and the identical twig components power the pages your editors compose in Drupal Canvas.</p>',
      image: img(PHOTOS.planning, 'Team planning around a whiteboard', 1600, 1067),
      side: 'right',
      buttons: [button('Read the docs', '/about', { variant: 'primary' })],
    }),

    cta({
      eyebrow: 'Get started',
      title: 'Spin up your own Canvas site today',
      body: 'Clone the template, run ddev install, and start composing pages from the component library.',
      buttons: [
        button('Get in touch', '/contact', { variant: 'accent' }),
        button('Component library', '/sections', { variant: 'glass', icon: 'chevron-right' }),
      ],
    }),
  ],
};
