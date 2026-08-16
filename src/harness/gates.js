import { observationSchema, registrySchema } from '../protocol/schema.js';
import { PROTOCOL_VERSION } from '../protocol/constants.js';

const REQUIRED_MANIFEST_FIELDS = [
  'reactVersion', 'reactDomVersion', 'schedulerVersion', 'chromeVersion', 'nodeVersion',
  'buildType', 'protocolVersion', 'registryHash', 'registryCommit', 'implementationCommit',
  'implementationBundleHash', 'amendmentLogHash', 'scenarioCount', 'variantCount',
  'executionOrders', 'evidenceProfile', 'enabledInstruments', 'samplingBudgets',
  'browserProcessCount', 'cpu', 'viewport', 'workloadSize', 'timeouts', 'timestamp',
  'workingTreeClean',
];

function issue(code, message, details = {}) {
  return { code, message, details };
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function readMetric(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value);
}

export function validateManifest(manifest, expected, { publication = false } = {}) {
  const issues = [];
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (manifest[field] === undefined || manifest[field] === null || manifest[field] === '') {
      issues.push(issue('missing-manifest-field', `Manifest field ${field} is required.`, { field }));
    }
  }
  const comparisons = [
    ['reactVersion', expected.react, 'react-version-mismatch'],
    ['reactDomVersion', expected.reactDom, 'react-dom-version-mismatch'],
    ['schedulerVersion', expected.scheduler, 'scheduler-version-mismatch'],
    ['nodeVersion', expected.node, 'node-version-mismatch'],
    ['chromeVersion', expected.chrome, 'browser-version-mismatch'],
    ['protocolVersion', expected.protocolVersion ?? PROTOCOL_VERSION, 'protocol-mismatch'],
    ['registryHash', expected.registryHash, 'registry-mismatch'],
  ];
  for (const [field, wanted, code] of comparisons) {
    if (wanted !== undefined && manifest[field] !== wanted) {
      issues.push(issue(code, `Expected ${field} ${wanted}; received ${manifest[field]}.`, { field, expected: wanted, actual: manifest[field] }));
    }
  }
  if (!Array.isArray(manifest.executionOrders) || manifest.executionOrders.length === 0) {
    issues.push(issue('missing-vectors', 'Execution-order vectors are required.'));
  }
  if (!manifest.samplingBudgets || Object.keys(manifest.samplingBudgets).length === 0) {
    issues.push(issue('missing-vectors', 'Sampling-budget vectors are required.'));
  }
  if (publication && !manifest.workingTreeClean) {
    issues.push(issue('dirty-working-tree', 'Publication requires a clean working tree.', { status: manifest.workingTreeStatus }));
  }
  if (publication && (!manifest.registryCommit || !manifest.implementationCommit)) {
    issues.push(issue('missing-commit', 'Publication requires registry and implementation commits.'));
  }
  return issues;
}

export function validateBehaviorControl(reference, candidate, compare) {
  const issues = [];
  const checks = {
    markup: ['canonicalMarkup', 'unexpected-dom-difference'],
    domIdentity: ['domIdentityPreserved', 'dom-identity-regression'],
    focus: ['focus', 'focus-regression'],
    selection: ['selection', 'selection-regression'],
    state: ['state', 'state-regression'],
  };
  for (const dimension of compare) {
    if (dimension === 'behavior') {
      const expected = { liveProperties: reference.liveProperties, lifecycle: reference.lifecycle?.map(({ event }) => event) };
      const actual = { liveProperties: candidate.liveProperties, lifecycle: candidate.lifecycle?.map(({ event }) => event) };
      if (stable(expected) !== stable(actual)) {
        issues.push(issue('behavior-regression', 'Behavior differs from the reference.', { expected, actual }));
      }
      continue;
    }
    if (!checks[dimension]) continue;
    const [field, code] = checks[dimension];
    if (stable(reference[field]) !== stable(candidate[field])) {
      issues.push(issue(code, `${dimension} differs from the reference.`, { expected: reference[field], actual: candidate[field] }));
    }
  }
  return issues;
}

