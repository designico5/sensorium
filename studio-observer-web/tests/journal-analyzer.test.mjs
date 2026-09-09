import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { analyzeJournal as analyzeBrowser } from '../src/journal-analyzer.mjs';
import { analyzeJournal as analyzeNode } from '../tools/analyze-studio-journal.node.mjs';
import { generateBrowserAnalyzer, synchronize } from '../tools/sync-journal-analyzer.mjs';

const NODE_URL = new URL('../tools/analyze-studio-journal.node.mjs', import.meta.url);
const BROWSER_URL = new URL('../src/journal-analyzer.mjs', import.meta.url);
const ROOT_URL = new URL('../../scripts/analyze-studio-journal.mjs', import.meta.url);
const HASH = 'a'.repeat(64);
const RUN_ID = '12345678-1234-4234-8234-123456789abc';
const utc = second => `2026-09-09T12:00:${String(second).padStart(2, '0')}.0000000Z`;

function endpoint(index = 0, displayName = 'OS metadata label') {
  return {
    deviceIndex: index,
    displayName,
    manufacturerId: 1,
    productId: 2,
    driverVersionRaw: 3,
    direction: 'input',
    stable_id: null,
    resolution: 'unknown',
    identity_stability: 'unresolved',
    firmware: null,
    confidence: 'unknown',
    confidenceRationale: 'OS capability label only; physical owner binding absent',
  };
}

function collector(endpoints, sequence) {
  const empty = endpoints.length === 0;
  return {
    schemaVersion: '2',
    collectorVersion: '2.0-inventory-only',
    recordType: 'midi_input_inventory',
    scope: 'INVENTORY_ONLY',
    result: empty ? 'INCONCLUSIVE' : 'INVENTORY_CAPTURED_REVIEW_REQUIRED',
    reason: empty ? 'NO_WINMM_INPUT_ENDPOINTS_REPORTED' : 'OS_ENDPOINT_METADATA_ONLY',
    evidenceClass: empty ? 'OBSERVED_SOURCE' : 'OBSERVED_PORT',
    observedAtUtc: utc(sequence - 1),
    completedAtUtc: utc(sequence),
    snapshot_id: sequence.toString(16).padStart(32, '0'),
    provider_instance_id: 'b'.repeat(32),
    source: 'Windows WinMM input capability API',
    scriptSha256: HASH,
    enumeration_state: 'complete',
    stable_id: null,
    identity_stability: 'unresolved',
    freshness: 'captured_now_not_valid_for_binding',
    expiresAtUtc: null,
    bindingAllowed: false,
    portOpenAllowed: false,
    routingMutationAllowed: false,
    writeIoAllowed: false,
    operationalApproval: 'NOT_GRANTED',
    physicalAcceptance: 'NOT_EVALUATED',
    recordingAcceptance: 'NOT_EVALUATED',
    limits: ['OS metadata only'],
    endpoints,
  };
}

function journal(snapshots = [[endpoint()], [endpoint(1, 'Changed metadata label')]]) {
  const row = (event, sequence, data) => ({
    schema: 'sensorium.studio-inventory-journal.v1',
    run_id: RUN_ID,
    sequence,
    recorded_at_utc: utc(sequence),
    elapsed_ms: sequence * 1000,
    event,
    scope: 'INVENTORY_ONLY',
    operationalApproval: 'NOT_GRANTED',
    data,
  });
  const rows = [row('start', 0, {
    journal_script_sha256: 'c'.repeat(64),
    collector_script_sha256: HASH,
    capture_mode: 'manual_checkpoint',
    checkpoint_limit: 20,
  })];
  snapshots.forEach((endpoints, index) => rows.push(row('checkpoint', index + 1, {
    operator_note: index === 0 ? 'Before attachment' : 'Operator reports attachment',
    collector_exit_code: endpoints.length === 0 ? 3 : 0,
    collector_output: JSON.stringify(collector(endpoints, index + 1)),
  })));
  rows.push(row('end', rows.length, {
    reason: 'operator_finished',
    checkpoint_count: snapshots.length,
  }));
  return rows;
}

const serialize = rows => `${rows.map(row => JSON.stringify(row)).join('\n')}\n`;

async function equivalent(rawText) {
  const nodeResult = analyzeNode(rawText);
  const browserResult = await analyzeBrowser(rawText);
  assert.deepEqual(browserResult, nodeResult);
  assert.notEqual(browserResult.status, 'PASS');
  return browserResult;
}

