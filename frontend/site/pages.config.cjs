/**
 * Declares the pages of the static site + the site-level brand. Each page maps
 * a DATA file (in pages-data/) to an output slug. `nav` + `site` drive the
 * shared chrome partials (the theme's templates/partials/_header + _footer) —
 * the SAME data contract drupalx_theme_preprocess_page() builds on the Drupal
 * side from the main menu + theme settings. Rebrand here; no template edits.
 *
 * Add a page = add a data file in pages-data/ and one entry here.
 */
const pages = [
  { slug: 'index', title: 'Home', data: 'home.cjs' },
  { slug: 'about', title: 'About', data: 'about.cjs' },
  { slug: 'services', title: 'Services', data: 'services.cjs' },
  { slug: 'contact', title: 'Contact', data: 'contact.cjs' },
  // Kitchen sink — every component once. Used by the static↔Drupal parity
  // check; not linked from the nav.
  { slug: 'sections', title: 'Component library', data: 'sections.cjs' },
];

// Header/footer nav — { title, url, children: [{ title, url, description? }] }.
// ≤6 top-level items (crowded headers read cheap).
const nav = [
  { title: 'Home', url: '/' },
  {
    title: 'About',
    url: '/about',
    children: [
      { title: 'Who we are', url: '/about', description: 'Mission, story, and the team' },
      { title: 'Contact', url: '/contact', description: 'Get in touch with our office' },
    ],
  },
  { title: 'Services', url: '/services' },
  { title: 'Contact', url: '/contact' },
];

// Site-level brand, consumed by the shared chrome partials.
const site = {
  name: 'DrupalX Canvas',
  tagline: 'Component-driven Drupal',
  cta: { label: 'Get in touch', url: '/contact' },
  footer: {
    blurb:
      'A Tailwind-first Drupal Canvas starter — component-driven pages authored once, rendered as a static site and as editable Canvas pages.',
    legal: 'All rights reserved.',
    year: '2026',
    contact: {
      email: 'hello@example.com',
      phone: '(555) 010-2030',
      address: '123 Main Street, Anytown, USA',
    },
  },
};

module.exports = { pages, nav, site };
