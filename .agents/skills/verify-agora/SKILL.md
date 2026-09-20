---
name: verify-agora
description: Project-owned instructions that prove the Agora foundation fixture and its generated contracts from the public surface. Use before closing any task that touches apps/center, packages/domain, packages/storage, contracts or agora/feature-map.json. Scope U01a.B01 and U01a.B02; later tasks extend it.
---

# Verify Agora

Every step is a literal command run from the repository root. Record outputs under `evidence/U01a/<task>/`. A command that cannot run is a blocked prerequisite, not a pass. The feature map is `agora/feature-map.json`; a change to any path it lists invalidates that feature's scenarios until the Drive step passes again at the new head.

## Doctor

Read-only. Expected: Node 24.x, pnpm 10.x, PostgreSQL 18.x server binaries, a Swift 6 toolchain, install and static gates exit 0. A missing Swift toolchain blocks the contract steps; it never downgrades them to a pass.

```sh
node --version
pnpm --version
pg_ctl --version
swift --version
pnpm install --frozen-lockfile
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
pnpm test
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs
node scripts/with-test-postgres.mjs bash -c 'node packages/storage/src/migrate-cli.ts; node packages/storage/src/migrate-cli.ts'
```

Pass predicates:

- `pnpm contracts:check` prints `"outcome": "pass"` with an empty `drift` list; `"outcome": "unavailable"` (exit 3) means the Swift generator could not run and the step is blocked, not passed.
- `pnpm test` exits 0 with every unit and pg test passing. The pg project refuses to run without a database; the contract tests fail, never skip, without Swift.
- The probe report has `"outcome": "pass"` for `health-liveness` (200), `health-readiness` (200), `policy-allow` (200, `decision: allow`), `policy-deny` (200, `reason_code: scope_mismatch`), `policy-unknown-field` (400, `malformed_command`) and `unknown-route` (404, `not_found`).
- The first migration report has `applied: 1`; the second has `applied: 0` and the same `schema_digest`.

## Evidence

Red before green: apply the head's test patch to the parent revision and keep both receipts.

```sh
node scripts/record-red-green.mjs --parent <parent-sha> --head <head-sha> --out evidence/U01a/<task> -- pnpm -s test
```

`red.log` must show the intended assertions failing (for example `expected 404 to be 200`), not a missing runner, syntax error or dependency failure. `green.log` must exit 0. Copy probe and migration outputs beside them.

## Cleanup

`with-test-postgres.mjs` stops and deletes its cluster on exit, including on SIGINT. `record-red-green.mjs` removes its worktrees. `generate.mjs --check` and the contract tests remove their temporary trees. `contracts/swift/.build/` is an ignored build cache and may stay. Confirm nothing else is left behind:

```sh
git worktree prune
git worktree list | grep -c 'agora-red-\|agora-green-\|agora-clean-' || echo "worktrees: clean"
ls "${TMPDIR:-/tmp}" | grep agora- || echo "tmp: clean"
```

Both greps must find nothing.

Evidence files under `evidence/` must survive cleanup; the cluster and worktrees must not.
