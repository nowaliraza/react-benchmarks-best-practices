import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import config from '../../lab.config.js';
import { registry as fullRegistry } from '../registry.js';
import { createManifest, projectRoot, repositoryState } from './manifest.js';
import { runOperation, OperationTimeoutError } from './operation.js';
import { balancedRotations } from './rotations.js';
import { summarizeObservations } from './stats.js';
import { validateRun } from './gates.js';
import { buildVerdicts } from './verdicts.js';
import { hashFile } from './hash.js';
import { resultSchema } from '../protocol/schema.js';

const previewUrl = `http://127.0.0.1:${config.ports.preview}`;

function timestampId() {
  return new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: projectRoot, stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

export async function waitForPreview(url, timeoutMs = 15_000) {
  const deadline = performance.now() + timeoutMs;
  let lastError;
  while (performance.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`Preview responded ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const error = new Error(`Preview server did not become ready within ${timeoutMs} ms: ${lastError?.message ?? 'no response'}`);
  error.code = 'preview-server-failure';
  throw error;
}

function startPreview() {
  const child = spawn(
    process.execPath,
    [path.join(projectRoot, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(config.ports.preview), '--strictPort'],
    { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let diagnostics = '';
  child.stdout.on('data', (chunk) => { diagnostics += chunk; });
  child.stderr.on('data', (chunk) => { diagnostics += chunk; });
  // `close` fires after stdio closes, so startup failures retain their complete
  // diagnostics instead of racing the final stderr chunk.
  const exited = new Promise((resolve) => child.once('close', (code, signal) => resolve({ code, signal })));
  return { child, diagnostics: () => diagnostics, exited };
}

async function stopPreview(child, exited) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  await exited;
}

function passPlan(scenario, budget) {
  return scenario.evidenceProfile.passes.map((pass) => {
    if (pass === 'exact') return { pass, iterations: budget.exactIterations, rotations: 1 };
    if (pass === 'behavior-log' || pass === 'behavior-frame') return { pass, iterations: budget.behaviorIterations, rotations: 1 };
    if (pass === 'micro-timing') return { pass, iterations: budget.microIterations, rotations: budget.microRotations };
    return { pass, iterations: budget.responsiveIterations, rotations: budget.responsiveRotations };
  });
}

function instrumentsFor(pass) {
  return {
    exact: ['component-bodies', 'setter-wrappers', 'effects', 'refs', 'MutationObserver', 'Profiler', 'commit-hook'],
    'behavior-log': ['component-bodies', 'effects', 'refs'],
    'behavior-frame': ['requestAnimationFrame'],
    'micro-timing': ['performance.now', 'Profiler', 'requestAnimationFrame'],
    responsiveness: ['1ms-tick-sampler', 'PerformanceObserver:longtask', 'performance.now'],
  }[pass];
}

function buildSchedule(registry, budget) {
  const schedule = [];
  for (let processIndex = 0; processIndex < budget.processes; processIndex += 1) {
    for (const scenario of registry) {
      for (const plan of passPlan(scenario, budget)) {
        const variants = scenario.variants.map(({ id }) => id);
        const rotations = balancedRotations(variants, plan.rotations);
        for (let rotationIndex = 0; rotationIndex < rotations.length; rotationIndex += 1) {
          for (let orderIndex = 0; orderIndex < rotations[rotationIndex].length; orderIndex += 1) {
            for (let iteration = 0; iteration < plan.iterations; iteration += 1) {
              schedule.push({
                scenarioId: scenario.id,
                variantId: rotations[rotationIndex][orderIndex],
                pass: plan.pass,
                processIndex,
                rotationIndex,
                iteration,
                orderIndex,
              });
            }
          }
        }
      }
    }
  }
  return schedule;
}

async function appendJsonLine(file, value) {
  await appendFile(file, `${JSON.stringify(value)}\n`);
}

async function runBrowserOperation(browser, item, scenario, variant) {
  const excluded = scenario.status === 'excluded' || variant.excluded === true;
  if (excluded) {
    return {
      ...item,
      excluded: true,
      exclusionReason: variant.exclusionReason ?? { code: 'scenario-excluded', message: 'Scenario is excluded.' },
      instruments: [],
      durationMs: 0,
      observed: {},
    };
  }
  const page = await browser.newPage({ viewport: config.viewport });
  const url = new URL(previewUrl);
  url.searchParams.set('scenario', item.scenarioId);
  url.searchParams.set('variant', item.variantId);
  url.searchParams.set('pass', item.pass);
  const operation = await runOperation({
    label: `${item.scenarioId}/${item.variantId}/${item.pass}`,
    timeoutMs: config.timeoutMs,
    execute: async () => {
      await page.goto(url.href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__LAB__ !== undefined);
      const value = await page.evaluate(() => window.__LAB__.run());
      const instruments = await page.evaluate(() => window.__LAB__.instruments);
      return { value, instruments };
    },
    cleanup: async () => page.close(),
  });
  return {
    ...item,
    excluded: false,
    exclusionReason: null,
    instruments: operation.value.instruments,
    durationMs: operation.durationMs,
    observed: operation.value.value,
  };
}

export async function executeLab({ mode = 'fast', chapter = null, runId = timestampId() } = {}) {
  const budget = config.budgets[mode];
  if (!budget) throw new Error(`Unknown execution mode: ${mode}`);
  const selectedRegistry = chapter === null ? fullRegistry : fullRegistry.filter((scenario) => scenario.chapter === Number(chapter));
  if (selectedRegistry.length === 0) throw new Error(`No scenarios registered for chapter ${chapter}`);
  if (mode === 'publication') {
    const repository = await repositoryState();
    if (!repository.workingTreeClean || repository.commit === 'uncommitted') {
      throw new Error(`Publication refused: working tree must be clean and committed.\n${repository.status}`);
    }
  }

  await runCommand('npm', ['run', 'build']);
  const runDirectory = path.join(projectRoot, 'artifacts/runs', runId);
  await mkdir(runDirectory, { recursive: true });
  const observationsFile = path.join(runDirectory, 'observations.jsonl');
  const operationsFile = path.join(runDirectory, 'operations.jsonl');
  const { child: preview, diagnostics, exited } = startPreview();
  const observations = [];
  const operations = [];
  let chromeVersion = null;

  try {
    await Promise.race([
      waitForPreview(previewUrl),
      exited.then(({ code, signal }) => {
        const error = new Error(`Preview server exited before readiness (code=${code}, signal=${signal}).\n${diagnostics()}`);
        error.code = 'preview-server-failure';
        throw error;
      }),
    ]);
    const schedule = buildSchedule(selectedRegistry, budget);
    for (let processIndex = 0; processIndex < budget.processes; processIndex += 1) {
      const browser = await chromium.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: true,
        args: ['--no-sandbox', '--disable-background-timer-throttling'],
      });
      chromeVersion = browser.version();
      try {
        const processItems = schedule.filter((item) => item.processIndex === processIndex);
        for (let index = 0; index < processItems.length; index += 1) {
          const item = processItems[index];
          const scenario = selectedRegistry.find(({ id }) => id === item.scenarioId);
          const variant = scenario.variants.find(({ id }) => id === item.variantId);
          const id = `${item.processIndex}:${item.rotationIndex}:${item.iteration}:${item.scenarioId}:${item.variantId}:${item.pass}`;
          process.stdout.write(`[${index + 1}/${processItems.length}] ${id}\n`);
          try {
            const row = await runBrowserOperation(browser, item, scenario, variant);
            observations.push(row);
            const operation = { id, status: 'completed', durationMs: row.durationMs };
            operations.push(operation);
            await Promise.all([appendJsonLine(observationsFile, row), appendJsonLine(operationsFile, operation)]);
          } catch (error) {
            const operation = {
              id,
              status: error instanceof OperationTimeoutError ? 'timeout' : 'failed',
              code: error.code ?? 'operation-error',
              message: error.message,
            };
            operations.push(operation);
            await appendJsonLine(operationsFile, operation);
          }
        }
      } finally {
        await browser.close();
      }
    }
  } catch (error) {
    error.message += `\nPreview diagnostics:\n${diagnostics()}`;
    throw error;
  } finally {
    await stopPreview(preview, exited);
  }

  const executionOrders = [...new Map(observations.map((row) => {
    const key = `${row.processIndex}:${row.scenarioId}:${row.pass}:${row.rotationIndex}`;
    return [key, {
      processIndex: row.processIndex,
      scenarioId: row.scenarioId,
      pass: row.pass,
      rotationIndex: row.rotationIndex,
      order: observations
        .filter((candidate) => candidate.processIndex === row.processIndex && candidate.scenarioId === row.scenarioId && candidate.pass === row.pass && candidate.rotationIndex === row.rotationIndex)
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map(({ variantId }) => variantId)
        .filter((variantId, index, array) => index === 0 || variantId !== array[index - 1]),
    }];
  })).values()];
  const enabledInstruments = Object.fromEntries([...new Set(observations.map(({ pass }) => pass))].map((pass) => [pass, instrumentsFor(pass)]));
  const manifest = await createManifest({
    mode,
    chromeVersion,
    registry: selectedRegistry,
    executionOrders,
    enabledInstruments,
    samplingBudgets: budget,
    browserProcessCount: budget.processes,
    timeoutMs: config.timeoutMs,
  });
  const expected = {
    ...config.expectedVersions,
    protocolVersion: config.protocolVersion,
    registryHash: await hashFile(path.join(projectRoot, 'src/registry.js')),
  };
  const gate = validateRun({ registry: selectedRegistry, manifest, observations, operations, expected, publication: mode === 'publication' });
  const result = {
    schemaVersion: 1,
    manifest,
    verdicts: buildVerdicts(selectedRegistry, gate),
    observations,
    summaries: summarizeObservations(observations),
    gate,
    operations,
  };
  const schemaResult = resultSchema.safeParse(result);
  if (!schemaResult.success) {
    result.gate.issues.push({
      code: 'result-schema',
      message: 'Assembled result failed schema validation.',
      details: { errors: schemaResult.error.issues },
    });
  }
  await Promise.all([
    writeFile(path.join(runDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(path.join(runDirectory, 'result.json'), `${JSON.stringify(result, null, 2)}\n`),
  ]);
  return { result, runDirectory };
}

export async function readJsonLines(file) {
  const contents = await readFile(file, 'utf8');
  return contents.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}
