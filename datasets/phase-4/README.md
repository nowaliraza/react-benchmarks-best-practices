# Phase 4 builds and observer effects dataset

This directory contains the versioned Chapter 6 publication release: one complete, gate-clean run with 744 observations and a compatible merged view.

## Compatibility envelope

- React and ReactDOM: `19.2.8`
- Scheduler: `0.27.0`
- Chrome: `145.0.7632.159`
- Node: `v22.12.0`
- Builds: production, development, and profiling
- Protocol: `0.1.0`
- Registry hash: `e55d6735177137498f35289b07ed77eaf0fcc26f1226d646e82206c1cf776569`
- Registry and implementation commit: `1aeea70b4f09b90e84eb13613280556cb4bb8bc6`
- Workload: calibrated `4-builds-observers`, 500 observer items, and 10 ms responsiveness work
- Working tree during measurement: clean

## Files and sampling

| File | Purpose |
| --- | --- |
| `chapter-6-result.json` | Manifest, verdicts, raw observations, summaries, gate, and operations |
| `chapter-6-observations.jsonl` | 744 append-only observation rows |
| `chapter-6-manifest.json` | Standalone reproducibility manifest |
| `merged-result.json` | Compatible observations and recomputed summaries |

The release contains 40 exact rows, 28 behavior rows, 640 micro-timing rows, and 36 responsiveness rows. All six scenarios are supported and the publication gate reports zero issues. Observer timing directions were intentionally not preregistered; the measurements quantify apparatus cost without promoting noisy deltas into optimization claims.

## Reproduction

At the implementation commit:

```bash
npm ci
npm run verify
npm run measure -- --chapter 6
npm run results:merge
```

Publication requires the pinned environment and a clean committed tree. Timing values apply only to the recorded workloads, build matrix, and machine.
