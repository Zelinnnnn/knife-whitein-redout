/* Plan-level views: overview, life timeline, report. */
(function (FP) {
  'use strict';
  var ui = FP.ui, html = ui.html, charts = FP.charts, calc = FP.calc;
  var money = ui.money, pct = ui.pct, compact = ui.compact;
  var useState = preactHooks.useState;
  var V = FP.views = FP.views || {};

  var TIMELINE_SERIES = [
    { key: 'cash', label: 'Cash', cls: 'fill-1', key2: 's1', value: function (r) { return Math.max(0, r.cash); } },
    { key: 'investments', label: 'Investments', cls: 'fill-3', key2: 's3', value: function (r) { return r.investments; } },
    { key: 'cpf', label: 'CPF', cls: 'fill-2', key2: 's2', value: function (r) { return r.cpf; } },
  ];

  function names(model) { return model.people.map(function (p) { return p.name; }).join(' & '); }
  function spouseAge(model, row) {
    var s = model.people[1];
    return s ? ' · ' + s.name + ' ' + row.ages.spouse : '';
  }

  function timelineLines(model, sim) {
    var lines = [];
    sim.rows.forEach(function (r) {
      r.events.forEach(function (e) {
        if (e.kind === 'retire') lines.push({ x: r.age, label: e.label });
        if (e.kind === 'scenario') lines.push({ x: r.age, label: e.label });
      });
    });
    var c = model.people[0];
    if (!lines.some(function (l) { return l.label.indexOf(c.name + ' retires') === 0; }) && c.retireAge > c.age) {
      lines.push({ x: c.retireAge, label: c.name + ' retires' });
    }
    return lines.sort(function (a, b) { return a.x - b.x; });
  }

  function TimelineTooltip(model, baseRows) {
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
      </div>`;
    };
  }

  function TimelineChart(props) {
    var model = props.model;
    var sim = props.sim || model.sim;
    var baseRows = props.compare ? model.sim.rows : null;
    return html`<${charts.StackedColumns}
      label=${'Projected cash, investments and CPF by age for ' + names(model)}
      rows=${sim.rows} series=${TIMELINE_SERIES} height=${props.height || 340}
      negative=${function (r) { return r.cash; }}
      baseline=${baseRows ? function (r) { var b = baseRows.find(function (x) { return x.age === r.age; }); return b ? b.total : null; } : null}
      lines=${timelineLines(model, sim)}
      pins=${function (r) { return r.events.some(function (e) { return e.kind === 'goal'; }); }}
      tooltip=${TimelineTooltip(model, baseRows)} />`;
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

  // --------------------------------------------------------------- overview
  V.overview = function (props) {
    var m = props.model, cf = m.cashflow, nw = m.netWorth, r = m.retirement.base;
    var emerg = m.health.items.find(function (i) { return i.id === 'emergency'; });
    var months = cf.essentialMonthly > 0 ? nw.liquid / cf.essentialMonthly : 0;
    var status = function (id) { return m.health.items.find(function (i) { return i.id === id; }).status; };
    var ppl = m.people.map(function (p) { return p.name + ' (' + p.age + ')'; }).join(' & ');
    return html`<div class="page">
      <${ui.PageHead} eyebrow="Plan overview" title=${props.state.household || 'Your financial plan'}
        lede=${ppl + '. Every figure updates as you change the fact-find on the left.'} />
      <div class="kpis">
        <${ui.Kpi} label="Net worth" value=${money(nw.netWorth)} note=${'Assets ' + compact(nw.totalAssets) + ' · Debts ' + compact(nw.totalLiabilities)} />
        <${ui.Kpi} label="Monthly surplus" value=${money(cf.surplus)} note=${html`<${ui.Pill} status=${status('surplus')}>${cf.surplus >= 0 ? 'After saving & goals' : 'Deficit'}</${ui.Pill}>`} />
        <${ui.Kpi} label="Retirement readiness" value=${r.target > 0 ? pct(Math.min(r.progress, 9.99)) : '–'} note=${html`<${ui.Pill} status=${status('retirement')}>${r.target > 0 ? 'Target ' + compact(r.target) + ' at ' + r.retireAge : 'Set retirement spending'}</${ui.Pill}>`} />
        <${ui.Kpi} label="Emergency fund" value=${months.toFixed(1) + ' months'} note=${html`<${ui.Pill} status=${emerg.status}>Aim for ${m.assumptions.emergencyMonths} months</${ui.Pill}>`} />
      </div>

      <${ui.Card} title="Life timeline" sub=${'Cash, investments and CPF at each age of ' + m.people[0].name + ', with goals and retirement marked.'}
        tools=${html`<button class="btn sm" onClick=${function () { props.go('timeline'); }}>Open timeline</button>`}>
        <${TimelineLegend} />
        <${TimelineChart} model=${m} height=${280} />
      </${ui.Card}>

      <div class="grid cols-2">
        <${ui.Card} title="Financial health check" sub="Rules of thumb from the planning template.">
          <div class="checks">
            ${m.health.items.map(function (i) {
              return html`<div class="check-row"><span class="t">${i.label}</span><span class="v"><${ui.Pill} status=${i.status} /></span><span class="d">${i.detail}</span></div>`;
            })}
          </div>
        </${ui.Card}>
        <div class="stack">
          <${ui.Card} title="Recommended actions" sub=${m.health.recommendations.length ? 'From the health check, grouped by area.' : ''}>
            ${m.health.recommendations.length ? html`<ul class="recs">${m.health.recommendations.slice(0, 6).map(function (x) {
              return html`<li><span class="area">${x.area}</span><span>${x.text}</span></li>`;
            })}</ul>` : html`<p class="muted">No gaps found. Revisit the plan when income, family or goals change.</p>`}
            ${m.health.recommendations.length > 6 && html`<button class="btn sm ghost" style="align-self:flex-start" onClick=${function () { props.go('report'); }}>See all ${m.health.recommendations.length} in the report</button>`}
          </${ui.Card}>
          <${ui.Card} title="Monthly cashflow allocation" sub=${'Share of take-home pay (' + money(cf.takeHome) + '). Tick marks the recommended share.'}>
            <div class="bullets">
              ${cf.buckets.map(function (b) {
                return html`<${charts.Bullet} label=${b.label} value=${b.amount} target=${b.recommended}
                  valueText=${money(b.amount) + ' · ' + pct(b.share)} targetText=${'rec. ' + pct(b.target)} />`;
              })}
            </div>
          </${ui.Card}>
        </div>
      </div>

      <${ui.Card} title="Protection gaps" sub="Current cover against needs for each person."
        tools=${html`<button class="btn sm" onClick=${function () { props.go('protection'); }}>Review policies</button>`}>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Cover</th>${m.protection.map(function (p) { return html`<th>${p.name}</th>`; })}</tr></thead>
          <tbody>
            ${m.protection[0].rows.map(function (row, idx) {
              return html`<tr><td class="label">${row.label}</td>${m.protection.map(function (p) {
                var x = p.rows[idx];
                var text = x.unit === 'lump' ? compact(x.current) + ' of ' + compact(x.target)
                  : x.unit === 'month' ? money(x.current) + ' of ' + money(x.target) + '/mth'
                  : x.unit === 'ward' ? calc.wardLabel(x.current) : (x.current ? 'Covered' : 'Not covered');
                return html`<td><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><${ui.Pill} status=${x.status}>${x.status === 'good' ? 'OK' : x.status === 'warning' ? 'Partial' : 'Gap'}</${ui.Pill}><span class="num">${text}</span></div></td>`;
              })}</tr>`;
            })}
          </tbody>
        </table></div>
      </${ui.Card}>
    </div>`;
  };

  // --------------------------------------------------------------- timeline
  function toCsv(model, sim) {
    var head = ['Age', model.people[1] ? model.people[1].name + ' age' : null, 'Year', 'Cash', 'Investments', 'CPF', 'Total', 'Take-home income', 'CPF LIFE', 'Payouts & bequests', 'Living costs', 'Loans', 'Premiums', 'Goals', 'Investing', 'Tax', 'Events'].filter(Boolean);
    var lines = [head.join(',')];
    sim.rows.forEach(function (r) {
      var f = r.flows;
      var cells = [r.age, model.people[1] ? r.ages.spouse : null, r.year, r.cash, r.investments, r.cpf, r.total, f.takeHome, f.cpfLife, f.lumpSum + f.cpfBequest + f.di, f.living, f.loans, f.premiums, f.goals, f.invest, f.tax]
        .filter(function (x, i) { return !(i === 1 && !model.people[1]); })
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
    var tbl = useState(false), showTable = tbl[0], setShowTable = tbl[1];
    var copied = useState(''), msg = copied[0], setMsg = copied[1];
    var active = !!m.scenario;
    var sim = active ? m.scenario : m.sim;
    var client = m.people[0];
    var retireRow = sim.rows.find(function (r) { return r.age === client.retireAge - 1; }) || sim.rows[0];
    var peak = sim.rows.reduce(function (best, r) { return r.total > best.total ? r : best; }, sim.rows[0]);
    var end = sim.rows[sim.rows.length - 1];
    var baseEnd = m.sim.rows[m.sim.rows.length - 1];
    var events = [];
    sim.rows.forEach(function (r) { r.events.forEach(function (e) { events.push({ age: r.age, row: r, e: e }); }); });
    var sc = active ? sim.scenario : null;
    var evRow = active ? sim.rows.find(function (r) { return r.events.some(function (e) { return e.kind === 'scenario'; }); }) : null;

    function exportCsv() {
      var csv = toCsv(m, sim);
      if (!ui.inFrame && ui.download('timeline.csv', csv, 'text/csv')) { setMsg('Downloaded timeline.csv'); return; }
      ui.copyText(csv).then(function (ok) { setMsg(ok ? 'Copied CSV to clipboard' : 'Copy failed'); });
    }

    return html`<div class="page">
      <${ui.PageHead} eyebrow="Plan" title="Life timeline"
        lede=${'Projected balances at the end of each year from today to age ' + end.age + '. Goals and bills are paid from cash first, then investments, then CPF OA from age 55. Amounts are in future dollars.'} />

      <${ui.Card} title="What if…" sub="Test how the plan copes with a life event. Policy payouts, lost income and extra costs flow into the timeline.">
        <${ScenarioControls} state=${state} model=${m} api=${props.api} />
        ${active && evRow && html`<p class="small muted">
          ${sc.type === 'death' ? 'Death' : sc.type === 'tpd' ? 'TPD' : sc.type === 'ci' ? 'Critical illness' : 'Disability'} payouts from policies: <b style="color:var(--ink)">${money(evRow.flows.lumpSum)}</b>${evRow.flows.cpfBequest > 0 ? html` · CPF paid to nominees: <b style="color:var(--ink)">${money(evRow.flows.cpfBequest)}</b>` : ''}${sc.type === 'disability' ? html` · Disability income: <b style="color:var(--ink)">${money(evRow.flows.di / 12)}</b> a month` : ''}.
        </p>`}
      </${ui.Card}>

      <div class="kpis">
        <${ui.Kpi} label=${'At retirement (age ' + client.retireAge + ')'} value=${compact(retireRow.total)} note="Cash, investments and CPF" />
        <${ui.Kpi} label="Peak wealth" value=${compact(peak.total)} note=${'At age ' + peak.age} />
        <${ui.Kpi} label="Savings last until" value=${sim.shortfallAge === null ? 'End of plan' : 'Age ' + sim.shortfallAge}
          note=${html`<${ui.Pill} status=${sim.shortfallAge === null ? 'good' : 'critical'}>${sim.shortfallAge === null ? 'No shortfall' : 'Shortfall of ' + compact(-sim.worstShortfall)}</${ui.Pill}>`} />
        <${ui.Kpi} label=${'Left at age ' + end.age} value=${compact(end.total)} note=${active ? 'Base plan: ' + compact(baseEnd.total) : 'Before any bequests'} />
      </div>

      <${ui.Card} title=${active ? 'Timeline under this scenario' : 'Projected wealth by age'}
        sub="Hover or use the arrow keys for each year's details."
        tools=${html`<button class="btn sm" onClick=${function () { setShowTable(!showTable); }}><${ui.Icon} name="table" />${showTable ? 'Hide table' : 'Show table'}</button>
          <button class="btn sm" onClick=${exportCsv}><${ui.Icon} name=${ui.inFrame ? 'copy' : 'download'} />${ui.inFrame ? 'Copy CSV' : 'Export CSV'}</button>`}>
        <${TimelineLegend} compare=${active} />
        <${TimelineChart} model=${m} sim=${sim} compare=${active} height=${380} />
        ${msg && html`<p class="small muted" role="status">${msg}</p>`}
        ${showTable && html`<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="data compact">
          <thead><tr><th class="n">Age</th>${m.people[1] && html`<th class="n">${m.people[1].name}</th>`}<th class="n">Cash</th><th class="n">Investments</th><th class="n">CPF</th><th class="n">Total</th><th class="n">Money in</th><th class="n">Money out</th><th>Events</th></tr></thead>
          <tbody>${sim.rows.map(function (r) {
            return html`<tr><td class="n">${r.age}</td>${m.people[1] && html`<td class="n">${r.ages.spouse}</td>`}
              <td class="n" style=${r.cash < 0 ? 'color:var(--critical-ink)' : ''}>${money(r.cash)}</td><td class="n">${money(r.investments)}</td><td class="n">${money(r.cpf)}</td>
              <td class="n"><b>${money(r.total)}</b></td><td class="n">${money(r.inflow)}</td><td class="n">${money(r.outflow)}</td>
              <td class="small">${r.events.map(function (e) { return e.label; }).join('; ')}</td></tr>`;
          })}</tbody>
        </table></div>`}
      </${ui.Card}>

      <${ui.Card} title="Milestones" sub="Events on the timeline in order.">
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
  V.report = function (props) {
    var m = props.model, state = props.state, cf = m.cashflow, nw = m.netWorth, r = m.retirement.base;
    var date = new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });
    var a = m.assumptions;
    return html`<div class="page">
      <${ui.PageHead} eyebrow="Plan" title="Financial planning report" lede="A summary of the plan to review or share."
        tools=${!ui.inFrame && html`<button class="btn primary" onClick=${function () { window.print(); }}><${ui.Icon} name="print" />Print or save as PDF</button>`} />
      <article class="report">
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
            <${ui.Kpi} label="Retirement readiness" value=${pct(Math.min(r.progress, 9.99))} />
            <${ui.Kpi} label="Savings last until" value=${m.sim.shortfallAge === null ? 'End of plan' : 'Age ' + m.sim.shortfallAge} />
          </div>
          <div class="grid cols-2">
            <div><h3>Health check</h3><div class="checks">${m.health.items.map(function (i) {
              return html`<div class="check-row"><span class="t">${i.label}</span><span class="v"><${ui.Pill} status=${i.status} /></span><span class="d">${i.detail}</span></div>`;
            })}</div></div>
            <div><h3>Recommended actions</h3>${m.health.recommendations.length ? html`<ul class="recs">${m.health.recommendations.map(function (x) {
              return html`<li><span class="area">${x.area}</span><span>${x.text}</span></li>`;
            })}</ul>` : html`<p class="muted">No gaps found.</p>`}</div>
          </div>
        </section>

        <section>
          <h2>Life timeline</h2>
          <${TimelineLegend} />
          <${TimelineChart} model=${m} height=${300} />
        </section>

        <section class="grid cols-2">
          <div><h2>Monthly cashflow</h2>
            <dl class="kv" style="margin-top:12px">
              <dt>Take-home income</dt><dd>${money(cf.takeHome)}</dd>
              ${cf.buckets.map(function (b) { return html`<dt>${b.label} (${pct(b.share)}, rec. ${pct(b.target)})</dt><dd>${money(b.amount)}</dd>`; })}
              <dt>Goal set-asides</dt><dd>${money(cf.goalsMonthly)}</dd>
              <dt class="total">Surplus</dt><dd class="total">${money(cf.surplus)}</dd>
            </dl>
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
            <thead><tr><th>Cover</th>${m.protection.map(function (p) { return html`<th class="n">${p.name}: current</th><th class="n">Target</th>`; })}</tr></thead>
            <tbody>${m.protection[0].rows.map(function (row, idx) {
              return html`<tr><td class="label">${row.label}</td>${m.protection.map(function (p) {
                var x = p.rows[idx];
                var c = x.unit === 'lump' ? money(x.current) : x.unit === 'month' ? money(x.current) + '/mth' : x.unit === 'ward' ? calc.wardLabel(x.current) : (x.current ? 'Covered' : 'None');
                var t = x.unit === 'lump' ? money(x.target) : x.unit === 'month' ? money(x.target) + '/mth' : x.unit === 'ward' ? calc.wardLabel(x.target) : 'Covered';
                return html`<td class="n">${c}</td><td class="n">${t}</td>`;
              })}</tr>`;
            })}</tbody>
          </table></div>
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
            CPF OA 2.5%, SA/MA/RA 4% plus extra interest · 2026 CPF contribution rates and ceilings · protection needs of ${a.deathMultiple}× (death/TPD) and ${a.ciMultiple}× (CI) total income.</p>
          <p class="disclaimer">This report is an educational projection, not financial advice. CPF, tax and insurance figures are estimates based on published 2026 rules and the assumptions above; check cpf.gov.sg, iras.gov.sg and your policy documents before acting.</p>
        </section>
      </article>
    </div>`;
  };
})(window.FP = window.FP || {});
