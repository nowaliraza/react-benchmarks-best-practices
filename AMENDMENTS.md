# Preregistration amendments

This append-only ledger records prediction changes made after any relevant measurement was observed. Each entry must include the affected registry record, old and new text, reason, author, timestamp, implementation commit, and whether earlier data had been viewed.

## Initial registration — 2026-08-15

- Scope: Phase 0A calibration and tracer scenarios in `src/registry.js`.
- Data viewed before registration: none in this repository.
- Amendment status: initial registration; not an amendment.

## Phase 0B behavior-control amendment — 2026-08-15

- Registry record: `use-callback-semantics.control.compare`.
- Old control: markup, behavior, DOM identity, state, and declared differences.
- New control: adds focus and selection preservation.
- Implementation fixture: the tracer now mounts the same focused uncontrolled input with a fixed selection in every variant.
- Reason: Phase 0B must prove that focus and selection regressions are rejected by an exercised cross-variant control, not only by a unit-level helper.
- Relevant data viewed beforehand: yes, local Phase 0A verification and Chapter 2 tracer data.
- Published finding affected: none; Phase 0A published no React claim.
- Author: React Reality Lab implementation session.
