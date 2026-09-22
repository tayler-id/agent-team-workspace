# agora-isolation-integrate: source-path mapping

Merges the preserved candidate `2fd3aad0fcd9ccb21fed819f1a25923c3df19158`
(`fm/agora-s1-isolate-development`, U01b.B01 project verification controls) onto
current `main` (`2a13746`) on branch `fm/agora-isolation-integrate`. The candidate
tip is the original recorded slot3 and stays authoritative preserved input; this
task never rewrites it.

Merge commits: `3628ba9` (merge), `5a0584d` (regenerate contract consumers),
`794941d` (superseded relocation attempt, see below), `6aadbbd` (final boundary
and test-isolation fix).

## Every path the candidate branch touched vs main (`git diff --name-status main...fm/agora-s1-isolate-development`)

### New source (integrated, live)

| Path | Outcome |
| --- | --- |
| `agora/project.json` | Integrated unchanged. |
| `apps/center/src/verification.mjs` | Integrated, then fixed: main's newer `apps/*/src/**/*.{mjs,cjs}` import-boundary lint (`eslint.config.js`, added after the candidate diverged) rejects `node:fs`/`node:path` inside the `apps/center` owner. The file's own header says it is non-production fixture composition the center never mounts, so the fix keeps it in place but drops the fs/path import: `start(state, objects)` now takes an injected `{read, write}` object-journal port that `scripts/project-host.mjs` (already an fs-owning caller) supplies. A prior attempt relocated the file to `packages/verification/fixture/` instead; that broke module resolution because `hono`/`@hono/node-server` are declared only in `apps/center`'s own `package.json`, not linked into the unowned `packages/verification` tree, so it was reverted in `6aadbbd`. |
| `docs/site/checking-a-project.md` | Integrated unchanged (new page, auto-merged). |
| `docs/site/project-controls.md` | Integrated unchanged (new page, auto-merged). |
| `packages/verification/fixture/project.py` | Integrated unchanged (auto-merged). |
| `packages/verification/fixture/requirements.txt` | Integrated unchanged (auto-merged). |
| `packages/verification/test/project.test.ts` | Integrated unchanged (auto-merged). |
| `scripts/project-checks.mjs` | Integrated unchanged (auto-merged). |
| `scripts/project-host.mjs` | Integrated, then extended with the `objects` read/write port passed into `verification.mjs`'s `start()`. |
| `scripts/project.mjs` | Integrated unchanged (auto-merged). |

### Modified paths (conflicts resolved additively; nothing from either side dropped)

