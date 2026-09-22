---
name: verify-agora
description: Project-owned instructions that prove the Agora foundation fixture, its portable contracts and the persisted local-development room (local-room L1 through L3) from the public surface. Use before closing any task that touches apps/center, packages/domain, packages/storage, packages/client-core, contracts or agora/feature-map.json. Scope U01a.B01 through U01a.B04, local-room L1 through L3, CI P0a design-negative sandbox closure, CI P0b toolchain/native doctor, and CI P0c A/B/C allocation, wrapper lifecycle and qualification.
---

# Verify Agora

Every step is a literal command run from the repository root. Record outputs under `evidence/U01a/<task>/` (local-room slices: `evidence/local-room/<slice>/`), or under a scratch path when the run must leave no project changes. A command that cannot run is a blocked prerequisite, not a pass. The feature map is `agora/feature-map.json`; a change to any path it lists invalidates that feature's scenarios until the Drive step passes again at the new head.

## Doctor

Toolchain and static checks only. P0b requires Node 24.21.0 and pnpm 10.34.1 exactly, plus the real Vitest/Vite Rolldown native import. Run the read-only doctor after the frozen install below; exit 2 is a blocked prerequisite, never behavioral red. Use `node scripts/ci-doctor.mjs --json` directly if pnpm cannot start. Remaining checks require PostgreSQL 18.x server binaries and Swift 6; P0b does not qualify their exact pins. Mandatory CI, PostgreSQL fixture hardening, React guardrails and hosted enforcement remain unimplemented.

```sh
node --version
pnpm --version
pg_ctl --version
swift --version
pnpm install --frozen-lockfile
node scripts/ci-doctor.mjs --json
node --test scripts/test/ci-doctor.test.ts
pnpm audit --json
pnpm typecheck
pnpm lint
pnpm docs:check
node scripts/verify-design.mjs
node scripts/test-design-checks.mjs
```

Design-negative P0a pass predicates: `verify-design` exits 0 on the real tree; `test-design-checks` prints `PASS accepts baseline`, `PASS rejects omitted-application-source`, every other named mutation rejection with its reason, and `PASS 24 behavioral design-check cases`. The disposable sandbox must copy `apps` and `agora`, and the root `eslint.config.js`, so legitimate decision evidence such as `apps/center/src/app.ts`, `agora/architecture-exceptions.json` and `eslint.config.js` resolve. This is fixture honesty only - it is not hosted CI, not full `pnpm check` coverage of every standalone negative, and not product acceptance. Receipts: `evidence/ci/P0a/`.

P0b alone launches no service. Drive `node --test scripts/test/ci-doctor.test.ts`: known-good actual native import passes, wrong Node/pnpm and unavailable native binding report blocked. Each omitted probe in a disposable copy makes its own denial assertion fail. Evidence: use the recorder below with `--parent f98a7b6b51465f6a6a47cb01c6163dac2d6c8eec --head <code-head> --out .scratch/P0b/replay -- node --test scripts/test/ci-doctor.test.ts`; retain P0b receipts under `evidence/ci/P0b/`. Cleanup removes only owned `.scratch/doctor-*` copies, never receipts. Full fixture verification still follows below and may be independently blocked.

## Launch

`scripts/with-test-postgres.mjs` uses the unchanged owned short-socket allocator and a 30-second startup deadline (`AGORA_PG_STARTUP_TIMEOUT_MS`, 1..300000 ms). It boots a throwaway socket-only PostgreSQL cluster (owner role `agora_owner`, non-owner role `agora_app`, guard-negative role `agora_bypass`, database `agora_test`) for the duration of one command and removes it afterwards. It exports `AGORA_DATABASE_URL` as the service role and `AGORA_MIGRATION_DATABASE_URL` as the owner. To reuse an existing PostgreSQL 18 server, export `AGORA_TEST_DATABASE_URL` (as `agora_app`), `AGORA_TEST_OWNER_DATABASE_URL` (as the schema owner), `AGORA_TEST_BYPASS_DATABASE_URL` (a `BYPASSRLS` member of `agora_app`) and `AGORA_TEST_SUPERUSER_DATABASE_URL` (used only to remove and restore cluster-level prerequisites in one test) and the wrapper passes the command through.

