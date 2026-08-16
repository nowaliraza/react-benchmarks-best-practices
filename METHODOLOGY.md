# Methodology

## Evidence labels

Every report must label statements as one of:

- **Observed evidence:** public signals recorded directly, such as component probes, Profiler callbacks, commits, mutations, frames, timer ticks, and Long Task entries.
- **Derived calculation:** statistics calculated from raw observations, such as p50, p95, counts, differences, and ordering checks.
- **Conceptual explanation:** a model that helps explain the evidence but was not itself measured.
- **Unobservable React internals:** fibers, lanes, flags, queues, exact bailout locations, and work-loop details. The lab does not claim to observe these.

Profiler duration is not described as exact reconciliation time. A commit without a DOM mutation is distinct from both an invocation and a presented frame.

## Isolated passes

Each observation opens a fresh page containing one measured React root.

### Exact

Records instrumented component bodies, setter wrappers, effects, refs, Profiler callbacks, DevTools root commits, ordered lifecycle events, and DOM mutations. Exact observations do not support performance conclusions.

### Behavior log

Records canonical final markup, state, identity, focus, selection, live form properties, effect/ref lifecycle evidence, and declared intra-tree consistency values.

### Behavior frame

Records semantic states at animation-frame boundaries. The component work log is disabled. Frame counts use preregistered ranges when timing makes exact integers fragile.

### Micro timing

Records `micro_script_ms`, `micro_layout_ms`, `micro_total_ms`, `micro_e2e_ms`, and public Profiler duration as raw per-sample observations. Component work logging is disabled. Metrics without a public or explicit probe are `null`, never fabricated as zero. Standard production React may not emit Profiler callbacks; in that case duration is `null` and `profiler_callback_count` is zero. Summaries use explicitly family-prefixed p50 and p95 columns.

### Responsiveness

Records elapsed time, a 1 ms tick sampler, maximum scheduling gap, gaps over 16 ms, and Long Task durations/start offsets. Work logging and mutation observation are disabled. Responsiveness numbers are never compared directly with micro-timing numbers.

## DOM canonicalization

Expected markup always comes from a reference variant. Canonicalization removes comment nodes; lowercases HTML names; sorts attributes; sorts style properties; preserves text and `data-*` values exactly by default; and normalizes only a fixed, versioned list of true boolean attributes by presence:

```text
checked disabled hidden multiple readonly required selected
```

Whitespace normalization is opt-in per scenario. Live `value`, `checked`, focus, selection, and uncontrolled state are behavior controls rather than serialized-markup assumptions.

## Controls

Cross-variant checks compare declared dimensions with a reference. Intra-variant checks test agreement inside one committed tree. Every declared difference must occur, and every recognized difference must be declared. Expected planted failures are considered successful only when the gate rejects them.

An incorrect variant cannot win a timing comparison. Direction claims must hold in every rotation block, in every fresh process, and in the pooled result before publication. Rotations are correlated order conditions, not independent observations.

## Sampling

Publication micro-timing cells use 8 iterations × 5 rotations × 2 processes. Responsiveness cells use 3 iterations × 3 rotations × 2 processes. Semantic exact passes use 5 repetitions. Fast and verification modes use reduced budgets and are non-publishable.

## Reproducibility and publication

The manifest records exact React, ReactDOM, Scheduler, Chrome, Node, protocol, registry, implementation, bundle, and amendment identifiers alongside orders, instruments, budgets, process count, CPU, viewport, workload, timeouts, and tree cleanliness.

Publication refuses version mismatches, missing manifest vectors, an uncommitted or dirty tree (including untracked source), incomplete operations, failed controls, instrument leakage, and nondeterministic required direction. Raw samples are retained. Null and inconclusive findings are publishable; retractions never delete history.

## Gate proof

Verification derives a clean publication envelope from its browser-backed artifact and plants each Phase 0B defect independently. A run passes only when all named faults produce their intended structured rejection codes, including the real preview-startup failure probe. The complete matrix is retained with the verification artifact.
