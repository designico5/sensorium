import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEvidenceRecord } from '../scripts/validate-stage-evidence.mjs';

const validRecord = {
  device: 'Interface X revision 2',
  firmware: '1.4.2',
  driver: 'ASIO 6.0',
  os: 'Windows 11 build 26100',
  connection: 'USB-C direct',
  testCase: 'interface disconnect during playback',
  expected: 'output enters safe state and requires explicit re-arm',
  measured: 'output muted; re-arm succeeded after reconnect',
  latency: 4.2,
  jitter: 0.8,
  failureMode: 'device disconnect',
  recoveryTime: 1.7,
  log: 'evidence/stage/interface-x/run-001.jsonl',
  timestamp: '2026-08-22T12:00:00Z',
  operator: 'stage engineer',
  result: 'PASS',
};

test('HIL validator accepts a complete measured record', () => {
  assert.deepEqual(validateEvidenceRecord(validRecord), []);
});

test('HIL validator rejects placeholders and unknown fields', () => {
  const invalid = { ...validRecord, result: 'PASS', device: 'OWNER_INPUT_REQUIRED', extra: true };
  const errors = validateEvidenceRecord(invalid);
  assert.ok(errors.some((error) => error.includes('unexpected extra')));
  assert.ok(errors.some((error) => error.includes('placeholder device')));
});

test('HIL validator rejects negative measurements and invalid results', () => {
  const invalid = { ...validRecord, latency: -1, result: 'READY' };
  const errors = validateEvidenceRecord(invalid);
  assert.ok(errors.some((error) => error.includes('latency')));
  assert.ok(errors.some((error) => error.includes('result must be PASS')));
});
