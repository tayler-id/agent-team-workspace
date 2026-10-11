# CI cold typed-lint timeout in client-state-owner.test.ts

Failed run 38166166472 at `cfa9b98`: the first test of `packages/client-core/test/client-state-owner.test.ts` took
5370ms against the unchanged 5000ms limit. The other five tests in the file took 98 to 440ms. The same test took
4028ms in the passing run 38162236546 at `22497c0`. Same code under test, so the spread is runner load, not a change.

Cause: the first `engine.lintText` of a file builds the apps/web TypeScript project. Measured on one idle machine,
that first call costs about 800ms at both `origin/main` and this head (second call 4ms), so this branch adds no
startup cost. The cost scales with load: under 2x CPU oversubscription the first test took 2150 to 2296ms
(`loaded-2x-before.txt`). On the CI runner it is 4 to 5.4s, which leaves a 0 to 20% margin.

Fix: a `beforeAll` lints one empty file against the same component path, so project startup is paid in the hook and
the test limit measures the rule. The 5000ms limit, every assertion, the rule and the policy are unchanged.
After the fix the same test took 195 to 205ms idle and 586 to 640ms under the same 2x load
(`loaded-2x-after.txt`).

The rejection assertions run as before. This is not a qualification claim. The CI slowness itself cannot be
reproduced locally, so there is no parent-red for it; the before/after timings above are the proof.