function detectDeclaredDifferences(scenarioId, variantId, observations) {
  const labels = [];
  if (scenarioId === 'presented-frame-calibration' && variantId === 'staged') {
    const frame = observations.find((row) => row.pass === 'behavior-frame');
    if (frame?.observed.behavior.frames.some(({ state }) => state === 'intermediate')) labels.push('presented intermediate state');
  }
  if (scenarioId === 'intra-consistency-fixture' && variantId === 'planted-tear') {
    const behavior = observations.find((row) => row.pass === 'behavior-log')?.observed.behavior;
    if (behavior && behavior.consistency.left !== behavior.consistency.right) labels.push('right snapshot differs');
  }
  if (scenarioId === 'responsiveness-calibration' && variantId === 'blocked') {
    const timing = observations.find((row) => row.pass === 'responsiveness')?.observed.responsiveness;
    if (timing?.responsive_max_gap_ms >= 50) labels.push('responsive timing');
  }
  return labels;
}

function blockDirection(rows, leftVariant, rightVariant, pass, read, threshold) {
  const blocks = new Map();
  for (const row of rows.filter((item) => item.pass === pass && [leftVariant, rightVariant].includes(item.variantId))) {
    const key = `${row.processIndex}:${row.rotationIndex}`;
    if (!blocks.has(key)) blocks.set(key, { left: [], right: [] });
    blocks.get(key)[row.variantId === leftVariant ? 'left' : 'right'].push(read(row));
  }
  const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  return [...blocks.entries()].map(([key, values]) => ({
    key,
    passes: values.left.length > 0 && values.right.length > 0 && median(values.right) - median(values.left) > threshold,
  }));
}

