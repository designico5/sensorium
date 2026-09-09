// GENERATED FILE. DO NOT EDIT.
// Vendored Node source SHA-256: c14acdd202439e934734b492a595fa1e90fe791fb532e5b407591aab46ea4869
const RAW_SCHEMA = 'sensorium.studio-inventory-journal.v1';
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const EXITS = { REVIEW_REQUIRED: 0, INCONCLUSIVE: 3, BLOCKED: 2, INVALID: 4 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HASH = /^[0-9a-fA-F]{64}$/;
const ID = /^[0-9a-f]{32}$/;
const ROW_KEYS = ['schema', 'run_id', 'sequence', 'recorded_at_utc', 'elapsed_ms',
  'event', 'scope', 'operationalApproval', 'data'];
const INVENTORY_KEYS = ['schemaVersion', 'collectorVersion', 'recordType', 'scope',
  'result', 'reason', 'evidenceClass', 'observedAtUtc', 'completedAtUtc', 'snapshot_id',
  'provider_instance_id', 'source', 'scriptSha256', 'enumeration_state', 'stable_id',
  'identity_stability', 'freshness', 'expiresAtUtc', 'bindingAllowed', 'portOpenAllowed',
  'routingMutationAllowed', 'writeIoAllowed', 'operationalApproval', 'physicalAcceptance',
  'recordingAcceptance', 'limits', 'endpoints'];
const ENDPOINT_KEYS = ['deviceIndex', 'displayName', 'manufacturerId', 'productId',
  'driverVersionRaw', 'direction', 'stable_id', 'resolution', 'identity_stability',
  'firmware', 'confidence', 'confidenceRationale'];
const METADATA_KEYS = ['deviceIndex', 'displayName', 'manufacturerId', 'productId',
  'driverVersionRaw', 'direction'];

function requireValue(condition, code) {
  if (!condition) throw new Error(code);
}

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function keys(value, expected, code) {
  requireValue(object(value) && Object.keys(value).length === expected.length
    && expected.every(key => Object.hasOwn(value, key)), code);
}

function integer(value, max = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= 0 && value <= max;
}

function hash(value) {
  return typeof value === 'string' && HASH.test(value);
}

const textEncoder = new TextEncoder();

function byteLength(text) {
  return textEncoder.encode(text).byteLength;
}

async function digest(text) {
  const bytes = textEncoder.encode(text);
  const digestBytes = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digestBytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Date.parse alone silently normalizes invalid dates and loses PowerShell's
// sub-millisecond precision. Compare UTC ticks at 100 ns without certifying clocks.
function utcTicks(value) {
  requireValue(typeof value === 'string', 'INVALID_UTC_TIME');
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,7}))?(?:Z|\+00:00)$/.exec(value);
  requireValue(match !== null, 'INVALID_UTC_TIME');
  const ms = Date.parse(`${match[1]}Z`);
  requireValue(Number.isFinite(ms)
    && new Date(ms).toISOString() === `${match[1]}.000Z`, 'INVALID_UTC_TIME');
  return BigInt(ms) * 10000n + BigInt((match[2] ?? '').padEnd(7, '0'));
}

function parseObject(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('MALFORMED_JSON'); }
  requireValue(object(parsed), 'JSON_OBJECT_REQUIRED');
  // JSON.parse accepts duplicate keys. Reject them before trusting safety labels;
  // this scanner only examines structural tokens after JSON syntax has validated.
  const stack = [];
  let previous;
  for (const [token] of text.matchAll(/"(?:[^"\\]|\\[\s\S])*"|[{}\[\],:]/g)) {
    if (token === '{' || token === '[') {
      stack.push(token === '{' ? new Set() : null);
      requireValue(stack.length <= 32, 'JSON_DEPTH_LIMIT');
    } else if (token === '}' || token === ']') {
      stack.pop();
    } else if (token === ':') {
      const key = JSON.parse(previous);
      const seen = stack.at(-1);
      requireValue(!seen.has(key), 'DUPLICATE_JSON_KEY');
      seen.add(key);
    }
    previous = token;
  }
  return parsed;
}

