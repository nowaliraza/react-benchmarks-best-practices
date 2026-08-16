import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import config from '../lab.config.js';
import { assertFaultMatrix, runFaultInjectionMatrix } from '../src/harness/fault-injection.js';
import { hashFile } from '../src/harness/hash.js';
import { executeLab, waitForPreview } from '../src/harness/node-runner.js';
import { projectRoot } from '../src/harness/manifest.js';
import { registry } from '../src/registry.js';

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
  const expected = {
    ...config.expectedVersions,
    protocolVersion: config.protocolVersion,
    registryHash: await hashFile(path.join(projectRoot, 'src/registry.js')),
  };
  const faultMatrix = await runFaultInjectionMatrix({
    baseline: result,
    registry,
    expected,
    previewFailureProbe: () => waitForPreview('http://127.0.0.1:1', 25),
  });
  await writeFile(path.join(runDirectory, 'fault-matrix.json'), `${JSON.stringify(faultMatrix, null, 2)}\n`);
  assertFaultMatrix(faultMatrix);
  console.log(`Verification passed in ${((performance.now() - started) / 1000).toFixed(1)}s.`);
  console.log(`Planted failures caught: ${faultMatrix.length}/${faultMatrix.length}.`);
  console.log(`Artifact: ${runDirectory}`);
}
