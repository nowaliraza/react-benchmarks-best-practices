import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export async function hashFile(file) {
  return sha256(await readFile(file));
}

export async function hashDirectory(directory) {
  const entries = [];
  async function visit(current) {
    for (const name of (await readdir(current)).sort()) {
      const absolute = path.join(current, name);
      const details = await stat(absolute);
      if (details.isDirectory()) await visit(absolute);
      else entries.push(`${path.relative(directory, absolute)}\0${await hashFile(absolute)}`);
    }
  }
  await visit(directory);
  return sha256(entries.join('\n'));
}
