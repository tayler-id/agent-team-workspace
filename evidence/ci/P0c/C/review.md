# CI P0c C: PostgreSQL wrapper qualification

Parent: qualified `c04f5606df49eb7976ad5cf244911c73f77dd1fb` (landed P0c A and B). Code head: `8d4d42c94dbe71bc3fc45a048ac8b32372bbbd53` (wrapper fix `051da44`, then test-owned segment reclaim `99bf8ae` and `8d4d42c`). `outcome.json` binds the source, test, feature-map, allocator and driver digests, every lane exit and every artifact digest. The allocator `scripts/postgres-socket.ts` is byte-identical to P0c A. No product feature, schema, migration, dependency, lockfile, React, hosted workflow, remote or provisional design asset changed.

## Three retained red tests before the smallest wrapper change

The independent P0c-B review recommended three robustness follow-ups. Each landed as a scenario in `packages/storage/test/postgres-wrapper.test.ts` that was red against the parent wrapper before the fix (`red-before-edit.log`, then the recorder pair `red.log`/`green.log` with test patch digest in `recorder.log`).

- `abort-stop-throw`. EPERM for a live command group cannot be produced as this user, so the test copies the wrapper into its scratch tree and injects the throw at the one `process.kill` site (a mock for an unreachable OS fault, named as such). Parent behavior: the abort listener's rejection is unhandled, Node exits 1, `finally` never runs, the command keeps the wrapper's pipes and its cluster alive. Head behavior: one `blocked` receipt `stop failed`, exit 70, the wrapper keeps waiting for its command, then stops the server and reports `cleaned`. The red assertion is `expected 1 to be 70`.
- `initdb-stderr` and `psql-stderr`. A shim runs the real tool with one bad flag. Parent: `initdb failed (1)` with nothing else. Head: the message ends with the last 4 KiB of the tool's stderr, so `` initdb: unrecognized option `--definitely-not-a-flag' `` is asserted literally.
- `missing-pg-isready`. The probe binary is absent. Parent: 62 `blocked` receipts in two seconds and then `startup timeout`. Head: two receipts (the spawn error and the fatal report), no timeout, under 1.5 s.

The wrapper diff is 15 meaningful lines: `kill` reports instead of throwing once the Darwin zombie census says a member is live, `launch` exposes the spawn error and resolves on `close`, `run` pipes and bounds stderr, and the readiness loop treats a spawn error as fatal. Ownership, allocation, exit codes and process-group semantics are unchanged. The test's `finally` now ends and removes only identities its own run reported, so a red run leaves nothing behind.

## Guard negatives (`guard.json`, `guard.log`)

`driver/guard.mjs` copies the two wrapper sources from the committed head into a disposable directory, runs each guard's literal assertions once unmodified and once with exactly one replacement applied, and restores the copy. All ten guards pass unmodified and fail weakened for the named reason:

| Guard | Weakened by | Red assertion |
| --- | --- | --- |
| short-socket-selection | socket under the artifact root | `socket path short` (exit 70 instead of 0) |
| lease-verification | `verify()` never throws | `ownership denial` (exit 0, lease removed) |
| exact-process-group-stop | signal the leader, not the group | `descendant <pid> exited` (grandchild alive) |
| bounded-startup | deadline timer does nothing | `startup timeout within bound` (hung until SIGINT) |
| cancellation-cleanup | `cancel` records the code but never aborts | `command stopped` (command ran to its end) |
| foreign-lock-refusal | lock predicate disabled | `foreign lock denial` (exit 0, foreign lock unlinked) |
| artifact-ownership-refusal | root inode check disabled | `substitute root denial` (exit 0, substitute removed) |
| stderr-capture | stderr discarded | `initdb stderr present` |
| probe-spawn-failure | spawn error not fatal | `probe failure reported once` |
| stop-failure-report | throw restored at the kill site | `stop failure reported and cleaned` (exit 1, pipes orphaned) |

Every run had a foreign directory with the lease prefix, a foreign process and a foreign file beside it; all survived. Each receipt records the copy digests, the runs' exits and receipts, residue before the driver's sweep, what the sweep removed and an empty environment diff.

## Lifecycle scenarios (`scenarios.json`, `scenarios.log`, `no-leftovers.json`)

