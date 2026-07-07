/**
 * Services — page hero → icon card grid → news + events two-up → FAQ → CTA.
 */
const { img, pageHero, cardGrid, card, newsCard, eventCard, accordion, accordionItem, cta, button } = require('./_helpers.cjs');

module.exports = {
  title: 'Services',
  description: 'What the DrupalX Canvas starter ships and how engagements typically run.',
  components: [
    pageHero('What we do', {
      eyebrow: 'Services',
      lede: 'Design systems, decoupled builds, and editor experiences — shipped as working software, not slideware.',
      tone: 'dark',
    }),
    cardGrid(
      [
        card({ title: 'Design systems', body: 'Tokens, type scale, and a component library your team can actually maintain.', url: '/about', icon: 'sparkles', c: 'sky', more: 'Our approach' }),
        card({ title: 'Canvas builds', body: 'Experience Builder sites where every landing page is composed, not coded.', url: '/about', icon: 'landmark', c: 'none' }),
        card({ title: 'Performance & a11y', body: 'Self-hosted fonts, responsive WebP images, WCAG AA as a floor not a stretch goal.', url: '/about', icon: 'shield-check', c: 'clay' }),
        card({ title: 'Editor training', body: 'Your team leaves able to build a new page before lunch.', url: '/contact', icon: 'graduation-cap', c: 'accent' }),
      ],
      { eyebrow: 'Capabilities', title: 'Four things, done well', columns: '4' },
    ),
    cardGrid(
      [
        newsCard({
          title: 'Starter reaches 20 Canvas-ready components',
          date: 'Jul 1, 2026',
          summary: 'Batch two lands: galleries, accordions, document lists, and dated cards.',
          url: '/about',
          image: img('https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&q=80', 'Desk with coffee and a notebook', 1200, 800),
        }),
        newsCard({
          title: 'Why we render twig twice',
          date: 'Jun 18, 2026',
          summary: 'One component source, two render targets — the architecture note.',
          url: '/about',
          image: img('https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=1200&q=80', 'Code on a laptop screen', 1200, 800),
        }),
        eventCard({ title: 'Canvas office hours', month: 'JUL', day: '14', time: '2:00–3:00 PM', location: 'Online', url: '/contact', c: 'sky' }),
        eventCard({ title: 'Editor training workshop', month: 'JUL', day: '28', time: '10:00 AM–noon', location: 'Community Room B', url: '/contact', c: 'clay' }),
      ],
      { eyebrow: 'Latest', title: 'News & events', columns: '2' },
    ),
    accordion(
      [
        accordionItem('Can editors break the design?', '<p>No — components expose enums and slots, not free-form HTML. The design system is enforced by the component schemas.</p>', true),
        accordionItem('Does the static site drift from Drupal?', '<p>They render the same twig from the same directory. The parity check in the starter diffs both outputs to prove it.</p>'),
        accordionItem('What about images?', '<p>Pushed images become real media entities; the dx_image module serves width-stepped WebP derivatives to visitors automatically.</p>'),
      ],
      { eyebrow: 'FAQ', title: 'Common questions' },
    ),
    cta({
      title: 'Have a project in mind?',
      body: 'Tell us where your site hurts — we’ll show you the same page, twice.',
      buttons: [button('Start the conversation', '/contact', { variant: 'accent' })],
    }),
  ],
};
