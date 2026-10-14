// Run with: node --test financial-planner/tests
// Expected values come from the Excel template (Financial_Planning_Template_1.xlsx).
const test = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../js/calc.js');
const data = require('../js/sample.js');

const close = (actual, expected, tol = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tol, `expected ${expected}, got ${actual}`);

test('Excel PMT / FV / PV parity', () => {
  // Financial Health Check!E37 and F40
  close(-calc.PMT(0.03, 31, 0, 2222573.151303083, 1) / 12, 3596.2040594996524);
  close(calc.FV(0.08, 31, -(700 * 12), 0, 1), 1118993.714518603);
  // FIRE!E22:E24
  close(-calc.PMT(0.0005, 18, 0, 2484507.645290289, 1) / 12, 11447.818693722298);
  close(-calc.PMT(0.04, 18, 0, 2484507.645290289, 1) / 12, 7762.758164249405);
  close(-calc.PMT(0.08, 18, 0, 2484507.645290289, 1) / 12, 5118.947640497215);
  close(calc.PV(0.05, 10, -1000, 0, 1), 8107.82, 0.01);
});

test('Income Tax Calculator: YA2024 worked example', () => {
  const t = calc.computeTax({ employment: 48000, cpfRelief: 9600, age: 24 }, { rate: 0.5, cap: 200 });
  assert.equal(t.eir, 1000);
  assert.equal(t.cappedReliefs, 10600);
  assert.equal(t.chargeable, 37400);
  close(t.grossTax, 459);
  assert.equal(t.rebate, 200);
  close(t.net, 259);
});

test('Tax bands match the template rate table', () => {
  close(calc.taxOnChargeable(30000).tax, 200);
  close(calc.taxOnChargeable(80000).tax, 3350);
  close(calc.taxOnChargeable(320000).tax, 44550);
  close(calc.taxOnChargeable(1000000).tax, 199150);
  close(calc.taxOnChargeable(1100000).tax, 199150 + 24000);
});

test('Relief cap of $80,000 applies', () => {
  const t = calc.computeTax({ employment: 400000, cpfRelief: 20400, age: 40, reliefs: { srs: 15300, other: 60000 } });
  assert.equal(t.cappedReliefs, 80000);
});

test('CPF contribution for a 24-year-old matches the Cashflow sheet (37%)', () => {
  const c = calc.cpfContribution(24, 4000, 4000);
  close(c.total, 19240); // Cashflow Analysis!L5
  close(c.employee, 10400);
  close(c.employer, 8840);
  close(c.oa, 19240 * 23 / 37);
  close(c.oa + c.sa + c.ma, c.total);
});

test('CPF ceilings cap contributions', () => {
  const c = calc.cpfContribution(30, 15000, 60000);
  assert.equal(c.ow, 8000 * 12);
  assert.equal(c.aw, 102000 - 96000);
  close(c.total, 102000 * 0.37);
});

test('FIRE sheet target and alternatives', () => {
  const base = { age: 22, horizonAge: 85, monthlyToday: 4000, inflation: 0.03, returnRate: 0.05 };
  const t = calc.nestEggTarget({ ...base, retireAge: 40 });
  close(t.firstYearSpending, 81716.78693951535); // FIRE!H7
  close(t.target, 2484507.645290289); // FIRE!G13
  close(calc.nestEggTarget({ ...base, retireAge: 30 }).target, 2083764.3037697617); // FIRE!I13
  close(calc.nestEggTarget({ ...base, retireAge: 50 }).target, 2824407.0503858104); // FIRE!I16
});

function excelSingle() {
  // The template's "You" column: $4,000 salary, $4,000 bonus, template expenses.
  const s = data.sample();
  s.hasSpouse = false;
  s.people.client.age = 24;
  s.expenses.forEach((e) => { if (e.name === 'Rent' || e.name === 'Utilities') e.amount = 0; });
  s.liabilities = [];
  s.policies = s.policies.filter((p) => p.owner === 'client').map((p) => ({ ...p, premiumUntil: '', coverUntil: '' }));
  // Template premiums: hospitalisation 900, CI 1500, PA 224, death/TPD 500 (+ DPS 18 below)
  s.policies = s.policies.filter((p) => !p.name.startsWith("Dependants'"));
  s.policies.push({ id: 'dps', owner: 'client', type: 'term', premium: 0, freq: 'year', death: 70000, tpd: 70000 });
  s.goals.forEach((g) => { g.inflate = false; });
  return s;
}

