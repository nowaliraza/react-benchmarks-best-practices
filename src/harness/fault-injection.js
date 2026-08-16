import { validateRun } from './gates.js';

function findObservation(artifact, scenarioId, variantId, pass) {
  const row = artifact.observations.find((candidate) => (
    candidate.scenarioId === scenarioId
    && candidate.variantId === variantId
    && candidate.pass === pass
  ));
  if (!row) throw new Error(`Fault fixture could not find ${scenarioId}/${variantId}/${pass}`);
  return row;
}

export const FAULT_CASES = Object.freeze([
  { id: 'wrong-react-version', expectedCode: 'react-version-mismatch', mutate: ({ manifest }) => { manifest.reactVersion = '0.0.0'; } },
  { id: 'wrong-react-dom-version', expectedCode: 'react-dom-version-mismatch', mutate: ({ manifest }) => { manifest.reactDomVersion = '0.0.0'; } },
  { id: 'wrong-scheduler-version', expectedCode: 'scheduler-version-mismatch', mutate: ({ manifest }) => { manifest.schedulerVersion = '0.0.0'; } },
  { id: 'wrong-browser-version', expectedCode: 'browser-version-mismatch', mutate: ({ manifest }) => { manifest.chromeVersion = '0.0.0.0'; } },
  { id: 'dirty-working-tree', expectedCode: 'dirty-working-tree', mutate: ({ manifest }) => { manifest.workingTreeClean = false; manifest.workingTreeStatus = ' M planted.js'; } },
  { id: 'registry-mismatch', expectedCode: 'registry-mismatch', mutate: ({ manifest }) => { manifest.registryHash = 'planted-registry-mismatch'; } },
  { id: 'protocol-mismatch', expectedCode: 'protocol-mismatch', mutate: ({ manifest }) => { manifest.protocolVersion = 'planted-protocol-mismatch'; } },
  { id: 'missing-manifest-field', expectedCode: 'missing-manifest-field', mutate: ({ manifest }) => { delete manifest.cpu; } },
  { id: 'missing-execution-vectors', expectedCode: 'missing-vectors', mutate: ({ manifest }) => { manifest.executionOrders = []; } },
  {
    id: 'missing-sample-vector', expectedCode: 'missing-vectors', mutate: (artifact) => {
      const index = artifact.observations.findIndex((row) => row.scenarioId === 'use-callback-semantics' && row.pass === 'exact');
      artifact.observations.splice(index, 1);
    },
  },
  {
    id: 'unexpected-dom-difference', expectedCode: 'unexpected-dom-difference', mutate: (artifact) => {
      findObservation(artifact, 'use-callback-semantics', 'inline', 'behavior-log').observed.behavior.canonicalMarkup += '<div>planted</div>';
    },
  },
  {
    id: 'uncontrolled-value-regression', expectedCode: 'behavior-regression', mutate: (artifact) => {
      findObservation(artifact, 'use-callback-semantics', 'inline', 'behavior-log').observed.behavior.liveProperties['input:0'].value = 'changed';
    },
  },
  {
    id: 'state-regression', expectedCode: 'state-regression', mutate: (artifact) => {
      findObservation(artifact, 'use-callback-semantics', 'inline', 'behavior-log').observed.behavior.state.count = 999;
    },
  },
  {
    id: 'focus-regression', expectedCode: 'focus-regression', mutate: (artifact) => {
      findObservation(artifact, 'use-callback-semantics', 'inline', 'behavior-log').observed.behavior.focus = null;
    },
  },
  {
    id: 'selection-regression', expectedCode: 'selection-regression', mutate: (artifact) => {
      findObservation(artifact, 'use-callback-semantics', 'inline', 'behavior-log').observed.behavior.selection = { start: 0, end: 0 };
    },
  },
  {
    id: 'missing-declared-difference', expectedCode: 'missing-declared-difference', mutate: (artifact) => {
      const behavior = findObservation(artifact, 'presented-frame-calibration', 'staged', 'behavior-frame').observed.behavior;
      behavior.frames = behavior.frames.filter(({ state }) => state !== 'intermediate');
    },
  },
  {
    id: 'tearing', expectedCode: 'tearing', mutate: (artifact) => {
      const consistency = findObservation(artifact, 'intra-consistency-fixture', 'consistent', 'behavior-log').observed.behavior.consistency;
      consistency.leftEqualsRight = false;
      consistency.right = 2;
    },
  },
  {
    id: 'external-mutation-order', expectedCode: 'external-mutation-order', mutate: (artifact) => {
      const lifecycle = findObservation(artifact, 'sync-external-store-consistency', 'sync-store', 'exact').observed.exact.lifecycle;
      const mutation = lifecycle.find(({ event }) => event === 'external mutation');
      mutation.event = 'external mutation planted outside window';
    },
  },
  {
    id: 'non-deterministic-direction', expectedCode: 'non-deterministic-direction', mutate: (artifact) => {
      for (const row of artifact.observations.filter((candidate) => candidate.scenarioId === 'micro-calibration' && candidate.variantId === 'heavy' && candidate.pass === 'micro-timing')) {
        row.observed.micro.micro_total_ms = 0;
      }
    },
  },
  {
    id: 'instrument-leakage', expectedCode: 'instrument-leakage', mutate: (artifact) => {
      findObservation(artifact, 'presented-frame-calibration', 'staged', 'behavior-frame').instruments.push('component-bodies');
    },
  },
  {
    id: 'operation-timeout', expectedCode: 'timeout', mutate: (artifact) => {
      artifact.operations[0].status = 'timeout';
    },
  },
  {
    id: 'operation-failure', expectedCode: 'operation-failed', mutate: (artifact) => {
      artifact.operations[0].status = 'failed';
      artifact.operations[0].message = 'Planted measured-realm runtime error';
    },
  },
  {
    id: 'empty-result', expectedCode: 'empty-result', mutate: (artifact) => {
      artifact.observations = [];
      artifact.operations = [];
    },
  },
  {
    id: 'excluded-propagation', expectedCode: 'excluded-propagation', mutate: (artifact) => {
      findObservation(artifact, 'zero-timer-race-control', 'timer-zero', 'exact').excluded = false;
    },
  },
  {
    id: 'excluded-reason-missing', expectedCode: 'excluded-reason-missing', mutate: (artifact) => {
      findObservation(artifact, 'zero-timer-race-control', 'timer-zero', 'exact').exclusionReason = null;
    },
  },
]);

