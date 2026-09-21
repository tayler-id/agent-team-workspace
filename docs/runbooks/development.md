# Development

Runs from TypeScript source under Node 24 type stripping. There is no build step yet.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install --frozen-lockfile` | Installs the locked dependency set for all workspace packages |
| `pnpm typecheck` | Strict workspace compilation, then a separate ES2024-only client-core compile with no Node or DOM globals |
| `pnpm lint` | Strict typed lint plus import and transitive public-type boundaries |
| `pnpm boundaries` | Lane 8: forbidden import forms, public SDK/DOM leaks, private-path exports and no-platform compile negatives |
| `pnpm docs:check` | markdownlint over authored Markdown, then the semantic design gate |
| `pnpm contracts:generate` | Bundles the schema families with the OpenAPI operations and regenerates the TypeScript and Swift consumers |
| `pnpm contracts:check` | Regenerates into a clean directory and fails on any byte of drift or any schema keyword outside the tested subset |
| `pnpm contracts:conform` | Runs the golden vectors through the TypeScript and Swift consumers and prints the joint report |
| `pnpm client:replay -- --json --swift` | Public lane-7 fixture driver, comparing literal replay snapshots in the core and independent generated-value Swift consumer |
| `pnpm test` | Unit and PostgreSQL tests against a throwaway cluster |
| `pnpm test:unit` | Unit tests only, no database |
| `pnpm test:pg` | PostgreSQL tests only, throwaway cluster |
| `pnpm migrate` | Applies pending migrations as the owner in `AGORA_MIGRATION_DATABASE_URL` and prints a JSON report |
| `pnpm check` | All of the above gates in sequence |

The documentation tool's TOML parser is pinned to `smol-toml` 1.7.1 through a narrow workspace override. Its upstream 1.7.0 pin hangs on a malformed trailing comment (CVE-2026-85730); a bounded public-CLI regression test and full dependency audit cover this repair.

## Packages

| Package | Root | Owns | Must not import |
| --- | --- | --- | --- |
| `@agora/contracts` | `contracts` | JSON Schema families, OpenAPI operations, generated consumers, canonical JSON, the pinned Ajv wire validator | Anything but schema tooling; never domain, storage, Hono, React or transport code |
| `@agora/domain` | `packages/domain` | Pure decisions, branded identifiers | Hono, Drizzle, pg, React |
| `@agora/client-core` | `packages/client-core` | Immutable normalized snapshots, synchronization, drafts and command decisions | Frameworks, transports, domain/server/storage internals |
| `@agora/storage` | `packages/storage` | Migrations, explicit SQL, the `Database` handle | Hono, React; it never exports pg types |
| `@agora/center` | `apps/center` | Hono routes and composition | Raw SQL |

Import boundaries are enforced by package export maps and the `agora/import-boundary` and `agora/public-types` ESLint rules. The first checks value/type-only imports, dynamic imports, import types, re-exports, CommonJS import syntax, owning-package paths and ambient DOM references. It rejects unprovable dynamic targets. The second follows public export types through aliases, generics, inheritance, callbacks and nested fields, so a private SDK type cannot hide behind a domain port. The exact contract-schema wildcard is the only permitted wildcard export; private code paths remain closed.

The core imports only its own utilities and generated types through `@agora/contracts/values`. Domain canonicalization uses the narrow `@agora/contracts/canonical` export, not the validator facade. The center has an empty export map: its Hono factory is private composition, while its HTTP fixture remains public. Tests of the factory live inside that package. Generated TypeScript receives boundary checks without rewriting installer/generator bytes; its index-signature formatting is exempt only from the conflicting style rule.

## Contracts

`contracts/schemas/*.schema.json` (one JSON Schema 2020-12 file per wire family, every component a `$defs` entry) and `contracts/openapi.json` (OpenAPI 3.1.1 operations only) are the authoritative wire sources. There is no handwritten TypeScript, Zod or Swift wire type; the center takes its report types from the generated consumer. `contracts/tools/generate.mjs` rewrites the family `$ref`s into `#/components/schemas/Name`, rejects any keyword outside the subset both generators represent faithfully (closed objects, string and integer enums, anchored ASCII patterns, bounded integers, arrays with items; no `oneOf`, `null`, `number`, `const`, `$defs` inside a component or shorthand regex classes), validates every family with Ajv, then writes `contracts/generated/openapi.bundled.json`, `contracts/generated/typescript/openapi.d.ts` (openapi-typescript 7.13.0), the Swift files under `contracts/swift/Sources/AgoraContracts/Generated/` (swift-openapi-generator 1.13.1, run through SwiftPM from `contracts/swift/Package.swift`) and `contracts/generated/manifest.json` with source and output digests. Generated files are regenerated, never edited; `pnpm check` runs the drift check.

`contracts/fixtures/vectors.json` holds the golden vectors: exact wire bytes per component with the expected acceptance, canonical RFC 8785 bytes, SHA-256 digest and, where present, a detached Ed25519 signature from a fixture-only key. `contracts/src/conform-cli.ts` runs them through the TypeScript consumer (Ajv plus `canonicalJson`) and the Swift consumer (`agora-contracts-conform`: generated types, a runtime validator over the bundled document, CryptoKit) and fails on any disagreement. A missing Swift toolchain exits 3 (unavailable) and is never a pass. The first Swift build fetches the pinned packages recorded in `contracts/swift/Package.resolved` and takes a few minutes; `contracts/swift/.build/` is a cache, not evidence.

### Synchronization fixture

`sync.schema.json` supplies reusable R07 `StreamCursor` and `CommandReceipt` values. `fixture-sync.schema.json` supplies only non-production snapshot and closed message-revision, tombstone and run-card payloads. All use generated consumers and the same validation/conformance commands. No HTTP operation references these fixture types. Separate event components keep each payload closed without widening the generator subset. A later fixture adapter translates them into neutral core inputs; the core must not export fixture types or know fixture kind names.

`created_seq` identifies the first visible message position and stays fixed across edits. `last_seen_room_seq` covers the whole room stream, but unread counts only visible positions created after it. Edits, tombstones and run updates do not create unread positions; delivery never advances reading state. Cross-record consistency and replay are core transitions, not JSON Schema validation. These fixtures establish no production conversation schema or authorization.

### Local room family

`local-room.schema.json` (`agora.local-room/v1`) holds the conversation contracts of the loopback-only local-development room: `LocalRoomScope`, `RoomAuthor` (`human` or `local_agent`), `RecordCitation`, `RoomMessageBody` (1 to 4096 scalars), `SendRoomMessageCommand`, `CommandIdentity` (`command_id` plus the canonical `request_digest`), `RoomMessage`, `RoomMessageCreatedEvent`, `RoomSnapshot` and `RoomCommandReceipt`. It reuses `StreamCursor` and `CommandReceipt` from `sync.schema.json` and `ErrorReport` from `errors.schema.json`. `POST /api/v1/local-room/messages` is its one authored operation. The domain port and the unsupported adapter live in `packages/domain/src/local-room/port.ts`; `node scripts/probe-center.mjs --scenarios` prints the probe inventory without starting anything. `docs/site/local-room.md` is the feature page.

### Framework-independent client core

`@agora/client-core` exports `initialState` and `synchronize(state, input)`. Inputs are internal, transport-neutral projections using generated UUID, revision, digest and receipt values through the types-only `@agora/contracts/values` export. They are not a second wire schema. `scripts/client-fixture.ts` validates the fixture wire values before translating them; neither fixture names nor generated fixture types enter the core API.

A transition returns a deeply immutable state plus explicit requests and acknowledgements. Adapters execute requests; the core opens no connection and authorizes nothing. Snapshots replace the relevant stream, retain newer known record revisions, and replay strictly after the accepted cursor. Events dedupe by stream/sequence, buffer at most 1,000 out-of-order entries, and acknowledge only the applied contiguous prefix. Replay-floor loss or overflow requests a fresh snapshot. Unknown state changes retain the projection and cursor, set synchronization mode to `upgrade`, and block further events until a supported snapshot arrives. Other streams remain independent.

Reading is explicit and monotone. Drafts remain `unsent` across snapshot/route changes; `clear` for logout or revocation erases all private state. Browser session-storage integration is not implemented here. A receipt settles its known pending command but never advances a stream cursor. Retry decisions keep the original command ID and request digest, honor offline/rate waits, stop on denial, and request refreshed state after stale revisions. These are retries of idempotent Agora commands, never direct provider calls or a billable-call retry policy. No privileged offline queue is created.

`contracts/fixtures/replay.json` contains test vectors, not production API payload definitions. `pnpm client:replay -- --json --swift` drives six literal ordered/gap/duplicate/unknown/stale-revision snapshots independently through TypeScript and Swift. Remove `--swift` for the pure Node driver; absence of Swift with that flag exits 3, not pass. `--file` selects a reviewed local vector file. `packages/client-core/test/guards.test.ts` disables guards only in disposable source copies and requires their public assertions to fail. Lane 8 is `pnpm boundaries`, with native JSON at `.scratch/boundaries.json`; foundation readiness remains a separate, unqualified gate. The [client synchronization feature page](../features/client-synchronization.md) explains the behavior and includes a state visual.

## PostgreSQL test path

CI P0c A isolates socket allocation in `scripts/postgres-socket.ts`; it is not yet used by the wrapper below. Run `pnpm exec vitest run --project unit packages/storage/test/postgres-socket.test.ts` for its allocation baseline. The wrapper's deep-path startup bug and lifecycle integration remain dependent slice B, followed by integrated guard proof C. No schema, role or authentication policy changes here.

`scripts/with-test-postgres.mjs` runs `initdb`, starts a cluster that listens only on a Unix socket in a private temp directory with trust authentication, creates the non-superuser schema owner `agora_owner`, the non-owner login role `agora_app`, the guard-negative role `agora_bypass` and the database `agora_test` (the bootstrap superuser `postgres` is exported as `AGORA_TEST_SUPERUSER_DATABASE_URL` and used only by the test that removes and restores the `agora_app` prerequisite; that test renames a cluster-level role, so point the exported URLs at a disposable server only), runs one command with `AGORA_TEST_DATABASE_URL` (app), `AGORA_TEST_OWNER_DATABASE_URL` (owner), `AGORA_DATABASE_URL` (app) and `AGORA_MIGRATION_DATABASE_URL` (owner) set, then stops and deletes the cluster. Trust authentication is acceptable only because no TCP port is opened, the socket directory is private to the user, and the cluster lives for one command.

Application code connects as `agora_app`. That role owns nothing, and the fixture tables force row-level security, so the policies bind every role without `BYPASSRLS`, the owner included. Migrations run as the owner. The test cluster also creates `agora_bypass`, a `BYPASSRLS` member of `agora_app`, used only by the guard-negative test. The pg test project fails with `blocked prerequisite` when the URLs are missing; it never skips.

## Migrations

Reviewed SQL lives in `packages/storage/drizzle/NNNN_name.sql` and is listed in `packages/storage/drizzle/meta/_journal.json`. The Drizzle migrator records applied entries in `drizzle.__drizzle_migrations`, so a second run applies nothing. `pnpm migrate` prints `applied`, `total`, a catalog-based `schema_digest` covering relations, columns, constraints, indexes, row security, policies and grants, and the server version. Exit codes: 0 pass, 2 blocked prerequisite, 64 usage error, 70 infrastructure failure.

Roles are cluster-level and are an operator prerequisite, never created by a migration. Before the first `pnpm migrate`, create the non-owner service role and the schema owner, for example `CREATE ROLE agora_app LOGIN NOSUPERUSER NOBYPASSRLS` and `CREATE ROLE agora_owner LOGIN NOSUPERUSER CREATEDB`, then create the database owned by `agora_owner`. Migrations grant table access to `agora_app`; a missing role blocks the migration with exit 2 and a message naming it. Point `AGORA_DATABASE_URL` at `agora_app` (or a login member of it) and `AGORA_MIGRATION_DATABASE_URL` at the owner. Policies apply to every role; membership governs only the grants.

The foundation fixture schema `foundation_fixture` is a non-production namespace. Nothing in it can authorize a production operation.

## Center

`apps/center/src/main.ts` serves on `127.0.0.1:$PORT` and needs `AGORA_DATABASE_URL`, which must belong to the non-owner service role. Public routes:

| Route | Behavior |
| --- | --- |
| `GET /api/v1/health` | Liveness, never touches a dependency |
| `GET /api/v1/health/ready` | 200 when the database answers `select 1`, else 503 |
| `POST /api/v1/fixture/policy/decisions` | Validates `FixturePolicyCommand` through the shared wire validator (Ajv 2020-12, no coercion, defaults or removal), answers the pure scope decision |
| `POST /api/v1/local-room/messages` | Validates `SendRoomMessageCommand`, converts it to domain values and dispatches to the composed `LocalRoomPort`; in local-room L1 the only adapter is `unsupportedLocalRoom`, so a valid command answers 404 `unavailable_capability` with a detail naming the slice |

Unknown routes and malformed commands answer JSON with a stable `reason_code` and a `correlation_id`.
