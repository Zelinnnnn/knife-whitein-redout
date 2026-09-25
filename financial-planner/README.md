# Waypoint financial planner

A Singapore household financial planning tool. It follows the adviser workflow
used by goals-based planning software such as GoalsMapper: fact-find, then gap
analysis, then a life timeline with what-if scenarios, then a report. The
calculations come from the `Financial_Planning_Template_1.xlsx` workbook.

Everything runs in the browser. There is no build step, no server and no
account, and the plan is saved only in the browser's local storage.

## Run it

Open `financial-planner/index.html` in a browser. Opening the file directly works
because every script is a classic script and the libraries are vendored.

To serve it instead:

```sh
cd financial-planner && python3 -m http.server 8000
# then open http://localhost:8000
```

Run the engine tests (Node 18+):

```sh
node --test financial-planner/tests/*.test.js
```

The tests check the engine against values read from the Excel template's cells.
They cover the tax calculator's YA2024 example (S$259), the FIRE sheet's target
(S$2,484,507.65) and alternatives, the "START INVESTING NOW" and "IF I INVEST
MONTHLY NOW" figures, the 37% CPF contribution, cashflow buckets and
protection targets.

## How it is organised

| Section | What it does | Template sheet |
| --- | --- | --- |
| **Overview** | Net worth, surplus, retirement readiness, emergency fund, health check, recommended actions, cashflow allocation, protection gaps | Financial Health Check |
| **Life timeline** | Year-by-year cash, investments and CPF to life expectancy, with goals, retirement and CPF milestones marked. What-if scenarios for death, TPD, critical illness and disability, drawn against the base plan | New (GoalsMapper-style timeline) |
| **Report** | Printable summary of the whole plan, including the policy summary | Policy Summary, Financial Health Check |
| 1. Profile | People, ages, retirement ages, economic assumptions and rule-of-thumb targets | Financial Health Check inputs |
| 2. Cashflow | Income per person, the template's expense list, fixed/variable split, 40/30/20/10 allocation check, monthly surplus | Cashflow Analysis |
| 3. Assets & liabilities | Assets by type, loans with CPF OA home-loan servicing, net worth and solvency | Cashflow Analysis: Current Assets |
| 4. Protection | Needs vs cover per person (death, TPD, CI, disability income, hospital ward, personal accident), policy editor, policy summary | Financial Health Check: Coverage Progress; Policy Summary; Policy Summary for Spouse |
| 5. CPF | OA/SA/MA/RA projection with 2026 rates and ceilings, MediSave deductions, RA at 55, CPF LIFE estimate | CPF Estimator |
| 6. Goals | Goal templates (wedding, home, renovation, car, university, travel), future cost, monthly set-aside, funding status from the timeline | Cashflow Analysis: Short Terms Goals |
| 7. Retirement | Nest egg needed after CPF LIFE, what the plan provides, extra investing needed at T-bill/bond/equity rates, cost of waiting, retiring 5 or 10 years earlier or later | Financial Health Check: Financial Freedom; FIRE |
| 8. Income tax | Resident tax with reliefs, the S$80,000 relief cap, the rebate and the parenthood tax rebate. Feeds cashflow | Income Tax Calculator |

The APA and APA 2.0 sheets compare one investment platform's fees against
another's. They are left out because they compare products rather than plan a
household.

## Files

```
financial-planner/
  index.html          page shell, loads the scripts below in order
  css/app.css         design tokens (light and dark) and components
  js/config.js        every Singapore parameter: CPF rates, allocations, ceilings,
                      retirement sums, MediShield Life, tax bands, default targets
  js/calc.js          the engine: pure functions, runs in the browser and in Node
  js/sample.js        the sample household and the blank template
  js/ui.js            formatting, form controls, status pills, storage helpers
  js/charts.js        SVG charts (stacked yearly columns, bullets, bars, columns)
  js/views-plan.js    Overview, Life timeline, Report
  js/views-facts.js   the eight fact-find sections
  js/app.js           state, persistence, routing, import and export
  js/vendor/          Preact 10.24.3 and htm 3.1.1 (see LICENSES.md)
  tests/calc.test.js  engine tests against the Excel template
```

To update rates when CPF or IRAS publish new figures, edit `js/config.js` only.

## How the timeline works

Each year, for each person:

- **Income.** Salary and bonus grow at the salary growth rate until retirement.
  Employee CPF uses the age band's rate on wages up to the Ordinary Wage ceiling
  (S$8,000 a month) and the S$102,000 annual ceiling. Tax is worked out on that
  year's income. Rental, dividend, interest and other income continue for life.
- **CPF.** Contributions are split into OA, SA and MA by age. Interest is 2.5% on
  OA and 4% on SA, MA and RA, plus extra interest. MediShield Life, CareShield
  Life and Integrated Shield (up to the MediSave withdrawal limit) are paid from
  MA, and MA above the Basic Healthcare Sum flows to SA or RA. At 55 the chosen
  retirement sum (BRS, FRS or ERS) moves into the RA from SA, then OA, and the
  rest of SA moves to OA. At 65 the RA converts to CPF LIFE payouts.
- **Spending.** The expense list, inflated, until the main planner's retirement
  age. After that, retirement spending, inflated. Loan repayments run for their
  remaining years. The CPF share of home loans comes from OA, and any shortfall
  is paid in cash. Premiums are paid until each policy's premium end age.
- **Goals.** Each goal is paid in the year it falls due, in future dollars.
- **Drawdown.** Any shortfall is met from cash, then investments, then CPF OA
  (from age 55). What remains is shown as a red shortfall below zero.

Scenarios stop or pause the person's income, add the sums assured from their
in-force policies, pay their CPF balances to the household on death, waive
premiums on TPD, pay disability income until 65, and apply one-off costs,
yearly costs and a household spending change. All of these can be edited.

## Where it differs from the template

- **Bonus is taxed.** The template's tax sheet uses salary only (S$48,000). The
  tool taxes salary plus bonus. The template's own example still reproduces
  exactly when those inputs are used (see the tests).
- **Dividends and bank interest are tax-exempt.** Singapore one-tier dividends
  and bank interest are exempt for individuals, so only rental, business and
  other income is taxed.
- **2026 CPF rules.** The template's CPF Estimator uses older rates, a S$6,000
  wage ceiling and a S$71,500 BHS. The tool uses 2026 rates (including the
  higher rates for ages 55 to 65), the S$8,000 ceiling, the S$79,000 BHS, the RA
  at 55 and the closure of the SA at 55.
- **Retirement target.** The template's Financial Freedom formula passes the
  pre-65 annuity as a future value into the post-65 PV. The tool sums each year
  of spending less CPF LIFE payouts, discounted at the retirement return. With
  no CPF LIFE it matches the FIRE sheet's target exactly.
- **Retirement readiness counts everything spendable.** The template compares a
  typed-in "projected" figure with the target. The tool uses the cash,
  investments and CPF OA that the timeline projects at retirement.
- **Protection needs** use the template's multiples (10× for death and TPD, 5×
  for CI, 75% for disability income) on the template's "Total Income"
  definition: salary, bonus, employer CPF and other income. All of these can be
  edited under Profile.

## Limitations

This is a planning aid, not financial advice. CPF LIFE payouts are rough
Standard Plan estimates. MediShield Life premiums come from the template's
table. The tax rebate varies by Year of Assessment and defaults to the
template's 50% capped at S$200. Property values and loan balances are held
flat. Check cpf.gov.sg, iras.gov.sg and your policy documents before acting on
any figure.
