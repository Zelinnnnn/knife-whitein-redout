/*
 * Client files. A saved file is a normal HTML report anyone can open and
 * print, with the plan data embedded so Waypoint can open it again.
 * Plain .json exports from earlier versions still open.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.FP = root.FP || {}).files = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var TAG_ID = 'waypoint-plan';
  var FORMAT = 'waypoint-plan';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // JSON that is safe inside a <script> element.
  function embedJson(obj) {
    return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }

  function slug(s) {
    return String(s || 'financial-plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'financial-plan';
  }

  function isoDate(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function fileName(state, date) {
    return slug(state && state.household) + '-' + isoDate(date) + '.html';
  }

  function buildClientFile(o) {
    var state = o.state, title = o.title || (state.household || 'Financial plan');
    var saved = o.savedAt || new Date();
    var payload = { format: FORMAT, version: 1, savedAt: saved.toISOString(), plan: state };
    return '<!doctype html>\n<html lang="en" data-theme="light">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + escapeHtml(title) + ' · Financial plan</title>\n' +
      '<style>' + (o.css || '') + '\n' +
      'body{background:#f2f4f1;margin:0}.file-bar{max-width:1100px;margin:0 auto;padding:16px 16px 0;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;font:13px/1.5 system-ui,sans-serif;color:#46524b}' +
      '.file-bar button{font:inherit;font-weight:600;border:1px solid #0b6b58;background:#0b6b58;color:#fff;border-radius:7px;padding:7px 12px;cursor:pointer}' +
      '.file-body{max-width:1100px;margin:0 auto;padding:16px}@media print{.file-bar{display:none}.file-body{padding:0}}</style>\n' +
      '</head>\n<body>\n' +
      '<div class="file-bar"><span>Saved ' + escapeHtml(saved.toLocaleString('en-SG')) + '. To keep editing, open Waypoint and choose <b>Open file</b>, then pick this file.</span>' +
      '<button type="button" onclick="window.print()">Print or save as PDF</button></div>\n' +
      '<div class="file-body">' + (o.reportHtml || '') + '</div>\n' +
      '<script type="application/json" id="' + TAG_ID + '">' + embedJson(payload) + '</script>\n' +
      '</body>\n</html>\n';
  }

  // Returns the plan object from a saved .html or .json file, or null.
  function readPlanFile(text) {
    if (typeof text !== 'string' || !text.trim()) return null;
    var data = null;
    var trimmed = text.trim();
    try {
      if (trimmed.charAt(0) === '{') data = JSON.parse(trimmed);
      else {
        var m = text.match(new RegExp('<script[^>]*id=["\']' + TAG_ID + '["\'][^>]*>([\\s\\S]*?)</script>', 'i'));
        if (m) data = JSON.parse(m[1]);
      }
    } catch (e) { return null; }
    if (!data || typeof data !== 'object') return null;
    if (data.format === FORMAT && data.plan) return data.plan;
    if (data.people) return data; // bare plan JSON from the first version
    return null;
  }

  return { buildClientFile: buildClientFile, readPlanFile: readPlanFile, fileName: fileName, slug: slug, isoDate: isoDate, escapeHtml: escapeHtml };
});