function report(status, extra = {}) {
  return {
    ...extra,
    schema: 'RAW_JOURNAL_REVIEW',
    status,
    exit_code: EXITS[status],
    scope: 'INVENTORY_ONLY',
    bindingAllowed: false,
    portOpenAllowed: false,
    routingMutationAllowed: false,
    writeIoAllowed: false,
    operationalApproval: 'NOT_GRANTED',
    physicalAcceptance: 'NOT_EVALUATED',
    recordingAcceptance: 'NOT_EVALUATED',
    activeGates: 'BLOCKED',
    hilGate: 'BLOCKED',
    limits: [
      'Local raw-journal review, not Recovery EvidenceEnvelope or recorder acceptance.',
      'Manual checkpoints only; no automatic polling or USB event stream.',
      'WinMM input metadata is not universal device enumeration or physical identity.',
      'Metadata multiset differences never establish physical arrival, removal or rematching.',
      'Operator notes are USER_SIGNAL; manual approvals are never inferred.',
      'Hash and schema validation are not authentication; clocks are not certified.',
      'No binding, active I/O, DAW, recording, HIL or release grant is produced.',
    ],
  };
}

function inventory(raw, expectedHash, exitCode) {
  const value = parseObject(raw);
  keys(value, INVENTORY_KEYS, 'INVALID_COLLECTOR_FIELDS');
  const fixed = {
    schemaVersion: '2', collectorVersion: '2.0-inventory-only',
    recordType: 'midi_input_inventory', scope: 'INVENTORY_ONLY',
    source: 'Windows WinMM input capability API', stable_id: null,
    identity_stability: 'unresolved', expiresAtUtc: null, bindingAllowed: false,
    portOpenAllowed: false, routingMutationAllowed: false, writeIoAllowed: false,
    operationalApproval: 'NOT_GRANTED', physicalAcceptance: 'NOT_EVALUATED',
    recordingAcceptance: 'NOT_EVALUATED',
  };
  requireValue(Object.entries(fixed).every(([key, expected]) => value[key] === expected),
    'UNSAFE_OR_UNSUPPORTED_COLLECTOR_LABEL');
  requireValue(Array.isArray(value.limits) && value.limits.length <= 32
    && value.limits.every(item => typeof item === 'string'), 'INVALID_COLLECTOR_LIMITS');
  requireValue(Array.isArray(value.endpoints) && value.endpoints.length <= 1024,
    'INVALID_ENDPOINTS');

  if (value.result === 'BLOCKED') {
    requireValue(exitCode === 2 && value.evidenceClass === 'UNAVAILABLE'
      && value.enumeration_state === 'not_run' && value.freshness === 'unknown'
      && value.observedAtUtc === null && value.snapshot_id === null
      && value.provider_instance_id === null && value.endpoints.length === 0
      && ['ACTIVE_OBSERVATION_WITHDRAWN', 'SELECTION_NOT_ALLOWED_IN_INVENTORY',
        'WINDOWS_REQUIRED', 'INVENTORY_NOT_COMPLETED', 'NATIVE_COMPILATION_FAILED',
        'SOURCE_HASH_FAILED', 'ENUMERATION_FAILED'].includes(value.reason),
    'INVALID_BLOCKED_COLLECTOR');
    if (value.completedAtUtc !== null) utcTicks(value.completedAtUtc);
    // Actual v2 early failures emit no source hash. They cannot become accepted
    // snapshots, even when the surrounding raw journal is structurally complete.
    requireValue(value.scriptSha256 === null
      || (hash(value.scriptSha256) && value.scriptSha256.toLowerCase() === expectedHash),
    'COLLECTOR_SOURCE_HASH_MISMATCH');
    return { blocked: true, hashMatches: value.scriptSha256 !== null, reason: value.scriptSha256 === null
      ? 'COLLECTOR_SOURCE_HASH_UNAVAILABLE' : 'COLLECTOR_BLOCKED', metadata: [] };
  }

  requireValue(hash(value.scriptSha256) && value.scriptSha256.toLowerCase() === expectedHash,
    'COLLECTOR_SOURCE_HASH_MISMATCH');
  const empty = value.endpoints.length === 0;
  requireValue(value.result === (empty ? 'INCONCLUSIVE' : 'INVENTORY_CAPTURED_REVIEW_REQUIRED')
    && value.reason === (empty ? 'NO_WINMM_INPUT_ENDPOINTS_REPORTED' : 'OS_ENDPOINT_METADATA_ONLY')
    && value.evidenceClass === (empty ? 'OBSERVED_SOURCE' : 'OBSERVED_PORT')
    && exitCode === (empty ? 3 : 0) && value.enumeration_state === 'complete'
    && value.freshness === 'captured_now_not_valid_for_binding', 'INVALID_COLLECTOR_RESULT');
  requireValue(typeof value.snapshot_id === 'string' && ID.test(value.snapshot_id)
    && typeof value.provider_instance_id === 'string' && ID.test(value.provider_instance_id),
  'INVALID_SNAPSHOT_ID');
  const observed = utcTicks(value.observedAtUtc);
  const completed = utcTicks(value.completedAtUtc);
  requireValue(completed >= observed, 'COLLECTOR_TIME_REGRESSION');
  const metadata = value.endpoints.map(endpoint => {
    keys(endpoint, ENDPOINT_KEYS, 'INVALID_ENDPOINT_FIELDS');
    requireValue(integer(endpoint.deviceIndex, 1023)
      && typeof endpoint.displayName === 'string'
      && integer(endpoint.manufacturerId, 65535) && integer(endpoint.productId, 65535)
      && integer(endpoint.driverVersionRaw, 0xffffffff), 'INVALID_ENDPOINT_METADATA');
    requireValue(endpoint.direction === 'input' && endpoint.stable_id === null
      && endpoint.resolution === 'unknown' && endpoint.identity_stability === 'unresolved'
      && endpoint.firmware === null && endpoint.confidence === 'unknown'
      && endpoint.confidenceRationale === 'OS capability label only; physical owner binding absent',
    'UNSAFE_ENDPOINT_IDENTITY_CLAIM');
    return Object.fromEntries(METADATA_KEYS.map(key => [key, endpoint[key]]));
  });
  return { blocked: false, hashMatches: true, metadata, observed, completed, snapshot_id: value.snapshot_id };
}