test('vendored Node analyzer is byte-identical to the current canonical source', async () => {
  const [canonical, vendored] = await Promise.all([
    readFile(ROOT_URL, 'utf8'),
    readFile(NODE_URL, 'utf8'),
  ]);
  assert.equal(vendored, canonical);
});

test('committed browser module is the deterministic generated output', async () => {
  const [vendored, browser] = await Promise.all([
    readFile(NODE_URL, 'utf8'),
    readFile(BROWSER_URL, 'utf8'),
  ]);
  assert.equal(browser, generateBrowserAnalyzer(vendored));
  assert.match(browser, new RegExp(`^// GENERATED FILE\\. DO NOT EDIT\\.\\n// Vendored Node source SHA-256: ${
    createHash('sha256').update(vendored, 'utf8').digest('hex')}`));
  await synchronize({ check: true });
});

test('browser analyzer contains no Node import, filesystem, process, network or device API', async () => {
  const source = await readFile(BROWSER_URL, 'utf8');
  assert.doesNotMatch(source, /(?:from\s+['"]node:|require\s*\(|\bprocess\.|\bBuffer\b|\bopenSync\b|\breadSync\b|\bcloseSync\b)/);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|requestMIDIAccess|getUserMedia|requestDevice|requestPort)\b/);
  assert.doesNotMatch(source, /\bnavigator\s*(?:\.|\[)/);
  assert.match(source, /globalThis\.crypto\.subtle\.digest\('SHA-256'/);
});

test('Node global WebCrypto supports the generated browser digest', () => {
  assert.equal(typeof globalThis.crypto?.subtle?.digest, 'function');
});

test('valid metadata journal produces an equivalent bounded review', async () => {
  const result = await equivalent(serialize(journal()));
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.exit_code, 0);
  assert.equal(result.deltas[0].physical_identity_matching, 'NOT_PERFORMED');
  assert.equal(result.snapshots[1].operator_note.evidenceClass, 'USER_SIGNAL');
  assert.equal(result.bindingAllowed, false);
  assert.equal(result.physicalAcceptance, 'NOT_EVALUATED');
});

test('malformed journals produce equivalent INVALID reports', async () => {
  for (const rawText of ['', '{', '[]\n{}\n']) {
    const result = await equivalent(rawText);
    assert.equal(result.status, 'INVALID');
    assert.equal(result.exit_code, 4);
  }
});

test('missing end produces the same INVALID report', async () => {
  const rows = journal();
  rows.pop();
  const result = await equivalent(serialize(rows));
  assert.equal(result.status, 'INVALID');
  assert.equal(result.issues[0].code, 'INVALID_EVENT_ORDER_OR_MISSING_END');
});

test('mixed runs produce the same INVALID report', async () => {
  const rows = journal();
  rows[2].run_id = '12345678-1234-4234-8234-123456789abd';
  const result = await equivalent(serialize(rows));
  assert.equal(result.status, 'INVALID');
  assert.equal(result.issues[0].code, 'MIXED_RUNS');
});

test('journal and collector timing regressions remain equivalent and INVALID', async () => {
  const wallRows = journal();
  wallRows[2].recorded_at_utc = utc(0);
  let result = await equivalent(serialize(wallRows));
  assert.equal(result.issues[0].code, 'WALL_TIME_REGRESSION');

  const windowRows = journal();
  const output = JSON.parse(windowRows[1].data.collector_output);
  output.observedAtUtc = utc(2);
  output.completedAtUtc = utc(2);
  windowRows[1].data.collector_output = JSON.stringify(output);
  result = await equivalent(serialize(windowRows));
  assert.equal(result.issues[0].code, 'COLLECTOR_OUTSIDE_CHECKPOINT_WINDOW');
});

test('collector source-hash mismatch remains equivalent and INVALID', async () => {
  const rows = journal();
  const output = JSON.parse(rows[1].data.collector_output);
  output.scriptSha256 = 'd'.repeat(64);
  rows[1].data.collector_output = JSON.stringify(output);
  const result = await equivalent(serialize(rows));
  assert.equal(result.status, 'INVALID');
  assert.equal(result.issues[0].code, 'COLLECTOR_SOURCE_HASH_MISMATCH');
});

test('zero endpoints remain equivalent and INCONCLUSIVE without grants', async () => {
  const result = await equivalent(serialize(journal([[], []])));
  assert.equal(result.status, 'INCONCLUSIVE');
  assert.equal(result.exit_code, 3);
  assert.equal(result.recordingAcceptance, 'NOT_EVALUATED');
  assert.equal(result.hilGate, 'BLOCKED');
});
