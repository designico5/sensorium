import { statfsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function diskSpace(pathname) {
  const stats = statfsSync(pathname);
  const blockSize = Number(stats.bsize ?? stats.frsize);
  return {
    path: path.resolve(pathname),
    freeBytes: Number(stats.bavail) * blockSize,
    totalBytes: Number(stats.blocks) * blockSize,
  };
}

export function assertMinimumFreeSpace(pathname, minimumGb = 25) {
  const space = diskSpace(pathname);
  const minimumBytes = minimumGb * 1024 ** 3;
  if (space.freeBytes < minimumBytes) {
    const freeGb = (space.freeBytes / 1024 ** 3).toFixed(2);
    throw new Error(`Gate 0: only ${freeGb} GB free at ${space.path}; need at least ${minimumGb} GB before a full build`);
  }
  return space;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const targetIndex = process.argv.indexOf('--path');
  const minimumIndex = process.argv.indexOf('--minimum-gb');
  const target = targetIndex >= 0 ? process.argv[targetIndex + 1] : '.';
  const minimumGb = minimumIndex >= 0 ? Number(process.argv[minimumIndex + 1]) : 25;
  try {
    const space = assertMinimumFreeSpace(target, minimumGb);
    console.log(`Disk gate OK: ${(space.freeBytes / 1024 ** 3).toFixed(2)} GB free at ${space.path}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
