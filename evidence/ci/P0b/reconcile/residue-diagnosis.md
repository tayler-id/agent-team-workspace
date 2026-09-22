# Working-tree residue diagnosis at relaunch

At relaunch the worktree carried an uncommitted `agora/architecture-exceptions.json` with two exception rows (`apps/web/src/features/room/index.tsx` / `@agora/storage` and `packages/client-core/src/model.ts` / `window`, both `rationale: "temporary bridge"`, `owner: "web-team"`). This byte-for-byte matches the `exceptionRow` fixture and its `window` variant written by the `'a committed exception row lets exactly one import through the live import-boundary rule'` test in `packages/client-core/test/app-architecture.test.ts:228-250`, which writes those two rows into the real registry and restores the original bytes in a `finally` block. The residue was left by a prior interrupted process, not a defect in the transplanted commits or in the test's cleanup path.

## Verification (Node 24.21.0, exact `.node-version` pin, `GH_TOKEN`/`GITHUB_TOKEN`/`FIRSTMATE_GH_TOKEN` unset)

- Restored `agora/architecture-exceptions.json` to the committed `HEAD` bytes (`{"schema_version":"agora.architecture-exceptions/v1","exceptions":[]}`).
- `node scripts/ci-doctor.mjs` — pass (node, pnpm, rolldown).
- `pnpm exec vitest run packages/client-core/test/app-architecture.test.ts -t 'a committed exception row lets exactly one import through the live import-boundary rule'` — pass; `git status` confirmed clean immediately after, proving the test's own cleanup path restores the registry without help.
- `pnpm check` (lint, typecheck, docs, contracts, full test suite incl. PostgreSQL) — pass, 163/163 tests.
- `pnpm boundaries` — pass, 21/21.
- `node --test scripts/test/ci-doctor.test.ts` — pass, 5/5 (positive and guard-negative doctor checks).
- `git status` clean at head `dfd13613dd0f1b905e47f2c4fdfa64817c1ebd24` after every command above.

No test process rewrites `agora/architecture-exceptions.json` outside its own try/finally, and none left it dirty across this full run.
