# Phase 0B gate proof

Phase 0B normalizes a valid browser-backed verification artifact to a clean publication envelope, mutates it one defect at a time, and requires the publication gate to emit the intended structured rejection code. This isolates each planted defect even when verification itself is run from a dirty development tree. The report is saved as `fault-matrix.json` beside each verification result.

The matrix covers:

- React, ReactDOM, Scheduler, Chrome, registry, and protocol mismatches
- Dirty working tree and missing manifest fields
- Missing execution orders and raw sample vectors
- Unexpected markup and uncontrolled-value differences
- State, focus, and selection regressions
- Missing declared differences
- Intra-tree tearing/inconsistency
- Nondeterministic timing direction
- Instrument leakage
- Timeout, empty result, and preview-server failure
- Exclusion flag and structured-reason propagation

The focus and selection gate is exercised with a real focused uncontrolled input retained through the `useCallback` tracer’s parent update. This was added after Phase 0A data was viewed and is therefore recorded in `AMENDMENTS.md`.

CI runs verification rather than publication measurements. Publication remains a clean-tree, explicitly invoked local workflow.