`driver/scenarios.mjs` drives the committed public wrapper with real PostgreSQL 18: success as `agora_app|f|f`, five consecutive forced stops with run-owned segment reclaim, a 667-byte `TMPDIR` with spaces and a 73-byte socket, command exit 255 and legacy signal exit 1, a missing command, a postmaster killed before readiness and after start, the startup deadline against a live server (probe shim), SIGTERM at `allocated`, SIGINT during `initdb`, at `starting`, at `started` with a grandchild, six alternating signals two milliseconds apart, SIGINT from 0 to 800 ms after spawn, a bash group of four members, a lock rewritten to a foreign process, a foreign Unix listener beside a foreign lock, a regular file in place of the socket, a substituted artifact root, an intruder file and a mode change in the socket directory, two concurrent wrappers, a missing probe, real `psql` stderr and external-URL passthrough. All 27 pass. The final inventory checked 36 recorded identities and found no socket directory, root, postmaster or listener left, and `git worktree list` unchanged.

## Findings recorded as limits, model unchanged

Two facts surfaced during C and are documented in the runbook rather than fixed, because fixing either would broaden the accepted ownership model.

- On macOS a SIGKILLed postmaster leaves its 56-byte System V interlock segment. `kern.sysv.shmmni` is 32. The first guard run found 31 orphans from earlier lanes and this session and `initdb` failed with `could not create shared memory segment: No space left on device`, which the new stderr capture reported verbatim. `sysv-shm-sweep.json` records the one-time removal of unattached segments whose creator pids were dead. Firstmate then required the wrapper's own one-second SIGKILL fallback (the `forced-cancel` test) to stop leaking. The test now tracks each `starting` postmaster pid and, only once that creator is dead and the segment has no attachment, removes that one segment; every run then asserts zero run-owned segments. `segments-red-before-edit.log` shows the assertion red with no reclaim (`expected [ 655369 ] to deeply equal []`); `segments-green-repeat.log` shows three consecutive forced-cancel runs green, and the `forced-cancel-repeat` scenario proves five consecutive forced stops each leave exactly one unattached run-owned segment and end with none while unrelated segments stay untouched. The drivers apply the same dead-creator, unattached proof before `ipcrm`. `sysv-shm-own-segments.json` records the removal of the earlier segments attributable to this task by pid or by lane window, and lists the dead segments it left because they belong to no recorded run of this task. The wrapper itself is unchanged; a postmaster killed from outside these runs still leaves a segment, and the runbook names the `ipcrm` recovery.
- A same-user listener bound at the exact path of the dead postmaster's socket, with the lock untouched, is unlinked as the stale socket (`foreign-listener-exact-lock`, exit 0). When the lock names a foreign process the listener is left alone and the run fails closed (`foreign-listener`). Same-user hostile code is outside the documented boundary.

## Lanes

`commands.tsv` lists every command with its exit at the code head. `ipc-before-lanes.log` and `cleanup-inventory.log` show the same five unrelated segments before and after the whole lane run, so `test` and `check` now leave none. The unchanged `test-design-checks.mjs` fails its P0a sandbox baseline (`index.md: missing link apps/center/src/app.ts`) as on qualified main and is recorded as exit 1, not a pass. Official Node 24.16.0 at `/Users/taylerramsay/.local/node/bin/node`, pnpm 10.34.1, PostgreSQL 18.4 and Swift 6.3.3 ran with the three GitHub token variables removed and never printed. Firstmate confirmed the allocator's private short-socket exception; every other temporary resource stayed under this worktree's `.scratch`.

## Housekeeping

The zero-byte `evidence/ci/P0c/B/guard.log` and `guard-run.log` placeholders are removed and dropped from B's artifact list; B's `guard.json` carries that proof. Size: 15 wrapper, 32 test and 3 feature-map meaningful added lines in three source files; the drivers under `driver/` are replayable proof and count with evidence. Independent review and guarded local landing remain firstmate's responsibility.

## Reconciliation onto main `d46c19f`

Independent review of `b122ac6` found two landing blockers. Five `exact-head` artifact digests in `outcome.json` were stale because the last commit rewrote `exact-head/check.log`, `commands.tsv`, `focused.log`, `hygiene.log` and `validated-head.txt` without refreshing their digests. Five documentation files conflicted with the local-room L2 and architecture B1 landings that reached main after the branch forked from `c04f560`.

The ten commits were rebased onto `d46c19f` with `git rebase --onto`. The wrapper, the test file and every evidence file applied cleanly. The conflicts were resolved by keeping both sides. `AGENTS.md` keeps the B1 import-ownership sentence and adds the `ipcrm` pointer. The verify-agora skill description keeps L2 in scope and names C qualification. `docs/site/cli.md` keeps the sixteen-outcome probe row from main and takes the wrapper row with `blocked` stderr receipts. `docs/site/atlas.json` keeps the expanded format main adopted and carries the `Built` status, the C rationale and the C proof list; `progress.md` is regenerated from it. `agora/feature-map.json`, `docs/runbooks/development.md` and `docs/site/foundation.md` merged without conflict. The allocator `scripts/postgres-socket.ts` is byte-identical on main.