```sh
node scripts/with-test-postgres.mjs <command>
```

### Owned local runtime launch (L3)

Use an official Node 24 binary; a host-signed launcher can prevent native toolchain bindings from loading. The local runtime ignores developer database URLs and creates its own private cluster. No migration owner serves product queries. Keep `INSTANCE` for Cleanup:

```sh
INSTANCE=verify-l3-$(date +%s)
node scripts/local-room.ts doctor
node scripts/local-room.ts start --instance "$INSTANCE"
```

Expected: JSON `outcome: pass`, fresh launch UUID, exact owned root/PIDs/PostgreSQL port and harness `url`. Open that URL with the approved browser driver. It is a minimal projection harness, not the finished room UI. No external accounts or production credentials are needed.

## Drive

CI P0c A's allocation driver requires Node 24 and Vitest, not PostgreSQL or Swift. B's wrapper driver additionally requires PostgreSQL 18 binaries and proves deep-path non-owner access, success/failure cleanup, SIGINT/SIGTERM (also during startup), forced shutdown, initialization/readiness timeouts and foreign/neighborhood preservation. Retain outputs under `evidence/ci/P0c/C/`. C's drivers replay ten guard negatives in a disposable source copy and twenty-seven lifecycle scenarios against the committed wrapper with real PostgreSQL 18; both must exit 0 and leave `leftovers` empty in `no-leftovers.json`.

```sh
pnpm exec vitest run --project unit packages/storage/test/postgres-socket.test.ts packages/storage/test/postgres-wrapper.test.ts --disableConsoleIntercept
node evidence/ci/P0c/C/driver/guard.mjs --out .scratch/p0c-c
node evidence/ci/P0c/C/driver/scenarios.mjs --out .scratch/p0c-c
```

```sh
pnpm contracts:check
pnpm contracts:conform -- --json
pnpm client:replay -- --json --swift
pnpm boundaries
pnpm test
node scripts/probe-center.mjs --scenarios
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs
node scripts/with-test-postgres.mjs bash -c 'node packages/storage/src/migrate-cli.ts; node packages/storage/src/migrate-cli.ts'
```

For L3, also run these against the launched instance, retaining stdout outside its root:

```sh
node scripts/local-room.ts status --instance "$INSTANCE"
node scripts/local-room.ts send --instance "$INSTANCE" --body 'Verification message'
node scripts/local-room.ts history --instance "$INSTANCE"
node scripts/local-room.ts replay --instance "$INSTANCE" --after 0
node scripts/local-room.ts evidence --instance "$INSTANCE"
pnpm exec vitest run --project unit apps/center/test/runtime.test.ts
node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg apps/center/test/runtime.pg.test.ts
```

L3 predicates: every CLI report is `agora.local-runtime/v1`, `outcome: pass` with exit 0; the history contains the sent body; replay carries that same message ID and sequence. The pg tests prove snapshot/replay interleaving, accepted send without receipt, receipt-only cursor immobility, duplicate/gap repair, numeric multi-page replay, two same-port restarts, reset, parallel start, cancelled startup, 403 Host/Origin/stop negatives, 413 body bound, 429 rate bound, foreign record/listener/symlink refusal and cleanup. Unit negatives run a normally denied input and an isolated one-guard-disabled copy; the latter must fail its assertion. Core replay/guard tests remain mandatory. The browser must send, disconnect, observe another CLI send after reconnect, survive ordinary service restart, render injected markup as text and produce no CSP/runtime error. Retain 1440x900 and 390x844 observations and disclose harness-only UI scope.

Pass predicates:

