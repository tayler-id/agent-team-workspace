# Browser timeline virtualization: planning checkpoint

task: agora-browser-pretext-virtualization
branch: fm/agora-browser-pretext-virtualization
base: 60bcd797d3f7817651142d88ced49509ea040447 (corrected browser-shell candidate, fast-forwarded from local main 95f35277fbfc821be148029521222f0de617d7de)
recorded_at: 2026-09-21T04:30:00Z
state: paused on firstmate inbox 001 (2026-09-21T04:06:08Z). No product source changed. This file is disposable research and a benchmark design, not an implementation claim.

## Why this checkpoint exists

Firstmate message 001 says the captain now requires the architecture foundation first (feature-owned folders, reserved discovered entrypoints, timeline-card definitions, one-writer Client hooks and commands, a typed Host boundary, framework-to-feature import direction), and that this task must not modify product source or establish a competing folder, state or host pattern until that foundation exists. Dependency and source inspection continued read-only; the design below records what was verified and what the implementation will need, so the work resumes without repeating the research.

## Branch history proof

- `git merge-base --is-ancestor 95f3527 60bcd79` exit 0: local `main` is a strict ancestor of the candidate.
- `git merge --ff-only 60bcd79` succeeded; the branch head is exactly `60bcd79`. The thirteen commits between them are the web-shell slice only; no preservation-branch history was copied.
- Working tree clean at this checkpoint (`git status --short` empty before this file was added).

## Dependency verification (read-only, nothing executed from the package)

| Item | Finding |
| --- | --- |
| Package | `@chenglou/pretext` 0.0.9, published 2026-09-07, registry `latest` |
| Registry integrity | `sha512-vInlpC//3vjRfWTs78k2BBIq/0bUdpjIp8TIn9fXe0NvnChhTQZfjioVzERQQbkQvCVpPpw7PDOrTWMHpq27VA==`, shasum `e158b60285cce891097b76126b7851a84011ac9b` |
| Tarball check | `npm pack --ignore-scripts` into the scratchpad; local SHA-1 equals the registry shasum |
| License | MIT in `package.json` and `LICENSE` (Copyright 2026 Pretext contributors); GitHub reports `MIT` for `chenglou/pretext` |
| Repository | `https://github.com/chenglou/pretext`, default branch `main`, not archived, pushed 2026-09-21T01:04:28Z |
| Tag `v0.0.9` | `8460bf940c50d82be90a396fb0ea2c4e7a2dc6f3` |
| `main` at inspection | `2e5e2bdaee398784b9cf27b24ca96df2e85396b8` (committed 2026-09-16T11:47:02Z), the revision the research report cites |
| Tarball vs tag | `src/layout.ts`, `src/measurement.ts`, `LICENSE`, `README.md` SHA-256 identical between the tarball and raw tag bytes |
| Install hooks | none (`preinstall`/`install`/`postinstall`/`prepare` absent); `prepack` and `start` exist but never run on consumer install |
| Runtime dependencies | none declared |
| Unsafe patterns in `dist/` | zero hits for `eval(`, `new Function`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `fetch(`, `XMLHttpRequest`, `WebSocket` |
| DOM use in `dist/` | Canvas 2D or `OffscreenCanvas` for `measureText`; one hidden `span` appended to `document.body` and measured with `getBoundingClientRect` inside the conditional emoji calibration path (`dist/measurement.js:103-112`); `Intl.Segmenter` required |
| README caveats that bind the design | `system-ui` and `-apple-system` are unsafe for `layout()` accuracy on macOS, so the message body font must be a named family; page `lang` can change generic-family resolution; `white-space` normal or pre-wrap only; letter-spacing is passed to `prepare()` as pixels; emoji beside punctuation and zero-width spaces may wrap differently |
| Audit | `pnpm audit --json` with both packages pinned: 0 vulnerabilities across 347 dependencies |

The pin was added with `pnpm --filter @agora/web add --save-exact @chenglou/pretext@0.0.9 @tanstack/react-virtual@3.14.13`, the lockfile entry carried the integrity above, and both files were then restored byte-for-byte to `60bcd79` because message 001 forbids product-source changes. Re-run that one command to resume.

### Virtualization primitive

