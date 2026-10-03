# CLI and public drivers

This is the complete current contributor command surface, plus a separate inventory of planned product commands. Run current commands from the repository root. There is no installed `agora` binary at this snapshot.

## Owned project controls

`pnpm -s agora project COMMAND --json` forwards directly to `node scripts/project.mjs project COMMAND --json`. The independent Python application uses `python3 packages/verification/fixture/project.py COMMAND --json`. All output is `agora.cli-report/v1`. See [checking a project](checking-a-project.md) for the user boundary and [operator details](project-controls.md) for setup and proof.

| Command | Required input and result |
| --- | --- |
| `doctor` | Read-only Node/PostgreSQL or Python/validator prerequisites |
| `scenarios` | Current `policy`, `controls`, `guards` inventory; missing mapping fails |
| `start` | `--profile verify --instance UUID`; returns allocated URL, database/object namespace, PID/start identity and cleanup handle |
| `verify` | `--scenario policy --instance UUID --artifacts DIRECTORY`; drives HTTP and persists retained proof |
| `verify` | `--scenario controls` or `guards --artifacts DIRECTORY`; executes the full task-native test/guard suite |
| `evidence` | `--instance UUID`; requires fresh same-instance proof and matching artifact bytes, including after stop |
| `stop` | `--instance UUID --handle CLEANUP_HANDLE`; authenticated owned cleanup, idempotent only for that handle |
| `lanes` | `--unit U01b --task agora-s1-isolate-development --artifacts DIRECTORY`; task lanes 1-4 plus guard mutation |

`--fixture python` selects the Python fixture through the Node launcher; prefer its independent Python entry when checking cross-language reports. Unknown options reject. Direct whole-unit `lanes --unit U01b` still executes available proof but exits blocked because lanes 5-10 belong to later tasks. Exit codes are exactly 0 pass, 1 observed failure, 2 blocked, 3 unavailable, 64 usage error, 70 infrastructure failure. An unavailable check is never successful evidence. Runtime state is private to `.scratch/project/`; evidence paths must stay below repository `evidence/` or `.scratch/` without symlink escape.

## Documentation commands

| Command | Input / effect | Result |
| --- | --- | --- |
| `pnpm docs:dev` | Optional `DOCS_PORT=4173`; loopback-only server, rebuild on page request | Local URL; Ctrl+C cleanup |
| `pnpm docs:build` | Validate then produce self-contained `.docs-dist/` | JSON pass, exit 0; invalid content exits 1 |
| `pnpm docs:validate` | Validate sources and mirrored atlas without producing output | JSON pass or exit 1 diagnostics |
| `pnpm docs:atlas` | Regenerate `docs/site/progress.md` from `atlas.json` | Then validate consistency |
| `pnpm docs:test` | Documentation consistency and guard-negative tests | TAP output and nonzero on failure |
| `pnpm docs:check` | Authored Markdown lint, design semantics, site checks and guard tests | Exit 0 only if all pass |

## Workspace checks

| Command | What is exercised |
| --- | --- |
| `pnpm install --frozen-lockfile` | Exact pnpm dependency graph |
| `node scripts/ci-doctor.mjs --json` | [P0b prerequisites](ci.md), not behavioral tests; exit 0 pass, 2 blocked, 64 usage; omit `--json` for remedies |
| `node --test scripts/test/ci-doctor.test.ts` | Actual native positive, wrong/missing prerequisites and omitted-probe negatives |
| `pnpm lint` | Strict ESLint and import/public-type rules; generated TypeScript retains boundary checking |
| `pnpm typecheck` | TypeScript packages/tests plus a no-DOM/no-Node core compile lane |
| `pnpm boundaries` | Isolated import/export/public-type and application-architecture import-ownership guard negatives; writes `.scratch/boundaries.json` |
| `pnpm test` | Unit, contract, real PostgreSQL and `apps/web` browser-room tests (jsdom, same environment as `pnpm web:test`) |
| `pnpm test:unit` | Unit and contract tests, including mandatory Swift conformance |
| `pnpm test:pg` | Throwaway PostgreSQL tests only |
| `pnpm features:check` | Generated Feature inventory drift; `pnpm features:generate` rewrites the inventory, and `pnpm test` runs the discovery tests. See [Feature discovery](feature-discovery.md) |
| `pnpm check` | Every step [the development runbook](repo:docs/runbooks/development.md) lists for it |

## Contract tools

`pnpm contracts:generate` writes the bundled OpenAPI, generated TypeScript/Swift consumers and digest manifest. `pnpm contracts:check` regenerates into a temporary tree and compares bytes. `pnpm contracts:conform -- --json` prints a joint report for the golden vectors. Conformance reports pass only if both consumers match expectations.

