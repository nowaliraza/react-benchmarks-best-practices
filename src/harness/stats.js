export function percentile(samples, fraction) {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function summarizeObservations(observations) {
  const cells = new Map();
  for (const row of observations.filter((item) => !item.excluded)) {
    const key = `${row.scenarioId}\0${row.variantId}\0${row.pass}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(row);
  }
  return [...cells.entries()].map(([key, rows]) => {
    const [scenarioId, variantId, pass] = key.split('\0');
    const summary = { scenarioId, variantId, pass, sampleCount: rows.length };
    if (pass === 'micro-timing') {
      for (const metric of ['micro_script_ms', 'micro_layout_ms', 'micro_total_ms', 'micro_e2e_ms', 'profiler_actual_ms']) {
        const values = rows.map((row) => row.observed.micro[metric]).filter((value) => typeof value === 'number');
        summary[metric.replace('_ms', '_p50_ms')] = percentile(values, 0.5);
        summary[metric.replace('_ms', '_p95_ms')] = percentile(values, 0.95);
      }
      summary.profiler_callback_count = rows.map((row) => row.observed.micro.profiler_callback_count);
    }
    if (pass === 'responsiveness') {
      for (const metric of ['responsive_elapsed_ms', 'responsive_max_gap_ms', 'responsive_ticks']) {
        const values = rows.map((row) => row.observed.responsiveness[metric]);
        summary[metric.replace(/(_ms)?$/, '_p50_ms').replace('ticks_p50_ms', 'ticks_p50')] = percentile(values, 0.5);
      }
      summary.responsive_gaps_over_16 = rows.map((row) => row.observed.responsiveness.responsive_gaps_over_16);
      summary.responsive_long_tasks = rows.map((row) => row.observed.responsiveness.responsive_long_tasks);
      summary.responsive_long_task_offsets = rows.map((row) => row.observed.responsiveness.responsive_long_task_offsets);
    }
    return summary;
  });
}