| Candidate | Version | License | Unpacked | Note |
| --- | --- | --- | --- | --- |
| `@tanstack/react-virtual` + `@tanstack/virtual-core` | 3.14.13 + 3.17.11 | MIT | 61 KB + 438 KB | Headless: owns scroll offset, range, positioning and `scrollToIndex`; sizes come from `estimateSize` and `measureElement`. Official Pretext integration page keeps the same separation. Selected. |
| `virtua` | 0.52.1 | MIT | 2.19 MB | Component-level virtualizer; owns more of the DOM than the brief allows. Not selected. |

Behavior that matters for jsdom tests, read from `virtual-core/dist/esm/index.js`: the scroll rect comes from `offsetWidth`/`offsetHeight` (`getRect`, line 14) and stays static without `ResizeObserver`; `measureElement` falls back to the element's `offsetHeight` when no observer entry exists (line 151); `scrollTo` is optional-chained (line 158), so tests must define `offsetHeight` getters and a `scrollTo` that sets `scrollTop` and dispatches `scroll`.

### Client core cost at scale

`synchronize()` with a 50,000-message snapshot took 56 ms and one appended event 3 ms on this machine (Node 24.16.0); the resulting message array is frozen. No core change is needed for the fixture size.

## Design to implement once the foundation lands

Everything below stays inside the renderer. Nothing enters `contracts/`, `packages/client-core`, `packages/domain`, `apps/center` or any future native contract.

| File | Responsibility |
| --- | --- |
| `apps/web/src/sizing/port.ts` | The one renderer-owned text-sizing interface: `TextGeometry` (canvas font string, line-height px, width px, letter-spacing, white-space, lang, fonts version) and `TextSizer { key, height(text) }`; a deterministic fallback sizer for runtimes without Canvas or `Intl.Segmenter` |
| `apps/web/src/sizing/pretext.ts` | The only module allowed to import `@chenglou/pretext`; `prepare`/`layout` behind a bounded cache keyed by geometry key plus text; support detection |
| `apps/web/src/sizing/rows.ts` | Pure routing: text-only rows get `chrome + sum(paragraph heights) + gaps`; rows with code fences, tombstones, citations, or any non-text segment are `measured` and never reach Pretext; chrome is calibrated from measured text rows, not assumed |
| `apps/web/src/timeline/anchor.ts` | Pure anchor math: capture first visible key and offset, restore after rows, width or font changes; append never moves the viewport, prepend compensates |
| `apps/web/src/components/Timeline.tsx` | `useVirtualizer` with `getItemKey`, `estimateSize` from the row sizer, `measureElement` for every mounted row, bounded overscan, `rangeExtractor` that pins the focused row and any rows holding the current text selection so focus and selection are never unmounted; roving tabindex over all rows; `aria-setsize`/`aria-posinset`; `dir="auto"`; `scrollToIndex` with `behavior: 'auto'` under `prefers-reduced-motion: reduce` |
| `apps/web/src/fixture/corpus.ts` | Seeded 50,000-message generator: short and long prose, Markdown-shaped text, code fences, emoji, Latin, Cyrillic, Greek, CJK, Devanagari, Arabic and Hebrew (RTL), mixed dynamic rows; replaces the body generator inside `largeSnapshot` |
| `scripts/boundary-policy.ts` | One added line: `@chenglou/pretext` is forbidden everywhere except `apps/web/src/sizing/pretext.ts`; `packages/client-core` already rejects every non-`@agora` import |
| `apps/web/vite.config.ts` | Build-only `transformIndexHtml` that injects a strict CSP meta (`default-src 'self'`, `object-src 'none'`, `base-uri 'none'`); dev keeps none because `@vitejs/plugin-react` injects an inline refresh preamble |

Removed with the change: the client-side 50-row `window()` paging and the Load older messages button, because the virtualizer bounds the DOM and the fixture snapshot already holds every row. Server-side paging of older content is L4 transport work and stays out of scope.

Foundation-dependent placement, to be decided by the architecture foundation, not by this task: which feature-owned folder holds `sizing/` and `timeline/`, whether the row sizer is a timeline-card definition, and whether geometry observation (width, font readiness) becomes a Host boundary capability. The pure modules above are written so they move without edits; the component wiring is the part that will follow the foundation's hook and command pattern.

