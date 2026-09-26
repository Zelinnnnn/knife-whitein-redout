/* Plan-level views: overview, life timeline, report. */
(function (FP) {
  'use strict';
  var ui = FP.ui, html = ui.html, charts = FP.charts, calc = FP.calc, data = FP.data;
  var money = ui.money, pct = ui.pct, compact = ui.compact;
  var useState = preactHooks.useState;
  var V = FP.views = FP.views || {};

  var TIMELINE_SERIES = [
    { key: 'cash', label: 'Cash', cls: 'fill-1', key2: 's1', value: function (r) { return Math.max(0, r.cash); } },
    { key: 'investments', label: 'Investments', cls: 'fill-3', key2: 's3', value: function (r) { return r.investments; } },
    { key: 'cpf', label: 'CPF', cls: 'fill-2', key2: 's2', value: function (r) { return r.cpf; } },
  ];

  var SECTION_NAMES = { overview: 'Overview', timeline: 'Life timeline', profile: 'Profile', cashflow: 'Cashflow', networth: 'Assets & liabilities', protection: 'Protection', cpf: 'CPF', goals: 'Goals', retirement: 'Retirement', tax: 'Income tax', report: 'Report' };
  V.SECTION_NAMES = SECTION_NAMES;

  function names(model) { return model.people.map(function (p) { return p.name; }).join(' & '); }
  function spouseAge(model, row) {
    var s = model.people[1];
    return s && row.ages ? ' · ' + s.name + ' ' + row.ages.spouse : '';
  }

  // ------------------------------------------------------- today's dollars
  function todayOn(state) { return !state.display || state.display.todayDollars !== false; }
  V.todayOn = todayOn;

  // Rows re-expressed in today's dollars (divided by inflation since today).
  function deflateRows(rows, inflation, on) {
    if (!on) return rows;
    return rows.map(function (r) {
      var f = Math.pow(1 + inflation, r.t);
      var cpfBy = {};
      Object.keys(r.cpfBy || {}).forEach(function (k) {
        var c = r.cpfBy[k];
        cpfBy[k] = { oa: c.oa / f, sa: c.sa / f, ma: c.ma / f, ra: c.ra / f };
      });
      return Object.assign({}, r, {
        cash: r.cash / f, investments: r.investments / f, cpf: r.cpf / f, total: r.total / f, net: r.net / f,
        inflow: r.inflow / f, outflow: r.outflow / f, shortfall: r.shortfall / f, cpfBy: cpfBy,
        events: r.events.map(function (e) { return e.amount ? Object.assign({}, e, { amount: e.amount / f }) : e; }),
      });
    });
  }
  V.deflateRows = deflateRows;

  function DollarToggle(props) {
    var on = todayOn(props.state);
    return html`<${ui.Seg} label="Dollar basis" value=${on ? 'today' : 'future'}
      options=${[{ value: 'today', label: 'Today’s $', title: 'Adjusted for inflation to today’s buying power' }, { value: 'future', label: 'Future $', title: 'The actual dollar amounts in each future year' }]}
      onChange=${function (v) { props.api.set('display.todayDollars', v === 'today'); }} />`;
  }
  V.DollarToggle = DollarToggle;

  // ------------------------------------------------------------- timeline
  function timelineLines(model, sim) {
    var lines = [];
    sim.rows.forEach(function (r) {
      r.events.forEach(function (e) {
        if (e.kind === 'retire' || e.kind === 'scenario') lines.push({ x: r.age, label: e.label });
      });
    });
    var c = model.people[0];
    var retireLabel = calc.says(c.name, 'retires', 'retire');
    if (!lines.some(function (l) { return l.label === retireLabel; }) && c.retireAge > c.age) lines.push({ x: c.retireAge, label: retireLabel });
    return lines.sort(function (a, b) { return a.x - b.x; });
  }

  function bandsFor(model) {
    var c = model.people[0];
    var bands = [];
    if (c.retireAge > c.age) bands.push({ from: c.age, to: c.retireAge, label: 'Working years' });
    bands.push({ from: Math.max(c.age, c.retireAge), to: 999, label: 'Retirement', alt: true });
    return bands;
  }

  function TimelineTooltip(model, baseRows, today) {
    return function (r) {
      var base = baseRows && baseRows.find(function (b) { return b.age === r.age; });
      return html`<div>
        <div class="tt-head">Age ${r.age}${spouseAge(model, r)} · ${r.year}</div>
        ${TIMELINE_SERIES.map(function (s) {
          return html`<div class="tt-row"><i class=${'key ' + s.key2} /><span>${s.label}</span><b>${money(s.value(r))}</b></div>`;
        })}
        ${r.cash < 0 && html`<div class="tt-row"><i class="key short" /><span>Shortfall</span><b>${money(r.cash)}</b></div>`}
        <div class="tt-sep" />
        <div class="tt-row"><i /><span>Total</span><b>${money(r.total)}</b></div>
        ${base && html`<div class="tt-row"><i class="key ink" /><span>Base plan</span><b>${money(base.total)}</b></div>`}
        <div class="tt-row"><i /><span>Money in</span><b>${money(r.inflow)}</b></div>
        <div class="tt-row"><i /><span>Money out</span><b>${money(r.outflow)}</b></div>
        ${r.events.length > 0 && html`<div class="tt-sep" />`}
        ${r.events.map(function (e) { return html`<div class="tt-note">${e.label}${e.amount ? ' · ' + money(e.amount) : ''}</div>`; })}
        <div class="tt-sep" /><div class="tt-note">${today ? 'In today’s dollars' : 'In future dollars'}</div>
      </div>`;
    };
  }

  function TimelineChart(props) {
    var model = props.model, infl = model.assumptions.inflation;
    var today = props.today !== undefined ? props.today : true;
    var sim = props.sim || model.sim;
    var rows = deflateRows(sim.rows, infl, today);
    var baseRows = props.compare ? deflateRows(model.sim.rows, infl, today) : null;
    return html`<${charts.StackedColumns}
      label=${'Projected cash, investments and CPF by age for ' + names(model)}
      rows=${rows} series=${TIMELINE_SERIES} height=${props.height || 340}
      negative=${function (r) { return r.cash; }}
      baseline=${baseRows ? function (r) { var b = baseRows.find(function (x) { return x.age === r.age; }); return b ? b.total : null; } : null}
      lines=${timelineLines(model, sim)} bands=${bandsFor(model)}
      pins=${function (r) { return r.events.some(function (e) { return e.kind === 'goal'; }); }}
      pinLabel=${function (r) { return r.events.filter(function (e) { return e.kind === 'goal'; }).map(function (e) { return e.label; }).join(', '); }}
      tooltip=${TimelineTooltip(model, baseRows, today)} />`;
  }

  function TimelineLegend(props) {
    return html`<div class="legend">
      <span><i class="s1" />Cash</span><span><i class="s3" />Investments</span><span><i class="s2" />CPF (OA, SA, MA, RA)</span>
      <span><i class="short" />Shortfall</span>
      ${props.compare && html`<span><i class="line" />Base plan total</span>`}
      <span><i class="pin" />Goal paid</span>
    </div>`;
  }

  V.TimelineChart = TimelineChart;
  V.TimelineLegend = TimelineLegend;

  // ------------------------------------------------------------ shared bits
  function payItems(cf) {
    return [
      { id: 'fixed', label: 'Fixed expenses', value: cf.fixed, cls: 'fill-1', swatch: 's1' },
      { id: 'variable', label: 'Variable expenses', value: cf.variable, cls: 'fill-2', swatch: 's2' },
      { id: 'insurance', label: 'Insurance', value: cf.protectionPrem, cls: 'fill-3', swatch: 's3' },
      { id: 'savings', label: 'Saving & investing', value: cf.savings, cls: 'fill-4', swatch: 's4' },
      { id: 'goals', label: 'Goal set-asides', value: cf.goalsMonthly, cls: 'fill-5', swatch: 's5' },
      { id: 'surplus', label: 'Left over', value: Math.max(0, cf.surplus), cls: 'fill-6', swatch: 's6' },
    ];
  }
  V.payItems = payItems;

  function PlanHealth(props) {
    var m = props.model;
    var st = useState(null), active = st[0], setActive = st[1];
    return html`<div class="wheel-wrap">
      <${charts.Wheel} areas=${m.score.areas} overall=${m.score.overall} active=${active} onHover=${setActive}
        onPick=${props.go ? function (ar) { props.go(ar.go); } : null} />
      <ul class="area-list">
        ${m.score.areas.map(function (ar) {
          return html`<li><button type="button" class=${active === ar.id ? 'on' : ''} disabled=${!props.go}
              onPointerEnter=${function () { setActive(ar.id); }} onPointerLeave=${function () { setActive(null); }}
              onFocus=${function () { setActive(ar.id); }} onBlur=${function () { setActive(null); }}
              onClick=${function () { if (props.go) props.go(ar.go); }}>
            <span class="a-name">${ar.label}</span><${ui.Pill} status=${ar.status}>${ar.score === null ? 'No data' : Math.round(ar.score * 100)}</${ui.Pill}>
            <span class="a-detail">${ar.detail}</span>
          </button></li>`;
        })}
      </ul>
    </div>`;
  }
  V.PlanHealth = PlanHealth;

  function TopMoves(props) {
    var recs = props.model.health.recommendations.slice(0, props.count || 3);
    if (!recs.length) return html`<p class="muted">No gaps found. Revisit the plan when income, family or goals change.</p>`;
    return html`<ol class="moves">
      ${recs.map(function (r) {
        return html`<li class="move"><span class="m-area">${r.area}</span><span class="m-text">${r.text}</span>
          ${props.go && html`<button type="button" class="btn sm m-go" onClick=${function () { props.go(r.go); }}>Open ${SECTION_NAMES[r.go] || r.go}</button>`}</li>`;
      })}
    </ol>`;
  }
  V.TopMoves = TopMoves;

  // ------------------------------------------------------------ quick start
  function QuickStart(props) {
    var s = props.state, c = s.people.client || {};
    var init = { name: c.name || '', age: c.age || 30, salary: (s.income.client || {}).salary || '', spending: '', savings: '', investments: '', retireAge: c.retireAge || 63 };
    var st = useState(init), f = st[0], setF = st[1];
    function set(k) { return function (v) { var n = Object.assign({}, f); n[k] = v; setF(n); }; }
    function build(e) {
      if (e) e.preventDefault();
      props.api.replace(function (prev) {
        var n = JSON.parse(JSON.stringify(prev));
        n.people.client = Object.assign({}, n.people.client, { name: f.name, age: calc.num(f.age, 30), retireAge: calc.num(f.retireAge, 63) });
        n.income.client = Object.assign({}, n.income.client, { salary: calc.num(f.salary) });
        var row = n.expenses.find(function (x) { return x.id === 'quick-living'; });
        if (!row) { row = { id: 'quick-living', category: 'Personal', name: 'Living expenses (quick estimate)', freq: 'month', kind: 'fixed', endAge: '' }; n.expenses.unshift(row); }
        row.amount = calc.num(f.spending);
        [['quick-cash', 'cash', 'Savings', f.savings], ['quick-inv', 'investment', 'Investments', f.investments]].forEach(function (a) {
          var ex = n.assets.find(function (x) { return x.id === a[0]; });
          if (!ex) { ex = { id: a[0], owner: 'client', category: a[1], name: a[2] }; n.assets.push(ex); }
          ex.value = calc.num(a[3]);
        });
        if (!n.household) n.household = f.name ? f.name + '’s plan' : '';
        n.meta = Object.assign({}, n.meta, { sample: false });
        return n;
      });
    }
    return html`<section class="card raised">
      <form class="quick" onSubmit=${build}>
        <div class="stack" style="gap:10px">
          <div class="eyebrow">Quick start</div>
          <h2>Six numbers to a first plan</h2>
          <p class="muted">Enter the basics and Waypoint fills in the rest with estimates: CPF from your age and salary, tax, and a lifetime projection. Refine any section afterwards.</p>
        </div>
        <div class="stack" style="gap:12px">
          <div class="fields">
            <${ui.TextField} label="Your name" id="qs-name" value=${f.name} placeholder="Optional" onChange=${set('name')} />
            <${ui.NumberField} label="Age" id="qs-age" prefix="" suffix="years" value=${f.age} onChange=${set('age')} />
            <${ui.NumberField} label="Monthly salary" id="qs-salary" value=${f.salary} hint="Before CPF" onChange=${set('salary')} />
            <${ui.NumberField} label="Monthly spending" id="qs-spend" value=${f.spending} hint="Everything except insurance and investing" onChange=${set('spending')} />
            <${ui.NumberField} label="Cash savings" id="qs-cash" value=${f.savings} onChange=${set('savings')} />
            <${ui.NumberField} label="Investments" id="qs-inv" value=${f.investments} onChange=${set('investments')} />
            <${ui.NumberField} label="Retire at" id="qs-retire" prefix="" suffix="years" value=${f.retireAge} onChange=${set('retireAge')} />
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <button type="submit" class="btn primary">Build my plan</button>
            <button type="button" class="btn ghost" onClick=${function () { props.go('profile'); }}>Enter full details instead</button>
          </div>
        </div>
      </form>
    </section>`;
  }

  // --------------------------------------------------------------- overview
  V.overview = function (props) {
    var m = props.model, cf = m.cashflow, nw = m.netWorth, r = m.retirement.base, state = props.state;
    var today = todayOn(state);
    var empty = cf.takeHome <= 0 && nw.totalAssets <= 0;
    var months = cf.essentialMonthly > 0 ? nw.liquid / cf.essentialMonthly : null;
    var status = function (id) { return m.health.items.find(function (i) { return i.id === id; }).status; };
    var ppl = m.people.map(function (p) { return p.name + ' (' + p.age + ')'; }).join(' & ');
    var rToday = r.target / r.deflator;
    if (empty) {
      return html`<div class="page">
        <${ui.PageHead} eyebrow="Plan overview" title=${state.household || 'A new plan'} lede="Start with the quick start below, or work through each section in the menu." />
        <${QuickStart} state=${state} api=${props.api} go=${props.go} />
      </div>`;
    }
    return html`<div class="page">
      <${ui.PageHead} eyebrow="Plan overview" title=${state.household || 'Your financial plan'} lede=${ppl + '. Every figure updates as you change the details.'} />

      <div class="hero">
        <${ui.Card} title="Plan health" sub="Each wedge is one area of the plan, scored out of 100. Tap one to open it.">
          <${PlanHealth} model=${m} go=${props.go} />
        </${ui.Card}>
        <${ui.Card} title="Your top 3 moves" sub="The changes that would improve the plan most, in order.">
          <${TopMoves} model=${m} go=${props.go} />
          ${m.health.recommendations.length > 3 && html`<button class="btn sm ghost" style="align-self:flex-start" onClick=${function () { props.go('report'); }}>See all ${m.health.recommendations.length} actions</button>`}
        </${ui.Card}>
      </div>

      <div class="kpis">
        <${ui.Kpi} label="Net worth" value=${money(nw.netWorth)} note=${'Assets ' + compact(nw.totalAssets) + ' · Debts ' + compact(nw.totalLiabilities)} />
        <${ui.Kpi} label="Monthly surplus" value=${money(cf.surplus)} note=${html`<${ui.Pill} status=${status('surplus')}>${cf.surplus >= 0 ? 'After saving & goals' : 'Deficit'}</${ui.Pill}>`} />
        <${ui.Kpi} label="Retirement readiness" value=${r.target > 0 ? pct(Math.min(r.progress, 9.99)) : '–'}
          note=${html`<${ui.Pill} status=${status('retirement')}>${r.target > 0 ? 'Needs ' + compact(today ? rToday : r.target) + (today ? ' in today’s $' : '') + ' at ' + r.retireAge : 'Set retirement spending'}</${ui.Pill}>`} />
        <${ui.Kpi} label="Emergency fund" value=${months === null ? '–' : months.toFixed(1) + ' months'} note=${html`<${ui.Pill} status=${status('emergency')}>Aim for ${m.assumptions.emergencyMonths} months</${ui.Pill}>`} />
      </div>

      <${ui.Card} title="Life journey" sub=${'Cash, investments and CPF at each age of ' + m.people[0].name + ', with goals and retirement marked.'}
        tools=${html`<${DollarToggle} state=${state} api=${props.api} /><button class="btn sm" onClick=${function () { props.go('timeline'); }}>Open timeline</button>`}>
        <${TimelineLegend} />
        <${TimelineChart} model=${m} height=${280} today=${today} />
      </${ui.Card}>

      <div class="grid cols-2">
        <${ui.Card} title="Where your pay goes" sub=${'Each month’s take-home pay of ' + money(cf.takeHome) + '.'}>
          <${charts.Donut} label="Take-home pay by use" items=${payItems(cf)} format=${money} centerLabel="take-home" />
          ${cf.surplus < 0 && html`<p class="small" style="color:var(--critical-ink)">Spending and saving exceed take-home pay by ${money(-cf.surplus)} a month.</p>`}
        </${ui.Card}>
        <${ui.Card} title="Protection gaps" sub="Current cover against needs for each person."
          tools=${html`<button class="btn sm" onClick=${function () { props.go('protection'); }}>Review cover</button>`}>
          <div class="table-wrap"><table class="data">
            <thead><tr><th>Cover</th>${m.protection.map(function (p) { return html`<th>${p.name}</th>`; })}</tr></thead>
            <tbody>
              ${m.protection[0].rows.map(function (row, idx) {
                return html`<tr><td class="label">${row.label}</td>${m.protection.map(function (p) {
                  var x = p.rows[idx];
                  var text = x.unit === 'lump' ? compact(x.current) + ' of ' + compact(x.target)
                    : x.unit === 'month' ? money(x.current) + ' of ' + money(x.target) + '/mth'
                    : x.unit === 'ward' ? calc.wardLabel(x.current) : (x.current ? 'Covered' : 'Not covered');
                  return html`<td><div style="display:flex;gap:6px 8px;align-items:center;flex-wrap:wrap"><${ui.Pill} status=${x.status}>${x.status === 'good' ? 'OK' : x.status === 'warning' ? 'Partial' : 'Gap'}</${ui.Pill}><span class="num small">${text}</span></div></td>`;
                })}</tr>`;
              })}
            </tbody>
          </table></div>
        </${ui.Card}>
      </div>

      <${ui.Card} title="Health check" sub="How the plan measures up against common rules of thumb.">
        <div class="checks">
          ${m.health.items.map(function (i) {
            return html`<div class="check-row"><span class="t">${i.label}</span><span class="v"><${ui.Pill} status=${i.status} /></span><span class="d">${i.detail}</span></div>`;
          })}
        </div>
      </${ui.Card}>
    </div>`;
  };

  // --------------------------------------------------------------- timeline
  function toCsv(model, sim, today) {
    var rows = deflateRows(sim.rows, model.assumptions.inflation, today);
    var head = ['Age', model.people[1] ? model.people[1].name + ' age' : null, 'Year', 'Cash', 'Investments', 'CPF', 'Total', 'Money in', 'Money out', 'Events'].filter(Boolean);
    var lines = ['# ' + (today ? 'Today’s dollars' : 'Future dollars'), head.join(',')];
    rows.forEach(function (r) {
      var cells = [r.age].concat(model.people[1] ? [r.ages.spouse] : []).concat([r.year, r.cash, r.investments, r.cpf, r.total, r.inflow, r.outflow])
        .map(function (x) { return typeof x === 'number' ? Math.round(x) : x; });
      cells.push('"' + r.events.map(function (e) { return e.label; }).join('; ').replace(/"/g, '""') + '"');
      lines.push(cells.join(','));
    });
    return lines.join('\n');
  }

  function ScenarioControls(props) {
    var s = props.state.scenario || {}, api = props.api, m = props.model;
    var type = s.type || 'none';
    var d = calc.scenarioDefaults(type);
    var sc = m.scenario ? m.scenario.scenario : null;
    function setType(t) {
      var who = m.people.find(function (p) { return p.key === (s.who || 'client'); }) || m.people[0];
      api.set('scenario', { type: t, who: who.key, age: s.age || Math.min(who.retireAge - 1, who.age + 12) });
    }
    return html`<div class="stack" style="gap:12px">
      <${ui.Seg} label="Scenario" value=${type} onChange=${setType}
        options=${calc.SCENARIOS.map(function (x) { return { value: x.id, label: x.label }; })} />
      ${type !== 'none' && sc && html`<div class="scenario-bar">
        ${m.people.length > 1 && html`<${ui.SelectField} label="Who" path="scenario.who" value=${sc.who}
          options=${m.people.map(function (p) { return { value: p.key, label: p.name }; })} onChange=${function (v) { api.set('scenario.who', v); }} />`}
        <${ui.NumberField} label="At age" path="scenario.age" prefix="" value=${sc.age} onChange=${function (v) { api.set('scenario.age', v); }} />
        ${type === 'ci' && html`<${ui.NumberField} label="Years off work" path="scenario.recoveryYears" prefix="" value=${sc.recoveryYears} onChange=${function (v) { api.set('scenario.recoveryYears', v); }} />`}
        <${ui.NumberField} label="One-off cost" path="scenario.oneOff" value=${sc.oneOff} placeholder=${String(d.oneOff)} onChange=${function (v) { api.set('scenario.oneOff', v); }} />
        ${type !== 'death' && html`<${ui.NumberField} label="Extra cost a year" path="scenario.annualExtra" value=${sc.annualExtra} onChange=${function (v) { api.set('scenario.annualExtra', v); }} />`}
        <${ui.NumberField} label="Household spending change" path="scenario.spendingChange" percent value=${sc.spendingChange} onChange=${function (v) { api.set('scenario.spendingChange', v); }} />
      </div>`}
    </div>`;
  }

  V.timeline = function (props) {
    var m = props.model, state = props.state;
    var today = todayOn(state);
    var tbl = useState(false), showTable = tbl[0], setShowTable = tbl[1];
    var copied = useState(''), msg = copied[0], setMsg = copied[1];
    var active = !!m.scenario;
    var sim = active ? m.scenario : m.sim;
    var rows = deflateRows(sim.rows, m.assumptions.inflation, today);
    var baseRows = deflateRows(m.sim.rows, m.assumptions.inflation, today);
    var client = m.people[0];
    var retireRow = rows.find(function (r) { return r.age === client.retireAge - 1; }) || rows[0];
    var peak = rows.reduce(function (best, r) { return r.total > best.total ? r : best; }, rows[0]);
    var end = rows[rows.length - 1];
    var baseEnd = baseRows[baseRows.length - 1];
    var worst = Math.min.apply(null, rows.map(function (r) { return r.cash; }).concat([0]));
    var events = [];
    rows.forEach(function (r) { r.events.forEach(function (e) { events.push({ age: r.age, row: r, e: e }); }); });
    var sc = active ? sim.scenario : null;
    var evRow = active ? sim.rows.find(function (r) { return r.events.some(function (e) { return e.kind === 'scenario'; }); }) : null;
    var unit = today ? ' in today’s dollars' : ' in future dollars';

    function exportCsv() {
      var csv = toCsv(m, sim, today);
      props.actions.saveText('timeline.csv', csv, 'text/csv').then(function (r) { setMsg(r); });
    }

    return html`<div class="page">
      <${ui.PageHead} eyebrow="Plan" title="Life timeline"
        lede=${'Projected balances at the end of each year from today to age ' + end.age + '. Bills and goals are paid from cash first, then investments, then CPF OA from age 55.'}
        tools=${html`<${DollarToggle} state=${state} api=${props.api} />`} />

      <${ui.Card} title="What if…" sub="Test how the plan copes with a life event. Policy payouts, lost income and extra costs flow into the timeline.">
        <${ScenarioControls} state=${state} model=${m} api=${props.api} />
        ${active && evRow && html`<p class="small muted">
          ${sc.type === 'death' ? 'Death' : sc.type === 'tpd' ? 'TPD' : sc.type === 'ci' ? 'Critical illness' : 'Disability'} payouts from policies: <b style="color:var(--ink)">${money(evRow.flows.lumpSum)}</b>${evRow.flows.cpfBequest > 0 ? html` · CPF paid to nominees: <b style="color:var(--ink)">${money(evRow.flows.cpfBequest)}</b>` : ''}${sc.type === 'disability' ? html` · Disability income: <b style="color:var(--ink)">${money(evRow.flows.di / 12)}</b> a month` : ''} (at the time of the event).
        </p>`}
      </${ui.Card}>

      <div class="kpis">
        <${ui.Kpi} label=${'At retirement (age ' + client.retireAge + ')'} value=${compact(retireRow.total)} note=${'Cash, investments and CPF' + unit} />
        <${ui.Kpi} label="Peak wealth" value=${compact(peak.total)} note=${'At age ' + peak.age} />
        <${ui.Kpi} label="Savings last until" value=${sim.shortfallAge === null ? 'End of plan' : 'Age ' + sim.shortfallAge}
          note=${html`<${ui.Pill} status=${sim.shortfallAge === null ? 'good' : 'critical'}>${sim.shortfallAge === null ? 'No shortfall' : 'Shortfall of ' + compact(-worst)}</${ui.Pill}>`} />
        <${ui.Kpi} label=${'Left at age ' + end.age} value=${compact(end.total)} note=${active ? 'Base plan: ' + compact(baseEnd.total) : 'Before any bequests'} />
      </div>

      <${ui.Card} title=${active ? 'Timeline under this scenario' : 'Projected wealth by age'}
        sub=${'Hover or use the arrow keys for each year. Amounts' + unit + '.'}
        tools=${html`<button class="btn sm" onClick=${function () { setShowTable(!showTable); }}><${ui.Icon} name="table" />${showTable ? 'Hide table' : 'Show table'}</button>
          <button class="btn sm" onClick=${exportCsv}><${ui.Icon} name="download" />Export CSV</button>`}>
        <${TimelineLegend} compare=${active} />
        <${TimelineChart} model=${m} sim=${sim} compare=${active} height=${380} today=${today} />
        ${msg && html`<p class="small muted" role="status">${msg}</p>`}
        ${showTable && html`<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="data compact">
          <thead><tr><th class="n">Age</th>${m.people[1] && html`<th class="n">${m.people[1].name}</th>`}<th class="n">Cash</th><th class="n">Investments</th><th class="n">CPF</th><th class="n">Total</th><th class="n">Money in</th><th class="n">Money out</th><th>Events</th></tr></thead>
          <tbody>${rows.map(function (r) {
            return html`<tr><td class="n">${r.age}</td>${m.people[1] && html`<td class="n">${r.ages.spouse}</td>`}
              <td class="n" style=${r.cash < 0 ? 'color:var(--critical-ink)' : ''}>${money(r.cash)}</td><td class="n">${money(r.investments)}</td><td class="n">${money(r.cpf)}</td>
              <td class="n"><b>${money(r.total)}</b></td><td class="n">${money(r.inflow)}</td><td class="n">${money(r.outflow)}</td>
              <td class="small">${r.events.map(function (e) { return e.label; }).join('; ')}</td></tr>`;
          })}</tbody>
        </table></div>`}
      </${ui.Card}>

      <${ui.Card} title="Milestones" sub=${'Events on the timeline in order. Amounts' + unit + '.'}>
        <div class="table-wrap"><table class="data">
          <thead><tr><th class="n">Age</th><th>Event</th><th class="n">Amount</th><th>Status</th></tr></thead>
          <tbody>${events.length ? events.map(function (x) {
            var gs = x.e.kind === 'goal' ? sim.goalStatus[x.e.id] : null;
            return html`<tr><td class="n">${x.age}</td><td>${x.e.label}</td><td class="n">${x.e.amount ? money(x.e.amount) : ''}</td>
              <td>${gs ? html`<${ui.Pill} status=${gs.funded ? (gs.from === 'cash' ? 'good' : 'warning') : 'critical'}>${gs.funded ? 'Paid from ' + gs.from : 'Not fully funded'}</${ui.Pill}>` : ''}</td></tr>`;
          }) : html`<tr><td colspan="4" class="muted">No events yet. Add goals or set retirement ages.</td></tr>`}</tbody>
        </table></div>
      </${ui.Card}>
    </div>`;
  };

  // ----------------------------------------------------------------- report
  // Rendered in the app and, with forFile, into the saved client file.
  function ReportBody(props) {
    var m = props.model, state = props.state, cf = m.cashflow, nw = m.netWorth, r = m.retirement.base;
    var date = new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });
    var a = m.assumptions;
    var today = todayOn(state);
    return html`<article class="report">
      <div class="report-head">
        <div><div class="eyebrow">Financial plan</div><div class="title">${state.household || names(m)}</div>
          <p class="muted">${m.people.map(function (p) { return p.name + ', age ' + p.age + ', retiring at ' + p.retireAge; }).join(' · ')}</p></div>
        <p class="muted small">Prepared ${date}</p>
      </div>

      <section>
        <h2>Summary</h2>
        <div class="kpis">
          <${ui.Kpi} label="Net worth" value=${money(nw.netWorth)} />
          <${ui.Kpi} label="Monthly surplus" value=${money(cf.surplus)} />
          <${ui.Kpi} label="Retirement readiness" value=${r.target > 0 ? pct(Math.min(r.progress, 9.99)) : '–'} />
          <${ui.Kpi} label="Savings last until" value=${m.sim.shortfallAge === null ? 'End of plan' : 'Age ' + m.sim.shortfallAge} />
        </div>
        <div class="grid cols-2">
          <div><h3>Plan health</h3><${PlanHealth} model=${m} /></div>
          <div><h3>Recommended actions</h3>${m.health.recommendations.length ? html`<ul class="recs">${m.health.recommendations.map(function (x) {
            return html`<li><span class="area">${x.area}</span><span>${x.text}</span></li>`;
          })}</ul>` : html`<p class="muted">No gaps found.</p>`}</div>
        </div>
      </section>

      <section>
        <h2>Life journey</h2>
        <p class="small muted">${today ? 'In today’s dollars.' : 'In future dollars.'}</p>
        <${TimelineLegend} />
        <${TimelineChart} model=${m} height=${300} today=${today} />
      </section>

      <section class="grid cols-2">
        <div><h2>Where the pay goes</h2>
          <div style="margin-top:12px"><${charts.Donut} label="Take-home pay by use" items=${payItems(cf)} format=${money} centerLabel="take-home" /></div>
        </div>
        <div><h2>Net worth</h2>
          <dl class="kv" style="margin-top:12px">
            ${nw.categories.filter(function (c) { return c.amount; }).map(function (c) { return html`<dt>${c.label}</dt><dd>${money(c.amount)}</dd>`; })}
            ${nw.liabilities.map(function (l) { return html`<dt>${l.label}</dt><dd>${money(-l.amount)}</dd>`; })}
            <dt class="total">Net worth</dt><dd class="total">${money(nw.netWorth)}</dd>
          </dl>
        </div>
      </section>

      <section>
        <h2>Protection</h2>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Cover</th>${m.protection.map(function (p) { return html`<th class="n">${p.name}: current</th><th class="n">Needed</th>`; })}</tr></thead>
          <tbody>${m.protection[0].rows.map(function (row, idx) {
            return html`<tr><td class="label">${row.label}</td>${m.protection.map(function (p) {
              var x = p.rows[idx];
              var c = x.unit === 'lump' ? money(x.current) : x.unit === 'month' ? money(x.current) + '/mth' : x.unit === 'ward' ? calc.wardLabel(x.current) : (x.current ? 'Covered' : 'None');
              var t = x.unit === 'lump' ? money(x.target) : x.unit === 'month' ? money(x.target) + '/mth' : x.unit === 'ward' ? calc.wardLabel(x.target) : 'Covered';
              return html`<td class="n">${c}</td><td class="n">${t}</td>`;
            })}</tr>`;
          })}</tbody>
        </table></div>
        ${m.protection.filter(function (p) { return p.method === 'needs'; }).map(function (p) {
          return html`<div><h3>How ${p.name}’s needs add up</h3>
            <div class="table-wrap"><table class="data compact">
              <thead><tr><th>Item</th>${calc.NEED_RISKS.map(function (rk) { return html`<th class="n">${rk.label}</th>`; })}</tr></thead>
              <tbody>
                ${(function () {
                  var labels = [];
                  calc.NEED_RISKS.forEach(function (rk) { p.needs[rk.id].items.forEach(function (it) { if (labels.indexOf(it.label) < 0) labels.push(it.label); }); });
                  return labels.map(function (lb) {
                    return html`<tr><td>${lb}</td>${calc.NEED_RISKS.map(function (rk) {
                      var it = p.needs[rk.id].items.find(function (x) { return x.label === lb; });
                      return html`<td class="n">${it && it.total ? money(it.total) : '–'}</td>`;
                    })}</tr>`;
                  });
                })()}
                <tr class="total"><td>Total needed</td>${calc.NEED_RISKS.map(function (rk) { return html`<td class="n">${money(p.needs[rk.id].need)}</td>`; })}</tr>
              </tbody>
            </table></div></div>`;
        })}
        ${V.PolicySummary && html`<${V.PolicySummary} model=${m} state=${state} />`}
      </section>

      <section>
        <h2>Goals and retirement</h2>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Goal</th><th class="n">Age</th><th class="n">Cost today</th><th class="n">Future cost</th><th class="n">Set aside / mth</th><th>Status</th></tr></thead>
          <tbody>
            ${m.goals.map(function (g) {
              return html`<tr><td>${g.name}</td><td class="n">${g.age}${g.repeat > 1 ? '–' + (g.age + g.repeat - 1) : ''}</td><td class="n">${money(g.today)}</td><td class="n">${money(g.future)}</td><td class="n">${money(g.setAside)}</td>
                <td>${g.status ? html`<${ui.Pill} status=${g.status.funded ? 'good' : 'critical'}>${g.status.funded ? 'Funded' : 'Shortfall'}</${ui.Pill}>` : ''}</td></tr>`;
            })}
            <tr><td>Retirement at ${r.retireAge}</td><td class="n">${r.retireAge}</td><td class="n">${money(m.retirement.monthlySpending)}/mth</td><td class="n">${money(r.target)}</td><td class="n">${money(r.extraMonthly)} extra</td>
              <td><${ui.Pill} status=${r.progress >= 1 ? 'good' : r.progress >= 0.7 ? 'warning' : 'critical'}>${pct(Math.min(r.progress, 9.99))} funded</${ui.Pill}></td></tr>
          </tbody>
        </table></div>
      </section>

      <section>
        <h2>Assumptions</h2>
        <p class="small">Inflation ${pct(a.inflation, 1)} · salary growth ${pct(a.salaryGrowth, 1)} · cash interest ${pct(a.cashRate, 1)} · returns ${pct(a.preRetReturn, 1)} before and ${pct(a.postRetReturn, 1)} during retirement ·
          CPF OA 2.5%, SA/MA/RA 4% plus extra interest · 2026 CPF contribution rates and ceilings · protection needs ${m.protection.some(function (p) { return p.method === 'needs'; }) ? 'built up item by item where shown, otherwise ' : ''}${a.deathMultiple}× (death/TPD) and ${a.ciMultiple}× (CI) total income.</p>
        <p class="disclaimer">This report is an educational projection, not financial advice. CPF, tax and insurance figures are estimates based on published 2026 rules and the assumptions above; check cpf.gov.sg, iras.gov.sg and your policy documents before acting.</p>
      </section>
    </article>`;
  }
  V.ReportBody = ReportBody;

  V.report = function (props) {
    var st = useState(''), msg = st[0], setMsg = st[1];
    return html`<div class="page">
      <${ui.PageHead} eyebrow="Plan" title="Financial planning report" lede="A summary of the plan to review with the client or share afterwards."
        tools=${html`<button class="btn primary" onClick=${function () { props.actions.saveClientFile().then(setMsg); }}><${ui.Icon} name="download" />Save client file</button>
          ${!ui.inFrame && html`<button class="btn" onClick=${function () { window.print(); }}><${ui.Icon} name="print" />Print or save as PDF</button>`}`} />
      <p class="small muted">The client file is this report as a web page anyone can open and print, with the plan inside it. Open it in Waypoint later to carry on where you left off.</p>
      ${msg && html`<div class="banner" role="status"><p>${msg}</p></div>`}
      <${ReportBody} model=${props.model} state=${props.state} />
    </div>`;
  };
})(window.FP = window.FP || {});
