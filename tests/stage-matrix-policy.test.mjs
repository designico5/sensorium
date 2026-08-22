import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const matrix = JSON.parse(await readFile(new URL('../docs/stage-test-matrix.json', import.meta.url), 'utf8'));
const ci = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

const expectedDomains = new Map([
  ['software', ['unit tests', 'integration tests', 'contract tests', 'property-based tests', 'parser fuzzing', 'snapshot and migration tests', 'real-browser E2E', 'accessibility', 'visual regression', 'offline and recovery', 'upgrade and rollback']],
  ['audio-hardware', ['buffer sizes', '44.1 / 48 / 88.2 / 96 / 192 kHz', 'ASIO', 'WASAPI Exclusive', 'CoreAudio', 'interface disconnect during playback', 'sample-rate change', 'clock-master loss', 'word-clock failure', 'XRUN and underrun handling', '8 / 12 / 24 hour soak', 'CPU spikes', 'memory pressure', 'thermal throttling', 'suspend and resume', 'USB hub failure']],
  ['midi', ['MIDI 1.0', 'MIDI 2.0', 'UMP', 'MPE', 'SysEx and large SysEx', 'Clock and Start/Stop/Continue', 'Song Position Pointer', 'hotplug and port changes', 'same-name endpoint disambiguation', 'device replacement', 'packet loss and burst traffic', 'malformed packets', 'rogue endpoint', 'panic and All Notes Off']],
  ['network-sync', ['cable pull and switch restart', 'packet loss, jitter, reordering and duplicates', '100 Mbit / 1 Gbit / WLAN', 'DHCP change and IP conflict', 'PTP master change and split brain', 'offline and rejoin', 'compromised certificate', 'unauthorized client', 'rate limiting and DoS resistance']],
  ['display-touch', ['Full HD / 1440p / 4K / 5K / 8K', '100 / 125 / 150 / 200 percent scaling', '60 / 90 / 120 / 144 Hz frame budget', 'real ten-point touch', 'two simultaneous faders', 'three or more gestures', 'touch plus pen and mouse', 'palm rejection', 'pointer cancel and lost capture', 'reduced motion and high contrast', 'glove and wet-touch conditions']],
  ['physical-acceptance', ['audio interface acceptance', 'MIDI endpoint acceptance', 'clock and network acceptance', 'S23 Ultra mobile acceptance', 'touch-display acceptance', 'disconnect/reconnect recovery', 'thermal and long-run acceptance']],
]);

test('stage matrix covers every required verification domain', () => {
  assert.equal(matrix.schemaVersion, '1.0.0');
  const domains = new Map(matrix.domains.map((domain) => [domain.id, domain]));

  for (const [domainId, names] of expectedDomains) {
    const domain = domains.get(domainId);
    assert.ok(domain, `missing domain ${domainId}`);
    const actual = new Set(domain.tests.map((testCase) => testCase.name));
    for (const name of names) assert.ok(actual.has(name), `${domainId} missing ${name}`);
  }
});

test('physical acceptance records require the complete evidence contract', () => {
  const domain = matrix.domains.find((entry) => entry.id === 'physical-acceptance');
  assert.deepEqual(domain.recordSchema, [
    'device', 'firmware', 'driver', 'os', 'connection', 'testCase',
    'expected', 'measured', 'latency', 'jitter', 'failureMode',
    'recoveryTime', 'log', 'timestamp', 'operator', 'result',
  ]);
  assert.ok(domain.tests.every((testCase) => testCase.status === 'HIL_REQUIRED'));
});

test('no physical test is falsely marked as passed', () => {
  for (const domain of matrix.domains.filter((entry) => entry.id !== 'software')) {
    for (const testCase of domain.tests) {
      assert.notEqual(testCase.status, 'PASS', `${testCase.id} has no physical evidence yet`);
    }
  }
});

test('parser fuzz target is present and independently buildable', async () => {
  await access(new URL('../sensorium-v2/fuzz/fuzz_targets/ump_parser.rs', import.meta.url));
  await access(new URL('../sensorium-v2/fuzz/Cargo.toml', import.meta.url));
  const fuzzCase = matrix.domains
    .find((domain) => domain.id === 'software')
    .tests.find((testCase) => testCase.id === 'SW-005');
  assert.ok(fuzzCase.evidence.includes('sensorium-v2/fuzz/fuzz_targets/ump_parser.rs'));
});

test('CI watches the real branch and runs the matrix plus active previews', () => {
  assert.match(ci, /branches:\s*\[master, main, develop\]/);
  assert.match(ci, /name:\s*Stage Matrix Contract/);
  assert.match(ci, /node --test tests\/stage-matrix-policy\.test\.mjs/);
  assert.match(ci, /name:\s*Sensorium V2 Frontend/);
  assert.match(ci, /name:\s*MA-II-MI Mobile Preview/);
  assert.match(ci, /name:\s*MIDI and Audio Safety Crates/);
  assert.match(ci, /cargo test -p sensorium-midi -p sensorium-audio -p sensorium-contracts --lib/);
  assert.match(ci, /name:\s*UMP Parser Fuzz Smoke Run/);
  assert.match(ci, /cargo fuzz run ump_parser/);
  assert.doesNotMatch(ci, /continue-on-error:\s*true/);
});