test('Cashflow buckets match the template', () => {
  const cf = calc.cashflowAnalysis(excelSingle());
  close(cf.takeHome, 3466.6666666666665); // Cashflow Analysis!M15
  close(cf.variable, 1150); // H38
  close(cf.protectionPrem, 3124 / 12); // W9
  close(cf.goalsMonthly, 666.6666666666667); // Z24
  close(cf.fixed - cf.taxMonthly, (6000 + 360 + 240 + 1440 + 600) / 12);
});

test('Protection targets match the Financial Health Check', () => {
  const s = excelSingle();
  const cf = calc.cashflowAnalysis(s);
  const [you] = calc.protectionAnalysis(s, cf);
  close(you.basis, 60840); // Cashflow Analysis!L14
  assert.equal(you.target.ci, 304000); // Financial Health Check!G18
  assert.equal(you.target.death, 608000); // G19
  assert.equal(you.target.di, 3803); // G20
  assert.equal(you.current.death, 320000);
});

test('Simulation produces finite rows to life expectancy', () => {
  const s = data.sample();
  const sim = calc.simulate(s);
  const horizon = Math.max(95 - 26, 95 - 25);
  assert.equal(sim.rows.length, horizon);
  for (const r of sim.rows) {
    for (const k of ['cash', 'investments', 'cpf', 'total']) assert.ok(Number.isFinite(r[k]), `${k} at age ${r.age}`);
  }
  assert.ok(sim.cpf.client.lifeMonthly > 0, 'client has CPF LIFE payout');
  // With healthy balances the RA is topped up to the chosen retirement sum at 55.
  close(sim.cpf.client.raAt55, sim.cpf.client.sums.FRS, 1);
});

test('Death scenario pays policy sums and stops income', () => {
  const s = data.sample();
  const base = calc.simulate(s);
  const sc = calc.simulate(s, { type: 'death', who: 'client', age: 40 });
  const ev = sc.rows.find((r) => r.age === 40);
  assert.equal(ev.flows.lumpSum, 320000);
  assert.ok(ev.flows.cpfBequest > 0, 'CPF balances go to the household');
  const after = sc.rows.find((r) => r.age === 45);
  const afterBase = base.rows.find((r) => r.age === 45);
  assert.ok(after.flows.takeHome < afterBase.flows.takeHome);
});

test('Single-person death scenario ends the plan at the event', () => {
  const s = data.sample();
  s.hasSpouse = false;
  const sc = calc.simulate(s, { type: 'death', who: 'client', age: 50 });
  assert.equal(sc.rows[sc.rows.length - 1].age, 50);
});

test('CI scenario resumes income after recovery', () => {
  const s = data.sample();
  const sc = calc.simulate(s, { type: 'ci', who: 'client', age: 35, recoveryYears: 2 });
  const during = sc.rows.find((r) => r.age === 36);
  const back = sc.rows.find((r) => r.age === 37);
  assert.equal(during.flows.lumpSum, 0);
  assert.equal(sc.rows.find((r) => r.age === 35).flows.lumpSum, 100000);
  assert.ok(back.flows.takeHome > during.flows.takeHome);
});

test('computeAll runs on sample and blank data', () => {
  for (const s of [data.sample(), data.blank()]) {
    const m = calc.computeAll(s);
    assert.ok(Array.isArray(m.health.items) && m.health.items.length > 5);
    assert.ok(Number.isFinite(m.retirement.base.target));
    assert.ok(Number.isFinite(m.cashflow.surplus));
  }
});

test('Detailed needs: death defaults build up from the plan', () => {
  const s = data.sample();
  s.liabilities.push({ id: 'home', owner: 'joint', type: 'mortgage', balance: 300000, monthly: 1500, cpfMonthly: 1000, yearsLeft: 25 });
  const cf = calc.cashflowAnalysis(s);
  const [alex, jamie] = calc.protectionAnalysis(s, cf);
  const d = alex.needs.death;
  const item = (id) => d.items.find((i) => i.id === id);
  assert.equal(item('mortgage').total, 300000); // joint home loan cleared in full
  assert.equal(item('final').total, 10000);
  assert.equal(item('support').duration, 5); // partner relies on this income, no children
  close(item('support').total, item('support').monthly * 12 * 5);
  assert.equal(jamie.needs.death.items.find((i) => i.id === 'debts').total, 12000); // Jamie's study loan
  // CI: CPF share of the home loan must be paid in cash while recovering
  const cpfLoan = alex.needs.ci.items.find((i) => i.id === 'cpfLoan');
  assert.equal(cpfLoan.monthly, 500);
  assert.equal(cpfLoan.duration, 27);
});

