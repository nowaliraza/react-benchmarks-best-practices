const IDENTITY_KEYS = new Set(['scenarioId', 'variantId', 'pass', 'sampleCount']);

export function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(value < 10 ? 2 : 1).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export function formatMetricName(name) {
  return name
    .replace(/_/g, ' ')
    .replace(/\bp50\b/g, 'p50')
    .replace(/\bp95\b/g, 'p95')
    .replace(/\bms\b/g, 'ms');
}

export function formatMetricValue(name, value) {
  if (value === null) return 'not recorded';
  if (typeof value === 'object') {
    const values = value.unique.map((item) => typeof item === 'object' ? JSON.stringify(item) : item);
    return values.length === 1 ? String(values[0]) : `${values.join(' · ')} (${value.sampleCount} samples)`;
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value !== 'number') return String(value);
  return `${formatNumber(value)}${name.endsWith('_ms') ? ' ms' : ''}`;
}

export function summaryMetrics(summary) {
  return Object.entries(summary)
    .filter(([key]) => !IDENTITY_KEYS.has(key))
    .map(([name, value]) => ({ name, value, label: formatMetricName(name), formatted: formatMetricValue(name, value) }));
}

function componentTotal(invocations) {
  return Object.values(invocations).reduce((sum, count) => sum + count, 0);
}

export function buildReplaySteps(exemplar) {
  if (!exemplar) return [];
  const { observed } = exemplar;
  const heading = `${exemplar.variantId} · ${exemplar.pass}`;
  if (observed.exact) {
    const exact = observed.exact;
    const lifecycle = exact.lifecycle.map(({ event }, index) => ({
      label: `Lifecycle ${index + 1}`,
      value: event,
      detail: 'Recorded by the isolated work log.',
      tone: 'signal',
    }));
    return [
      { label: 'Recorded cell', value: heading, detail: `Process ${exemplar.processIndex + 1}, iteration ${exemplar.iteration + 1}.` },
      { label: 'Component work', value: `${componentTotal(exact.componentInvocations)} invocations`, detail: Object.entries(exact.componentInvocations).map(([name, count]) => `${name} × ${count}`).join(', ') || 'No component-body events.' },
      ...lifecycle,
      { label: 'React boundary', value: `${exact.commits} commit${exact.commits === 1 ? '' : 's'}`, detail: `${exact.setterCalls} setter call${exact.setterCalls === 1 ? '' : 's'} crossed the operation boundary.`, tone: 'commit' },
      { label: 'DOM boundary', value: `${exact.mutationCount} mutation${exact.mutationCount === 1 ? '' : 's'}`, detail: exact.mutationCount > exact.mutations.length ? `Showing the first ${exact.mutations.length} mutation records in the compact dataset.` : 'All mutation records are represented.', tone: 'dom' },
    ];
  }
  if (observed.behavior) {
    const behavior = observed.behavior;
    const frameSteps = behavior.frames.map(({ state }, index) => ({
      label: `Presented frame ${index + 1}`,
      value: state,
      detail: 'Sampled at a requestAnimationFrame boundary.',
      tone: 'dom',
    }));
    return [
      { label: 'Recorded cell', value: heading, detail: `Process ${exemplar.processIndex + 1}, behavior pass.` },
      ...behavior.lifecycle.map(({ event }, index) => ({ label: `Lifecycle ${index + 1}`, value: event, detail: 'Recorded public lifecycle evidence.', tone: 'signal' })),
      ...frameSteps,
      { label: 'Final behavior', value: behavior.domIdentityPreserved ? 'DOM identity preserved' : 'DOM identity changed', detail: `State: ${JSON.stringify(behavior.state)}`, tone: 'verdict' },
    ];
  }
  if (observed.micro) {
    const micro = observed.micro;
    return [
      { label: 'Recorded cell', value: heading, detail: `Process ${exemplar.processIndex + 1}, rotation ${exemplar.rotationIndex + 1}.` },
      { label: 'Synchronous operation', value: `${formatNumber(micro.micro_total_ms)} ms`, detail: `Script interval: ${formatNumber(micro.micro_script_ms)} ms.`, tone: 'commit' },
      { label: 'Profiler signal', value: `${micro.profiler_callback_count} callback${micro.profiler_callback_count === 1 ? '' : 's'}`, detail: micro.profiler_actual_ms === null ? 'No public actualDuration was recorded.' : `${formatNumber(micro.profiler_actual_ms)} ms total actualDuration.`, tone: 'signal' },
      { label: 'Presentation boundary', value: `${formatNumber(micro.micro_e2e_ms)} ms`, detail: 'Elapsed through the two-frame settlement boundary.', tone: 'dom' },
    ];
  }
  const responsive = observed.responsiveness;
  return [
    { label: 'Recorded cell', value: heading, detail: `Process ${exemplar.processIndex + 1}, rotation ${exemplar.rotationIndex + 1}.` },
    { label: 'Sampling window', value: `${formatNumber(responsive.responsive_elapsed_ms)} ms`, detail: `${responsive.responsive_ticks} recorded ticks.`, tone: 'signal' },
    { label: 'Largest sampled gap', value: `${formatNumber(responsive.responsive_max_gap_ms)} ms`, detail: `${responsive.responsive_gaps_over_16} gap${responsive.responsive_gaps_over_16 === 1 ? '' : 's'} over 16 ms.`, tone: 'commit' },
    { label: 'Long Task observer', value: `${responsive.responsive_long_task_count} entries`, detail: 'Long-task evidence stays in the responsiveness family.', tone: 'verdict' },
  ];
}

export function observableSummary(exemplar) {
  if (!exemplar) return 'No publishable exemplar is available for this cell.';
  if (exemplar.observed.exact) {
    const exact = exemplar.observed.exact;
    return `${componentTotal(exact.componentInvocations)} component invocations, ${exact.commits} commits, and ${exact.mutationCount} DOM mutations.`;
  }
  if (exemplar.observed.behavior) return `Final state ${JSON.stringify(exemplar.observed.behavior.state)}; DOM identity ${exemplar.observed.behavior.domIdentityPreserved ? 'was' : 'was not'} preserved.`;
  if (exemplar.observed.micro) return `${formatNumber(exemplar.observed.micro.micro_total_ms)} ms synchronous duration in this recorded sample.`;
  return `${exemplar.observed.responsiveness.responsive_ticks} ticks across ${formatNumber(exemplar.observed.responsiveness.responsive_elapsed_ms)} ms.`;
}

export function filterScenarios(scenarios, query, phase) {
  const needle = query.trim().toLowerCase();
  return scenarios.filter((scenario) => {
    if (phase !== 'all' && scenario.phase !== Number(phase)) return false;
    if (!needle) return true;
    return [scenario.id, scenario.claim, scenario.chapterTitle, ...scenario.variants.map(({ id }) => id)]
      .some((value) => value.toLowerCase().includes(needle));
  });
}
