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
| `apps/web/src/components/App.tsx` | **integrated, slice 3** — inline `Timeline`/`MessageRow`/`pageSize`/`rowDomId`/`kindLabel` and the `windowRows`/`useFocusRequestEffect`/`useScheduleFocus` paging removed; renders the new `Timeline` component and no longer needs the `notice`/"Loaded N older messages" state | done |
| `apps/web/src/components/FixtureControls.tsx` | present | already present — needs review for `Append N messages` control used by reconnect test |
| `apps/web/src/fixture.css` | present | already present — needs new row/timeline styles diffed in |
| `apps/web/src/fixture/room.json` | present | already present, unmodified fixture — reusable as-is |
| `apps/web/src/fixture/adapter.ts` | consolidated into `apps/web/src/host/fixture.ts` | superseded — do not carry over |
| `apps/web/src/fixture/fixtureTransport.ts` | consolidated into `apps/web/src/host/fixture.ts` | superseded — do not carry over |
| `apps/web/src/fixture/corpus.ts` (50k generator, uncommitted) | **integrated, slice 2** — ported verbatim, no dependency | done |
| `apps/web/src/main.tsx` | present, different bootstrap (env/store wiring differs) | already present, different shape |
| `apps/web/src/components/Timeline.tsx` (uncommitted) | **integrated, slice 3** — rewritten as a pure render component (`MessageRow` moved in from `App.tsx`); all raw effects/DOM globals moved to the new `apps/web/src/framework/useTimelineVirtualizer.ts` (see below), per `scripts/renderer-policy.ts`'s Host/framework-only exemption, which the source branch predates | done, adapted |
| `apps/web/src/framework/useTimelineVirtualizer.ts` (new, no source equivalent) | **integrated, slice 3** — the reserved-but-empty `apps/web/src/framework/` owner (`AGENTS.md` line 17, `apps/web/src/reserved-owners.ts`), populated for the first time; owns the `@tanstack/react-virtual` instance, scroll/list refs, geometry effects, anchor-preserving remeasure, selection tracking and keyboard navigation that the source kept inline in `Timeline.tsx` — required because current main's `agora/renderer-footgun` rule (landed after the source branch, `evidence/U20/agora-s1-lint-application-architecture/`) forbids raw `useEffect`/`useLayoutEffect` and DOM globals outside `apps/web/src/host` and `apps/web/src/framework` | done, new |
| `apps/web/src/host/geometry.ts` (uncommitted) | **integrated, slice 1** — ported verbatim, no dependency | done |
| `apps/web/src/host/text-sizing.ts` (uncommitted) | **integrated, slice 1** — ported verbatim, no dependency | done |
| `apps/web/src/host/pretext.ts` (uncommitted) | **integrated, slice 1** — `@chenglou/pretext@0.0.9` installed (captain-approved, integrity matches source commit `da7e9ab`); required adding a narrow `TEXT_SIZING_ADAPTER` import-boundary check to `scripts/boundary-policy.ts` restricting Pretext to exactly this file (the source copy's own `pretext-boundary.test.ts`, not yet ported, was going to add the same restriction — implemented directly instead of deferred, since it was required to pass lint on this file) | done |
| `apps/web/src/host/index.ts` | **integrated, slice 1** — additive barrel exports for the above plus `createTextSizer` | done |
| `apps/web/src/rows.ts` (uncommitted) | **integrated, slice 1** — `Row` import adjusted from the superseded local `./projection.ts` to `@agora/web-framework`, otherwise verbatim | done |
| `apps/web/test/timeline.test.tsx` (uncommitted) | absent | **still pending, later slice** — imports the old modular layout (`App` with explicit `store`/`port` props) and asserts `useVirtualizer` is importable directly from `Timeline.tsx` (see below); needs adjusting to the current `App` props shape and the `useTimelineVirtualizer` split, not a verbatim port. Slice 3 ported only its mount-count/keyboard-roving assertions into `app.test.tsx`; the full resize/font/emoji/multilingual/RTL/reduced-motion/reconnect-anchor matrix from this file is not yet exercised outside the source copy's own isolated repro (see reproduction result below) |
| `apps/web/test/geometry.ts` (uncommitted, test double) | **integrated, slice 3** — ported verbatim; needed immediately by `app.test.tsx` (jsdom returns 0 for every layout property, so the virtualizer mounts nothing without it), not deferrable to `timeline.test.tsx`'s slice as originally planned. `agora/renderer-footgun`'s file-scoped exemption (`isWebTestOrConfig`) widened by exact filename only (`TEST_GEOMETRY_DOUBLE` in `scripts/boundary-policy.ts`), matching the `TEXT_SIZING_ADAPTER` single-file pattern, not a directory-wide loosening; a second, previously-unexercised gap in the same function (relative imports from `apps/web` code restricted to `WEB_SRC`, with no test-file exemption) also had to be narrowed the same way so `app.test.tsx` could import this sibling test file | done, adapted |
| `apps/web/test/sizing.test.ts` (uncommitted) | **integrated, slice 1** — `Row` import adjusted to `@agora/web-framework`, otherwise verbatim; all 6 tests (including the live Pretext RTL/CJK cases) pass | done |
| `apps/web/test/app.test.tsx` (both committed+uncommitted diffs) | present, different content | **integrated, slice 3** — reconciled against current main's own file (not overwritten): the `showing N of M` / `Load older messages` paging assertions replaced with virtualized equivalents (`N total`, mounted-count bound); `installGeometry()` wired into `beforeEach` |
| `apps/web/test/adapter.test.ts` (committed) | absent (adapter consolidated) | superseded — do not carry over |
| `apps/web/test/projection.test.ts` (committed) | now `packages/web-framework/test/projection.test.ts` | already present under new location — do not duplicate |
| `apps/web/index.html`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` | present, mostly equivalent | diff for the `@vitejs/plugin-react` / CSP additions only if missing |
| `apps/web/package.json` (pretext/react-virtual pins) | **integrated** — `@chenglou/pretext@0.0.9` (slice 1), `@tanstack/react-virtual@3.14.13` (slice 3, integrity byte-identical to source commit `da7e9ab`) | done |
| `packages/client-core/test/pretext-boundary.test.ts` (uncommitted) | absent | **still pending, later slice** — the source version asserts `useVirtualizer` is importable directly in `Timeline.tsx`, which is now false: slice 3's `VIRTUALIZER_ADAPTER` restricts `@tanstack/react-virtual` to `apps/web/src/framework/useTimelineVirtualizer.ts` only, the same single-file pattern as `TEXT_SIZING_ADAPTER`. This file needs a rewrite reflecting that, not a port; the real `eslint .`/`pnpm boundaries` runs already exercise both restrictions today (see Verified line below), same as slice 1 shipped `TEXT_SIZING_ADAPTER` without its own dedicated unit test |
| `scripts/boundary-policy.ts` (uncommitted, `TEXT_SIZING_ADAPTER` const) | **integrated, slice 1 and 3** — `TEXT_SIZING_ADAPTER` (slice 1); `VIRTUALIZER_ADAPTER`, `TEST_GEOMETRY_DOUBLE` and the `isWebTestOrConfig` relative-import exemption (slice 3, none present in the source, which predates this whole boundary module) | done, adapted |
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

Verified: `apps/web` unit-project test files (`npx vitest run apps/web`) 10/10 pass (8 prior + 2 new);
full-repo `tsc -b --force` clean; full-repo `eslint .` clean; `pnpm boundaries` 32/32 pass.

Correction (bounded review, `data/agora-ci-postgres-fixture-proof-review/report.md`): the prior
"12/12 (10 prior + 2 new)" figure double-counted; verified by checking out each commit and running
`npx vitest run apps/web --reporter=verbose` in isolation.

Also fixed in this pass: a real, reproducing (not flaky) test-isolation race between
`packages/client-core/test/app-architecture.test.ts`'s two tests that mutate the committed
`agora/architecture-exceptions.json` in place and `packages/client-core/test/fixture.test.ts`'s
`pnpm -s boundaries` nested-subprocess test, which re-runs `app-architecture.test.ts` concurrently
with the parent run. Both processes agree on the same absolute registry path, so
`app-architecture.test.ts` now wraps its two live-registry mutations in a cross-process
`mkdir`-based lock (`withRegistryLock`) scoped to `agora/architecture-exceptions.json.lock`,
serializing the parent and nested runs instead of racing a shared real file. A new regression test
proves the lock serializes two concurrent writers and leaves committed bytes on disk.

## Slice 3: Timeline virtualization integration (landed)

Files: `apps/web/src/components/Timeline.tsx` (rewritten), `apps/web/src/framework/{index,useTimelineVirtualizer}.ts` (new),
`apps/web/src/components/App.tsx` (paging removed), `apps/web/src/fixture.css` (absolute-positioned row diff),
`apps/web/test/{app.test.tsx,geometry.ts}`, `apps/web/package.json`/`pnpm-lock.yaml` (`@tanstack/react-virtual@3.14.13`),
`scripts/boundary-policy.ts` (`VIRTUALIZER_ADAPTER`, `TEST_GEOMETRY_DOUBLE`, test-file relative-import exemption),
`docs/site/{local-room-timeline-virtualization,local-room-web-shell}.md`, `docs/site/site.json`, `docs/site/atlas.json`,
`docs/site/test/corpus.test.ts` (page-count literal), `agora/feature-map.json`. 12 source+test files (the docs/feature-map
files are additive documentation, not counted against the slice's source/test bound), ~380 meaningful source+test lines.

The port is not verbatim: current main landed `agora/renderer-footgun` (`scripts/renderer-policy.ts`, the
`evidence/U20/agora-s1-lint-application-architecture/` work) after the source branch was written. That rule forbids raw
`useEffect`/`useLayoutEffect` and DOM globals (`document`, `location`, `Element`, …) outside `apps/web/src/host` and
`apps/web/src/framework`. The source's `Timeline.tsx` used both freely. Rather than weaken the rule, this slice populated
the previously-empty, reserved `apps/web/src/framework/` owner (`AGENTS.md` line 17) with `useTimelineVirtualizer.ts`,
which owns the `@tanstack/react-virtual` instance, scroll/list refs, all effects and DOM reads; `Timeline.tsx` itself is now
a pure render function with zero raw effects or DOM globals, matching how `App.tsx` already delegates everything to
`@agora/web-framework` hooks. `@tanstack/react-virtual` is restricted to that one file (`VIRTUALIZER_ADAPTER`), the same
single-file pattern slice 1 used for Pretext (`TEXT_SIZING_ADAPTER`). Two more architecture gaps, neither present in the
source (which predates `scripts/boundary-policy.ts` entirely), had to be closed the same narrow way: `apps/web/test/geometry.ts`
(a jsdom layout double with no production behavior) needed an exact-filename exemption from `renderer-footgun` and from a
previously-unexercised "apps/web relative imports stay inside `WEB_SRC`" check that had no carve-out for test files
importing sibling test files.

`App.tsx`'s prior fixed-size paging (`windowRows`, `pageSize = 50`, the `Load older messages` button and its
`Loaded N older messages` notice) is removed entirely, not kept alongside virtualization — the source's own PR intent was
to replace it, and `docs/technical-spec.md`'s 50,000-message requirement cannot be met by a paging window regardless.
`apps/web/test/app.test.tsx`'s second test (previously asserting `showing 50 of 400` / the load-older button) now asserts
the virtualized equivalent (`400 total`, mounted row count bounded well under 400) instead; its citation/deep-link and
reconnect assertions are unchanged.

Verified: `pnpm -s lint`, `pnpm -s typecheck` (full 3-project build) and `pnpm -s boundaries` (33/33) all clean;
`apps/web` vitest 12/12 (10 prior + this slice's `app.test.tsx` rewrite); `pnpm -s docs:check` 31/31 (added the new
feature page, corrected the hardcoded 28→29 page-count literal in `docs/site/test/corpus.test.ts`); `pnpm --filter
@agora/web build` succeeds, 152.55 KB gzip. Live-browser evidence (`pnpm --filter @agora/web build` served via
`vite --port`, driven with claude-in-chrome, closed after use): loading the 400-message fixture room mounts 23 `li.row`
elements against `data-total="400"` with `data-sizing="pretext"` (the real Canvas 2D engine, not the character-count
fallback), no console errors on load. This confirms mount-bounded virtualization and the live Pretext engine path outside
jsdom; it does not cover the full resize/font/emoji/multilingual/RTL/reduced-motion/reconnect-anchor matrix, which
`apps/web/test/timeline.test.tsx` (source copy, still unported — see mapping above) exercises in isolation only.

Deliberately not done in this slice: porting `apps/web/test/timeline.test.tsx` itself (needs adjusting to the current
`App` props shape, not a verbatim port) and `packages/client-core/test/pretext-boundary.test.ts` (the source version
asserts the opposite of this slice's design — that `useVirtualizer` is importable directly in `Timeline.tsx` — and needs
a rewrite, not a port).

## Remaining slices (dependency order)

1. **Landed** — pure sizing/geometry engine (08e6009).
2. **Landed** — corpus generator + reconnect-append fixture control (43115d0, 4ab04ad).
3. **Landed above** — Timeline virtualization integration onto the consolidated `App.tsx`.
4. Port the remainder of `apps/web/test/timeline.test.tsx`'s behavior matrix (resize/font/emoji/multilingual/RTL/
   reduced-motion/reconnect-anchor with the real geometry double, beyond the mount-count/keyboard-roving subset slice 3
   already ported into `app.test.tsx`), and rewrite `packages/client-core/test/pretext-boundary.test.ts` to assert the
   current design (`@tanstack/react-virtual` allowed only in `apps/web/src/framework/useTimelineVirtualizer.ts`, denied
   everywhere else including `Timeline.tsx` itself) instead of porting its now-inverted source assertion.
