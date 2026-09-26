/*
 * Planning engine. Pure functions only: state in, numbers out.
 *
 * Mirrors the Excel template's sheets (Cashflow Analysis, Financial Health
 * Check, CPF Estimator, Policy Summary, FIRE, Income Tax Calculator) and adds a
 * year-by-year household simulation for the life timeline and what-if
 * scenarios.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'));
  else (root.FP = root.FP || {}).calc = factory(root.FP.config);
})(typeof self !== 'undefined' ? self : this, function (CFG) {
  'use strict';

  // ---------------------------------------------------------------- catalogs

  var EXPENSE_CATEGORIES = ['Personal', 'Household', 'Transportation', "Children's education", 'Financial management'];

  var POLICY_TYPES = [
    { id: 'term', label: 'Term life', group: 'protection' },
    { id: 'wholelife', label: 'Whole life', group: 'protection' },
    { id: 'ci', label: 'Critical illness', group: 'protection' },
    { id: 'hospital', label: 'Hospitalisation (Integrated Shield)', group: 'protection' },
    { id: 'pa', label: 'Personal accident', group: 'protection' },
    { id: 'di', label: 'Disability income', group: 'protection' },
    { id: 'ltc', label: 'Long-term care', group: 'protection' },
    { id: 'endowment', label: 'Endowment / savings', group: 'savings' },
    { id: 'ilp', label: 'Investment-linked (ILP)', group: 'savings' },
    { id: 'annuity', label: 'Annuity / retirement income', group: 'savings' },
  ];

  var ASSET_CATEGORIES = [
    { id: 'cash', label: 'Cash & deposits' },
    { id: 'investment', label: 'Investments' },
    { id: 'property', label: 'Property' },
    { id: 'other', label: 'Other assets' },
  ];

  var LIABILITY_TYPES = [
    { id: 'mortgage', label: 'Home loan' },
    { id: 'car', label: 'Car loan' },
    { id: 'study', label: 'Study loan' },
    { id: 'personal', label: 'Personal loan' },
    { id: 'card', label: 'Credit card' },
    { id: 'other', label: 'Other' },
  ];

  var GOAL_TYPES = [
    { id: 'wedding', label: 'Wedding', amount: 30000, inYears: 3, repeat: 1 },
    { id: 'housing', label: 'Home down payment', amount: 80000, inYears: 4, repeat: 1 },
    { id: 'renovation', label: 'Renovation', amount: 50000, inYears: 5, repeat: 1 },
    { id: 'car', label: 'Car', amount: 120000, inYears: 5, repeat: 1 },
    { id: 'education', label: "Child's university", amount: 25000, inYears: 18, repeat: 4 },
    { id: 'travel', label: 'Travel', amount: 8000, inYears: 1, repeat: 1 },
    { id: 'other', label: 'Other goal', amount: 10000, inYears: 3, repeat: 1 },
  ];

  var TAX_RELIEFS = [
    { id: 'spouse', label: 'Spouse / handicapped spouse relief' },
    { id: 'child', label: 'Qualifying / handicapped child relief' },
    { id: 'wmcr', label: "Working mother's child relief" },
    { id: 'parent', label: 'Parent / handicapped parent relief' },
    { id: 'grandparent', label: 'Grandparent caregiver relief' },
    { id: 'sibling', label: 'Handicapped brother / sister relief' },
    { id: 'lifeIns', label: 'Life insurance relief' },
    { id: 'course', label: 'Course fees relief' },
    { id: 'cpfTopUp', label: 'CPF cash top-up relief' },
    { id: 'srs', label: 'SRS relief' },
    { id: 'nsman', label: 'NSman (self / wife / parent) relief' },
    { id: 'other', label: 'Other reliefs' },
  ];

  // ----------------------------------------------------------------- helpers

  function num(x, fallback) {
    var n = typeof x === 'string' ? parseFloat(x.replace(/[, ]/g, '')) : Number(x);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }
  function blank(x) { return x === '' || x === null || x === undefined; }
  function sum(arr, fn) { var s = 0; for (var i = 0; i < arr.length; i++) s += fn ? fn(arr[i], i) : arr[i]; return s; }
  function band(table, age) {
    for (var i = 0; i < table.length; i++) if (age <= table[i].maxAge) return table[i];
    return table[table.length - 1];
  }
  function roundTo(x, digits) { var m = Math.pow(10, digits || 0); return Math.round(x * m) / m; }
  function annual(amount, freq) { return freq === 'month' ? num(amount) * 12 : num(amount); }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function policyType(id) { return POLICY_TYPES.find(function (t) { return t.id === id; }) || POLICY_TYPES[0]; }
  function wardRank(id) { var w = CFG.wards.find(function (x) { return x.id === id; }); return w ? w.rank : 0; }
  function lifePlan(id) { return CFG.cpf.lifePlans[id] || CFG.cpf.lifePlans.standard; }
  // "You retire" but "Alex retires".
  function says(name, third, base) { return name + ' ' + (name === 'You' ? base : third); }

  // Excel-compatible time value of money. Signs follow Excel: money paid out
  // is negative.
  function PMT(rate, nper, pv, fv, type) {
    pv = pv || 0; fv = fv || 0; type = type || 0;
    if (nper <= 0) return 0;
    if (rate === 0) return -(pv + fv) / nper;
    var g = Math.pow(1 + rate, nper);
    return -(rate * (pv * g + fv)) / ((1 + rate * type) * (g - 1));
  }
  function FV(rate, nper, pmt, pv, type) {
    pv = pv || 0; type = type || 0;
    if (rate === 0) return -(pv + pmt * nper);
    var g = Math.pow(1 + rate, nper);
    return -(pv * g + pmt * (1 + rate * type) * (g - 1) / rate);
  }
  function PV(rate, nper, pmt, fv, type) {
    fv = fv || 0; type = type || 0;
    if (rate === 0) return -(fv + pmt * nper);
    var g = Math.pow(1 + rate, nper);
    return -(fv + pmt * (1 + rate * type) * (g - 1) / rate) / g;
  }

  // ------------------------------------------------------------------ people

  function assumptions(state) {
    var a = Object.assign({}, CFG.defaults, state.assumptions || {});
    a.allocation = Object.assign({}, CFG.defaults.allocation, (state.assumptions || {}).allocation || {});
    a.taxRebate = Object.assign({}, CFG.defaults.taxRebate, (state.assumptions || {}).taxRebate || {});
    return a;
  }

  function people(state) {
    var keys = state.hasSpouse ? ['client', 'spouse'] : ['client'];
    return keys.map(function (key) {
      var p = (state.people || {})[key] || {};
      var age = Math.round(num(p.age, 30));
      return {
        key: key,
        name: p.name || (key === 'client' ? 'You' : 'Spouse'),
        age: age,
        gender: p.gender === 'female' ? 'female' : 'male',
        retireAge: Math.round(num(p.retireAge, 63)),
        lifeExpectancy: Math.max(age + 1, Math.round(num(p.lifeExpectancy, 85))),
        income: Object.assign({ salary: 0, bonus: 0, business: 0, dividends: 0, interest: 0, rental: 0, others: 0 }, (state.income || {})[key] || {}),
        invest: num((state.investing || {})[key]),
        cpfIn: Object.assign({ oa: 0, sa: 0, ma: 0, ra: 0, retirementSum: 'FRS', careshieldSupplement: 0, lifeMonthly: 0, lifePlan: 'standard' }, (state.cpf || {})[key] || {}),
        taxIn: Object.assign({ employmentExpenses: 0, donations: 0, ptr: 0, reliefs: {} }, (state.tax || {})[key] || {}),
      };
    });
  }

  function ownedBy(key, owner) { return owner === key || owner === 'joint'; }
  function policiesOf(state, key) { return (state.policies || []).filter(function (p) { return (p.owner || 'client') === key; }); }
  function inForce(policy, age) { return blank(policy.coverUntil) || age < num(policy.coverUntil); }
  function premiumDue(policy, age) { return blank(policy.premiumUntil) || age < num(policy.premiumUntil); }

  // --------------------------------------------------------------------- tax

  function taxOnChargeable(chargeable) {
    var b = CFG.tax.brackets, tax = 0, marginal = 0, parts = [];
    for (var i = 0; i < b.length; i++) {
      var lo = b[i].from, hi = i + 1 < b.length ? b[i + 1].from : Infinity;
      if (chargeable <= lo) break;
      var slice = Math.min(chargeable, hi) - lo;
      tax += slice * b[i].rate;
      marginal = b[i].rate;
      parts.push({ from: lo, to: Math.min(chargeable, hi), rate: b[i].rate, tax: slice * b[i].rate });
    }
    return { tax: tax, marginal: marginal, parts: parts };
  }

  function earnedIncomeRelief(age, earned) {
    if (earned <= 0) return 0;
    return Math.min(band(CFG.tax.earnedIncomeRelief, age).amount, earned);
  }

  /*
   * Resident income tax, following the Income Tax Calculator sheet.
   * SG one-tier dividends and bank interest are tax-exempt for individuals,
   * so only rental, business and "others" income is added as other income.
   */
  function computeTax(input, rebate) {
    rebate = rebate || CFG.defaults.taxRebate;
    var employment = num(input.employment);
    var netEmployment = Math.max(0, employment - num(input.employmentExpenses));
    var trade = num(input.trade);
    var other = num(input.rental) + num(input.otherIncome);
    var totalIncome = netEmployment + trade + other;
    var assessable = Math.max(0, totalIncome - num(input.donations));
    var eir = blank(input.eir) ? earnedIncomeRelief(num(input.age, 30), netEmployment + trade) : num(input.eir);
    var cpfRelief = num(input.cpfRelief);
    var reliefs = input.reliefs || {};
    var otherReliefs = sum(Object.keys(reliefs), function (k) { return num(reliefs[k]); });
    var totalReliefs = eir + cpfRelief + otherReliefs;
    var cappedReliefs = Math.min(totalReliefs, CFG.tax.reliefCap);
    var chargeable = Math.max(0, assessable - cappedReliefs);
    var t = taxOnChargeable(chargeable);
    var rebateAmt = t.tax > 0 ? Math.min(t.tax * num(rebate.rate), num(rebate.cap)) : 0;
    var afterRebate = Math.max(0, t.tax - rebateAmt);
    var ptr = Math.min(num(input.ptr), afterRebate);
    var net = Math.max(0, afterRebate - ptr);
    return {
      employment: employment, netEmployment: netEmployment, trade: trade, other: other,
      totalIncome: totalIncome, donations: num(input.donations), assessable: assessable,
      eir: eir, cpfRelief: cpfRelief, otherReliefs: otherReliefs, totalReliefs: totalReliefs,
      cappedReliefs: cappedReliefs, chargeable: chargeable, grossTax: t.tax, parts: t.parts,
      marginal: t.marginal, rebate: rebateAmt, afterRebate: afterRebate, ptr: ptr, net: net,
      effective: totalIncome > 0 ? net / totalIncome : 0,
    };
  }

  // --------------------------------------------------------------------- CPF

  function cpfContribution(age, monthlyWage, annualBonus) {
    var c = CFG.cpf;
    var r = band(c.rates, age), al = band(c.allocation, age);
    var ow = Math.min(Math.max(0, num(monthlyWage)), c.owCeiling) * 12;
    var aw = Math.min(Math.max(0, num(annualBonus)), Math.max(0, c.annualCeiling - ow));
    var wages = ow + aw;
    var employee = wages * r.employee, employer = wages * r.employer, total = employee + employer;
    var share = al.oa + al.sa + al.ma;
    var oa = total * al.oa / share, sa = total * al.sa / share;
    return {
      ow: ow, aw: aw, wages: wages, employee: employee, employer: employer, total: total,
      oa: oa, sa: sa, ma: total - oa - sa, employeeRate: r.employee, employerRate: r.employer,
    };
  }

  function cohort(age0) {
    var c = CFG.cpf;
    var year55 = CFG.baseYear + (c.raAge - age0);
    var g = Math.pow(1 + c.retirementSumGrowth, year55 - CFG.baseYear);
    return {
      year55: year55,
      year65: CFG.baseYear + (c.payoutAge - age0),
      BRS: c.retirementSums.BRS * g, FRS: c.retirementSums.FRS * g, ERS: c.retirementSums.ERS * g,
    };
  }

  function bhsFor(age0, year) {
    var c = CFG.cpf, year65 = CFG.baseYear + (65 - age0);
    return c.bhs * Math.pow(1 + c.bhsGrowth, Math.min(year, year65) - CFG.baseYear);
  }

  function medisaveDeductions(p, age, year, hasIsp) {
    var c = CFG.cpf;
    var mshl = band(c.medishield, age).premium;
    var cs = c.careshield, csl = 0;
    if (age >= cs.fromAge && age < cs.toAge) {
      csl = cs[p.gender] * Math.pow(1 + cs.growth, Math.min(year, cs.growthUntilYear) - 2020) + num(p.cpfIn.careshieldSupplement);
    }
    var isp = hasIsp ? band(c.ispAwl, age).limit : 0;
    return { mshl: mshl, careshield: csl, isp: isp, total: mshl + csl + isp };
  }

  function initCpf(p) {
    var i = p.cpfIn;
    var s = {
      oa: num(i.oa), sa: num(i.sa), ma: num(i.ma), ra: num(i.ra),
      raFormed: false, annuitized: false, lifeMonthly: 0, raAt55: null, raAt65: null,
      sums: cohort(p.age), choice: CFG.cpf.retirementSums[i.retirementSum] ? i.retirementSum : 'FRS', closed: false,
      plan: lifePlan(i.lifePlan),
    };
    if (p.age >= CFG.cpf.raAge) { s.raFormed = true; s.ra += s.sa; s.sa = 0; s.raAt55 = s.ra; }
    if (p.age >= CFG.cpf.payoutAge) {
      s.annuitized = true;
      // A payout the member already receives is entered as-is; store it as the Standard equivalent.
      s.lifeMonthly = num(i.lifeMonthly) ? num(i.lifeMonthly) / s.plan.factor : s.ra * CFG.cpf.lifePayoutFactor;
      s.raAt65 = s.ra; s.ra = 0;
    }
    return s;
  }

  function cpfTotal(s) { return s.oa + s.sa + s.ma + s.ra; }
  // Monthly CPF LIFE payout at a given age under the member's plan.
  function lifePayoutAt(s, age) {
    return s.lifeMonthly * s.plan.factor * Math.pow(1 + s.plan.growth, Math.max(0, age - CFG.cpf.payoutAge));
  }

  /*
   * Advance one person's CPF by a year. Returns cash flows the household
   * must absorb (payouts in, shortfalls out).
   */
  function stepCpf(s, p, o) {
    var c = CFG.cpf, age = o.age, out = { payout: 0, cashOut: 0, events: [], medisave: 0, housing: 0 };

    if (!s.raFormed && age >= c.raAge) {
      var target = s.sums[s.choice];
      var fromSa = Math.min(s.sa, Math.max(0, target - s.ra));
      s.sa -= fromSa; s.ra += fromSa;
      var fromOa = Math.min(s.oa, Math.max(0, target - s.ra));
      s.oa -= fromOa; s.ra += fromOa;
      s.oa += s.sa; s.sa = 0;
      s.raFormed = true; s.raAt55 = s.ra;
      out.events.push('ra');
    }
    if (!s.annuitized && age >= c.payoutAge) {
      s.lifeMonthly = s.ra * c.lifePayoutFactor;
      s.raAt65 = s.ra; s.ra = 0; s.annuitized = true;
      out.events.push('life');
    }

    // Interest on opening balances, plus extra interest to SA / RA.
    var i = c.interest, x = c.extraInterest;
    var base = Math.min(x.cap, s.ra + Math.min(s.oa, x.oaCap) + s.sa + s.ma);
    var extra = base * x.rate + (age >= c.raAge ? Math.min(x.seniorCap, base) * x.seniorRate : 0);
    s.oa += s.oa * i.oa; s.sa += s.sa * i.sa; s.ma += s.ma * i.ma; s.ra += s.ra * i.ra;
    if (age < c.raAge) s.sa += extra; else if (!s.annuitized) s.ra += extra; else s.oa += extra;

    if (o.contrib) {
      s.oa += o.contrib.oa; s.ma += o.contrib.ma;
      if (age < c.raAge) s.sa += o.contrib.sa;
      else if (!s.annuitized && s.ra < s.sums.ERS) s.ra += o.contrib.sa;
      else s.oa += o.contrib.sa;
    }

    var ded = o.medisave || 0, paidMa = Math.min(s.ma, ded);
    s.ma -= paidMa; out.medisave = paidMa; out.cashOut += ded - paidMa;

    var hous = o.housing || 0, paidOa = Math.min(s.oa, hous);
    s.oa -= paidOa; out.housing = paidOa; out.cashOut += hous - paidOa;

    var cap = bhsFor(p.age, o.year);
    if (s.ma > cap) {
      var over = s.ma - cap; s.ma = cap;
      if (age < c.raAge) s.sa += over;
      else if (!s.annuitized && s.ra < s.sums.FRS) s.ra += over;
      else s.oa += over;
    }

    if (s.annuitized && o.alive) out.payout = lifePayoutAt(s, age) * 12;
    return out;
  }

  // ---------------------------------------------------------------- cashflow

  function personYearIncome(p, a, age, t, working) {
    var g = Math.pow(1 + a.salaryGrowth, t);
    var inc = p.income;
    var salary = working ? num(inc.salary) * g : 0;
    var bonus = working ? num(inc.bonus) * g : 0;
    var business = working ? num(inc.business) * 12 : 0;
    var passive = (num(inc.dividends) + num(inc.interest) + num(inc.rental) + num(inc.others)) * 12;
    var cpf = cpfContribution(age, salary, bonus);
    var tax = computeTax({
      employment: salary * 12 + bonus, employmentExpenses: working ? p.taxIn.employmentExpenses : 0,
      trade: business, rental: num(inc.rental) * 12, otherIncome: num(inc.others) * 12,
      donations: p.taxIn.donations, cpfRelief: cpf.employee, reliefs: p.taxIn.reliefs, ptr: p.taxIn.ptr, age: age,
    }, a.taxRebate);
    var gross = salary * 12 + bonus;
    return {
      gross: gross, business: business, passive: passive, cpf: cpf, tax: tax,
      takeHome: gross - cpf.employee + business + passive,
    };
  }

  function goalSchedule(goal, inflation) {
    var years = Math.max(0, Math.round(num(goal.inYears))), repeat = Math.max(1, Math.round(num(goal.repeat, 1)));
    var out = [];
    for (var k = 0; k < repeat; k++) {
      var t = years + k;
      out.push({ t: t, amount: num(goal.amount) * (goal.inflate === false ? 1 : Math.pow(1 + inflation, t)) });
    }
    return out;
  }

  function goalSetAside(goal, inflation) {
    var years = Math.max(0, Math.round(num(goal.inYears)));
    if (years <= 0) return 0;
    var total = sum(goalSchedule(goal, inflation), function (x) { return x.amount; });
    return total / years / 12;
  }

  // Monthly retirement spending in today's dollars. Falls back to current
  // living expenses when the user has not set one.
  function retirementSpending(state) {
    var r = state.retirement || {};
    if (!blank(r.monthlySpending)) return num(r.monthlySpending);
    return sum(state.expenses || [], function (e) { return annual(e.amount, e.freq); }) / 12;
  }

  /*
   * How retirement spending changes after retirement: grow with inflation, at
   * a custom rate, or stay flat; optionally step down in later years.
   */
  function spendingPattern(state) {
    var a = assumptions(state), r = state.retirement || {};
    var growth = r.growth === 'flat' ? 0 : r.growth === 'custom' ? num(r.growthRate, CFG.defaults.retirementGrowth) : a.inflation;
    var steps = r.stepDown ? (Array.isArray(r.steps) && r.steps.length ? r.steps : CFG.spendingSteps)
      .map(function (x) { return { age: Math.round(num(x.age)), share: clamp(num(x.share, 1), 0, 2) }; })
      .sort(function (x, y) { return x.age - y.age; }) : [];
    return { mode: r.growth || 'inflation', growth: growth, steps: steps };
  }
  function stepShare(steps, age) {
    var share = 1;
    (steps || []).forEach(function (x) { if (age >= x.age) share = x.share; });
    return share;
  }

  function cashflowAnalysis(state) {
    var a = assumptions(state), ps = people(state);
    var perPerson = ps.map(function (p) {
      var working = p.age < p.retireAge;
      var y = personYearIncome(p, a, p.age, 0, working);
      return { key: p.key, name: p.name, working: working, salary: working ? num(p.income.salary) : 0, bonus: working ? num(p.income.bonus) : 0, y: y };
    });
    var takeHome = sum(perPerson, function (x) { return x.y.takeHome; }) / 12;
    var gross = sum(perPerson, function (x) { return x.y.gross + x.y.business + x.y.passive; }) / 12;

    var items = (state.expenses || []).map(function (e) {
      return { id: e.id, name: e.name, category: e.category, kind: e.kind === 'variable' ? 'variable' : 'fixed', monthly: annual(e.amount, e.freq) / 12 };
    });
    var taxMonthly = sum(perPerson, function (x) { return x.y.tax.net; }) / 12;
    var loans = (state.liabilities || []).filter(function (l) { return num(l.yearsLeft, 1) > 0; });
    var loanCash = sum(loans, function (l) { return Math.max(0, num(l.monthly) - (l.type === 'mortgage' ? num(l.cpfMonthly) : 0)); });
    var loanCpf = sum(loans, function (l) { return l.type === 'mortgage' ? Math.min(num(l.cpfMonthly), num(l.monthly)) : 0; });
    var clientAges = {}; ps.forEach(function (p) { clientAges[p.key] = p.age; });
    var activePolicies = (state.policies || []).filter(function (pol) {
      var age = clientAges[pol.owner || 'client'];
      return age !== undefined && premiumDue(pol, age);
    });
    var protectionPrem = sum(activePolicies.filter(function (p) { return policyType(p.type).group === 'protection'; }), function (p) { return annual(p.premium, p.freq); }) / 12;
    var savingsPrem = sum(activePolicies.filter(function (p) { return policyType(p.type).group === 'savings'; }), function (p) { return annual(p.premium, p.freq); }) / 12;
    var investing = sum(ps, function (p) { return p.age < p.retireAge ? p.invest : 0; });
    var goalsMonthly = sum(state.goals || [], function (g) { return goalSetAside(g, a.inflation); });

    var fixedItems = sum(items.filter(function (i) { return i.kind === 'fixed'; }), function (i) { return i.monthly; });
    var variable = sum(items.filter(function (i) { return i.kind === 'variable'; }), function (i) { return i.monthly; });
    var fixed = fixedItems + taxMonthly + loanCash;
    var savings = investing + savingsPrem;
    var buckets = [
      { id: 'fixed', label: 'Fixed expenses', amount: fixed, target: a.allocation.fixed },
      { id: 'variable', label: 'Variable expenses', amount: variable, target: a.allocation.variable },
      { id: 'savings', label: 'Savings & investments', amount: savings, target: a.allocation.savings },
      { id: 'insurance', label: 'Insurance', amount: protectionPrem, target: a.allocation.insurance },
    ];
    buckets.forEach(function (b) { b.share = takeHome > 0 ? b.amount / takeHome : 0; b.recommended = takeHome * b.target; });
    var outflow = fixed + variable + savings + protectionPrem + goalsMonthly;

    var byCategory = EXPENSE_CATEGORIES.map(function (c) {
      var list = items.filter(function (i) { return i.category === c; });
      var extra = 0;
      if (c === 'Financial management') extra = taxMonthly + loanCash + protectionPrem + savingsPrem;
      return { category: c, amount: sum(list, function (i) { return i.monthly; }) + extra };
    });

    return {
      perPerson: perPerson, takeHome: takeHome, gross: gross, items: items, byCategory: byCategory,
      taxMonthly: taxMonthly, loanCash: loanCash, loanCpf: loanCpf, loanTotal: loanCash + loanCpf,
      protectionPrem: protectionPrem, savingsPrem: savingsPrem, investing: investing, goalsMonthly: goalsMonthly,
      fixed: fixed, variable: variable, savings: savings, buckets: buckets,
      livingExpenses: fixedItems + variable, // excludes tax, loans, premiums
      essentialMonthly: fixed + variable + protectionPrem,
      outflow: outflow, surplus: takeHome - outflow,
    };
  }

  // --------------------------------------------------------------- net worth

  function netWorth(state) {
    var ps = people(state);
    var assets = state.assets || [];
    var cats = ASSET_CATEGORIES.map(function (c) {
      return { id: c.id, label: c.label, amount: sum(assets.filter(function (x) { return x.category === c.id; }), function (x) { return num(x.value); }) };
    });
    var cashValue = sum(state.policies || [], function (p) { return num(p.cashValue); });
    cats.push({ id: 'insurance', label: 'Insurance cash value', amount: cashValue });
    var cpfBy = ps.map(function (p) { var i = p.cpfIn; return { key: p.key, name: p.name, amount: num(i.oa) + num(i.sa) + num(i.ma) + num(i.ra) }; });
    var cpf = sum(cpfBy, function (x) { return x.amount; });
    cats.push({ id: 'cpf', label: 'CPF balances', amount: cpf });
    var totalAssets = sum(cats, function (c) { return c.amount; });
    var liabs = (state.liabilities || []).map(function (l) {
      var t = LIABILITY_TYPES.find(function (x) { return x.id === l.type; }) || LIABILITY_TYPES[5];
      return { id: l.id, label: l.name || t.label, type: t.label, amount: num(l.balance) };
    });
    var totalLiabilities = sum(liabs, function (l) { return l.amount; });
    var nw = totalAssets - totalLiabilities;
    return {
      categories: cats, cpfBy: cpfBy, liabilities: liabs, totalAssets: totalAssets, totalLiabilities: totalLiabilities,
      netWorth: nw, liquid: cats[0].amount, investments: cats[1].amount, cpf: cpf,
      solvency: totalAssets > 0 ? nw / totalAssets : 0,
    };
  }

  // -------------------------------------------------------------- protection

  /*
   * Detailed (needs-based) cover, the way a planner builds it up item by
   * item. Every item has a default drawn from the plan or from Singapore cost
   * data (see config.needs); the user can switch items off or change them.
   * Amounts are in today's dollars and assume the payout is invested to keep
   * pace with inflation, so monthly x duration is the lump sum needed.
   */
  var NEED_ITEMS = {
    death: [
      { id: 'support', label: 'Living support for the family', kind: 'monthly', unit: 'years' },
      { id: 'mortgage', label: 'Home loan to clear', kind: 'amount' },
      { id: 'debts', label: 'Other debts to clear', kind: 'amount' },
      { id: 'education', label: "Children's education fund", kind: 'amount' },
      { id: 'final', label: 'Funeral and estate costs', kind: 'amount' },
    ],
    tpd: [
      { id: 'income', label: 'Income until retirement', kind: 'monthly', unit: 'years' },
      { id: 'care', label: 'Long-term care after CareShield Life', kind: 'monthly', unit: 'years' },
      { id: 'homeMod', label: 'Home modification and equipment', kind: 'amount' },
      { id: 'mortgage', label: 'Home loan to clear', kind: 'amount' },
      { id: 'debts', label: 'Other debts to clear', kind: 'amount' },
    ],
    ci: [
      { id: 'income', label: 'Income while recovering', kind: 'monthly', unit: 'months' },
      { id: 'rehab', label: 'Rehab, therapy and home nursing', kind: 'monthly', unit: 'months' },
      { id: 'treatment', label: 'Treatment the hospital plan does not pay', kind: 'amount' },
      { id: 'cpfLoan', label: 'Home loan share normally paid by CPF', kind: 'monthly', unit: 'months' },
      { id: 'lifestyle', label: 'Rest, recuperation and family time', kind: 'amount' },
    ],
  };
  var NEED_RISKS = [
    { id: 'death', label: 'Death' },
    { id: 'tpd', label: 'Total & permanent disability' },
    { id: 'ci', label: 'Critical illness' },
  ];

  function round100(x) { return Math.round(x / 100) * 100; }

  function needDefaults(state, p, y) {
    var N = CFG.needs, a = assumptions(state), ps = people(state);
    var liabs = (state.liabilities || []).filter(function (l) { return num(l.yearsLeft, 1) > 0; });
    var share = function (l) { return l.owner === 'joint' ? 1 : ((l.owner || 'client') === p.key ? 1 : 0); };
    var mortgage = sum(liabs.filter(function (l) { return l.type === 'mortgage'; }), function (l) { return num(l.balance) * share(l); });
    var debts = sum(liabs.filter(function (l) { return l.type !== 'mortgage'; }), function (l) { return num(l.balance) * share(l); });
    var cpfLoan = sum(liabs.filter(function (l) { return l.type === 'mortgage' && ownedBy(p.key, l.owner || 'client'); }), function (l) {
      return Math.min(num(l.cpfMonthly), num(l.monthly)) * (l.owner === 'joint' && ps.length > 1 ? 0.5 : 1);
    });
    var education = sum((state.goals || []).filter(function (g) { return g.type === 'education'; }), function (g) {
      return sum(goalSchedule(g, a.inflation), function (x) { return x.amount; });
    });
    var takeHome = round100(y.takeHome / 12);
    var care = round100(Math.max(0, N.careMonthly - CFG.cpf.careShieldPayout));
    var toRetire = Math.max(0, p.retireAge - p.age);
    return {
      death: {
        support: { monthly: takeHome, duration: N.supportYears, note: 'Your take-home pay for ' + N.supportYears + ' years' },
        mortgage: { amount: mortgage, note: mortgage ? 'Outstanding home loans' : 'No home loan recorded' },
        debts: { amount: debts, note: debts ? 'Car, study and other loans' : 'No other loans recorded' },
        education: { amount: Math.round(education), note: education ? 'From education goals' : 'Add a university goal to fill this' },
        final: { amount: N.finalExpenses, note: 'Typical funeral packages cost S$5,500 to S$15,000' },
      },
      tpd: {
        income: { monthly: takeHome, duration: toRetire, note: 'Take-home pay until retirement at ' + p.retireAge },
        care: { monthly: care, duration: N.careYears, note: 'S$' + N.careMonthly.toLocaleString('en-SG') + ' a month of care, less S$' + CFG.cpf.careShieldPayout + ' from CareShield Life' },
        homeMod: { amount: N.homeModification, note: 'Ramps, bathroom changes, wheelchair' },
        mortgage: { amount: mortgage, note: mortgage ? 'Outstanding home loans' : 'No home loan recorded' },
        debts: { amount: debts, note: debts ? 'Car, study and other loans' : 'No other loans recorded' },
      },
      ci: {
        income: { monthly: takeHome, duration: N.ciRecoveryMonths, note: 'Average recovery takes ' + N.ciRecoveryMonths + ' months' },
        rehab: { monthly: N.rehabMonthly, duration: N.rehabMonths, note: 'Average rehab and therapy cost S$' + N.rehabMonthly.toLocaleString('en-SG') + ' a month' },
        treatment: { amount: N.ciTreatmentGap, note: 'Drugs outside the Cancer Drug List and rider co-payments (up to S$6,000 a year)' },
        cpfLoan: { monthly: round100(cpfLoan), duration: N.ciRecoveryMonths, note: cpfLoan ? 'CPF contributions stop while you are not working' : 'No home loan paid from CPF' },
        lifestyle: { amount: N.ciLifestyle, note: 'Trips, rest and time with family' },
      },
    };
  }

  function coverNeeds(state, p, y) {
    var cfg = ((state.needs || {})[p.key]) || {};
    var defs = needDefaults(state, p, y);
    var nw = (state.assets || []).filter(function (x) { return x.category === 'cash' || x.category === 'investment'; });
    var savings = sum(nw, function (x) { return num(x.value) * ((x.owner || 'client') === p.key ? 1 : x.owner === 'joint' ? 0.5 : 0); });
    var cpfBal = num(p.cpfIn.oa) + num(p.cpfIn.sa) + num(p.cpfIn.ma) + num(p.cpfIn.ra);
    var out = { method: cfg.method === 'needs' ? 'needs' : 'multiple' };
    NEED_RISKS.forEach(function (r) {
      var rc = cfg[r.id] || {};
      var items = NEED_ITEMS[r.id].map(function (it) {
        var d = defs[r.id][it.id], o = rc[it.id] || {};
        var on = o.on === undefined ? true : !!o.on;
        var monthly = blank(o.monthly) ? d.monthly : num(o.monthly);
        var duration = blank(o.duration) ? d.duration : num(o.duration);
        var amount = blank(o.amount) ? d.amount : num(o.amount);
        var total = it.kind === 'monthly' ? monthly * duration * (it.unit === 'years' ? 12 : 1) : amount;
        return {
          id: it.id, label: it.label, kind: it.kind, unit: it.unit, on: on,
          monthly: monthly, duration: duration, amount: amount, total: on ? Math.max(0, total) : 0,
          note: d.note, edited: !blank(o.monthly) || !blank(o.duration) || !blank(o.amount),
        };
      });
      var gross = sum(items, function (i) { return i.total; });
      var offsets = [];
      if (rc.offsetSavings) offsets.push({ id: 'savings', label: 'Less savings and investments', amount: savings });
      if (r.id === 'death' && rc.offsetCpf) offsets.push({ id: 'cpf', label: 'Less CPF paid to nominees', amount: cpfBal });
      var need = Math.max(0, gross - sum(offsets, function (x) { return x.amount; }));
      out[r.id] = { items: items, gross: gross, offsets: offsets, need: need, offsetSavings: !!rc.offsetSavings, offsetCpf: !!rc.offsetCpf, savings: savings, cpf: cpfBal };
    });
    return out;
  }

  function protectionAnalysis(state, cashflow) {
    var a = assumptions(state), ps = people(state);
    return ps.map(function (p) {
      var pp = cashflow.perPerson.find(function (x) { return x.key === p.key; });
      var y = pp.y;
      var basis = y.gross + y.cpf.employer + y.business + y.passive; // the template's "Total Income"
      var pols = policiesOf(state, p.key).filter(function (pol) { return inForce(pol, p.age); });
      var cur = {
        death: sum(pols, function (x) { return num(x.death); }),
        tpd: sum(pols, function (x) { return num(x.tpd); }),
        ci: sum(pols, function (x) { return num(x.ci); }),
        eci: sum(pols, function (x) { return num(x.eci); }),
        accident: sum(pols, function (x) { return num(x.accident); }),
        di: sum(pols, function (x) { return num(x.di); }),
        ward: pols.reduce(function (best, x) { return x.type === 'hospital' && wardRank(x.ward) > wardRank(best) ? x.ward : best; }, 'medishield'),
      };
      var rule = {
        death: roundTo(a.deathMultiple * basis, -3), tpd: roundTo(a.deathMultiple * basis, -3),
        ci: roundTo(a.ciMultiple * basis, -3),
      };
      var needs = coverNeeds(state, p, y);
      var detailed = { death: roundTo(needs.death.need, -3), tpd: roundTo(needs.tpd.need, -3), ci: roundTo(needs.ci.need, -3) };
      var base = needs.method === 'needs' ? detailed : rule;
      var target = { death: base.death, tpd: base.tpd, ci: base.ci, di: Math.round(a.diReplacement * basis / 12) };
      function row(id, label, unit) {
        var c = cur[id], t = target[id], ratio = t > 0 ? c / t : 1;
        return {
          id: id, label: label, unit: unit, current: c, target: t, gap: Math.max(0, t - c), ratio: ratio,
          status: t <= 0 ? 'good' : ratio >= 1 ? 'good' : ratio >= 0.5 ? 'warning' : 'critical',
        };
      }
      var rows = [
        row('death', 'Death', 'lump'),
        row('tpd', 'Total & permanent disability', 'lump'),
        row('ci', 'Critical illness', 'lump'),
        row('di', 'Disability income', 'month'),
      ];
      var wr = wardRank(cur.ward), tr = wardRank(a.targetWard);
      rows.push({ id: 'hospital', label: 'Hospitalisation', unit: 'ward', current: cur.ward, target: a.targetWard, status: wr >= tr ? 'good' : wr >= 2 ? 'warning' : 'critical' });
      rows.push({ id: 'pa', label: 'Personal accident', unit: 'flag', current: cur.accident > 0 || pols.some(function (x) { return x.type === 'pa'; }), target: true });
      rows[rows.length - 1].status = rows[rows.length - 1].current ? 'good' : 'warning';
      return { key: p.key, name: p.name, basis: basis, current: cur, target: target, rule: rule, detailed: detailed, method: needs.method, needs: needs, rows: rows, policies: pols };
    });
  }

  // -------------------------------------------------------------- simulation

  var SCENARIOS = [
    { id: 'none', label: 'Base plan' },
    { id: 'death', label: 'Death' },
    { id: 'tpd', label: 'Total & permanent disability' },
    { id: 'ci', label: 'Critical illness' },
    { id: 'disability', label: 'Disability (income stops)' },
  ];

  function scenarioDefaults(type) {
    switch (type) {
      case 'death': return { oneOff: 15000, annualExtra: 0, spendingChange: -0.2, recoveryYears: 0 };
      case 'tpd': return { oneOff: 20000, annualExtra: 12000, spendingChange: 0, recoveryYears: 0 };
      case 'ci': return { oneOff: 30000, annualExtra: 0, spendingChange: 0, recoveryYears: 3 };
      case 'disability': return { oneOff: 0, annualExtra: 6000, spendingChange: 0, recoveryYears: 0 };
      default: return { oneOff: 0, annualExtra: 0, spendingChange: 0, recoveryYears: 0 };
    }
  }

  function normalizeScenario(sc, ps) {
    sc = sc || {};
    var type = SCENARIOS.some(function (s) { return s.id === sc.type; }) ? sc.type : 'none';
    var who = ps.some(function (p) { return p.key === sc.who; }) ? sc.who : 'client';
    var p = ps.find(function (x) { return x.key === who; });
    var d = scenarioDefaults(type);
    return {
      type: type, who: who,
      age: clamp(Math.round(num(sc.age, p.age + 10)), p.age, p.lifeExpectancy - 1),
      oneOff: blank(sc.oneOff) ? d.oneOff : num(sc.oneOff),
      annualExtra: blank(sc.annualExtra) ? d.annualExtra : num(sc.annualExtra),
      spendingChange: blank(sc.spendingChange) ? d.spendingChange : num(sc.spendingChange),
      recoveryYears: blank(sc.recoveryYears) ? d.recoveryYears : Math.max(1, Math.round(num(sc.recoveryYears))),
    };
  }

  function simulate(state, scenarioInput) {
    var a = assumptions(state), ps = people(state), client = ps[0];
    var sc = normalizeScenario(scenarioInput || { type: 'none' }, ps);
    var active = sc.type !== 'none';
    var horizon = Math.max.apply(null, ps.map(function (p) { return p.lifeExpectancy - p.age; }));
    var nw = netWorth(state);
    var cash = nw.liquid, inv = nw.investments;
    var cpf = {}; ps.forEach(function (p) { cpf[p.key] = initCpf(p); });
    var aliveLast = {}; ps.forEach(function (p) { aliveLast[p.key] = true; });
    var goals = (state.goals || []).map(function (g) { return { goal: g, schedule: goalSchedule(g, a.inflation) }; });
    var goalStatus = {};
    var evWho = ps.find(function (p) { return p.key === sc.who; });
    var evT = sc.age - evWho.age;
    var rows = [];
    var liabs = state.liabilities || [];
    var expenses = state.expenses || [];
    var pattern = spendingPattern(state);

    for (var t = 0; t < horizon; t++) {
      var year = CFG.baseYear + t, clientAge = client.age + t;
      var f = { takeHome: 0, tax: 0, cpfLife: 0, lumpSum: 0, cpfBequest: 0, di: 0, living: 0, loans: 0, premiums: 0, goals: 0, invest: 0, extra: 0, cpfShortfall: 0, drawdown: 0 };
      var events = [];
      var anyAlive = false;
      var perAge = {};

      ps.forEach(function (p) {
        var age = p.age + t; perAge[p.key] = age;
        var isWho = active && sc.who === p.key;
        var dead = age >= p.lifeExpectancy || (isWho && sc.type === 'death' && age >= sc.age);
        var alive = !dead;
        var incap = isWho && (
          (sc.type === 'tpd' && age >= sc.age) ||
          (sc.type === 'disability' && age >= sc.age) ||
          (sc.type === 'ci' && age >= sc.age && age < sc.age + sc.recoveryYears));
        var working = alive && !incap && age < p.retireAge;
        var s = cpf[p.key];
        var pols = policiesOf(state, p.key);

        if (alive) anyAlive = true;
        if (isWho && age === sc.age) {
          var inf = pols.filter(function (x) { return inForce(x, age); });
          var field = sc.type === 'death' ? 'death' : sc.type === 'tpd' ? 'tpd' : sc.type === 'ci' ? 'ci' : null;
          if (field) f.lumpSum += sum(inf, function (x) { return num(x[field]); });
          f.extra += sc.oneOff;
          events.push({ kind: 'scenario', label: SCENARIOS.find(function (x) { return x.id === sc.type; }).label + ' (' + p.name + ')' });
        }
        if (aliveLast[p.key] && dead && !s.closed) {
          // CPF savings go to nominees; the household keeps them.
          f.cpfBequest += cpfTotal(s);
          s.oa = s.sa = s.ma = s.ra = 0; s.closed = true;
          if (!(isWho && sc.type === 'death')) events.push({ kind: 'death', label: 'Plan age for ' + p.name + ' reached' });
        }
        aliveLast[p.key] = alive;

        if (alive && age === p.retireAge && t > 0) events.push({ kind: 'retire', label: says(p.name, 'retires', 'retire') });

        if (alive) {
          var y = personYearIncome(p, a, age, t, working);
          f.takeHome += y.takeHome;
          f.tax += y.tax.net;
          if (working) f.invest += p.invest * 12;
          if (isWho && sc.type === 'disability' && age >= sc.age) {
            f.di += sum(pols.filter(function (x) { return inForce(x, sc.age) && age < Math.min(65, blank(x.coverUntil) ? 65 : num(x.coverUntil)); }), function (x) { return num(x.di) * 12; });
          }
          if (isWho && age >= sc.age && sc.type !== 'death') {
            var incapNow = sc.type === 'tpd' || (sc.type === 'ci' && age < sc.age + sc.recoveryYears) || (sc.type === 'disability' && age < p.retireAge);
            if (incapNow) f.extra += sc.annualExtra;
          }
          var waived = isWho && (sc.type === 'tpd') && age >= sc.age;
          if (!waived) f.premiums += sum(pols.filter(function (x) { return premiumDue(x, age); }), function (x) { return annual(x.premium, x.freq); });

          var housing = sum(liabs.filter(function (l) { return l.type === 'mortgage' && t < num(l.yearsLeft) && ownedBy(p.key, l.owner || 'client'); }), function (l) {
            var share = l.owner === 'joint' && ps.length > 1 ? 0.5 : 1;
            return Math.min(num(l.cpfMonthly), num(l.monthly)) * 12 * share;
          });
          var hasIsp = pols.some(function (x) { return x.type === 'hospital' && wardRank(x.ward) >= 2 && inForce(x, age); });
          var cr = stepCpf(s, p, {
            age: age, year: year, alive: true,
            contrib: working ? y.cpf : null,
            medisave: medisaveDeductions(p, age, year, hasIsp).total,
            housing: housing,
          });
          f.cpfLife += cr.payout;
          f.cpfShortfall += cr.cashOut;
          if (cr.events.indexOf('ra') >= 0 && t > 0) events.push({ kind: 'cpf', label: says(p.name, 'turns', 'turn') + ' 55: Retirement Account formed' });
          if (cr.events.indexOf('life') >= 0 && t > 0) events.push({ kind: 'cpf', label: says(p.name, 'starts', 'start') + ' CPF LIFE payouts' });
        }
      });

      // Loan repayments. The CPF share of home loans is paid from OA above;
      // everything else, and the CPF share of anyone no longer alive, is cash.
      f.loans = sum(liabs.filter(function (l) { return t < num(l.yearsLeft); }), function (l) {
        var cpfPart = l.type === 'mortgage' ? Math.min(num(l.cpfMonthly), num(l.monthly)) : 0;
        var cashPart = num(l.monthly) - cpfPart;
        var owners = l.owner === 'joint' ? ps.map(function (p) { return p.key; }) : [l.owner || 'client'];
        var lost = sum(owners, function (k) { return aliveLast[k] ? 0 : 1; }) / owners.length;
        return (cashPart + cpfPart * lost) * 12;
      });

      var retiredPhase = clientAge >= client.retireAge;
      var living;
      if (!retiredPhase) {
        living = sum(expenses.filter(function (e) { return blank(e.endAge) || clientAge < num(e.endAge); }), function (e) { return annual(e.amount, e.freq); });
        living *= Math.pow(1 + a.inflation, t);
      } else {
        // Inflate to the retirement date, then follow the chosen spending pattern.
        var start = Math.max(client.retireAge, client.age);
        living = retirementSpending(state) * 12 * Math.pow(1 + a.inflation, start - client.age) *
          Math.pow(1 + pattern.growth, clientAge - start) * stepShare(pattern.steps, clientAge);
      }
      if (active && t >= evT) living *= 1 + sc.spendingChange;
      f.living = living;

      goals.forEach(function (g) {
        g.schedule.forEach(function (s) {
          if (s.t === t) {
            f.goals += s.amount;
            events.push({ kind: 'goal', label: g.goal.name || 'Goal', amount: s.amount, id: g.goal.id });
          }
        });
      });

      var inflow = f.takeHome + f.cpfLife + f.lumpSum + f.cpfBequest + f.di;
      var outflow = f.tax + f.living + f.loans + f.premiums + f.goals + f.invest + f.extra + f.cpfShortfall;
      if (cash > 0) cash *= 1 + a.cashRate;
      inv *= 1 + (retiredPhase ? a.postRetReturn : a.preRetReturn);
      cash += inflow - outflow;
      inv += f.invest;
      if (cash < 0 && inv > 0) {
        var draw = Math.min(-cash, inv);
        inv -= draw; cash += draw; f.drawdown = draw;
      }
      // OA savings can be withdrawn from 55 once the Retirement Account is set aside.
      f.cpfDraw = 0;
      ps.forEach(function (p) {
        var s = cpf[p.key];
        if (cash < 0 && aliveLast[p.key] && perAge[p.key] >= CFG.cpf.raAge && s.oa > 0) {
          var d = Math.min(-cash, s.oa);
          s.oa -= d; cash += d; f.cpfDraw += d;
        }
      });
      events.forEach(function (e) {
        if (e.kind === 'goal' && !goalStatus[e.id]) goalStatus[e.id] = { age: clientAge, funded: cash >= 0, from: f.cpfDraw > 0 ? 'CPF' : f.drawdown > 0 ? 'investments' : 'cash' };
      });

      var cpfRow = {}, cpfSum = 0;
      ps.forEach(function (p) { var s = cpf[p.key]; cpfRow[p.key] = { oa: s.oa, sa: s.sa, ma: s.ma, ra: s.ra }; cpfSum += cpfTotal(s); });
      rows.push({
        t: t, year: year, age: clientAge, ages: perAge,
        cash: cash, investments: inv, cpf: cpfSum, cpfBy: cpfRow,
        shortfall: cash < 0 ? cash : 0,
        total: Math.max(0, cash) + inv + cpfSum,
        net: cash + inv + cpfSum,
        inflow: inflow, outflow: outflow, flows: f, events: events,
      });
      if (!anyAlive) break; // single-person household after a death scenario
    }

    var firstShort = rows.find(function (r) { return r.cash < 0; });
    var retireRow = rows.find(function (r) { return r.age === client.retireAge; }) || rows[rows.length - 1];
    var cpfSummary = {};
    ps.forEach(function (p) {
      var s = cpf[p.key];
      cpfSummary[p.key] = { lifeMonthly: s.lifeMonthly, raAt55: s.raAt55, raAt65: s.raAt65, sums: s.sums, choice: s.choice };
    });
    return {
      scenario: sc, rows: rows, goalStatus: goalStatus, cpf: cpfSummary,
      shortfallAge: firstShort ? firstShort.age : null,
      worstShortfall: Math.min.apply(null, rows.map(function (r) { return r.cash; }).concat([0])),
      atRetirement: retireRow, end: rows[rows.length - 1],
    };
  }

  // -------------------------------------------------------------- retirement

  /*
   * Lump sum needed at retirement to fund spending until horizonAge, net of
   * CPF LIFE payouts. Spending grows with inflation; payments are made at the
   * start of each year and the fund earns returnRate. With no payouts this is
   * exactly the FIRE sheet's PV((1+r)/(1+i)-1, n, -annual, 0, 1).
   */
  function nestEggTarget(o) {
    var n = Math.max(0, o.retireAge - o.age);
    var first = num(o.monthlyToday) * 12 * Math.pow(1 + o.inflation, n);
    var growth = o.growth === undefined ? o.inflation : o.growth;
    var total = 0, path = [];
    for (var y = o.retireAge; y < o.horizonAge; y++) {
      var k = y - o.retireAge;
      var need = first * Math.pow(1 + growth, k) * stepShare(o.steps, y);
      var pay = sum(o.payouts || [], function (p) { return y >= p.from && y < p.to ? p.monthly * 12 * Math.pow(1 + (p.growth || 0), y - p.from) : 0; });
      total += Math.max(0, need - pay) / Math.pow(1 + o.returnRate, k);
      path.push({ age: y, spending: need, payouts: pay });
    }
    return { target: total, firstYearSpending: first, years: n, path: path };
  }

  // Money the household can spend in retirement: cash, investments and CPF OA
  // at the end of the last working year. RA savings are not counted here
  // because they come back as CPF LIFE payouts, which reduce the target.
  function resourcesAt(sim, retireAge, opening) {
    var row = null;
    for (var i = 0; i < sim.rows.length; i++) if (sim.rows[i].age === retireAge - 1) row = sim.rows[i];
    if (!row) return opening;
    var oa = 0;
    Object.keys(row.cpfBy).forEach(function (k) { oa += row.cpfBy[k].oa; });
    var cash = Math.max(0, row.cash);
    return { cash: cash, investments: row.investments, cpfOa: oa, total: cash + row.investments + oa };
  }

  function withRetireAge(state, age) {
    var s = Object.assign({}, state);
    s.people = Object.assign({}, state.people);
    s.people.client = Object.assign({}, state.people.client, { retireAge: age });
    return s;
  }

  function retirementAnalysis(state, sim, nw) {
    var a = assumptions(state), ps = people(state), client = ps[0];
    var r = state.retirement || {};
    var horizonAge = Math.max.apply(null, ps.map(function (p) { return p.lifeExpectancy + (client.age - p.age); }));
    var opening = { cash: nw.liquid, investments: nw.investments, cpfOa: sum(ps, function (p) { return num(p.cpfIn.oa); }), total: 0 };
    opening.total = opening.cash + opening.investments + opening.cpfOa;
    var spending = retirementSpending(state);
    var pattern = spendingPattern(state);

    function payoutsFor(s) {
      return ps.map(function (p) {
        var off = client.age - p.age;
        var c = s.cpf[p.key], plan = lifePlan(p.cpfIn.lifePlan);
        var from = Math.max(CFG.cpf.payoutAge, p.age);
        var startMonthly = c.lifeMonthly * plan.factor * Math.pow(1 + plan.growth, from - CFG.cpf.payoutAge);
        return { key: p.key, name: p.name, from: from + off, to: p.lifeExpectancy + off, monthly: startMonthly, growth: plan.growth, plan: plan.label };
      });
    }

    function plan(retireAge, s) {
      var n = Math.max(0, retireAge - client.age);
      var tg = nestEggTarget({ age: client.age, retireAge: retireAge, horizonAge: horizonAge, monthlyToday: spending, inflation: a.inflation, growth: pattern.growth, steps: pattern.steps, returnRate: a.postRetReturn, payouts: payoutsFor(s) });
      var res = resourcesAt(s, retireAge, opening);
      var gap = Math.max(0, tg.target - res.total);
      return {
        retireAge: retireAge, years: n, target: tg.target, firstYearSpending: tg.firstYearSpending, path: tg.path,
        deflator: Math.pow(1 + a.inflation, n),
        resources: res, projected: res.total, progress: tg.target > 0 ? res.total / tg.target : 1, gap: gap,
        extraMonthly: n > 0 ? Math.max(0, -PMT(a.preRetReturn, n, 0, gap, 1) / 12) : gap,
        shortfallAge: s.shortfallAge,
      };
    }

    var base = plan(client.retireAge, sim);
    var n = base.years;
    // The template's "START INVESTING NOW": extra monthly investment that closes the gap at each rate.
    var strategies = a.strategies.map(function (st) {
      return { name: st.name, rate: st.rate, monthly: n > 0 ? Math.max(0, -PMT(st.rate, n, 0, base.gap, 1) / 12) : null };
    });
    // The FIRE sheet's "Cost of Procrastination".
    var delays = [0, 1, 2, 5].filter(function (d) { return n - d > 0; }).map(function (d) {
      return { delay: d, monthly: Math.max(0, -PMT(a.preRetReturn, n - d, 0, base.gap, 1) / 12) };
    });
    // The FIRE sheet's "FIRE Alternatives": retire 10 / 5 years earlier or later.
    var alternatives = [-10, -5, 0, 5, 10].map(function (d) { return client.retireAge + d; })
      .filter(function (age) { return age > client.age && age < horizonAge; })
      .map(function (age) { return plan(age, age === client.retireAge ? sim : simulate(withRetireAge(state, age))); });
    // The template's "IF I INVEST MONTHLY NOW".
    var extra = num(r.extraMonthly);
    var extraFv = n > 0 ? FV(a.preRetReturn, n, -(extra * 12), 0, 1) : 0;

    return {
      horizonAge: horizonAge, payouts: payoutsFor(sim), monthlySpending: spending, pattern: pattern, base: base,
      strategies: strategies, delays: delays, alternatives: alternatives,
      whatIf: { monthly: extra, fv: extraFv, progress: base.target > 0 ? (base.projected + extraFv) / base.target : 1 },
    };
  }

  // ------------------------------------------------------------------- goals

  function goalsAnalysis(state, sim) {
    var a = assumptions(state), client = people(state)[0];
    return (state.goals || []).map(function (g) {
      var sched = goalSchedule(g, a.inflation);
      var total = sum(sched, function (s) { return s.amount; });
      var years = Math.max(0, Math.round(num(g.inYears)));
      return {
        id: g.id, name: g.name, type: g.type, age: client.age + years, years: years, repeat: sched.length,
        today: num(g.amount) * sched.length, future: total,
        setAside: goalSetAside(g, a.inflation),
        setAsideInvested: years > 0 ? Math.max(0, -PMT(a.preRetReturn / 12, years * 12, 0, total, 0)) : 0,
        status: sim.goalStatus[g.id] || null,
      };
    });
  }

  // ------------------------------------------------------------ health check

  /*
   * Rule-of-thumb checks plus actions. Each action carries a weight (how much
   * it matters) and the section that fixes it, so the overview can lead with
   * the top three.
   */
  function healthCheck(m) {
    var cf = m.cashflow, a = m.assumptions, items = [], recs = [];
    var hasIncome = cf.takeHome > 0, hasSpend = cf.essentialMonthly > 0;
    var need = cf.essentialMonthly * a.emergencyMonths;
    var months = hasSpend ? m.netWorth.liquid / cf.essentialMonthly : 0;
    items.push({
      id: 'emergency', label: 'Emergency fund', value: m.netWorth.liquid, target: need, go: 'networth',
      detail: hasSpend ? months.toFixed(1) + ' months of expenses in cash (aim for ' + a.emergencyMonths + ')' : 'Add monthly expenses to size the emergency fund',
      status: !hasSpend ? 'warning' : months >= a.emergencyMonths ? 'good' : months >= a.emergencyMonths / 2 ? 'warning' : 'critical',
    });
    if (hasSpend && months < a.emergencyMonths) recs.push({ area: 'Cashflow', go: 'networth', weight: 55 + 25 * (1 - months / a.emergencyMonths), text: 'Build the emergency fund by ' + fmtMoney(need - m.netWorth.liquid) + ' to cover ' + a.emergencyMonths + ' months of expenses.' });

    items.push({
      id: 'surplus', label: 'Monthly surplus', value: cf.surplus, target: 0, go: 'cashflow',
      detail: !hasIncome ? 'Add income and spending to see the monthly surplus' : cf.surplus >= 0 ? 'Income covers spending, saving and goals' : 'Spending, saving and goal set-asides exceed take-home pay',
      status: !hasIncome ? 'warning' : cf.surplus >= 0 ? 'good' : 'critical',
    });
    if (hasIncome && cf.surplus < 0) recs.push({ area: 'Cashflow', go: 'cashflow', weight: 100, text: 'Close a monthly deficit of ' + fmtMoney(-cf.surplus) + ' by trimming variable spending or pushing out goal dates.' });

    var sr = hasIncome ? (cf.savings + cf.goalsMonthly) / cf.takeHome : 0;
    items.push({
      id: 'savings', label: 'Savings rate', value: sr, target: a.allocation.savings, unit: 'pct', go: 'cashflow',
      detail: 'Investments, savings plans and goal set-asides as a share of take-home pay',
      status: !hasIncome ? 'warning' : sr >= a.allocation.savings ? 'good' : sr >= a.allocation.savings / 2 ? 'warning' : 'critical',
    });

    var ir = hasIncome ? cf.protectionPrem / cf.takeHome : 0;
    items.push({
      id: 'insurance', label: 'Insurance premiums', value: ir, target: a.allocation.insurance, unit: 'pct', go: 'protection',
      detail: 'Protection premiums as a share of take-home pay (guide: about ' + Math.round(a.allocation.insurance * 100) + '%)',
      status: !hasIncome ? 'warning' : ir <= a.allocation.insurance * 1.5 ? 'good' : 'warning',
    });

    var dsr = cf.gross > 0 ? cf.loanTotal / cf.gross : 0;
    items.push({
      id: 'debt', label: 'Debt servicing', value: dsr, target: 0.35, unit: 'pct', go: 'networth',
      detail: cf.loanTotal > 0 ? 'Loan repayments (cash and CPF) as a share of gross income' : 'No loan repayments',
      status: dsr <= 0.35 ? 'good' : dsr <= 0.5 ? 'warning' : 'critical',
    });
    if (dsr > 0.35) recs.push({ area: 'Debt', go: 'networth', weight: 60, text: 'Loan repayments take ' + pct(dsr) + ' of gross income. Aim to bring this under 35%.' });

    var gaps = 0, areas = 0;
    m.protection.forEach(function (p) {
      p.rows.forEach(function (r) { areas++; if (r.status !== 'good') gaps++; });
      p.rows.filter(function (r) { return r.unit === 'lump' || r.unit === 'month'; }).forEach(function (r) {
        if (r.gap > 0 && r.status !== 'good') recs.push({ area: 'Protection', go: 'protection', weight: 40 + 45 * (1 - Math.min(1, r.ratio)), text: p.name + ': ' + r.label.toLowerCase() + ' cover is short by ' + fmtMoney(r.gap) + (r.unit === 'month' ? ' a month' : '') + '.' });
      });
      var h = p.rows.find(function (r) { return r.id === 'hospital'; });
      if (h.status !== 'good') recs.push({ area: 'Protection', go: 'protection', weight: h.status === 'critical' ? 75 : 35, text: p.name + ': hospital plan is below the target ward (' + wardLabel(h.target) + ').' });
    });
    items.push({
      id: 'protection', label: 'Protection', value: areas - gaps, target: areas, unit: 'count', go: 'protection',
      detail: (areas - gaps) + ' of ' + areas + ' coverage areas on target',
      status: gaps === 0 ? 'good' : gaps <= Math.ceil(areas / 3) ? 'warning' : 'critical',
    });

    var rb = m.retirement.base, rp = rb.progress, sized = rb.target > 0;
    items.push({
      id: 'retirement', label: 'Retirement readiness', value: rp, target: 1, unit: 'pct', go: 'retirement',
      detail: sized ? 'Cash, investments and CPF OA vs the nest egg needed at age ' + rb.retireAge : 'Add retirement spending or expenses to size the target',
      status: !sized ? 'warning' : rp >= 1 ? 'good' : rp >= 0.7 ? 'warning' : 'critical',
    });
    if (sized && rp < 1) recs.push({ area: 'Retirement', go: 'retirement', weight: 45 + 40 * (1 - rp), text: 'Invest ' + fmtMoney(rb.extraMonthly) + ' more a month (at ' + pct(a.preRetReturn) + ') to close the ' + fmtMoney(rb.gap) + ' retirement gap by age ' + rb.retireAge + '.' });
    // Idle cash: a large cash pile at retirement is an opportunity, not a win.
    var idle = rb.resources ? rb.resources.cash : 0;
    if (sized && idle > rb.target * 0.3 && idle > 100000) recs.push({ area: 'Retirement', go: 'retirement', weight: 50, text: 'About ' + fmtMoney(idle) + ' builds up as cash earning ' + pct(a.cashRate, 1) + ' by age ' + rb.retireAge + '. Investing part of the monthly surplus would work harder.' });

    var sa = m.sim.shortfallAge;
    var anyIncome = hasIncome || m.sim.rows.some(function (r) { return r.inflow > 0; });
    items.push({
      id: 'timeline', label: 'Lifetime cashflow', value: sa, unit: 'age', go: 'timeline',
      detail: !anyIncome ? 'Add income to project the timeline' : sa === null ? 'Savings last to the end of the plan' : 'Cash and investments run out at age ' + sa,
      status: !anyIncome ? 'warning' : sa === null ? 'good' : 'critical',
    });
    if (anyIncome && sa !== null) recs.push({ area: 'Timeline', go: 'timeline', weight: 90, text: 'Savings run out at age ' + sa + '. Lower retirement spending, retire later, or invest more.' });

    m.goals.forEach(function (g) {
      if (g.status && !g.status.funded) recs.push({ area: 'Goals', go: 'goals', weight: 65, text: (g.name || 'A goal') + ' at age ' + g.age + ' is not fully funded by the plan.' });
    });

    items.push({
      id: 'solvency', label: 'Solvency', value: m.netWorth.solvency, target: 0.5, unit: 'pct', go: 'networth',
      detail: 'Net worth as a share of total assets',
      status: m.netWorth.totalAssets === 0 ? 'warning' : m.netWorth.solvency >= 0.5 ? 'good' : m.netWorth.solvency >= 0.2 ? 'warning' : 'critical',
    });

    recs.sort(function (x, y) { return y.weight - x.weight; });
    return { items: items, recommendations: recs };
  }

  /*
   * Plan health: six areas scored 0-1 and an overall score out of 100.
   * Areas without enough data score null and are left out of the average.
   */
  function healthScore(m) {
    var cf = m.cashflow, a = m.assumptions;
    function status(v) { return v === null ? 'neutral' : v >= 0.8 ? 'good' : v >= 0.5 ? 'warning' : 'critical'; }
    var areas = [];
    var sr = cf.takeHome > 0 ? (cf.savings + cf.goalsMonthly) / cf.takeHome : 0;
    areas.push({ id: 'cashflow', label: 'Cashflow', go: 'cashflow',
      score: cf.takeHome <= 0 ? null : cf.surplus < 0 ? clamp(0.45 + cf.surplus / cf.takeHome, 0, 0.45) : clamp(0.6 + 0.4 * sr / a.allocation.savings, 0, 1),
      detail: cf.takeHome <= 0 ? 'Add income' : cf.surplus < 0 ? 'Monthly deficit' : pct(sr) + ' of pay saved' });
    var months = cf.essentialMonthly > 0 ? m.netWorth.liquid / cf.essentialMonthly : null;
    areas.push({ id: 'emergency', label: 'Safety net', go: 'networth',
      score: months === null ? null : clamp(months / a.emergencyMonths, 0, 1),
      detail: months === null ? 'Add expenses' : months.toFixed(1) + ' months in cash' });
    var pr = [];
    m.protection.forEach(function (p) {
      p.rows.forEach(function (r) {
        if (r.unit === 'lump' || r.unit === 'month') { if (r.target > 0) pr.push(Math.min(1, r.ratio)); }
        else pr.push(r.status === 'good' ? 1 : r.status === 'warning' ? 0.5 : 0);
      });
    });
    var prScore = pr.length ? sum(pr) / pr.length : null;
    areas.push({ id: 'protection', label: 'Protection', go: 'protection', score: prScore, detail: prScore === null ? 'Add policies' : pct(prScore) + ' of needs covered' });
    var rb = m.retirement.base;
    areas.push({ id: 'retirement', label: 'Retirement', go: 'retirement', score: rb.target > 0 ? clamp(rb.progress, 0, 1) : null,
      detail: rb.target > 0 ? pct(Math.min(rb.progress, 9.99)) + ' funded' : 'Set retirement spending' });
    var gs = m.goals.filter(function (g) { return g.status; });
    areas.push({ id: 'goals', label: 'Goals', go: 'goals', score: gs.length ? gs.filter(function (g) { return g.status.funded; }).length / gs.length : null,
      detail: gs.length ? gs.filter(function (g) { return g.status.funded; }).length + ' of ' + gs.length + ' funded' : 'No goals yet' });
    var dsr = cf.gross > 0 ? cf.loanTotal / cf.gross : 0;
    areas.push({ id: 'debt', label: 'Debt', go: 'networth', score: cf.gross > 0 ? (dsr <= 0.35 ? 1 : clamp(1 - (dsr - 0.35) / 0.35, 0, 1)) : null,
      detail: cf.loanTotal > 0 ? pct(dsr) + ' of income on loans' : 'No loans' });
    areas.forEach(function (x) { x.status = status(x.score); });
    var scored = areas.filter(function (x) { return x.score !== null; });
    return { overall: scored.length ? Math.round(sum(scored, function (x) { return x.score; }) / scored.length * 100) : null, areas: areas };
  }

  function wardLabel(id) { var w = CFG.wards.find(function (x) { return x.id === id; }); return w ? w.label : id; }
  function fmtMoney(x) { return 'S$' + Math.round(x).toLocaleString('en-SG'); }
  function pct(x) { return (Math.round(x * 1000) / 10) + '%'; }

  // --------------------------------------------------------------------- all

  function computeAll(state) {
    var a = assumptions(state), ps = people(state);
    var cashflow = cashflowAnalysis(state);
    var nw = netWorth(state);
    var protection = protectionAnalysis(state, cashflow);
    var sim = simulate(state, { type: 'none' });
    var scenario = state.scenario && state.scenario.type && state.scenario.type !== 'none' ? simulate(state, state.scenario) : null;
    var retirement = retirementAnalysis(state, sim, nw);
    var goals = goalsAnalysis(state, sim);
    var m = { assumptions: a, people: ps, cashflow: cashflow, netWorth: nw, protection: protection, sim: sim, scenario: scenario, retirement: retirement, goals: goals };
    m.health = healthCheck(m);
    m.score = healthScore(m);
    return m;
  }

  return {
    // catalogs
    EXPENSE_CATEGORIES: EXPENSE_CATEGORIES, POLICY_TYPES: POLICY_TYPES, ASSET_CATEGORIES: ASSET_CATEGORIES,
    LIABILITY_TYPES: LIABILITY_TYPES, GOAL_TYPES: GOAL_TYPES, TAX_RELIEFS: TAX_RELIEFS, SCENARIOS: SCENARIOS,
    // helpers
    num: num, annual: annual, PMT: PMT, FV: FV, PV: PV, policyType: policyType, wardLabel: wardLabel, wardRank: wardRank,
    // engine
    assumptions: assumptions, people: people, taxOnChargeable: taxOnChargeable, computeTax: computeTax,
    cpfContribution: cpfContribution, cohort: cohort, medisaveDeductions: medisaveDeductions,
    cashflowAnalysis: cashflowAnalysis, netWorth: netWorth, protectionAnalysis: protectionAnalysis,
    goalSchedule: goalSchedule, goalSetAside: goalSetAside, retirementSpending: retirementSpending, scenarioDefaults: scenarioDefaults, normalizeScenario: normalizeScenario,
    simulate: simulate, nestEggTarget: nestEggTarget, retirementAnalysis: retirementAnalysis, resourcesAt: resourcesAt,
    goalsAnalysis: goalsAnalysis, healthCheck: healthCheck, healthScore: healthScore, computeAll: computeAll,
    NEED_ITEMS: NEED_ITEMS, NEED_RISKS: NEED_RISKS, coverNeeds: coverNeeds, spendingPattern: spendingPattern, lifePlan: lifePlan, says: says,
  };
});
