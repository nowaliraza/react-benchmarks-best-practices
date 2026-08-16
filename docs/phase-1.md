# Phase 1 foundations release

Phase 1 adds eight preregistered React-only scenarios to the Phase 0 kernel:

1. Render, commit, and DOM-mutation boundary calibration
2. Local versus lifted state update scope
3. Stable versus recreated object props through `React.memo`
4. Structural sharing across memoized branches
5. Synchronous, same-microtask, and real-task batching contexts
6. Direct-value versus functional state queues
7. Same-value update sequences before and after real work/idle boundaries
8. Automatic batching versus `flushSync`, including presented-frame sampling

Together with the Phase 0A `useCallback` tracer and calibration scenarios, these form the foundations evidence release.

## Preregistration outcome

The first exploratory run matched all preregistered relations except `real-same-idle-same`. React 19.2.8 invoked the component and fired the root commit hook for the post-idle same-value dispatch even though it caused no second DOM mutation. The original artifact remains under `artifacts/runs/2026-08-16T07-45-40-381Z`, and the prediction change is recorded in `AMENDMENTS.md` before publication sampling.

The first Chapter 3 publication attempt also exposed a frame-gate defect: `flushSync` presented `1` before `2`, while the generic gate counted only a state literally named `intermediate`. A later corrected-gate run observed zero intermediate frames in both processes. The release therefore treats presentation as variable while retaining the reproducible two-commit result. Both prediction changes and superseded artifacts remain documented.

## Evidence boundary

These scenarios report public observations: component probes, root commit-hook calls, DOM mutations, semantic final state, live behavior, and presented frames. They do not claim an exact internal bailout location, lane, fiber flag, queue representation, or reconciliation duration.

The runtime trap now converts uncaught measured-realm errors and unhandled promise rejections into failed operations. A broken React subject therefore cannot be interpreted as a zero-work result.

## Publication

The compatible Chapter 1–3 publication runs contain 514 raw observations, zero gate issues, and clean manifests tied to implementation commit `0c6c8fd7f15934686a7b683c5b300ccb61a2fcb5`. The versioned files are in [`datasets/phase-1`](../datasets/phase-1/README.md), and the evidence-level findings are in [`reports/phase-1-foundations.md`](../reports/phase-1-foundations.md).
