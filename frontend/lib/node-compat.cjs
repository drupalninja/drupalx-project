// Preloaded via NODE_OPTIONS --require so it runs before any module (incl.
// Twing) loads. Twing 2.x/3.x use util.isNullOrUndefined(), removed in Node 23+.
const util = require('util');
if (typeof util.isNullOrUndefined !== 'function') {
  util.isNullOrUndefined = (v) => v === null || v === undefined;
}
if (typeof util.isString !== 'function') {
  util.isString = (v) => typeof v === 'string';
}
if (typeof util.isArray !== 'function') {
  util.isArray = Array.isArray;
}

// Twing 3.x's compiler does `require('locutus/php/strings')` — a bare
// directory import that locutus 3.x's package `exports` map no longer
// resolves (we force locutus ^3 via package.json overrides to clear its
// security advisories; twing's own pin is the vulnerable 2.x). Rewrite that
// one request to the real file.
const Module = require('module');
const path = require('path');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === 'locutus/php/strings') {
    try {
      const pkg = origResolve.call(this, 'locutus/package.json', ...args);
      request = path.join(path.dirname(pkg), 'php/strings/index.js');
    } catch (e) { /* locutus absent — let the original error surface */ }
  }
  return origResolve.call(this, request, ...args);
};

// locutus 3.x also changed per-function module shapes: v2 did
// `module.exports = rtrim`, v3 exports `{ rtrim }`. Twing binds the require
// result directly, so unwrap when the module exposes a function named after
// its basename (e.g. locutus/php/strings/rtrim → exports.rtrim).
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const out = origLoad.call(this, request, parent, isMain);
  if (
    typeof request === 'string' &&
    request.startsWith('locutus/') &&
    out && typeof out === 'object'
  ) {
    const base = request.split('/').pop();
    if (typeof out[base] === 'function') return out[base];
  }
  return out;
};
