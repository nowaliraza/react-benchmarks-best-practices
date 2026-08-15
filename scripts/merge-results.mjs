import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from '../src/harness/manifest.js';
import { summarizeObservations } from '../src/harness/stats.js';

const runsRoot = path.join(projectRoot, 'artifacts/runs');
const entries = await readdir(runsRoot, { withFileTypes: true }).catch(() => []);
const completed = [];
for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
  try {
    const result = JSON.parse(await readFile(path.join(runsRoot, entry.name, 'result.json'), 'utf8'));
    if (result.gate.issues.length === 0 && result.operations.every(({ status }) => status === 'completed')) completed.push(result);
  } catch {
    // Partial runs intentionally remain on disk but cannot be merged.
  }
}
if (completed.length === 0) throw new Error('No completed compatible runs found.');

const compatibilityFields = [
  'reactVersion', 'reactDomVersion', 'schedulerVersion', 'chromeVersion', 'nodeVersion',
  'buildType', 'protocolVersion', 'registryHash', 'implementationCommit',
  'implementationBundleHash', 'amendmentLogHash',
];
const reference = completed[0].manifest;
for (const result of completed.slice(1)) {
  for (const field of compatibilityFields) {
    if (JSON.stringify(result.manifest[field]) !== JSON.stringify(reference[field])) {
      throw new Error(`Manifest incompatibility in ${field}: ${reference[field]} != ${result.manifest[field]}`);
    }
  }
}
const observations = completed.flatMap(({ observations }) => observations);
const merged = {
  schemaVersion: 1,
  sourceRunTimestamps: completed.map(({ manifest }) => manifest.timestamp),
  compatibility: Object.fromEntries(compatibilityFields.map((field) => [field, reference[field]])),
  observations,
  summaries: summarizeObservations(observations),
};
const outputDirectory = path.join(projectRoot, 'artifacts/merged');
await mkdir(outputDirectory, { recursive: true });
const output = path.join(outputDirectory, `merged-${Date.now()}.json`);
await writeFile(output, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`Merged ${completed.length} compatible runs into ${output}`);
