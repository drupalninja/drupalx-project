/**
 * DrupalX Canvas — page-data helpers. Pages are component trees of
 * drupalx_theme SDCs (Tailwind v4 markup lives in the components; data stays
 * declarative).
 *
 * Prop conventions (see CLAUDE.md):
 *  - rich-text props: plain HTML strings (bridge wraps to { value, format }).
 *  - image props: plain { src, alt, width, height } (bridge wraps for Canvas).
 *  - link/url props: plain strings (bridge wraps to { uri }).
 *  - enum props: never '' — use 'none'.
 */
const rt = (html) => html;
const img = (src, alt, width = 1200, height = 800) => ({ src, alt, width, height });

// ── Primitives ──────────────────────────────────────────────────────────

const button = (label, url, { variant = 'primary', size = 'normal', icon = 'arrow-right' } = {}) =>
  ({ component: 'button', props: { label, url, variant, size, icon } });

const heading = (title, { eyebrow = '', level = 'h2', style = 'title', align = 'left' } = {}) =>
  ({ component: 'heading', props: { title, eyebrow, level, style, align } });

const icon = (name, size = 'md') => ({ component: 'icon', props: { name, size } });

const image = (src, alt, opts = {}) => ({
  component: 'image',
  props: {
    image: img(src, alt, opts.width || 1200, opts.height || 800),
    aspect: opts.aspect || 'auto',
    rounded: opts.rounded || '2xl',
    frame: opts.frame || 'none',
    caption: opts.caption || '',
  },
});

const divider = (width = 'content') => ({ component: 'divider', props: { width } });
const spacer = (size = 'md') => ({ component: 'spacer', props: { size } });

// ── Sections ────────────────────────────────────────────────────────────

const hero = ({ eyebrow = '', title, body = '', image = null, style = 'split', height = 'medium', statChip = null, buttons = [] } = {}) => ({
  component: 'section_hero',
  props: {
    eyebrow,
    title,
    body: body ? rt(`<p>${body}</p>`) : '',
    ...(image ? { image } : {}),
    style,
    height,
    stat_chip_number: statChip ? statChip.number : '',
    stat_chip_label: statChip ? statChip.label : '',
  },
  slots: { hero_buttons: buttons },
});

const pageHero = (title, { eyebrow = '', lede = '', image = null, tone = 'dark' } = {}) => ({
  component: 'page_hero',
  props: {
    title,
    eyebrow,
    lede: lede ? rt(`<p>${lede}</p>`) : '',
    ...(image ? { image } : {}),
    tone,
  },
});

const stat = (number, label, c = 'none') => ({ component: 'stat', props: { number, label, c } });

const statBand = (stats, { eyebrow = '', title = '', tone = 'dark', columns = '4' } = {}) => ({
  component: 'section_stats',
  props: { eyebrow, title, tone, columns },
  slots: { stats },
});

const card = ({ title, body = '', url = '', image = null, icon = 'none', c = 'none', more = 'Learn more' } = {}) => ({
  component: 'card',
  props: {
    title,
    body: body ? rt(`<p>${body}</p>`) : '',
    url,
    ...(image ? { image } : {}),
    icon,
    c,
    more_label: more,
  },
});

const cardGrid = (cards, { eyebrow = '', title = '', lede = '', columns = '3', tone = 'white', featured = false } = {}) => ({
  component: 'section_cards',
  props: {
    eyebrow,
    title,
    lede: lede ? rt(`<p>${lede}</p>`) : '',
    columns,
    tone,
    featured_first: featured,
  },
  slots: { cards },
});

const split = ({ eyebrow = '', title, body = '', image = null, side = 'right', tone = 'white', buttons = [] } = {}) => ({
  component: 'section_split',
  props: {
    eyebrow,
    title,
    body: body ? rt(body) : '',
    ...(image ? { image } : {}),
    media_side: side,
    tone,
  },
  slots: { split_buttons: buttons },
});

const cta = ({ eyebrow = '', title, body = '', buttons = [] } = {}) => ({
  component: 'section_cta',
  props: { eyebrow, title, body: body ? rt(`<p>${body}</p>`) : '' },
  slots: { cta_buttons: buttons },
});

const richtext = (html, { width = 'prose', tone = 'white' } = {}) => ({
  component: 'section_richtext',
  props: { body: rt(html), width, tone },
});

const quote = (html, { attribution = '', role = '', image = null, tone = 'tint' } = {}) => ({
  component: 'section_quote',
  props: { quote: rt(html), attribution, role, ...(image ? { image } : {}), tone },
});

const gallery = (images, { eyebrow = '', title = '', columns = '3' } = {}) => ({
  component: 'section_gallery',
  props: { eyebrow, title, columns },
  slots: { images },
});

const accordionItem = (heading, bodyHtml, open = false) => ({
  component: 'accordion_item',
  props: { heading, body: rt(bodyHtml), open },
});

const accordion = (items, { eyebrow = '', title = '', lede = '', tone = 'tint' } = {}) => ({
  component: 'accordion',
  props: { eyebrow, title, lede: lede ? rt(`<p>${lede}</p>`) : '', tone },
  slots: { items },
});

const alert = (messageHtml, { tone = 'info', id = 'default', dismissible = true } = {}) => ({
  component: 'alert_banner',
  props: { message: rt(messageHtml), tone, alert_id: id, dismissible },
});

const newsCard = ({ title, date = '', summary = '', url = '', image = null } = {}) => ({
  component: 'card_news',
  props: { title, date, summary: summary ? rt(`<p>${summary}</p>`) : '', url, ...(image ? { image } : {}) },
});

const eventCard = ({ title, month = '', day = '', time = '', location = '', url = '', c = 'none' } = {}) => ({
  component: 'card_event',
  props: { title, month, day, time, location, url, c },
});

const docItem = ({ title, description = '', url = '', filetype = 'pdf', meta = '' } = {}) => ({
  component: 'document_item',
  props: { title, description, url, filetype, meta },
});

const docList = (documents, { eyebrow = '', title = '', moreLabel = '', moreUrl = '', tone = 'white' } = {}) => ({
  component: 'document_list',
  props: { eyebrow, title, more_label: moreLabel, more_url: moreUrl, tone },
  slots: { documents },
});

module.exports = {
  rt, img, button, heading, icon, image, divider, spacer,
  hero, pageHero, stat, statBand, card, cardGrid, split, cta, richtext,
  quote, gallery, accordion, accordionItem, alert, newsCard, eventCard, docItem, docList,
};
