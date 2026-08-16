# Phase 1 foundations report

Phase 1 produced 514 publication observations across three clean, compatible runs. Thirteen active scenarios were supported, one deliberately racy timer scenario was excluded, and every publication gate passed. The exact environment and raw rows are in [`datasets/phase-1`](../datasets/phase-1/README.md).

## What the calibration proved

**Observed evidence:** The constant-markup boundary invoked `Boundary` once and produced one root commit-hook call but zero DOM mutation records. Its round-trip counterpart invoked twice, committed twice, and mutated twice. This demonstrates that the lab distinguishes component invocation, commit, and DOM mutation.

**Derived calculation:** In the micro-timing calibration, 80 samples per cell produced a script/total p50 of `0.70 ms` for the light workload and `5.80 ms` for the heavy workload. Their p95 values were `0.91 ms` and `10.93 ms`. Layout duration was unavailable and remains `null`; production React emitted no Profiler callback for these cells, so no duration was invented.

**Derived calculation:** In the separately instrumented responsiveness calibration, the idle workload's maximum scheduling-gap p50 was `4.20 ms`; the blocked workload's was `81.70 ms`. Every one of the 18 blocked samples recorded one `80 ms` Long Task and one gap over 16 ms; idle samples recorded neither.

**Observed evidence:** The presented-frame calibration showed only `final` for the direct variant. The staged variant showed two sampled `intermediate` frames before `final` in both fresh processes. Its frame pass contained only `requestAnimationFrame` instrumentation.

These timing families use different instruments and are not compared with one another.

## Identity and update scope

The values below aggregate all exact-pass repetitions in both fresh browser processes. A row selector applies to [`chapter-2-result.json`](../datasets/phase-1/chapter-2-result.json) with `pass = exact` and the named scenario/variant.

| Scenario and variants | Observed evidence |
| --- | --- |
| `use-callback-semantics`: `inline` | Parent and memoized Child were each invoked once after the parent update. |
| `use-callback-semantics`: `callback-with-deps`, `callback-functional`, `module-stable` | Parent was invoked once; the memoized Child was not invoked. |
| `local-versus-lifted-state`: `local` | Leaf alone was invoked once. |
| `local-versus-lifted-state`: `lifted` | Parent, Leaf, and Sibling were each invoked once. |
| `memo-prop-identity`: `stable-object` | Parent was invoked once; memoized Child was not. |
| `memo-prop-identity`: `recreated-object` | Parent and memoized Child were each invoked once. |
| `structural-sharing`: `shared-branch` | Parent and changed branch were invoked; stable branch was not. |
| `structural-sharing`: `recreated-branch` | Parent, changed branch, and formerly stable branch were invoked. |

All compared variants passed their declared final markup and behavior controls.

**Conceptual explanation:** These results are consistent with React comparing props and memoized inputs by identity at public optimization boundaries. Stable identity can let a memoized child avoid invocation; moving state upward expands the set of components receiving the update. This does not identify an internal fiber, lane, or exact bailout location.

## Batching and state queues

These selectors apply to [`chapter-3-result.json`](../datasets/phase-1/chapter-3-result.json), again over all `exact` rows plus the matching behavior rows for final state.

| Scenario and variant | Invocations | Commits | DOM mutations | Final state |
| --- | ---: | ---: | ---: | ---: |
| `execution-context-batching` / `synchronous` | 1 | 1 | 1 | 2 |
| `execution-context-batching` / `single-microtask` | 1 | 1 | 1 | 2 |
| `execution-context-batching` / `task-boundary` | 2 | 2 | 2 | 2 |
| `state-update-queue` / `direct-values` | 1 | 1 | 1 | 1 |
| `state-update-queue` / `functional-updaters` | 1 | 1 | 1 | 3 |

**Observed evidence:** Two updates in one synchronous operation and across its single microtask continuation produced one invocation and one commit. Separating the updates with a real task boundary produced two of each. Three direct updates based on the same captured value finished at `1`; three functional updaters finished at `3`. Both queue variants committed once.

**Conceptual explanation:** The behavior agrees with React's documented automatic batching and queued functional-updater model. The experiment observes public results and does not inspect React's internal update queue. See the official [React 18 working-group batching explanation](https://github.com/reactwg/react-18/discussions/21) and [React upgrade guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide).

## Same-value dispatches

| Variant | Invocations | Commits | DOM mutations | Final state |
| --- | ---: | ---: | ---: | ---: |
| `fresh-direct-same` | 0 | 0 | 0 | 0 |
| `fresh-updater-same` | 0 | 0 | 0 | 0 |
| `real-same-same` | 1 | 1 | 1 | 1 |
| `real-same-idle-same` | 2 | 2 | 1 | 1 |
| `real-same-real-same` | 2 | 2 | 2 | 2 |

**Observed evidence:** A same-value dispatch on fresh state produced no component invocation or commit, whether supplied directly or through an updater. After a real update and an idle boundary, a same-value dispatch produced a second invocation and root commit-hook call without a second DOM mutation.

**Conceptual explanation:** “Same value” is not a sufficient synonym for “nothing observable happened.” The result demonstrates the distinction among invocation, commit, and mutation, but it does not locate or explain the internal reconciliation path. The post-data prediction correction is preserved in [`AMENDMENTS.md`](../AMENDMENTS.md).

## `flushSync` and presentation

**Observed evidence:** Automatic updates reached `2` with one invocation, one commit, and one DOM mutation. Inserting `flushSync` between the updates reached the same final state with two invocations, two commits, and two mutations.

**Observed evidence:** The automatic variant presented only `2` in both processes. The `flush-between` variant sampled `1` once before `2` in one process and sampled only `2` in the other. Earlier retained runs also produced both outcomes.

**Derived conclusion:** The extra commit was reproducible. Intermediate browser presentation was variable under this environment and is not claimed as guaranteed. The amended allowed range is zero to two intermediate frames; the null criterion concerns commit count only.

## Applicability and limits

The findings apply to React/ReactDOM `19.2.8`, Scheduler `0.27.0`, the production bundle and workloads recorded in the manifests, Chrome `145.0.7632.159`, and the recorded machine. They are not universal cross-version performance claims.

The lab directly observed component probes, public Profiler availability, root commit-hook calls, mutation records, semantic behavior, frames, timers, and Long Tasks. Fiber fields, flags, lanes, queue representation, exact bailout positions, and exact internal reconciliation time remain unobservable and are not claimed.
