import { describe, expect, it } from 'vitest';
import { buildVerdicts } from '../src/harness/verdicts.js';

describe('structured inconclusive verdicts', () => {
  it('publishes an inconclusive reason without treating it as a gate failure', () => {
    const registry = [{ id: 'crossover', status: 'active' }];
    const gate = {
      issues: [],
      inconclusive: [{
        code: 'crossover-direction-unstable',
        message: 'Direction was unstable for crossover.',
        details: { scenarioId: 'crossover' },
      }],
    };
    expect(buildVerdicts(registry, gate)).toEqual([{
      scenarioId: 'crossover',
      verdict: 'inconclusive',
      reasons: [{ code: 'crossover-direction-unstable', message: 'Direction was unstable for crossover.' }],
    }]);
  });
});
