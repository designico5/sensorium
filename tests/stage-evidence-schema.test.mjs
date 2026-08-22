import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const schema = JSON.parse(await readFile(new URL('../docs/stage-evidence.schema.json', import.meta.url), 'utf8'));

test('HIL evidence schema requires every physical acceptance field', () => {
  const expected = [
    'device', 'firmware', 'driver', 'os', 'connection', 'testCase',
    'expected', 'measured', 'latency', 'jitter', 'failureMode',
    'recoveryTime', 'log', 'timestamp', 'operator', 'result',
  ];
  assert.deepEqual(schema.required, expected);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.result.enum, ['PASS', 'FAIL', 'PENDING']);
});

test('HIL evidence schema rejects no-result placeholders by contract', () => {
  assert.ok(!schema.properties.result.enum.includes('READY'));
  assert.ok(!schema.properties.result.enum.includes('VERIFIED'));
  assert.equal(schema.properties.latency.minimum, 0);
  assert.equal(schema.properties.recoveryTime.minimum, 0);
});
