/* SVG charts drawn to one scale, with hover and keyboard tooltips. */
(function (FP) {
  'use strict';
  var ui = FP.ui, html = ui.html;
  var hooks = preactHooks, useState = hooks.useState, useRef = hooks.useRef;

  function niceStep(range, count) {
    var raw = range / Math.max(1, count);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  }
  function niceTicks(min, max, count) {
    if (max === min) max = min + 1;
    var step = niceStep(max - min, count || 5);
    var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    var ticks = [];
    for (var v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return ticks;
  }

  // Column with a 4px rounded data end and a square base.
  function colPath(x, y0, y1, w, round) {
    var top = Math.min(y0, y1), bottom = Math.max(y0, y1), hgt = bottom - top;
    if (hgt <= 0 || w <= 0) return '';
    var r = round ? Math.min(4, w / 2, hgt) : 0;
    if (!r) return 'M' + x + ',' + top + 'h' + w + 'v' + hgt + 'h' + (-w) + 'z';
    if (y1 < y0) { // grows up: round the top
      return 'M' + x + ',' + bottom + 'V' + (top + r) + 'Q' + x + ',' + top + ' ' + (x + r) + ',' + top +
        'H' + (x + w - r) + 'Q' + (x + w) + ',' + top + ' ' + (x + w) + ',' + (top + r) + 'V' + bottom + 'z';
    }
    return 'M' + x + ',' + top + 'V' + (bottom - r) + 'Q' + x + ',' + bottom + ' ' + (x + r) + ',' + bottom +
      'H' + (x + w - r) + 'Q' + (x + w) + ',' + bottom + ' ' + (x + w) + ',' + (bottom - r) + 'V' + top + 'z';
  }

  /*
   * Stacked yearly columns. series: [{key, label, cls, value(row)}]
   * negative(row) draws a shortfall column below zero. baseline(row) draws a
   * comparison line. lines: [{x, label}] vertical markers. pins(row) -> bool.
   */
  function StackedColumns(props) {
    var ref = useRef(null);
    var width = ui.useWidth(ref, 760);
    var st = useState(null), hover = st[0], setHover = st[1];
    var rows = props.rows || [];
    var height = props.height || 320;
    var compact = width < 520;
    var m = { l: compact ? 44 : 56, r: 10, t: props.lines && props.lines.length ? 30 : 12, b: props.pins ? 40 : 26 };
    var pw = Math.max(10, width - m.l - m.r), ph = height - m.t - m.b;
    var n = Math.max(1, rows.length);
    var band = pw / n;
    var bw = Math.max(1.5, Math.min(24, band * 0.72));
    var gap = band > 6 ? 2 : 1;

    var maxV = 0, minV = 0;
    rows.forEach(function (r) {
      var tot = 0;
      props.series.forEach(function (s) { tot += Math.max(0, s.value(r)); });
      maxV = Math.max(maxV, tot, props.baseline ? props.baseline(r) || 0 : 0);
      if (props.negative) minV = Math.min(minV, props.negative(r));
      if (props.baseline) minV = Math.min(minV, props.baseline(r) || 0);
    });
    var ticks = niceTicks(minV, maxV, compact ? 4 : 5);
    var y0 = ticks[0], y1 = ticks[ticks.length - 1];
    function y(v) { return m.t + ph - (v - y0) / (y1 - y0) * ph; }
    function x(i) { return m.l + i * band; }
    var zero = y(0);

    var xEvery = n > 50 ? 10 : n > 20 ? 5 : n > 10 ? 2 : 1;
    if (compact && n > 30) xEvery = 10;

    var bars = [];
    rows.forEach(function (r, i) {
      var cx = x(i) + (band - bw) / 2, acc = 0;
      var vis = props.series.filter(function (s) { return s.value(r) > 0; });
      vis.forEach(function (s, k) {
        var v = s.value(r);
        var top = y(acc + v), base = y(acc);
        var isTop = k === vis.length - 1;
        // 2px surface gap between stacked segments
        var segBase = k > 0 ? base - gap / 2 : base;
        var segTop = isTop ? top : top + gap / 2;
        if (segBase - segTop > 0.5) bars.push(html`<path class=${s.cls} d=${colPath(cx, segBase, segTop, bw, isTop)} />`);
        acc += v;
      });
      if (props.negative) {
        var nv = props.negative(r);
        if (nv < 0) bars.push(html`<path class="fill-short" d=${colPath(cx, zero, y(nv), bw, true)} />`);
      }
    });

    var baselinePath = '';
    if (props.baseline) {
      rows.forEach(function (r, i) {
        var v = props.baseline(r);
        if (v === null || v === undefined) return;
        baselinePath += (baselinePath ? 'L' : 'M') + (x(i) + band / 2).toFixed(1) + ',' + y(v).toFixed(1);
      });
    }

    var lineEls = [];
    var lastLabelX = -1e9, row = 0;
    (props.lines || []).forEach(function (ln) {
      var i = rows.findIndex(function (r) { return r.age === ln.x; });
      if (i < 0) return;
      var lx = x(i) + band / 2;
      row = lx - lastLabelX < 120 ? (row + 1) % 2 : 0;
      lastLabelX = lx;
      var anchor = lx > m.l + pw - 60 ? 'end' : lx < m.l + 60 ? 'start' : 'middle';
      lineEls.push(html`<line class="event-line" x1=${lx} x2=${lx} y1=${m.t - 4} y2=${m.t + ph} />`);
      lineEls.push(html`<text class="event-label" x=${lx} y=${m.t - 18 + row * 11} text-anchor=${anchor}>${ln.label}</text>`);
    });

    var pinEls = [], lastPin = -1e9;
    if (props.pins) {
      rows.forEach(function (r, i) {
        if (!props.pins(r)) return;
        var px = x(i) + band / 2;
        pinEls.push(html`<circle class="fill-ink stroke-surface" stroke-width="2" cx=${px} cy=${m.t + ph + 26} r="4.5" />`);
        var lbl = props.pinLabel ? props.pinLabel(r) : '';
        if (lbl && !compact && px - lastPin > 110 && px < m.l + pw - 60) {
          pinEls.push(html`<text class="pin-label" x=${px + 8} y=${m.t + ph + 30}>${lbl}</text>`);
          lastPin = px;
        }
      });
    }
    var bandEls = [];
    (props.bands || []).forEach(function (b) {
      var i0 = rows.findIndex(function (r) { return r.age >= b.from; });
      if (i0 < 0) return;
      var i1 = rows.length - 1;
      for (var k = rows.length - 1; k >= 0; k--) { if (rows[k].age < b.to) { i1 = k; break; } }
      if (i1 < i0) return;
      var bx = x(i0), bw2 = x(i1) + band - bx;
      bandEls.push(html`<rect class=${'band ' + (b.alt ? 'alt' : '')} x=${bx} y=${m.t} width=${bw2} height=${ph} />`);
      if (bw2 > 80) bandEls.push(html`<text class="band-label" x=${bx + 6} y=${m.t + 13}>${b.label}</text>`);
    });

    function onMove(e) {
      var rect = ref.current.getBoundingClientRect();
      var px = e.clientX - rect.left;
      var i = Math.floor((px - m.l) / band);
      setHover(i >= 0 && i < rows.length ? i : null);
    }
    function onKey(e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      var i = hover === null ? 0 : hover;
      if (e.key === 'ArrowRight') i = Math.min(rows.length - 1, i + 1);
      if (e.key === 'ArrowLeft') i = Math.max(0, i - 1);
      if (e.key === 'Home') i = 0;
      if (e.key === 'End') i = rows.length - 1;
      setHover(i);
    }

    var tip = null;
    if (hover !== null && rows[hover] && props.tooltip) {
      var tx = x(hover) + band / 2;
      var left = tx + 14, flip = tx > width - 300;
      tip = html`<div class="tooltip" style=${(flip ? 'right:' + (width - tx + 14) : 'left:' + left) + 'px;top:' + Math.max(0, m.t) + 'px'}>${props.tooltip(rows[hover])}</div>`;
    }

    return html`<div class="chart" ref=${ref} tabindex="0" role="img" aria-label=${props.label}
        onPointerMove=${onMove} onPointerLeave=${function () { setHover(null); }} onKeyDown=${onKey} onBlur=${function () { setHover(null); }}>
      <svg viewBox=${'0 0 ' + width + ' ' + height} width=${width} height=${height}>
        ${ticks.map(function (t) {
          return html`<g><line class="grid-line" x1=${m.l} x2=${m.l + pw} y1=${y(t)} y2=${y(t)} />
            <text x=${m.l - 8} y=${y(t) + 3.5} text-anchor="end">${ui.compact(t)}</text></g>`;
        })}
        ${bandEls}
        ${hover !== null && html`<rect class="hover-band" x=${x(hover)} y=${m.t} width=${band} height=${ph} />`}
        ${bars}
        <line class="axis-line" x1=${m.l} x2=${m.l + pw} y1=${zero} y2=${zero} />
        ${baselinePath && html`<path class="baseline-line" d=${baselinePath} />`}
        ${lineEls}
        ${rows.map(function (r, i) {
          return r.age % xEvery === 0 ? html`<text x=${x(i) + band / 2} y=${m.t + ph + 15} text-anchor="middle">${r.age}</text>` : null;
        })}
        ${pinEls}
      </svg>
      ${tip}
    </div>`;
  }

  // Horizontal bullet: bar = current, tick = target. Values sit beside the label.
  function Bullet(props) {
    var max = Math.max(props.value, props.target, 1) * 1.08;
    var w = Math.max(0, props.value) / max * 100, t = props.target / max * 100;
    return html`<div class="bullet">
      <span class="b-label">${props.label}</span>
      <span class="b-value"><b>${props.valueText}</b>${props.targetText && html` / ${props.targetText}`}</span>
      <svg role="img" aria-label=${props.label + ': ' + props.valueText + (props.targetText ? ' of ' + props.targetText : '')}>
        <rect class="fill-track" x="0" y="2" width="100%" height="10" rx="5" />
        ${w > 0 && html`<rect class=${props.cls || 'fill-1'} x="0" y="2" width=${w + '%'} height="10" rx="4" />`}
        ${props.target > 0 && html`<rect class="fill-ink" x=${t + '%'} y="0" width="2" height="14" transform="translate(-1,0)" />`}
      </svg>
      ${props.foot && html`<div class="b-foot">${props.foot}</div>`}
    </div>`;
  }

  // Single-series horizontal bars with values at the tip.
  function HBars(props) {
    var items = props.items.filter(function (i) { return i.value > 0; });
    if (!items.length) return html`<p class="muted small">${props.empty || 'Nothing to show yet.'}</p>`;
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }));
    return html`<div class="bullets">
      ${items.map(function (i) {
        return html`<div class="bullet">
          <span class="b-label">${i.label}</span>
          <span class="b-value"><b>${props.format(i.value)}</b>${i.note && html` · ${i.note}`}</span>
          <svg role="img" aria-label=${i.label + ': ' + props.format(i.value)}>
            <rect class=${i.cls || props.cls || 'fill-1'} x="0" y="2" width=${Math.max(0.5, i.value / max * 100) + '%'} height="10" rx="4" />
          </svg>
        </div>`;
      })}
    </div>`;
  }

  // Single-series columns with values on the caps.
  function Columns(props) {
    var ref = useRef(null);
    var width = ui.useWidth(ref, 420);
    var height = props.height || 190;
    var items = props.items;
    var m = { l: 8, r: 8, t: 22, b: 34 };
    var pw = width - m.l - m.r, ph = height - m.t - m.b;
    var band = pw / Math.max(1, items.length);
    var bw = Math.min(56, band * 0.55);
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    return html`<div class="chart" ref=${ref}>
      <svg viewBox=${'0 0 ' + width + ' ' + height} width=${width} height=${height} role="img" aria-label=${props.label}>
        <line class="axis-line" x1=${m.l} x2=${m.l + pw} y1=${m.t + ph} y2=${m.t + ph} />
        ${items.map(function (it, i) {
          var hgt = it.value / max * ph, cx = m.l + i * band + (band - bw) / 2;
          return html`<g>
            <path class=${it.cls || 'fill-1'} d=${colPath(cx, m.t + ph, m.t + ph - hgt, bw, true)} />
            <text x=${cx + bw / 2} y=${m.t + ph - hgt - 6} text-anchor="middle" style="fill:var(--ink);font-weight:600">${props.format(it.value)}</text>
            <text x=${cx + bw / 2} y=${m.t + ph + 16} text-anchor="middle">${it.label}</text>
          </g>`;
        })}
      </svg>
    </div>`;
  }


  // ------------------------------------------------------------------ donut
  function arcPath(cx, cy, r0, r1, a0, a1) {
    var large = a1 - a0 > Math.PI ? 1 : 0;
    function pt(r, a) { return (cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2); }
    return 'M' + pt(r1, a0) + 'A' + r1 + ',' + r1 + ' 0 ' + large + ' 1 ' + pt(r1, a1) +
      'L' + pt(r0, a1) + 'A' + r0 + ',' + r0 + ' 0 ' + large + ' 0 ' + pt(r0, a0) + 'Z';
  }

  /* Donut with a 2px surface gap between slices and a live legend.
     items: [{id, label, value, cls, swatch}] in a fixed order (max 6). */
  function Donut(props) {
    var st = useState(null), hover = st[0], setHover = st[1];
    var items = props.items.filter(function (i) { return i.value > 0; });
    var total = items.reduce(function (t, i) { return t + i.value; }, 0);
    var size = 220, c = size / 2, R = 100, r = 64;
    var a = -Math.PI / 2, pad = items.length > 1 ? 2 / R : 0;
    var slices = items.map(function (it) {
      var sweep = total > 0 ? it.value / total * Math.PI * 2 : 0;
      var s0 = a + pad / 2, s1 = a + sweep - pad / 2;
      a += sweep;
      return { it: it, a0: s0, a1: Math.max(s0 + 0.001, s1) };
    });
    var cur = hover !== null ? items.find(function (i) { return i.id === hover; }) : null;
    if (!total) return html`<p class="muted small">${props.empty || 'Nothing to show yet.'}</p>`;
    return html`<div class="donut-wrap">
      <div class="donut">
        <svg viewBox=${'0 0 ' + size + ' ' + size} role="img" aria-label=${props.label}>
          ${slices.map(function (sl) {
            var on = hover === sl.it.id;
            return html`<path class=${'d-slice ' + sl.it.cls} d=${arcPath(c, c, on ? r - 2 : r, on ? R + 6 : R, sl.a0, sl.a1)}
              onPointerEnter=${function () { setHover(sl.it.id); }} onPointerLeave=${function () { setHover(null); }} />`;
          })}
          <text class="d-center" x=${c} y=${c + 4} text-anchor="middle">${props.format(cur ? cur.value : total)}</text>
          <text class="d-sub" x=${c} y=${c + 22} text-anchor="middle">${cur ? cur.label : props.centerLabel || 'Total'}</text>
        </svg>
      </div>
      <ul class="donut-legend">
        ${props.items.map(function (it) {
          var share = total > 0 ? it.value / total : 0;
          return html`<li class=${hover === it.id ? 'on' : ''} tabindex="0" onPointerEnter=${function () { setHover(it.id); }} onPointerLeave=${function () { setHover(null); }}
              onFocus=${function () { setHover(it.id); }} onBlur=${function () { setHover(null); }}>
            <i class=${'swatch ' + it.swatch} /><span>${it.label}</span><span class="l-val">${props.format(it.value)}</span><span class="l-pct">${ui.pct(share)}</span>
          </li>`;
        })}
      </ul>
    </div>`;
  }

  // ------------------------------------------------------------ plan wheel
  /* Polar-area wheel: each wedge's length is an area's score (0-1), coloured
     by status. Centre shows the overall score. */
  function Wheel(props) {
    var areas = props.areas, n = areas.length;
    var W = 400, H = 316, cx = W / 2, cy = H / 2, r0 = 54, R = 120;
    var step = Math.PI * 2 / n, pad = 0.035;
    return html`<div class="wheel">
      <svg viewBox=${'0 0 ' + W + ' ' + H} role="img" aria-label=${'Plan health score ' + (props.overall === null ? 'not available' : props.overall + ' out of 100')}>
        ${areas.map(function (ar, i) {
          var a0 = -Math.PI / 2 - step / 2 + i * step + pad, a1 = a0 + step - pad * 2;
          var mid = (a0 + a1) / 2, len = ar.score === null ? 0 : r0 + (R - r0) * Math.max(0.04, ar.score);
          var dim = props.active && props.active !== ar.id;
          var lx = cx + (R + 18) * Math.cos(mid), ly = cy + (R + 18) * Math.sin(mid);
          var anchor = Math.abs(Math.cos(mid)) < 0.3 ? 'middle' : Math.cos(mid) > 0 ? 'start' : 'end';
          var dy = Math.sin(mid) < -0.3 ? -6 : Math.sin(mid) > 0.3 ? 10 : 0;
          return html`<g class=${'w-wedge' + (dim ? ' dim' : '')} onPointerEnter=${function () { props.onHover && props.onHover(ar.id); }} onPointerLeave=${function () { props.onHover && props.onHover(null); }}
              onClick=${function () { props.onPick && props.onPick(ar); }}>
            <path class="w-track" d=${arcPath(cx, cy, r0, R, a0, a1)} />
            ${len > 0 && html`<path class=${'fill-' + ar.status} d=${arcPath(cx, cy, r0, len, a0, a1)} />`}
            <text class="w-label" x=${lx} y=${ly + dy} text-anchor=${anchor}>${ar.label}</text>
            <text class="w-score" x=${lx} y=${ly + dy + 14} text-anchor=${anchor}>${ar.score === null ? 'no data' : Math.round(ar.score * 100) + '/100'}</text>
          </g>`;
        })}
        <text class="w-center" x=${cx} y=${cy + 10} text-anchor="middle">${props.overall === null ? '–' : props.overall}</text>
        <text class="w-sub" x=${cx} y=${cy + 28} text-anchor="middle">out of 100</text>
      </svg>
    </div>`;
  }

  // ------------------------------------------------------------ needs stack
  var hatchSeq = 0;
  /* Two bars on one scale: what would be needed (stacked items) and what the
     policies pay. The shortfall is hatched. */
  function NeedsStack(props) {
    var ref = useRef(null);
    var width = ui.useWidth(ref, 560);
    var idRef = useRef(null); if (!idRef.current) idRef.current = 'hatch-' + (++hatchSeq);
    var items = props.items.filter(function (i) { return i.value > 0; });
    var need = props.need, cover = props.cover;
    var labelW = width < 420 ? 64 : 84, valueW = width < 420 ? 74 : 96;
    var pw = Math.max(40, width - labelW - valueW), max = Math.max(need, cover, 1);
    var sx = function (v) { return labelW + v / max * pw; };
    var H = 86, bh = 22, y1 = 8, y2 = 50;
    var acc = 0, segs = items.map(function (it, k) {
      var x0 = sx(acc) + (k > 0 ? 1 : 0), x1 = sx(acc + it.value) - (k < items.length - 1 ? 1 : 0);
      acc += it.value;
      return html`<rect class=${it.cls} x=${x0} y=${y1} width=${Math.max(0.5, x1 - x0)} height=${bh} rx="3"><title>${it.label + ': ' + ui.money(it.value)}</title></rect>`;
    });
    var gap = Math.max(0, need - cover);
    return html`<div class="needs-stack" ref=${ref}>
      <svg viewBox=${'0 0 ' + width + ' ' + H} width=${width} height=${H} role="img" aria-label=${'Needed ' + ui.money(need) + ', covered ' + ui.money(cover) + (gap ? ', gap ' + ui.money(gap) : '')}>
        <defs><pattern id=${idRef.current} patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><rect width="2.5" height="7" class="fill-critical" /></pattern></defs>
        <text x="0" y=${y1 + 15}>Needed</text>
        ${segs}
        <text class="ns-strong" x=${width} y=${y1 + 15} text-anchor="end">${ui.money(need)}</text>
        <text x="0" y=${y2 + 15}>Covered</text>
        <rect class="fill-track" x=${labelW} y=${y2} width=${pw} height=${bh} rx="3" />
        ${cover > 0 && html`<rect class="fill-ink" x=${labelW} y=${y2} width=${Math.max(1, sx(cover) - labelW)} height=${bh} rx="3" />`}
        ${gap > 0 && html`<rect fill=${'url(#' + idRef.current + ')'} x=${sx(cover)} y=${y2} width=${sx(need) - sx(cover)} height=${bh} />`}
        <text class=${gap > 0 ? 'ns-gap' : 'ns-strong'} x=${width} y=${y2 + 15} text-anchor="end">${gap > 0 ? 'Gap ' + ui.compact(gap) : ui.money(cover)}</text>
      </svg>
    </div>`;
  }

  FP.charts = { StackedColumns: StackedColumns, Bullet: Bullet, HBars: HBars, Columns: Columns, Donut: Donut, Wheel: Wheel, NeedsStack: NeedsStack, niceTicks: niceTicks };
})(window.FP = window.FP || {});
