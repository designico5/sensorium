import assert from 'node:assert/strict';
import test from 'node:test';
import { assertMinimumFreeSpace, diskSpace } from '../scripts/check-disk-space.mjs';

test('disk gate reports a real filesystem and accepts a zero threshold', () => {
  const space = diskSpace(process.cwd());
  assert.ok(space.freeBytes >= 0);
  assert.ok(space.totalBytes >= space.freeBytes);
  assert.doesNotThrow(() => assertMinimumFreeSpace(process.cwd(), 0));
});

test('disk gate rejects an impossible threshold with a clear Gate 0 error', () => {
  assert.throws(
    () => assertMinimumFreeSpace(process.cwd(), Number.MAX_SAFE_INTEGER),
    /Gate 0: only .* need at least/,
  );
});
