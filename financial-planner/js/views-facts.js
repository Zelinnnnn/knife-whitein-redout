/* Client-detail views: the inputs, each with its live analysis beside it. */
(function (FP) {
  'use strict';
  var ui = FP.ui, html = ui.html, charts = FP.charts, calc = FP.calc, data = FP.data, CFG = FP.config;
  var money = ui.money, pct = ui.pct, compact = ui.compact;
  var useState = preactHooks.useState;
  var V = FP.views = FP.views || {};
  var NF = ui.NumberField, TF = ui.TextField, SF = ui.SelectField;

  function personKeys(state) { return state.hasSpouse ? ['client', 'spouse'] : ['client']; }
  function personName(state, key) {
    var p = (state.people || {})[key] || {};
    return p.name || (key === 'client' ? 'You' : 'Spouse');
  }
  function ownerOptions(state, joint) {
    var o = personKeys(state).map(function (k) { return { value: k, label: personName(state, k) }; });
    if (joint && state.hasSpouse) o.push({ value: 'joint', label: 'Joint' });
    return o;
  }
  function Remove(props) {
    return html`<button type="button" class="icon-btn" aria-label=${'Remove ' + (props.label || 'item')} title="Remove" onClick=${props.onClick}><${ui.Icon} name="trash" /></button>`;
  }
  var FREQ = [{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }];

  // ---------------------------------------------------------------- profile
  V.profile = function (props) {
    var s = props.state, api = props.api;
    var a = Object.assign({}, CFG.defaults, s.assumptions);
    var al = Object.assign({}, CFG.defaults.allocation, (s.assumptions || {}).allocation);
    function person(key) {
      var p = s.people[key] || {}, base = 'people.' + key + '.';
      return html`<${ui.Card} title=${key === 'client' ? 'You' : 'Spouse or partner'} sub=${key === 'client' ? 'The timeline runs on this person’s age.' : 'Their income, CPF and cover are modelled alongside yours.'}>
        <div class="fields">
          <${TF} label="Name" path=${base + 'name'} value=${p.name} placeholder=${key === 'client' ? 'You' : 'Spouse'} onChange=${function (v) { api.set(base + 'name', v); }} />
          <${NF} label="Age" path=${base + 'age'} prefix="" suffix="years" value=${p.age} onChange=${function (v) { api.set(base + 'age', v); }} />
          <${NF} label="Retirement age" path=${base + 'retireAge'} prefix="" suffix="years" value=${p.retireAge} hint="Salary and CPF contributions stop" onChange=${function (v) { api.set(base + 'retireAge', v); }} />
          <${NF} label="Plan to age" path=${base + 'lifeExpectancy'} prefix="" suffix="years" value=${p.lifeExpectancy} hint="Life expectancy for planning" onChange=${function (v) { api.set(base + 'lifeExpectancy', v); }} />
        </div>
        <div class="field"><span class="label">Gender (sets CareShield Life premiums)</span>
          <${ui.Seg} label="Gender" value=${p.gender || 'male'} options=${[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} onChange=${function (v) { api.set(base + 'gender', v); }} />
        </div>
      </${ui.Card}>`;
    }
    function pctField(label, key, hint) {
      return html`<${NF} label=${label} path=${'assumptions.' + key} percent value=${a[key]} hint=${hint} onChange=${function (v) { api.set('assumptions.' + key, v); }} />`;
    }
    return html`<div class="page">
      <${ui.PageHead} eyebrow="Step 1 of 8" title="Profile and assumptions" lede="Who the plan is for, and the economic assumptions behind every projection." />
      <${ui.Card} title="Household">
        <div class="fields"><${TF} label="Household or client name" path="household" value=${s.household} placeholder="e.g. Tan family" onChange=${function (v) { api.set('household', v); }} /></div>
        <${ui.Check} label="Plan for a couple" path="hasSpouse" checked=${s.hasSpouse} onChange=${function (v) { api.set('hasSpouse', v); }} />
      </${ui.Card}>
      <div class=${'grid ' + (s.hasSpouse ? 'cols-2' : '')}>${personKeys(s).map(person)}</div>
      <div class="grid cols-2">
        <${ui.Card} title="Economic assumptions" sub="Applied to every year of the timeline.">
          <div class="fields">
            ${pctField('Inflation', 'inflation', 'Spending and goal costs grow at this rate')}
            ${pctField('Salary growth', 'salaryGrowth', 'Yearly pay rise')}
            ${pctField('Cash interest', 'cashRate', 'Savings and deposit accounts')}
            ${pctField('Return before retirement', 'preRetReturn', 'Investment portfolio')}
            ${pctField('Return in retirement', 'postRetReturn', 'Also discounts the retirement target')}
          </div>
        </${ui.Card}>
        <${ui.Card} title="Targets" sub="Rules of thumb behind the health check. The LIA and MAS Basic Financial Planning Guide suggests 9× income for death and TPD, and 4× for critical illness.">
          <div class="fields">
            <${NF} label="Emergency fund" path="assumptions.emergencyMonths" prefix="" suffix="months" value=${a.emergencyMonths} onChange=${function (v) { api.set('assumptions.emergencyMonths', v); }} />
            <${NF} label="Death / TPD cover" path="assumptions.deathMultiple" prefix="" suffix="× income" value=${a.deathMultiple} onChange=${function (v) { api.set('assumptions.deathMultiple', v); }} />
            <${NF} label="Critical illness cover" path="assumptions.ciMultiple" prefix="" suffix="× income" value=${a.ciMultiple} onChange=${function (v) { api.set('assumptions.ciMultiple', v); }} />
            ${pctField('Disability income', 'diReplacement', 'Share of monthly income replaced')}
            <${SF} label="Hospital plan" path="assumptions.targetWard" value=${a.targetWard}
              options=${CFG.wards.filter(function (w) { return w.rank > 0; }).map(function (w) { return { value: w.id, label: w.label }; })}
              onChange=${function (v) { api.set('assumptions.targetWard', v); }} />
          </div>
          <div class="section-title">Recommended split of take-home pay</div>
          <div class="fields tight">
            ${[['fixed', 'Fixed expenses'], ['variable', 'Variable expenses'], ['savings', 'Savings & investing'], ['insurance', 'Insurance']].map(function (x) {
              return html`<${NF} label=${x[1]} path=${'assumptions.allocation.' + x[0]} percent value=${al[x[0]]} onChange=${function (v) { api.set('assumptions.allocation.' + x[0], v); }} />`;
            })}
          </div>
        </${ui.Card}>
      </div>
    </div>`;
  };

  // How the yearly surplus and the emergency fund are treated on the timeline.
  function SavingsRules(props) {
    var s = props.state, api = props.api, m = props.model, a = m.assumptions, cf = m.cashflow;
    var surplus = Math.max(0, cf.surplus);
    var kept = surplus * a.surplusSaved, toInv = kept * a.surplusInvest;
    var reserve = calc.emergencyReserve(s);
    return html`<${ui.Card} title="What happens to the surplus" sub="Applied to every year of the timeline.">
      <div class="fields tight">
        <${NF} label="Share of surplus saved" path="assumptions.surplusSaved" percent value=${a.surplusSaved} hint="The rest is spent" onChange=${function (v) { api.set('assumptions.surplusSaved', v); }} />
        <${NF} label="Of savings, invested" path="assumptions.surplusInvest" percent value=${a.surplusInvest} hint="The rest stays in cash" onChange=${function (v) { api.set('assumptions.surplusInvest', v); }} />
      </div>
      <dl class="kv">
        <dt>Into cash this month</dt><dd>${money(kept - toInv)}</dd>
        <dt>Into investments (${pct(a.preRetReturn)} return)</dt><dd>${money(toInv)}</dd>
        <dt>Spent</dt><dd>${money(surplus - kept)}</dd>
      </dl>
      <div class="divider" />
      <${ui.Check} label="Keep the emergency fund untouched" path="assumptions.ringFence" checked=${!!a.ringFence} onChange=${function (v) { api.set('assumptions.ringFence', v); }} />
      ${a.ringFence && html`<div class="fields tight"><${NF} label="Emergency fund" path="assumptions.emergencyReserve" allowBlank placeholder=${String(Math.round(cf.essentialMonthly * a.emergencyMonths))}
        value=${a.emergencyReserve} hint=${'Blank uses ' + a.emergencyMonths + ' months of expenses. Never spent on the timeline.'} onChange=${function (v) { api.set('assumptions.emergencyReserve', v); }} /></div>`}
      ${a.ringFence && reserve > m.netWorth.liquid && html`<p class="small muted">Only ${money(m.netWorth.liquid)} is in cash today, so that is what gets kept aside.</p>`}
    </${ui.Card}>`;
  }

  // Spending slices in a fixed order so colours follow the category.
  function spendItems(cf) {
    var cat = function (c) { var x = cf.byCategory.find(function (y) { return y.category === c; }); return x ? x.amount : 0; };
    var fm = cat('Financial management') - cf.taxMonthly - cf.loanCash - cf.protectionPrem - cf.savingsPrem;
    return [
      { id: 'personal', label: 'Personal', value: cat('Personal'), cls: 'fill-1', swatch: 's1' },
      { id: 'household', label: 'Household', value: cat('Household'), cls: 'fill-2', swatch: 's2' },
      { id: 'transport', label: 'Transport', value: cat('Transportation'), cls: 'fill-3', swatch: 's3' },
      { id: 'education', label: "Children's education", value: cat("Children's education"), cls: 'fill-4', swatch: 's4' },
      { id: 'insurance', label: 'Insurance premiums', value: cf.protectionPrem + cf.savingsPrem, cls: 'fill-5', swatch: 's5' },
      { id: 'taxloans', label: 'Tax, loans and other', value: cf.taxMonthly + cf.loanCash + Math.max(0, fm), cls: 'fill-6', swatch: 's6' },
    ];
  }

  // --------------------------------------------------------------- cashflow
  V.cashflow = function (props) {
    var s = props.state, api = props.api, m = props.model, cf = m.cashflow;
    var incomeFields = [
      ['salary', 'Monthly salary', 'Gross, before CPF'], ['bonus', 'Annual bonus', 'Bonus and 13th-month pay for the year'],
      ['business', 'Business income', 'Monthly, stops at retirement'], ['rental', 'Rental income', 'Monthly'],
      ['dividends', 'Dividends', 'Monthly, tax-exempt'], ['interest', 'Interest', 'Monthly, tax-exempt'], ['others', 'Other income', 'Monthly'],
    ];
    function incomeCard(key) {
      var pp = cf.perPerson.find(function (x) { return x.key === key; });
      var y = pp.y, inc = (s.income || {})[key] || {};
      return html`<${ui.Card} title=${'Income: ' + personName(s, key)} sub=${pp.working ? '' : 'Retired: only passive income counts.'}>
        <div class="fields tight">
          ${incomeFields.map(function (f) {
            var path = 'income.' + key + '.' + f[0];
            return html`<${NF} label=${f[1]} path=${path} value=${inc[f[0]]} hint=${f[2]} onChange=${function (v) { api.set(path, v); }} />`;
          })}
          <${NF} label="Regular investing" path=${'investing.' + key} value=${(s.investing || {})[key]} hint="Monthly, until retirement" onChange=${function (v) { api.set('investing.' + key, v); }} />
        </div>
        <dl class="kv">
          <dt>Employee CPF (${pct(y.cpf.employeeRate, 1)})</dt><dd>${money(y.cpf.employee / 12)}/mth</dd>
          <dt>Employer CPF (${pct(y.cpf.employerRate, 1)})</dt><dd>${money(y.cpf.employer / 12)}/mth</dd>
          <dt>Income tax (from Tax)</dt><dd>${money(y.tax.net / 12)}/mth</dd>
          <dt class="total">Take-home, bonus spread monthly</dt><dd class="total">${money(y.takeHome / 12)}</dd>
        </dl>
      </${ui.Card}>`;
    }
    function row(e) {
      var set = function (k) { return function (v) { api.setItem('expenses', e.id, k, v); }; };
      return html`<tr key=${e.id}>
        <td class="wide" data-label="Expense" style="min-width:170px"><${TF} bare label="Expense" id=${'exp-name-' + e.id} value=${e.name} onChange=${set('name')} /></td>
        <td data-label="Amount" style="min-width:110px"><${NF} bare label=${e.name + ' amount'} id=${'exp-amt-' + e.id} value=${e.amount} onChange=${set('amount')} /></td>
        <td data-label="Per" style="min-width:100px"><${SF} bare label=${e.name + ' frequency'} id=${'exp-freq-' + e.id} value=${e.freq} options=${FREQ} onChange=${set('freq')} /></td>
        <td data-label="Type" style="min-width:104px"><${SF} bare label=${e.name + ' type'} id=${'exp-kind-' + e.id} value=${e.kind} options=${[{ value: 'fixed', label: 'Fixed' }, { value: 'variable', label: 'Variable' }]} onChange=${set('kind')} /></td>
        <td data-label="Ends at age" style="min-width:90px"><${NF} bare label=${e.name + ' ends at age'} id=${'exp-end-' + e.id} prefix="" allowBlank placeholder="Ongoing" value=${e.endAge} onChange=${set('endAge')} /></td>
        <td class="n num" data-label="Monthly">${money(calc.annual(e.amount, e.freq) / 12)}</td>
        <td class="end"><${Remove} label=${e.name} onClick=${function () { api.removeItem('expenses', e.id); }} /></td>
      </tr>`;
    }
    function autoRow(label, value, source) {
      return html`<tr class="plain"><td colspan="5"><span>${label}</span> <span class="muted small">· from ${source}</span></td><td class="n num">${money(value)}</td><td /></tr>`;
    }
    return html`<div class="page">
      <${ui.PageHead} eyebrow="Step 2 of 8" title="Cashflow" lede="Income, spending and saving each month. Tax, insurance premiums and loan repayments are filled in from their own sections." />
      <div class="split">
        <div class="stack">
          ${personKeys(s).map(incomeCard)}
          <${ui.Card} title="Expenses" sub="Monthly or yearly amounts in today's dollars. Fixed and variable feed the 40/30/20/10 check. 'Ends at age' uses your age; spending switches to retirement spending when you retire.">
            <div class="table-wrap"><table class="data edit cards">
              <thead><tr><th>Expense</th><th>Amount</th><th>Per</th><th>Type</th><th>Ends at age</th><th class="n">Monthly</th><th /></tr></thead>
              <tbody>
                ${calc.EXPENSE_CATEGORIES.map(function (c) {
                  var list = (s.expenses || []).filter(function (e) { return e.category === c; });
                  var cat = cf.byCategory.find(function (x) { return x.category === c; });
                  return [
                    html`<tr class="group" key=${'g-' + c}><td colspan="5">${c}</td><td class="n">${money(cat.amount)}</td><td /></tr>`,
                    list.map(row),
                    c === 'Financial management' ? [
                      autoRow('Income tax', cf.taxMonthly, 'Tax'),
                      autoRow('Insurance premiums', cf.protectionPrem, 'Protection'),
                      cf.savingsPrem > 0 ? autoRow('Savings and investment-linked policies', cf.savingsPrem, 'Protection') : null,
                      cf.loanCash > 0 ? autoRow('Loan repayments (cash)', cf.loanCash, 'Net worth') : null,
                    ] : null,
                    html`<tr class="plain" key=${'a-' + c}><td colspan="7"><button type="button" class="btn ghost sm" onClick=${function () {
                      api.addItem('expenses', { id: data.id('exp'), category: c, name: '', amount: 0, freq: 'month', kind: 'fixed', endAge: '' });
                    }}><${ui.Icon} name="plus" />Add to ${c.toLowerCase()}</button></td></tr>`,
                  ];
                })}
              </tbody>
            </table></div>
          </${ui.Card}>
        </div>
        <div class="sticky">
          <${ui.Card} title="Monthly summary" class="raised">
            <dl class="kv">
              <dt>Take-home income</dt><dd>${money(cf.takeHome)}</dd>
              <dt>Fixed expenses (incl. tax, loans)</dt><dd>${money(-cf.fixed)}</dd>
              <dt>Variable expenses</dt><dd>${money(-cf.variable)}</dd>
              <dt>Insurance premiums</dt><dd>${money(-cf.protectionPrem)}</dd>
              <dt>Savings and investing</dt><dd>${money(-cf.savings)}</dd>
              <dt>Goal set-asides</dt><dd>${money(-cf.goalsMonthly)}</dd>
            </dl>
            <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap">
              <div><div class="muted small">${cf.surplus >= 0 ? 'Surplus' : 'Deficit'} each month</div><div class="figure-big">${money(cf.surplus)}</div></div>
              <${ui.Pill} status=${cf.surplus >= 0 ? 'good' : 'critical'}>${cf.surplus >= 0 ? 'Cashflow positive' : 'Spending more than you earn'}</${ui.Pill}>
            </div>
          </${ui.Card}>
          <${SavingsRules} state=${s} model=${m} api=${api} />
          <${ui.Card} title="Allocation vs recommended" sub="Tick marks the recommended share of take-home pay.">
            <div class="bullets">${cf.buckets.map(function (b) {
              return html`<${charts.Bullet} label=${b.label} value=${b.amount} target=${b.recommended} valueText=${money(b.amount) + ' · ' + pct(b.share)} targetText=${'rec. ' + pct(b.target)} />`;
            })}</div>
          </${ui.Card}>
          <${ui.Card} title="Where the money goes" sub="Monthly spending by category, including insurance, tax and loans. Hover a slice for details.">
            <${charts.Donut} label="Monthly spending by category" format=${money} centerLabel="a month" items=${spendItems(cf)} />
          </${ui.Card}>
        </div>
      </div>
    </div>`;
  };

  // -------------------------------------------------------------- net worth
  V.networth = function (props) {
    var s = props.state, api = props.api, nw = props.model.netWorth;
    var owners = ownerOptions(s, true);
    var cats = calc.ASSET_CATEGORIES.map(function (c) { return { value: c.id, label: c.label }; });
    var ltypes = calc.LIABILITY_TYPES.map(function (c) { return { value: c.id, label: c.label }; });
    return html`<div class="page">
      <${ui.PageHead} eyebrow="Step 3 of 8" title="Assets and liabilities" lede="What you own and owe today. Cash seeds the timeline's cash line and investments seed its portfolio. CPF balances and policy cash values come from their own sections." />
      <div class="split">
        <div class="stack">
          <${ui.Card} title="Assets" tools=${html`<button class="btn sm" onClick=${function () { api.addItem('assets', { id: data.id('ast'), owner: 'client', category: 'cash', name: '', value: 0 }); }}><${ui.Icon} name="plus" />Add asset</button>`}>
            ${(s.assets || []).length ? html`<div class="table-wrap"><table class="data edit cards">
              <thead><tr><th>Owner</th><th>Type</th><th>Description</th><th>Value</th><th /></tr></thead>
              <tbody>${s.assets.map(function (x) {
                var set = function (k) { return function (v) { api.setItem('assets', x.id, k, v); }; };
                return html`<tr key=${x.id}>
                  <td data-label="Owner" style="min-width:110px"><${SF} bare label="Owner" id=${'ast-o-' + x.id} value=${x.owner} options=${owners} onChange=${set('owner')} /></td>
                  <td data-label="Type" style="min-width:150px"><${SF} bare label="Type" id=${'ast-c-' + x.id} value=${x.category} options=${cats} onChange=${set('category')} /></td>
                  <td class="wide" data-label="Description" style="min-width:160px"><${TF} bare label="Description" id=${'ast-n-' + x.id} value=${x.name} onChange=${set('name')} /></td>
                  <td data-label="Value" style="min-width:130px"><${NF} bare label="Value" id=${'ast-v-' + x.id} value=${x.value} onChange=${set('value')} /></td>
                  <td class="end"><${Remove} label=${x.name} onClick=${function () { api.removeItem('assets', x.id); }} /></td>
                </tr>`;
              })}</tbody></table></div>` : html`<p class="muted">No assets yet. Add savings accounts, fixed deposits, investments and property.</p>`}
          </${ui.Card}>
          <${ui.Card} title="Liabilities" sub="For home loans, the part paid from CPF OA is deducted from OA each year. If OA runs short, the rest is paid in cash."
            tools=${html`<button class="btn sm" onClick=${function () { api.addItem('liabilities', { id: data.id('lia'), owner: 'client', type: 'mortgage', name: '', balance: 0, rate: 0.026, monthly: 0, cpfMonthly: 0, yearsLeft: 25 }); }}><${ui.Icon} name="plus" />Add liability</button>`}>
            ${(s.liabilities || []).length ? html`<div class="table-wrap"><table class="data edit cards">
              <thead><tr><th>Owner</th><th>Type</th><th>Description</th><th>Balance</th><th>Interest</th><th>Monthly repayment</th><th>From CPF OA</th><th>Years left</th><th /></tr></thead>
              <tbody>${s.liabilities.map(function (x) {
                var set = function (k) { return function (v) { api.setItem('liabilities', x.id, k, v); }; };
                return html`<tr key=${x.id}>
                  <td data-label="Owner" style="min-width:110px"><${SF} bare label="Owner" id=${'lia-o-' + x.id} value=${x.owner} options=${owners} onChange=${set('owner')} /></td>
                  <td data-label="Type" style="min-width:130px"><${SF} bare label="Type" id=${'lia-t-' + x.id} value=${x.type} options=${ltypes} onChange=${set('type')} /></td>
                  <td class="wide" data-label="Description" style="min-width:140px"><${TF} bare label="Description" id=${'lia-n-' + x.id} value=${x.name} onChange=${set('name')} /></td>
                  <td data-label="Balance" style="min-width:120px"><${NF} bare label="Balance" id=${'lia-b-' + x.id} value=${x.balance} onChange=${set('balance')} /></td>
                  <td data-label="Interest" style="min-width:90px"><${NF} bare label="Interest rate" id=${'lia-r-' + x.id} percent value=${x.rate} onChange=${set('rate')} /></td>
                  <td data-label="Monthly repayment" style="min-width:120px"><${NF} bare label="Monthly repayment" id=${'lia-m-' + x.id} value=${x.monthly} onChange=${set('monthly')} /></td>
                  <td data-label="From CPF OA" style="min-width:120px">${x.type === 'mortgage' ? html`<${NF} bare label="Paid from CPF OA" id=${'lia-c-' + x.id} value=${x.cpfMonthly} onChange=${set('cpfMonthly')} />` : html`<span class="muted small">Cash only</span>`}</td>
                  <td data-label="Years left" style="min-width:80px"><${NF} bare label="Years left" id=${'lia-y-' + x.id} prefix="" value=${x.yearsLeft} onChange=${set('yearsLeft')} /></td>
                  <td class="end"><${Remove} label=${x.name} onClick=${function () { api.removeItem('liabilities', x.id); }} /></td>
                </tr>`;
              })}</tbody></table></div>` : html`<p class="muted">No liabilities.</p>`}
          </${ui.Card}>
        </div>
        <div class="sticky">
          <${ui.Card} title="Net worth" class="raised">
            <div class="figure-big">${money(nw.netWorth)}</div>
            <dl class="kv">
              <dt>Total assets</dt><dd>${money(nw.totalAssets)}</dd>
              <dt>Total liabilities</dt><dd>${money(-nw.totalLiabilities)}</dd>
              <dt>Liquid cash</dt><dd>${money(nw.liquid)}</dd>
              <dt>Solvency (net worth ÷ assets)</dt><dd>${pct(nw.solvency)}</dd>
            </dl>
          </${ui.Card}>
          <${ui.Card} title="What you own">
            <${charts.Donut} label="Assets by type" format=${compact} centerLabel="total assets"
              items=${nw.categories.map(function (c, k) { return { id: c.id, label: c.label, value: c.amount, cls: 'fill-' + (k + 1), swatch: 's' + (k + 1) }; })} />
          </${ui.Card}>
          ${nw.liabilities.length > 0 && html`<${ui.Card} title="What you owe">
            <${charts.HBars} format=${money} cls="fill-short" items=${nw.liabilities.map(function (l) { return { label: l.label, value: l.amount }; })} />
          </${ui.Card}>`}
        </div>
      </div>
    </div>`;
  };

  // ------------------------------------------------------------- protection
  function coverText(x) {
    if (x.unit === 'lump') return money(x.current);
    if (x.unit === 'month') return money(x.current) + '/mth';
    if (x.unit === 'ward') return calc.wardLabel(x.current);
    return x.current ? 'Covered' : 'Not covered';
  }

  V.PolicySummary = function (props) {
    var m = props.model, s = props.state;
    var cols = [['death', 'Death'], ['tpd', 'TPD'], ['ci', 'CI'], ['eci', 'Early CI'], ['accident', 'Accident'], ['di', 'Disability /mth'], ['cashValue', 'Cash value']];
    var policies = s.policies || [];
    if (!policies.length) return html`<p class="muted">No policies recorded yet.</p>`;
    return html`<div class="table-wrap"><table class="data compact policies">
      <thead><tr><th>Policy</th><th>Type</th><th class="n">Premium /yr</th>${cols.map(function (c) { return html`<th class="n">${c[1]}</th>`; })}<th>Hospital</th></tr></thead>
      <tbody>${m.people.map(function (p) {
        var mine = policies.filter(function (x) { return (x.owner || 'client') === p.key; });
        if (!mine.length) return null;
        var groups = [['protection', 'Risk management'], ['savings', 'Wealth management']];
        return [
          html`<tr class="group"><td colspan=${cols.length + 4}>${p.name}</td></tr>`,
          groups.map(function (g) {
            var list = mine.filter(function (x) { return calc.policyType(x.type).group === g[0]; });
            return list.map(function (x) {
              return html`<tr><td>${x.name || calc.policyType(x.type).label}${x.insurer ? html` <span class="muted small">· ${x.insurer}</span>` : ''}</td>
                <td class="small">${calc.policyType(x.type).label}</td>
                <td class="n">${money(calc.annual(x.premium, x.freq))}</td>
                ${cols.map(function (c) { return html`<td class="n">${calc.num(x[c[0]]) ? money(calc.num(x[c[0]])) : '–'}</td>`; })}
                <td class="small">${x.type === 'hospital' ? calc.wardLabel(x.ward) : '–'}</td></tr>`;
            });
          }),
          html`<tr class="total"><td colspan="2">Total for ${p.name}</td>
            <td class="n">${money(mine.reduce(function (t, x) { return t + calc.annual(x.premium, x.freq); }, 0))}</td>
            ${cols.map(function (c) { var t = mine.reduce(function (acc, x) { return acc + calc.num(x[c[0]]); }, 0); return html`<td class="n">${t ? money(t) : '–'}</td>`; })}<td /></tr>`,
        ];
      })}</tbody>
    </table></div>`;
  };

  function policyDefaults(type, owner) {
    var base = { id: data.id('pol'), owner: owner, insurer: '', name: calc.policyType(type).label, type: type, premium: 0, freq: 'year', premiumUntil: 65, coverUntil: 65, death: 0, tpd: 0, ci: 0, eci: 0, accident: 0, di: 0, ward: 'none', cashValue: 0 };
    if (type === 'hospital') { base.ward = 'private'; base.premiumUntil = ''; base.coverUntil = ''; }
    if (type === 'wholelife') { base.premiumUntil = 65; base.coverUntil = ''; }
    if (type === 'ci') base.coverUntil = 75;
    return base;
  }

  function PolicyEditor(props) {
    var x = props.policy, api = props.api, s = props.state;
    var set = function (k) { return function (v) { api.setItem('policies', x.id, k, v); }; };
    var t = calc.policyType(x.type);
    var id = function (k) { return 'pol-' + k + '-' + x.id; };
    var amounts = [['death', 'Death'], ['tpd', 'Total & permanent disability'], ['ci', 'Critical illness'], ['eci', 'Early critical illness'], ['accident', 'Accidental death'], ['di', 'Disability income /mth'], ['cashValue', 'Cash / surrender value']];
    return html`<details class="item" open=${props.open}>
      <summary class="item-head">
        <span class="chev"><${ui.Icon} name="chevron" /></span>
        <span class="title">${x.name || t.label}</span>
        <span class="owner-tag">${personName(s, x.owner || 'client')}</span>
        <span class="meta num">${money(calc.annual(x.premium, x.freq))}/yr</span>
      </summary>
      <div class="fields">
        <${SF} label="Owner" id=${id('owner')} value=${x.owner || 'client'} options=${ownerOptions(s, false)} onChange=${set('owner')} />
        <${SF} label="Type" id=${id('type')} value=${x.type} options=${calc.POLICY_TYPES.map(function (p) { return { value: p.id, label: p.label }; })} onChange=${set('type')} />
        <${TF} label="Plan name" id=${id('name')} value=${x.name} onChange=${set('name')} />
        <${TF} label="Insurer" id=${id('insurer')} value=${x.insurer} onChange=${set('insurer')} />
        <${NF} label="Premium" id=${id('premium')} value=${x.premium} onChange=${set('premium')} />
        <${SF} label="Paid" id=${id('freq')} value=${x.freq} options=${FREQ} onChange=${set('freq')} />
        <${NF} label="Premiums until age" id=${id('pu')} prefix="" allowBlank placeholder="For life" value=${x.premiumUntil} onChange=${set('premiumUntil')} />
        <${NF} label="Covered until age" id=${id('cu')} prefix="" allowBlank placeholder="For life" value=${x.coverUntil} onChange=${set('coverUntil')} />
        ${x.type === 'hospital' && html`<${SF} label="Ward covered" id=${id('ward')} value=${x.ward} options=${CFG.wards.map(function (w) { return { value: w.id, label: w.label }; })} onChange=${set('ward')} />`}
      </div>
      ${x.type !== 'hospital' && html`<div class="fields tight">${amounts.map(function (a) {
        return html`<${NF} label=${a[0] === 'di' ? 'Disability income' : a[1]} id=${id(a[0])} value=${x[a[0]]} suffix=${a[0] === 'di' ? '/mth' : undefined} prefix=${a[0] === 'di' ? 'S$' : undefined} onChange=${set(a[0])} />`;
      })}</div>`}
      <div style="display:flex;justify-content:flex-end"><button type="button" class="btn danger sm" onClick=${function () { api.removeItem('policies', x.id); }}><${ui.Icon} name="trash" />Remove policy</button></div>
    </details>`;
  }

  var NEED_CLS = ['fill-1', 'fill-2', 'fill-3', 'fill-4', 'fill-5'];
  var RISK_SHORT = { death: 'Death', tpd: 'TPD', ci: 'Critical illness' };

  // Item-by-item needs for one person and one risk, with the stacked
  // needed-vs-covered bar on top.
  function NeedsEditor(props) {
    var p = props.p, api = props.api, risk = props.risk;
    var base = 'needs.' + p.key + '.' + risk + '.';
    var r = p.needs[risk];
    var cover = p.current[risk];
    return html`<div class="needs">
      <${charts.NeedsStack} items=${r.items.map(function (it, k) { return { label: it.label, value: it.total, cls: NEED_CLS[k] }; })} need=${r.need} cover=${cover} />
      <div class="need-items">
        ${r.items.map(function (it, k) {
          var id = function (f) { return 'need-' + p.key + '-' + risk + '-' + it.id + '-' + f; };
          return html`<div class=${'need-item' + (it.on ? '' : ' off')} key=${it.id}>
            <input type="checkbox" id=${id('on')} checked=${it.on} aria-label=${'Include ' + it.label} onChange=${function (e) { api.set(base + it.id + '.on', e.currentTarget.checked); }} />
            <label class="ni-label" for=${id('on')}><i class=${'swatch s' + (k + 1)} />${it.label}</label>
            <span class="ni-total">${money(it.total)}</span>
            <div class="ni-fields">
              ${it.kind === 'monthly' ? html`
                <${NF} bare label=${it.label + ' per month'} id=${id('m')} value=${it.monthly} suffix="/mth" prefix="S$" onChange=${function (v) { api.set(base + it.id + '.monthly', v); }} />
                <span class="small muted">for</span>
                <${NF} bare cls="short" label=${it.label + ' duration'} id=${id('d')} value=${it.duration} prefix="" suffix=${it.unit} onChange=${function (v) { api.set(base + it.id + '.duration', v); }} />`
              : html`<${NF} bare label=${it.label} id=${id('a')} value=${it.amount} onChange=${function (v) { api.set(base + it.id + '.amount', v); }} />`}
              ${it.edited && html`<button type="button" class="btn ghost sm" onClick=${function () { api.set(base + it.id, { on: it.on }); }}>Use estimate</button>`}
            </div>
            <span class="ni-note">${it.note}</span>
          </div>`;
        })}
      </div>
      <div class="stack" style="gap:6px">
        <${ui.Check} label=${'Subtract savings and investments (' + money(r.savings) + ')'} id=${'need-' + p.key + '-' + risk + '-sav'} checked=${r.offsetSavings}
          onChange=${function (v) { api.set(base + 'offsetSavings', v); }} />
        ${risk === 'death' && html`<${ui.Check} label=${'Subtract CPF savings paid to nominees (' + money(r.cpf) + ')'} id=${'need-' + p.key + '-cpf'} checked=${r.offsetCpf}
          onChange=${function (v) { api.set(base + 'offsetCpf', v); }} />`}
      </div>
      <div class="need-total"><span>Total needed for ${RISK_SHORT[risk].toLowerCase()}</span><span class="num">${money(r.need)}</span></div>
      <p class="small muted">In today's dollars. Assumes the payout is invested to keep pace with inflation, so a monthly need times its duration is the lump sum required.</p>
    </div>`;
  }

  function PersonCover(props) {
    var p = props.p, api = props.api, a = props.a;
    var rs = useState('death'), risk = rs[0], setRisk = rs[1];
    var detailed = p.method === 'needs';
    var lumps = p.rows.filter(function (r) { return r.unit === 'lump' || r.unit === 'month'; });
    return html`<${ui.Card} title=${p.name} sub=${'Total income ' + money(p.basis) + ' a year (salary, bonus, employer CPF and other income).'}
      tools=${html`<${ui.Seg} label=${'How to size ' + p.name + '’s cover'} value=${p.method}
        options=${[{ value: 'multiple', label: 'Quick rule', title: a.deathMultiple + '× income for death and TPD, ' + a.ciMultiple + '× for critical illness' }, { value: 'needs', label: 'Detailed needs', title: 'Build the need item by item' }]}
        onChange=${function (v) { api.set('needs.' + p.key + '.method', v); }} />`}>
      <div class="compare">
        <span>Quick rule: death <b>${compact(p.rule.death)}</b> · CI <b>${compact(p.rule.ci)}</b></span>
        <span>Detailed needs: death <b>${compact(p.detailed.death)}</b> · TPD <b>${compact(p.detailed.tpd)}</b> · CI <b>${compact(p.detailed.ci)}</b></span>
      </div>
      ${detailed && html`<div class="stack" style="gap:12px">
        <${ui.Seg} label="Risk" value=${risk} onChange=${setRisk}
          options=${calc.NEED_RISKS.map(function (r) { return { value: r.id, label: RISK_SHORT[r.id], title: r.label }; })} />
        <${NeedsEditor} p=${p} api=${api} risk=${risk} />
      </div>`}
      <div class="divider" />
      <div class="bullets">
        ${lumps.map(function (r) {
          return html`<${charts.Bullet} label=${r.id === 'tpd' ? 'Total & permanent disability (TPD)' : r.label} value=${r.current} target=${r.target} cls=${'fill-' + r.status}
            valueText=${coverText(r)} targetText=${r.unit === 'month' ? money(r.target) + '/mth' : money(r.target)}
            foot=${html`<${ui.Pill} status=${r.status}>${r.status === 'good' ? 'On target' : 'Short by ' + money(r.gap)}</${ui.Pill}>`} />`;
        })}
      </div>
      <div class="checks">
        ${p.rows.filter(function (r) { return r.unit === 'ward' || r.unit === 'flag'; }).map(function (r) {
          return html`<div class="check-row"><span class="t">${r.label}</span><span class="v"><span class="small">${coverText(r)}</span><${ui.Pill} status=${r.status}>${r.status === 'good' ? 'OK' : 'Gap'}</${ui.Pill}></span></div>`;
        })}
      </div>
    </${ui.Card}>`;
  }

  V.protection = function (props) {
    var s = props.state, api = props.api, m = props.model, a = m.assumptions;
    var addState = useState(personKeys(s)[0]), addOwner = addState[0], setAddOwner = addState[1];
    var lastAdded = useState(null), openId = lastAdded[0], setOpenId = lastAdded[1];
    return html`<div class="page">
      <${ui.PageHead} eyebrow="Step 4 of 8" title="Protection"
        lede="How much cover each person needs, and how much they have. Use the quick rule for a fast answer, or build the need item by item the way a planner would: family support, loans, education, care and recovery costs." />
      <div class=${'grid ' + (m.protection.length > 1 ? 'cols-2' : '')} style="align-items:start">
        ${m.protection.map(function (p) { return html`<${PersonCover} key=${p.key} p=${p} api=${api} a=${a} />`; })}
      </div>
      <${ui.Card} title="Policies" sub="Premiums flow into cashflow. Sums assured feed the gap analysis and the what-if scenarios on the timeline.">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          ${s.hasSpouse && html`<${ui.Seg} label="Add policy for" value=${addOwner} options=${ownerOptions(s, false)} onChange=${setAddOwner} />`}
          <div class="chips">${calc.POLICY_TYPES.map(function (t) {
            return html`<button type="button" class="chip" onClick=${function () { var pol = policyDefaults(t.id, addOwner); api.addItem('policies', pol); setOpenId(pol.id); }}>+ ${t.label}</button>`;
          })}</div>
        </div>
        <div class="items">${(s.policies || []).map(function (x) { return html`<${PolicyEditor} key=${x.id} policy=${x} api=${api} state=${s} open=${x.id === openId} />`; })}</div>
      </${ui.Card}>
      <${ui.Card} title="Policy summary" sub="Every policy by owner, split into risk management and wealth management.">
        <${V.PolicySummary} model=${m} state=${s} />
      </${ui.Card}>
    </div>`;
  };

  // -------------------------------------------------------------------- CPF
  var CPF_SERIES = [
    { key: 'oa', label: 'Ordinary (OA)', cls: 'fill-1', k2: 's1' },
    { key: 'sa', label: 'Special (SA)', cls: 'fill-2', k2: 's2' },
    { key: 'ma', label: 'MediSave (MA)', cls: 'fill-3', k2: 's3' },
    { key: 'ra', label: 'Retirement (RA)', cls: 'fill-4', k2: 's4' },
  ];

  V.cpf = function (props) {
    var s = props.state, api = props.api, m = props.model;
    var sel = useState('client'), who = sel[0], setWho = sel[1];
    var tbl = useState(false), showTable = tbl[0], setShowTable = tbl[1];
    if (!m.people.some(function (p) { return p.key === who; })) who = 'client';
    var person = m.people.find(function (p) { return p.key === who; });
    var today = V.todayOn(s);
    var rows = V.deflateRows(m.sim.rows, m.assumptions.inflation, today).filter(function (r) { return r.ages[who] < person.lifeExpectancy; }).map(function (r) {
      return Object.assign({ age: r.ages[who], year: r.year, t: r.t, events: r.events }, r.cpfBy[who]);
    });
    var series = CPF_SERIES.map(function (x) { return Object.assign({ value: function (r) { return r[x.key]; } }, x); });

    function personCard(p) {
      var key = p.key, c = (s.cpf || {})[key] || {}, base = 'cpf.' + key + '.';
      var pp = m.cashflow.perPerson.find(function (x) { return x.key === key; });
      var con = pp.y.cpf, sum = m.sim.cpf[key];
      return html`<${ui.Card} title=${p.name} sub=${'Contributions on ' + money(pp.salary) + '/mth salary and ' + money(pp.bonus) + ' bonus, at age ' + p.age + ' rates.'}>
        <div class="fields tight">
          ${['oa', 'sa', 'ma', 'ra'].map(function (k) {
            return html`<${NF} label=${{ oa: 'Ordinary (OA)', sa: 'Special (SA)', ma: 'MediSave (MA)', ra: 'Retirement (RA)' }[k]} path=${base + k} value=${c[k]} hint=${ui.GLOSSARY[k.toUpperCase()].replace(/^CPF [A-Za-z]+ Account: /, '')} onChange=${function (v) { api.set(base + k, v); }} />`;
          })}
          <${NF} label="CareShield supplement" path=${base + 'careshieldSupplement'} value=${c.careshieldSupplement} hint="Yearly premium paid from MA" onChange=${function (v) { api.set(base + 'careshieldSupplement', v); }} />
        </div>
        <div class="field"><span class="label">Retirement sum to set aside at 55</span>
          <${ui.Seg} label="Retirement sum" value=${c.retirementSum || 'FRS'} options=${[
            { value: 'BRS', label: 'BRS', title: 'Basic Retirement Sum: needs a property pledge to withdraw more' },
            { value: 'FRS', label: 'FRS', title: 'Full Retirement Sum: twice the BRS' },
            { value: 'ERS', label: 'ERS', title: 'Enhanced Retirement Sum: four times the BRS, highest payouts' },
          ]} onChange=${function (v) { api.set(base + 'retirementSum', v); }} />
        </div>
        <div class="field"><span class="label">CPF LIFE plan</span>
          <${ui.Seg} label="CPF LIFE plan" value=${c.lifePlan || 'standard'}
            options=${Object.keys(CFG.cpf.lifePlans).map(function (k) { var lp = CFG.cpf.lifePlans[k]; return { value: k, label: lp.label, title: lp.note }; })}
            onChange=${function (v) { api.set(base + 'lifePlan', v); }} />
          <span class="hint">${calc.lifePlan(c.lifePlan).note}</span>
        </div>
        <div class="fields tight">
          <${NF} label="CPF LIFE payouts start at" path=${base + 'payoutStart'} prefix="" suffix="years" value=${c.payoutStart === undefined ? 65 : c.payoutStart}
            hint="65 to 70. Each year deferred raises payouts by up to 7%." onChange=${function (v) { api.set(base + 'payoutStart', v); }} />
        </div>
        <div class="table-wrap"><table class="data compact">
          <thead><tr><th>Average month</th><th class="n">Employee</th><th class="n">Employer</th><th class="n">OA</th><th class="n">SA / RA</th><th class="n">MA</th></tr></thead>
          <tbody><tr><td>Contribution</td><td class="n">${money(con.employee / 12)}</td><td class="n">${money(con.employer / 12)}</td><td class="n">${money(con.oa / 12)}</td><td class="n">${money(con.sa / 12)}</td><td class="n">${money(con.ma / 12)}</td></tr></tbody>
        </table></div>
        <dl class="kv">
          <dt>Turns 55 in ${sum.sums.year55}: projected BRS / FRS / ERS</dt><dd>${compact(sum.sums.BRS)} / ${compact(sum.sums.FRS)} / ${compact(sum.sums.ERS)}</dd>
          <dt>Retirement Account at 55</dt><dd>${sum.raAt55 === null ? '–' : money(sum.raAt55)}</dd>
          <dt>Estimated CPF LIFE payout from ${sum.startAge} (${calc.lifePlan(c.lifePlan).label})</dt><dd>${sum.lifeMonthly ? money(sum.lifeMonthly * calc.lifePlan(c.lifePlan).factor) + '/mth' : '–'}</dd>
          ${sum.lifeMonthly > 0 && html`<dt>Same payout in today's dollars</dt><dd>${money(sum.lifeMonthly * calc.lifePlan(c.lifePlan).factor / Math.pow(1 + m.assumptions.inflation, Math.max(0, sum.startAge - p.age)))}/mth</dd>`}
        </dl>
      </${ui.Card}>`;
    }

    return html`<div class="page">
      <${ui.PageHead} eyebrow="Step 5 of 8" title="CPF" lede="Balances projected year by year with 2026 contribution rates and ceilings, 2.5% OA and 4% SA, MA and RA interest plus extra interest, MediShield Life and CareShield Life premiums from MediSave, and the Retirement Account formed at 55." />
      <div class=${'grid ' + (m.people.length > 1 ? 'cols-2' : '')}>${m.people.map(personCard)}</div>
      <${ui.Card} title=${'Projected CPF balances: ' + person.name}
        sub=${(today ? 'In today\u2019s dollars. ' : 'In future dollars. ') + 'RA goes into CPF LIFE when payouts start (' + m.sim.cpf[who].startAge + '), so it leaves the balance and returns as monthly payouts.'}
        tools=${html`<${V.DollarToggle} state=${s} api=${api} />${m.people.length > 1 && html`<${ui.Seg} label="Person" value=${who} options=${m.people.map(function (p) { return { value: p.key, label: p.name }; })} onChange=${setWho} />`}
          <button class="btn sm" onClick=${function () { setShowTable(!showTable); }}><${ui.Icon} name="table" />${showTable ? 'Hide table' : 'Show table'}</button>`}>
        <div class="legend">${CPF_SERIES.map(function (x) { return html`<span><i class=${x.k2} />${x.label}</span>`; })}</div>
        <${charts.StackedColumns} label=${'Projected CPF balances by age for ' + person.name} rows=${rows} series=${series} height=${320}
          lines=${[{ x: 55, label: 'RA formed' }, { x: m.sim.cpf[who].startAge, label: 'CPF LIFE starts' }].filter(function (l) { return l.x > person.age; })}
          tooltip=${function (r) {
            var tot = r.oa + r.sa + r.ma + r.ra;
            return html`<div><div class="tt-head">${person.name}, age ${r.age} · ${r.year}</div>
              ${CPF_SERIES.map(function (x) { return html`<div class="tt-row"><i class=${'key ' + x.k2} /><span>${x.label}</span><b>${money(r[x.key])}</b></div>`; })}
              <div class="tt-sep" /><div class="tt-row"><i /><span>Total</span><b>${money(tot)}</b></div></div>`;
          }} />
        ${showTable && html`<div class="table-wrap" style="max-height:380px;overflow:auto"><table class="data compact">
          <thead><tr><th class="n">Age</th>${CPF_SERIES.map(function (x) { return html`<th class="n">${x.label}</th>`; })}<th class="n">Total</th></tr></thead>
          <tbody>${rows.map(function (r) { return html`<tr><td class="n">${r.age}</td>${CPF_SERIES.map(function (x) { return html`<td class="n">${money(r[x.key])}</td>`; })}<td class="n"><b>${money(r.oa + r.sa + r.ma + r.ra)}</b></td></tr>`; })}</tbody>
        </table></div>`}
      </${ui.Card}>
      <div class="notes">
        <p>CPF LIFE payouts are rough Standard Plan estimates (about ${pct(CFG.cpf.lifePayoutFactor * 12, 1)} of the RA balance at 65 each year). Retirement sums grow ${pct(CFG.cpf.retirementSumGrowth, 1)} a year for later cohorts. MediSave is capped at the Basic Healthcare Sum and the excess flows to SA or RA.</p>
      </div>
    </div>`;
  };

  // ------------------------------------------------------------------ goals
  V.goals = function (props) {
    var s = props.state, api = props.api, m = props.model;
    var total = m.goals.reduce(function (t, g) { return t + g.setAside; }, 0);
    return html`<div class="page">
      <${ui.PageHead} eyebrow="Step 6 of 8" title="Goals" lede="What the household is saving for. Each goal is costed with inflation, paid from savings on the timeline, and gets a monthly set-aside in cashflow." />
      <div class="split">
        <div class="stack">
          <${ui.Card} title="Add a goal">
            <div class="chips">${calc.GOAL_TYPES.map(function (t) {
              return html`<button type="button" class="chip" onClick=${function () { api.addItem('goals', { id: data.id('goal'), type: t.id, name: t.label, amount: t.amount, inYears: t.inYears, repeat: t.repeat, inflate: true }); }}>+ ${t.label}</button>`;
            })}</div>
          </${ui.Card}>
          ${(s.goals || []).length === 0 && html`<${ui.Card}><p class="muted">No goals yet. Pick one above to start.</p></${ui.Card}>`}
          ${(s.goals || []).map(function (g) {
            var r = m.goals.find(function (x) { return x.id === g.id; }) || {};
            var set = function (k) { return function (v) { api.setItem('goals', g.id, k, v); }; };
            var id = function (k) { return 'goal-' + k + '-' + g.id; };
            var st = r.status;
            return html`<div class="item" key=${g.id}>
              <div class="item-head">
                <span class="title">${g.name || 'Goal'}</span>
                ${st ? html`<${ui.Pill} status=${st.funded ? (st.from === 'cash' ? 'good' : 'warning') : 'critical'}>${st.funded ? 'Paid from ' + st.from + ' at ' + st.age : 'Not fully funded'}</${ui.Pill}>` : html`<${ui.Pill} status="neutral">After plan ends</${ui.Pill}>`}
                <${Remove} label=${g.name} onClick=${function () { api.removeItem('goals', g.id); }} />
              </div>
              <div class="fields tight">
                <${TF} label="Goal" id=${id('name')} value=${g.name} onChange=${set('name')} />
                <${NF} label="Cost in today's dollars" id=${id('amount')} value=${g.amount} hint=${r.repeat > 1 ? 'Per year' : ''} onChange=${set('amount')} />
                <${NF} label="In how many years" id=${id('years')} prefix="" suffix="years" value=${g.inYears} hint=${'At age ' + r.age} onChange=${set('inYears')} />
                <${NF} label="Repeat for" id=${id('repeat')} prefix="" suffix="years" value=${g.repeat} hint="e.g. 4 for university" onChange=${set('repeat')} />
              </div>
              <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
                <${ui.Check} label="Grow with inflation" id=${id('inflate')} checked=${g.inflate !== false} onChange=${set('inflate')} />
                <span class="small num">Future cost <b>${money(r.future)}</b> · set aside <b>${money(r.setAside)}</b>/mth${r.setAsideInvested ? html` (or ${money(r.setAsideInvested)} invested at ${pct(m.assumptions.preRetReturn)})` : ''}</span>
              </div>
            </div>`;
          })}
        </div>
        <div class="sticky">
          <${ui.Card} title="Monthly set-aside" class="raised" sub="Each goal's cost divided by the months to go. Included in cashflow.">
            <div class="figure-big">${money(total)}</div>
            <p class="small muted">${m.goals.length} goal${m.goals.length === 1 ? '' : 's'} · ${m.goals.filter(function (g) { return g.status && g.status.funded; }).length} funded on the timeline</p>
          </${ui.Card}>
          <${ui.Card} title="Future cost of each goal">
            <${charts.HBars} format=${money} items=${m.goals.map(function (g) { return { label: g.name + ' (age ' + g.age + ')', value: g.future }; })} empty="Add a goal to see its cost." />
          </${ui.Card}>
          <${ui.Card} title="Retirement" sub="Planned on its own page, with CPF LIFE payouts and retire-earlier options.">
            <button class="btn" onClick=${function () { props.go('retirement'); }}>Open retirement plan</button>
          </${ui.Card}>
        </div>
      </div>
    </div>`;
  };

  // ------------------------------------------------------------- retirement
  var INCOME_SERIES = [
    { key: 'payouts', label: 'CPF LIFE payouts', cls: 'fill-2', value: function (r) { return r.payouts; } },
    { key: 'fromSavings', label: 'From the nest egg', cls: 'fill-1', value: function (r) { return r.fromSavings; } },
  ];

  V.retirement = function (props) {
    var s = props.state, api = props.api, m = props.model, R = m.retirement, b = R.base, a = m.assumptions;
    var today = V.todayOn(s);
    var status = b.progress >= 1 ? 'good' : b.progress >= 0.7 ? 'warning' : 'critical';
    var client = m.people[0];
    var r = s.retirement || {};
    var mode = r.growth || 'inflation';
    var steps = Array.isArray(r.steps) && r.steps.length ? r.steps : CFG.spendingSteps;
    var unit = today ? 'today’s dollars' : 'future dollars';
    var atRet = function (v) { return today ? v / b.deflator : v; };
    var atAge = function (v, age) { return today ? v / Math.pow(1 + a.inflation, age - client.age) : v; };
    var incomeRows = (b.path || []).map(function (x) {
      return { age: x.age, t: x.age - client.age, spending: atAge(x.spending, x.age), payouts: atAge(Math.min(x.payouts, x.spending), x.age),
        fromSavings: atAge(Math.max(0, x.spending - x.payouts), x.age), rawPayouts: atAge(x.payouts, x.age), events: [] };
    });
    function setStep(i, key, v) {
      var next = steps.map(function (x) { return Object.assign({}, x); });
      next[i][key] = v;
      api.set('retirement.steps', next);
    }
    return html`<div class="page">
      <${ui.PageHead} eyebrow="Step 7 of 8" title="Retirement"
        lede="The nest egg needed at retirement, what the plan builds by then, and what closes the gap."
        tools=${html`<${V.DollarToggle} state=${s} api=${api} />`} />
      <div class="split">
        <div class="stack">
          <${ui.Card} title="Retirement plan">
            <div class="fields">
              ${m.people.map(function (p) {
                return html`<${NF} label=${p.name + ' retires at'} path=${'people.' + p.key + '.retireAge'} prefix="" suffix="years" value=${s.people[p.key].retireAge} onChange=${function (v) { api.set('people.' + p.key + '.retireAge', v); }} />`;
              })}
              <${NF} label="Household spending in retirement" path="retirement.monthlySpending" allowBlank placeholder=${String(Math.round(m.cashflow.livingExpenses))} suffix="/mth"
                prefix="S$" value=${r.monthlySpending} hint="Today's dollars. Blank uses current spending." onChange=${function (v) { api.set('retirement.monthlySpending', v); }} />
            </div>
          </${ui.Card}>

          <${ui.Card} title="How spending changes in retirement" sub="Most retirees spend less in real terms as the years go on. Choose how the plan grows spending after retirement.">
            <${ui.Seg} label="Spending growth" value=${mode} onChange=${function (v) { api.set('retirement.growth', v); }}
              options=${[
                { value: 'inflation', label: 'With inflation (' + pct(a.inflation, 1) + ')', title: 'Spending keeps its buying power' },
                { value: 'custom', label: 'Custom rate', title: 'Grow spending at a rate you choose, for example 2.5%' },
                { value: 'flat', label: 'Flat', title: 'The same dollar amount every year' },
              ]} />
            ${mode === 'custom' && html`<div class="fields"><${NF} label="Yearly growth in retirement" path="retirement.growthRate" percent value=${r.growthRate === undefined || r.growthRate === '' ? 0.025 : r.growthRate}
              hint=${'Below ' + pct(a.inflation, 1) + ' means spending slowly loses buying power'} onChange=${function (v) { api.set('retirement.growthRate', v); }} /></div>`}
            <${ui.Check} label="Spend less in later years" path="retirement.stepDown" checked=${!!r.stepDown} onChange=${function (v) { api.set('retirement.stepDown', v); if (v && !(r.steps && r.steps.length)) api.set('retirement.steps', CFG.spendingSteps.map(function (x) { return Object.assign({}, x); })); }} />
            ${r.stepDown && html`<div class="stack" style="gap:8px">
              ${steps.map(function (st, i) {
                return html`<div class="fields tight">
                  <${NF} label=${'Step ' + (i + 1) + ': from age'} id=${'step-age-' + i} prefix="" suffix="years" value=${st.age} onChange=${function (v) { setStep(i, 'age', v); }} />
                  <${NF} label="Spend" id=${'step-share-' + i} percent value=${st.share} hint="of the planned amount" onChange=${function (v) { setStep(i, 'share', v); }} />
                </div>`;
              })}
              <p class="small muted">Research on retiree spending finds real spending falls about 20 to 26% by the mid-80s as travel and activities slow.</p>
            </div>`}
          </${ui.Card}>

          <${ui.Card} title="CPF LIFE plan" sub="The plan sets how payouts behave: level, rising 2% a year, or lower with a bigger bequest.">
            ${m.people.map(function (p) {
              var c = (s.cpf || {})[p.key] || {};
              var po = R.payouts.find(function (x) { return x.key === p.key; });
              return html`<div class="field">
                <span class="label">${p.name}${po && po.monthly ? ' · from age ' + (po.from - client.age + p.age) + ': ' + money(atAge(po.monthly, po.from)) + '/mth in ' + unit : ''}</span>
                <${ui.Seg} label=${p.name + ' CPF LIFE plan'} value=${c.lifePlan || 'standard'}
                  options=${Object.keys(CFG.cpf.lifePlans).map(function (k) { var lp = CFG.cpf.lifePlans[k]; return { value: k, label: lp.label, title: lp.note }; })}
                  onChange=${function (v) { api.set('cpf.' + p.key + '.lifePlan', v); }} />
                <span class="hint">${calc.lifePlan(c.lifePlan).note}</span>
                <div class="fields tight" style="margin-top:6px"><${NF} label="Payouts start at" id=${'ret-start-' + p.key} prefix="" suffix="years" value=${c.payoutStart === undefined ? 65 : c.payoutStart}
                  hint="65 to 70; up to 7% more a year deferred" onChange=${function (v) { api.set('cpf.' + p.key + '.payoutStart', v); }} /></div>
              </div>`;
            })}
          </${ui.Card}>

          <${ui.Card} title="Retirement income each year" sub=${'Spending (line) against what CPF LIFE pays and what the nest egg must cover, in ' + unit + '.'}>
            <div class="legend"><span><i class="s2" />CPF LIFE payouts</span><span><i class="s1" />From the nest egg</span><span><i class="line" />Planned spending</span></div>
            ${incomeRows.length ? html`<${charts.StackedColumns} label="Retirement spending and income by age" rows=${incomeRows} series=${INCOME_SERIES} height=${280}
              baseline=${function (x) { return x.spending; }}
              tooltip=${function (x) {
                return html`<div><div class="tt-head">${client.name}, age ${x.age}</div>
                  <div class="tt-row"><i class="key ink" /><span>Planned spending</span><b>${money(x.spending)}</b></div>
                  <div class="tt-row"><i class="key s2" /><span>CPF LIFE</span><b>${money(x.rawPayouts)}</b></div>
                  <div class="tt-row"><i class="key s1" /><span>From the nest egg</span><b>${money(x.fromSavings)}</b></div>
                  <div class="tt-sep" /><div class="tt-note">A year, in ${unit}</div></div>`;
              }} />` : html`<p class="muted">Set a retirement age before the end of the plan to see this.</p>`}
          </${ui.Card}>

          <${ui.Card} title="Start investing now" sub=${b.gap > 0 ? 'Extra monthly investment that closes the ' + money(atRet(b.gap)) + ' gap by ' + b.retireAge + ', at typical returns for each kind of investment.' : ''}>
            ${b.gap <= 0 && html`<p>No extra investing needed. By ${b.retireAge} the plan provides ${money(atRet(b.projected))} against ${money(atRet(b.target))} needed (${unit}).</p>`}
            ${b.gap > 0 && html`<div class="table-wrap"><table class="data">
              <thead><tr><th>Where you invest</th><th class="n">Assumed return</th><th class="n">Extra each month</th></tr></thead>
              <tbody>${R.strategies.map(function (x) { return html`<tr><td>${x.name}</td><td class="n">${pct(x.rate, 2)}</td><td class="n"><b>${x.monthly === null ? '–' : money(x.monthly)}</b></td></tr>`; })}</tbody>
            </table></div>`}
            ${R.delays.length > 1 && b.gap > 0 && html`<div>
              <div class="section-title" style="margin-bottom:6px">Cost of waiting (at ${pct(a.preRetReturn)})</div>
              <${charts.Columns} label="Extra monthly investment needed by start delay" format=${compact}
                items=${R.delays.map(function (d) { return { label: d.delay === 0 ? 'Start now' : 'In ' + d.delay + ' yr' + (d.delay > 1 ? 's' : ''), value: d.monthly }; })} />
            </div>`}
          </${ui.Card}>

          <${ui.Card} title="Retire earlier or later" sub=${'Each option is recalculated with the full timeline. Amounts in ' + unit + ' at that retirement age.'}>
            <div class="table-wrap"><table class="data compact">
              <thead><tr><th class="n">Retire at</th><th class="n">Needed</th><th class="n">Plan provides</th><th>Funded</th><th class="n">Extra / mth</th><th>Money lasts</th></tr></thead>
              <tbody>${R.alternatives.map(function (x) {
                var st = x.progress >= 1 ? 'good' : x.progress >= 0.7 ? 'warning' : 'critical';
                var d = today ? x.deflator : 1;
                return html`<tr style=${x.retireAge === b.retireAge ? 'font-weight:650' : ''}><td class="n">${x.retireAge}${x.retireAge === b.retireAge ? ' (plan)' : ''}</td><td class="n">${compact(x.target / d)}</td><td class="n">${compact(x.projected / d)}</td>
                  <td><${ui.Pill} status=${st}>${pct(Math.min(x.progress, 9.99))}</${ui.Pill}></td><td class="n">${money(x.extraMonthly)}</td><td style="white-space:nowrap">${x.shortfallAge === null ? 'Whole plan' : 'To age ' + x.shortfallAge}</td></tr>`;
              })}</tbody>
            </table></div>
          </${ui.Card}>
        </div>
        <div class="sticky">
          <${ui.Card} title="Retirement readiness" class="raised">
            <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap">
              <div class="figure-big">${b.target > 0 ? pct(Math.min(b.progress, 9.99)) : '–'}</div>
              <${ui.Pill} status=${b.target > 0 ? status : 'warning'}>${b.target <= 0 ? 'Set spending' : b.progress >= 1 ? 'Fully funded' : 'Gap of ' + compact(atRet(b.gap))}</${ui.Pill}>
            </div>
            <${ui.Meter} value=${b.progress} status=${status} label="Retirement readiness" />
            <dl class="kv">
              <dt>Cash at ${b.retireAge}</dt><dd>${money(atRet(b.resources.cash))}</dd>
              <dt>Investments at ${b.retireAge}</dt><dd>${money(atRet(b.resources.investments))}</dd>
              <dt>CPF OA at ${b.retireAge}</dt><dd>${money(atRet(b.resources.cpfOa))}</dd>
              <dt class="total">Plan provides</dt><dd class="total">${money(atRet(b.projected))}</dd>
              <dt>Nest egg needed</dt><dd>${money(atRet(b.target))}</dd>
              <dt>Extra investing to close the gap</dt><dd>${money(b.extraMonthly)}/mth</dd>
            </dl>
            <p class="small muted">In ${unit}${today ? ' (' + money(b.target) + ' needed in future dollars)' : ''}.</p>
          </${ui.Card}>
          <${ui.Card} title="How the target is worked out" sub=${'From ' + client.name + '’s retirement at ' + b.retireAge + ' to age ' + R.horizonAge + ', with the fund earning ' + pct(a.postRetReturn, 1) + ' a year.'}>
            <dl class="kv">
              <dt>Spending in today's dollars</dt><dd>${money(R.monthlySpending)}/mth</dd>
              <dt>Spending in the first year of retirement</dt><dd>${money(atRet(b.firstYearSpending) / 12)}/mth</dd>
              <dt>After retirement, spending</dt><dd>${mode === 'flat' ? 'stays flat' : 'grows ' + pct(R.pattern.growth, 1) + ' a year'}</dd>
              ${R.pattern.steps.map(function (st) { return html`<dt>From age ${st.age}</dt><dd>${pct(st.share)} of plan</dd>`; })}
              ${R.payouts.map(function (p) { return html`<dt>${p.name}'s CPF LIFE (${p.plan})</dt><dd>${p.monthly ? '−' + money(atAge(p.monthly, p.from)) + '/mth' : '–'}</dd>`; })}
              <dt class="total">Nest egg needed at ${b.retireAge}</dt><dd class="total">${money(atRet(b.target))}</dd>
            </dl>
          </${ui.Card}>
          <${ui.Card} title="If I invest more each month" sub=${'Invested at ' + pct(a.preRetReturn) + ' until ' + b.retireAge + '.'}>
            <${NF} label="Extra monthly investment" path="retirement.extraMonthly" value=${r.extraMonthly} onChange=${function (v) { api.set('retirement.extraMonthly', v); }} />
            <dl class="kv">
              <dt>Grows to</dt><dd>${money(atRet(R.whatIf.fv))}</dd>
              <dt>Readiness with it</dt><dd>${pct(Math.min(R.whatIf.progress, 9.99))}</dd>
            </dl>
          </${ui.Card}>
        </div>
      </div>
    </div>`;
  };

  // -------------------------------------------------------------------- tax
  V.tax = function (props) {
    var s = props.state, api = props.api, m = props.model, a = m.assumptions;
    function personTax(key) {
      var pp = m.cashflow.perPerson.find(function (x) { return x.key === key; });
      var t = pp.y.tax, base = 'tax.' + key + '.';
      var tin = ((s.tax || {})[key]) || { reliefs: {} };
      var reliefs = tin.reliefs || {};
      return html`<${ui.Card} title=${personName(s, key)} sub="Employment income, CPF relief and earned income relief are filled in from cashflow.">
        <div class="fields tight">
          <${NF} label="Employment expenses" path=${base + 'employmentExpenses'} value=${tin.employmentExpenses} onChange=${function (v) { api.set(base + 'employmentExpenses', v); }} />
          <${NF} label="Approved donations" path=${base + 'donations'} value=${tin.donations} hint="Deduction amount" onChange=${function (v) { api.set(base + 'donations', v); }} />
          <${NF} label="Parenthood tax rebate" path=${base + 'ptr'} value=${tin.ptr} hint="Balance available" onChange=${function (v) { api.set(base + 'ptr', v); }} />
        </div>
        <details>
          <summary class="btn ghost sm" style="display:inline-flex">Personal reliefs (${money(t.otherReliefs)})</summary>
          <div class="fields tight" style="margin-top:10px">${calc.TAX_RELIEFS.map(function (r) {
            return html`<${NF} label=${r.label} path=${base + 'reliefs.' + r.id} value=${reliefs[r.id]} onChange=${function (v) { api.set(base + 'reliefs.' + r.id, v); }} />`;
          })}</div>
        </details>
        <div class="table-wrap"><table class="data compact">
          <tbody>
            <tr><td class="label">Employment income</td><td class="n">${money(t.employment)}</td></tr>
            <tr><td class="label">Less employment expenses</td><td class="n">${money(-(t.employment - t.netEmployment))}</td></tr>
            <tr><td class="label">Trade, business or profession</td><td class="n">${money(t.trade)}</td></tr>
            <tr><td class="label">Rent and other income</td><td class="n">${money(t.other)}</td></tr>
            <tr class="total"><td>Total income</td><td class="n">${money(t.totalIncome)}</td></tr>
            <tr><td class="label">Less approved donations</td><td class="n">${money(-t.donations)}</td></tr>
            <tr class="total"><td>Assessable income</td><td class="n">${money(t.assessable)}</td></tr>
            <tr><td class="label">Earned income relief</td><td class="n">${money(-t.eir)}</td></tr>
            <tr><td class="label">CPF relief</td><td class="n">${money(-t.cpfRelief)}</td></tr>
            <tr><td class="label">Other personal reliefs</td><td class="n">${money(-t.otherReliefs)}</td></tr>
            ${t.totalReliefs > t.cappedReliefs && html`<tr><td class="label">Relief cap applied (S$80,000)</td><td class="n">${money(t.totalReliefs - t.cappedReliefs)}</td></tr>`}
            <tr class="total"><td>Chargeable income</td><td class="n">${money(t.chargeable)}</td></tr>
            ${t.parts.filter(function (p) { return p.tax > 0; }).map(function (p) { return html`<tr><td class="label small">${money(p.from)} to ${money(p.to)} at ${pct(p.rate, 1)}</td><td class="n small">${money(p.tax)}</td></tr>`; })}
            <tr><td class="label">Tax on chargeable income</td><td class="n">${money(t.grossTax)}</td></tr>
            <tr><td class="label">Less personal income tax rebate</td><td class="n">${money(-t.rebate)}</td></tr>
            <tr><td class="label">Less parenthood tax rebate</td><td class="n">${money(-t.ptr)}</td></tr>
            <tr class="total"><td>Net tax payable</td><td class="n">${money(t.net)}</td></tr>
          </tbody>
        </table></div>
        <p class="small muted">Effective rate ${pct(t.effective, 1)} · marginal rate ${pct(t.marginal, 1)}. SG dividends and bank interest are tax-exempt and left out.</p>
      </${ui.Card}>`;
    }
    return html`<div class="page">
      <${ui.PageHead} eyebrow="Step 8 of 8" title="Income tax" lede=${'Singapore resident tax. ' + CFG.tax.label + '. Net tax feeds cashflow as a fixed expense.'} />
      <div class=${'grid ' + (s.hasSpouse ? 'cols-2' : '')}>${personKeys(s).map(personTax)}</div>
      <div class="grid cols-2">
        <${ui.Card} title="Personal income tax rebate" sub="Set by each year's Budget. YA2024 was 50% capped at S$200. Set 0% for years with no rebate.">
          <div class="fields">
            <${NF} label="Rebate" path="assumptions.taxRebate.rate" percent value=${a.taxRebate.rate} onChange=${function (v) { api.set('assumptions.taxRebate.rate', v); }} />
            <${NF} label="Capped at" path="assumptions.taxRebate.cap" value=${a.taxRebate.cap} onChange=${function (v) { api.set('assumptions.taxRebate.cap', v); }} />
          </div>
        </${ui.Card}>
        <${ui.Card} title="Resident tax rates">
          <div class="table-wrap"><table class="data compact">
            <thead><tr><th>Chargeable income</th><th class="n">Rate</th><th class="n">Tax on the band</th></tr></thead>
            <tbody>${CFG.tax.brackets.map(function (b, i, arr) {
              var next = arr[i + 1];
              return html`<tr><td>${next ? money(b.from) + ' to ' + money(next.from) : 'Above ' + money(b.from)}</td><td class="n">${pct(b.rate, 1)}</td><td class="n">${next ? money((next.from - b.from) * b.rate) : '–'}</td></tr>`;
            })}</tbody>
          </table></div>
        </${ui.Card}>
      </div>
    </div>`;
  };
})(window.FP = window.FP || {});
