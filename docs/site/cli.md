# CLI and public drivers

This is the complete current contributor command surface, plus a separate inventory of planned product commands. Run current commands from the repository root. There is no installed `agora` binary at this snapshot.

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
| `pnpm lint` | Strict ESLint and import/public-type rules; generated TypeScript retains boundary checking |
| `pnpm typecheck` | TypeScript packages/tests plus a no-DOM/no-Node core compile lane |
| `pnpm boundaries` | Isolated import/export/public-type guard negatives; writes `.scratch/boundaries.json` |
| `pnpm test` | Unit, contract and real PostgreSQL tests |
| `pnpm test:unit` | Unit and contract tests, including mandatory Swift conformance |
| `pnpm test:pg` | Throwaway PostgreSQL tests only |
| `pnpm check` | Lint, typecheck, documentation, contract drift and tests |

## Contract tools

`pnpm contracts:generate` writes the bundled OpenAPI, generated TypeScript/Swift consumers and digest manifest. `pnpm contracts:check` regenerates into a temporary tree and compares bytes. `pnpm contracts:conform -- --json` prints a joint report for the golden vectors. Conformance reports pass only if both consumers match expectations.

Advanced generator driver: `node contracts/tools/generate.mjs`. Flags are `--check`, `--subset-only`, `--schemas DIR`, `--operations FILE`, and `--against ROOT`. The path overrides exist for isolated negative tests, not alternate production wire authorities. Exit codes: 0 pass, 1 drift/subset failure, 3 unavailable generator, 70 infrastructure failure.

The Swift executable `agora-contracts-conform` lives in `contracts/swift`. The project TypeScript driver invokes it and combines results; use that driver for the golden pass predicate. `canonicalJson` and `digestCanonical` are public package functions, not executable shell commands. [Contracts](contracts.md) explains their purpose.

## Client replay fixture

`pnpm client:replay -- --json --swift` runs six literal replay vectors through the TypeScript core and independent Swift fixture consumer. It prints final state, transition requests and acknowledgments. The package-manager separator is accepted. Flags: `--json` (output is always JSON), `--swift` (require native agreement), and `--file PATH` (alternate fixture, default `contracts/fixtures/replay.json`). Unknown flags or malformed input exit 64; pass exits 0, mismatch 1, unavailable Swift 3, infrastructure failure 70.

This driver landed after the atlas seed. It proves fixture convergence, not a browser transport or production conversation flow. [Synchronization](synchronization.md) explains its scope and proof.

## Center and database

`node apps/center/src/main.ts` requires `AGORA_DATABASE_URL` and listens on `127.0.0.1`, `PORT` default 3000. Missing database configuration exits 64. It prints an `agora.center-start/v1` startup line. This fixture is not a public production service.

| Driver | Behavior and outputs |
| --- | --- |
| `pnpm migrate` | Owner connection via `AGORA_MIGRATION_DATABASE_URL`; JSON `applied`, `total`, `schema_digest` and server version |
| `pnpm migrate:ephemeral` | Same migration on a throwaway cluster |
| `node scripts/with-test-postgres.mjs COMMAND ARGS...` | Starts socket-only PostgreSQL for one command, passes exit, stops and removes its cluster |
| `node scripts/probe-center.mjs --json` | Requires database URL; launches center and checks eight literal HTTP outcomes, then stops center |
| `node scripts/probe-center.mjs --scenarios [--json]` | Prints the `agora.probe-scenarios/v1` inventory (id, method, path, expected status and reason code); starts nothing and needs no database |

Migrate exits 0 pass, 2 blocked prerequisite, 64 usage error, or 70 infrastructure failure. Probe exits 0 pass, 1 observed failure, 2 blocked prerequisite or 70 infrastructure failure. Its report is `agora.probe/v1`, not the future universal CLI envelope.

### Public HTTP fixture

- `GET /api/v1/health`: liveness, 200.
- `GET /api/v1/health/ready`: database reachability, 200 or 503.
- `POST /api/v1/fixture/policy/decisions`: scope decision, 200; malformed input 400.
- `POST /api/v1/local-room/messages`: validated and dispatched local-room send; 404 `unavailable_capability` in L1, malformed input 400. [Local room contracts](local-room.md) explains the slice.
- Other routes: JSON 404 `not_found`. Each error has a reason code and correlation ID.

See [the runnable recipe](cookbook.md) and [configuration](configuration.md). Do not invent production authorization from fixture actor input.

## Task proof admission

`pnpm verify:foundation -- --parent PARENT --head HEAD --evidence DIR --json` runs the bounded U01a.B04 driver and emits `agora.foundation/v1`. Foundation admission remains blocked. Use the explicit `--scope task` for task-local readiness, `record` for receipt capture, and `lane-9` or `lane-10` for guard and admission negatives. The [task proof reference](test-first.md#public-command-reference) lists all flags, pass predicates, exit semantics and trust limits.

## Evidence and design tools

`node scripts/record-red-green.mjs --parent SHA --head SHA --out DIR -- COMMAND ARGS...` creates disposable worktrees, carries head test files onto the parent, installs locked dependencies and records both results and digests. Nonzero red alone is not adequate: inspect that it is the intended assertion, not a missing tool. It removes its worktrees and preserves receipts.

`node scripts/verify-design.mjs` checks semantic design consistency. `node scripts/test-design-checks.mjs` runs its negative cases on a disposable sandbox that copies decision-cited `apps` sources; it is not yet part of `pnpm check`. See [mechanical CI guardrails](ci.md) for P0a scope. `node scripts/verify-design-handoff.mjs` checks the portable design packet; `node scripts/test-design-handoff-checks.mjs` proves its rejection fixtures. `scripts/require-test-postgres.ts` is the Vitest prerequisite hook, not a standalone service. The unchanged pstack plan checker is informational; [verification](verification.md) provides its command.

## Planned product CLI: unavailable

| Planned command group | Purpose | Stage |
| --- | --- | --- |
| `agora project doctor`, `scenarios`, `start`, `verify`, `evidence`, `stop`, `lanes` | Registered project verification with versioned JSON reports | S1 foundation, U01a.B04/U01b |
| `agora worker enroll`, `register`, `doctor`, `start`, `revoke` | Explicit owner-bound device lifecycle, foreground process | S1 U06 |
| `agora worktree prepare` | Isolated manual work without changing ordinary checkout | S1 U06 |
| `agora verify` | Drive registered checks on an exact candidate | S1 U07 |
| `agora publish` | Separately approved draft only | S1 U08 |

These are names in [R08/R12](repo:docs/technical-spec.md), not commands to run now. Their future help/version must not start an application; UI and CLI must share the same authorization. No auto-merge command is planned.
