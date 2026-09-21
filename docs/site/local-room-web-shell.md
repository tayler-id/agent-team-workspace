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

Run `pnpm web:test` for unit and component coverage, `pnpm web:dev` to drive the shell in a browser, and `pnpm web:build` to measure the production bundle. `.agents/skills/verify-agora/SKILL.md` records the literal browser-verification checklist.

Next: [client synchronization](synchronization.md) and [system architecture](architecture.md).
