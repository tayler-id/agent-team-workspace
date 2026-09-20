# Performance notes for agora-s1-bootstrap-repository at 84a9243c435909a8c15c4d4a89b1e6ace9d22107

Recorded 2026-09-20T02:45:59Z. node: v24.16.0  pnpm: 10.34.1  postgres: pg_ctl (PostgreSQL) 18.4 (Homebrew)  host: Darwin 25.5.0 arm64 No `agora project verify --scenario perf` runner exists yet (U01b); these are direct measurements with the same fixture and host, not the five interleaved parent/head batches the milestone probe requires. Regenerate with `bash evidence/U01a/agora-s1-bootstrap-repository/regenerate.sh`.

## Parent baseline

The parent (9369a01) has no runtime, so parent behavior is absent. Absence is reported, not compared. Host cost of the existing design gate at parent and head is the same `node scripts/verify-design.mjs`, unchanged by this task.

## Head measurements

| Metric | Observed | Budget |
| --- | --- | --- |
| Strict typecheck (`tsc -p tsconfig.json`) | 0 s | none set |
| Lint (typescript-eslint strict type-checked) | 2 s | none set |
| Full test run including throwaway cluster boot (`pnpm test`) | 2 s | clean fixture build under 5 min |
| Clean install with an empty store | see lane-3 transcript | clean fixture build under 5 min |

## Schema validation latency

Ajv 8.20.0, 2020-12 mode, anchored UUID pattern, 2000 warm samples each, JSON.parse included in the timed region:

```text
{"label":"fixture command (174 B)","samples":2000,"p50_ms":0.0005,"p95_ms":0.0007,"max_ms":0.1081,"budget_p95_ms":5}
{"label":"128 KiB command with an unknown field (131059 B, expected reject)","samples":2000,"p50_ms":0.0309,"p95_ms":0.0513,"max_ms":0.1536,"budget_p95_ms":5}
```

The 128 KiB case is a rejection (unknown field), which is the only 128 KiB shape this schema can receive. Both p95 values sit under the 5 ms budget. This is a single-host, single-schema figure; the R21 golden vectors and the perf lane belong to later tasks.
