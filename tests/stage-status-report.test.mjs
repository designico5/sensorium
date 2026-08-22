import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { summarizeStageMatrix } from '../scripts/report-stage-status.mjs';

const matrix = JSON.parse(await readFile(new URL('../docs/stage-test-matrix.json', import.meta.url), 'utf8'));

test('stage status report counts every matrix case and keeps physical acceptance honest', () => {
  const report = summarizeStageMatrix(matrix);
  assert.equal(report.totalTests, 68);
  assert.equal(report.physicalAcceptance.total, 7);
  assert.equal(report.physicalAcceptance.passed, 0);
  assert.equal(report.physicalAcceptance.percent, 0);
  assert.equal(report.statuses.PASS ?? 0, 0);
});
