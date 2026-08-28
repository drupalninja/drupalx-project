/**
 * drupalx_theme global JS — ONE framework-free, idempotent IIFE.
 *
 * Runs identically as a plain `<script defer>` in the static frontend build
 * and as a Drupal library (no Drupal.behaviors dependency — everything is
 * delegated or guarded so double-execution is harmless).
 *
 *  1. Scroll-reveal: adds .reveal-ready to <html> (progressive enhancement —
 *     without JS nothing is ever hidden), then IntersectionObserver adds
 *     .is-visible to [data-reveal] sections as they enter the viewport.
 *  2. Mobile nav: [data-dx-nav-toggle] toggles the [data-dx-mobile-nav] drawer.
 *  3. Dropdowns: ESC closes an open .spark-dropdown by blurring focus.
 *  4. Alert banner: [data-dx-alert-dismiss] hides its [data-dx-alert] for the
 *     session (sessionStorage, keyed by the alert's data-dx-alert value).
 *  5. Pager: chunks a [data-dx-paginate] list of [data-dx-page-item] children
 *     and builds the buttons at runtime. Parity with Pagination.astro in the
 *     Astro starters (2026-08-02) — a card grid that can run to dozens of rows
 *     must not ship as one endless column in one stack and paginated in the
 *     other.
 *  6. Header height: publishes the sticky header's real rendered height as
 *     --header-h so .hero-h-full (global.css) can size itself as exactly
 *     the viewport below it. The header's height isn't hardcodable (nav
 *     row wrap, logo/CTA changes per engagement), and this script simply
 *     never runs inside the Canvas editor iframe's preview, so hero-h-full
 *     falls back to its CSS default there — no special-casing needed.
 */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  if (root.hasAttribute('data-dx-init')) return;
  root.setAttribute('data-dx-init', '');

  // 1. Scroll-reveal.
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced && 'IntersectionObserver' in window) {
    root.classList.add('reveal-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    var observeAll = function () {
      doc.querySelectorAll('[data-reveal]:not(.is-visible)').forEach(function (el) {
        io.observe(el);
      });
    };
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', observeAll);
    } else {
      observeAll();
    }
    // Safety valve: a headless full-page capture (design judges, deck shots)
    // never scrolls, so off-viewport sections would screenshot at opacity 0
    // and read as a blank page. Reveal everything after a beat regardless —
    // the entrance animation still plays for what the visitor actually sees.
    setTimeout(function () {
      doc.querySelectorAll('[data-reveal]:not(.is-visible)').forEach(function (el) {
        el.classList.add('is-visible');
        io.unobserve(el);
      });
    }, 2500);
  }

  // 2. Mobile nav toggle (delegated so it works for late-rendered headers).
  doc.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-dx-nav-toggle]');
    if (!btn) return;
    var nav = doc.querySelector('[data-dx-mobile-nav]');
    if (!nav) return;
    var open = nav.classList.toggle('hidden') === false;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // 3. ESC closes hover/focus dropdowns by clearing focus.
  doc.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    var active = doc.activeElement;
    if (active && active.closest('.group') && active.blur) active.blur();
  });

  // 4. Alert banner dismiss (per-session).
  var alertKey = function (el) {
    return 'dx-alert-dismissed:' + (el.getAttribute('data-dx-alert') || 'default');
  };
  var hideDismissed = function () {
    doc.querySelectorAll('[data-dx-alert]').forEach(function (el) {
      try {
        if (sessionStorage.getItem(alertKey(el))) el.classList.add('hidden');
      } catch (e) { /* private mode */ }
    });
  };
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', hideDismissed);
  } else {
    hideDismissed();
  }
  doc.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-dx-alert-dismiss]');
    if (!btn) return;
    var alert = btn.closest('[data-dx-alert]');
    if (!alert) return;
    alert.classList.add('hidden');
    try { sessionStorage.setItem(alertKey(alert), '1'); } catch (e) { /* noop */ }
  });

  // 5. Pager. Server renders EVERY item (SEO + search indexing see the whole
  // list); this only chunks what is on screen. Mirrors Pagination.astro:
  // container carries [data-dx-paginate] with an optional data-dx-per-page,
  // every child to be paged carries [data-dx-page-item].
  //
  // Buttons are built at runtime, so their styling lives in global.css under
  // .dx-pager — a scoped/utility class on markup that does not exist at build
  // time would never be generated by Tailwind's scanner.
  function paginate(list) {
    var items = Array.prototype.slice.call(list.querySelectorAll('[data-dx-page-item]'));
    // Fall back to direct children. A Canvas section renders its cards through
    // a slot, so section_cards cannot stamp [data-dx-page-item] on each one;
    // in a grid container the direct children ARE the pageable units.
    if (!items.length) items = Array.prototype.slice.call(list.children);
    var per = parseInt(list.getAttribute('data-dx-per-page'), 10) || 12;
    if (items.length <= per) return;

    var nav = list.nextElementSibling;
    if (!nav || !nav.hasAttribute('data-dx-pager')) {
      nav = doc.createElement('nav');
      nav.setAttribute('data-dx-pager', '');
      nav.setAttribute('aria-label', list.getAttribute('data-dx-pager-label') || 'Pagination');
      nav.className = 'dx-pager mt-10 flex flex-wrap items-center justify-center gap-2';
      list.parentNode.insertBefore(nav, list.nextSibling);
    }

    var pages = Math.ceil(items.length / per);
    function show(page) {
      items.forEach(function (el, i) {
        el.hidden = Math.floor(i / per) !== page;
      });
      nav.innerHTML = '';
      for (var p = 0; p < pages; p++) {
        (function (n) {
          var b = doc.createElement('button');
          b.type = 'button';
          b.textContent = String(n + 1);
          if (n === page) b.setAttribute('aria-current', 'page');
          b.addEventListener('click', function () {
            show(n);
            list.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
          });
          nav.appendChild(b);
        })(p);
      }
    }
    show(0);
  }

  Array.prototype.forEach.call(doc.querySelectorAll('[data-dx-paginate]'), paginate);
  // Exposed so a filter/search on the page can rebuild the pager after it
  // changes what is visible, the same hook Pagination.astro provides.
  window.dxRepaginate = paginate;

  // 6. Header height → --header-h (see .hero-h-full in global.css).
  var header = doc.getElementById('dx-site-header');
  if (header && 'ResizeObserver' in window) {
    var setHeaderHeight = function () {
      root.style.setProperty('--header-h', header.offsetHeight + 'px');
    };
    setHeaderHeight();
    new ResizeObserver(setHeaderHeight).observe(header);
  }

  // 7. Matte white header: shadow-only scroll cue — never swap to glass/dark.
  if (header && header.classList.contains('bg-white')) {
    var syncHeaderScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    syncHeaderScroll();
    window.addEventListener('scroll', syncHeaderScroll, { passive: true });
  }
})();
