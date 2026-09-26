# Waypoint financial planner

A Singapore household financial planning tool. It follows the adviser workflow
used by goals-based planning software such as GoalsMapper: fact-find, then gap
analysis, then a life timeline with what-if scenarios, then a report. The
calculations come from the `Financial_Planning_Template_1.xlsx` workbook.

Everything runs in the browser. There is no build step, no server and no
account. Clients are saved in the browser's local storage, and **Save file**
writes a client file you can keep, send or reopen later (see
[Client files](#client-files)).

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

After editing `css/app.css`, run `node financial-planner/tools/build-styles.js`
so saved client files embed the new styles (a test fails if you forget).

The tests check the engine against values read from the Excel template's cells.
They cover the tax calculator's YA2024 example (S$259), the FIRE sheet's target
(S$2,484,507.65) and alternatives, the "START INVESTING NOW" and "IF I INVEST
MONTHLY NOW" figures, the 37% CPF contribution, cashflow buckets and
protection targets.

## How it is organised

| Section | What it does | Template sheet |
| --- | --- | --- |
| **Overview** | Plan health wheel (six areas scored out of 100), top 3 moves with a button to the section that fixes each, net worth, surplus, readiness, emergency fund, life journey chart, where the pay goes, protection gaps, health check. A quick start (six numbers) replaces it for an empty plan | Financial Health Check |
| **Life timeline** | Year-by-year cash, investments and CPF to life expectancy, with goals, retirement and CPF milestones marked. What-if scenarios for death, TPD, critical illness and disability, drawn against the base plan | New (GoalsMapper-style timeline) |
| **Report** | Summary of the whole plan, including how detailed cover needs add up and the policy summary. **Save client file** saves it as a file with the plan inside | Policy Summary, Financial Health Check |
| 1. Profile | People, ages, retirement ages, economic assumptions and rule-of-thumb targets | Financial Health Check inputs |
| 2. Cashflow | Income per person, the template's expense list, fixed/variable split, 40/30/20/10 allocation check, monthly surplus | Cashflow Analysis |
| 3. Assets & liabilities | Assets by type, loans with CPF OA home-loan servicing, net worth and solvency | Cashflow Analysis: Current Assets |
| 4. Protection | Needs vs cover per person, sized by the quick rule (10×/5× income) or by **detailed needs** built item by item. Also disability income, hospital ward, personal accident, a policy editor and a policy summary | Financial Health Check: Coverage Progress; Policy Summary; Policy Summary for Spouse |
| 5. CPF | OA/SA/MA/RA projection with 2026 rates and ceilings, MediSave deductions, RA at 55, CPF LIFE estimate under the Standard, Escalating or Basic plan | CPF Estimator |
| 6. Goals | Goal templates (wedding, home, renovation, car, university, travel), future cost, monthly set-aside, funding status from the timeline | Cashflow Analysis: Short Terms Goals |
| 7. Retirement | Nest egg needed after CPF LIFE, with spending that grows with inflation, at a custom rate (e.g. 2.5%) or flat, and optional step-downs in later years. CPF LIFE plan per person, a year-by-year retirement income chart, extra investing needed at T-bill/bond/equity rates, cost of waiting, retiring 5 or 10 years earlier or later | Financial Health Check: Financial Freedom; FIRE |
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
  js/files.js         client files: build the saved report, read it back
  js/styles.js        generated copy of css/app.css for saved files
  tools/build-styles.js  regenerates js/styles.js
  js/ui.js            formatting, form controls, status pills, storage helpers
  js/charts.js        SVG charts (stacked yearly columns, bullets, bars, columns)
  js/views-plan.js    Overview, Life timeline, Report
  js/views-facts.js   the eight fact-find sections
  js/app.js           state, persistence, routing, import and export
  js/vendor/          Preact 10.24.3 and htm 3.1.1 (see LICENSES.md)
  tests/              engine tests against the Excel template, file and style checks
```

To update rates when CPF or IRAS publish new figures, edit `js/config.js` only.

## Today's dollars

Charts and headline figures default to today's dollars: future amounts are
divided by inflation since today, so S$4,000 a month of retirement spending
stays S$4,000 on screen instead of becoming S$9,000+. The **Today's $ /
Future $** switch on the timeline, CPF and retirement pages changes this.

## Detailed cover needs

Under Protection, **Detailed needs** builds each person's death, TPD and
critical illness need item by item, the way a planner would. Every item has a
default the planner can change or switch off. All amounts are in today's
dollars, assuming the payout is invested to keep pace with inflation.

| Risk | Items and defaults |
| --- | --- |
| Death | Family living support (take-home pay × 10 years), home loan and other debts (from Assets & liabilities; joint loans in full), children's education (from university goals), funeral and estate costs (S$10,000; packages cost S$5,500 to S$15,000) |
| TPD | Income until retirement, long-term care (S$2,500 a month less the 2026 CareShield Life payout of S$689, for 20 years), home modification (S$15,000), home loan and debts |
| Critical illness | Income while recovering (27 months, the average in Singlife's 2026 study), rehab, therapy and home nursing (S$2,349 a month for 12 months, from the same study), treatment the hospital plan does not pay (S$18,000: three years at the S$6,000 rider co-payment cap from April 2026), home-loan share normally paid by CPF, rest and recuperation (S$10,000) |

Existing savings, and CPF paid to nominees on death, can be subtracted. The
quick rule stays available, and the page shows both figures side by side. The
LIA/MAS Basic Financial Planning Guide's 9× and 4× can be set under Profile.

## Client files

- **Save file** (sidebar, or **Save client file** on the Report page) saves one
  `.html` file named after the client and the date. It opens in any browser as
  the full report, with a print or save-as-PDF button. The plan data is inside
  the file.
- **Open file**, or dropping a file anywhere on the page, loads it back. Files
  from the first version (`.json`) open too. Opening a file for a client who is
  already in the list replaces that copy.
- The **Client** list keeps every client in this browser. **New client** starts
  a blank plan without touching the others. **Delete this client** asks for
  confirmation first.
- In the Claude artifact viewer, saving uses the viewer's download
  confirmation. Client data is never uploaded anywhere. It stays in the
  browser and in the files you save.

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
  age. After that, retirement spending, inflated to the retirement date and
  then following the chosen pattern (inflation, a custom rate or flat, with
  optional step-downs such as 85% from 75 and 75% from 85). Loan repayments run for their
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

## Sources for defaults

- CPF LIFE: 2026 cohort Standard Plan estimate of about S$1,780 a month at the
  FRS; Escalating starts about 20% lower and rises 2% a year; Basic pays about
  10-15% less ([CPF](https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/cpf-life),
  [Growbeansprout](https://growbeansprout.com/cpf-life-payout-2026)).
- CareShield Life 2026 payout of S$689 a month ([CPF](https://www.cpf.gov.sg/member/healthcare-financing/careshield-life)).
- Critical illness recovery: 27 months on average, S$2,349 a month of rehab and
  therapy, and a S$170,000 recovery gap ([Singlife Critical Illness Study 2026](https://singlife.com/en/about-us/newsroom/2026/singlife-critical-illness-study-2026)).
- Integrated Shield cancer coverage and rider co-payment caps
  ([MOH](https://www.moh.gov.sg/managing-expenses/schemes-and-subsidies/medishield-life/faqs-on-cancer-treatment-financing/)).
- Nursing homes at S$2,000 to S$4,500 a month ([CareCompare](https://carecompare.sg/blog/nursing-home-cost-subsidies-singapore)).
- Funeral packages at S$5,500 to S$15,000 ([Singapore Funeral Committee](https://www.singaporefuneralcommittee.sg/average-cost-of-a-funeral-in-singapore-2025/)).
- 9× and 4× income guidelines ([LIA Basic Financial Planning Guide](https://www.lia.org.sg/media/4008/basic-financial-planning-guide.pdf)).
- Real retirement spending falling about 20 to 26% by the mid-80s
  ([Kitces on Blanchett's retirement spending smile](https://www.kitces.com/blog/estimating-changes-in-retirement-expenditures-and-the-retirement-spending-smile/)).

## Limitations

This is a planning aid, not financial advice. CPF LIFE payouts are rough
Standard Plan estimates. MediShield Life premiums come from the template's
table. The tax rebate varies by Year of Assessment and defaults to the
template's 50% capped at S$200. Property values and loan balances are held
flat. Check cpf.gov.sg, iras.gov.sg and your policy documents before acting on
any figure.