export function validateObservations(registry, observations, operations = []) {
  const issues = [];
  const expectedRejections = [];
  if (observations.length === 0) issues.push(issue('empty-result', 'A run must contain observations.'));
  for (const operation of operations) {
    if (operation.status === 'timeout') issues.push(issue('timeout', `Operation ${operation.id} timed out.`, operation));
    if (operation.status === 'failed') issues.push(issue('operation-failed', `Operation ${operation.id} failed.`, operation));
  }
  for (const row of observations) {
    const parsed = observationSchema.safeParse(row);
    if (!parsed.success) issues.push(issue('observation-schema', 'Observation failed schema validation.', { errors: parsed.error.issues, row }));
  }

  for (const scenario of registry) {
    for (const variant of scenario.variants) {
      const rows = observations.filter((row) => row.scenarioId === scenario.id && row.variantId === variant.id);
      const shouldExclude = scenario.status === 'excluded' || variant.excluded === true;
      if (rows.some((row) => row.excluded !== shouldExclude)) {
        issues.push(issue('excluded-propagation', `Excluded state was not preserved for ${scenario.id}/${variant.id}.`));
      }
      if (shouldExclude) {
        if (rows.some((row) => !row.exclusionReason)) issues.push(issue('excluded-reason-missing', `Excluded row ${scenario.id}/${variant.id} requires a reason.`));
        continue;
      }
      for (const pass of scenario.evidenceProfile.passes) {
        if (!rows.some((row) => row.pass === pass)) {
          issues.push(issue('missing-observation', `Missing ${pass} observation for ${scenario.id}/${variant.id}.`, { scenarioId: scenario.id, variantId: variant.id, pass }));
        }
      }
      const behaviorRows = rows.filter((row) => row.pass === 'behavior-log');
      for (const behaviorRow of behaviorRows) {
        const consistency = behaviorRow.observed.behavior?.consistency ?? {};
        const values = Object.entries(consistency).filter(([key]) => key.endsWith('EqualsRight') || key === 'displayedEqualsState' || key === 'checksumFinite' || key === 'final');
        const failed = values.some(([, value]) => value !== true);
        const tearing = consistency.leftEqualsRight === false;
        if (failed && variant.expectedGateFailure) {
          expectedRejections.push(issue('expected-intra-variant-rejection', `Caught planted failure ${scenario.id}/${variant.id}.`));
        } else if (failed) {
          issues.push(issue(tearing ? 'tearing' : 'intra-variant-invariant', `Intra-variant invariant failed for ${scenario.id}/${variant.id}.`, { scenarioId: scenario.id, variantId: variant.id, consistency }));
        } else if (!failed && variant.expectedGateFailure) {
          issues.push(issue('planted-failure-missed', `Expected gate failure was not caught for ${scenario.id}/${variant.id}.`));
        }
      }

      const expectedDifferences = scenario.control.declaredDifferences[variant.id] ?? [];
      const actualDifferences = detectDeclaredDifferences(scenario.id, variant.id, rows);
      for (const label of expectedDifferences.filter((item) => !actualDifferences.includes(item))) {
        issues.push(issue('missing-declared-difference', `Declared difference stopped occurring: ${label}.`, { scenarioId: scenario.id, variantId: variant.id }));
      }
      for (const label of actualDifferences.filter((item) => !expectedDifferences.includes(item))) {
        issues.push(issue('undeclared-difference', `Observed difference was not declared: ${label}.`, { scenarioId: scenario.id, variantId: variant.id }));
      }
    }


    for (const relation of scenario.expectedRelations) {
      if (relation.kind === 'exact') {
        const rows = observations.filter((item) => item.scenarioId === scenario.id && item.variantId === relation.variant && item.pass === 'exact' && !item.excluded);
        for (const row of rows) {
          const actual = readMetric(row.observed.exact, relation.metric);
          if (actual !== undefined && actual !== relation.value) {
            issues.push(issue('exact-relation-failed', `${scenario.id}/${relation.variant} expected ${relation.metric}=${relation.value}; received ${actual}.`, { scenarioId: scenario.id, variantId: relation.variant }));
          }
        }
      }
      if (relation.kind === 'range') {
        const rows = observations.filter((item) => item.scenarioId === scenario.id && item.variantId === relation.variant && !item.excluded && (relation.metric !== 'intermediateFrames' || item.pass === 'behavior-frame'));
        for (const row of rows) {
          let actual;
          if (relation.metric === 'intermediateFrames') actual = row.observed.behavior?.frames.filter(({ state }) => state === 'intermediate').length;
          else actual = readMetric(row.observed.exact ?? row.observed.behavior ?? row.observed.micro ?? row.observed.responsiveness, relation.metric);
          if (actual !== undefined && (actual < relation.min || actual > relation.max)) {
            issues.push(issue('range-relation-failed', `${scenario.id}/${relation.variant} ${relation.metric} fell outside [${relation.min}, ${relation.max}].`, { scenarioId: scenario.id, variantId: relation.variant, actual }));
          }
        }
      }
      if (relation.kind === 'ordering') {
        const frameRows = observations.filter((item) => item.scenarioId === scenario.id && item.pass === 'behavior-frame');
        for (const row of frameRows) {
          const states = row.observed.behavior.frames.map(({ state }) => state);
          if (states.includes(relation.before) && states.indexOf(relation.before) > states.lastIndexOf(relation.after)) {
            issues.push(issue('ordering-relation-failed', `${relation.before} did not precede ${relation.after}.`, { scenarioId: scenario.id, variantId: row.variantId }));
          }
        }
      }
    }

    const behaviorRows = observations.filter((row) => row.scenarioId === scenario.id && row.pass === 'behavior-log' && !row.excluded);
    const reference = behaviorRows.find((row) => row.variantId === scenario.control.referenceVariant)?.observed.behavior;
    if (reference) {
      for (const row of behaviorRows) {
        if (row.variantId === scenario.control.referenceVariant || scenario.variants.find((variant) => variant.id === row.variantId)?.expectedGateFailure) continue;
        issues.push(...validateBehaviorControl(reference, row.observed.behavior, scenario.control.compare));
      }
    }
  }

  if (registry.some(({ id }) => id === 'micro-calibration')) {
    const microBlocks = blockDirection(observations.filter((row) => row.scenarioId === 'micro-calibration'), 'light', 'heavy', 'micro-timing', (row) => row.observed.micro.micro_total_ms, 0.25);
    const microRows = observations.filter((row) => row.scenarioId === 'micro-calibration' && row.pass === 'micro-timing');
    const pooledLight = microRows.filter((row) => row.variantId === 'light').map((row) => row.observed.micro.micro_total_ms);
    const pooledHeavy = microRows.filter((row) => row.variantId === 'heavy').map((row) => row.observed.micro.micro_total_ms);
    const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const pooledPasses = pooledLight.length > 0 && pooledHeavy.length > 0 && median(pooledHeavy) - median(pooledLight) > 0.25;
    if (microBlocks.some(({ passes }) => !passes) || !pooledPasses) issues.push(issue('non-deterministic-direction', 'Micro calibration direction did not hold in every rotation/process block and the pooled result.', { scenarioId: 'micro-calibration', blocks: microBlocks, pooledPasses }));
  }
  if (registry.some(({ id }) => id === 'responsiveness-calibration')) {
    const responsiveRows = observations.filter((row) => row.scenarioId === 'responsiveness-calibration' && row.variantId === 'blocked' && row.pass === 'responsiveness');
    if (responsiveRows.some((row) => row.observed.responsiveness.responsive_max_gap_ms < 50)) {
      issues.push(issue('responsiveness-calibration-failed', 'Planted block did not produce a gap of at least 50 ms.', { scenarioId: 'responsiveness-calibration' }));
    }
    if (responsiveRows.some((row) => row.observed.responsiveness.responsive_long_tasks.length === 0)) {
      issues.push(issue('long-task-calibration-failed', 'Planted block did not produce a Long Task entry.', { scenarioId: 'responsiveness-calibration' }));
    }
  }
  return { issues, expectedRejections };
}

