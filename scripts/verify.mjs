import { spawn } from 'node:child_process';
import { executeLab } from '../src/harness/node-runner.js';

function runTests() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['test'], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Tests exited with ${code}`)));
  });
}

const started = performance.now();
await runTests();
const { result, runDirectory } = await executeLab({ mode: 'verification', runId: `verify-${Date.now()}` });
if (result.gate.issues.length > 0) {
  console.error(JSON.stringify(result.gate.issues, null, 2));
  process.exitCode = 1;
} else if (!result.gate.expectedRejections.some(({ code }) => code === 'expected-intra-variant-rejection')) {
  console.error('The browser-backed planted intra-variant failure was not caught.');
  process.exitCode = 1;
} else {
  console.log(`Verification passed in ${((performance.now() - started) / 1000).toFixed(1)}s.`);
  console.log(`Artifact: ${runDirectory}`);
}
