# React Benchmarks

React Benchmarks is a reproducible benchmark suite for React 19.2.8. It tests specific claims about rendering, state, memoization, Effects, concurrency, and instrumentation.

The experiment compares small React implementations that should produce the same result. It records what can be observed from public APIs and the browser:

- component invocations
- React commits
- DOM mutations
- final markup and state
- presented animation frames
- synchronous duration
- main-thread scheduling gaps and Long Tasks

These signals are kept separate. A component invocation is not a commit, a commit is not necessarily a DOM mutation, and a DOM mutation is not proof that the browser presented an intermediate frame.

## How the experiment works

Each scenario has a claim, prediction, metric, and failure condition in [`src/registry.js`](src/registry.js). A run then:

1. opens a fresh page with one measured React root;
2. runs each implementation with the same workload;
3. checks that compared implementations preserve their declared behavior;
4. records raw observations in separate semantic, timing, and responsiveness passes;
5. rejects incomplete, incompatible, or incorrect results.

The harness does not inspect React fibers, lanes, flags, queues, or other internals. Explanations based on those internals are not presented as measured facts.

## Experiments

| Chapter | Subject |
| --- | --- |
| 1 | Calibration of commits, mutations, timing, responsiveness, and frames |
| 2 | Callback identity, state placement, `React.memo`, and structural sharing |
| 3 | Batching, state update queues, same-value updates, and `flushSync` |
| 4 | Transitions, interruption, discarded work, and external-store consistency |
| 5 | `useMemo`, derived state, Effects, and refs |
| 6 | Production and development builds, Strict Mode, Profiler support, and observer overhead |

Published findings are in [`reports/`](reports). Raw observations, manifests, and summaries are in [`datasets/`](datasets).

## Requirements

- Node.js 22.12.0
- Google Chrome 145.0.7632.159
- npm

The exact versions matter because React and browser scheduling behavior can change between releases.

## Run it

Install dependencies:

```bash
npm ci
```

Run the short, non-publishable suite:

```bash
npm run fast
```

Run tests and the browser-backed verification checks:

```bash
npm run verify
```

Open the result viewer:

```bash
npm run dev
```

Vite prints the local URL. Open it without query parameters to browse the published results.

## Publication runs

Run one chapter with the full sample budget:

```bash
npm run measure -- --chapter 1
```

Publication mode requires a clean, committed working tree. It uses fresh browser processes and writes raw data incrementally to `artifacts/runs/<run-id>/`. This directory is ignored by Git.

Resume an interrupted run:

```bash
npm run measure -- --chapter 1 --resume <run-id>
```

Merge compatible completed runs and rebuild the viewer data:

```bash
npm run results:merge
npm run viewer:data
```

Fast runs and incomplete attempts are excluded from publication results. A publication result must pass behavior controls, version checks, completeness checks, and the preregistered direction checks in every process and rotation block.

## Repository map

- [`src/registry.js`](src/registry.js): preregistered claims and expected results
- [`src/scenarios/`](src/scenarios): React implementations under test
- [`src/harness/`](src/harness): browser runner, instruments, controls, and publication gates
- [`METHODOLOGY.md`](METHODOLOGY.md): sampling, isolation, evidence labels, and publication rules
- [`AMENDMENTS.md`](AMENDMENTS.md): prediction changes made after measurement
- [`RETRACTIONS.md`](RETRACTIONS.md): retracted findings without deleted history
- [`reports/`](reports): readable findings
- [`datasets/`](datasets): published raw data and manifests

Absolute timings apply only to the recorded machine, browser, React version, and workload. Prefer the controlled comparisons and raw observations over treating the numbers as general React performance rankings.
# react-benchmarks-best-practices
