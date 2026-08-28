/**
 * AI Concierge — framework-free, idempotent. Powers the site-wide assistant
 * overlay (templates/partials/_concierge.html.twig). Runs identically as a
 * plain <script defer> in the static build and as a Drupal library.
 *
 * Grounding is a small CLIENT-SIDE RAG: on first open it fetches
 * /concierge-corpus.json (built from the real page content), keyword-retrieves
 * the top pages for a question, and stitches a grounded answer from the best
 * page's sentences + source cards. No server, no external API — the static
 * demo behaves exactly as it reads. At launch the same UI points at the
 * CMS-backed RAG endpoint (swap fetchAnswer()).
 */
(function () {
  'use strict';
  var doc = document;
  var overlay = doc.getElementById('concierge-overlay');
  if (!overlay || overlay._cgInit) return;
  overlay._cgInit = true;

  var thread = doc.getElementById('concierge-thread');
  var empty = doc.getElementById('concierge-empty');
  var form = doc.getElementById('concierge-form');
  var input = doc.getElementById('concierge-input');
  var clearBtn = overlay.querySelector('[data-concierge-clear]');

  // Persona config comes from data-attrs on the overlay (set by the partial
  // from site.assistant) — no engagement strings in this file.
  var STORE_KEY = overlay.getAttribute('data-cg-store-key') || 'site-concierge';
  var FALLBACK = overlay.getAttribute('data-cg-fallback') || 'I couldn’t find that on this site — try the contact page.';
  var MAX_TURNS = 30;
  var TTL_MS = 12 * 60 * 60 * 1000;

  // ── Corpus (lazy) ───────────────────────────────────────────────
  var CORPUS = null;
  var corpusPromise = null;
  function loadCorpus() {
    if (corpusPromise) return corpusPromise;
    corpusPromise = fetch('/concierge-corpus.json')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (c) { CORPUS = Array.isArray(c) ? c : []; return CORPUS; })
      .catch(function () { CORPUS = []; return CORPUS; });
    return corpusPromise;
  }

  var STOP = { a:1,an:1,and:1,are:1,as:1,at:1,be:1,by:1,can:1,do:1,does:1,for:1,from:1,how:1,i:1,in:1,is:1,it:1,its:1,me:1,my:1,of:1,on:1,or:1,that:1,the:1,their:1,them:1,there:1,they:1,this:1,to:1,was:1,we:1,what:1,when:1,where:1,which:1,who:1,why:1,will:1,with:1,you:1,your:1 };
  function tokenize(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(function (t) { return t.length > 1 && !STOP[t]; });
  }
  // Topic boosts: surface the right wayfinding page even when a flashier page
  // shares more keywords. Mirrors the launch RAG's intent boosts. These are
  // municipal DEFAULTS — tune per engagement (add sector terms + local nouns)
  // when the IA differs.
  var BOOSTS = [
    { q: /tax|property|bill|pay|payment|water bill/i, url: /\/services/i, b: 0.5 },
    { q: /meeting|agenda|minutes|board|committee|select board|planning|zoning board/i, url: /\/government/i, b: 0.5 },
    { q: /permit|zoning|bylaw|parcel|lot|land use|subdiv|build/i, url: /\/zoning/i, b: 0.5 },
    { q: /record|clerk|deed|vital|birth|death|marriage|license|dog|voter/i, url: /\/departments/i, b: 0.5 },
    { q: /hour|open|close|phone|call|email|address|direction|contact|reach/i, url: /\/contact/i, b: 0.45 },
    { q: /history|about|heritage|founded|charter/i, url: /\/about/i, b: 0.4 },
    { q: /news|alert|notice|hearing|closure/i, url: /\/news/i, b: 0.4 },
  ];
  function scoreEntry(e, terms, q) {
    if (!terms.length) return 0;
    var titleTokens = {};
    tokenize(e.title).forEach(function (t) { titleTokens[t] = 1; });
    var body = (e.text + ' ' + (e.description || '')).toLowerCase();
    var score = 0;
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      if (titleTokens[term]) score += 3;
      var occ = body.split(term).length - 1;
      if (occ > 0) score += Math.min(2, 1 + Math.log10(occ));
    }
    var norm = score / (terms.length * 3);
    for (var j = 0; j < BOOSTS.length; j++) {
      if (BOOSTS[j].q.test(q) && BOOSTS[j].url.test(e.url)) norm += BOOSTS[j].b;
    }
    return norm;
  }
  function retrieve(q) {
    var terms = tokenize(q).filter(function (t, i, a) { return a.indexOf(t) === i; });
    return (CORPUS || []).map(function (e) { return { e: e, s: scoreEntry(e, terms, q) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 4);
  }
  // Pull the best WHOLE, well-formed sentences from the top page for the query.
  // We split on the " — " field joiner AND sentence punctuation, then keep only
  // fragments that look like complete sentences (start with a capital, end with
  // terminal punctuation) so answers never begin mid-clause.
  function bestSentences(entry, q) {
    var terms = tokenize(q);
    var raw = String(entry.text).split(/ — |(?<=[.!?])\s+/);
    var sentences = raw.map(function (s) { return s.trim(); }).filter(function (s) {
      return s.length > 30 && /^[A-Z“"]/.test(s) && /[.!?]$/.test(s);
    });
    var ranked = sentences.map(function (s) {
      var low = s.toLowerCase();
      var hits = 0;
      terms.forEach(function (t) { if (low.indexOf(t) !== -1) hits++; });
      return { s: s, hits: hits };
    }).filter(function (r) { return r.hits > 0; }).sort(function (a, b) { return b.hits - a.hits; });
    return ranked.slice(0, 2).map(function (r) { return r.s; });
  }
  function answerFor(q) {
    var hits = retrieve(q);
    if (!hits.length) {
      return { text: FALLBACK, cards: [] };
    }
    var top = hits[0].e;
    var sents = bestSentences(top, q);
    // Prefer clean whole sentences; fall back to the page description (which is
    // always a complete sentence) rather than a mid-clause text slice.
    var lead = sents.length ? sents.join(' ') : (top.description || top.text.split(' — ')[0] + '.');
    var text = lead + ' You can read more on the ' + top.title + ' page.';
    var cards = hits.map(function (h) { return { title: h.e.title, url: h.e.url, desc: (h.e.description || '').slice(0, 90) }; });
    return { text: text, cards: cards };
  }
  // The single grounding call. On Drupal the provus_concierge module serves
  // POST /api/concierge (grounded answers via the AI module → Groq); the
  // static demo has no server, so any failure falls back to the client-side
  // corpus RAG above — identical UX, two grounding engines.
  function fetchAnswer(q) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 15000);
    return fetch('/api/concierge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: q }),
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (r) {
      if (!r.ok) throw new Error('concierge endpoint ' + r.status);
      return r.json();
    }).then(function (data) {
      if (timer) clearTimeout(timer);
      if (!data || typeof data.answer !== 'string') throw new Error('bad payload');
      return { text: data.answer, cards: Array.isArray(data.cards) ? data.cards : [] };
    }).catch(function () {
      if (timer) clearTimeout(timer);
      return loadCorpus().then(function () { return answerFor(q); });
    });
  }

  // ── Rendering ───────────────────────────────────────────────────
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cardHtml(c) {
    return '<a href="' + esc(c.url) + '" class="group flex items-start gap-3 rounded-xl border border-primary-100 bg-white p-3 shadow-sm transition hover:border-accent-400 hover:bg-primary-50">'
      + '<div class="min-w-0 flex-1"><span class="text-xs font-bold uppercase tracking-wide text-accent-700">Page</span>'
      + '<p class="mt-0.5 font-bold leading-tight text-primary-800">' + esc(c.title) + '</p>'
      + (c.desc ? '<p class="mt-0.5 text-xs text-ink-500">' + esc(c.desc) + '</p>' : '')
      + '</div><svg class="mt-0.5 size-4 shrink-0 text-accent-700 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>';
  }

  var history = [];
  function saveHistory() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ at: Date.now(), history: history.slice(-MAX_TURNS) })); } catch (e) {}
  }
  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [];
      var p = JSON.parse(raw);
      if (!p || Date.now() - (p.at || 0) > TTL_MS) { localStorage.removeItem(STORE_KEY); return []; }
      return Array.isArray(p.history) ? p.history : [];
    } catch (e) { return []; }
  }
  function updateClearBtn() {
    if (!clearBtn) return;
    clearBtn.classList.toggle('hidden', history.length === 0);
    clearBtn.classList.toggle('flex', history.length > 0);
  }
  function addUser(q, persist) {
    empty.style.display = 'none';
    var el = doc.createElement('div');
    el.className = 'flex justify-end';
    el.setAttribute('data-cg-msg', '');
    el.innerHTML = '<div class="max-w-[80%] rounded-2xl rounded-br-sm bg-accent-700 px-4 py-2.5 text-white">' + esc(q) + '</div>';
    thread.appendChild(el); thread.scrollTop = thread.scrollHeight;
    if (persist !== false) { history.push({ role: 'user', text: q }); saveHistory(); updateClearBtn(); }
  }
  function addThinking() {
    var el = doc.createElement('div');
    el.className = 'flex items-center gap-2 text-ink-500';
    el.innerHTML = '<span class="flex size-8 items-center justify-center rounded-lg bg-accent-50"><span class="size-2 animate-pulse rounded-full bg-accent-700"></span></span><span class="text-sm">Looking that up…</span>';
    thread.appendChild(el); thread.scrollTop = thread.scrollHeight; return el;
  }
  function addAnswer(text, cards, persist) {
    empty.style.display = 'none';
    var el = doc.createElement('div');
    el.className = 'space-y-3';
    el.setAttribute('data-cg-msg', '');
    var cardsHtml = (cards && cards.length) ? '<div class="grid gap-2 sm:grid-cols-2">' + cards.map(cardHtml).join('') + '</div>' : '';
    el.innerHTML = '<div class="flex gap-3"><span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-700 text-white text-xs font-bold">AI</span>'
      + '<div class="flex-1 rounded-2xl rounded-tl-sm border border-primary-100 bg-white px-4 py-3 leading-relaxed text-ink-700 shadow-sm">' + esc(text) + '</div></div>' + cardsHtml;
    thread.appendChild(el); thread.scrollTop = thread.scrollHeight;
    if (persist !== false) { history.push({ role: 'ai', text: text, cards: cards || [] }); saveHistory(); updateClearBtn(); }
  }

  var busy = false;
  function submit(q) {
    q = (q || '').trim();
    if (busy || !q) return;
    busy = true;
    addUser(q); input.value = '';
    var thinking = addThinking();
    fetchAnswer(q).then(function (res) {
      thinking.remove();
      addAnswer(res.text, res.cards);
    }).catch(function () {
      thinking.remove();
      addAnswer('I had trouble reaching the assistant. Please try again.', []);
    }).then(function () { busy = false; });
  }

  // ── Open / close ────────────────────────────────────────────────
  // No floating launcher: the concierge opens from the hero ask-bar (or any
  // [data-concierge-open] element) and lives on the front page only. An
  // earlier port shipped a scroll-revealed FAB; the element and its scroll
  // listener are gone rather than hidden, so nothing here watches for it.

  function open(prefill) {
    overlay.classList.remove('hidden');
    doc.body.style.overflow = 'hidden';
    loadCorpus();
    setTimeout(function () { input.focus(); }, 50);
    if (prefill) { input.value = prefill; submit(prefill); }
  }
  function close() {
    overlay.classList.add('hidden');
    doc.body.style.overflow = '';
  }
  window.siteConcierge = { open: open, close: close };

  overlay.querySelectorAll('[data-concierge-close]').forEach(function (b) { b.addEventListener('click', close); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.classList.contains('hidden')) close(); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

  function clearHistory() {
    history = [];
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    thread.querySelectorAll('[data-cg-msg]').forEach(function (n) { n.remove(); });
    empty.style.display = '';
    updateClearBtn();
  }
  if (clearBtn) clearBtn.addEventListener('click', clearHistory);
  form.addEventListener('submit', function (e) { e.preventDefault(); submit(input.value); });

  // Global open-triggers (hero ask-bar, prompt chips) — delegated so
  // late-rendered triggers still work.
  doc.addEventListener('click', function (ev) {
    var openBtn = ev.target.closest('[data-concierge-open]');
    if (openBtn) { ev.preventDefault(); open(); return; }
    var promptBtn = ev.target.closest('[data-concierge-prompt]');
    if (promptBtn) { ev.preventDefault(); open(promptBtn.getAttribute('data-concierge-prompt')); }
  });

  // Replay stored conversation.
  history = loadHistory();
  history.forEach(function (e) {
    if (e.role === 'user') addUser(e.text, false);
    else addAnswer(e.text, e.cards || [], false);
  });
  updateClearBtn();

  // ── Typewriter on the hero bar placeholder ──────────────────────
  (function typer() {
    var el = doc.querySelector('[data-concierge-typer]');
    if (!el || el._cgTyping) return;
    el._cgTyping = true;
    var prompts = [];
    try { prompts = JSON.parse(el.getAttribute('data-prompts') || '[]'); } catch (e) {}
    if (!prompts.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = prompts[0]; return; }
    var pi = 0, ci = 0, deleting = false;
    var TYPE = 55, DEL = 28, HOLD = 1700, GAP = 400;
    function tick() {
      var w = prompts[pi];
      if (!deleting) {
        ci++; el.textContent = w.slice(0, ci);
        if (ci >= w.length) { deleting = true; return void setTimeout(tick, HOLD); }
        setTimeout(tick, TYPE);
      } else {
        ci--; el.textContent = w.slice(0, Math.max(ci, 0));
        if (ci <= 0) { deleting = false; pi = (pi + 1) % prompts.length; return void setTimeout(tick, GAP); }
        setTimeout(tick, DEL);
      }
    }
    el.textContent = '';
    setTimeout(tick, 700);
  })();
})();