- `pnpm contracts:check` prints `"outcome": "pass"` with an empty `drift` list; `"outcome": "unavailable"` (exit 3) means the Swift generator could not run and the step is blocked, not passed.
- `pnpm contracts:conform` prints `"outcome": "pass"` with `"swift": "pass"` and every result `pass`; a `fail` result names the vector and each consumer's disagreement. This includes the `sync-*` fixture snapshot, event and reusable cursor/receipt vectors. Fixture payloads are not production HTTP operations.
- `contracts/test/sync.test.ts` rejects unsupported event kinds/fields and proves each denial assertion turns red with its guard removed from an isolated schema copy. This is wire rejection, not yet core replay or acknowledgement proof.
- `pnpm client:replay` reports `outcome: pass` only if all six TypeScript snapshots equal their literal golden states; `--swift` additionally requires the independent Swift projections to equal those same states. The transcript includes each contiguous-prefix acknowledgement and replay/upgrade request. No DOM or browser runs in lane 7.
- `packages/client-core/test/sync.test.ts` covers snapshot races, large decimal ordering, receipts, retry, unread, drafts and clearing. `guards.test.ts` repeats the public assertions with one guard disabled per disposable copy; every disabled-guard run must exit 1 for its named assertion. Lane 8 runs through `pnpm boundaries`, writing native JSON to `.scratch/boundaries.json`: all import-form, public-type, private-path, export-map, no-platform and application-architecture fixtures must pass, including guarded-extension renderer/server denials (`.ts`/`.tsx`/`.mts`/`.cts`/`.js`/`.jsx`/`.mjs`/`.cjs`, contracts plain JS/CJS), `apps/web` non-src relocation denials, ambient-declare and computed/mixed-union DOM-mutator denials, string-literal React effect import denials, framework/host foot-guns, `noInlineConfig` disable adversarial cases, architecture-exception validation (including load-time denial on invalid rows) and guard-weakening copies. `pnpm typecheck` must include `apps/web/tsconfig.json` and exclude `apps/web` from the root program. The negative-rule configurations are isolated test instances, never runtime guard switches.
- `pnpm test` exits 0 with every unit and pg test passing. The pg project refuses to run without a database; the contract tests fail, never skip, without Swift.
- `node scripts/probe-center.mjs --scenarios` prints `agora.probe-scenarios/v1` with exactly sixteen scenario ids and starts no process; it needs no database. Exactly one scenario has `restarts_center: true`.
- The live probe applies migration 0001 as the owner first, then starts the center as the service role. Its report has `"outcome": "pass"` for `health-liveness` (200), `health-readiness` (200), `policy-allow` (200, `decision: allow`), `policy-deny` (200, `reason_code: scope_mismatch`), `policy-unknown-field` (400, `malformed_command`), `unknown-route` (404, `not_found`), `local-room-snapshot-before` (200), `local-room-send-committed` (201, `replayed: false`, revision one above the snapshot's `committed_seq`, `request_digest` equal to the canonical digest of the command), `local-room-send-replayed` (201, byte-equal to the first receipt except `replayed: true`), `local-room-send-changed-body` (409, `command_conflict`), `local-room-send-other-scope` (404, `scope_mismatch`), `local-room-send-unknown-citation` (404, `not_found`), `local-room-send-empty-body` (400), `local-room-send-unknown-field` (400), `local-room-snapshot-after-restart` (200, same cursor and last message after the process was stopped and started) and `local-room-replay-after-restart` (201, the original `message_id`).
- `contracts/test/local-room.test.ts` accepts every `local-room-*` vector that the golden file accepts, refuses each unknown field, variant and bound at its path in TypeScript and Swift, and proves the authorship, event-kind and unknown-field guards turn red with the guard removed from an isolated schema copy. `apps/center/test/local-room.test.ts` proves the health baseline on the same app, the 400 paths, and the typed 404 `unavailable_capability` of a process composed without a persistence adapter.
- `apps/center/test/local-room.pg.test.ts` spawns the real center process as the service role and proves over HTTP: 201 receipt with the canonical request digest and the next room revision, replay with the original receipt, 409 `command_conflict`, 404 `scope_mismatch` and `not_found`, a committed citation, 400 before storage, and an identical snapshot plus a working replay and continued sequence after the process is stopped and started. `packages/storage/test/local-room.pg.test.ts` proves the seeded fixed room, durability across a closed and reopened pool, eight concurrent sends with contiguous sequences and equal event sequences, one message under eight concurrent copies of one command, rollback that consumes no sequence, replay and conflict, citation checks, the 4096-scalar and ten-citation table bounds, project isolation with the `BYPASSRLS` guard negative, and immutability for `agora_app` and the owner.
- The first migration report has `applied: 2`; the second has `applied: 0` and the same `schema_digest`.

## Evidence

Red before green: apply the head's test patch to the parent revision and keep both receipts.

```sh
node scripts/record-red-green.mjs --parent <parent-sha> --head <head-sha> --out evidence/U01a/<task> -- pnpm -s test
```

For the U01a.B03 core slice, use the existing empty public harness and Swift consumer at its parent, with the focused command below and the committed pair the repository's refreshed receipts use. The fixture CLI is additional head-only integration proof, not a missing-driver red:

```sh
node scripts/record-red-green.mjs --parent 66013ee2d15a346d716339d3b7717e1734b74e83 --head 6151f40f8378cc16fc90684dbf74a3f82ae0b9fb --out .scratch/replay/core -- pnpm exec vitest run --project unit packages/client-core/test/sync.test.ts --project contracts contracts/test/replay.test.ts
```

Red shows thirteen literal projection and decision assertion failures (`Tests 13 failed (13)`); green shows `Tests 13 passed (13)` and `outcome: pass`.

For the U01a.B03 boundary slice, run the same recorder with the committed pair below. The parent already has ESLint, TypeScript and a valid core public import. Red is a missing forbidden-edge/public-port diagnostic, not a missing SDK or runner. The dedicated no-platform compiler is also part of `pnpm typecheck`; it includes only ES2024, with neither DOM nor Node globals.

```sh
node scripts/record-red-green.mjs --parent 6151f40f8378cc16fc90684dbf74a3f82ae0b9fb --head 7136c4b0c667838dc9293ae7982b488dda4e3806 --out evidence/U01a/agora-s1-isolate-client-core/3-boundaries/refreshed -- pnpm exec vitest run --project unit packages/client-core/test/boundaries.test.ts
```

Red shows `Tests 7 failed (7)`, each an `expected false to be true` for a forbidden import or private path; green shows `Tests 7 passed (7)`.

`red.log` must show the intended assertions failing (for example `expected 404 to be 200`), not a missing runner, syntax error or dependency failure. `green.log` must exit 0. Copy probe and migration outputs beside them. A verifier with no change of its own replays the three pairs tabulated in `evidence/U01a/agora-s1-isolate-client-core/3-boundaries/review.md` (Refreshed stack on current main: contracts `57b9db6892861b98e5d1edede90ef8621a807dec`→`66013ee2d15a346d716339d3b7717e1734b74e83`, three failures then four passes; core and boundaries as above) and writes its receipts to a scratch `--out` path that it removes; it does not select other revisions.

For local-room L1, the behavioral parent is qualified main and the head is the L1 code commit:

```sh
node scripts/record-red-green.mjs --parent 421f572b02aa5bcf9fd235afe28de92004b59f96 --head 4af669a8799137d58a743c3f104384586f3e496f --out evidence/local-room/contracts -- pnpm exec vitest run --project unit apps/center/test/local-room.test.ts --project contracts contracts/test/local-room.test.ts
```

Red shows `Tests 6 failed | 1 passed | 1 expected fail (8)`: the health baseline passes on the same app, the typed 404 and 400-path assertions fail as `not_found`/404, and the four contract assertions fail because the parent publishes no local-room component. Green shows `Tests 7 passed | 1 expected fail (8)`. The expected fail is the retained L2 receipt assertion; `evidence/local-room/contracts/future-send.red.log` records it failing as a plain test (`expected 404 to be 201`). `evidence/local-room/contracts/outcome.json` binds the revisions, sizes and receipts.

For local-room L2, the behavioral parent is the L1 head on main and the head is the L2 code commit:

```sh
node scripts/record-red-green.mjs --parent c04f5606df49eb7976ad5cf244911c73f77dd1fb --head bc27cff7731082982245fa54944fd4ddea6f49cb --out evidence/local-room/persistence -- pnpm exec node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg apps/center/test/local-room.pg.test.ts
```

Red shows `Tests 6 failed (6)`: every HTTP assertion fails against the parent's running process for a behavioral reason (`expected 404 to be 201`, `expected 404 to be 200` for the snapshot, `expected 404 to be 409` for the changed body). Green shows `Tests 6 passed (6)`. The storage-level test cannot load at the parent, which exports no adapter, so it is retained head-only in `evidence/local-room/persistence/storage-pg.green.log`; its reds are the guard negatives in `gate-negatives.log`. `evidence/local-room/persistence/outcome.json` binds the revisions, sizes and receipts.

For U01a.B04, use full committed parent/head SHAs and the task evidence directory. The public driver invokes the same recorder with the fixed native-assertion command, then captures the isolated guard mutation. Run both lanes and task admission. The final foundation command must exit 2 with FG04-FG08 missing and U01a integration unqualified; that expected denial is not task failure.

```sh
node scripts/foundation.mjs --scope record --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope lane-9 --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope lane-10 --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope task --parent PARENT --head HEAD --evidence DIR --json
pnpm verify:foundation -- --parent PARENT --head HEAD --evidence DIR --json
```

The first four commands require exit 0. `task_outcome: pass` never qualifies the unit or authorizes features. Inspect exact `FG01.red-required` red cause, baseline pass, same-subject green, guard normal/disabled assertions, and retained artifact hashes. No receipt is accepted without fresh replay. The [driver reference](../../../docs/site/test-first.md) documents scope and trust limits.

### Local-room L3 evidence

L3's executable test-only parent is `661b4c5`, directly on exact L2 `55269a5`. Its doctor works and start returns typed `unavailable`. Use the committed implementation head, never a moving branch name:

```sh
node scripts/record-red-green.mjs --parent 661b4c5e012be8b851d271f063d3d53738c15ebf --head b2cecdf7d4ce518574972158d64719f3b20eae7e --out evidence/local-room/runtime -- pnpm exec node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg apps/center/test/runtime.pg.test.ts -t 'public runtime owns'
```

The selected red must be `expected 'unavailable' to be 'pass'` after doctor passes, not a missing runner or import. Run the complete runtime suites separately at head, without selection. Record the test-patch digest, stack bindings, source/line categories, native outputs, PostgreSQL/replay evidence, guard negatives and owned inventory before/after cleanup. CI and independent review remain distinct prerequisites; local green does not authorize landing the unlanded L3 stack.

## Cleanup (local-room L3 instance)

For the L3 instance created at Launch, save evidence first, then:

```sh
node scripts/local-room.ts stop --instance "$INSTANCE"
node scripts/local-room.ts status --instance "$INSTANCE"
node scripts/local-room.ts reset --instance "$INSTANCE" --confirm-disposable
```

Stop/status must prove both recorded listeners absent and say data retained. Reset separately proves owned disposable data removed; it must refuse a running/foreign instance. The automated pg scenarios cover repeated restart and foreign cleanup refusals. If an ownership or cleanup proof is uncertain, retain the instance and report blocked rather than killing a stored PID. Browser proof belongs outside the instance and must survive reset.

For P0c A, replay the test-only allocation parent with the focused baseline and short-location assertion; other scenarios run unfiltered in Drive. Native guard receipts include source/input digests and expected assertion failures.

```sh
node scripts/record-red-green.mjs --parent c9e6fe16c1f107da95d77f35d092e0a923781783 --head HEAD --out .scratch/p0c-replay -- pnpm exec vitest run --project unit packages/storage/test/postgres-socket.test.ts -t 'allocation baseline|short socket denial'
```

For P0c B, replay qualified parent `17fbf24609fb3cbcb25c052ae7ecee124bc0bc87` against the committed implementation head with the recorder and focused command `pnpm exec vitest run --project unit packages/storage/test/postgres-wrapper.test.ts -t deep-success`. Red is PostgreSQL's native long-socket failure (exit 70 versus expected 0); green connects as `agora_app` and verifies removal. Set `TMPDIR` to a private directory inside the task worktree for recorder worktrees, data and logs; only allocator-owned short sockets live outside it.

For P0c C, replay parent `9fadcc55858cfab7da316dd67773371082a16bc7` (main at reconciliation) against the head recorded in `evidence/ci/P0c/C/validated-head.txt` with the focused command `pnpm exec vitest run --project unit packages/storage/test/postgres-wrapper.test.ts -t 'abort-stop-throw|initdb-stderr|psql-stderr|missing-pg-isready'`. Red shows the abort-path crash (`expected 1 to be 70`), empty tool diagnostics (`initdb failed (1)` without the tool's words) and the probe flood (63 `blocked` receipts against 2); green shows `Tests 4 passed`. The reconciled pair lives under `evidence/ci/P0c/C/exact-head/`; the original recording at parent `c04f5606df49eb7976ad5cf244911c73f77dd1fb` and code head `8d4d42c94dbe71bc3fc45a048ac8b32372bbbd53` stays in `evidence/ci/P0c/C/` and on the preserved branch `fm/agora-ci-postgres-fixture-proof`.

## Cleanup

P0c A's driver allocates and releases only its recorded socket directories; its native assertions verify removal while retaining artifact neighbors. Replacement inodes, simulated device changes and hard-linked records must deny verify and cleanup with `socket ownership mismatch`; unrelated children must deny cleanup with `socket not empty`. It never starts a process. For this slice, do not globally sweep temporary directories or prune other tasks' worktrees. B's driver asserts each recorded postmaster and command descendant has exited, its socket/data/log root is gone, and neighbors remain. Ownership substitution must report `cleanup-failed`, not success; the test restores and removes only its own substituted fixture. C's drivers remove only identities their own receipts recorded, including the System V segment a SIGKILLed postmaster leaves behind on macOS once that postmaster is proven dead and the segment unattached, and write every identity they checked to `no-leftovers.json`. The `forced-cancel-repeat` scenario proves five consecutive forced stops each leave exactly one run-owned segment and end with none, with unrelated segments untouched; the wrapper test asserts the same zero-segment end state on every run.

`with-test-postgres.mjs` stops and deletes its owned cluster on success, command failure, startup failure, timeout, SIGINT and SIGTERM. Check NDJSON `cleaned` against the allocated identity; SIGKILL of the wrapper and deliberate process-group escape are not supported cleanup paths. `record-red-green.mjs` removes its worktrees. `generate.mjs --check` and the contract tests remove their temporary trees. `contracts/swift/.build/` is an ignored build cache and may stay. Confirm nothing else is left behind:

```sh
# Inspect only this task's recorded identities; never prune or sweep other runs.
git worktree list
pnpm exec vitest run --project unit packages/storage/test/postgres-wrapper.test.ts --disableConsoleIntercept
```

The driver must pass its exact-owned PID/path removal assertions. Recorder-created worktrees must be absent from the listing; unrelated worktrees and resources remain untouched.

Evidence files under `evidence/` must survive cleanup; the cluster and worktrees must not.
