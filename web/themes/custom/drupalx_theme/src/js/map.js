/**
 * drupalx_theme map JS — boots a Leaflet map for every [data-dx-map] on the
 * page. Framework-free and idempotent, same contract as global.js: it runs
 * identically as a plain `<script defer>` in the static frontend build and as
 * a Drupal library, and double-execution is harmless (each map element is
 * marked once it is initialised).
 *
 * Ported from LeafletMap.astro (2026-08-10), including its two load-bearing
 * rules, which are the two bugs 12+ pilots each re-derived:
 *
 *   1. The wrapper carries `isolate`. Leaflet's panes run z-index 400–1000
 *      and, without a stacking context, they ESCAPE and paint over the sticky
 *      site header. That class is set in section_map.twig — do not drop it.
 *   2. Pin and popup styles are GLOBAL (global.css), never scoped. Leaflet
 *      injects that markup at runtime, so anything scoped to the component
 *      silently fails to apply and pins render as bare rectangles.
 *
 * WHERE THE POINTS COME FROM — the accessible-fallback trick. Canvas slot
 * children are HTML, not data, so the markers are authored as Map point
 * components that render a real, visible <li> in a list beside the map. This
 * script reads those <li> elements for their coordinates. That means the
 * list can never drift out of sync with the pins, and the map is never the
 * only path to the data (the LeafletMap.astro accessibility rule) — because
 * the list IS the data.
 *
 * Tiles: OpenStreetMap standard raster. No API key, so it works on a
 * static deploy as well as in Drupal. Attribution is required.
 */
(function () {
  'use strict';

  // OSM standard tiles — Carto's anonymous raster endpoint now watermarks
  // "API KEY REQUIRED" on every tile (no free unkeyed tier anymore).
  var TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var TILE_ATTR =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  var COLORS = {
    none: 'var(--color-primary-600)',
    sky: 'var(--color-sky-600)',
    clay: 'var(--color-clay-600)',
    accent: 'var(--color-accent-600)',
  };

  /* A crisp SVG teardrop in the point's wayfinding color: a white dot in the
     head by default, or the point's short label (a count, an acreage) when it
     has one. Sized 32x44 with the tip at the bottom centre, which is why the
     anchor below is [16, 44] and not the centre of the box. */
  function pinHtml(color, label) {
    var fill = COLORS[color] || COLORS.none;
    var inner = label
      ? '<text x="16" y="19" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">' +
        String(label).replace(/[<>&]/g, '') +
        '</text>'
      : '<circle cx="16" cy="15" r="5" fill="#fff"/>';
    return (
      '<svg width="32" height="44" viewBox="0 0 32 44" aria-hidden="true" focusable="false">' +
      '<path d="M16 43C16 43 30 26.5 30 15A14 14 0 1 0 2 15c0 11.5 14 28 14 28z" fill="' +
      fill +
      '" stroke="#fff" stroke-width="2"/>' +
      inner +
      '</svg>'
    );
  }

  function readPoints(list) {
    if (!list) return [];
    var nodes = list.querySelectorAll('[data-dx-map-point]');
    var points = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var lat = parseFloat(el.getAttribute('data-lat'));
      var lng = parseFloat(el.getAttribute('data-lng'));
      // A point with no usable coordinates still renders in the list; it just
      // gets no pin. Silently dropping it beats a NaN that breaks fitBounds
      // for every other point on the map.
      if (isNaN(lat) || isNaN(lng)) continue;
      points.push({
        lat: lat,
        lng: lng,
        color: el.getAttribute('data-color') || 'none',
        label: el.getAttribute('data-label') || '',
        title: el.getAttribute('data-title') || (el.querySelector('strong, h3, h4') || {}).textContent || '',
        popup: el.innerHTML,
      });
    }
    return points;
  }

  function initMap(el) {
    if (el.hasAttribute('data-dx-map-ready')) return;
    if (typeof window.L === 'undefined') return;
    el.setAttribute('data-dx-map-ready', '');

    var L = window.L;
    var list = document.getElementById(el.getAttribute('data-dx-map-points'));
    var points = readPoints(list);

    var map = L.map(el, {
      // Wheel-zoom OFF by default: a map that swallows the page scroll on the
      // way past is the single most complained-about map behaviour.
      scrollWheelZoom: el.getAttribute('data-scroll-zoom') === 'true',
      zoomControl: true,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);

    var bounds = [];
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      // divIcon markers get role="button" from Leaflet but no accessible
      // name — axe aria-command-name (serious). Give each pin its point's
      // title (falls back to a generic name so the name is never empty).
      var marker = L.marker([p.lat, p.lng], {
        alt: (p.title || 'Map location') + '',
        icon: L.divIcon({
          html: pinHtml(p.color, p.label),
          className: 'dx-map-pin',
          iconSize: [32, 44],
          iconAnchor: [16, 44],
          popupAnchor: [0, -40],
        }),
      }).addTo(map);
      if (p.popup) marker.bindPopup(p.popup);
      bounds.push([p.lat, p.lng]);
    }

    // Accessible names for the divIcon pins. Leaflet gives them
    // role="button" + tabindex but no name (axe aria-command-name, serious),
    // and it can rebuild marker elements during view changes — so sweep the
    // rendered pins (twice: now and after the first paint settles) instead
    // of touching each marker element once at creation.
    var labelPins = function () {
      var pins = el.querySelectorAll('.dx-map-pin');
      for (var k = 0; k < pins.length; k++) {
        if (!pins[k].getAttribute('aria-label')) {
          pins[k].setAttribute('aria-label', ((points[k] && points[k].title) || 'Map location').replace(/\s+/g, ' ').trim());
        }
      }
    };
    labelPins();
    setTimeout(labelPins, 600);
    map.on('zoomend moveend', labelPins);

    var lat = parseFloat(el.getAttribute('data-lat'));
    var lng = parseFloat(el.getAttribute('data-lng'));
    var zoom = parseInt(el.getAttribute('data-zoom'), 10);
    if (!isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], isNaN(zoom) ? 11 : zoom);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], isNaN(zoom) ? 13 : zoom);
    } else {
      // No centre and no points — an editor has dropped the section in and
      // not filled it yet. Show the world rather than a grey void.
      map.setView([20, 0], 2);
    }

    // The Canvas editor renders the section inside an iframe that is sized
    // AFTER the script runs, so Leaflet measures a zero-height container and
    // paints one grey tile. Re-measuring on resize fixes it there and on any
    // ordinary responsive reflow.
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        map.invalidateSize();
      }).observe(el);
    }
  }

  function initAll() {
    var maps = document.querySelectorAll('[data-dx-map]');
    for (var i = 0; i < maps.length; i++) initMap(maps[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
