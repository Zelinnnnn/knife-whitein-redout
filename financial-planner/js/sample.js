/*
 * Starting data. `sample()` reproduces the Excel template's worked example
 * (income, expenses, premiums, goals, retirement spending) and fills blanks the
 * template leaves empty with illustrative figures. `blank()` is the same
 * structure with the template's expense rows at zero.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.FP = root.FP || {}).data = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var seq = 0;
  function id(prefix) { seq += 1; return prefix + '-' + Date.now().toString(36) + '-' + seq; }

  // The template's expense list. Loan repayments, income tax and insurance
  // premiums are computed from other sections, so they are not listed here.
  function expenseRows(amounts) {
    amounts = amounts || {};
    var rows = [
      ['Personal', 'Food (essential)', 'month', 'fixed'],
      ['Personal', 'Food (dining out)', 'month', 'variable'],
      ['Personal', 'Clothing', 'month', 'variable'],
      ['Personal', 'Healthcare', 'month', 'fixed'],
      ['Personal', 'Phone and internet', 'month', 'fixed'],
      ['Personal', 'Electronics', 'year', 'variable'],
      ['Personal', 'Travel', 'year', 'variable'],
      ['Personal', 'Gifts and celebrations', 'year', 'variable'],
      ['Household', 'Rent', 'month', 'fixed'],
      ['Household', 'Utilities', 'month', 'fixed'],
      ['Household', 'Property tax', 'year', 'fixed'],
      ['Household', 'Conservancy and maintenance', 'month', 'fixed'],
      ['Household', 'Domestic helper', 'month', 'fixed'],
      ['Household', 'Parents allowance', 'month', 'fixed'],
      ['Transportation', 'Public transport', 'month', 'fixed'],
      ['Transportation', 'Taxi and ride-hailing', 'month', 'fixed'],
      ['Transportation', 'Car insurance and road tax', 'year', 'fixed'],
      ['Transportation', 'Fuel, parking and maintenance', 'month', 'fixed'],
      ["Children's education", 'School fees', 'month', 'fixed'],
      ["Children's education", 'Tuition and enrichment', 'month', 'fixed'],
      ["Children's education", 'Allowance', 'month', 'fixed'],
      ['Financial management', 'Business expenses', 'month', 'fixed'],
    ];
    return rows.map(function (r) {
      return { id: id('exp'), category: r[0], name: r[1], amount: amounts[r[1]] || 0, freq: r[2], kind: r[3], endAge: '' };
    });
  }

  function assumptions() {
    return {
      inflation: 0.03, salaryGrowth: 0.02, cashRate: 0.005, preRetReturn: 0.06, postRetReturn: 0.05,
      emergencyMonths: 6, deathMultiple: 10, ciMultiple: 5, diReplacement: 0.75, targetWard: 'private',
      allocation: { fixed: 0.4, variable: 0.3, savings: 0.2, insurance: 0.1 },
      taxRebate: { rate: 0.5, cap: 200 },
    };
  }

  function emptyTax() { return { employmentExpenses: 0, donations: 0, ptr: 0, reliefs: {} }; }

  function sample() {
    return {
      version: 1,
      meta: { sample: true },
      household: 'Sample household',
      hasSpouse: true,
      people: {
        client: { name: 'Alex', age: 26, gender: 'male', retireAge: 55, lifeExpectancy: 85 },
        spouse: { name: 'Jamie', age: 25, gender: 'female', retireAge: 60, lifeExpectancy: 88 },
      },
      assumptions: assumptions(),
      income: {
        client: { salary: 4000, bonus: 4000, business: 0, dividends: 0, interest: 0, rental: 0, others: 0 },
        spouse: { salary: 3600, bonus: 3600, business: 0, dividends: 0, interest: 0, rental: 0, others: 0 },
      },
      investing: { client: 700, spouse: 300 },
      expenses: expenseRows({
        'Food (essential)': 500, 'Food (dining out)': 300, Clothing: 100, Healthcare: 30,
        'Phone and internet': 20, Electronics: 2000, Travel: 6000, 'Gifts and celebrations': 1000,
        'Public transport': 120, 'Taxi and ride-hailing': 50,
        Rent: 1200, Utilities: 150,
      }),
      assets: [
        { id: id('ast'), owner: 'client', category: 'cash', name: 'Savings account', value: 10000 },
        { id: id('ast'), owner: 'spouse', category: 'cash', name: 'Savings account', value: 10000 },
        { id: id('ast'), owner: 'client', category: 'investment', name: 'ETF portfolio', value: 8000 },
      ],
      liabilities: [
        { id: id('lia'), owner: 'spouse', type: 'study', name: 'University loan', balance: 12000, rate: 0.045, monthly: 400, cpfMonthly: 0, yearsLeft: 3 },
      ],
      cpf: {
        client: { oa: 14000, sa: 4500, ma: 7000, ra: 0, retirementSum: 'FRS', careshieldSupplement: 0 },
        spouse: { oa: 10500, sa: 3300, ma: 5200, ra: 0, retirementSum: 'FRS', careshieldSupplement: 0 },
      },
      policies: [
        { id: id('pol'), owner: 'client', insurer: '', name: "Dependants' Protection Scheme", type: 'term', premium: 18, freq: 'year', premiumUntil: 65, coverUntil: 65, death: 70000, tpd: 70000, ci: 0, eci: 0, accident: 0, di: 0, ward: 'none', cashValue: 0 },
        { id: id('pol'), owner: 'client', insurer: '', name: 'Term life plan', type: 'term', premium: 500, freq: 'year', premiumUntil: 65, coverUntil: 65, death: 250000, tpd: 250000, ci: 0, eci: 0, accident: 0, di: 0, ward: 'none', cashValue: 0 },
        { id: id('pol'), owner: 'client', insurer: '', name: 'Critical illness plan', type: 'ci', premium: 1500, freq: 'year', premiumUntil: 65, coverUntil: 75, death: 0, tpd: 0, ci: 100000, eci: 0, accident: 0, di: 0, ward: 'none', cashValue: 0 },
        { id: id('pol'), owner: 'client', insurer: '', name: 'Integrated Shield plan + rider', type: 'hospital', premium: 900, freq: 'year', premiumUntil: '', coverUntil: '', death: 0, tpd: 0, ci: 0, eci: 0, accident: 0, di: 0, ward: 'private', cashValue: 0 },
        { id: id('pol'), owner: 'client', insurer: '', name: 'Personal accident plan', type: 'pa', premium: 224, freq: 'year', premiumUntil: 65, coverUntil: 65, death: 0, tpd: 0, ci: 0, eci: 0, accident: 100000, di: 0, ward: 'none', cashValue: 0 },
        { id: id('pol'), owner: 'spouse', insurer: '', name: "Dependants' Protection Scheme", type: 'term', premium: 18, freq: 'year', premiumUntil: 65, coverUntil: 65, death: 70000, tpd: 70000, ci: 0, eci: 0, accident: 0, di: 0, ward: 'none', cashValue: 0 },
        { id: id('pol'), owner: 'spouse', insurer: '', name: 'Integrated Shield plan', type: 'hospital', premium: 350, freq: 'year', premiumUntil: '', coverUntil: '', death: 0, tpd: 0, ci: 0, eci: 0, accident: 0, di: 0, ward: 'b1', cashValue: 0 },
      ],
      goals: [
        { id: id('goal'), type: 'wedding', name: 'Wedding', amount: 25000, inYears: 5, repeat: 1, inflate: true },
        { id: id('goal'), type: 'renovation', name: 'Renovation', amount: 15000, inYears: 5, repeat: 1, inflate: true },
      ],
      retirement: { monthlySpending: 4000, includeInvestments: true, includeExcessCash: false, monthlyInvest: '' },
      tax: { client: emptyTax(), spouse: emptyTax() },
      scenario: { type: 'none', who: 'client', age: 40 },
    };
  }

  function blank() {
    var s = sample();
    s.meta = { sample: false };
    s.household = '';
    s.hasSpouse = false;
    s.people = {
      client: { name: '', age: 30, gender: 'male', retireAge: 63, lifeExpectancy: 85 },
      spouse: { name: '', age: 30, gender: 'female', retireAge: 63, lifeExpectancy: 88 },
    };
    s.income = {
      client: { salary: 0, bonus: 0, business: 0, dividends: 0, interest: 0, rental: 0, others: 0 },
      spouse: { salary: 0, bonus: 0, business: 0, dividends: 0, interest: 0, rental: 0, others: 0 },
    };
    s.investing = { client: 0, spouse: 0 };
    s.expenses = expenseRows();
    s.assets = [];
    s.liabilities = [];
    s.cpf = {
      client: { oa: 0, sa: 0, ma: 0, ra: 0, retirementSum: 'FRS', careshieldSupplement: 0 },
      spouse: { oa: 0, sa: 0, ma: 0, ra: 0, retirementSum: 'FRS', careshieldSupplement: 0 },
    };
    s.policies = [];
    s.goals = [];
    s.retirement = { monthlySpending: '', includeInvestments: true, includeExcessCash: false, monthlyInvest: '' };
    s.scenario = { type: 'none', who: 'client', age: 45 };
    return s;
  }

  return { sample: sample, blank: blank, id: id, assumptions: assumptions };
});