function multiset(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = JSON.stringify(row);
    const entry = counts.get(key) ?? { metadata: row, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return counts;
}

function duplicates(rows, key) {
  const counts = new Map();
  for (const row of rows) counts.set(row[key], (counts.get(row[key]) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

function difference(before, after) {
  const left = multiset(before);
  const right = multiset(after);
  const subtract = (a, b) => [...a].flatMap(([key, entry]) => {
    const count = entry.count - (b.get(key)?.count ?? 0);
    return count > 0 ? [{ metadata: entry.metadata, count }] : [];
  });
  return {
    only_in_previous_metadata: subtract(left, right),
    only_in_current_metadata: subtract(right, left),
    physical_identity_matching: 'NOT_PERFORMED',
  };
}

/** Pure, bounded validation and comparison of one local manual raw journal. */
export async function analyzeJournal(rawText) {
  let line;
  let rawHash;
  try {
    requireValue(typeof rawText === 'string', 'RAW_TEXT_REQUIRED');
    requireValue(byteLength(rawText, 'utf8') <= MAX_BYTES, 'JOURNAL_BYTE_LIMIT');
    rawHash = await digest(rawText);
    const lines = rawText.replace(/^\uFEFF/, '').split(/\r?\n/, 24);
    if (lines.at(-1) === '') lines.pop();
    requireValue(lines.length <= 22, 'JOURNAL_LINE_LIMIT');
    requireValue(lines.length >= 2, 'INCOMPLETE_JOURNAL');
    const rows = [];
    let previousTime;
    let previousElapsed = -1;
    for (const [index, text] of lines.entries()) {
      line = index + 1;
      const row = parseObject(text);
      keys(row, ROW_KEYS, 'INVALID_JOURNAL_FIELDS');
      requireValue(row.schema === RAW_SCHEMA && row.scope === 'INVENTORY_ONLY'
        && row.operationalApproval === 'NOT_GRANTED', 'UNSAFE_OR_UNSUPPORTED_JOURNAL_LABEL');
      requireValue(typeof row.run_id === 'string' && UUID.test(row.run_id), 'INVALID_RUN_ID');
      requireValue(index === 0 || row.run_id === rows[0].run_id, 'MIXED_RUNS');
      requireValue(row.sequence === index && integer(row.sequence), 'INVALID_SEQUENCE');
      requireValue(integer(row.elapsed_ms) && row.elapsed_ms >= previousElapsed,
        'ELAPSED_TIME_REGRESSION');
      const time = utcTicks(row.recorded_at_utc);
      requireValue(previousTime === undefined || time >= previousTime, 'WALL_TIME_REGRESSION');
      const expectedEvent = index === 0 ? 'start' : index === lines.length - 1 ? 'end' : 'checkpoint';
      requireValue(row.event === expectedEvent, 'INVALID_EVENT_ORDER_OR_MISSING_END');
      requireValue(object(row.data), 'INVALID_EVENT_DATA');
      previousTime = time;
      previousElapsed = row.elapsed_ms;
      rows.push(row);
    }
    const start = rows[0].data;
    line = 1;
    keys(start, ['journal_script_sha256', 'collector_script_sha256', 'capture_mode',
      'checkpoint_limit'], 'INVALID_START_FIELDS');
    requireValue(hash(start.journal_script_sha256) && hash(start.collector_script_sha256),
      'INVALID_SOURCE_HASH');
    requireValue(start.capture_mode === 'manual_checkpoint' && start.checkpoint_limit === 20,
      'INVALID_CAPTURE_MODE_OR_LIMIT');
    const end = rows.at(-1).data;
    line = rows.length;
    keys(end, ['reason', 'checkpoint_count'], 'INVALID_END_FIELDS');
    requireValue(['operator_finished', 'checkpoint_limit', 'collector_failure'].includes(end.reason),
      'INVALID_END_REASON');
    requireValue(integer(end.checkpoint_count, 20) && end.checkpoint_count === rows.length - 2,
      'CHECKPOINT_COUNT_MISMATCH');
    requireValue(end.reason !== 'checkpoint_limit' || end.checkpoint_count === 20,
      'CHECKPOINT_LIMIT_NOT_REACHED');

    const snapshots = [];
    const deltas = [];
    const issues = [];
    const snapshotIds = new Set();
    let previousCompleted;
    let previousSnapshot;
    for (const row of rows.slice(1, -1)) {
      line = row.sequence + 1;
      const data = row.data;
      keys(data, ['operator_note', 'collector_exit_code', 'collector_output'],
        'INVALID_CHECKPOINT_FIELDS');
      requireValue(typeof data.operator_note === 'string' && data.operator_note.length <= 512,
        'INVALID_OPERATOR_NOTE');
      requireValue(Number.isSafeInteger(data.collector_exit_code), 'INVALID_COLLECTOR_EXIT_CODE');
      requireValue(typeof data.collector_output === 'string'
        && byteLength(data.collector_output, 'utf8') <= MAX_OUTPUT_BYTES,
      'COLLECTOR_OUTPUT_BYTE_LIMIT');
      const capture = inventory(data.collector_output, start.collector_script_sha256.toLowerCase(),
        data.collector_exit_code);
      if (capture.blocked) {
        issues.push({ code: capture.reason, sequence: row.sequence });
        previousSnapshot = undefined;
      } else {
        requireValue(!snapshotIds.has(capture.snapshot_id), 'DUPLICATE_SNAPSHOT_ID');
        snapshotIds.add(capture.snapshot_id);
        requireValue(previousCompleted === undefined || capture.observed >= previousCompleted,
          'COLLECTOR_TIME_REGRESSION');
        requireValue(capture.observed >= utcTicks(rows[row.sequence - 1].recorded_at_utc)
          && capture.completed <= utcTicks(row.recorded_at_utc), 'COLLECTOR_OUTSIDE_CHECKPOINT_WINDOW');
        previousCompleted = capture.completed;
      }
      const snapshot = {
        sequence: row.sequence,
        status: capture.blocked ? 'BLOCKED' : capture.metadata.length === 0 ? 'INCONCLUSIVE' : 'REVIEW_REQUIRED',
        source_hash_matches_start: capture.hashMatches,
        operator_note: { value: data.operator_note, evidenceClass: 'USER_SIGNAL' },
        endpoint_metadata: capture.metadata,
        ambiguity: {
          duplicate_indexes: duplicates(capture.metadata, 'deviceIndex'),
          duplicate_names: duplicates(capture.metadata, 'displayName'),
          duplicate_metadata_rows: [...multiset(capture.metadata).values()].filter(item => item.count > 1),
        },
      };
      snapshots.push(snapshot);
      if (!capture.blocked) {
        if (previousSnapshot) deltas.push({
          from_sequence: previousSnapshot.sequence,
          to_sequence: row.sequence,
          ...difference(previousSnapshot.endpoint_metadata, snapshot.endpoint_metadata),
        });
        previousSnapshot = snapshot;
      }
    }
    if (end.reason === 'collector_failure') issues.push({ code: 'CAPTURE_ENDED_COLLECTOR_FAILURE' });
    const status = issues.length ? 'BLOCKED'
      : snapshots.length < 2 || snapshots.some(item => item.status === 'INCONCLUSIVE')
        ? 'INCONCLUSIVE' : 'REVIEW_REQUIRED';
    return report(status, {
      journal_sha256: rawHash, run_id: rows[0].run_id,
      journal_script_sha256: start.journal_script_sha256.toLowerCase(),
      collector_script_sha256: start.collector_script_sha256.toLowerCase(),
      source_binding: 'DECLARED_START_HASH_ONLY_NOT_AUTHENTICATED',
      checkpoint_count: end.checkpoint_count, end_reason: end.reason,
      snapshots, deltas, issues,
    });
  } catch (error) {
    return report('INVALID', {
      ...(rawHash ? { journal_sha256: rawHash } : {}),
      issues: [{ code: error.message, ...(line === undefined ? {} : { line }) }],
    });
  }
}
