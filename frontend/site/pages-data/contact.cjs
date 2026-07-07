/**
 * Contact — page hero → split (info + photo) → document list → CTA.
 */
const { img, pageHero, split, docList, docItem, cta, button } = require('./_helpers.cjs');

module.exports = {
  title: 'Contact',
  description: 'Get in touch with the DrupalX Canvas team.',
  components: [
    pageHero('Get in touch', {
      eyebrow: 'Contact',
      lede: 'Email, call, or stop by — we answer fastest on email.',
      tone: 'light',
    }),
    split({
      eyebrow: 'Reach us',
      title: 'We’d love to hear from you',
      body: `<p><strong>Email:</strong> hello@example.com<br>
             <strong>Phone:</strong> (555) 010-2030<br>
             <strong>Office:</strong> 123 Main Street, Anytown, USA</p>
             <p>Office hours are Monday–Friday, 9–5. For editor support on an existing site, include your site URL and we’ll route it straight to the on-call engineer.</p>`,
      image: img('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80', 'Bright open office interior', 1600, 1067),
      side: 'right',
      buttons: [button('Email us', 'mailto:hello@example.com', { variant: 'primary', icon: 'mail' })],
    }),
    docList(
      [
        docItem({ title: 'Starter overview one-pager', filetype: 'pdf', url: '/about', meta: 'PDF · 1.1 MB' }),
        docItem({ title: 'Engagement process & timeline', filetype: 'doc', url: '/about', meta: 'DOC · 480 KB' }),
        docItem({ title: 'Component inventory worksheet', filetype: 'xls', url: '/about', meta: 'XLS · 220 KB' }),
      ],
      { eyebrow: 'Downloads', title: 'Before our first call', tone: 'tint' },
    ),
    cta({
      title: 'Prefer to see it live?',
      body: 'Twenty minutes, your content, our components.',
      buttons: [button('Book a demo', 'mailto:hello@example.com', { variant: 'accent', icon: 'calendar' })],
    }),
  ],
};
