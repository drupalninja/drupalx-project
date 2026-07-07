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
