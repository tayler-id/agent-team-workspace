# Milestone performance confirmation at b9c65c4487b9c08237d22cb4be4ae92999308bc4

recorded_at: 2026-09-20T20:32:06Z

Purpose: confirm the R22 performance budgets still hold at the exact qualified revision. The code diff
from `cfd755a`/`e0c480c` (the revisions already measured in `evidence/U01a/agora-s1-enforce-test-first/performance.json`
and `performance-diagnostic.json`) to this head is `.gitignore` only (commit `b9c65c4`, "chore: ignore Finder
metadata"). This is a single confirmatory sample at the qualified head, not a repeat of the five-batch
parent/head diagnostic protocol already retained and independently re-verified below; no `agora project
verify --scenario perf` runner exists yet (U01b), matching the plan's stated bootstrap limitation.

## Clean build and test timing

| Metric | Observed | Budget |
| --- | --- | --- |
| `swift build` after `swift package clean` (`contracts/swift`) | 10.21 s | clean fixture build under 5 min |
| `pnpm test` (full suite, real throwaway PostgreSQL cluster) | 40.07 s (93 tests, 19 files, all pass) | clean fixture build under 5 min |

Both are far inside budget, consistent with the retained parent/head clean-build ratio of 1.011 recorded at the task level.

## Schema validation latency

Measured through the project's own public validator (`createWireValidator().validate('FixturePolicyCommand', ...)`
from `contracts/src/index.ts`), 2000 warm samples per case, JSON stringify/parse included in the timed region:

```text
{"label":"fixture command (174 B)","samples":2000,"p50_ms":0.0007,"p95_ms":0.001,"max_ms":0.1696,"budget_p95_ms":5}
{"label":"128 KiB command with an unknown field (131039 B, expected reject)","samples":2000,"p50_ms":0.031,"p95_ms":0.0376,"max_ms":0.0805,"budget_p95_ms":5}
```

Both p95 values sit far under the 5 ms budget for a 128-KiB command.

## The retained SwiftPM aggregate anomaly (independently re-inspected, not rerun)

`evidence/U01a/agora-s1-enforce-test-first/performance.json` records, at parent `fb67e9ce2c6658d672ca6446f524714ec55cbac5`
and head `cfd755a902c865c5ac993d9bcff146f0ea8932c9`, a passing clean-build ratio (1.0111) and a **failing**
standalone SwiftPM-backed conformance ratio (1.3372, over the 10% budget). That failure is preserved
unedited; it is not waived or hidden by this qualification.

Firstmate separately authorized one bounded diagnostic, recorded in `performance-diagnostic-plan.md`
(sha256:917b514c1c1c6633c4239aa26ab042f01e131e67bebf7e53eaeadf2737f88e1d, verified unchanged against the
live `performance-diagnostic.json`'s `plan_digest` field) and its results in `performance-diagnostic.json`.
Independently reading that file's `metrics` object directly (not just the task README's prose) confirms:
`product_ms.ratio` = 1.06657, `launch_overhead_ms.ratio` = 1.00742, both under the 10% budget, and
`original_failure_preserved: true`. This disconfirms a *repeatable* 33.7% consumer regression and shows
launch-time variance on the unchanged parent revision too, but it does not identify which host process
produced the original single slow sample — the original run recorded only an aggregate, not per-stage
timing. That gap in root cause is retained as-is, not asserted away.

Conclusion for milestone qualification: the aggregate SwiftPM anomaly is a genuine, retained, unresolved
observation about one measurement's aggregate timing, not a defect reproduced against the actual golden
vectors (contracts:conform passed 97/97 with zero TypeScript/Swift disagreements at this exact head — see
`evidence/U01a/milestone/drive-contracts-conform.log`). It does not block qualification because R22's FG01-FG03
proofs for U01a concern correctness (drift/conformance/rejection), and the plan's own perf rule targets a
runner that does not exist until U01b; this bounded diagnostic is the best available substitute the plan permits.
