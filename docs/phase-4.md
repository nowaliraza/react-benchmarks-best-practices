# Phase 4 builds and observer effects release

Phase 4 adds six scenarios and a three-bundle runner matrix:

1. Production, development, Strict root, and Strict subtree mount semantics
2. Standard production versus profiling-build Profiler callbacks
3. React Profiler overhead
4. Component work-log overhead
5. MutationObserver overhead
6. Responsiveness sampler/Long Task observer overhead

## Bundle isolation

Chapter 6 builds production, development, and profiling bundles into separate output directories, records a hash for each, and serves them on separate local ports. Each observation includes its `buildType` and `strictMode` vector. The profiling bundle aliases the client renderer entry to `react-dom/profiling`; the development bundle is built with `NODE_ENV=development`.

The teaching UI remains outside these measured pages. Every page still contains exactly one measured React root.

## Calibration

The first fast matrix at `artifacts/runs/2026-08-16T20-22-51-851Z` passed all preregistered relations:

- Production and plain development: one subject invocation, one layout-Effect setup.
- Strict root: two invocations, two setups, one cleanup.
- Strict subtree: two invocations, one setup, zero cleanups.
- Standard production Profiler callback count: zero; profiling build: one.
- Every observer on/off cell recorded its intended instrument vector and equal final behavior.

Observer timing directions are deliberately not preregistered. The release quantifies the deltas and reports unstable or negligible differences without treating instrumentation as an application optimization.

Development and Strict Mode evidence is never generalized to production. Responsiveness overhead remains in the responsiveness family and is not compared directly with micro-timing overhead.

## Publication

The clean Chapter 6 publication run at `artifacts/runs/2026-08-16T20-26-58-477Z` contains 744 completed observations across two fresh browser processes. All six verdicts are supported and the publication gate reports zero issues. The versioned evidence is in [`datasets/phase-4`](../datasets/phase-4/README.md), and the evidence-level findings are in [`reports/phase-4-builds-observers.md`](../reports/phase-4-builds-observers.md).
