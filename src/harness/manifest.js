import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROTOCOL_VERSION } from '../protocol/constants.js';
import { hashDirectory, hashFile } from './hash.js';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function git(args, fallback = null) {
  try {
    return (await execFileAsync('git', args, { cwd: projectRoot })).stdout.trim();
  } catch {
    return fallback;
  }
}

export async function repositoryState() {
  const status = await git(['status', '--porcelain=v1', '--untracked-files=all'], '__git_unavailable__');
  return {
    workingTreeClean: status === '',
    status,
    commit: await git(['rev-parse', 'HEAD'], 'uncommitted'),
  };
}

function resolvedPackage(lock, name) {
  return lock.packages[`node_modules/${name}`]?.version ?? null;
}

export async function createManifest({
  mode,
  chromeVersion,
  registry,
  executionOrders,
  enabledInstruments,
  samplingBudgets,
  browserProcessCount,
  timeoutMs,
  resumeAttempts = [],
}) {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8'));
  const repository = await repositoryState();
  const registryPath = path.join(projectRoot, 'src/registry.js');
  const amendmentsPath = path.join(projectRoot, 'AMENDMENTS.md');
  const scenarioCount = registry.length;
  const variantCount = registry.reduce((sum, scenario) => sum + scenario.variants.length, 0);
  return {
    reactVersion: resolvedPackage(lock, 'react'),
    reactDomVersion: resolvedPackage(lock, 'react-dom'),
    schedulerVersion: resolvedPackage(lock, 'scheduler'),
    chromeVersion,
    nodeVersion: process.version,
    buildType: 'production',
    protocolVersion: PROTOCOL_VERSION,
    registryHash: await hashFile(registryPath),
    registryCommit: repository.commit,
    implementationCommit: repository.commit,
    implementationBundleHash: await hashDirectory(path.join(projectRoot, 'dist')),
    amendmentLogHash: await hashFile(amendmentsPath),
    scenarioCount,
    variantCount,
    executionOrders,
    evidenceProfile: [...new Set(registry.map((entry) => entry.evidenceProfile.name))],
    enabledInstruments,
    samplingBudgets,
    browserProcessCount,
    resumeAttempts,
    cpu: cpus().map(({ model, speed }) => ({ model, speedMHz: speed })),
    viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
    workloadSize: {
      phase: '2-development',
      calibrated: true,
      renderItems: 240,
      renderItemMs: 0.55,
      commitBlockMs: 120,
      storeItems: 160,
      storeItemMs: 0.55,
      urgentDelayMs: 12,
    },
    timeouts: { operationMs: timeoutMs, previewStartupMs: 15_000 },
    timestamp: new Date().toISOString(),
    workingTreeClean: repository.workingTreeClean,
    workingTreeStatus: repository.status,
    publishable: mode === 'publication' && repository.workingTreeClean && repository.commit !== 'uncommitted',
    mode,
    expectedPins: {
      react: packageJson.dependencies.react,
      reactDom: packageJson.dependencies['react-dom'],
      scheduler: packageJson.dependencies.scheduler,
    },
  };
}

export { projectRoot };
