# U01a.B03 slice 1: synchronization contracts

Parent: `606cba2bb9d90fc7c93169a24e72a488cb41b960`. Verified code subject: `0dbcbb64f33315aa4b33f6388e5e307b395e7e3b`, tree `ae950ef0fc71c3bad96eab2650c4a24561a6bb67`. This is the first approved slice, not task completion or U01a readiness.

## Scope and size

Firstmate approved three separately reviewable slices and fixture-only payload authority. This slice adds two reusable values, eight closed fixture components, generated consumers, 29 literal vectors and a test-only empty core baseline. The fixture is absent from production HTTP operations. The core harness exports no fixture types and performs no synchronization yet.

Code-subject diff: 273 authored additions and five deletions across 13 files; 198 fixture additions in one file; 1,176 generated additions and three deletions across four files; two lockfile additions. The task-local evidence recipes add 71 source lines across two files. This exceeds the 200-line target because schema source, both generated consumers and conformance must change together, but stays well below both R11 blocks. Generated and fixture counts are separate, not hidden. No installer bytes changed.

## Proof

- `red.log` and `green.log` bind the exact parent and code subject, command, test patch, schemas, configuration and toolchain. The existing health driver succeeds before `sync-cursor-large` is refused at parent (false versus true). Head passes all four synchronization contract tests. No missing runner is claimed as red.
- `skill-run.log` records literal Doctor, Drive and design commands: frozen install, lint, typecheck, documentation, regeneration drift, joint TypeScript/Swift conformance, 45 tests including real PostgreSQL, public center probes, repeat migrations, 23 design negatives and the unchanged informational plan checker. No test skips.
- The kind and unknown-field guard negatives weaken an isolated schema copy; both denial assertions then fail with `expected true to be false`. Generated drift and subset negatives also pass. These prove wire rejection, not replay or acknowledgement behavior.
- `performance.json` records five interleaved parent/head batches of 20,000 measured validations each after 2,000 warmups. Both use the same 133,458-byte CLI report fixture and include JSON parsing. Pooled p95: parent 0.14950 ms, head 0.152583 ms, ratio 1.02063. This meets 5 ms and 10% regression limits for this existing envelope. It is not a production 128-KiB command or a renderer benchmark. Fresh recorder worktrees build Swift and complete the focused tests in seconds, below five minutes. The generalized performance runner does not exist yet.
- `audit.json`: zero published production dependency advisories at capture time. No new external dependency, authentication, route, transport, storage or model capability. Snapshot content is bounded and tombstones reject a body. Cross-record consistency belongs to the adapter/core slice, not schema validation. No production publication authority exists here.
- `cleanup.log`: owned temporary worktrees and clusters are gone; receipts survive cleanup. The task-local performance worktree is also removed in `finally`.

## Findings and limits

The installed Vault Node could print the Vitest version but rejected the native module at actual startup. Firstmate diagnosed its library-validation Team ID boundary and authorized the local development Node runtime after removing GitHub tokens from the process environment. No signature, policy, dependency or lockfile workaround was made. Failed setup attempts are not behavioral evidence.

The live design-negative command also reproduced a pre-existing baseline failure: its isolated copy omitted contracts cited by the already-landed decision trail. The one-line fixture-copy fix includes contracts but excludes dependency/build caches. `design-initial-red.log` and `design-green.log` retain that assertion failure and the 23-case green.

Verification-skill maintenance outcome: changed. Affected source was read serially without delegation; the new fixture/harness entries were added, and all public Drive commands were run. The skill explicitly distinguishes wire rejection and the empty harness from future core/lane proof. Independent non-author review remains Firstmate's responsibility. Lanes 7 and 8, full core behavior and mechanical boundary proof are intentionally absent until slices 2 and 3.
