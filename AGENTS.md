# Agora contributor guide

This repository holds the design baseline, official project-local pstack skills, and the executable test-first foundation started by `agora-s1-bootstrap-repository` (U01a.B01). No product feature exists yet.

- Read `docs/technical-spec.md` for authoritative behavior and boundaries.
- Use `docs/implementation-plan.md` for delivery units and `docs/task-breakdown.md` for dependency-aware tasks. Only S1 belongs in the first-release queue.
- Read `docs/research-basis.md` for evidence and `docs/decisions.tsv` for the append-only decision trail.
- R21 owns language-neutral contracts and import boundaries. R22 owns mandatory test-first, guard-negative, feature-map and foundation gates. No product feature or write-enabled agent precedes the executable foundation; each task closes on its own proof, not its unfinished milestone.
- Use the official skills under `.agents/skills/`. R22 overrides the bundled TDD skill's optional-test fallback and model-specific lane assumptions. Preserve all installer bytes and metadata; do not run setup-pstack implicitly.
- Run `node scripts/verify-design.mjs` and `node scripts/test-design-checks.mjs` for authoritative design checks. Run the unchanged pstack plan checker as an informational format check. `docs/validation/design-validation.md` records commands and limits; design validation is not runtime foundation readiness.
- Wire contracts: `contracts/schemas/*.schema.json` and `contracts/openapi.json` are the only authored wire sources; `pnpm contracts:generate` regenerates the TypeScript and Swift consumers, `pnpm contracts:check` rejects drift and out-of-subset keywords, `pnpm contracts:conform` runs the golden vectors through both consumers. `docs/runbooks/development.md` has the subset and layout.
- Code gates: `pnpm check` runs lint, typecheck, docs, contract drift and tests. `pnpm boundaries` exercises import/export and no-platform compile negatives. `pnpm test` boots a throwaway PostgreSQL 18 cluster; the pg tests block rather than skip without one. `docs/runbooks/development.md` explains commands, package boundaries, the PostgreSQL test path and migrations.
- `docs/design-handoff/` is the designer-facing packet (entry `README.md`); `node scripts/verify-design-handoff.mjs` checks its sections, links, diagrams, stage labels, private paths and size. It proposes presentation only; product behavior stays in `docs/technical-spec.md`.
- Every behavior change lands with its test, a feature-map entry in `agora/feature-map.json`, and `red.log`/`green.log` from `node scripts/record-red-green.mjs` under `evidence/<unit>/<task>/`. `.agents/skills/verify-agora/SKILL.md` holds the literal Doctor, Launch, Drive, Evidence and Cleanup commands.

- The local-development room lands in five gated slices (`evidence/local-room/preservation/size-split-proposal.md` on the preservation branch). Each slice keeps its contracts, feature-map entry, events, dispatch port and adapters as separate files so they stay independently movable; L1 is `contracts/schemas/local-room.schema.json`, `packages/domain/src/local-room/port.ts`, the center route and `docs/site/local-room.md`; L2 adds migration `0001_local_room.sql`, `packages/storage/src/local-room.ts` and the snapshot route, with `apps/center/src/main.ts` the only composition of the PostgreSQL adapter. Receipts live under `evidence/local-room/<slice>/`.

- Implementation is incomplete without its documentation page and explanatory visual in the same change. Follow `docs/site/authoring.md` for both audience tracks, atlas ownership and independent committed-code/evidence review; `pnpm docs:build` enforces the site contract.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
