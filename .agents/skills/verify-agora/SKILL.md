---
name: verify-agora
description: Project-owned instructions that prove the Agora foundation fixture, its portable contracts and the persisted local-development room (local-room L1 and L2) from the public surface. Use before closing any task that touches apps/center, packages/domain, packages/storage, packages/client-core, contracts or agora/feature-map.json. Scope U01a.B01 through U01a.B04, local-room L1/L2 and L5 pure-core preparation only; no response posting or browser qualification.
---

# Verify Agora

Every step is a literal command run from the repository root. Record outputs under `evidence/U01a/<task>/` (local-room slices: `evidence/local-room/<slice>/`), or under a scratch path when the run must leave no project changes. A command that cannot run is a blocked prerequisite, not a pass. The feature map is `agora/feature-map.json`; a change to any path it lists invalidates that feature's scenarios until the Drive step passes again at the new head.

## Doctor

Toolchain and static checks only. Expected: Node 24.x, pnpm 10.x, PostgreSQL 18.x server binaries, a Swift 6 toolchain, install and static gates exit 0. A missing Swift toolchain blocks the contract steps; it never downgrades them to a pass.

```sh
node --version
pnpm --version
pg_ctl --version
swift --version
pnpm install --frozen-lockfile
pnpm audit --json
pnpm typecheck
pnpm lint
pnpm docs:check
```

## Launch

`scripts/with-test-postgres.mjs` boots a throwaway socket-only PostgreSQL cluster (owner role `agora_owner`, non-owner role `agora_app`, guard-negative role `agora_bypass`, database `agora_test`) for the duration of one command and removes it afterwards. It exports `AGORA_DATABASE_URL` as the service role and `AGORA_MIGRATION_DATABASE_URL` as the owner. To reuse an existing PostgreSQL 18 server, export `AGORA_TEST_DATABASE_URL` (as `agora_app`), `AGORA_TEST_OWNER_DATABASE_URL` (as the schema owner), `AGORA_TEST_BYPASS_DATABASE_URL` (a `BYPASSRLS` member of `agora_app`) and `AGORA_TEST_SUPERUSER_DATABASE_URL` (used only to remove and restore cluster-level prerequisites in one test) and the wrapper passes the command through.

```sh
node scripts/with-test-postgres.mjs <command>
```

## Drive

```sh
pnpm contracts:check
pnpm contracts:conform -- --json
pnpm client:replay -- --json --swift
pnpm boundaries
pnpm exec vitest run --project unit packages/domain/test/local-answer.test.ts packages/domain/test/local-answer-guards.test.ts --reporter=json
pnpm test
node scripts/probe-center.mjs --scenarios
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs
node scripts/with-test-postgres.mjs bash -c 'node packages/storage/src/migrate-cli.ts; node packages/storage/src/migrate-cli.ts'
```

Pass predicates:

