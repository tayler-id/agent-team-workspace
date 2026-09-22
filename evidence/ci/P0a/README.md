# CI P0a - design-negative sandbox source closure

## Parent / head

- Parent: `parent.sha` (untouched main, `b9934c3`, before this fix).
- Head: this commit. `docs/site/atlas.json` and this file's `code_head` are bound to its exact sha in a separate follow-up docs commit, not by amending this one.

## Red before green

1. On the parent, `node scripts/test-design-checks.mjs` exits nonzero: `index.md: missing link apps/center/src/app.ts`.
2. Cause is fixture setup, not a design-document mutation: the disposable sandbox copies `docs`, `scripts`, `evidence`, `packages` and `contracts`, but decision rows D01-D86 now also cite `apps/center/src/app.ts`, `agora/architecture-exceptions.json` and `eslint.config.js`, none of which the sandbox carried.
3. The fix copies `apps` and `agora` into the fixture and adds `eslint.config.js` to the individually copied root files, then adds `omitted-application-source`, which deletes `apps/center/src/app.ts` after copy and asserts the gate rejects it for that exact missing-link reason.
4. Every content mutation still asserts `before !== after`; the new omit step asserts the path existed before removal and is gone after.

## Why this is bigger than the preserved branch's original fix

`fm/agora-ci-guardrails` at `6797716` already fixed the `apps` gap while main was at an earlier head. Main has since landed the application-architecture boundaries work (D84 import-ownership, D86 exception registry), whose decision rows cite `agora/architecture-exceptions.json` and `eslint.config.js`. Reproducing the original fix alone still failed red with a different missing-link message; the source-closure fix was widened to match the decision rows actually present at this head instead of reproducing the older commit byte for byte. See `outcome.json` for the exact grep that found every non-`docs`/`scripts`/`evidence`/`packages`/`contracts`/`apps`/`.agents` path decisions.tsv cites.

## Guard-negative check

The fix was reverted in a WIP git stash, the suite re-run to confirm the same red failure, then the stash was restored and diffed byte-for-byte identical before being dropped. See `outcome.json.guard_negative`.

## Green inventory

`green.log` shows 24 cases: baseline accept, `omitted-application-source` reject, the model-neutral accept, and the 21 prior named rejections.

## pnpm check

`pnpm-check.log` shows a clean exit 0 at this host and time: lint, typecheck, `docs:check` (31/31 site tests), `contracts:check` and `pnpm test` (throwaway PostgreSQL 18, 26 files / 163 tests) all passed. `GITHUB_TOKEN`/`GH_TOKEN` were unset for the run. This is a point-in-time observation, not a claim that P0a wires design negatives into that aggregate; `test-design-checks.mjs` still runs as its own command.

## Out of scope

No hosted CI, browser/React lint, PostgreSQL socket or toolchain doctor change. `fm/agora-ci-guardrails` is preserved unaltered; only `scripts/test-design-checks.mjs` was transplanted from it.
