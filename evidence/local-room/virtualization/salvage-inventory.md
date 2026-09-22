# Browser virtualization salvage: source inventory and file mapping

Source: `/Users/taylerramsay/.treehouse/agent-team-workspace-50d2db/12/agent-team-workspace`
(slot 12, read-only, untouched). Committed head `4e66370` (branch point `d46c19f`);
18 uncommitted paths on top, verified byte-identical to recovery backup
`data/agora-recovery/20260921-190031` (inventory.json entry for slot 12, snapshot
`copy-4.tar.gz`, same head, same 18-path status list) — no new original bytes to
preserve beyond that backup.

Target: current main `2f5df58`, which already landed a size-bound, reviewed,
**consolidated** re-split of the old modular shell (`AGENTS.md` line 17): separate
`Composer.tsx`/`store.ts`/`projection.ts`/`transport/port.ts`/`fixture/adapter.ts`
were merged into `apps/web/src/components/App.tsx` and `apps/web/src/host/*`. Do
not resurrect those as unwired duplicates.

## Mapping: every file touched by the source copy (committed 17 commits + 18 uncommitted)

| Source file | Status on main 2f5df58 | Disposition |
|---|---|---|
| `apps/web/src/store.ts` | consolidated into `App.tsx` via `@agora/web-framework` hooks | superseded — do not carry over |
| `apps/web/src/transport/port.ts` | consolidated into `@agora/web-framework` / `host/environment.ts` | superseded — do not carry over |
| `apps/web/src/projection.ts` | consolidated into `packages/web-framework/src/projection.ts` | superseded — do not carry over |
| `apps/web/src/components/Composer.tsx` | consolidated inline into `App.tsx` | superseded — do not carry over |
| `apps/web/src/components/App.tsx` | present, different (hook-based) architecture | already present, different shape — target integration point |
| `apps/web/src/components/FixtureControls.tsx` | present | already present — needs review for `Append N messages` control used by reconnect test |
| `apps/web/src/fixture.css` | present | already present — needs new row/timeline styles diffed in |
| `apps/web/src/fixture/room.json` | present | already present, unmodified fixture — reusable as-is |
| `apps/web/src/fixture/adapter.ts` | consolidated into `apps/web/src/host/fixture.ts` | superseded — do not carry over |
| `apps/web/src/fixture/fixtureTransport.ts` | consolidated into `apps/web/src/host/fixture.ts` | superseded — do not carry over |
| `apps/web/src/fixture/corpus.ts` (50k generator, uncommitted) | **integrated, slice 2** — ported verbatim, no dependency | done |
| `apps/web/src/main.tsx` | present, different bootstrap (env/store wiring differs) | already present, different shape |
| `apps/web/src/rows.ts` (uncommitted) | absent | **pending** — pure, adjust `Row` import to `@agora/web-framework` |
| `apps/web/src/components/Timeline.tsx` (uncommitted) | absent (Timeline is now inline paging code in `App.tsx`) | **pending, largest slice** — port virtualization onto the consolidated `App.tsx`, do not reintroduce a separate always-imported `Timeline.tsx` unless it stays the single owner of the row-window concern |
| `apps/web/src/host/geometry.ts` (uncommitted) | **integrated, slice 1** — ported verbatim, no dependency | done |
| `apps/web/src/host/text-sizing.ts` (uncommitted) | **integrated, slice 1** — ported verbatim, no dependency | done |
| `apps/web/src/host/pretext.ts` (uncommitted) | **integrated, slice 1** — `@chenglou/pretext@0.0.9` installed (captain-approved, integrity matches source commit `da7e9ab`); required adding a narrow `TEXT_SIZING_ADAPTER` import-boundary check to `scripts/boundary-policy.ts` restricting Pretext to exactly this file (the source copy's own `pretext-boundary.test.ts`, not yet ported, was going to add the same restriction — implemented directly instead of deferred, since it was required to pass lint on this file) | done |
| `apps/web/src/host/index.ts` | **integrated, slice 1** — additive barrel exports for the above plus `createTextSizer` | done |
| `apps/web/src/rows.ts` (uncommitted) | **integrated, slice 1** — `Row` import adjusted from the superseded local `./projection.ts` to `@agora/web-framework`, otherwise verbatim | done |
| `apps/web/test/timeline.test.tsx` (uncommitted) | absent | **pending, later slice** — imports the old modular layout (`App` with explicit `store`/`port` props); needs adjusting to the current `App` props shape before it can run, not a behavioral redesign |
| `apps/web/test/geometry.ts` (uncommitted, test double) | absent | **pending, later slice** — only needed by `timeline.test.tsx`, not slice 1; direct DOM-global use trips `agora/renderer-footgun` because `isWebTestOrConfig` is deliberately scoped to `*.test.ts(x)` only (see its comment: guards against non-test files placed under `apps/web/test/` as a boundary bypass); needs a reviewed `agora/architecture-exceptions.json` entry or a different shape, not a casual widening of that check |
| `apps/web/test/sizing.test.ts` (uncommitted) | **integrated, slice 1** — `Row` import adjusted to `@agora/web-framework`, otherwise verbatim; all 6 tests (including the live Pretext RTL/CJK cases) pass | done |
| `apps/web/test/app.test.tsx` (both committed+uncommitted diffs) | present, different content | needs reconciling against current main's own `app.test.tsx`, not overwriting |
| `apps/web/test/adapter.test.ts` (committed) | absent (adapter consolidated) | superseded — do not carry over |
| `apps/web/test/projection.test.ts` (committed) | now `packages/web-framework/test/projection.test.ts` | already present under new location — do not duplicate |
| `apps/web/index.html`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` | present, mostly equivalent | diff for the `@vitejs/plugin-react` / CSP additions only if missing |
| `apps/web/package.json` (pretext/react-virtual pins) | `@chenglou/pretext@0.0.9` **integrated, slice 1**; `@tanstack/react-virtual` still absent | pending the same captain-approval path, deferred to the Timeline-integration slice |
| `packages/client-core/test/pretext-boundary.test.ts` (uncommitted) | absent | **pending, later slice** — references `apps/web/src/components/Timeline.tsx` and `apps/web/src/rows.ts` paths; add once those files exist, not before |
| `scripts/boundary-policy.ts` (uncommitted, `TEXT_SIZING_ADAPTER` const) | absent | **pending, later slice** — pairs with the file above |
| `packages/client-core/test/app-architecture.test.ts` (committed, 5-line diff) | needs reconciling against current main's version | check for drift before reapplying |

## Reproduction result: the reported timeline/reconnect hang

Ran `apps/web/test/timeline.test.tsx` (all 7 tests, including the 50,000-message
mount, keyboard/deep-link, focus/selection, resize/font, reconnect-append, and
reduced-motion cases) directly against the source copy's own implementation,
**in isolation**, 3 times: `passed, 7/7, ~11s` every run, fully deterministic. No
hang, no nondeterministic failure.

The previously-reported "blocks 11 min then cascades (5-7/7 fail)" does not
reproduce against the preserved Timeline.tsx/rows.ts/host virtualization code
run correctly (`cd apps/web && npx vitest run test/timeline.test.tsx`, which
picks up `apps/web/vitest.config.ts`'s `web` project: jsdom, `@vitejs/plugin-react`,
and `include: ['test/**/*.test.tsx', 'test/**/*.test.ts']`). Two earlier invocation
attempts in this session that used the **root** `vitest.config.ts` (`--project unit`
or no project filter) failed immediately with "No projects were found" / "No test
files found" — the root config's `unit` project only globs `*.test.ts`, never
`*.test.tsx`, and does not list a `web` project at all; only `apps/web/vitest.config.ts`
does. Running from repo root with `pnpm test` (which has no `--project` filter and
additionally boots a real PostgreSQL cluster via `scripts/with-test-postgres.mjs`
before running every project including the 600s-timeout `contracts` project) is
the likely source of the earlier "blocks 11 minutes" observation — that is
monorepo-wide test run latency, not a defect in the virtualization code itself.

**Conclusion: the known failure was very likely a test-invocation/environment
artifact, not a real defect in the preserved Timeline.tsx.** No code fix was
required or applied to reproduce green. This should be re-verified once the
suite runs as part of `pnpm check`/`pnpm test` in the fully integrated tree,
since a whole-repo run has not yet been attempted with the ported code in place.

## Slice 1: pure sizing/geometry engine (landed)

Files: `apps/web/src/host/{geometry,text-sizing,pretext}.ts`, `apps/web/src/host/index.ts`
(additive), `apps/web/src/rows.ts`, `apps/web/test/sizing.test.ts`, `apps/web/package.json`,
`pnpm-lock.yaml` (`@chenglou/pretext@0.0.9`), and `scripts/boundary-policy.ts`
(`TEXT_SIZING_ADAPTER`). 9 files, 251 lines. No changes to `App.tsx` or any consolidated
main architecture file — this slice is pure, dependency-ordered groundwork with no
behavioral surface yet (nothing in the production render path imports it).

Verified: `apps/web` vitest suite 10/10 pass (existing `app.test.tsx` + `fixture.test.ts`
unaffected, new `sizing.test.ts` 6/6 green including live Pretext RTL/CJK/repeat-cache
assertions); full-repo `tsc` across all three project configs clean; full-repo `eslint .`
clean; the three `pnpm boundaries` suites (boundaries/export-maps/app-architecture) 29/29
pass.

Deliberately not done in this slice: feature-map entry and a docs/site page. This slice has
no observable product behavior yet (nothing wires the sizing engine into the rendered
Timeline), so there is nothing yet to document from a user or reviewer-facing angle; adding
a feature-map entry now would need a documentation page describing behavior that does not
exist until the Timeline-integration slice lands. Revisit both in that slice.

## Slice 2: corpus generator + reconnect-append control (landed)

Files: `apps/web/src/fixture/corpus.ts` (new, verbatim from source), `apps/web/src/host/fixture.ts`
(`largeSnapshot` now builds bodies through `corpusBody`/`corpusTombstone` instead of the placeholder
`Large room message N` text; added `appendLarge(count)` to `FixtureTransport`, mirroring the source's
reconnect-insertion semantics — delivers `count` synthetic events after the current cursor without
clearing the room), `apps/web/src/components/FixtureControls.tsx` (`Append 100 messages` button),
`apps/web/test/fixture.test.ts` (corpus determinism/coverage test, `appendLarge` behavior test). 4 files,
33 diff lines + 29 new lines. No `App.tsx`/Timeline changes; this is fixture-layer groundwork consumed by
the reconnect-anchor scenario once Timeline lands in slice 3.

Verified: `apps/web` vitest suite 12/12 pass (10 prior + 2 new); full-repo `tsc -b --force` clean;
full-repo `eslint .` clean; `pnpm boundaries` 32/32 pass.

## Remaining slices (dependency order)

1. **Landed** — pure sizing/geometry engine (08e6009).
2. **Landed above** — corpus generator + reconnect-append fixture control.
3. Port `Timeline.tsx`'s virtualization onto the current consolidated `App.tsx` (the
   largest, highest-risk slice — must replace the inline `windowRows`/pageSize paging
   without resurrecting a separate always-imported `Timeline.tsx` module, per `AGENTS.md`).
   Add `@tanstack/react-virtual` (same captain-approval path as this slice's dependency add).
   Port `test/timeline.test.tsx` and `test/geometry.ts` alongside, resolving the
   `agora/renderer-footgun` gap noted above properly.
   This is where the feature-map entry and docs/site page belong.
4. `packages/client-core/test/pretext-boundary.test.ts` + the `@tanstack/react-virtual`
   half of `scripts/boundary-policy.ts`'s boundary rule (pairs with slice 3, not before —
   the test references `Timeline.tsx`/`rows.ts` paths that only make full sense once
   Timeline.tsx exists).
