export function buildVerdicts(registry, gate) {
  return registry.map((scenario) => {
    if (scenario.status === 'excluded') {
      return { scenarioId: scenario.id, verdict: 'excluded', reasons: scenario.variants.map((variant) => variant.exclusionReason).filter(Boolean) };
    }
    const related = gate.issues.filter((entry) => entry.details?.scenarioId === scenario.id || entry.message.includes(scenario.id));
    if (related.length > 0) {
      const inconclusive = related.some(({ code }) => ['non-deterministic-direction', 'missing-observation', 'missing-vectors', 'timeout', 'operation-failed'].includes(code));
      return { scenarioId: scenario.id, verdict: inconclusive ? 'inconclusive' : 'refuted', reasons: related.map(({ code, message }) => ({ code, message })) };
    }
    return { scenarioId: scenario.id, verdict: 'supported', reasons: [] };
  });
}