test('Detailed needs drive targets when chosen, with overrides and offsets', () => {
  const s = data.sample();
  s.needs = { client: { method: 'needs', death: { support: { monthly: 5000, duration: 20 }, education: { on: false }, offsetSavings: true } } };
  const cf = calc.cashflowAnalysis(s);
  const [alex] = calc.protectionAnalysis(s, cf);
  assert.equal(alex.method, 'needs');
  const d = alex.needs.death;
  assert.equal(d.items.find((i) => i.id === 'support').total, 5000 * 12 * 20);
  assert.equal(d.items.find((i) => i.id === 'education').total, 0);
  assert.equal(d.offsets[0].amount, 18000); // Alex's savings + ETFs
  assert.equal(alex.target.death, Math.round((d.gross - 18000) / 1000) * 1000);
  assert.notEqual(alex.target.death, alex.rule.death);
});

test('Retirement spending patterns change the nest egg', () => {
  const base = { age: 30, retireAge: 60, horizonAge: 90, monthlyToday: 4000, inflation: 0.03, returnRate: 0.05 };
  const infl = calc.nestEggTarget(base).target;
  const flat = calc.nestEggTarget({ ...base, growth: 0 }).target;
  const slower = calc.nestEggTarget({ ...base, growth: 0.025 }).target;
  const steps = calc.nestEggTarget({ ...base, steps: [{ age: 75, share: 0.85 }, { age: 85, share: 0.75 }] }).target;
  assert.ok(flat < slower && slower < infl);
  assert.ok(steps < infl);
  const s = data.sample();
  const t0 = calc.computeAll(s).retirement.base.target;
  s.retirement.growth = 'custom'; s.retirement.growthRate = 0.025;
  assert.ok(calc.computeAll(s).retirement.base.target < t0);
});

test('CPF LIFE plans: escalating starts lower and grows 2% a year', () => {
  const s = data.sample();
  s.hasSpouse = false;
  const std = calc.simulate(s);
  s.cpf.client.lifePlan = 'escalating';
  const esc = calc.simulate(s);
  const at = (sim, age) => sim.rows.find((r) => r.age === age).flows.cpfLife;
  close(at(esc, 65) / at(std, 65), 0.76, 0.001);
  close(at(esc, 66) / at(esc, 65), 1.02, 0.0001);
  assert.equal(at(std, 66), at(std, 65));
});

test('Health score and prioritised actions', () => {
  const m = calc.computeAll(data.sample());
  assert.ok(m.score.overall > 0 && m.score.overall <= 100);
  assert.equal(m.score.areas.length, 7);
  const recs = m.health.recommendations;
  const lead = recs.slice(0, 3).map((r) => r.area);
  assert.equal(new Set(lead).size, lead.length, 'top moves come from different areas');
  assert.ok(m.health.recommendations.every((r) => r.go));
});

test('Empty plan shows no false passes', () => {
  const m = calc.computeAll(data.blank());
  const st = (id) => m.health.items.find((i) => i.id === id).status;
  assert.equal(st('emergency'), 'warning');
  assert.equal(st('surplus'), 'warning');
  assert.equal(st('timeline'), 'warning');
  assert.equal(m.score.overall === null || m.score.overall >= 0, true);
});

test('Event labels use "You retire" grammar', () => {
  const s = data.blank();
  s.people.client.age = 60; s.people.client.retireAge = 62;
  s.income.client.salary = 5000;
  const ev = calc.simulate(s).rows.flatMap((r) => r.events).map((e) => e.label);
  assert.ok(ev.includes('You retire'));
});

