import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_FIELDS = [
  'device', 'firmware', 'driver', 'os', 'connection', 'testCase',
  'expected', 'measured', 'latency', 'jitter', 'failureMode',
  'recoveryTime', 'log', 'timestamp', 'operator', 'result',
];

const RESULTS = new Set(['PASS', 'FAIL', 'PENDING']);

export function validateEvidenceRecord(record) {
  const errors = [];
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return ['record must be a JSON object'];
  }

  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) errors.push(`missing ${field}`);
  }
  for (const field of Object.keys(record)) {
    if (!REQUIRED_FIELDS.includes(field)) errors.push(`unexpected ${field}`);
  }

  for (const field of REQUIRED_FIELDS.filter((name) => !['latency', 'jitter', 'recoveryTime', 'result'].includes(name))) {
    if (typeof record[field] !== 'string' || record[field].trim().length === 0) errors.push(`${field} must be a non-empty string`);
  }
  for (const field of ['latency', 'jitter', 'recoveryTime']) {
    if (typeof record[field] !== 'number' || !Number.isFinite(record[field]) || record[field] < 0) {
      errors.push(`${field} must be a finite non-negative number`);
    }
  }
  if (!RESULTS.has(record.result)) errors.push('result must be PASS, FAIL or PENDING');
  if (typeof record.timestamp === 'string' && Number.isNaN(Date.parse(record.timestamp))) {
    errors.push('timestamp must be an ISO-8601 date-time');
  }
  if (record.result === 'PASS') {
    for (const field of REQUIRED_FIELDS) {
      if (typeof record[field] === 'string' && record[field].includes('OWNER_INPUT_REQUIRED')) {
        errors.push(`PASS record cannot contain placeholder ${field}`);
      }
    }
  }
  return errors;
}

async function collectJsonFiles(directory) {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectJsonFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(fullPath);
  }
  return files;
}

export async function validateEvidenceDirectory(directory) {
  const files = await collectJsonFiles(directory);
  const failures = [];
  for (const file of files) {
    let record;
    try {
      record = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      failures.push(`${file}: invalid JSON (${error.message})`);
      continue;
    }
    for (const error of validateEvidenceRecord(record)) failures.push(`${file}: ${error}`);
  }
  return { files, failures };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const directory = path.resolve(process.argv[2] ?? 'evidence/stage');
  const result = await validateEvidenceDirectory(directory);
  if (result.files.length === 0) {
    console.log(`No HIL evidence records found in ${directory}; physical status remains PENDING.`);
    process.exit(0);
  }
  if (result.failures.length > 0) {
    for (const failure of result.failures) console.error(failure);
    process.exit(1);
  }
  console.log(`Validated ${result.files.length} HIL evidence record(s).`);
}
