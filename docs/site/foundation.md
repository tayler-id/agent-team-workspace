# Repository foundation

## What it is

The first landed task, U01a.B01, is a small, non-production walking fixture. It establishes package boundaries, strict checking, public HTTP probes and real PostgreSQL behavior before Agora handles anyone's conversation or launches work.

## What it does

`apps/center` composes four Hono routes. `packages/domain` decides whether two fixture scope IDs match. `packages/storage` owns connection handling, reviewed migrations, scoped transactions, stream counters, events and claims. The root scripts give contributors repeatable verification commands.

| Public route | Literal behavior |
| --- | --- |
| `GET /api/v1/health` | 200 with `status: ok`, no dependency access |
| `GET /api/v1/health/ready` | 200 when PostgreSQL answers, 503 otherwise |
| `POST /api/v1/fixture/policy/decisions` | Validated scope input produces allow or `scope_mismatch` denial |
| `POST /api/v1/local-room/messages` | Validated send command answers a typed 404 `unavailable_capability` in local-room L1; [Local room contracts](local-room.md) explains the slice |

Unknown routes return JSON 404 with `not_found`. Unknown input fields return 400 with `malformed_command`. A denial is a successful policy evaluation (HTTP 200), not a successful product action.

## Why it exists

A realistic foundation catches errors that an in-memory mock would hide: rollback that advances a counter, lexical ordering of decimal sequences, a foreign key that crosses scopes, a leaked pool client, or a table-owner test that bypasses row security. These problems must be fixed before real permissions depend on them.

## How it works

```flow
Public HTTP driver | Launch the center on loopback and send real requests.
Wire validation | Ajv rejects malformed or extra fields without coercion.
Pure policy | Normalize schema-valid UUIDs and compare fixture scope IDs.
Scoped storage tests | Bind scope transaction-locally; lock counters and commit event changes together.
Observed result | Assert literal responses, rollback, one-winner claims and non-owner denial.
```

The policy HTTP route is pure and does not persist a product command. The storage tests independently exercise `foundation_fixture` with a non-owner role. `withScope` owns the transaction and releases the client even after failures. Composite scope keys prevent another scope from attaching events through a foreign key.

## Implementation status

**Built at the atlas revision, fixture only.** This task does not implement authentication, invitations, rooms, WebSockets, a run scheduler, backup recovery or a worker. On its own it did not qualify U01a; the milestone required all four U01a tasks plus fresh integration proof. Never treat caller-supplied fixture actor IDs as real authentication.

U01a milestone qualification followed at revision `b9c65c4`: all ten plan-defined integration lanes were rerun fresh at that exact head, independent of any task's own evidence. The [milestone qualification receipt](repo:evidence/U01a/outcome.json) records the result. FG04 through FG08 remain correctly unqualified; they belong to U01b, U01c and U01d.

After the seeded `606cba2` snapshot, U01a.B03 landed a deeply immutable client state machine and portable import/public-type guards. It turns validated snapshots and events into replay, acknowledgement and command decisions without a renderer or network transport. The [source-owned synchronization explanation](repo:docs/features/client-synchronization.md) covers its state flow and fixture-only limits. `scripts/client-fixture.ts` translates fixtures outside the core; `scripts/drive-client-core.ts` compares TypeScript and Swift through `pnpm client:replay -- --json --swift`. `scripts/boundary-policy.ts` and `scripts/public-types.ts` enforce dependency and public-port boundaries through `pnpm boundaries`.

### PostgreSQL socket ownership and lifecycle (CI P0c A/B/C)

For contributors, the existing PostgreSQL wrapper now uses the qualified allocator without shortening data or evidence paths. B adds bounded startup, cancellation and owned process-group cleanup, not user-facing room behavior. C qualifies the integrated guard: ten source-copy guard negatives, twenty-six real lifecycle scenarios and a no-leftover inventory, all recorded in the [C receipts](repo:evidence/ci/P0c/C/review.md).

```flow
Long task paths | Keep data, logs and retained evidence inside the worktree.
Short private socket | Allocate a run-bound 0700 directory under the canonical local temporary root.
Owned execution | Start PostgreSQL directly, wait for readiness within the startup deadline, then run ordinary tests as agora_app.
Ownership boundary | Stop only owned groups, verify identity before removal, and preserve evidence and neighboring resources.
Fail-closed reporting | Carry tool stderr, fail once on an unspawnable probe, report a group that cannot be signaled, and retain anything foreign.
```

The [allocation helper](repo:scripts/postgres-socket.ts) and [literal tests](repo:packages/storage/test/postgres-socket.test.ts) cover allocation, two live identities, collision refusal, private permissions, foreign records, inode replacement, simulated device substitution, hard-linked records, symlinks, nonempty directories and idempotent removal. Both source-copy guard mutations must turn their named denial assertions red. The [evidence record](repo:evidence/ci/P0c/review.md) retains the untouched-wrapper failure and approved slice boundary; no data directory was shortened to hide it. B's [public wrapper tests](repo:packages/storage/test/postgres-wrapper.test.ts) exercise real deep-path connections, signal cancellation, forced termination, startup failure/timeout and foreign-resource preservation. Its [receipts](repo:evidence/ci/P0c/B/review.md) record the observed lifecycle. C's [guard negatives](repo:evidence/ci/P0c/C/guard.json) disable short-socket selection, lease verification, exact group stop, bounded startup, cancellation cleanup, foreign lock and root refusal, stderr capture, probe-spawn failure and stop-failure reporting one at a time, and its [lifecycle scenarios](repo:evidence/ci/P0c/C/scenarios.json) reproduce success, failure, timeout, cancellation at every stage, signal storms, nested groups, foreign substitution and concurrent neighbors with real PostgreSQL 18. The [runbook](repo:docs/runbooks/development.md) defines timeout, exit and fail-closed retention behavior.

## Verification and proof

Inspected committed [center implementation](repo:apps/center/src/app.ts), [scope decision](repo:packages/domain/src/policy/fixture-scope.ts), [storage implementation](repo:packages/storage/src/fixture.ts), [public policy tests](repo:apps/center/test/policy.test.ts), and [real database tests](repo:packages/storage/test/fixture.pg.test.ts).

The retained [task outcome](repo:evidence/U01a/agora-s1-bootstrap-repository/outcome.json) and [review history](repo:evidence/U01a/agora-s1-bootstrap-repository/review.md) delimit the claim. Run the current [verification instructions](repo:.agents/skills/verify-agora/SKILL.md) rather than reusing old logs as fresh proof.

The later core's [implementation](repo:packages/client-core/src/index.ts), [public tests](repo:packages/client-core/test/sync.test.ts) and [review receipt](repo:evidence/U01a/agora-s1-isolate-client-core/3-boundaries/review.md) describe that newer fixture work, not a retroactive change to the atlas snapshot or a product qualification.

Next: [portable contracts](contracts.md), [public drivers](repo:docs/runbooks/development.md), or [all planned components](repo:docs/implementation-plan.md).
