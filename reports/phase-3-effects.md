# Phase 3 Effects and boundaries report

Phase 3 produced 512 publication observations from eight preregistered scenarios. Seven verdicts are supported and one is intentionally inconclusive. The run is publishable with zero gate issues; raw evidence is in [`datasets/phase-3`](../datasets/phase-3/README.md).

## `useMemo` crossover

**Observed evidence:** In every exact repetition, both direct variants invoked `Calculation` once during the update, while both memoized variants invoked it zero times. All variants committed once and preserved equal final markup and state.

**Derived calculation:** With 80 samples per cell, micro-total p50/p95 values were:

| Variant | p50 | p95 |
| --- | ---: | ---: |
| `direct-near` | `0.50 ms` | `1.10 ms` |
| `memo-near` | `0.45 ms` | `1.11 ms` |
| `direct-expensive` | `2.20 ms` | `4.90 ms` |
| `memo-expensive` | `0.60 ms` | `1.20 ms` |

**Derived conclusion:** The expensive memoized calculation passed the preregistered `0.25 ms` direction in every rotation/process block and pooled result. The near-zero difference did not remain above `0.05 ms`, so the scenario verdict is `inconclusive` rather than declaring a trivial winner.

**Conceptual explanation:** This matches React's public [`useMemo`](https://react.dev/reference/react/useMemo) contract: stable dependencies can reuse a cached calculation, but the optimization is valuable only when avoided work outweighs its context and noise.

## Derived and Effect-synchronized state

**Observed evidence:** Render-derived state invoked and committed once. The Effect-derived variant invoked twice, committed twice, and recorded one Effect setup. Both ended at identical markup and state.

**Observed evidence:** The layout-Effect and passive-Effect mirror variants each invoked twice, committed twice, and recorded one setup; their render-direct controls invoked and committed once. No browser-presentation claim is made for the passive case.

**Conceptual explanation:** Deriving data during render removes a synchronization update. Effects remain appropriate for external synchronization; these fixtures isolate the redundant-state case described by React's [`useEffect`](https://react.dev/reference/react/useEffect) guidance.

## Lifecycle and identity

**Observed evidence:** Every dependency-change repetition recorded exactly one `effect-cleanup` followed by one `effect-setup`, with one commit.

**Observed evidence:** Every callback-ref mount recorded `ref-attach` before `layout-effect-setup`, with one commit and no detach.

**Observed evidence:** A stable object dependency caused zero Effect cleanup/setup events during the unrelated update. Recreating the equal object caused one cleanup and one setup. A stable callback ref caused zero ref events; an inline replacement caused one detach followed by one attach on the preserved DOM node.

**Conceptual explanation:** These results are consistent with public dependency and callback identity semantics. They do not reveal Effect flags, internal commit traversal, or exact bailout positions.

## Applicability

Findings apply to the production React `19.2.8` build, recorded browser and machine, and exact manifest workloads. The React best-practices guidance influenced the render-derived state control, primitive/stable dependencies, functional state updates, and module-level component definitions used by the subjects.
