# Phase 5 evidence experience

Phase 5 turns the versioned releases into a local evidence console. It adds no benchmark scenario and makes no new React claim. Its job is to help a reader trace each existing claim from preregistration through a representative raw row, derived summaries, and the publication verdict.

## Result viewer

The viewer covers all 34 published or retained scenarios and 1,962 publication observations across Phases 1–4. Readers can filter by release, search claims and variants, inspect the prediction → observation → verdict chain, compare summary cells within one evidence family, and open the manifest controls and applicability envelope.

`npm run viewer:data` deterministically rebuilds `src/viewer/generated-results.json` from the versioned datasets and current registry. The compact file keeps one raw exemplar for each variant/pass cell plus publication summaries; the complete append-only rows remain authoritative under `datasets/`.

## Recorded replay

Replay walks a single published observation through only the boundaries the apparatus recorded: component work, public lifecycle events, React commits, DOM mutation, frame presentation, timing, or responsiveness sampling. It never invents fiber, lane, flag, queue, or work-loop animation. The interface labels replay as recorded evidence rather than a live rerun.

## Guided curriculum

Six chapters teach the evidence model in order: instrument calibration, identity scope, update queues, concurrent render versus commit, synchronization boundaries, and observer effects. Each field note asks a falsification question before revealing its prediction, observation, verdict, and applicability. Progress is optional local browser state and does not enter any measurement or artifact.

## Realm isolation

The entry module selects a realm before loading its implementation:

- A URL with `scenario`, `variant`, and `pass` parameters loads only the measured runner and assigns `#measured-root`.
- A URL without a scenario loads the evidence console and assigns `#viewer-root`.

The two implementations are separate dynamic chunks. Measured pages still own exactly one React root, and the teaching UI never mounts beside a benchmark subject.