| Path | Resolution |
| --- | --- |
| `.agents/skills/verify-agora/SKILL.md` | Kept every main section (L1-L3 local-room, CI P0a/P0b/P0c) and wove in every candidate section (project-controls Doctor/Launch/Drive/Evidence/Cleanup steps) as parallel subsections, none removed. |
| `AGENTS.md` | Kept main's expanded code-gates bullet and added the candidate's new "Project controls" bullet ahead of it. |
| `agora/feature-map.json` | Kept every main feature entry and added the candidate's `project-controls` entry. |
| `contracts/fixtures/vectors.json` | Auto-merged clean. |
| `contracts/generated/manifest.json`, `contracts/generated/openapi.bundled.json`, `contracts/generated/typescript/openapi.d.ts`, `contracts/swift/Sources/AgoraContracts/Generated/Types+Components+Schemas.swift` | Regenerated from the merged `contracts/schemas/cli.schema.json` via `pnpm contracts:generate`; `pnpm contracts:check` reports `drift: []`. |
| `contracts/schemas/cli.schema.json` | Auto-merged clean; carries both main's own additions and the candidate's `CliInstance`/`ProjectFixtureConfig`. |
| `contracts/swift/Sources/AgoraContractsConform/main.swift` | Auto-merged clean. |
| `docs/site/atlas.json` | Kept every main feature entry (`postgres-socket`, `ci-design-negative`, `ci-toolchain`, `local-room-agent-core`, ...) and added the candidate's `project-controls` entry; took main's newer revision/date (rebound after the merge commit, see below). |
| `docs/site/cli.md` | Auto-merged clean. |
| `docs/site/progress.md` | Generated output of `atlas.json` via `pnpm docs:atlas`; regenerated to match, carrying both feature lists. |
| `docs/site/site.json` | Kept every main nav entry and inventory row, added the candidate's `checking-a-project` nav page, `project-controls` nav page, and the `scripts/project*.mjs`/`apps/center/src/verification.mjs` inventory rows. |
| `docs/site/test/corpus.test.ts` | Combined both page-count assertions; corpus is 32 pages (main's 30 + candidate's 2 new pages), both `project-controls.html`/`checking-a-project.html` and `ci.html` content assertions kept. |
| `docs/site/verification.md` | Combined both descriptions of the current CLI surface. |
| `eslint.config.js` | Kept main's full rule set and added the candidate's `scripts/project*.mjs`/`apps/center/src/verification.mjs` entry to the JS-build-tool exemption list. |
| `package.json` | Auto-merged clean (adds the `agora` script alongside main's other scripts). |

### Evidence (preserved untouched; original recorded slot3)

Every path under `evidence/U01b/agora-s1-isolate-development/**` (test-patch diff,
red/green logs, three live drive runs, performance run, security-live, guard
negatives, ownership-cleanup, outcome.json, size-counts.json, README.md, and the
rest) is the candidate's own frozen record. None of these files were opened for
edit by this task; they carry forward exactly as authored on
`fm/agora-s1-isolate-development`.

## New evidence this task produced

`evidence/U01b/agora-isolation-integrate/merge/` holds a fresh live Drive of the
project verification controls at the merged head (`6aadbbd`): `a`/`b`/`python`
start+verify+stop, and the `lanes` task-lane replay, all `outcome: pass`. This
proves the candidate's controls still work correctly after integration, not just
that the merge applied cleanly.

## Gates run at the merged head (`6aadbbd`)

All from the repository root, with `python3 -m venv .scratch/python && .scratch/python/bin/pip install -r packages/verification/fixture/requirements.txt` and that venv's `bin` prepended to `PATH` (per the SKILL.md Doctor step):

- `pnpm lint` — pass, 0 problems.
- `pnpm typecheck` — pass.
- `pnpm docs:check` (markdownlint, verify-design, naming-guard, design-handoff, docs:validate, docs:test) — pass; docs corpus is 32 pages.
- `pnpm contracts:check` — pass, empty drift.
- `pnpm contracts:conform -- --json` — 201/201 vectors pass on both TypeScript and Swift consumers.
- `pnpm boundaries` — 33/33 tests pass.
- `pnpm test` (`node scripts/with-test-postgres.mjs vitest run`) — 223/223 tests, 36/36 files pass, confirmed stable across two consecutive runs after the `vitest.config.ts` unit-project serialization fix (see below).
- `pnpm check` (the above aggregate) — pass end to end.

### Test-isolation fix

`packages/verification/test/project.test.ts` (four of its five cases) failed
intermittently under the first `pnpm test` runs with `stale_instance` /
`infrastructure_failure`. Its CLI computes a live "config" freshness digest by
hashing every tracked+untracked file under `apps/`, `packages/`, `scripts/`,
`contracts/`, `agora/` between a `start` and a later `verify`/`lanes` call.
Vitest's `unit` project ran test files in parallel by default, and
`packages/client-core/test/app-architecture.test.ts`'s owner-stub setup/cleanup
(which creates and removes files under `apps/web/src/{framework,client,host}/index.ts`)
raced with that window and flipped the digest. Fixed in `vitest.config.ts` by
setting `fileParallelism: false` on the `unit` project, serializing unit test
files against each other; two consecutive full `pnpm test` runs after the fix
both pass 223/223.

## No later milestone work

Only U01b.B01 (project verification controls) is integrated. `scripts/project.mjs`'s
own guard (`unit_unavailable`) and the SKILL.md Drive text already state that
U01b's later lanes (B02/B03) remain unavailable; this task added nothing beyond
what the candidate branch already implemented.
