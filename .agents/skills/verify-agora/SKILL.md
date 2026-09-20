---
name: verify-agora
description: Project-owned instructions that prove the Agora foundation fixture and its portable contracts from the public surface. Use before closing any task that touches apps/center, packages/domain, packages/storage, packages/client-core, contracts or agora/feature-map.json. Scope U01a.B01 through U01a.B04; later tasks extend it.
---

# Verify Agora

Every step is a literal command run from the repository root. Record outputs under `evidence/U01a/<task>/`. A command that cannot run is a blocked prerequisite, not a pass. The feature map is `agora/feature-map.json`; a change to any path it lists invalidates that feature's scenarios until the Drive step passes again at the new head.

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
pnpm test
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
- The probe report has `"outcome": "pass"` for `health-liveness` (200), `health-readiness` (200), `policy-allow` (200, `decision: allow`), `policy-deny` (200, `reason_code: scope_mismatch`), `policy-unknown-field` (400, `malformed_command`) and `unknown-route` (404, `not_found`).
- The first migration report has `applied: 1`; the second has `applied: 0` and the same `schema_digest`.

## Evidence

Red before green: apply the head's test patch to the parent revision and keep both receipts.

```sh
node scripts/record-red-green.mjs --parent <parent-sha> --head <head-sha> --out evidence/U01a/<task> -- pnpm -s test
```

For the U01a.B03 core slice, use the existing empty public harness and Swift consumer at its parent, with the focused command below. The fixture CLI is additional head-only integration proof, not a missing-driver red:

```sh
node scripts/record-red-green.mjs --parent <slice-1-head> --head <core-head> --out evidence/U01a/agora-s1-isolate-client-core/2-core -- pnpm exec vitest run --project unit packages/client-core/test/sync.test.ts --project contracts contracts/test/replay.test.ts
```

For the U01a.B03 boundary slice, run `packages/client-core/test/boundaries.test.ts` through the same recorder. The parent already has ESLint, TypeScript and a valid core public import. Red is a missing forbidden-edge/public-port diagnostic, not a missing SDK or runner. The dedicated no-platform compiler is also part of `pnpm typecheck`; it includes only ES2024, with neither DOM nor Node globals.

`red.log` must show the intended assertions failing (for example `expected 404 to be 200`), not a missing runner, syntax error or dependency failure. `green.log` must exit 0. Copy probe and migration outputs beside them.

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

Both greps must find nothing.

Evidence files under `evidence/` must survive cleanup; the cluster and worktrees must not.
