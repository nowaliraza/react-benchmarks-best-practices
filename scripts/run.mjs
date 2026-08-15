import { executeLab } from '../src/harness/node-runner.js';

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
}

const mode = valueAfter('--mode') ?? 'fast';
const chapter = valueAfter('--chapter');
const { result, runDirectory } = await executeLab({ mode, chapter });

console.log(`Run saved to ${runDirectory}`);
console.log(`Observations: ${result.observations.length}`);
console.log(`Publishable: ${result.manifest.publishable}`);
if (result.gate.issues.length > 0) {
  console.error(JSON.stringify(result.gate.issues, null, 2));
  process.exitCode = 1;
}
