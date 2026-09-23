# Local room web shell

## What it is

A reusable React room shell under `apps/web`, built over `@agora/web-framework` and `@agora/client-core`. The framework owns the one-writer Client, named hooks and a typed `EnvironmentPort`. The application owns the browser Host adapter, development fixture transport and shell components. No PostgreSQL persistence, service route, authentication or hosted client exists yet.

## What it does

`App`, `Timeline` and `Composer` read immutable Client projections through named hooks and issue only named commands (`useSetDraft`, `useRoomCommands`). They never receive arbitrary event dispatch, mutable store internals or a factory for a second authoritative room store. Ephemeral presentation state (composer busy, deferred focus target, delayed announcement) stays local, using named portable framework hooks (`useDeferredFocus`, `useDelayedAnnouncement`) instead of raw React effects. Browser capabilities reach `App` and `Composer` only through `EnvironmentPort`: transport subscribe/send, focus scheduling, deferred timers, media-query subscription, clock and identifier access. `Timeline` virtualizes instead of paging (see [timeline virtualization](local-room-timeline-virtualization.md)); its raw effects and DOM globals live in the local `apps/web/src/framework/` owner, which — unlike the portable `@agora/web-framework` package — gets the same Host DOM exemption as `apps/web/src/host/environment.ts`.

## Why it exists

Product UI work must not wait on L3 transport or invent a second timeline inside component state. One live Client plus a narrow environment port lets the fixture transport stand in today and a real transport replace it later without rewriting shell components or their tests. The framework package stays free of `apps/*`, domain, storage and provider SDKs so boundaries stay mechanical.

## How it works

```flow
Host composition | main.tsx creates one RoomClient, one FixtureTransport and one browser EnvironmentPort, then injects them through AgoraProvider.
EnvironmentPort | Named capabilities only: transport, scheduleFocus, defer, media query, now, createId, digestText. No fetch, WebSocket, storage or raw window handle.
RoomClient | Forwards every input to client-core synchronize(); holds only frozen state and a bounded transcript.
Named hooks | useClientSelector, useSetDraft, useRoomCommands, useTransportState, useMediaQuery, useStaleSafeBusy, useDeferredFocus, useDelayedAnnouncement own subscribe/unsubscribe, stale completion rejection, timers and cleanup.
Room shell | Renders header, a virtualized timeline and composer/status; MessageRow re-commits only when its own message reference changes.
FixtureControls | Development-only; the sole importer of the concrete fixture transport beyond Host wiring.
```

## Implementation status

**In progress: browser shell and web-framework available; persistence not connected.** The shell runs against a validated development fixture, preserves keyboard, focus, composition Enter, phone/desktop viewport and update-isolation behavior, and passes framework one-writer and environment-boundary tests. There is no PostgreSQL-backed room, no real-server connection and no production conversation schema. Design-handoff results under `docs/design-handoff/results/` are the approved starting direction for implementation, and this shell does not implement them yet. [Live room UI](local-room.md#live-room-ui) lists the mismatches. `docs/technical-spec.md` AC02 remains unqualified.

## Verification and proof

Inspect the [framework barrel](repo:packages/web-framework/src/index.ts), [EnvironmentPort](repo:packages/web-framework/src/environment.ts), [RoomClient and hooks](repo:packages/web-framework/src/client.ts), [Host adapter](repo:apps/web/src/host/environment.ts), [fixture transport](repo:apps/web/src/host/fixture.ts) and [room shell](repo:apps/web/src/components/App.tsx). Behavioral coverage lives in [framework client tests](repo:packages/web-framework/test/client.test.ts), [framework boundary tests](repo:packages/web-framework/test/boundaries.test.ts), [fixture tests](repo:apps/web/test/fixture.test.ts) and [shell tests](repo:apps/web/test/app.test.tsx).

Run `pnpm web:test` for unit and component coverage, `pnpm web:dev` for the live fixture, and `pnpm web:build` for the production bundle (last measured 125.85 KB gzip against R18's 350 KiB budget; not S1-qualified, so this is a real measurement under the limit, not an R18 claim). This slice landed in three dependency-ordered units, each with its own red/green and size evidence under [evidence/local-room/web-framework-foundation/](repo:evidence/local-room/web-framework-foundation/outcome.json), [evidence/local-room/web-framework-host/](repo:evidence/local-room/web-framework-host/outcome.json) and [evidence/local-room/web-framework-shell/](repo:evidence/local-room/web-framework-shell/outcome.json). `.agents/skills/verify-agora/SKILL.md` records the public browser driver checklist.

Next: [client synchronization](synchronization.md) and [system architecture](architecture.md).
