/**
 * Front-end admin-toolbar displace fix.
 *
 * The core Navigation toolbar sets --drupal-displace-offset-left on <html> via
 * Drupal.displace(), and the theme's .full-bleed / sticky-header rules read it
 * so full-width sections don't slide under the sidebar for logged-in editors.
 *
 * Problem: on a FRONT-END page (the rendered town site, not /admin/*), the
 * toolbar animates its collapse/expand but never re-runs Drupal.displace(), so
 * the offset sticks at the expanded 264px even after the rail shrinks to 65px.
 * Content is then left with a ~200px dead gap and the full-bleed bands overflow.
 * (On /admin/* the module's own scripts handle this; the front end doesn't load
 * them.)
 *
 * Fix: watch the collapse toggle + the html[data-admin-toolbar] state and, once
 * the CSS transition settles, call Drupal.displace(true) to force a re-measure.
 * Guarded so it is completely inert when there is no admin toolbar (anonymous
 * visitors, static build).
 */
(function () {
  'use strict';

  if (!window.Drupal || typeof Drupal.displace !== 'function') {
    return;
  }

  var root = document.documentElement;
  if (root.hasAttribute('data-dx-displace-fix')) {
    return;
  }
  root.setAttribute('data-dx-displace-fix', '');

  // The sidebar's CSS transition is --admin-toolbar-transition (≈150ms); wait a
  // touch longer so the placeholder has resized before we measure.
  var SETTLE_MS = 260;
  var timer = null;

  function remeasure() {
    if (timer) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(function () {
      Drupal.displace(true);
    }, SETTLE_MS);
  }

  // 1. Any click on the collapse/expand control triggers a re-measure. The
  //    control class is stable across Gin 5 / core Navigation.
  document.addEventListener(
    'click',
    function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('.admin-toolbar__expand-button, [data-drupal-selector="admin-toolbar-mobile-trigger"]')) {
        remeasure();
      }
    },
    true,
  );

  // 2. Belt-and-braces: observe the html[data-admin-toolbar] attribute so any
  //    state change (keyboard toggle, programmatic) also re-measures.
  if ('MutationObserver' in window) {
    new MutationObserver(remeasure).observe(root, {
      attributes: true,
      attributeFilter: ['data-admin-toolbar'],
    });
  }
})();
