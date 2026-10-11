# Test lifecycle maintenance: typed-lint project setup in client-state-owner.test.ts

This is test-lifecycle maintenance. It is not a product regression, there is no parent-red, and it does not make
cold startup faster. It moves one-time setup out of the first timed test.

## What failed

Run 38166166472 at `cfa9b98`: the first test of `packages/client-core/test/client-state-owner.test.ts` took
5370ms against the unchanged 5000ms limit. The other five tests took 98 to 440ms. The same test took 4028ms in
passing run 38162236546 at `22497c0` (`ci-pass-22497c0.txt`, `ci-fail-cfa9b98.txt`). Same code under test.

## Two numbers, measured separately

| Quantity | Idle machine | 2x CPU oversubscribed | CI runner |
|---|---|---|---|
| Cold setup, first typed `lintText` of a fresh engine | about 800ms, same at `origin/main` and this head | not measured alone | not measured alone |
| First policy test before the change (setup plus the policy cases) | about 900ms | 2149 to 2296ms | 4028 and 5370ms |
| First policy test after the change (policy cases only) | 195 to 205ms | 586 to 640ms | pending CI |

The setup cost itself is unchanged by this commit. The hook now pays it, and the hook runs under vitest's default
10s hook timeout, which this change does not touch. Raw timings: `loaded-2x-before.txt`, `loaded-2x-after.txt`.

## Why the 5000ms limit still means something

The limit on each test is meant to catch a rule that has become slow to evaluate a case. It was never a budget
for building the TypeScript project, which no test in the file asserts on. Neither the limit nor the hook limit
changed. I found no public cold-execution budget on this path. The only lint wall-time budget is U20's
`lint_ms` perf probe in `agora/project.json`, which runs `scripts/project-perf.mjs` over the whole lint command and
is not touched. If a cold-execution budget for typed lint is wanted, it belongs there, and this change does not
satisfy or evade it.

## The warm-up does not make the assertions stale

`lintText` receives each fixture's text and path fresh on every call. The warm-up lints an unrelated empty module.
Counterfactual, done on the committed head and restored byte for byte (`git checkout`): with the warm-up in place,
turning `flag` in `scripts/client-owner-policy.ts` into a no-op made four of six tests fail (the rejection cases),
and restoring it gave six of six passing. The accept cases and reject cases also share one engine and one process,
so a cached verdict would break one of them.
