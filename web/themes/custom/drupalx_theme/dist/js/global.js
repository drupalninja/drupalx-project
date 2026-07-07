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
})();