- `pnpm contracts:check` prints `"outcome": "pass"` with an empty `drift` list; `"outcome": "unavailable"` (exit 3) means the Swift generator could not run and the step is blocked, not passed.
- `pnpm contracts:conform` prints `"outcome": "pass"` with `"swift": "pass"` and every result `pass`; a `fail` result names the vector and each consumer's disagreement. This includes the `sync-*` fixture snapshot, event and reusable cursor/receipt vectors. Fixture payloads are not production HTTP operations.
- `contracts/test/sync.test.ts` rejects unsupported event kinds/fields and proves each denial assertion turns red with its guard removed from an isolated schema copy. This is wire rejection, not yet core replay or acknowledgement proof.
- `pnpm client:replay` reports `outcome: pass` only if all six TypeScript snapshots equal their literal golden states; `--swift` additionally requires the independent Swift projections to equal those same states. The transcript includes each contiguous-prefix acknowledgement and replay/upgrade request. No DOM or browser runs in lane 7.
- `packages/client-core/test/sync.test.ts` covers snapshot races, large decimal ordering, receipts, retry, unread, drafts and clearing. `guards.test.ts` repeats the public assertions with one guard disabled per disposable copy; every disabled-guard run must exit 1 for its named assertion. Lane 8 runs through `pnpm boundaries`, writing native JSON to `.scratch/boundaries.json`: all import-form, public-type, private-path, export-map and no-platform fixtures must pass. The negative-rule configurations are isolated test instances, never runtime guard switches.
- `pnpm test` exits 0 with every unit and pg test passing. The pg project refuses to run without a database; the contract tests fail, never skip, without Swift.
- `node scripts/probe-center.mjs --scenarios` prints `agora.probe-scenarios/v1` with exactly sixteen scenario ids and starts no process; it needs no database. Exactly one scenario has `restarts_center: true`.
- The live probe applies migration 0001 as the owner first, then starts the center as the service role. Its report has `"outcome": "pass"` for `health-liveness` (200), `health-readiness` (200), `policy-allow` (200, `decision: allow`), `policy-deny` (200, `reason_code: scope_mismatch`), `policy-unknown-field` (400, `malformed_command`), `unknown-route` (404, `not_found`), `local-room-snapshot-before` (200), `local-room-send-committed` (201, `replayed: false`, revision one above the snapshot's `committed_seq`, `request_digest` equal to the canonical digest of the command), `local-room-send-replayed` (201, byte-equal to the first receipt except `replayed: true`), `local-room-send-changed-body` (409, `command_conflict`), `local-room-send-other-scope` (404, `scope_mismatch`), `local-room-send-unknown-citation` (404, `not_found`), `local-room-send-empty-body` (400), `local-room-send-unknown-field` (400), `local-room-snapshot-after-restart` (200, same cursor and last message after the process was stopped and started) and `local-room-replay-after-restart` (201, the original `message_id`).
- `contracts/test/local-room.test.ts` accepts every `local-room-*` vector that the golden file accepts, refuses each unknown field, variant and bound at its path in TypeScript and Swift, and proves the authorship, event-kind and unknown-field guards turn red with the guard removed from an isolated schema copy. `apps/center/test/local-room.test.ts` proves the health baseline on the same app, the 400 paths, and the typed 404 `unavailable_capability` of a process composed without a persistence adapter.
- `apps/center/test/local-room.pg.test.ts` spawns the real center process as the service role and proves over HTTP: 201 receipt with the canonical request digest and the next room revision, replay with the original receipt, 409 `command_conflict`, 404 `scope_mismatch` and `not_found`, a committed citation, 400 before storage, and an identical snapshot plus a working replay and continued sequence after the process is stopped and started. `packages/storage/test/local-room.pg.test.ts` proves the seeded fixed room, durability across a closed and reopened pool, eight concurrent sends with contiguous sequences and equal event sequences, one message under eight concurrent copies of one command, rollback that consumes no sequence, replay and conflict, citation checks, the 4096-scalar and ten-citation table bounds, project isolation with the `BYPASSRLS` guard negative, and immutability for `agora_app` and the owner.
- The local-answer public package driver reports 14 passing tests. It requires no Launch step or database: supplied fixtures represent validated persisted messages, not storage provenance proof. The behavioral suite proves bounds, numerical chronology, source-specific citations, empty/foreign/missing/unknown denial, deterministic digests/replay, requester/scope/request identity and inert injection-shaped text. The three isolated mutations each require normal exit 0 and weakened exit 1 for the named assertion (`unbounded-selector`, `outside-citation`, `injected-command`). The authority test checks the exact runtime export surface and twelve forbidden import/global probes. No core function accepts a posting handle; the posting port is type-only. This does not qualify final L5 or AC04, and the driver is not a product trigger.
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
node scripts/record-red-green.mjs --parent 95f35277fbfc821be148029521222f0de617d7de --head d2e213153ce0ac8b0ec7309f68ac2e1509273875 --out evidence/local-room/persistence -- pnpm exec node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg apps/center/test/local-room.pg.test.ts
```

Red shows `Tests 6 failed (6)`: every HTTP assertion fails against the parent's running process for a behavioral reason (`expected 404 to be 201`, `expected 404 to be 200` for the snapshot, `expected 404 to be 409` for the changed body). Green shows `Tests 6 passed (6)`. The storage-level test cannot load at the parent, which exports no adapter, so it is retained head-only in `evidence/local-room/persistence/storage-pg.green.log`; its reds are the guard negatives in `gate-negatives.log`. `evidence/local-room/persistence/outcome.json` binds the revisions, sizes and receipts.

For local-room L5 pure-core preparation, use its committed test-only harness on exact L2 `55269a5103656a63cc6f246c00ebb1efa6785866` as the behavioral parent. The harness loads the public package and denies capability; the baseline denial test stays green. Use the code head recorded in `evidence/local-room/agent-core/outcome.json`:

```sh
node scripts/record-red-green.mjs --parent c221c808e6841c57d016b3d22e8c55f5335ed811 --head CORE_HEAD --out evidence/local-room/agent-core -- pnpm exec vitest run --project unit packages/domain/test/local-answer.test.ts
```

Red must be `9 failed | 1 passed`, with value assertions against `unavailable_capability`, not module errors. Green must be `10 passed`. Guard mutations and cross-boundary negatives run separately at the head through the Drive command. The candidate remains stacked, not landable before L2 and applicable CI protections, a rebase, fresh exact-head validation and independent review. No pipeline or remote action belongs to this local-only preparation.

For U01a.B04, use full committed parent/head SHAs and the task evidence directory. The public driver invokes the same recorder with the fixed native-assertion command, then captures the isolated guard mutation. Run both lanes and task admission. The final foundation command must exit 2 with FG04-FG08 missing and U01a integration unqualified; that expected denial is not task failure.

```sh
node scripts/foundation.mjs --scope record --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope lane-9 --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope lane-10 --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope task --parent PARENT --head HEAD --evidence DIR --json
pnpm verify:foundation -- --parent PARENT --head HEAD --evidence DIR --json
```

The first four commands require exit 0. `task_outcome: pass` never qualifies the unit or authorizes features. Inspect exact `FG01.red-required` red cause, baseline pass, same-subject green, guard normal/disabled assertions, and retained artifact hashes. No receipt is accepted without fresh replay. The [driver reference](../../../docs/site/test-first.md) documents scope and trust limits.

## Cleanup

`with-test-postgres.mjs` stops and deletes its cluster on exit, including on SIGINT. `record-red-green.mjs` removes its worktrees. `generate.mjs --check` and the contract tests remove their temporary trees. `contracts/swift/.build/` is an ignored build cache and may stay. Confirm nothing else is left behind:

```sh
git worktree prune
git worktree list | grep -c 'agora-red-\|agora-green-\|agora-clean-' || echo "worktrees: clean"
ls "${TMPDIR:-/tmp}" | grep agora- || echo "tmp: clean"
```

Both greps must find nothing. For the pure-core driver also run `find .scratch -maxdepth 1 -name 'answer-guard-*' -print`; no matching directory may remain. In parallel development, a shared temp/worktree match may belong to another lane: report it without deleting or inspecting its contents; prove this task's exact owned paths were removed.

Evidence files under `evidence/` must survive cleanup; the cluster and worktrees must not.
