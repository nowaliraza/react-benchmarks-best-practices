# React Reality Lab

React Reality Lab turns React advice into preregistered, reproducible evidence. It separates component invocation, React commits, DOM mutation, browser presentation, synchronous cost, and main-thread responsiveness instead of treating “rendering” as one event.

This repository implements **Phase 0A: the trusted kernel and tracer bullet**, **Phase 0B: prove the gate bites**, published **Phase 1 foundations**, **Phase 2 concurrency**, **Phase 3 Effects and boundaries**, and **Phase 4 builds and observer effects** releases, plus the **Phase 5 evidence experience**. Published artifacts are tied to their exact manifests, implementation commits, and registry amendment history.

## Requirements

- Node.js `22.12.0`
- Google Chrome `145.0.7632.159`
- npm (the lockfile is authoritative)

Install with `npm ci`. Dependencies are exact-pinned in `package.json` and resolved in `package-lock.json`.

## Commands

```bash
npm run verify
npm run fast
npm run measure -- --chapter 1
npm run measure -- --chapter 1 --resume <run-id>
npm run results:merge
npm run viewer:data
```

- `verify` runs schema tests, the browser-backed calibration slice, and a fault-injection matrix that plants every Phase 0B publication defect into the resulting artifact. Target: under two minutes.
- `fast` uses one browser process and reduced samples. Its results are permanently non-publishable.
- `measure` uses publication budgets, requires a clean committed tree, and runs one selected chapter.
- `--resume` reuses complete logical process attempts and reruns an interrupted process as a new physical-browser attempt. Partial JSONL is retained but excluded from verified summaries.
- `results:merge` merges only complete, gate-clean runs with compatible manifests.
- `viewer:data` rebuilds the compact result-viewer data from versioned publication artifacts.

Run `npm run dev` and open the local URL without query parameters to explore all published evidence, replay representative observations, or follow the six-chapter guided course.

Raw observations and operation journals are written incrementally under `artifacts/runs/<run-id>/`. A timeout or crash therefore leaves an auditable partial run. This directory is ignored by Git. Verified releases are versioned under [datasets/phase-1](datasets/phase-1), [datasets/phase-2](datasets/phase-2), [datasets/phase-3](datasets/phase-3), and [datasets/phase-4](datasets/phase-4), with matching reports under [reports](reports).

## Boundary

The measured page owns exactly one React root. The runner, persistence layer, and eventual result viewer use plain Node/DOM apparatus and never add a competing benchmark implementation. React’s DevTools hook is used only to count root commits. The harness does not inspect fibers, flags, lanes, internal queues, bailout positions, or work-loop details.

The preregistration is [src/registry.js](src/registry.js). Scenario implementations are under [src/scenarios](src/scenarios). Only the registry file contributes to the registry hash. Prediction changes after measurement belong in [AMENDMENTS.md](AMENDMENTS.md), and retractions remain in [RETRACTIONS.md](RETRACTIONS.md).

See [METHODOLOGY.md](METHODOLOGY.md) for evidence boundaries, pass isolation, controls, and publication policy. Implemented milestones are documented under [docs](docs), including [Phase 4](docs/phase-4.md) and the [Phase 5 evidence experience](docs/phase-5.md).
