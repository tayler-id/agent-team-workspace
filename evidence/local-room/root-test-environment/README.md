# Root test environment fix: apps/web browser-room tests now run under jsdom in `pnpm test`

`red.log` (parent `b9a9efb`, the exact commit an independent review flagged) reproduces the reported
gap: `pnpm exec vitest run --project unit --project web apps/web/test/live.test.ts` fails 11 of 18
tests, two directly with `ReferenceError: window is not defined` and the other nine with downstream
assertion mismatches, because the root `vitest.config.ts` "unit" project ran `apps/web/test/*.test.ts`
under a plain Node environment instead of the jsdom + React environment `apps/web/vitest.config.ts`
(and `pnpm web:test`) already use. `apps/web/src/host/live.ts`'s online/offline wiring was behaving
exactly as designed; only the root project's environment was wrong.

`green.log` (head `6f01c8a`) shows the same 18 tests all passing, unchanged, after the only fix: root
`vitest.config.ts` excludes `apps/web/test/**` from the Node "unit" project and adds
`apps/web/vitest.config.ts` directly as a project instead. No test file changed — `test-patch.diff` is
empty of behavior changes, confirming this is a routing/environment fix, not a test rewrite.

Before applying the fix, the jsdom/root-config hypothesis was falsified with a focused countertest:
a throwaway copy of the root "unit" project with only `environment: 'jsdom'` added (no other change)
turned all 11 failures green, ruling out other candidate causes (e.g. a React-plugin gap, a transitive
import issue) before committing to the routing change actually applied.

Full-suite confirmation (`pnpm test`, `pnpm boundaries`, `pnpm lint`, `pnpm typecheck`,
`pnpm docs:validate`) at head `6f01c8a`: 259 passed / 2 failed, both the pre-existing
`blocked_prerequisite` (missing Python lane prerequisites on this host) failures in
`packages/verification/test/project.test.ts`, unrelated to this fix and already documented. `apps/web`
now contributes all 42 of its tests (including the two `.test.tsx` files the root project never ran at
all before this fix) to the root gate, matching `pnpm web:test` exactly.
