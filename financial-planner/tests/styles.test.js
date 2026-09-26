const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('js/styles.js is in sync with css/app.css (run tools/build-styles.js)', () => {
  const root = path.join(__dirname, '..');
  const css = fs.readFileSync(path.join(root, 'css/app.css'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'js/styles.js'), 'utf8');
  assert.ok(js.includes(JSON.stringify(css)), 'styles.js is stale: run node financial-planner/tools/build-styles.js');
});
