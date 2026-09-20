# Performance notes for agora-s1-publish-portable-contracts at ef0f00178077b34c5a52e7149abac629b8856e3d

Recorded 2026-09-20T11:56:28Z. node: v24.16.0  pnpm: 10.34.1  swift: swift-driver version: 1.148.6 Apple Swift version 6.3.3 (swiftlang-6.3.3.1.3 clang-2100.1.1.101)  postgres: pg_ctl (PostgreSQL) 18.4 (Homebrew)  host: Darwin 25.5.0 arm64 No `agora project verify --scenario perf` runner exists yet (U01b); these are direct measurements on one host, not the five interleaved parent/head batches the milestone probe requires. Regenerate with `BRANCH=3 PARENT=<branch-2 head> bash evidence/U01a/agora-s1-publish-portable-contracts/regenerate.sh`.

## Parent baseline

The bootstrap parent (aaedd8d) validates one 200-byte fixture command with the same Ajv 8.20.0 pin; its measured p95 is in evidence/U01a/agora-s1-bootstrap-repository/performance.md. Contract generation, drift checking and cross-language conformance are absent there, so their cost is reported as new absolute figures, not a regression.

## Head measurements

| Metric | Observed | Budget |
| --- | --- | --- |
| Drift check, warm SwiftPM cache (`pnpm contracts:check`) | 1 s | none set |
| Joint conformance run, warm build (`pnpm contracts:conform`) | 1 s | none set |
| Unit tests including drift and conformance (`pnpm test:unit`) | 7 s | none set |
| Clean install, fresh SwiftPM build directory and full suite per revision | red/green wall clock in the regenerate run log (two revisions) | clean fixture build under 5 min per revision |

## Schema validation latency

Ajv 8.20.0, 2020-12 mode, shared wire validator, 2000 warm samples each, JSON.parse included in the timed region:

```text
{"label":"CliReport golden (723 B)","samples":2000,"p50_ms":0.0015,"p95_ms":0.0026,"max_ms":0.4873,"budget_p95_ms":5}
{"label":"valid CliReport (132910 B)","samples":2000,"p50_ms":0.1286,"p95_ms":0.1519,"max_ms":0.2446,"budget_p95_ms":5}
{"label":"CliReport with an unknown field (132923 B, expected reject)","samples":2000,"p50_ms":0.1283,"p95_ms":0.1413,"max_ms":0.3925,"budget_p95_ms":5}
```

Both 128 KiB shapes must sit under the 5 ms p95 budget. These are single-host figures for the largest published envelope; the perf lane belongs to U01b.
