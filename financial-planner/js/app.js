/* App shell: client library, persistence, files, routing and navigation. */
(function (FP) {
  'use strict';
  var ui = FP.ui, html = ui.html, V = FP.views, calc = FP.calc, data = FP.data, files = FP.files;
  var hooks = preactHooks;
  var useState = hooks.useState, useEffect = hooks.useEffect, useMemo = hooks.useMemo, useCallback = hooks.useCallback, useRef = hooks.useRef;
  var LIB_KEY = 'waypoint-clients-v1';
  var OLD_KEY = 'waypoint-plan-v1';
  var FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Public+Sans:wght@400..700&display=swap';

  var NAV = [
    { group: 'Plan', items: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'timeline', label: 'Life timeline', icon: 'timeline' },
      { id: 'report', label: 'Report', icon: 'report' },
    ] },
    { group: 'Client details', items: [
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
  var VIEW_IDS = [], STEPS = [];
  NAV.forEach(function (g) { g.items.forEach(function (i) { VIEW_IDS.push(i.id); if (i.step) STEPS.push(i.id); }); });

  // ------------------------------------------------------------------ state
  function setIn(obj, keys, value) {
    if (!keys.length) return value;
    var k = keys[0];
    var copy = Array.isArray(obj) ? obj.slice() : Object.assign({}, obj);
    copy[k] = setIn(obj == null ? undefined : obj[k], keys.slice(1), value);
    return copy;
  }
  function getIn(obj, keys) { return keys.reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function newId() { return 'plan-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function withId(s) { s.meta = Object.assign({}, s.meta, { planId: newId(), created: Date.now() }); return s; }
  function planName(s) { return (s && (s.household || (s.people && s.people.client && s.people.client.name))) || 'Unnamed client'; }

  // Fill any missing sections from the blank plan so older or imported files still load.
  function normalize(s) {
    if (!s || typeof s !== 'object' || !s.people) return null;
    var b = data.blank();
    var out = Object.assign({}, b, s);
    ['people', 'income', 'cpf', 'tax', 'investing', 'needs'].forEach(function (k) {
      out[k] = Object.assign({}, b[k] || {}, s[k] || {});
      ['client', 'spouse'].forEach(function (p) {
        if (b[k] && b[k][p] && typeof b[k][p] === 'object') out[k][p] = Object.assign({}, b[k][p], (s[k] || {})[p] || {});
      });
    });
    out.assumptions = Object.assign({}, b.assumptions, s.assumptions || {});
    out.assumptions.allocation = Object.assign({}, b.assumptions.allocation, (s.assumptions || {}).allocation || {});
    out.assumptions.taxRebate = Object.assign({}, b.assumptions.taxRebate, (s.assumptions || {}).taxRebate || {});
    out.retirement = Object.assign({}, b.retirement, s.retirement || {});
    out.scenario = Object.assign({}, b.scenario, s.scenario || {});
    out.display = Object.assign({ todayDollars: true }, s.display || {});
    ['expenses', 'assets', 'liabilities', 'policies', 'goals'].forEach(function (k) {
      out[k] = Array.isArray(s[k]) ? s[k].map(function (x) { return x && x.id ? x : Object.assign({ id: data.id(k) }, x); }) : b[k];
    });
    out.meta = Object.assign({}, s.meta || {});
    if (!out.meta.planId) out = withId(out);
    return out;
  }

  function entry(state) { return { id: state.meta.planId, name: planName(state), updated: Date.now(), state: state }; }

  function loadLibrary() {
    var lib = ui.store.get(LIB_KEY);
    if (lib && lib.plans && lib.currentId && lib.plans[lib.currentId]) return lib;
    var first = normalize(ui.store.get(OLD_KEY)) || withId(data.sample());
    lib = { currentId: first.meta.planId, plans: {} };
    lib.plans[first.meta.planId] = entry(first);
    return lib;
  }

  function viewFromHash() {
    var h = (location.hash || '').replace('#', '');
    return VIEW_IDS.indexOf(h) >= 0 ? h : 'overview';
  }

  // ------------------------------------------------------------------ files
  // In the Claude artifact viewer, files go through the downloads capability.
  var downloadsReady = ui.inFrame && window.claude && typeof window.claude.use === 'function'
    ? Promise.resolve(window.claude.use('downloads')).catch(function () { return null; })
    : Promise.resolve(null);

  function saveFile(name, text, mime) {
    if (!ui.inFrame) return Promise.resolve(ui.download(name, text, mime) ? 'Saved ' + name + ' to your downloads.' : 'Could not save the file.');
    return downloadsReady.then(function (dl) {
      if (!dl) {
        return ui.copyText(text).then(function (ok) { return ok ? 'Saving files is not available here, so the file contents were copied to the clipboard.' : 'Saving files is not available here.'; });
      }
      return dl.save({ filename: name, data: text }).then(function () { return 'Saved ' + name + '.'; }, function (err) {
        var code = err && err.code;
        if (code === 'declined') return 'Save cancelled.';
        if (code === 'rate_limited') return 'A save is already waiting for your answer.';
        return 'Could not save the file (' + (code || 'unknown error') + ').';
      });
    });
  }

  function collectCss() {
    var out = '';
    for (var i = 0; i < document.styleSheets.length; i++) {
      try {
        var rules = document.styleSheets[i].cssRules;
        for (var j = 0; j < rules.length; j++) out += rules[j].cssText + '\n';
      } catch (e) { /* cross-origin sheet, e.g. web fonts, or any sheet under file:// */ }
    }
    // Under file:// the linked stylesheet cannot be read, so use the embedded copy.
    return out.indexOf('.report') >= 0 ? out : (FP.styles || out);
  }

  // Render the report off-screen and capture it as static HTML.
  function reportMarkup(state, model) {
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:-10000px;top:0;width:1040px';
    document.body.appendChild(el);
    preact.render(html`<${V.ReportBody} model=${model} state=${state} />`, el);
    var out = el.innerHTML;
    preact.render(null, el);
    el.remove();
    return out;
  }

  // ------------------------------------------------------------------ shell
  function BrandMark() {
    return html`<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M7 23.5l6-6 4 3.5 8-10" fill="none" stroke="var(--accent-ink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="25" cy="11" r="3" fill="var(--accent-ink)" />
    </svg>`;
  }

  function StepNav(props) {
    var i = STEPS.indexOf(props.view);
    if (i < 0) return null;
    var prev = STEPS[i - 1], next = STEPS[i + 1];
    return html`<nav class="step-nav no-print" aria-label="Steps">
      ${prev ? html`<button type="button" class="btn" onClick=${function () { props.go(prev); }}>← ${V.SECTION_NAMES[prev]}</button>` : html`<span />`}
      ${next ? html`<button type="button" class="btn primary" onClick=${function () { props.go(next); }}>Next: ${V.SECTION_NAMES[next]} →</button>`
        : html`<button type="button" class="btn primary" onClick=${function () { props.go('overview'); }}>See the overview →</button>`}
    </nav>`;
  }

  function App() {
    var ls = useState(loadLibrary), lib = ls[0], setLib = ls[1];
    var st = useState(function () { return normalize(lib.plans[lib.currentId].state) || withId(data.sample()); }), state = st[0], setState = st[1];
    var vs = useState(viewFromHash), view = vs[0], setView = vs[1];
    var ms = useState(''), notice = ms[0], setNotice = ms[1];
    var ds = useState(false), dragging = ds[0], setDragging = ds[1];
    var fileRef = useRef(null);
    var model = useMemo(function () { return calc.computeAll(state); }, [state]);

    useEffect(function () {
      function onHash() { setView(viewFromHash()); window.scrollTo(0, 0); }
      window.addEventListener('hashchange', onHash);
      return function () { window.removeEventListener('hashchange', onHash); };
    }, []);
    // Save the current client into the library shortly after each change.
    useEffect(function () {
      var t = setTimeout(function () {
        setLib(function (prev) {
          var next = { currentId: state.meta.planId, plans: Object.assign({}, prev.plans) };
          next.plans[state.meta.planId] = entry(state);
          ui.store.set(LIB_KEY, next);
          return next;
        });
      }, 250);
      return function () { clearTimeout(t); };
    }, [state]);
    useEffect(function () {
      if (!notice) return undefined;
      var t = setTimeout(function () { setNotice(''); }, 6000);
      return function () { clearTimeout(t); };
    }, [notice]);

    var api = useMemo(function () {
      function update(path, fn) { var keys = path.split('.'); setState(function (s) { return setIn(s, keys, fn(getIn(s, keys))); }); }
      return {
        set: function (path, value) { update(path, function () { return value; }); },
        update: update,
        replace: function (fn) { setState(fn); },
        setItem: function (list, id, key, value) {
          update(list, function (arr) { return (arr || []).map(function (x) { if (x.id !== id) return x; var c = Object.assign({}, x); c[key] = value; return c; }); });
        },
        addItem: function (list, item) { update(list, function (arr) { return (arr || []).concat([item]); }); },
        removeItem: function (list, id) { update(list, function (arr) { return (arr || []).filter(function (x) { return x.id !== id; }); }); },
      };
    }, []);

    var go = useCallback(function (id) {
      if (location.hash === '#' + id) { setView(id); window.scrollTo(0, 0); } else location.hash = id;
    }, []);

    function openState(s, message) {
      setState(s);
      go('overview');
      if (message) setNotice(message);
    }
    function newClient() { openState(withId(data.blank()), 'New client started. Use the quick start or work through each step.'); }
    function sampleClient() { openState(withId(data.sample()), 'Sample household added as a new client.'); }
    function switchTo(id) { var p = lib.plans[id]; if (p) openState(normalize(p.state), 'Switched to ' + p.name + '.'); }
    function deleteClient() {
      var id = state.meta.planId, rest = Object.keys(lib.plans).filter(function (k) { return k !== id; });
      var nextLib = { currentId: null, plans: {} };
      rest.forEach(function (k) { nextLib.plans[k] = lib.plans[k]; });
      var nextState = rest.length ? normalize(lib.plans[rest.sort(function (a, b) { return lib.plans[b].updated - lib.plans[a].updated; })[0]].state) : withId(data.blank());
      nextLib.currentId = nextState.meta.planId;
      ui.store.set(LIB_KEY, nextLib);
      setLib(nextLib);
      openState(nextState, 'Deleted ' + planName(state) + ' from this browser.');
    }

    var actions = useMemo(function () {
      return {
        saveText: function (name, text, mime) { return saveFile(name, text, mime); },
        saveClientFile: function () {
          var fileHtml = files.buildClientFile({ state: state, reportHtml: reportMarkup(state, model), css: collectCss(), title: planName(state) });
          var withFonts = fileHtml.replace('<style>', '<link rel="stylesheet" href="' + FONTS + '">\n<style>');
          return saveFile(files.fileName(state), withFonts, 'text/html');
        },
      };
    }, [state, model]);

    function saveClientFile() { actions.saveClientFile().then(setNotice); }

    function importText(text, name) {
      var plan = files.readPlanFile(text);
      var s = plan && normalize(plan);
      if (!s) { setNotice((name ? name + ' is' : 'That file is') + ' not a Waypoint client file.'); return; }
      s.meta = Object.assign({}, s.meta, { sample: false });
      var known = !!lib.plans[s.meta.planId];
      openState(s, 'Opened ' + planName(s) + (known ? ', replacing the copy saved in this browser.' : '.'));
    }
    function readFile(file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { importText(String(reader.result), file.name); };
      reader.onerror = function () { setNotice('Could not read ' + file.name + '.'); };
      reader.readAsText(file);
    }
    function onPick(e) {
      var file = e.currentTarget.files && e.currentTarget.files[0];
      e.currentTarget.value = '';
      readFile(file);
    }

    // Drop a client file anywhere to open it.
    useEffect(function () {
      var depth = 0;
      function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; }
      function enter(e) { if (!hasFiles(e)) return; e.preventDefault(); depth++; setDragging(true); }
      function over(e) { if (hasFiles(e)) e.preventDefault(); }
      function leave(e) { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) setDragging(false); }
      function drop(e) {
        if (!hasFiles(e)) return;
        e.preventDefault(); depth = 0; setDragging(false);
        readFile(e.dataTransfer.files[0]);
      }
      window.addEventListener('dragenter', enter); window.addEventListener('dragover', over);
      window.addEventListener('dragleave', leave); window.addEventListener('drop', drop);
      return function () {
        window.removeEventListener('dragenter', enter); window.removeEventListener('dragover', over);
        window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop);
      };
    }, [lib]);

    var Page = V[view] || V.overview;
    var statusOf = function (id) { var i = model.health.items.find(function (x) { return x.id === id; }); return i ? i.status : 'good'; };
    var who = model.people.map(function (p) { return p.name + ' · ' + p.age; }).join('  /  ');
    var clients = Object.keys(lib.plans).map(function (k) { return lib.plans[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (!lib.plans[state.meta.planId]) clients.push({ id: state.meta.planId, name: planName(state) });

    return html`<div class="app">
      <aside class="side">
        <div class="brand"><${BrandMark} /><div><div class="brand-name">Waypoint</div><div class="brand-sub">Financial planner</div></div></div>
        <div class="client-picker">
          <label class="label" for="client-select">Client</label>
          <div class="control"><select id="client-select" onChange=${function (e) { var v = e.currentTarget.value; if (v === '__new') newClient(); else if (v !== state.meta.planId) switchTo(v); }}>
            ${clients.map(function (c) { return html`<option value=${c.id} selected=${c.id === state.meta.planId}>${c.id === state.meta.planId ? planName(state) : c.name}</option>`; })}
            <option value="__new">+ New client</option>
          </select></div>
          <div class="who">${who}</div>
          <div class="row">
            <button type="button" class="btn sm" onClick=${function () { fileRef.current.click(); }} title="Open a saved client file (.html or .json)"><${ui.Icon} name="upload" />Open file</button>
            <button type="button" class="btn sm primary" onClick=${saveClientFile} title="Save this client as a report file you can reopen later"><${ui.Icon} name="download" />Save file</button>
          </div>
        </div>
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
          <div class="nav-legend" aria-hidden="true"><span><i style="background:var(--warning)" />Needs attention</span><span><i style="background:var(--critical)" />Action needed</span></div>
        </nav>
        <div class="mobile-actions">
          <button class="btn sm" onClick=${function () { fileRef.current.click(); }} aria-label="Open client file"><${ui.Icon} name="upload" /></button>
          <button class="btn sm primary" onClick=${saveClientFile} aria-label="Save client file"><${ui.Icon} name="download" /></button>
        </div>
        <div class="side-actions">
          <button type="button" class="btn sm ghost" onClick=${newClient}><${ui.Icon} name="plus" />New client</button>
          <button type="button" class="btn sm ghost" onClick=${sampleClient}><${ui.Icon} name="reset" />Add sample household</button>
          <${ui.ConfirmButton} class="sm ghost" icon="trash" onConfirm=${deleteClient} confirmLabel=${'Delete ' + planName(state) + '?'}>Delete this client</${ui.ConfirmButton}>
          <p class="small muted" style="padding:4px 6px 0">Saved automatically in this browser. Use Save file to keep a copy or move a client to another device. You can also drop a saved file anywhere on this page.</p>
        </div>
        <input type="file" accept=".html,.htm,.json,text/html,application/json" ref=${fileRef} onChange=${onPick} hidden />
      </aside>
      <main class="main">
        ${((state.meta && state.meta.sample) || notice) && html`<div class="page" style="margin-bottom:18px">
          ${state.meta && state.meta.sample && html`<div class="banner">
            <p><b>Sample household</b> for demonstration. Start a new client when you are ready; this sample stays in the client list.</p>
            <div class="actions">
              <button type="button" class="btn sm primary" onClick=${newClient}>New client</button>
              <button type="button" class="btn sm ghost" onClick=${function () { api.set('meta.sample', false); }}>Hide</button>
            </div>
          </div>`}
          ${notice && html`<div class="banner" role="status"><p>${notice}</p><div class="actions"><button type="button" class="btn sm ghost" onClick=${function () { setNotice(''); }}>Dismiss</button></div></div>`}
        </div>`}
        <${Page} state=${state} model=${model} api=${api} go=${go} actions=${actions} />
        <div class="page" style="margin-top:18px"><${StepNav} view=${view} go=${go} /></div>
      </main>
      ${dragging && html`<div class="drop-overlay"><div>Drop a Waypoint client file to open it</div></div>`}
    </div>`;
  }

  preact.render(html`<${App} />`, document.getElementById('app'));
})(window.FP = window.FP || {});
