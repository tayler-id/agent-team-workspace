# Installation and first checks

Today you install a contributor checkout, not an Agora product. There is no supported production installer or downloadable worker yet.

## Prerequisites

Use Node 24 (at least 24.16.0), pnpm 10.34.1, PostgreSQL 18 server binaries on PATH, and Swift 6. The existing receipts exercised Node 24.16.0, PostgreSQL 18.4 and Apple Swift 6.3.3. Later target minors in the spec are not automatically tested versions.

No external account is needed for the docs or fixture. The first dependency install and Swift build need registry access; subsequent locked builds can use local caches. Do not supply production credentials to these tests.

## Read the documentation locally

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
```

Open `http://127.0.0.1:4173`. The server rebuilds on page requests. Stop it with Ctrl+C. Set `DOCS_PORT` if that port is occupied. For static output, run `pnpm docs:build`; deploy the contents of `.docs-dist/` to any ordinary static host. See [docs operations](operations.md#documentation-deployment).

## Prove the actual foundation

```sh
node --version
pnpm --version
pg_ctl --version
swift --version
pnpm check
pnpm contracts:conform -- --json
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs
```

The last command starts a temporary database and a real center process, drives the public routes, stops its process, and preserves the printed result. Expected: health and readiness 200, scope allow and deny decisions, unknown field 400, unknown route 404, a local-room send committed as a 201 receipt, its replay, a 409 for a changed body, 404s for another scope and an unknown citation, 400s for an empty body and an unknown field, and the same snapshot and replay after the process is stopped and started again. Run `node scripts/probe-center.mjs --scenarios` to list those sixteen scenarios without starting anything. `pnpm check` includes real PostgreSQL tests. A missing prerequisite blocks, never silently skips.

```flow
Install locked tools | Confirm runtime majors; fetch declared dependencies.
Validate contracts | Regenerate, compare bytes, and run both consumers.
Probe the fixture | Make actual HTTP requests against an isolated center and database.
Stop owned resources | The wrapper removes its cluster, not your evidence.
```

## What success means

A passing probe proves a fixture boundary, not workspace authentication or production authorization. The fixture accepts scope IDs as test input; never expose it as a public access-control service. Use the [foundation page](foundation.md) to interpret the output, [configuration reference](configuration.md) for environment variables, and [troubleshooting](faq.md) for blocked prerequisites.
