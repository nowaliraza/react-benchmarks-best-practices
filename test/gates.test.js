import { describe, expect, it } from 'vitest';
import config from '../lab.config.js';
import {
  intermediateFrameCount,
  validateBehaviorControl,
  validateBuildAndObserverVectors,
  validateExternalMutationOrdering,
  validateInstrumentIsolation,
  validateLifecycleOrder,
  validateManifest,
  validateObservations,
  validateUrgentInterruptionOrdering,
} from '../src/harness/gates.js';

const baseManifest = {
  reactVersion: config.expectedVersions.react,
  reactDomVersion: config.expectedVersions.reactDom,
  schedulerVersion: config.expectedVersions.scheduler,
  chromeVersion: config.expectedVersions.chrome,
  nodeVersion: config.expectedVersions.node,
  buildType: 'production',
  buildTypes: ['production'],
  protocolVersion: config.protocolVersion,
  registryHash: 'registry',
  registryCommit: 'abc',
  implementationCommit: 'abc',
  implementationBundleHash: 'bundle',
  implementationBundleHashes: { production: 'bundle' },
  amendmentLogHash: 'amendments',
  scenarioCount: 1,
  variantCount: 1,
  executionOrders: [{ order: ['a'] }],
  evidenceProfile: ['semantic'],
  enabledInstruments: { exact: [] },
  samplingBudgets: { processes: 1 },
  browserProcessCount: 1,
  cpu: [{ model: 'fixture' }],
  viewport: { width: 1, height: 1 },
  workloadSize: { fixture: true },
  timeouts: { operationMs: 1 },
  timestamp: '2026-01-01T00:00:00.000Z',
  workingTreeClean: true,
};
const expected = { ...config.expectedVersions, protocolVersion: config.protocolVersion, registryHash: 'registry' };

describe('manifest fault injection', () => {
  it.each([
    ['reactVersion', '0.0.0', 'react-version-mismatch'],
    ['reactDomVersion', '0.0.0', 'react-dom-version-mismatch'],
    ['schedulerVersion', '0.0.0', 'scheduler-version-mismatch'],
    ['chromeVersion', '0.0.0', 'browser-version-mismatch'],
    ['protocolVersion', '0.0.0', 'protocol-mismatch'],
    ['registryHash', 'changed', 'registry-mismatch'],
  ])('rejects wrong %s', (field, value, code) => {
    const issues = validateManifest({ ...baseManifest, [field]: value }, expected, { publication: true });
    expect(issues.map((item) => item.code)).toContain(code);
  });

  it('rejects a dirty tree', () => {
    expect(validateManifest({ ...baseManifest, workingTreeClean: false }, expected, { publication: true }).map(({ code }) => code)).toContain('dirty-working-tree');
  });

  it('rejects missing fields and vectors', () => {
    const manifest = { ...baseManifest, executionOrders: [], samplingBudgets: {} };
    delete manifest.cpu;
    const codes = validateManifest(manifest, expected).map(({ code }) => code);
    expect(codes).toContain('missing-manifest-field');
    expect(codes).toContain('missing-vectors');
  });
});

describe('behavior fault injection', () => {
  const reference = {
    canonicalMarkup: '<output>same</output>', state: { value: 1 }, domIdentityPreserved: true,
    focus: 'input', selection: { start: 1, end: 1 },
    liveProperties: { 'input:0': { value: 'same' } }, lifecycle: [],
  };

  it.each([
    ['markup', { canonicalMarkup: '<output>wrong</output>' }, 'unexpected-dom-difference'],
    ['state', { state: { value: 2 } }, 'state-regression'],
    ['focus', { focus: null }, 'focus-regression'],
    ['selection', { selection: { start: 0, end: 0 } }, 'selection-regression'],
    ['domIdentity', { domIdentityPreserved: false }, 'dom-identity-regression'],
  ])('rejects a %s regression', (dimension, change, code) => {
    const issues = validateBehaviorControl(reference, { ...reference, ...change }, [dimension]);
    expect(issues.map((item) => item.code)).toContain(code);
  });

  it('rejects instrument leakage', () => {
    const issues = validateInstrumentIsolation([{
      pass: 'behavior-frame', instruments: ['requestAnimationFrame', 'component-bodies'],
    }]);
    expect(issues.map(({ code }) => code)).toContain('instrument-leakage');
  });

  it('rejects uncontrolled live-property behavior changes', () => {
    const candidate = structuredClone(reference);
    candidate.liveProperties['input:0'].value = 'changed';
    expect(validateBehaviorControl(reference, candidate, ['behavior']).map(({ code }) => code)).toContain('behavior-regression');
  });

  it('rejects timeouts and empty results', () => {
    const result = validateObservations([], [], [{ id: 'x', status: 'timeout' }]);
    expect(result.issues.map(({ code }) => code)).toEqual(expect.arrayContaining(['timeout', 'empty-result']));
  });
});

describe('presented intermediate semantics', () => {
  it('uses each scenario semantic state rather than one literal label', () => {
    expect(intermediateFrameCount('presented-frame-calibration', {
      frames: [{ state: 'intermediate' }, { state: 'final' }],
    })).toBe(1);
    expect(intermediateFrameCount('flush-sync-boundary', {
      frames: [{ state: '1' }, { state: '2' }],
    })).toBe(1);
  });
});

describe('concurrency ordering gates', () => {
  it('requires an external mutation between render chunks and before commit', () => {
    const valid = ['first render chunk', 'external mutation', 'last render chunk of the first pass', 'commit']
      .map((event, at) => ({ event, at }));
    expect(validateExternalMutationOrdering(valid)).toEqual([]);
    expect(validateExternalMutationOrdering([valid[0], valid[2], valid[1], valid[3]])[0].code).toBe('external-mutation-order');
  });

  it('requires urgent work to commit before the interrupted Transition', () => {
    const valid = ['first render chunk', 'urgent setter', 'urgent commit', 'transition commit']
      .map((event, at) => ({ event, at }));
    expect(validateUrgentInterruptionOrdering(valid)).toEqual([]);
    expect(validateUrgentInterruptionOrdering([valid[0], valid[1], valid[3], valid[2]])[0].code).toBe('urgent-interruption-order');
  });
});

describe('effect and ref ordering gates', () => {
  it('requires the named lifecycle events in order', () => {
    const lifecycle = [{ event: 'effect-cleanup', at: 1 }, { event: 'effect-setup', at: 2 }];
    expect(validateLifecycleOrder(lifecycle, 'effect-cleanup', 'effect-setup', 'effect-order')).toEqual([]);
    expect(validateLifecycleOrder(lifecycle.toReversed(), 'effect-cleanup', 'effect-setup', 'effect-order')[0].code).toBe('effect-order');
  });
});

describe('build and observer vectors', () => {
  it('rejects a manifest/row build mismatch and an instrument in the off cell', () => {
    const observations = [{
      scenarioId: 'work-log-overhead', variantId: 'work-log-off', pass: 'micro-timing',
      buildType: 'development', instruments: ['component-bodies'],
    }];
    const codes = validateBuildAndObserverVectors({
      buildTypes: ['production'], implementationBundleHashes: { production: 'hash' },
    }, observations).map(({ code }) => code);
    expect(codes).toEqual(expect.arrayContaining(['build-vector-mismatch', 'observer-configuration']));
  });
});
