import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const REQUIRED = ['index.html', 'package.json', 'src/main.jsx', 'src/styles.css', 'src/journal-analyzer.mjs', 'src/observer-snapshot.json'];
const read = (name) => readFileSync(path.join(ROOT, name), 'utf8');

function sources() {
  const files = [];
  function walk(directory) {
    for (const name of readdirSync(path.join(ROOT, directory))) {
      const relative = `${directory}/${name}`;
      const stat = lstatSync(path.join(ROOT, relative));
      assert.equal(stat.isSymbolicLink(), false, `Source symlink requires review: ${relative}`);
      if (stat.isDirectory()) walk(relative);
      else if (/\.(?:[cm]?js|jsx|tsx?|css|html)$/.test(name)) files.push([relative, read(relative)]);
    }
  }
  walk('src');
  return [['index.html', read('index.html')], ...files];
}

const NETWORK = /\b(?:fetch|WebSocket|XMLHttpRequest|EventSource|WebTransport|RTCPeerConnection|webkitRTCPeerConnection|sendBeacon|importScripts)\b/;
const DEVICES = /\b(?:requestMIDIAccess|getUserMedia|getDisplayMedia|enumerateDevices|requestDevice|requestPort)\b|\b(?:navigator|globalThis\s*\.\s*navigator|window\s*\.\s*navigator)\s*(?:\?\.)?\s*(?:\.\s*(?:serial|bluetooth|usb|hid|mediaDevices)\b|\[\s*['"](?:serial|bluetooth|usb|hid|mediaDevices)['"]\s*\])/i;
const AUDIO = /\b(?:AudioContext|OfflineAudioContext|webkitAudioContext|AudioWorklet|MediaRecorder|Audio)\s*(?:\(|\b)|<\s*(?:audio|video)\b/;
const INJECTION = /\b(?:dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|DOMParser|createContextualFragment|srcDoc|eval)\b|\bdocument\s*\.\s*(?:write|writeln)\s*\(|\bnew\s+Function\s*\(/i;
const EXTERNAL = /(?:\b(?:src|href|srcset|action|formAction|poster)\s*=\s*(?:\{\s*)?['"]\s*(?:[a-z][a-z\d+.-]*:|\/\/))|(?:\b(?:from|import)\s*(?:\(\s*)?['"]\s*(?:https?:|\/\/))|(?:@import\s*(?:url\(\s*)?['"]?\s*(?:https?:|\/\/))|(?:url\(\s*['"]?\s*(?:https?:|\/\/))/i;

function forbid(pattern) {
  for (const [name, content] of sources()) assert.doesNotMatch(content, pattern, name);
}

test('all six required app inputs exist before source acceptance', () => {
  const missing = REQUIRED.filter((name) => !existsSync(path.join(ROOT, name)));
  assert.deepEqual(missing, [], `Incomplete app inputs: ${missing.join(', ')}`);
});

test('browser sources contain no network transport or upload API', () => forbid(NETWORK));
test('browser sources contain no MIDI, capture, serial, Bluetooth, USB or HID access', () => forbid(DEVICES));
test('browser sources contain no audio/video capture or playback API', () => forbid(AUDIO));
test('journal content cannot enter a raw HTML or code evaluation sink', () => forbid(INJECTION));
test('HTML, CSS and browser modules contain no external resource references', () => {
  forbid(EXTERNAL);
  assert.doesNotMatch(read('index.html'), /<\s*(?:base|iframe|object|embed)\b|http-equiv\s*=\s*['"]?refresh\b|\bon\w+\s*=/i);
});

test('snapshot is imported as static JSON and not refreshed as a live feed', () => {
  const main = read('src/main.jsx');
  assert.match(main, /\bimport\s+[\s\S]*?\bfrom\s*['"]\.\/observer-snapshot\.json['"]/);
  assert.doesNotMatch(main, /\b(?:setInterval|EventSource|WebSocket)\b/);
  assert.match(main, /snapshot/i);
});

function leaves(value, keyPath = '') {
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => leaves(child, `${keyPath}.${key}`));
  return [[keyPath, value]];
}

test('source snapshot carries provenance and never claims live hardware approval', () => {
  const snapshot = JSON.parse(read('src/observer-snapshot.json'));
  assert.ok(snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot));
  const entries = leaves(snapshot);
  assert.ok(entries.some(([key]) => /source|provenance/i.test(key)), 'Snapshot needs source provenance');
  assert.ok(entries.some(([key, value]) => /hash|sha256/i.test(key) && /^[a-f\d]{64}$/i.test(value)), 'Snapshot needs a source SHA-256');
  assert.ok(entries.some(([, value]) => value === 'INVENTORY_ONLY'), 'Snapshot must carry INVENTORY_ONLY');
  for (const [key, value] of entries) {
    if (/\.(?:live|isLive|realtime|realTime|connected|detected|writeIoAllowed|routingMutationAllowed|powerControlAllowed)$/i.test(key)) {
      assert.notEqual(value, true, `Unsupported live/grant claim: ${key}`);
    }
    if (/\.operationalApproval$/i.test(key)) assert.equal(value, 'NOT_GRANTED', key);
    if (/\.(?:hardwareAcceptance|physicalAcceptance)$/i.test(key)) assert.equal(value, 'NOT_EVALUATED', key);
  }
});

test('UI distinguishes local journal import, manual USER_SIGNAL and snapshot evidence', () => {
  const main = read('src/main.jsx');
  assert.match(main, /type\s*=\s*['"]file['"]/);
  assert.match(main, /\.text\s*\(|\bFileReader\b/);
  assert.match(main, /USER_SIGNAL/);
  assert.match(main, /INVENTORY_ONLY/);
  assert.match(main, /NOT_GRANTED/);
  assert.match(main, /NOT_EVALUATED/);
  assert.doesNotMatch(main, /(?:operationalApproval\s*:\s*['"]GRANTED|hardwareAcceptance\s*:\s*['"]PASS|\b(?:live|realtime|isLive|autoDetected)\s*:\s*true)/i);
  assert.doesNotMatch(main, /[>"'`]\s*(?:Hardware verified|Hardware ready|Live connected|Geräte automatisch erkannt|Hardware freigegeben)\s*[<"'`]/i);
});

test('build produces relative static assets and test command includes boundary tests', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts?.build ?? '', /\bvite\s+build\b/);
  assert.match(pkg.scripts.build, /--base(?:=|\s+)['"]?\.\//);
  assert.match(pkg.scripts?.test ?? '', /\bnode\b.*--test\b/);
  assert.match(pkg.scripts.test, /tests(?:\/|\b)/);
  assert.doesNotMatch(JSON.stringify(pkg.scripts), /\b(?:gh-pages|git\s+push|npm\s+publish|wrangler|vercel\s+deploy)\b/);
});

test('German README describes local commands, evidence limits and publication ownership', () => {
  const readme = read('README.md');
  for (const text of ['npm install', 'npm test', 'npm run build', 'USER_SIGNAL', 'INVENTORY_ONLY', 'NOT_GRANTED', 'NOT_EVALUATED', 'Snapshot', 'JSONL', 'GitHub', 'Branch']) {
    assert.ok(readme.includes(text), `Missing README boundary: ${text}`);
  }
  assert.match(readme, /keine Echtzeitmessung/);
  assert.match(readme, /nicht zu einem Server hoch/);
});

test('guards reject representative direct and computed boundary violations', () => {
  for (const [pattern, sample] of [
    [NETWORK, "window['fetch']('/upload')"], [NETWORK, "new WebSocket('wss://example.invalid')"],
    [DEVICES, "navigator['usb'].getDevices()"], [DEVICES, 'navigator.requestMIDIAccess()'],
    [DEVICES, 'navigator.mediaDevices.getUserMedia({audio:true})'], [AUDIO, 'new AudioContext()'],
    [INJECTION, 'node.innerHTML = journal'], [INJECTION, 'dangerouslySetInnerHTML={{__html: journal}}'],
    [EXTERNAL, '<script src="https://example.invalid/script.js"></script>'],
    [EXTERNAL, '@import "https://example.invalid/font.css";'],
  ]) assert.match(sample, pattern, sample);
});
