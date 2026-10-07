/*
 * Singapore planning parameters.
 *
 * Every figure the engine relies on lives here so it can be updated in one
 * place when CPF or IRAS publish new numbers. Values are for calendar year
 * 2026 unless noted. Check cpf.gov.sg and iras.gov.sg before relying on them.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.FP = root.FP || {}).config = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    baseYear: 2026,

    cpf: {
      // Monthly Ordinary Wage ceiling and annual salary ceiling (OW + AW).
      owCeiling: 8000,
      annualCeiling: 102000,

      // Contribution rates by age band, Singapore Citizens / 3rd-year SPR,
      // monthly wages above $750. Rates effective 1 Jan 2026.
      // `maxAge` is inclusive: "55 and below" -> maxAge 55.
      rates: [
        { maxAge: 55, employee: 0.20, employer: 0.17 },
        { maxAge: 60, employee: 0.18, employer: 0.16 },
        { maxAge: 65, employee: 0.125, employer: 0.125 },
        { maxAge: 70, employee: 0.075, employer: 0.09 },
        { maxAge: 999, employee: 0.05, employer: 0.075 },
      ],

      // Share of wages credited to each account. Above 55 the "sa" share is
      // credited to the Retirement Account. Bands above 55 are approximate.
      allocation: [
        { maxAge: 35, oa: 0.23, sa: 0.06, ma: 0.08 },
        { maxAge: 45, oa: 0.21, sa: 0.07, ma: 0.09 },
        { maxAge: 50, oa: 0.19, sa: 0.08, ma: 0.10 },
        { maxAge: 55, oa: 0.15, sa: 0.115, ma: 0.105 },
        { maxAge: 60, oa: 0.12, sa: 0.115, ma: 0.105 },
        { maxAge: 65, oa: 0.035, sa: 0.11, ma: 0.105 },
        { maxAge: 70, oa: 0.01, sa: 0.05, ma: 0.105 },
        { maxAge: 999, oa: 0.01, sa: 0.01, ma: 0.105 },
      ],

      interest: { oa: 0.025, sa: 0.04, ma: 0.04, ra: 0.04 },
      // Extra 1% on the first $60k of combined balances (OA counts up to $20k),
      // plus another 1% on the first $30k from age 55.
      extraInterest: { cap: 60000, oaCap: 20000, rate: 0.01, seniorCap: 30000, seniorRate: 0.01 },

      // Retirement sums for members turning 55 in 2026, grown 3.5% a year for
      // later cohorts (the same growth the Excel template assumes).
      retirementSums: { BRS: 110200, FRS: 220400, ERS: 440800 },
      retirementSumGrowth: 0.035,

      // Basic Healthcare Sum (MediSave cap). Fixed once a member turns 65.
      bhs: 79000,
      bhsGrowth: 0.04,

      raAge: 55,
      payoutAge: 65,
      // Rough CPF LIFE Standard Plan payout per $1 in RA at 65, per month.
      // Calibrated to the 2026 cohort estimate of about $1,780/month for the
      // FRS ($220,400 at 55, grown with interest to 65).
      lifePayoutFactor: 0.0053,
      // Plans relative to Standard. Escalating starts about 20% lower and
      // rises 2% a year; Basic pays roughly 10-15% less for a larger bequest.
      lifePlans: {
        standard: { label: 'Standard', factor: 1, growth: 0, note: 'Level payouts for life' },
        escalating: { label: 'Escalating', factor: 0.76, growth: 0.02, note: 'Starts about 24% lower, rises 2% a year' },
        basic: { label: 'Basic', factor: 0.87, growth: 0, note: 'About 13% lower, leaves more to beneficiaries' },
      },
      // CareShield Life severe-disability payout for claims made in 2026,
      // rising 4% a year to 2030 for later claims.
      careShieldPayout: 689,
      // Deferring CPF LIFE past 65 (up to 70) raises payouts by up to 7% for
      // each year deferred.
      latestPayoutAge: 70,
      deferralRate: 0.07,

      // MediShield Life annual premiums by age (from the Excel template's
      // CPF Estimator sheet). Paid from MediSave.
      medishield: [
        { maxAge: 20, premium: 147.71 },
        { maxAge: 30, premium: 254.67 },
        { maxAge: 40, premium: 397.29 },
        { maxAge: 50, premium: 534.81 },
        { maxAge: 60, premium: 814.95 },
        { maxAge: 65, premium: 1039.07 },
        { maxAge: 999, premium: 1120.56 },
      ],

      // CareShield Life base premium (2020 cohort at 30) grown 2% a year to 2025,
      // payable from 30 to 67. Values from the Excel template.
      careshield: { male: 206, female: 253, growth: 0.02, fromAge: 30, toAge: 67, growthUntilYear: 2025 },

      // MediSave Additional Withdrawal Limits for Integrated Shield Plans.
      ispAwl: [
        { maxAge: 40, limit: 300 },
        { maxAge: 70, limit: 600 },
        { maxAge: 999, limit: 900 },
      ],
    },

    tax: {
      label: 'Resident rates from YA2024',
      // Progressive bands: tax on income above `from` at `rate`.
      brackets: [
        { from: 0, rate: 0 },
        { from: 20000, rate: 0.02 },
        { from: 30000, rate: 0.035 },
        { from: 40000, rate: 0.07 },
        { from: 80000, rate: 0.115 },
        { from: 120000, rate: 0.15 },
        { from: 160000, rate: 0.18 },
        { from: 200000, rate: 0.19 },
        { from: 240000, rate: 0.195 },
        { from: 280000, rate: 0.20 },
        { from: 320000, rate: 0.22 },
        { from: 500000, rate: 0.23 },
        { from: 1000000, rate: 0.24 },
      ],
      reliefCap: 80000,
      earnedIncomeRelief: [
        { maxAge: 54, amount: 1000 },
        { maxAge: 59, amount: 6000 },
        { maxAge: 999, amount: 8000 },
      ],
    },

    // Defaults for the detailed (needs-based) cover calculator, in today's
    // dollars. Sources: Singlife Critical Illness Study 2026 (27-month average
    // recovery, S$2,349/month rehab and therapy); MOH Integrated Shield rider
    // co-payment cap of at least S$6,000 a year from April 2026; Singapore
    // funeral packages of S$5,500-15,000; nursing homes at S$2,000-4,500/month.
    needs: {
      supportYears: 10,
      finalExpenses: 10000,
      careMonthly: 2500,
      careYears: 20,
      homeModification: 15000,
      ciRecoveryMonths: 27,
      rehabMonthly: 2349,
      rehabMonths: 12,
      ciTreatmentGap: 18000,
      ciLifestyle: 10000,
    },

    // Retirement spending in later life: real spending tends to fall about
    // 20-26% by the mid-80s (Blanchett's "retirement spending smile").
    spendingSteps: [
      { age: 75, share: 0.85 },
      { age: 85, share: 0.75 },
    ],

    // Rule-of-thumb targets used by the Excel template's Financial Health Check.
    // The LIA/MAS Basic Financial Planning Guide suggests 9x and 4x instead.
    defaults: {
      inflation: 0.03,
      salaryGrowth: 0.02,
      cashRate: 0.005,
      preRetReturn: 0.06,
      postRetReturn: 0.05,
      retirementGrowth: 0.025, // custom spending growth after retirement
      surplusSaved: 1,     // share of each year's surplus kept (the rest is spent)
      surplusInvest: 0,    // share of the kept surplus that goes to investments
      ringFence: false,    // keep the emergency fund out of the projection
      emergencyMonths: 6,
      deathMultiple: 10,
      ciMultiple: 5,
      diReplacement: 0.75,
      targetWard: 'private',
      allocation: { fixed: 0.4, variable: 0.3, savings: 0.2, insurance: 0.1 },
      // "START INVESTING NOW" comparison rates from the template.
      strategies: [
        { name: 'SG T-bills', rate: 0.03 },
        { name: 'Bonds', rate: 0.0425 },
        { name: 'Equities', rate: 0.08 },
      ],
      taxRebate: { rate: 0.5, cap: 200 },
    },

    wards: [
      { id: 'none', label: 'None', rank: 0 },
      { id: 'medishield', label: 'MediShield Life', rank: 1 },
      { id: 'b1', label: 'Public B1 ward', rank: 2 },
      { id: 'a', label: 'Public A ward', rank: 3 },
      { id: 'private', label: 'Private hospital', rank: 4 },
    ],
  };
});
