# First product implementation slice: local-room L2 persistence

## Selection

Local-room L1 is already on main. The first unmerged, independently complete product implementation slice is **local-room L2 persistence** from `fm/agora-local-room-persistence`.

Not selected as the first slice:

- L3 runtime, L5 agent-core: stacked on L2; not independently landable.
- Web shell / web-framework: L4 path; need L3 transport and/or architecture owners.
- App-architecture-boundaries: independently based on main tip, but not the next local-room product slice.
- App-architecture-docs, browser virtualization plan, react preservation: documentation/evidence/preservation only.
- CI P0c-C / P0a / P0b: separate CI stream.

Full inventory and ordered plan: [inventory.md](inventory.md).

## Source (preserved, unchanged)

| Field | Value |
| --- | --- |
| Branch | `fm/agora-local-room-persistence` |
| Tip | `55269a5103656a63cc6f246c00ebb1efa6785866` |
| Design checkpoint | `ff52775` |
| Code | `d2e213153ce0ac8b0ec7309f68ac2e1509273875` |
| Evidence | `55269a5` |
| Original parent | `95f35277fbfc821be148029521222f0de617d7de` (L1 on main) |

## Integration result

| Field | Value |
| --- | --- |
| Task branch | `fm/agora-integration-reconciliation` |
| Integration parent (local main) | `c04f5606df49eb7976ad5cf244911c73f77dd1fb` |
| Rebased code head | `bc27cff7731082982245fa54944fd4ddea6f49cb` |
| Method | cherry-pick of the three source commits; source branch not modified |
| Conflicts | `.agents/skills/verify-agora/SKILL.md` description; `docs/site/cli.md` probe/wrapper rows; `docs/site/atlas.json` / `progress.md` revision. Resolved by keeping main P0c wrapper text and adding L2 probe/skill predicates. |
| Fast-forward onto main | yes (`main` is ancestor of task HEAD; task is 0 commits behind main) |

## Verification on rebased head

Toolchain: Node from `/Users/taylerramsay/.local/node/bin` (v24.16.0), pnpm 10.34.1. GitHub token env vars unset so Vitest/rolldown loads the darwin-arm64 binding.

| Command | Result |
| --- | --- |
| Focused pg: `with-test-postgres` + vitest pg `apps/center/test/local-room.pg.test.ts` + `packages/storage/test/local-room.pg.test.ts` | **16 passed** ([l2-focused-pg.log](l2-focused-pg.log)) |
| `pnpm check` (lint, typecheck, docs, contracts drift, full test) | **pass**, 146 tests ([pnpm-check.log](pnpm-check.log)) |
| `pnpm boundaries` | **8 passed** |
| `pnpm contracts:conform -- --json` | **pass**, 127 vectors, 0 disagreements |
| `node scripts/probe-center.mjs --scenarios` | **16 scenarios** |
| `with-test-postgres` + `probe-center.mjs --json` | **outcome pass**, exit 0 |

Original source red/green receipts remain under `evidence/local-room/persistence/` (recorded at source parent/head). Outcome metadata notes both source and rebased revisions.

## Remaining prerequisites before later slices

1. Guarded fast-forward of this branch into local main (firstmate).
2. Then L3 runtime from `fm/agora-local-room-runtime` (rebase onto post-L2 main).
3. Parallel CI stream (P0c-C, etc.) does not block L2 product files.
4. Architecture boundaries / web framework before or with L4 shell.
5. L5 agent-core after L2 minimum; full L5 after L4 browser path.

## Exact next merge order

1. **This branch** `fm/agora-integration-reconciliation` (L2) -> local main
2. `fm/agora-local-room-runtime` (L3)
3. `fm/agora-app-architecture-docs` then/or `fm/agora-app-architecture-boundaries`
4. `fm/agora-web-framework-client-host`
5. `fm/agora-local-room-web-shell` (L4)
6. `fm/agora-local-room-agent-core` (L5 core)
7. CI candidates as a parallel stream when ready

## Diff hygiene

- No force push, no remote, no PR.
- No source branch rewrite.
- No second implementation stream started.
- Working tree product changes are L2 only plus this reconciliation evidence and SHA rebinding.