export async function runFaultInjectionMatrix({ baseline, registry, expected, previewFailureProbe }) {
  const validBaseline = structuredClone({
    manifest: baseline.manifest,
    observations: baseline.observations,
    operations: baseline.operations,
  });
  // Verification is allowed on a dirty development tree. Fault isolation starts
  // from the equivalent clean publication envelope, then plants dirtiness as its
  // own single defect.
  validBaseline.manifest.workingTreeClean = true;
  validBaseline.manifest.workingTreeStatus = '';
  validBaseline.manifest.publishable = true;
  validBaseline.manifest.mode = 'publication';
  const baselineGate = validateRun({ ...validBaseline, registry, expected, publication: true });
  if (baselineGate.issues.length > 0) {
    throw new Error(`Fault-injection baseline is not valid: ${baselineGate.issues.map(({ code }) => code).join(', ')}`);
  }

  const reports = [];
  for (const fault of FAULT_CASES) {
    const artifact = structuredClone(validBaseline);
    fault.mutate(artifact);
    const gate = validateRun({ ...artifact, registry, expected, publication: true });
    reports.push({
      id: fault.id,
      expectedCode: fault.expectedCode,
      caught: gate.issues.some(({ code }) => code === fault.expectedCode),
      observedCodes: [...new Set(gate.issues.map(({ code }) => code))],
    });
  }

  let previewReport = { id: 'preview-server-failure', expectedCode: 'preview-server-failure', caught: false, observedCodes: [] };
  try {
    await previewFailureProbe();
  } catch (error) {
    previewReport = {
      ...previewReport,
      caught: error.code === 'preview-server-failure',
      observedCodes: error.code ? [error.code] : [],
    };
  }
  reports.push(previewReport);
  return reports;
}

export function assertFaultMatrix(reports) {
  const missed = reports.filter(({ caught }) => !caught);
  if (missed.length > 0) {
    throw new Error(`Fault-injection matrix missed ${missed.map(({ id, expectedCode }) => `${id}→${expectedCode}`).join(', ')}`);
  }
}
