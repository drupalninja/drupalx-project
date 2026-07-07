/**
 * Static-build image optimizer — the static-side equivalent of the
 * dx_image Drupal module.
 *
 * The deployed static pilot (what Vercel serves and Lighthouse scores)
 * references images by their ORIGINAL src — often an external URL at full
 * resolution (e.g. an Unsplash `…&w=2000`). A bare full-size `<img>` is the
 * LCP killer on mobile. This post-build step fixes it WITHOUT touching the
 * SDC twigs (which must stay renderer-agnostic):
 *
 *   1. Scan every dist/*.html for <img src> (external or local).
 *   2. Download/read each source once, generate width-stepped AVIF + a JPEG
 *      fallback into dist/images/opt/<hash>-<w>.{avif,jpg} (deduped by hash).
 *   3. Rewrite the <img>: src → the JPEG fallback, add srcset (AVIF widths) +
 *      sizes + intrinsic width/height (no CLS). The FIRST hero image per page
 *      gets fetchpriority=high + a <link rel=preload> in <head>; every other
 *      image gets loading=lazy.
 *
 * Idempotent: re-runs reuse the cached derivatives. Network failures fall back
 * to leaving the original <img> untouched (the build still succeeds).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const WIDTHS = [320, 480, 640, 768, 1024, 1280, 1600];
const AVIF_QUALITY = 50;
const JPEG_QUALITY = 72;

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, { headers: { 'User-Agent': 'drupalx-build' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

async function sourceBuffer(src, dist) {
  if (/^https?:\/\//.test(src)) {
    return fetchBuffer(src);
  }
  // Local: resolve against dist/ (the img src is an absolute site path).
  const local = path.join(dist, src.replace(/^\//, ''));
  if (fs.existsSync(local)) {
    return fs.readFileSync(local);
  }
  return null;
}

/**
 * Generate width-stepped AVIF + a JPEG fallback for one source buffer.
 * Returns { srcset, fallback, width, height } (paths are site-absolute).
 */
async function derive(buf, hash, outDir, publicBase) {
  const meta = await sharp(buf).metadata();
  const intrinsicW = meta.width || 1600;
  const intrinsicH = meta.height || Math.round(intrinsicW * 0.66);
  // Only emit widths up to the intrinsic width (never upscale).
  const widths = WIDTHS.filter((w) => w <= intrinsicW);
  if (!widths.length) widths.push(intrinsicW);

  const srcset = [];
  for (const w of widths) {
    const avifName = `${hash}-${w}.avif`;
    const avifPath = path.join(outDir, avifName);
    if (!fs.existsSync(avifPath)) {
      await sharp(buf).resize({ width: w }).avif({ quality: AVIF_QUALITY }).toFile(avifPath);
    }
    srcset.push(`${publicBase}/${avifName} ${w}w`);
  }
  // JPEG fallback at a mid width for the bare src.
  const fbW = widths.includes(1024) ? 1024 : widths[widths.length - 1];
  const fbName = `${hash}-${fbW}.jpg`;
  const fbPath = path.join(outDir, fbName);
  if (!fs.existsSync(fbPath)) {
    await sharp(buf).resize({ width: fbW }).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(fbPath);
  }

  // LQIP — a tiny (~24px) blurred WebP inlined as a data-URI. Used as the hero's
  // CSS background so SOMETHING paints the instant the HTML arrives (helps the
  // perceived/Lighthouse LCP while the real AVIF streams in). ~1-2KB.
  let lqip = '';
  try {
    const tiny = await sharp(buf)
      .resize({ width: 24 })
      .blur(1.2)
      .webp({ quality: 40 })
      .toBuffer();
    lqip = `data:image/webp;base64,${tiny.toString('base64')}`;
  } catch (e) {
    lqip = '';
  }

  return {
    srcset: srcset.join(', '),
    fallback: `${publicBase}/${fbName}`,
    width: intrinsicW,
    height: intrinsicH,
    lqip,
  };
}

/**
 * Optimize all images referenced by the built HTML pages in `dist`.
 */