test('CPF LIFE deferred to 70 starts later and pays up to 7% more a year', () => {
  const s = data.sample(); s.hasSpouse = false;
  const at65 = calc.simulate(s);
  s.cpf.client.payoutStart = 70;
  const at70 = calc.simulate(s);
  const pay = (sim, age) => sim.rows.find((r) => r.age === age).flows.cpfLife;
  assert.equal(pay(at70, 67), 0);
  close(pay(at70, 70) / pay(at65, 70), Math.pow(1.07, 5), 0.0001);
  s.cpf.client.payoutStart = 75; // clamped to 70
  assert.equal(calc.simulate(s).cpf.client.startAge, 70);
});

test('Surplus share saved and split into investments', () => {
  const s = data.sample();
  const all = calc.simulate(s).rows[0];
  s.assumptions.surplusSaved = 0.6; s.assumptions.surplusInvest = 0.7;
  const r = calc.simulate(s).rows[0];
  const net = all.inflow - all.outflow;
  close(r.flows.surplusSpent, net * 0.4, 1);
  close(r.flows.surplusInvested, net * 0.6 * 0.7, 1);
  assert.ok(r.cash < all.cash && r.investments > all.investments);
});

test('Ring-fenced emergency fund is never spent', () => {
  const s = data.sample();
  s.retirement.monthlySpending = 9000; // forces a drawdown
  s.assumptions.ringFence = true; s.assumptions.emergencyReserve = 15000;
  const sim = calc.simulate(s);
  assert.equal(sim.reserve, 15000);
  const first = sim.rows.find((r) => r.shortfall < 0);
  assert.ok(first, 'plan runs short');
  // Before the shortfall, cash never dips under the reserve.
  sim.rows.filter((r) => r.age < first.age).forEach((r) => assert.ok(r.cash >= 15000 - 0.01));
  const plain = calc.simulate({ ...s, assumptions: { ...s.assumptions, ringFence: false } });
  assert.ok(sim.shortfallAge <= plain.shortfallAge);
});


test('Stress test runs with weaker markets and is reported', () => {
  const m = calc.computeAll(data.sample());
  assert.ok(m.stress.retirement.progress < m.retirement.base.progress);
  assert.ok(m.health.items.some((i) => i.id === 'stress'));
});

test('Score fails hard when money runs out', () => {
  const s = data.sample();
  s.retirement.monthlySpending = 12000;
  const m = calc.computeAll(s);
  assert.ok(m.sim.shortfallAge !== null);
  assert.ok(m.score.overall <= 49);
  assert.equal(m.score.capped, 'shortfall');
});

test('Spendable wealth excludes MediSave and RA', () => {
  const r = calc.simulate(data.sample()).rows.at(-1);
  const oa = Object.values(r.cpfBy).reduce((t, c) => t + c.oa, 0);
  close(r.spendable, r.cash + r.investments + oa);
  assert.ok(r.spendable < r.net);
});

test('No dependants: death cover only clears debts and final costs', () => {
  const s = data.sample();
  s.needs.spouse.dependants = { answered: true, spouse: false, children: 0, parents: false };
  const cf = calc.cashflowAnalysis(s);
  const jamie = calc.protectionAnalysis(s, cf)[1];
  assert.equal(jamie.rule.death, 22000); // S$12,000 study loan + S$10,000 final costs
  assert.equal(jamie.needs.death.items.find((i) => i.id === 'support').total, 0);
});

test('Unanswered dependants: death row is unconfirmed, not a gap', () => {
  const s = data.sample();
  delete s.needs.client.dependants;
  const m = calc.computeAll(s);
  const row = m.protection[0].rows.find((r) => r.id === 'death');
  assert.equal(row.status, 'neutral');
  assert.ok(m.health.recommendations.some((r) => r.text.startsWith('Confirm who depends on Alex')));
  assert.ok(!m.health.recommendations.some((r) => r.text.startsWith('Alex: death cover')));
});

test('CPF OA is not counted for retirement before 55', () => {
  const s = data.sample();
  s.people.client.retireAge = 45;
  s.people.spouse.retireAge = 45;
  const b = calc.computeAll(s).retirement.base;
  assert.equal(b.resources.cpfOa, 0);
  assert.ok(b.resources.oaLocked > 0);
});

test('Hospital premiums rise with age and inflation', () => {
  const s = data.sample(); s.hasSpouse = false;
  s.policies = s.policies.filter((p) => p.type === 'hospital' && p.owner === 'client');
  const rows = calc.simulate(s).rows;
  const at = (age) => rows.find((r) => r.age === age).flows.premiums;
  assert.equal(at(26), 900);
  close(at(75) / at(26), 7.5 * Math.pow(1.03, 49), 0.001);
});

