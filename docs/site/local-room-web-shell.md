# Local room web shell

## What it is

A reusable browser room shell under `apps/web`, built as a coding stream independent of the L1-L3 backend service slices. It projects `@agora/client-core` state into a room header, timeline, unread marker and composer, driven through a narrow room transport port. No PostgreSQL persistence, service route, authentication or hosted client exists yet; a development-only fixture adapter stands in for the transport until L3 lands.

## What it does

`App`, `Timeline` and `Composer` depend only on `RoomTransportPort`, a `RoomHeader` and a `Presentation` (all defined outside the fixture module), never on fixture bytes directly. The development entry point (`main.tsx`) loads `src/fixture/room.json` through the wire-validating `fixture/adapter.ts`, then wires `fixture/fixtureTransport.ts` behind that same port. The shell renders human and clearly labelled local-agent message rows, inline citation references, revision and tombstone states, an unread boundary, a keyboard-first composer with a core-owned draft, pending/delivered/failed/retry states, connection/online/offline state, gap/resync/upgrade banners, a bounded Load older messages path, and empty/loading/error/revoked states with an `aria-live` status region.

## Why it exists

Building product code in parallel with the backend room slices needs a real, testable UI surface that does not wait on L3. Routing every component through one narrow transport port, instead of the fixture module, means L4 can later swap in the real service transport without rewriting `App`, `Timeline` or `Composer` or their tests.

## How it works

```flow
Fixture bytes | Validate room.json against the same wire schemas as the sync fixture, never invented shapes.
FixtureTransport | Choose which validated snapshot/event inputs reach @agora/client-core and when, simulating gaps, duplicates, retries and revocation.
Store | Forward every input to synchronize(); hold only the immutable client-core state and a bounded transcript.
Projection | Turn frozen state into row and status view models; no React or DOM here.
RoomTransportPort | The one typed seam React components depend on; FixtureControls alone may reach past it into the concrete transport.
Room shell | Render the timeline, composer and status region; MessageRow re-commits only when its own message reference changes.
```

`FixtureControls` is a separate, clearly labelled development-only component: it is the only code that imports `fixtureTransport.ts` directly, so swapping in a real transport later touches no production room component.

## Implementation status

**In progress: browser shell available; persistence not connected.** The shell runs, renders a validated fixture room and passes its own test suite, but there is no PostgreSQL-backed room, no HTTP or WebSocket transport, and no production conversation schema. `docs/technical-spec.md`'s AC02 room-sharing acceptance criterion remains unqualified. The design team owns final visual presentation; this slice ships a neutral, explicitly design-pending layout only.

## Verification and proof

Inspect the [transport port](repo:apps/web/src/transport/port.ts), [fixture transport](repo:apps/web/src/fixture/fixtureTransport.ts), [projection](repo:apps/web/src/projection.ts), [room shell](repo:apps/web/src/components/App.tsx) and their [projection](repo:apps/web/test/projection.test.ts), [fixture adapter](repo:apps/web/test/adapter.test.ts) and [component](repo:apps/web/test/app.test.tsx) tests, including the update-isolation and keyboard-flow assertions. Retained [red](repo:evidence/local-room/web-shell/isolation/red.log) and [green](repo:evidence/local-room/web-shell/isolation/green.log) receipts cover the row-memoization guard.

Run `pnpm web:test` for unit and component coverage, `pnpm web:dev` to drive the shell in a browser, and `pnpm web:build` to measure the production bundle. `pnpm web:build` measured 417.53 KB (124.74 KB gzip) of JavaScript plus 2.10 KB (0.87 KB gzip) of CSS at this snapshot (see [web-build.log](repo:evidence/local-room/web-shell/web-build.log)): 125.61 KiB combined gzip, well under R18's 350 KiB compressed budget with about 224 KiB of headroom. That budget is stated for the finished S1 room, and this slice is fixture-only and not S1-qualified, so meeting the number here is not claimed as R18 qualification for the finished room; it is reported as what it is, a real measurement under the numeric limit. A real browser pass over a live `pnpm web:dev` server (this session's `claude-in-chrome` driver; the skill names `chrome-devtools-axi`, not present in this environment) exercised every fixture-controls button, the empty/live/gap/resync/offline/upgrade/revoked states, citations, tombstone and edited-revision rows, Load older messages, retry-decision surfacing, draft-clear-on-delivery, roving-tabindex keyboard flow (Tab, Home, ArrowDown, End) and confirmed no horizontal overflow at a real 1672px viewport; this caught and fixed one real defect (see below) that no jsdom test could reach. Screenshots and the full assertion log are under [evidence/docs/agora-local-room-web-shell/browser/](repo:evidence/docs/agora-local-room-web-shell/browser/assertions.md). Two checks from that pass could not be exercised live in this sandboxed display: `resize_window` did not change the real browser's viewport below 1672px (recorded honestly as an environment limitation, not covered up), so the 390x844 phone layout is proven instead by [app.test.tsx](repo:apps/web/test/app.test.tsx)'s phone-viewport component test against the same `App` tree and the same `(max-width: 700px)` query `fixture.css` uses, plus source review; and `prefers-reduced-motion` has no page-level toggle available, so its `fixture.css` guard is verified by source review rather than a live emulated pass. `.agents/skills/verify-agora/SKILL.md` records the literal browser-verification checklist.

`@agora/contracts`'s main entry used to re-export `canonicalJson`/`digestCanonical` from `canonical.ts`, which imports `node:crypto` at module scope; Vite externalizes that for browsers and throws the moment the binding is touched, so the shell's fixture adapter (which only needs `createWireValidator`) crashed before rendering anything. Moving that re-export behind the already-documented `@agora/contracts/canonical` export fixed it for every future browser consumer, not just this one.

Next: [client synchronization](synchronization.md) and [system architecture](architecture.md).