function expectedSamples(pass, budgets) {
  const processes = budgets.processes;
  if (pass === 'exact') return processes * budgets.exactIterations;
  if (pass === 'behavior-log' || pass === 'behavior-frame') return processes * budgets.behaviorIterations;
  if (pass === 'micro-timing') return processes * budgets.microIterations * budgets.microRotations;
  return processes * budgets.responsiveIterations * budgets.responsiveRotations;
}

export function validateSampleCompleteness(registry, observations, manifest) {
  const issues = [];
  if (!manifest.samplingBudgets) return issues;
  for (const scenario of registry) {
    for (const variant of scenario.variants) {
      for (const pass of scenario.evidenceProfile.passes) {
        const actual = observations.filter((row) => row.scenarioId === scenario.id && row.variantId === variant.id && row.pass === pass).length;
        const expected = expectedSamples(pass, manifest.samplingBudgets);
        if (actual !== expected) {
          issues.push(issue('missing-vectors', `Expected ${expected} samples for ${scenario.id}/${variant.id}/${pass}; received ${actual}.`, { scenarioId: scenario.id, variantId: variant.id, pass, expected, actual }));
        }
      }
    }
  }
  return issues;
}

export function validateInstrumentIsolation(observations) {
  const issues = [];
  for (const row of observations) {
    if (row.pass === 'behavior-frame' && stable(row.instruments) !== stable(['requestAnimationFrame'])) {
      issues.push(issue('instrument-leakage', 'Behavior-frame pass contains non-frame instrumentation.', { instruments: row.instruments }));
    }
    if (row.pass === 'responsiveness' && row.instruments.some((name) => ['component-bodies', 'MutationObserver', 'setter-wrappers'].includes(name))) {
      issues.push(issue('instrument-leakage', 'Responsiveness pass contains semantic work-log instrumentation.', { instruments: row.instruments }));
    }
  }
  return issues;
}

export function validateRun({ registry, manifest, observations, operations, expected, publication = false }) {
  const registryResult = registrySchema.safeParse(registry);
  const registryIssues = registryResult.success ? [] : [issue('registry-schema', 'Registry failed schema validation.', { errors: registryResult.error.issues })];
  const observationResult = validateObservations(registry, observations, operations);
  return {
    issues: [
      ...registryIssues,
      ...validateManifest(manifest, expected, { publication }),
      ...observationResult.issues,
      ...validateInstrumentIsolation(observations),
      ...validateSampleCompleteness(registry, observations, manifest),
    ],
    expectedRejections: observationResult.expectedRejections,
  };
}