Advanced generator driver: `node contracts/tools/generate.mjs`. Flags are `--check`, `--subset-only`, `--schemas DIR`, `--operations FILE`, and `--against ROOT`. The path overrides exist for isolated negative tests, not alternate production wire authorities. Exit codes: 0 pass, 1 drift/subset failure, 3 unavailable generator, 70 infrastructure failure.

The Swift executable `agora-contracts-conform` lives in `contracts/swift`. The project TypeScript driver invokes it and combines results; use that driver for the golden pass predicate. `canonicalJson` and `digestCanonical` are public package functions, not executable shell commands. [Contracts](contracts.md) explains their purpose.

## Client replay fixture

`pnpm client:replay -- --json --swift` runs six literal replay vectors through the TypeScript core and independent Swift fixture consumer. It prints final state, transition requests and acknowledgments. The package-manager separator is accepted. Flags: `--json` (output is always JSON), `--swift` (require native agreement), and `--file PATH` (alternate fixture, default `contracts/fixtures/replay.json`). Unknown flags or malformed input exit 64; pass exits 0, mismatch 1, unavailable Swift 3, infrastructure failure 70.

This driver landed after the atlas seed. It proves fixture convergence, not a browser transport or production conversation flow. [Synchronization](synchronization.md) explains its scope and proof.

## Local room runtime

The project-owned driver is `node scripts/local-room.ts COMMAND`. Output is always schema-validated `agora.local-runtime/v1` JSON, with `outcome`, `detail`, and available launch/path/listener inventory. Credentials are never printed. `--help` and `--version` start nothing. Unknown flags or missing values are refused. Run from the owning checkout root.

| Command | Effect and flags |
| --- | --- |
| `doctor` | Read-only Node 24/PostgreSQL 18 availability report |
| `start` | Allocate private cluster and center, migrate as owner, run queries as `agora_app`, build the live room UI and print its `url`; optional `--port PORT` |
| `status` | Challenge the running launch, or prove its listeners absent when stopped |
| `send --body TEXT` | Same validated HTTP send as the browser; optional `--command-id UUID` for an explicit same-command retry |
| `answer --selected-id UUID` | Post a deterministic quoted local response to a persisted message; optional `--command-id UUID` reuses the same identity across retries/restarts. A fresh ID makes a separate quote. |
| `history` | Public snapshot, latest 1000 messages plus consistent cursor |
| `replay --after CURSOR` | One public batch of at most 50 committed events, default cursor `0`; repeat after the last event's `seq` |
| `evidence` | Fresh authenticated inventory and public snapshot; redirect JSON outside the instance directory to retain it |
| `stop` | Authenticate exact launch, request owned shutdown, prove both listeners absent; retain database |
| `reset --confirm-disposable` | Only while stopped: validate exact owned paths, refuse symlinks and remove disposable data |

Every command accepts `--instance NAME`, default `development`; names are 1-60 lowercase letters, digits or hyphens. Files live in `.scratch/local-room-NAME`. Start refuses an already running or ambiguous instance, even if its process appears familiar. Ordinary restart keeps its URL but uses a fresh launch identity. Reset never implicitly stops anything. Exit 0 means pass, 2 blocked/refused prerequisite or operation, 64 usage error, 70 invalid internal report. HTTP failures become a blocked CLI report, never a successful partial send.

