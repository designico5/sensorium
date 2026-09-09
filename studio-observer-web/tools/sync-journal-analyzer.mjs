import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const VENDORED_PATH = resolve(TOOL_DIRECTORY, 'analyze-studio-journal.node.mjs');
const BROWSER_PATH = resolve(TOOL_DIRECTORY, '../src/journal-analyzer.mjs');

const NODE_IMPORTS = `import { createHash } from 'node:crypto';
import { closeSync, openSync, readSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

`;

const NODE_DIGEST = `function digest(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}`;

const BROWSER_DIGEST = `const textEncoder = new TextEncoder();

function byteLength(text) {
  return textEncoder.encode(text).byteLength;
}

async function digest(text) {
  const bytes = textEncoder.encode(text);
  const digestBytes = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digestBytes), byte => byte.toString(16).padStart(2, '0')).join('');
}`;

export function generateBrowserAnalyzer(nodeSource) {
  assert.equal(typeof nodeSource, 'string', 'Vendored analyzer must be text');
  assert.ok(nodeSource.startsWith(NODE_IMPORTS), 'Unexpected Node import prelude');
  assert.equal(nodeSource.split(NODE_DIGEST).length, 2, 'Unexpected digest implementation');
  assert.equal((nodeSource.match(/Buffer\.byteLength\(/g) ?? []).length, 2,
    'Unexpected byte-length call count');
  assert.equal((nodeSource.match(/export function analyzeJournal\(rawText\)/g) ?? []).length, 1,
    'Unexpected analyzer export');
  assert.equal((nodeSource.match(/rawHash = digest\(rawText\);/g) ?? []).length, 1,
    'Unexpected journal digest call');

  const cliMarker = '\nfunction cli(args) {';
  const cliIndex = nodeSource.indexOf(cliMarker);
  assert.ok(cliIndex > 0, 'Node CLI marker missing');
  assert.equal(nodeSource.indexOf(cliMarker, cliIndex + 1), -1, 'Duplicate Node CLI marker');

  const sourceSha256 = createHash('sha256').update(nodeSource, 'utf8').digest('hex');
  let browserSource = nodeSource.slice(NODE_IMPORTS.length, cliIndex);
  browserSource = browserSource
    .replace(NODE_DIGEST, BROWSER_DIGEST)
    .replaceAll('Buffer.byteLength(', 'byteLength(')
    .replace('export function analyzeJournal(rawText)', 'export async function analyzeJournal(rawText)')
    .replace('rawHash = digest(rawText);', 'rawHash = await digest(rawText);');

  assert.doesNotMatch(browserSource, /(?:from\s+['"]node:|require\s*\(|\bprocess\.|\bBuffer\b|\bopenSync\b|\breadSync\b|\bcloseSync\b)/,
    'Generated browser module retained a Node API');

  return `// GENERATED FILE. DO NOT EDIT.\n// Vendored Node source SHA-256: ${sourceSha256}\n${browserSource}`;
}

export async function synchronize({ check = false } = {}) {
  const nodeSource = await readFile(VENDORED_PATH, 'utf8');
  const expected = generateBrowserAnalyzer(nodeSource);
  if (check) {
    const current = await readFile(BROWSER_PATH, 'utf8');
    assert.equal(current, expected, 'Generated browser analyzer is stale');
  } else {
    await writeFile(BROWSER_PATH, expected, 'utf8');
  }
  return expected;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await synchronize({ check: process.argv.slice(2).includes('--check') });
}
