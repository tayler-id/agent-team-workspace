# Repository foundation

## What it is

The first landed task, U01a.B01, is a small, non-production walking fixture. It establishes package boundaries, strict checking, public HTTP probes and real PostgreSQL behavior before Agora handles anyone's conversation or launches work.

## What it does

`apps/center` composes three Hono routes. `packages/domain` decides whether two fixture scope IDs match. `packages/storage` owns connection handling, reviewed migrations, scoped transactions, stream counters, events and claims. The root scripts give contributors repeatable verification commands.

| Public route | Literal behavior |
| --- | --- |
| `GET /api/v1/health` | 200 with `status: ok`, no dependency access |
| `GET /api/v1/health/ready` | 200 when PostgreSQL answers, 503 otherwise |
| `POST /api/v1/fixture/policy/decisions` | Validated scope input produces allow or `scope_mismatch` denial |

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

**Built at the atlas revision, fixture only.** This task does not implement authentication, invitations, rooms, WebSockets, a run scheduler, backup recovery or a worker. It does not qualify U01a or the full R22 foundation. Never treat caller-supplied fixture actor IDs as real authentication.

## Verification and proof

Inspected committed [center implementation](repo:apps/center/src/app.ts), [scope decision](repo:packages/domain/src/policy/fixture-scope.ts), [storage implementation](repo:packages/storage/src/fixture.ts), [public policy tests](repo:apps/center/test/policy.test.ts), and [real database tests](repo:packages/storage/test/fixture.pg.test.ts).

The retained [task outcome](repo:evidence/U01a/agora-s1-bootstrap-repository/outcome.json) and [review history](repo:evidence/U01a/agora-s1-bootstrap-repository/review.md) delimit the claim. Run the current [verification instructions](repo:.agents/skills/verify-agora/SKILL.md) rather than reusing old logs as fresh proof.

Next: [portable contracts](contracts.md), [public drivers](repo:docs/runbooks/development.md), or [all planned components](repo:docs/implementation-plan.md).
