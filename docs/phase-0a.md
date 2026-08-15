# Phase 0A implementation

## Implemented tracer scenarios

1. Four-variant `useCallback` semantic slice with exact and behavior-log passes.
2. Light/heavy micro-timing calibration.
3. Idle/blocked responsiveness calibration with an 80 ms planted block.
4. Direct/staged presented-frame calibration.
5. Synthetic consistent/planted-tear intra-variant fixture. It demonstrates the gate and is explicitly not evidence that React tears.
6. Excluded zero-millisecond timer race row, propagated into raw results.

The scenario module also exports an external-mutation scheduling fixture that runs mutation from a host timer and records its position. Concurrency scenarios will use it to require `first render chunk → external mutation → last render chunk → commit`. Render-time mutation remains reserved for an impurity negative control.

## Trusted-kernel components

- Registry-only SHA-256 preregistration hash
- Zod registry and result contracts
- Fixed HTML boolean-attribute allowlist
- Reference-derived canonical markup
- Cross-variant and intra-variant controls
- Separate exact, behavior-log, behavior-frame, micro-timing, and responsiveness instrument sets
- Balanced deterministic execution rotations
- Unified timeout/cleanup wrapper
- Incremental JSONL raw observations and operation journal
- Exact environment and implementation manifest
- Clean-tree publication preflight
- Compatible-run merger
- Fault-injection tests and browser-backed planted failures

## Deliberately deferred

Phase 0A publishes no React performance claim. The full 28-scenario catalog, frozen concurrency workloads, findings pages, chapter reports, result browser, replay, and guided curriculum remain in Phases 1–5.
