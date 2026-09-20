# Repository foundation

## What it is

U01a.B01 is the landed non-production fixture: package boundaries, strict checks, public HTTP driving and real PostgreSQL isolation. It is not the communication center.

## What it does

`apps/center` exposes health, database readiness and a scope-policy decision. `packages/domain` compares normalized fixture scope IDs. `packages/storage` owns migrations, scoped transactions, stream counters, events and one-winner claims. Root scripts make these boundaries repeatable to verify.

## Why it exists

Real rollback, race, foreign-key and non-owner row-security tests catch failures that mocks hide before product permissions depend on them.

## How it works

```flow
HTTP driver | Start the center on loopback and send literal fixture requests.
Wire validation | Reject extra fields and malformed values without coercion.
Pure policy and scoped tests | Compare scope IDs; separately prove transaction and row-policy behavior in PostgreSQL.
Observed proof | Require exact responses, no rollback residue and one winning claim.
```

## Implementation status

Built at the atlas revision, fixture only. `GET /api/v1/health` returns 200; readiness returns 200 or 503; the fixture policy route returns an allow/deny decision. Extra fields produce 400 and unknown routes 404. Test-provided actor IDs are not real authentication. No invitations, rooms, worker, scheduler or foundation qualification exist.

## Verification and proof

Inspected [center source](repo:apps/center/src/app.ts), [storage source](repo:packages/storage/src/fixture.ts), [policy tests](repo:apps/center/test/policy.test.ts), [database tests](repo:packages/storage/test/fixture.pg.test.ts), and [task outcome](repo:evidence/U01a/agora-s1-bootstrap-repository/outcome.json). Run `node scripts/with-test-postgres.mjs node scripts/probe-center.mjs` for the public probe. [The development runbook](repo:docs/runbooks/development.md) and [verification skill](repo:.agents/skills/verify-agora/SKILL.md) own exact commands and limits.
