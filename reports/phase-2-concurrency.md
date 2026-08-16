# Phase 2 concurrency report

Phase 2 produced 192 publication observations from six preregistered React concurrency scenarios. Every active verdict was supported, both fresh processes passed, all gate issue counts were zero, and the unsafe tearing control was caught as an expected intra-variant rejection. The exact environment and raw rows are in [`datasets/phase-2`](../datasets/phase-2/README.md).

## Render-heavy work with a cheap commit

**Observed evidence:** Both variants invoked the 240 instrumented slow items, committed once, mutated one DOM text node, and reached the same final state in every exact and behavior repetition.

**Derived calculation:** Across 18 responsiveness samples per cell, the synchronous variant's maximum-gap p50 was `146.95 ms`; the Transition variant's was `11.50 ms`. Synchronous sample gaps ranged from `145.30–150.50 ms`, and all 18 recorded a `144–148 ms` Long Task. Transition gaps ranged from `11.00–13.60 ms`, with no Long Tasks.

**Derived conclusion:** For this render-dominated workload, marking the update as a Transition materially improved scheduling responsiveness. It did not make the operation finish sooner: elapsed-time p50 was `268.00 ms` synchronously and `270.25 ms` as a Transition. “More responsive” and “less total work” are different claims.

**Conceptual explanation:** This agrees with React's public statement that Transition rendering is non-blocking and can be interrupted by other updates. It does not expose how React divided internal work. See [`startTransition`](https://react.dev/reference/react/startTransition).

## Cheap render with a heavy commit

**Observed evidence:** Both variants invoked one cheap root component, committed once, changed one text node, and executed the planted `120 ms` layout-effect block.

**Derived calculation:** Maximum-gap p50 was `123.65 ms` synchronously and `122.15 ms` as a Transition. Every sample in both cells recorded one `120–121 ms` Long Task. Sample gaps remained within `121.60–125.50 ms`.

**Derived conclusion:** Transition priority did not make this synchronous commit-phase block interruptible. This is a deliberate calibration workload, not advice to perform expensive work in a layout effect.

## Urgent interruption and discarded work

The exact row selectors are `scenarioId = urgent-transition-interruption` or `discarded-render-work`, `pass = exact`, in [`chapter-4-result.json`](../datasets/phase-2/chapter-4-result.json).

**Observed evidence:** The Transition-only and uninterrupted variants committed once and had a discarded-work lower bound of zero in all 10 repetitions. The explicitly urgent variants committed twice. Every urgent lifecycle followed:

```text
first render chunk → urgent setter → urgent commit → transition commit
```

**Observed evidence:** `urgent-interrupt` recorded discarded-work lower bounds of 31–35 item renders. The dedicated `interrupted` variant recorded 32–35. Both reached their declared final state and preserved DOM identity.

**Derived calculation:** The lower bound is `max(0, measured slow-item invocations − 240)`. It counts only instrumented component-body work beyond one complete committed item set.

**Conceptual explanation:** Repeated public component invocations show that some work was executed without belonging to the eventual committed item set. The experiment does not identify the exact Fiber, lane, work-loop unit, or internal discard location. The planted urgent update is forced with `flushSync`; this result is not generalized to every ordinary timer update.

## External-store tearing

The host coordinator mutated the store outside React render. In every exact repetition for both store scenarios, the gate observed:

```text
first render chunk → external mutation → last render chunk of the first pass → commit
```

**Observed evidence:** Independent direct reads committed a torn tree in both processes: the first value was `0`, the last was `1`, the store version was `1`, and `allCommitsConsistent` was false. The correctness gate caught this as the preregistered expected rejection.

**Observed evidence:** `useSyncExternalStore` finished with every displayed value at `1`, store version `1`, and `allCommitsConsistent: true` in both processes. It committed twice and recorded a positive restarted-work lower bound of 5–8 item renders in all 10 exact repetitions.

**Derived conclusion:** Under the forced mutation schedule, independent mutable reads tore while the `useSyncExternalStore` integration preserved a single snapshot within every observed commit.

**Conceptual explanation:** React documents that when an external store changes during a non-blocking Transition, it rechecks the snapshot before applying changes and may restart the update as blocking to keep the screen consistent. The lab observes ordering, invocations, commits, and tree consistency; it does not inspect the internal restart mechanism. See [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore).

## Applicability and limits

These findings apply to React/ReactDOM `19.2.8`, Scheduler `0.27.0`, Chrome `145.0.7632.159`, the production bundle, recorded machine, and frozen workload in the manifest. Timing directions held in every rotation block, both fresh processes, and the pooled result; absolute timings are not generalized to other hardware or workloads.

The lab directly observed public component probes, root commit-hook calls, mutation records, layout-effect boundaries, timer ticks, Long Tasks, ordered lifecycle marks, and committed DOM consistency. Fiber fields, flags, lanes, internal queues, exact work-loop boundaries, and exact reconciliation time remain unobservable and are not claimed.
