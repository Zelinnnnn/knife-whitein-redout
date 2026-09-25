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
  const horizon = Math.max(85 - 26, 88 - 25);
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
