# Phase 2 concurrency release

Phase 2 preregisters six React-only scenarios:

1. Render-heavy work with a cheap host commit, synchronous versus Transition
2. Cheap render with a deliberately heavy layout-effect commit boundary
3. Urgent work interrupting a Transition
4. A public discarded-render-work lower bound
5. Forced external-store tearing from independent direct reads
6. `useSyncExternalStore` consistency under the same external mutation fixture

## Frozen development workload

The initial exploratory run at `artifacts/runs/2026-08-16T18-59-18-001Z` falsified two fixture assumptions: a zero-delay timer could fire before the first render chunk, and a default-priority timer update did not deterministically preempt the Transition. No prediction was changed. The host coordinator now polls outside React until the first render-chunk probe is visible, and the planted urgent update uses `flushSync` from that host timer.

The final calibration run at `artifacts/runs/2026-08-16T19-03-14-897Z` satisfied every preregistered relation with the per-commit consistency control enabled. The workload is frozen at:

```text
render items: 240 × 0.55 ms nominal component-body work
commit block: 120 ms layout-effect work
store items: 160 × 0.55 ms nominal component-body work
urgent delay: 12 ms after Transition scheduling
```

In that calibration process, the render-heavy synchronous/Transition maximum gaps were `145.5 ms` and `11.4 ms`. The commit-heavy gaps were `121.8 ms` and `124.4 ms`, each with one `120 ms` Long Task. Interrupted exact repetitions produced discarded-work lower bounds of 34–35 item renders. The external mutation landed between render-chunk marks; direct reads committed both store versions, while `useSyncExternalStore` kept every observed commit consistent and produced a restarted-work lower bound of eight item renders.

These are development calibration observations, not published findings. Publication still requires all rotations, both fresh processes, clean manifests, controls, raw samples, and a directionally stable result.

## Evidence boundary

The discarded-work metric is `max(0, observed item invocations - one complete committed item set)`. It is deliberately a lower bound; it does not expose fibers, lanes, work-loop units, or exact discard locations.

The external-store mutation is performed by a host timer outside component render. The gate requires the ordered marks `first render chunk → external mutation → last render chunk of the first pass → commit`. The direct-read variant is an expected gate rejection for tearing. The safe variant records consistency at every observed commit as well as in the final tree.

The concurrency predictions use React's public [`startTransition`](https://react.dev/reference/react/startTransition) and [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore) contracts. They do not infer internal scheduling primitives.

## Publication

The clean Chapter 4 run at `artifacts/runs/2026-08-16T19-13-30-495Z` contains 192 observations, six supported verdicts, zero gate issues, and the required expected tearing rejection. It is tied to implementation commit `688e5b127f10d73ca8d7a6dcdf3100d4fb8940d8` and the corrected `2-concurrency` workload manifest.

The versioned release is in [`datasets/phase-2`](../datasets/phase-2/README.md), with findings in [`reports/phase-2-concurrency.md`](../reports/phase-2-concurrency.md).
