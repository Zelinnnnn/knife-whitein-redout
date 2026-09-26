const test = require('node:test');
const assert = require('node:assert/strict');
const files = require('../js/files.js');
const data = require('../js/sample.js');

test('Client file round-trips the plan', () => {
  const plan = data.sample();
  plan.household = 'Tan </script> & Co';
  const html = files.buildClientFile({ state: plan, reportHtml: '<p>Report</p>', css: 'body{}' });
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(!html.includes('Tan </script>'), 'plan text cannot close the script tag');
  const back = files.readPlanFile(html);
  assert.equal(back.household, plan.household);
  assert.equal(back.policies.length, plan.policies.length);
});

test('Plain JSON plans from the first version still open', () => {
  const plan = data.sample();
  assert.equal(files.readPlanFile(JSON.stringify(plan)).household, plan.household);
  assert.equal(files.readPlanFile('<html>no plan</html>'), null);
  assert.equal(files.readPlanFile('{bad json'), null);
});

test('File names are tidy and dated', () => {
  assert.equal(files.fileName({ household: 'Tan Household!' }, new Date(2026, 8, 26)), 'tan-household-2026-09-26.html');
});
