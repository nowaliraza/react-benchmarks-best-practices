import { describe, expect, it } from 'vitest';
import { FAULT_CASES } from '../src/harness/fault-injection.js';

describe('Phase 0B fault-injection catalog', () => {
  it('has unique stable identifiers', () => {
    const ids = FAULT_CASES.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every preregistered publication rejection family', () => {
    const ids = new Set(FAULT_CASES.map(({ id }) => id));
    expect(ids).toEqual(new Set([
      'wrong-react-version',
      'wrong-react-dom-version',
      'wrong-scheduler-version',
      'wrong-browser-version',
      'dirty-working-tree',
      'registry-mismatch',
      'protocol-mismatch',
      'missing-manifest-field',
      'missing-execution-vectors',
      'missing-sample-vector',
      'unexpected-dom-difference',
      'uncontrolled-value-regression',
      'state-regression',
      'focus-regression',
      'selection-regression',
      'missing-declared-difference',
      'tearing',
      'external-mutation-order',
      'effect-lifecycle-order',
      'ref-timing-order',
      'build-vector-mismatch',
      'observer-configuration',
      'non-deterministic-direction',
      'instrument-leakage',
      'operation-timeout',
      'operation-failure',
      'empty-result',
      'excluded-propagation',
      'excluded-reason-missing',
    ]));
  });
});
