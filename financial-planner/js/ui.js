/* Shared UI primitives: formatting, form controls, status pills, icons. */
(function (FP) {
  'use strict';
  var h = preact.h;
  var hooks = preactHooks;
  var html = htm.bind(h);
  var useState = hooks.useState, useEffect = hooks.useEffect, useRef = hooks.useRef, useLayoutEffect = hooks.useLayoutEffect;

  // ------------------------------------------------------------- formatting
  var nf0 = new Intl.NumberFormat('en-SG', { maximumFractionDigits: 0 });
  function money(x) {
    if (x === null || x === undefined || !isFinite(x)) return '–';
    var r = Math.round(Math.abs(x));
    return (x < 0 && r > 0 ? '−' : '') + 'S$' + nf0.format(r);
  }
  function compact(x) {
    if (!isFinite(x)) return '–';
    var a = Math.abs(x), s = x < 0 ? '−' : '';
    if (a >= 1e6) return s + 'S$' + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return s + 'S$' + (a / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return s + 'S$' + Math.round(a);
  }
  function pct(x, digits) {
    if (!isFinite(x)) return '–';
    return (x * 100).toFixed(digits === undefined ? 0 : digits) + '%';
  }
  function slug(path) { return 'f-' + String(path).replace(/[^a-zA-Z0-9]+/g, '-'); }

  // ------------------------------------------------------------------ icons
  var ICON_PATHS = {
    plus: 'M12 5v14M5 12h14',
    trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
    download: 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14',
    upload: 'M12 20V9m0 0l-4 4m4-4l4 4M5 4h14',
    copy: 'M9 9h10v11H9zM5 15V4h10',
    print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
    reset: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4',
    chevron: 'M9 6l6 6-6 6',
    table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
    home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
    timeline: 'M4 19h16M6 16V9m4 7V5m4 11v-5m4 5V8',
    report: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    alert: 'M12 8v5m0 3.5v.5',
    x: 'M8 8l8 8M16 8l-8 8',
    sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7l1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2l-1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  };
  function Icon(props) {
    return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class=${props.class || ''}><path d=${ICON_PATHS[props.name]} /></svg>`;
  }
  function StatusIcon(props) {
    var s = props.status;
    if (s === 'good') return html`<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.5" fill="currentColor" /><path d="M4.6 8.3l2.2 2.2 4.6-4.8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
    if (s === 'warning') return html`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.2L15.2 14H.8z" fill="currentColor" /><path d="M8 6v3.6M8 11.6v.4" stroke="#3b2a00" stroke-width="1.7" stroke-linecap="round" /></svg>`;
    if (s === 'critical') return html`<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.5" fill="currentColor" /><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" /></svg>`;
    return html`<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4" fill="currentColor" /></svg>`;
  }
  var STATUS_TEXT = { good: 'On track', warning: 'Needs attention', critical: 'Action needed', neutral: 'Info' };
  function Pill(props) {
    var s = props.status || 'neutral';
    return html`<span class=${'pill ' + s}><${StatusIcon} status=${s} />${props.children || STATUS_TEXT[s]}</span>`;
  }

  // ---------------------------------------------------------------- layout
  function Card(props) {
    return html`<section class=${'card ' + (props.class || '')} id=${props.id}>
      ${(props.title || props.tools) && html`<div class="card-head">
        <div>${props.title && html`<h2>${props.title}</h2>`}${props.sub && html`<p class="sub">${props.sub}</p>`}</div>
        ${props.tools && html`<div class="tools">${props.tools}</div>`}
      </div>`}
      ${props.children}
    </section>`;
  }
  function Kpi(props) {
    return html`<div class=${'kpi ' + (props.hero ? 'hero' : '')}>
      <span class="label">${props.label}</span>
      <span class="value">${props.value}</span>
      ${props.note && html`<span class="note">${props.note}</span>`}
    </div>`;
  }
  function PageHead(props) {
    return html`<header class="page-head">
      <div>
        ${props.eyebrow && html`<div class="eyebrow">${props.eyebrow}</div>`}
        <h1>${props.title}</h1>
        ${props.lede && html`<p class="lede">${props.lede}</p>`}
      </div>
      ${props.tools && html`<div class="tools no-print" style="display:flex;gap:8px;flex-wrap:wrap">${props.tools}</div>`}
    </header>`;
  }

  // ----------------------------------------------------------------- fields
  function toText(v, percent) {
    if (v === '' || v === null || v === undefined) return '';
    var n = Number(v);
    if (!isFinite(n)) return '';
    return String(percent ? Math.round(n * 100 * 10000) / 10000 : n);
  }

  // Numeric input that keeps what the user is typing (e.g. "1.") while
  // committing parsed numbers to state.
  function NumberField(props) {
    var percent = !!props.percent;
    var st = useState(toText(props.value, percent)), text = st[0], setText = st[1];
    var focused = useRef(false);
    useEffect(function () { if (!focused.current) setText(toText(props.value, percent)); }, [props.value]);
    function onInput(e) {
      var t = e.currentTarget.value;
      setText(t);
      if (t.trim() === '') { props.onChange(props.allowBlank ? '' : 0); return; }
      var n = parseFloat(t.replace(/[,\s]/g, ''));
      if (isFinite(n)) props.onChange(percent ? n / 100 : n);
    }
    var id = props.id || slug(props.path || props.label);
    var control = html`<div class=${'control' + (props.cls ? ' ' + props.cls : '') + (props.readOnly ? ' readonly' : '')}>
      ${props.prefix !== undefined ? (props.prefix && html`<span class="adorn">${props.prefix}</span>`) : (!percent && !props.suffix && html`<span class="adorn">S$</span>`)}
      <input id=${id} inputmode="decimal" autocomplete="off" value=${text} readOnly=${props.readOnly}
        placeholder=${props.placeholder || ''} aria-label=${props.bare ? props.label : undefined}
        onFocus=${function () { focused.current = true; }}
        onBlur=${function () { focused.current = false; setText(toText(props.value, percent)); }}
        onInput=${onInput} />
      ${(percent || props.suffix) && html`<span class="adorn end">${props.suffix || '%'}</span>`}
    </div>`;
    if (props.bare) return control;
    return html`<div class="field">
      <label for=${id}>${props.label}</label>
      ${control}
      ${props.hint && html`<span class="hint">${props.hint}</span>`}
    </div>`;
  }

  function TextField(props) {
    var id = props.id || slug(props.path || props.label);
    var control = html`<div class="control"><input id=${id} type="text" autocomplete="off" value=${props.value || ''}
      placeholder=${props.placeholder || ''} aria-label=${props.bare ? props.label : undefined}
      onInput=${function (e) { props.onChange(e.currentTarget.value); }} /></div>`;
    if (props.bare) return control;
    return html`<div class="field"><label for=${id}>${props.label}</label>${control}${props.hint && html`<span class="hint">${props.hint}</span>`}</div>`;
  }

  function SelectField(props) {
    var id = props.id || slug(props.path || props.label);
    var control = html`<div class="control"><select id=${id} aria-label=${props.bare ? props.label : undefined}
      onChange=${function (e) { props.onChange(e.currentTarget.value); }}>
      ${props.options.map(function (o) { return html`<option value=${o.value} selected=${String(o.value) === String(props.value)}>${o.label}</option>`; })}
    </select></div>`;
    if (props.bare) return control;
    return html`<div class="field"><label for=${id}>${props.label}</label>${control}${props.hint && html`<span class="hint">${props.hint}</span>`}</div>`;
  }

  function Check(props) {
    var id = props.id || slug(props.path || props.label);
    return html`<label class="check" for=${id}><input id=${id} type="checkbox" checked=${!!props.checked}
      onChange=${function (e) { props.onChange(e.currentTarget.checked); }} />${props.label}</label>`;
  }

  function Seg(props) {
    return html`<div class="seg" role="group" aria-label=${props.label}>
      ${props.options.map(function (o) {
        return html`<button type="button" title=${o.title} aria-pressed=${String(o.value === props.value)} onClick=${function () { props.onChange(o.value); }}>${o.label}</button>`;
      })}
    </div>`;
  }

  // A destructive button that asks for a second click instead of confirm().
  function ConfirmButton(props) {
    var st = useState(false), armed = st[0], setArmed = st[1];
    useEffect(function () {
      if (!armed) return undefined;
      var t = setTimeout(function () { setArmed(false); }, 3500);
      return function () { clearTimeout(t); };
    }, [armed]);
    return html`<button type="button" class=${'btn ' + (props.class || '') + (armed ? ' danger confirm' : '')}
      onClick=${function () { if (armed) { setArmed(false); props.onConfirm(); } else setArmed(true); }}>
      ${props.icon && html`<${Icon} name=${props.icon} />`}${armed ? (props.confirmLabel || 'Click again to confirm') : props.children}
    </button>`;
  }

  // Plain-language explanations for Singapore planning terms, shown on hover.
  var GLOSSARY = {
    TPD: 'Total and permanent disability: unable to work again',
    CI: 'Critical illness, such as cancer, heart attack or stroke',
    OA: 'CPF Ordinary Account: housing, insurance and investment',
    SA: 'CPF Special Account: retirement savings, closed at 55',
    MA: 'CPF MediSave Account: hospital bills and health insurance',
    RA: 'CPF Retirement Account: set up at 55 and used for CPF LIFE',
    BRS: 'Basic Retirement Sum',
    FRS: 'Full Retirement Sum: twice the Basic Retirement Sum',
    ERS: 'Enhanced Retirement Sum: four times the Basic Retirement Sum',
    'CPF LIFE': 'The national annuity: monthly payouts for life from 65',
    AWS: 'Annual Wage Supplement, the "13th month" bonus',
  };
  function Term(props) {
    var t = GLOSSARY[props.t];
    return t ? html`<abbr title=${t}>${props.children || props.t}</abbr>` : html`<span>${props.children || props.t}</span>`;
  }

  function Meter(props) {
    var w = Math.max(0, Math.min(1, props.value || 0)) * 100;
    return html`<div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(w)} aria-label=${props.label}><i class=${props.status || 'good'} style=${'width:' + w + '%'} /></div>`;
  }

  // ---------------------------------------------------------------- effects
  function useWidth(ref, fallback) {
    var st = useState(fallback || 720), w = st[0], setW = st[1];
    useLayoutEffect(function () {
      var el = ref.current;
      if (!el) return undefined;
      setW(el.clientWidth || fallback || 720);
      if (typeof ResizeObserver === 'undefined') return undefined;
      var ro = new ResizeObserver(function (entries) {
        var cw = Math.round(entries[0].contentRect.width);
        if (cw > 0) setW(cw);
      });
      ro.observe(el);
      return function () { ro.disconnect(); };
    }, []);
    return w;
  }

  // ---------------------------------------------------------------- browser
  var inFrame = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();

  var store = {
    get: function (key) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } },
  };

  function download(name, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || 'text/plain' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      return true;
    } catch (e) { return false; }
  }

  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return Promise.resolve(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
    }
    return fallback();
  }

  FP.ui = {
    html: html, h: h, money: money, compact: compact, pct: pct, slug: slug,
    Icon: Icon, Pill: Pill, StatusIcon: StatusIcon, STATUS_TEXT: STATUS_TEXT, Card: Card, Kpi: Kpi, PageHead: PageHead,
    NumberField: NumberField, TextField: TextField, SelectField: SelectField, Check: Check, Seg: Seg,
    ConfirmButton: ConfirmButton, Meter: Meter, Term: Term, GLOSSARY: GLOSSARY, useWidth: useWidth, inFrame: inFrame, store: store,
    download: download, copyText: copyText,
  };
})(window.FP = window.FP || {});