async function optimizeImages(dist) {
  if (!sharp) {
    console.log('  (sharp not installed — skipping static image optimization)');
    return;
  }
  const outDir = path.join(dist, 'images', 'opt');
  fs.mkdirSync(outDir, { recursive: true });
  const publicBase = '/images/opt';

  // Cache: src URL → derived result (so an image used on 3 pages is built once).
  const cache = new Map();
  const htmlFiles = fs.readdirSync(dist).filter((f) => f.endsWith('.html'));
  let count = 0;

  for (const file of htmlFiles) {
    const filePath = path.join(dist, file);
    let html = fs.readFileSync(filePath, 'utf8');
    const imgTags = html.match(/<img\b[^>]*>/gi) || [];
    let heroPreload = '';
    // The hero is the first FULL-BLEED image (section_hero / hero_banner —
    // class `section-hero__img`, or the first image at all if none matches).
    // Detect by class, NOT source position, so a card image never wins.
    const heroIndex = imgTags.findIndex((t) => /section-hero__img/.test(t));
    const heroTag = heroIndex >= 0 ? imgTags[heroIndex] : imgTags[0];

    // Build a replacement for each UNIQUE original tag, then apply with split/join
    // (replaceAll-style) so identical tags don't collide on the first match.
    const replacements = [];
    for (const tag of imgTags) {
      const srcMatch = tag.match(/\ssrc="([^"]+)"/i);
      if (!srcMatch) continue;
      const src = srcMatch[1].replace(/&amp;/g, '&');
      if (/^data:/.test(src) || /\.svg(\?|$)/i.test(src) || src.includes('/images/opt/')) continue;

      let result = cache.get(src);
      if (result === undefined) {
        try {
          const buf = await sourceBuffer(src, dist);
          if (!buf) { cache.set(src, null); continue; }
          const hash = crypto.createHash('sha1').update(src).digest('hex').slice(0, 12);
          result = await derive(buf, hash, outDir, publicBase);
          cache.set(src, result);
          count++;
        } catch (e) {
          cache.set(src, null);
          continue;
        }
      }
      if (!result) continue;

      const isHero = tag === heroTag;
      const sizes = isHero ? '100vw' : '(min-width: 992px) 50vw, 100vw';
      const loadAttrs = isHero
        ? 'fetchpriority="high" decoding="async"'
        : 'loading="lazy" decoding="async"';

      // The hero gets a blurred LQIP as a CSS background so something paints the
      // instant the HTML lands (perceived + measured LCP), revealed under the
      // streaming AVIF. Merge into any existing inline style on the <img>.
      let newTag = tag;
      if (isHero && result.lqip) {
        const bg = `background-image:url('${result.lqip}');background-size:cover;background-position:center;`;
        if (/\sstyle="/i.test(newTag)) {
          newTag = newTag.replace(/\sstyle="/i, ` style="${bg}`);
        } else {
          newTag = newTag.replace(/<img\b/i, `<img style="${bg}"`);
        }
      }

      newTag = newTag
        .replace(/\ssrcset="[^"]*"/i, '')
        .replace(/\ssizes="[^"]*"/i, '')
        .replace(/\swidth="[^"]*"/i, '')
        .replace(/\sheight="[^"]*"/i, '')
        .replace(/\sloading="[^"]*"/i, '')
        .replace(/\sfetchpriority="[^"]*"/i, '')
        .replace(/\sdecoding="[^"]*"/i, '')
        .replace(/\ssrc="[^"]*"/i, ` src="${result.fallback}"`)
        .replace(
          /<img\b/i,
          `<img srcset="${result.srcset}" sizes="${sizes}" width="${result.width}" height="${result.height}" ${loadAttrs}`,
        );
      replacements.push([tag, newTag]);

      if (isHero && !heroPreload) {
        heroPreload = `<link rel="preload" as="image" href="${result.fallback}" imagesrcset="${result.srcset}" imagesizes="${sizes}" fetchpriority="high">`;
      }
    }

    // Apply each replacement to ALL occurrences (split/join = replaceAll).
    for (const [oldTag, newTag] of replacements) {
      html = html.split(oldTag).join(newTag);
    }
    if (heroPreload) {
      html = html.replace('</head>', `  ${heroPreload}\n</head>`);
    }
    fs.writeFileSync(filePath, html);
  }
  console.log(`  ✓ optimized ${count} image(s) → ${publicBase}/ (AVIF + JPEG fallback, width-stepped)`);
}

module.exports = { optimizeImages };
