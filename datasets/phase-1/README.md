# Phase 1 foundations dataset

This directory is the first versioned evidence release from React Reality Lab. It contains three independently executed, manifest-compatible publication runs and their merged observations.

## Compatibility envelope

- React: `19.2.8`
- ReactDOM: `19.2.8`
- Scheduler: `0.27.0`
- Chrome: `145.0.7632.159`
- Node: `v22.12.0`
- Build: production
- Protocol: `0.1.0`
- Registry hash: `612d11ce31a9e1eb4c733c21124190442a0fab166d284bb10c117bac5701876d`
- Registry and implementation commit: `0c6c8fd7f15934686a7b683c5b300ccb61a2fcb5`
- Working tree during measurement: clean

The complete machine, viewport, workload, instrument, order, timeout, bundle, amendment, and sampling records are in each chapter manifest.

## Files

Each `chapter-N-result.json` contains the manifest, verdicts, raw observations, summaries, gate outcome, and completed-operation records. Its matching `observations.jsonl` is the append-only raw observation stream. `merged-result.json` contains the 514 compatible observations and recomputed summaries across all three runs.

| Chapter | Result | Raw rows | Manifest | Observations | Gate issues |
| --- | --- | ---: | --- | ---: | ---: |
| 1 | `chapter-1-result.json` | `chapter-1-observations.jsonl` | `chapter-1-manifest.json` | 236 | 0 |
| 2 | `chapter-2-result.json` | `chapter-2-observations.jsonl` | `chapter-2-manifest.json` | 120 | 0 |
| 3 | `chapter-3-result.json` | `chapter-3-observations.jsonl` | `chapter-3-manifest.json` | 158 | 0 |

Every included manifest is marked `publishable: true`. Chapter 3 deliberately retains the zero-millisecond timer scenario as excluded evidence with the structured reason `timer-race`.

## Row identity

An observation is addressed by:

```text
scenarioId + variantId + pass + processIndex + rotationIndex + iteration + orderIndex
```

`attemptIndex` identifies the physical-browser attempt. Only the latest complete attempt for each logical process is included in a verified result; partial attempts remain in ignored run artifacts and never enter these files.

## Reproduction

At the implementation commit, run:

```bash
npm ci
npm run verify
npm run measure -- --chapter 1
npm run measure -- --chapter 2
npm run measure -- --chapter 3
npm run results:merge
```

Publication execution requires the pinned runtime versions and a clean committed tree. Timing values apply only to the recorded environment and workload.