Size plan: about 700 meaningful lines across about 12 files under `apps/web`, against R11's 1,000 lines and 25 files.

## Test plan (red first)

First behavioral test, `apps/web/test/timeline.test.tsx`, imports only symbols the parent already exports (`App`, `FixtureControls`, `load`, `createFixtureTransport`, `createStore`, `room.json`) so the recorder's red is a behavior failure, not a missing module. With `transport.loadLargeRoom(50000)`:

- `Home` from the newest row focuses message 1 (parent focuses 49,951, the first row of its 50-row window).
- `End` focuses message 50,000; a focus request for message 25,000 focuses it.
- mounted `article` count stays at or below visible rows plus twice the overscan plus pinned rows.
- every mounted article carries `aria-posinset` and `aria-setsize="50000"`.

Negative tests in `apps/web/test/sizing.test.ts` and the existing boundary suite: different font or width never reuses a cached height; a code-fence, tombstone or citation row is never handed to the text sizer (spy sizer records zero calls); `<img onerror>` and `javascript:` bodies render as text with no `img` or `a` element; overscan and pinned rows cannot exceed the bound; a width or fonts-version change invalidates every cached size; `@chenglou/pretext` imported from `packages/client-core/src/model.ts` or `apps/web/src/components/App.tsx` is rejected and from `apps/web/src/sizing/pretext.ts` is allowed, with the rule removed turning the assertion red.

Behavior tests with jsdom geometry doubles: resize keeps the same anchor message at the same offset; a fonts-version bump re-estimates without moving the anchor; a focused row scrolled out of range stays mounted and focused; a text selection inside a row survives scrolling away; `replayNext()` while scrolled mid-list leaves `scrollTop` unchanged; reduced motion makes `scrollTo` receive `behavior: 'auto'`.

## Benchmark design (preserved)

Driver: `chrome-devtools-axi`, present at `/Users/taylerramsay/.local/bin/chrome-devtools-axi` (`open`, `eval`, `resize`, `emulate`, `press`, `scroll`, `screenshot`, `perf-start`, `perf-stop`, `heap`). Target: `pnpm web:build && pnpm web:preview` at `http://127.0.0.1:4175`, the production build with the strict CSP meta, plus `pnpm web:dev` for interactive checks. Viewports: 390x844 and 1440x900 via `resize`; `emulate` for `prefers-reduced-motion: reduce`.

Arms, same fixture, same machine, five interleaved batches each:

1. Parent renderer at `60bcd79`: `Load large room (400)` extended by Load older to 1,000 rows (its only reachable large state; all 50,000 is not reachable without 1,000 clicks and is recorded as such).
2. New renderer, fallback sizer (`?sizing=fallback`): virtualizer with average-character estimates, measured corrections only.
3. New renderer, Pretext sizer: the candidate path.

Metrics, all read through `eval` and named by their tool:

- cold layout: `performance.now()` from `Load large room (50000)` click to the first frame with the newest row mounted;
- steady scrolling: `requestAnimationFrame` deltas over 10 s of `scroll` steps, reported as p50/p95 frame interval against R23's 20 ms p95;
- mounted nodes: `document.querySelectorAll('.row').length` at rest and during the scroll;
- estimate drift: for the Pretext arm, `measured - estimate` per mounted text row, reported as a distribution, which is the honest measure of whether Pretext inputs match rendered geometry;
- scroll corrections: count and total px of `scrollTop` adjustments during a jump to message 25,000 and during 100 appended events;
- memory: `performance.memory.usedJSHeapSize` before and after a ten-minute append/scroll cycle, named as Chrome's legacy non-isolated counter; `performance.measureUserAgentSpecificMemory` only if the preview server adds COOP/COEP headers, otherwise recorded as unavailable.

Accessibility: `lighthouse` accessibility category on the loaded room, keyboard script (Tab, Home, ArrowDown, End, citation button) and VoiceOver notes recorded by hand. Upstream performance claims are not adopted; only these measurements are reported.

## Not done at this checkpoint

No dependency added to the committed tree, no source change, no test written, no red/green receipt, no browser run, no feature-map, atlas, runbook or skill edit. Cleanup: `git worktree list` and `$TMPDIR` carry no `agora-` entries; the scratchpad holds only the unpacked tarball used for the digest checks.
