// A measured URL must name a scenario, a variant, and a pass. The pre-React
// DevTools hook in index.html duplicates this rule inline because it has to run
// before any module is evaluated; test/devtools-hook.test.js asserts that the
// inline copy and this module agree on every query shape.
export const MEASURED_PARAMETERS = ['scenario', 'variant', 'pass'];

export function isMeasuredRealm(search) {
  const params = new URLSearchParams(search);
  return MEASURED_PARAMETERS.every((name) => (params.get(name) ?? '') !== '');
}
