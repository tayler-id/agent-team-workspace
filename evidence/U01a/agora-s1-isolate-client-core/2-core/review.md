# U01a.B03 slice 2: client core and lane 7

Parent: `a449e6aadc30cb44d6500e0cee667146b44b942e`. Verified code: `ea44a461cdfe7fd3ad39d64a0f14406300560c05`, tree `f011cf8039393ea936425613f68210ee51720fef`. This completes the core slice, not the boundary slice or the U01a milestone.

## Scope and size

The core uses generated neutral values through a types-only package export, not fixture schemas, React, DOM, storage, service or transport code. Its immutable transitions own snapshots, ordered replay, revision ordering, bounded gaps, dedupe, receipts, retry decisions, explicit read state and unsent drafts. The fixture translator and CLI live outside the core. Swift independently projects the same six fixture vectors using schema validation and generated-type decoding.

Relative to slice 1: 566 authored additions and 25 deletions in 16 files; 729 fixture additions in one file; 11 lockfile additions and one deletion; no generated output changed. The two retained verification recipes add 55 source lines. The 200-line target is exceeded because synchronization transitions, their public driver and cross-language/negative proof are one behavior unit. Both R11 block thresholds remain un-crossed. The original installer remains unchanged.

## Proof and commands

`verify.sh` and `perf.mjs` are the exact reproducible recipes. The task-local logs bind all commands and the subject. In particular:

- `red.log` applies the same tests and fixtures to the slice-1 empty core and existing Swift consumer. The idle core operation succeeds before the accepted-snapshot assertion fails. Swift returns its existing report but no replay projection, failing the literal expected states. The focused command runs 12 core tests and one Swift test; `green.log` passes all 13. Missing fixture CLI files on the parent are never used as the red cause.
- `lane-7.json` is the public `pnpm client:replay -- --json --swift` transcript: ordered, gap-filled, duplicate, unknown-state, unfilled-gap and stale-run-revision vectors. Every TS and Swift state equals its literal expected snapshot. Unknown changes retain projection/cursor, request upgrade, and generate no acknowledgement. Only synchronization mode changes to pause delivery.
- `guard-negatives.log` kills eight isolated source mutations: record revisions, duplicates, gap acknowledgement, unknown-state pause, stale snapshot order, buffer bound, command digest and input ownership. Guard-disable hooks are absent from production source.
- `skill-run.log` records fresh frozen install, strict lint/typecheck, docs, contract drift, golden conformance, lane 7, all 69 unit/contract/real-PostgreSQL tests, public health/policy probe, repeat migrations, 23 design checks and the unchanged informational plan checker. `audit.json` reports no production dependency advisories. No external dependency was added.
- `cleanup.log` confirms owned worktrees/clusters are removed and red/green receipts remain. Temporary mutation and malformed-CLI files are removed in `finally`.

## Performance and reproduced corrections

The first large replay took 10,596 ms (`replay-performance-red.json`). Re-sorting and recounting every message on every event was the cause. Binary insertion/replacement and unread deltas preserve immutable snapshots without full re-sorts. Five interleaved parent/head batches in `performance.json` use the identical 50,000-message plus 1,000-event input. The parent has no synchronization behavior and returns no cursor, so no misleading ratio is claimed. Head replay takes 1,434-1,462 ms, under two seconds; final cursor is `51000` and unread is 51000. Node heap after explicit GC is about 16.1 MB. This is not browser heap, renderer latency or R23 qualification.

Tests also reproduced and corrected snapshot revision rollback, CLI unknown/malformed-input acceptance, and the package manager's forwarded `--` separator. Their supplementary red logs are retained. Running the skill literally exposed the separator defect; the fixed public command and full skill were then re-run at the verified head.

## Limits and review

No React/UI, browser storage, HTTP/WebSocket transport, authentication, provider call, worker or product route exists in this slice. Draft session-storage persistence belongs to a later browser adapter; the core preserves unsent draft values through route/snapshot transitions and clears private state on logout/revocation input. Retry requests apply only to the same idempotent Agora command identity/digest, not provider or billable calls. This fixture cannot authorize a production operation.

Lane 7 is a headless public command with literal JSON assertions, not a UI scenario; no screenshot or UI video is presented as proof. Mechanical import/export enforcement and lane 8 are still pending slice 3. Verification-skill maintenance outcome: changed, with affected source read serially and every Drive command exercised. Independent non-author exact-head review remains with Firstmate; no self-review is labelled independent.
