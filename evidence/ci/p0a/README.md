# CI P0a - design-negative sandbox source closure

## Parent / head

- Parent: see `parent.sha` (untouched main before the fix).
- Head: commit that lands this directory on `fm/agora-ci-guardrails`.

## Red before green

1. On parent, `node scripts/test-design-checks.mjs` exits nonzero.
2. Cause is baseline setup, not a design-document mutation: `index.md: missing link apps/center/src/app.ts` because the sandbox copied docs/scripts/evidence/packages/contracts but not `apps`.
3. Fix copies `apps` into the disposable fixture and adds `omitted-application-source`, which deletes `apps/center/src/app.ts` after copy and requires the same missing-link diagnostic.
4. Every content mutation still asserts `before !== after`; omit asserts the path existed then was removed.

## Green inventory

See `mutations.txt` and `green.log`. Expect 24 cases: baseline accept, omit reject, model-neutral accept, and the prior named rejections.

## Out of scope

`pnpm check` still fails after contracts on the known Rolldown native-binding startup error. That is a P0b doctor concern, not a product assertion failure from this slice. Standalone negatives remain outside the `pnpm check` aggregate until P1.
