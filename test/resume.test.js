import { describe, expect, it } from 'vitest';
import {
  completeAttemptRows,
  finalizePublishability,
  scheduleKey,
} from '../src/harness/node-runner.js';

const item = (variantId, iteration = 0) => ({
  scenarioId: 'scenario',
  variantId,
  pass: 'exact',
  rotationIndex: 0,
  iteration,
  orderIndex: variantId === 'a' ? 0 : 1,
});

describe('publication resume checkpoints', () => {
  it('identifies only a complete logical process attempt', () => {
    const schedule = [item('a'), item('b')];
    expect(completeAttemptRows([item('a')], schedule)).toBe(false);
    expect(completeAttemptRows([item('a'), item('b')], schedule)).toBe(true);
    expect(completeAttemptRows([item('a'), item('a')], schedule)).toBe(false);
  });

  it('keys order position and iteration so duplicate-looking cells remain distinct', () => {
    expect(scheduleKey(item('a', 0))).not.toBe(scheduleKey(item('a', 1)));
  });
});

describe('publication eligibility', () => {
  it('requires a publishable manifest, a clean gate, and completed operations', () => {
    expect(finalizePublishability({ publishable: true }, { issues: [] }, [{ status: 'completed' }])).toBe(true);
    expect(finalizePublishability({ publishable: true }, { issues: [{ code: 'failure' }] }, [{ status: 'completed' }])).toBe(false);
    expect(finalizePublishability({ publishable: true }, { issues: [] }, [{ status: 'timeout' }])).toBe(false);
    expect(finalizePublishability({ publishable: false }, { issues: [] }, [{ status: 'completed' }])).toBe(false);
  });
});
