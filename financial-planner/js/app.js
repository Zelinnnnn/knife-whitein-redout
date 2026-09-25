/* App shell: state, persistence, routing and navigation. */
(function (FP) {
  'use strict';
  var ui = FP.ui, html = ui.html, V = FP.views, calc = FP.calc, data = FP.data;
  var hooks = preactHooks;
  var useState = hooks.useState, useEffect = hooks.useEffect, useMemo = hooks.useMemo, useCallback = hooks.useCallback, useRef = hooks.useRef;
  var STORE_KEY = 'waypoint-plan-v1';

  var NAV = [
    { group: 'Plan', items: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'timeline', label: 'Life timeline', icon: 'timeline' },
      { id: 'report', label: 'Report', icon: 'report' },
    ] },
    { group: 'Fact-find', items: [
      { id: 'profile', label: 'Profile', step: 1 },
      { id: 'cashflow', label: 'Cashflow', step: 2, check: 'surplus' },
      { id: 'networth', label: 'Assets & liabilities', step: 3, check: 'emergency' },
      { id: 'protection', label: 'Protection', step: 4, check: 'protection' },
      { id: 'cpf', label: 'CPF', step: 5 },
      { id: 'goals', label: 'Goals', step: 6 },
      { id: 'retirement', label: 'Retirement', step: 7, check: 'retirement' },
      { id: 'tax', label: 'Income tax', step: 8 },
    ] },
  ];
  var VIEW_IDS = [];
  NAV.forEach(function (g) { g.items.forEach(function (i) { VIEW_IDS.push(i.id); }); });

  // ------------------------------------------------------------------ state
  function setIn(obj, keys, value) {
    if (!keys.length) return value;
    var k = keys[0];
    var copy = Array.isArray(obj) ? obj.slice() : Object.assign({}, obj);
    copy[k] = setIn(obj == null ? undefined : obj[k], keys.slice(1), value);
    return copy;
  }
  function getIn(obj, keys) { return keys.reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }

  // Fill any missing sections from the blank template so older or imported
  // files still load.
  function normalize(s) {
    if (!s || typeof s !== 'object' || !s.people) return null;
    var b = data.blank();
    var out = Object.assign({}, b, s);
    ['people', 'income', 'cpf', 'tax', 'investing'].forEach(function (k) {
      out[k] = Object.assign({}, b[k], s[k] || {});
      ['client', 'spouse'].forEach(function (p) {
        if (b[k][p] && typeof b[k][p] === 'object') out[k][p] = Object.assign({}, b[k][p], (s[k] || {})[p] || {});
      });
    });
    out.assumptions = Object.assign({}, b.assumptions, s.assumptions || {});
    out.assumptions.allocation = Object.assign({}, b.assumptions.allocation, (s.assumptions || {}).allocation || {});
    out.assumptions.taxRebate = Object.assign({}, b.assumptions.taxRebate, (s.assumptions || {}).taxRebate || {});
    out.retirement = Object.assign({}, b.retirement, s.retirement || {});
    out.scenario = Object.assign({}, b.scenario, s.scenario || {});
    ['expenses', 'assets', 'liabilities', 'policies', 'goals'].forEach(function (k) {
      out[k] = Array.isArray(s[k]) ? s[k].map(function (x) { return x && x.id ? x : Object.assign({ id: data.id(k) }, x); }) : b[k];
    });
    out.meta = Object.assign({}, s.meta || {});
    return out;
  }

  function initialState() {
    return normalize(ui.store.get(STORE_KEY)) || data.sample();
  }
  function viewFromHash() {
    var h = (location.hash || '').replace('#', '');
    return VIEW_IDS.indexOf(h) >= 0 ? h : 'overview';
  }

  // ------------------------------------------------------------------ shell
  function BrandMark() {
    return html`<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M7 23.5l6-6 4 3.5 8-10" fill="none" stroke="var(--accent-ink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="25" cy="11" r="3" fill="var(--accent-ink)" />
    </svg>`;
  }

  function App() {
    var st = useState(initialState), state = st[0], setState = st[1];
    var vs = useState(viewFromHash), view = vs[0], setView = vs[1];
    var ms = useState(''), notice = ms[0], setNotice = ms[1];
    var fileRef = useRef(null);
    var model = useMemo(function () { return calc.computeAll(state); }, [state]);

    useEffect(function () {
      function onHash() { setView(viewFromHash()); window.scrollTo(0, 0); }
      window.addEventListener('hashchange', onHash);
      return function () { window.removeEventListener('hashchange', onHash); };
    }, []);
    useEffect(function () {
      var t = setTimeout(function () { ui.store.set(STORE_KEY, state); }, 250);
      return function () { clearTimeout(t); };
    }, [state]);
    useEffect(function () {
      if (!notice) return undefined;
      var t = setTimeout(function () { setNotice(''); }, 4000);
      return function () { clearTimeout(t); };
    }, [notice]);

    var api = useMemo(function () {
      function update(path, fn) { var keys = path.split('.'); setState(function (s) { return setIn(s, keys, fn(getIn(s, keys))); }); }
      return {
        set: function (path, value) { update(path, function () { return value; }); },
        update: update,
        setItem: function (list, id, key, value) {
          update(list, function (arr) { return (arr || []).map(function (x) { if (x.id !== id) return x; var c = Object.assign({}, x); c[key] = value; return c; }); });
        },
        addItem: function (list, item) { update(list, function (arr) { return (arr || []).concat([item]); }); },
        removeItem: function (list, id) { update(list, function (arr) { return (arr || []).filter(function (x) { return x.id !== id; }); }); },
      };
    }, []);

    var go = useCallback(function (id) { location.hash = id; }, []);

    function exportPlan() {
      var json = JSON.stringify(state, null, 2);
      var name = (state.household || 'financial-plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.json';
      if (!ui.inFrame && ui.download(name, json, 'application/json')) { setNotice('Saved ' + name); return; }
      ui.copyText(json).then(function (ok) { setNotice(ok ? 'Plan copied to the clipboard as JSON' : 'Copy failed'); });
    }
    function importPlan(e) {
      var file = e.currentTarget.files && e.currentTarget.files[0];
      e.currentTarget.value = '';
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var s = normalize(JSON.parse(String(reader.result)));
          if (!s) throw new Error('bad');
          s.meta = Object.assign({}, s.meta, { sample: false });
          setState(s);
          setNotice('Loaded ' + file.name);
        } catch (err) {
          setNotice('That file is not a plan exported from this tool.');
        }
      };
      reader.readAsText(file);
    }

    var Page = V[view] || V.overview;
    var statusOf = function (id) { var i = model.health.items.find(function (x) { return x.id === id; }); return i ? i.status : 'good'; };
    var who = model.people.map(function (p) { return p.name + ' · ' + p.age; }).join('  /  ');

    return html`<div class="app">
      <aside class="side">
        <div class="brand"><${BrandMark} /><div><div class="brand-name">Waypoint</div><div class="brand-sub">Financial planner</div></div></div>
        <div class="household"><div class="label">Planning for</div><div class="name">${state.household || 'Unnamed household'}</div><div class="who">${who}</div></div>
        <nav class="nav" aria-label="Sections">
          ${NAV.map(function (g) {
            return html`<div class="nav-group"><div class="nav-title">${g.group}</div>
              ${g.items.map(function (i) {
                var s = i.check ? statusOf(i.check) : 'good';
                return html`<a href=${'#' + i.id} aria-current=${view === i.id ? 'page' : undefined}>
                  ${i.step ? html`<span class="step">${i.step}</span>` : html`<span class="dot"><${ui.Icon} name=${i.icon} /></span>`}
                  <span>${i.label}</span>
                  ${s !== 'good' && html`<span class="flag" style=${'background:var(--' + s + ')'} title=${ui.STATUS_TEXT[s]}><span class="sr-only">${ui.STATUS_TEXT[s]}</span></span>`}
                </a>`;
              })}
            </div>`;
          })}
        </nav>
        <div class="mobile-actions">
          <button class="btn sm" onClick=${exportPlan} aria-label="Export plan"><${ui.Icon} name=${ui.inFrame ? 'copy' : 'download'} /></button>
          <button class="btn sm" onClick=${function () { fileRef.current.click(); }} aria-label="Import plan"><${ui.Icon} name="upload" /></button>
        </div>
        <div class="side-actions">
          <div class="row">
            <button class="btn sm" onClick=${exportPlan} title="Save the plan as a JSON file"><${ui.Icon} name=${ui.inFrame ? 'copy' : 'download'} />${ui.inFrame ? 'Copy' : 'Export'}</button>
            <button class="btn sm" onClick=${function () { fileRef.current.click(); }} title="Load a plan JSON file"><${ui.Icon} name="upload" />Import</button>
          </div>
          <${ui.ConfirmButton} class="sm ghost" icon="reset" onConfirm=${function () { setState(data.sample()); setNotice('Sample household loaded'); }} confirmLabel="Replace with sample?">Load sample</${ui.ConfirmButton}>
          <${ui.ConfirmButton} class="sm ghost" icon="trash" onConfirm=${function () { setState(data.blank()); go('profile'); }} confirmLabel="Clear every field?">Start blank plan</${ui.ConfirmButton}>
          <p class="small muted" style="padding:4px 6px 0">Saved in this browser only. Estimates use 2026 Singapore rules.</p>
        </div>
        <input type="file" accept="application/json,.json" ref=${fileRef} onChange=${importPlan} hidden />
      </aside>
      <main class="main">
        ${((state.meta && state.meta.sample) || notice) && html`<div class="page" style="margin-bottom:18px">
          ${state.meta && state.meta.sample && html`<div class="banner">
            <p><b>Sample household.</b> These figures follow the Excel template's worked example, with a spouse, CPF balances and cover amounts added for illustration. Edit anything, or start from a blank plan.</p>
            <div class="actions">
              <${ui.ConfirmButton} class="sm primary" onConfirm=${function () { setState(data.blank()); go('profile'); }} confirmLabel="Clear the sample?">Start blank plan</${ui.ConfirmButton}>
              <button class="btn sm ghost" onClick=${function () { api.set('meta.sample', false); }}>Keep editing</button>
            </div>
          </div>`}
          ${notice && html`<div class="banner" role="status"><p>${notice}</p></div>`}
        </div>`}
        <${Page} state=${state} model=${model} api=${api} go=${go} />
      </main>
    </div>`;
  }

  preact.render(html`<${App} />`, document.getElementById('app'));
})(window.FP = window.FP || {});
