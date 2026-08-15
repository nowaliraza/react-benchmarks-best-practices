# Dataset shape

Each raw observation identifies scenario, variant, pass, process, rotation, iteration, and order position. It carries `excluded` and a structured exclusion reason on every row, the exact enabled instruments, operation duration, and one pass-specific observed payload.

Micro-timing raw fields use the `micro_` prefix. Responsiveness raw fields use `responsive_`; there is intentionally no generic `total_ms` field spanning the two instrument configurations. Summaries retain raw observations and add family-specific p50/p95 columns.

`operations.jsonl` is the resumability journal. Only `completed` operations yield observations. Timeout and failure states remain in the journal and cause the publication gate to fail. `manifest.json` describes the environment, while `result.json` combines the manifest, observations, derived summaries, verdicts, and gate output.
