# Local room web shell

## What it is

A reusable React room shell under `apps/web`, built over `@agora/web-framework` and `@agora/client-core`. The framework owns the one-writer Client, named hooks and a typed `EnvironmentPort`. The application owns the browser Host adapter, development fixture transport and shell components. No PostgreSQL persistence, service route, authentication or hosted client exists yet.

## What it does

`App`, `Timeline` and `Composer` read immutable Client projections through named hooks and issue only named commands (`useSetDraft`, `useRoomCommands`). They never receive arbitrary event dispatch, mutable store internals or a factory for a second authoritative room store. Ephemeral presentation state (focus target, open window limit, composer busy, notices) stays local. Browser capabilities reach the shell only through `EnvironmentPort`: transport subscribe/send, focus scheduling, media-query subscription, clock and identifier access. The Host adapter in `apps/web/src/host/environment.ts` is the only module that may touch `window`, `document` or `crypto` for those named needs.

## Why it exists

Product UI work must not wait on L3 transport or invent a second timeline inside React Query or component state. One live Client plus a narrow environment port lets the fixture transport stand in today and a real transport replace it later without rewriting shell components or their tests. The framework package stays free of `apps/*`, domain, storage and provider SDKs so boundaries stay mechanical.

## How it works

```flow
Host composition | main.tsx creates one RoomClient, one FixtureTransport and one browser EnvironmentPort, then injects them through AgoraProvider.
EnvironmentPort | Named capabilities only: transport, scheduleFocus, media query, now, createId, digestText. No fetch, WebSocket, storage or raw window handle.
RoomClient | Forwards every input to client-core synchronize(); holds only frozen state and a bounded transcript.
Named hooks | useClientSelector, useSetDraft, useRoomCommands, useTransportState, useMediaQuery, useStaleSafeBusy own subscribe/unsubscribe, stale completion rejection and cleanup.
Room shell | Renders header, timeline, composer and status; MessageRow re-commits only when its own message reference changes.
FixtureControls | Development-only; the sole importer of the concrete fixture transport beyond Host wiring.
```

## Implementation status

**In progress: browser shell and web-framework available; persistence not connected.** The shell runs against a validated development fixture, preserves keyboard, focus, composition Enter, 390x844 / 1440x900, reduced-motion and safe-rendering behavior, and passes framework one-writer and environment-boundary tests. There is no PostgreSQL-backed room, no real-server connection and no production conversation schema. Design-handoff results under `docs/design-handoff/results/` are provisional presentation guidance only; this slice does not treat them as final visual acceptance. `docs/technical-spec.md` AC02 remains unqualified.

## Verification and proof

Inspect the [framework barrel](repo:packages/web-framework/src/index.ts), [EnvironmentPort](repo:packages/web-framework/src/environment.ts), [RoomClient](repo:packages/web-framework/src/client.ts), [Host adapter](repo:apps/web/src/host/environment.ts), [fixture transport](repo:apps/web/src/host/fixture.ts) and [room shell](repo:apps/web/src/components/App.tsx). Behavioral coverage lives in [framework client tests](repo:packages/web-framework/test/client.test.ts), [framework boundary tests](repo:packages/web-framework/test/boundaries.test.ts), [fixture tests](repo:apps/web/test/fixture.test.ts) and [shell tests](repo:apps/web/test/app.test.tsx).

Run `pnpm web:test` for unit and component coverage, `pnpm web:dev` for the live fixture, and `pnpm web:build` for the production bundle. Evidence and the source-range inventory for the corrected candidate replay live under [evidence/local-room/web-framework/](repo:evidence/local-room/web-framework/source-range.md). Browser assertions and screenshots: [browser/assertions.md](repo:evidence/docs/agora-web-framework-client-host/browser/assertions.md). The atlas revision names tested product subject `5f29ec4` on main `17fbf24`. `.agents/skills/verify-agora/SKILL.md` records the public browser driver checklist.

Next: [client synchronization](synchronization.md) and [system architecture](architecture.md).