The original branch `fm/agora-ci-postgres-fixture-proof` at `b122ac6` is untouched. Its 26-lane run at code head `8d4d42c` remains the record behind `commands.tsv`, `guard.json`, `scenarios.json`, `no-leftovers.json`, `red.log` and `green.log` in this directory; `outcome.json` names it under `original_run`. Those commits are not ancestors of the reconciled candidate, so the candidate carries its own run under `exact-head/`, all at the head written to `validated-head.txt`, with the parent now `d46c19f`.

- `focused.log`, the socket and wrapper suites, exit 0.
- `guard.json` and `guard.log`, the same ten guard negatives against a disposable copy of the committed sources, all pass unmodified and fail weakened for the named reason.
- `scenarios.json`, `scenarios.log` and `no-leftovers.json`, the same twenty-seven lifecycle scenarios with real PostgreSQL 18, 36 identities checked, no leftovers, `git worktree list` unchanged.
- `red.log`, `green.log`, `test-patch.diff` and `recorder.log`, the recorder replay of the four C tests with parent `d46c19f` red and the candidate head green.
- `atlas.log`, `docs-build.log`, `plan.log`, `check.log` and `hygiene.log`, the docs snapshot, site build, plan format check, `pnpm check` and the fast-forward, whitespace, forbidden-path, allocator-identity and digest hygiene against main.

`outcome.json` now binds every artifact in this directory, `exact-head/` included, at its committed bytes, and its `source` digest for `agora/feature-map.json` follows the format main restored in `f746465`. The lanes that were not rerun keep their `8d4d42c` records: audit, contracts-check, conform, replay, boundaries, probe scenarios, probe, migrations, design, design negatives, handoff negatives and the cleanup inventory. `pnpm check` at the validated head covers lint, typecheck, docs, contract drift and the full test suite.

One new limit surfaced in the rerun. The `sigint-sweep` scenario, which sends SIGINT from 0 to 800 ms after spawn, twice landed while `initdb` was running its bootstrap backend. That backend holds its own System V segment, the wrapper had not yet reported a `starting` postmaster, and so the run-owned reclaim had nothing to name; the driver recorded both segments under `environment_diff.segments.added` and still passed, because the inventory decides on recorded identities only. `exact-head/sysv-shm-own-segments.json` removes exactly the segments a receipt of this run names, after proving the creator dead and the segment unattached, and shows every unrelated segment untouched. The wrapper is unchanged; the runbook and `known_limits` now name the case.

## Second reconciliation onto main `9fadcc5`

Main advanced again while the first reconciliation's `exact-head` packet was mid-refresh: B2a (`70fe483`, `188a82b`, `19456bc`, `9fadcc5`) added the architecture-exception registry and touched `AGENTS.md`, `.agents/skills/verify-agora/SKILL.md`, `agora/feature-map.json`, `docs/site/atlas.json` and `docs/site/progress.md`, four of the same five files the first reconciliation had already merged. The branch was rebased a second time, `git rebase 9fadcc5` from the tip that had landed on `d46c19f`.

`AGENTS.md` conflicted on the code-gates bullet; kept B2a's `architecture-exceptions.json` clause and the P0c-C `ipcrm` sentence together. `docs/site/atlas.json` and `docs/site/progress.md` conflicted only on the `revision` value each side had bound; resolved to the value this reconciliation rebinds below. `.agents/skills/verify-agora/SKILL.md`, `docs/site/cli.md`, `agora/feature-map.json` and `docs/runbooks/development.md` applied without conflict; B2a's edits and P0c-C's edits landed in different sections of each file. `scripts/with-test-postgres.mjs`, `packages/storage/test/postgres-wrapper.test.ts` and the allocator are untouched by B2a and stayed byte-identical through the second rebase.

The verify-agora skill's P0c C paragraph now names `9fadcc5` as the parent replayed against the candidate head, replacing the first reconciliation's `d46c19f` reference. `evidence/ci/P0c/C/exact-head/` was re-recorded a second time at the head that carries this section, with a fresh `validated-head.txt`, fresh lane logs and `outcome.json` digests refreshed to match every committed byte, closing the artifact-binding gap the independent review found in the first reconciliation's own re-record.
