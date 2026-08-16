# Phase 3 Effects and boundaries dataset

This directory contains the versioned Chapter 5 publication release: one complete, gate-clean run with 512 observations and a compatible merged view.

## Compatibility envelope

- React and ReactDOM: `19.2.8`
- Scheduler: `0.27.0`
- Chrome: `145.0.7632.159`
- Node: `v22.12.0`
- Build: production
- Protocol: `0.1.0`
- Registry hash: `cf4d57be0c5403ce81d3a35f3c005d7dd1b08c6d94a2f93ce98ee3f72fba1013`
- Registry and implementation commit: `a753f7e98bea9065742fea4b8524d0834a1f5083`
- Workload: calibrated `3-effects`, zero-loop near crossover and 1,000,000-iteration expensive calculation
- Working tree during measurement: clean

## Files and sampling

| File | Purpose |
| --- | --- |
| `chapter-5-result.json` | Manifest, verdicts, raw observations, summaries, gate, and operations |
| `chapter-5-observations.jsonl` | 512 append-only observation rows |
| `chapter-5-manifest.json` | Standalone reproducibility manifest |
| `merged-result.json` | Compatible observations and recomputed summaries |

Exact cells contain 10 rows, behavior cells contain 2 rows, and micro-timing cells contain 80 rows. Seven scenarios are supported. `use-memo-crossover` is publishably inconclusive because the near-zero pair did not establish a stable direction above `0.05 ms`; its expensive pair still passed the required direction in every rotation/process block.

## Reproduction

At the implementation commit:

```bash
npm ci
npm run verify
npm run measure -- --chapter 5
npm run results:merge
```

Publication requires the pinned environment and a clean committed tree. Timing values apply only to the recorded workload and machine.
