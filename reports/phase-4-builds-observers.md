# Phase 4 builds and observer effects report

Phase 4 produced 744 publication observations from six preregistered scenarios. Every verdict is supported, both fresh processes completed, and the publication gate reports zero issues. The raw evidence is in [`datasets/phase-4`](../datasets/phase-4/README.md).

## Build and Strict Mode semantics

**Observed evidence:** Production and plain development mounts invoked the subject once and ran one layout Effect setup. A development Strict root invoked twice, ran two setups, and one intervening cleanup. A Strict subtree invoked twice while retaining one setup and zero cleanups. All four variants produced equivalent final behavior in every repetition.

**Derived conclusion:** Development Strict Mode render replay is visible at both root and subtree boundaries, while initial Effect replay depends on the root boundary in this fixture. This evidence is deliberately not generalized to production behavior.

## Standard and profiling builds

**Observed evidence:** The standard production renderer emitted zero public Profiler callbacks in all 80 timing samples. The profiling renderer emitted exactly one callback in every sample and reported a `2.60 ms` median `actualDuration` for the recorded workload. Final behavior remained equivalent.

**Derived calculation:** Standard production recorded `3.00 ms` p50 and `5.10 ms` p95 total synchronous time. The profiling build recorded `4.60 ms` p50 and `8.50 ms` p95. These are build-specific workload measurements, not a general multiplier.

## Instrument overhead

Each timing cell contains 80 samples. The table reports total synchronous duration; the preregistration intentionally declares no timing winner.

| Instrument pair | Off p50 / p95 | On p50 / p95 |
| --- | ---: | ---: |
| React Profiler boundary | `4.85 / 7.40 ms` | `4.65 / 7.61 ms` |
| Component work log | `2.80 / 4.01 ms` | `3.20 / 6.01 ms` |
| MutationObserver | `5.25 / 9.20 ms` | `5.70 / 9.81 ms` |

**Observed evidence:** Each on/off pair preserved equal final behavior and recorded exactly its declared instrument vector. The small timing differences are workload- and machine-specific. In particular, the Profiler-boundary medians do not support treating instrumentation as an application optimization.

## Responsiveness instruments

**Observed evidence:** Both cells completed the same 10 ms operation and settling window. The boundary-only control recorded a median of two ticks. The active sampler recorded a median of 37 ticks, satisfying its required 20–200 range. Median elapsed time was `130.70 ms` off and `131.50 ms` on.

**Derived conclusion:** The sampler changes the measurement apparatus and exposes sub-window gaps; its max-gap values are not comparable to the two-boundary control as if they were the same metric. Responsiveness evidence remains separate from micro timing.

## Applicability

Findings apply to React and ReactDOM `19.2.8`, Chrome `145.0.7632.159`, the three recorded bundle hashes, and the exact manifest workloads. They establish observable public behavior and apparatus cost without making claims about fibers, lanes, flags, or React's internal work loop.