[Local room](local-room.md) explains lifecycle and replay; [operator guidance](operations.md#local-room-lifecycle) explains retained data and uncertain cleanup. This is not the universal U01b project CLI or production identity.

## Local answer pure core

```sh
pnpm exec vitest run --project unit packages/domain/test/local-answer.test.ts packages/domain/test/local-answer-guards.test.ts --reporter=json
```

This is a public package test driver, not a product response trigger. It invokes `@agora/domain/local-answer` with explicit fixture values representing validated persisted records. Native Vitest JSON reports 14 passing tests, exit 0; any assertion failure exits nonzero. It needs no database, service, provider, credentials or browser. Guard tests spawn bounded test-only Node processes and lint hypothetical forbidden imports; the pure computation has none of that authority. Test-only source copies under `.scratch/answer-guard-*` are removed in `finally`; remove the disposable `.vitest/json/output.json` reporter cache and its empty parent directories after retaining the report. Red/green and exact-subject receipts stay in `evidence/local-room/agent-core/`.

No flags accept chat command text or arbitrary selected files. See [the local room](local-room.md#selected-messages-to-a-cited-proposal) and [developer boundary reference](repo:docs/runbooks/development.md). The pure core itself has no HTTP or effect handle. The separate L5 adapter now exposes a selected-message CLI/browser trigger; it loads persisted records and commits a quoted response through the room event path.

## Center and database

`node apps/center/src/main.ts` requires `AGORA_DATABASE_URL` and listens on `127.0.0.1`, `PORT` default 3000. Missing database configuration exits 64. It prints an `agora.center-start/v1` startup line. This fixture is not a public production service.

| Driver | Behavior and outputs |
| --- | --- |
| `pnpm migrate` | Owner connection via `AGORA_MIGRATION_DATABASE_URL`; JSON `applied`, `total`, `schema_digest` and server version |
| `pnpm migrate:ephemeral` | Same migration on a throwaway cluster |
| `node scripts/with-test-postgres.mjs COMMAND ARGS...` | Owned short socket, bounded startup (`AGORA_PG_STARTUP_TIMEOUT_MS`, default 30000), NDJSON lifecycle identities, tool stderr in `blocked` receipts and exact cleanup; [limits and exits](repo:docs/runbooks/development.md) |
| `node scripts/probe-center.mjs --json` | Requires the service and migration database URLs; applies the migration, launches center and checks sixteen literal HTTP outcomes including a stop and restart of the process, then stops center |
| `node scripts/probe-center.mjs --scenarios [--json]` | Prints the `agora.probe-scenarios/v1` inventory (id, method, path, expected status and reason code); starts nothing and needs no database |

Migrate exits 0 pass, 2 blocked prerequisite, 64 usage error, or 70 infrastructure failure. Probe exits 0 pass, 1 observed failure, 2 blocked prerequisite or 70 infrastructure failure. Its report is `agora.probe/v1`, not the future universal CLI envelope.

### Public HTTP fixture

- `GET /api/v1/health`: liveness, 200.
- `GET /api/v1/health/ready`: database reachability, 200 or 503.
- `POST /api/v1/fixture/policy/decisions`: scope decision, 200; malformed input 400.
- `POST /api/v1/local-room/messages`: send to the fixed local room, committed in one transaction; 201 receipt, replay returns the original receipt, changed body 409 `command_conflict`, other scope or unknown citation 404, malformed input 400. [Local room](local-room.md) explains the slice.
- `POST /api/v1/local-room/answer`: validated `LocalAnswerCommand` selects 1-10 persisted message IDs from the fixed room, commits a labelled quoted local-agent response and returns a receipt (201). Replay with the same command ID and selection returns that receipt; different selection conflicts (409). Missing/duplicate selection or scope is refused (404), malformed wire is 400. Not a model provider.
- `GET /api/v1/local-room/snapshot`: ordered history and cursor of the fixed room from one repeatable read, at most the latest 1000 messages.
- `GET /api/v1/local-room/events?after=CURSOR`: up to 50 committed events in numeric order, strictly after the cursor. Invalid cursor is 400; an empty page means caught up.
- Other routes: JSON 404 `not_found`. Each error has a reason code and correlation ID.

See [the runnable recipe](cookbook.md) and [configuration](configuration.md). Do not invent production authorization from fixture actor input.

## Task proof admission

`pnpm verify:foundation -- --parent PARENT --head HEAD --evidence DIR --json` runs the bounded U01a.B04 driver and emits `agora.foundation/v1`. Foundation admission remains blocked. Use the explicit `--scope task` for task-local readiness, `record` for receipt capture, and `lane-9` or `lane-10` for guard and admission negatives. The [task proof reference](test-first.md#public-command-reference) lists all flags, pass predicates, exit semantics and trust limits.

## Evidence and design tools

`node scripts/record-red-green.mjs --parent SHA --head SHA --out DIR -- COMMAND ARGS...` creates disposable worktrees, carries head test files onto the parent, installs locked dependencies and records both results and digests. Nonzero red alone is not adequate: inspect that it is the intended assertion, not a missing tool. It removes its worktrees and preserves receipts.

`node scripts/verify-design.mjs` checks semantic design consistency. `node scripts/test-design-checks.mjs` runs its negative cases. `node scripts/verify-design-handoff.mjs` checks the portable design packet; `node scripts/test-design-handoff-checks.mjs` proves its rejection fixtures. `scripts/require-test-postgres.ts` is the Vitest prerequisite hook, not a standalone service. The unchanged pstack plan checker is informational; [verification](verification.md) provides its command.

## Planned product CLI: unavailable

| Planned command group | Purpose | Stage |
| --- | --- | --- |
| `agora project doctor`, `scenarios`, `start`, `verify`, `evidence`, `stop`, `lanes` | Registered project verification with versioned JSON reports | S1 foundation, U01a.B04/U01b |
| `agora worker enroll`, `register`, `doctor`, `start`, `revoke` | Explicit owner-bound device lifecycle, foreground process | S1 U06 |
| `agora worktree prepare` | Isolated manual work without changing ordinary checkout | S1 U06 |
| `agora verify` | Drive registered checks on an exact candidate | S1 U07 |
| `agora publish` | Separately approved draft only | S1 U08 |

These are names in [R08/R12](repo:docs/technical-spec.md), not commands to run now. Their future help/version must not start an application; UI and CLI must share the same authorization. No auto-merge command is planned.
