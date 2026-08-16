# Phase 2 concurrency dataset

This directory is the versioned Chapter 4 publication release for React Reality Lab. It contains one complete, gate-clean run and a compatible merged view of the same 192 observations.

## Compatibility envelope

- React: `19.2.8`
- ReactDOM: `19.2.8`
- Scheduler: `0.27.0`
- Chrome: `145.0.7632.159`
- Node: `v22.12.0`
- Build: production
- Protocol: `0.1.0`
- Registry hash: `1acca7635caa203b5acb6190e2b4e84f53db311341edf37ea2d3dcd200b1006c`
- Registry and implementation commit: `688e5b127f10d73ca8d7a6dcdf3100d4fb8940d8`
- Workload phase: `2-concurrency`, calibrated and frozen
- Working tree during measurement: clean

The manifest records the complete CPU, viewport, workload, order, instrument, timeout, bundle, amendment, and sampling vectors.

## Files

| File | Purpose |
| --- | --- |
| `chapter-4-result.json` | Manifest, verdicts, 192 raw observations, summaries, gate outcome, and completed operations |
| `chapter-4-observations.jsonl` | Append-only raw observation rows |
| `chapter-4-manifest.json` | Standalone environment and reproducibility manifest |
| `merged-result.json` | Compatible observation set and recomputed summaries |

All six scenario verdicts are `supported`, the gate issue count is zero, and the manifest is `publishable: true`. The unsafe direct-store variant is retained as an expected intra-variant tearing rejection, not silently omitted.

## Sampling

- Exact: 5 repetitions × 2 fresh processes = 10 rows per cell
- Behavior log: 1 repetition × 2 fresh processes = 2 rows per cell
- Responsiveness: 3 iterations × 3 balanced rotations × 2 fresh processes = 18 rows per cell

An observation is addressed by:

```text
scenarioId + variantId + pass + processIndex + rotationIndex + iteration + orderIndex
```

`attemptIndex` identifies the physical-browser attempt. Only complete logical process attempts enter verified results.

## Reproduction

At the implementation commit, run:

```bash
npm ci
npm run verify
npm run measure -- --chapter 4
npm run results:merge
```

Publication requires the pinned runtime versions and a clean committed tree. Responsiveness values apply only to the recorded machine and workload.
