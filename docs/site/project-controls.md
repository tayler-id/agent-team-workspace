# Owned project verification

## What it is

U01b.B01 adds real, project-owned fixture controls, not a worker or production service. [The Node driver](repo:scripts/project.mjs), [owned host](repo:scripts/project-host.mjs) and [freshness checks](repo:scripts/project-checks.mjs) expose one versioned CLI envelope for Agora and an independent Python application. Product readers can start with [checking a project](checking-a-project.md).

## What it does

Doctor checks prerequisites without starting anything. Start allocates an instance and waits for its live identity. Verify drives HTTP and compares literal decisions, persisted database rows and object bytes. Evidence rechecks the instance, head, configuration and artifacts. Stop removes only that instance's live resources while keeping receipts. [The manifest](repo:agora/project.json) binds task lanes 1-10 to a fixed test driver, target, predicates, timeout and cleanup policy; lanes 5-7 belong to the [evidence validator](evidence-validator.md) and 8-10 to [trusted checks](trusted-checks.md). The [contract source](repo:contracts/schemas/cli.schema.json) closes reports, instance metadata and journal responses.

`lanes --unit` and `verify --scenario perf --unit` accept every unit in the manifest's `units` list. U01b and U22 have lane drivers. U22 runs [named Client and Host tests](client-host-evidence.md) and exits 3 while lane 9 is unavailable. U20, U21, U23, U01c and U01d report their ten lanes unavailable with a reason until one exists. Perf clones the parent revision (default `HEAD^`, or `--parent`) with its own offline `pnpm install`, then alternates five parent and five head runs of the unit's probe, and compares the 95th percentile of each declared metric. It fails a head more than 10% over its parent or past the unit's absolute budget. U01b times fixture startup, the policy scenario, evidence recheck and validation of a 10-MiB evidence bundle. U20 times lint against the `.ts`-only baseline and U21 times inventory generation. A probe that fails, prints anything but its metrics or is missing never becomes a pass. A probe exits 4 when the behavior it measures is missing from its tree. If that happens for the parent on its first run, the receipt records `parent_behavior: absent` and only the absolute budgets apply. Any other probe failure fails the run. U22, U23, U01c and U01d have no executable probe and say so.

## Why it exists

A successful unit test or screenshot is not proof that a project really ran. A shared database, stolen port or broad process kill can also make another attempt's output look successful. These controls make the subject and cleanup boundary explicit and reject missing, changed or unrelated proof.

## How it works

```flow
Doctor and allocate | Check Node 24, PostgreSQL 18 or Python plus its locked validator; allocate a fresh UUID and private root.
Own the instance | The host owns a private control socket, loopback HTTP port, database and object directory; return PID plus process start identity and handle.
Drive public behavior | POST literal same-scope and other-scope commands; GET the committed journal and independently read its stored object bytes.
Bind proof | Record exact head and source/configuration/skill digests, public observations, artifact size and hash; reject drift before reuse.
Stop narrowly | Authenticate the recorded live host and cleanup handle; remove its resources, never the retained evidence or another instance.
```

Agora uses its real Hono policy composition and a socket-only PostgreSQL cluster with the existing migrations and non-owner service role. Its verification-only journal is not mounted by the production center. Python uses its own HTTP server, SQLite transactions and the independent `jsonschema` validator. Each allocates its own object directory. Local filesystem objects are a foundation fixture, not S3 compatibility proof.

[The skill](repo:.agents/skills/verify-agora/SKILL.md) is the literal reproduction recipe. Install the pinned [Python requirements](repo:packages/verification/fixture/requirements.txt) into `.scratch/python` and put its `bin` on PATH. All children receive an environment allowlist; no inherited database URLs, forge tokens or Node hooks are forwarded. Processes still run with the local owner's permissions. This is not a hostile-code sandbox or tamper-proof attestation.

The registry is `.scratch/project/<agora|python>/<UUID>/state.json`. It binds checkout, instance, temp root, process identity and cleanup handle. Failed startup logs stay there. A failed cleanup is not removal; retain that registry for recovery. Stop requires the original `--handle`, not a PID. Evidence lives in the requested repository-contained `evidence/` or `.scratch/` directory; symlink escapes refuse. UUID namespaces cannot be reused.

## Implementation status

**In progress pending independent exact-head review.** The task implementation and five native tests exist, including an isolated guard mutation. No U01b milestone verdict, FG05/FG06, trusted CI, signed general evidence service, browser product UI, production identity or model execution is claimed. The progress atlas changes data only. The design team retains ownership of its replacement visual system; this page uses the existing accessible ordered-flow component.

## Verification and proof

[Behavior tests](repo:packages/verification/test/project.test.ts) and [per-unit tests](repo:packages/verification/test/project-units.test.ts) exercise both public CLIs, simultaneous instances, foreign cleanup, report disagreement, missing runners, malformed inventory, absent/altered/stale artifacts, skill drift and feature-map deletion. The guard assertion passes normally and turns red when only the artifact-byte check is disabled in an isolated copy. [The initial intended-assertion red](repo:evidence/U01b/agora-s1-isolate-development/assertion-red.log) follows a callable baseline. Full task receipts, including failed attempts, are retained under `evidence/U01b/agora-s1-isolate-development/`; their headers, not a status badge, name exact tested revisions. The [CLI reference](cli.md#owned-project-controls) distinguishes task proof from unimplemented milestone lanes.