test('Dividend-only retirement keeps capital and lives on yield', () => {
  const s = data.sample();
  s.retirement.incomeMode = 'dividends'; s.retirement.dividendYield = 0.04; s.retirement.capitalGrowth = 0;
  const sim = calc.simulate(s);
  const r55 = sim.rows.find((r) => r.age === 55), r56 = sim.rows.find((r) => r.age === 56);
  assert.ok(r55.events.some((e) => e.kind === 'income'));
  close(r56.flows.dividends, r55.investments * 0.04, 1);
  assert.equal(r56.flows.drawdown, 0);
  const b = calc.computeAll(s).retirement.base;
  assert.equal(b.mode, 'dividends');
  // Pot needed covers the largest yearly gap at a 4% yield.
  const worst = Math.max(...b.path.map((x) => Math.max(0, x.spending - x.payouts)));
  close(b.target, worst / 0.04, 1);
});

test('Buyer stamp duty tiers', () => {
  assert.equal(calc.bsdFor(500000), 9600); // 1,800 + 3,600 + 4,200
  assert.equal(calc.bsdFor(1500000), 44600);
  assert.equal(calc.bsdFor(4000000), 179600); // 1,800 + 3,600 + 19,200 + 20,000 + 75,000 + 60,000
});

test('BTO staggered downpayment: 5% at signing, 20% and loan at keys', () => {
  const s = data.sample();
  const g = { id: 'home', type: 'property', name: 'BTO', amount: 500000, inYears: 1,
    property: { scheme: 'bto_sds', keyYears: 4, grants: 30000, renovation: 40000, owner: 'joint' } };
  const plan = calc.propertyPlan(g, s);
  const [sign, keys] = plan.stages;
  assert.equal(sign.t, 1); assert.equal(keys.t, 5);
  // 5% of 500k = 25k, less 30k grants -> 0; balance of grants goes to key stage
  close(sign.lines[0].amount, 25000);
  close(sign.cpf, 0 + 9600); // BSD from CPF
  close(sign.cash, 2500 + 500); // legal + other fees in cash
  close(keys.cpf, 100000 - 5000); // 20% less leftover grants
  close(keys.cash, 40000); // renovation
  assert.equal(plan.loan.startT, 5);
  close(plan.loan.principal, 375000);
  close(plan.loan.monthly, -calc.PMT(0.026 / 12, 300, 375000));
});

test('Deferred-payment condo: 20% upfront (5% cash), 5% at TOP, bank loan from TOP, ABSD in cash', () => {
  const s = data.sample();
  const g = { id: 'c', type: 'property', name: 'Condo', amount: 1500000, inYears: 2,
    property: { scheme: 'condo_dps', absd: 'sc2', owner: 'client' } };
  const plan = calc.propertyPlan(g, s);
  const [buy, top] = plan.stages;
  close(buy.cash, 75000 + 300000 + 4000 + 800); // 5% cash + ABSD 20% + fees
  close(buy.cpf, 225000 + 44600); // 15% + BSD
  close(top.total, 75000);
  assert.equal(plan.loan.startT, 6);
  assert.equal(plan.loan.type, 'bank');
});

test('Home purchase flows through the timeline: OA used first, loan from key collection', () => {
  const s = data.sample();
  s.goals.push({ id: 'home', type: 'property', name: 'BTO', amount: 400000, inYears: 1, property: { scheme: 'bto_hdb', keyYears: 3, owner: 'joint' } });
  const base = calc.simulate(data.sample());
  const sim = calc.simulate(s);
  const row = (x, age) => x.rows.find((r) => r.age === age);
  assert.ok(row(sim, 27).flows.homeCpf > 0);
  assert.ok(row(sim, 31).flows.homeCpf > 0); // instalments from OA after key collection
  assert.ok(row(sim, 31).flows.loans >= row(base, 31).flows.loans);
  assert.equal(row(sim, 29).flows.loans, row(base, 29).flows.loans);
  const m = calc.computeAll(s);
  const goal = m.goals.find((x) => x.id === 'home');
  assert.ok(goal.home && goal.setAside > 0);
  const aff = calc.propertyAffordability(goal.home, m.cashflow);
  assert.ok(aff.msr > 0 && aff.msr < 1);
});
