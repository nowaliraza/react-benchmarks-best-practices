# Phase 3 Effects and boundaries release

Phase 3 adds eight preregistered scenarios, bringing the catalog to 28:

1. `useMemo` near-zero and expensive calculation crossover
2. Render-derived versus Effect-synchronized state
3. Layout Effect state updates
4. Passive Effect state updates
5. Effect cleanup/setup ordering
6. Callback-ref attachment versus layout-Effect timing
7. Object-identity-driven Effect churn
8. Callback-ref-identity churn

## Calibration

The initial development artifact at `artifacts/runs/2026-08-16T19-22-47-826Z` exposed an incorrect equality control: lifecycle evidence was compared as behavior even though the Effect variants intentionally produce it. The correction is recorded in `AMENDMENTS.md`; predictions did not change.

The corrected artifact at `artifacts/runs/2026-08-16T19-23-42-609Z` passed with zero gate issues. Exact observations matched all preregistered counts. The zero-loop `useMemo` pair failed to establish a direction above `0.05 ms` and received a structured `inconclusive` verdict; the 1,000,000-iteration pair exceeded the `0.25 ms` required direction.

The Phase 3 workload is frozen at zero iterations for the near-crossover calculation and 1,000,000 iterations for the expensive calculation. Publication will use 80 micro-timing samples per cell and retain every raw sample.

## Evidence boundary

Effect and ref statements use ordered recorder events, public commit counts, public component probes, and DOM controls. They do not inspect Effect flags or commit internals.

The `useMemo` scenarios treat caching only as a performance optimization. Their predictions follow React's public [`useMemo`](https://react.dev/reference/react/useMemo), [`useEffect`](https://react.dev/reference/react/useEffect), and [`useLayoutEffect`](https://react.dev/reference/react/useLayoutEffect) contracts.

## Publication

The clean Chapter 5 run at `artifacts/runs/2026-08-16T19-25-47-222Z` contains 512 observations, seven supported verdicts, one structured inconclusive verdict, and zero gate issues. It is tied to implementation commit `a753f7e98bea9065742fea4b8524d0834a1f5083`.

The versioned release is in [`datasets/phase-3`](../datasets/phase-3/README.md), with findings in [`reports/phase-3-effects.md`](../reports/phase-3-effects.md).
