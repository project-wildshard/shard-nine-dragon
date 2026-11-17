import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [suite, file] = process.argv.slice(2);
assert.ok(['source', 'runtime'].includes(suite) && file, 'Usage: source|runtime report.json');
const manifest = JSON.parse(readFileSync('test/ci21-ports.json', 'utf8'));
const report = JSON.parse(readFileSync(file, 'utf8'));
assert.equal(report.success, true);
assert.equal(report.numFailedTests, 0);
assert.equal(report.numPendingTests, 0);
let cases = 0;
for (const row of manifest.files.filter(row => row.suite === suite)) {
  const result = report.testResults.find(result => result.name === resolve(row.target));
  assert.ok(result, `Missing CI21 original ${row.source}`);
  assert.equal(result.status, 'passed', row.target);
  assert.equal(result.assertionResults.length, row.cases, row.target);
  assert.ok(result.assertionResults.every(result => result.status === 'passed'), row.target);
  cases += row.cases;
}
console.log(`CI21 ${suite}: all ${cases} original Nine cases passed; no failures or pending cases`);
