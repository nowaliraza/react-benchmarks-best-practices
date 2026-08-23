import { describe, expect, it } from 'vitest';
import { buildReplaySteps, filterScenarios, formatMetricValue, summaryMetrics } from '../src/viewer/model.js';

describe('viewer model', () => {
  it('formats summary metrics without identity fields', () => {
    const rows = summaryMetrics({ scenarioId: 'x', variantId: 'a', pass: 'micro-timing', sampleCount: 80, micro_total_p50_ms: 2.5 });
    expect(rows).toEqual([{ name: 'micro_total_p50_ms', value: 2.5, label: 'micro total p50 ms', formatted: '2.5 ms' }]);
    expect(formatMetricValue('commits', { sampleCount: 10, unique: [1] })).toBe('1');
  });

  it('builds an exact replay across distinct observable boundaries', () => {
    const steps = buildReplaySteps({
      variantId: 'stable', pass: 'exact', processIndex: 0, iteration: 0,
      observed: { exact: { componentInvocations: { Child: 2 }, lifecycle: [{ event: 'effect-setup' }], commits: 1, setterCalls: 1, mutationCount: 0, mutations: [] } },
    });
    expect(steps.map(({ label }) => label)).toEqual(['Recorded cell', 'Component work', 'Lifecycle 1', 'React boundary', 'DOM boundary']);
    expect(steps[1].value).toBe('2 invocations');
  });

  it('filters by release and searchable evidence language', () => {
    const scenarios = [
      { id: 'memo', claim: 'Stable identity skips work', chapterTitle: 'Identity', phase: 1, variants: [{ id: 'stable' }] },
      { id: 'strict', claim: 'Strict replay', chapterTitle: 'Builds', phase: 4, variants: [{ id: 'root' }] },
    ];
    expect(filterScenarios(scenarios, 'identity', 'all').map(({ id }) => id)).toEqual(['memo']);
    expect(filterScenarios(scenarios, '', '4').map(({ id }) => id)).toEqual(['strict']);
  });
});
