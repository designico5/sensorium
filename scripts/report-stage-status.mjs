import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function summarizeStageMatrix(matrix) {
  const byDomain = {};
  const statuses = {};
  let total = 0;
  for (const domain of matrix.domains) {
    const counts = {};
    for (const testCase of domain.tests) {
      total += 1;
      counts[testCase.status] = (counts[testCase.status] ?? 0) + 1;
      statuses[testCase.status] = (statuses[testCase.status] ?? 0) + 1;
    }
    byDomain[domain.id] = counts;
  }
  const physical = matrix.domains.find((domain) => domain.id === 'physical-acceptance');
  const physicalTotal = physical?.tests.length ?? 0;
  const physicalPassed = physical?.tests.filter((testCase) => testCase.status === 'PASS').length ?? 0;
  return {
    schemaVersion: matrix.schemaVersion,
    totalTests: total,
    statuses,
    byDomain,
    physicalAcceptance: {
      passed: physicalPassed,
      total: physicalTotal,
      percent: physicalTotal === 0 ? 0 : Math.round((physicalPassed / physicalTotal) * 100),
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const matrixPath = path.resolve(process.argv[2] ?? 'docs/stage-test-matrix.json');
  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
  console.log(JSON.stringify(summarizeStageMatrix(matrix), null, 2));
}
