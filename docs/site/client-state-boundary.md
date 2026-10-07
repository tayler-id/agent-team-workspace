# Client state boundary

## What it is

The `agora/client-owner` lint rule. It rejects renderer code that keeps its own copy of durable room or timeline state, or that reaches the Client core or the transport without going through the named hooks. It is the static half of U22.B01. The Client hooks, the one-writer runtime and the browser-global rule were already built; this rule only closes the gap between them.

## What it does

It runs on Features and on un-owned `apps/web/src` components. The Client owner, the Host, the framework, the entrypoints (`main*.tsx`) and tests are exempt, because they implement the Client rather than consume it. A file in scope is rejected for four things.

- `useState`, `useReducer`, `useRef` or `createContext` (imported from React under any local name) whose resulting type holds a durable Client type. The check follows aliases, unions, generic arguments and anonymous object properties through the TypeScript checker, so `type Alias = FrozenMessage` and `import type { Message as M }` are caught the same as the original name.
- A value import or re-export from `@agora/client-core`. Type imports stay allowed.
- A value import of `createRoomClient` or `AgoraProvider` from `@agora/web-framework`.
- A call to `loadSnapshot`, `submit`, `markSeen`, `disconnect`, `reconnect` or `saveDraft` on a `RoomTransport`, written as member access or as destructuring. Reading `transport.streamId` is allowed.

Every diagnostic names the sanctioned owner. A copy of durable state points to `useClientSelector` for reads and `useRoomCommands` or `useSetDraft` for writes. A transport call points to the same commands and to `apps/web/src/host`. Component-local UI state such as an open flag, a selected id or input text has no durable type and passes.

## Why it exists

Before this rule the only enforcement was prose and review. A component could copy `room.messages` into `useState`, import `synchronize` from the core, or call `transport.saveDraft` directly, and lint stayed green. The last one was real. `App.tsx` persisted drafts by calling the transport next to `useSetDraft`, so a component owned a Host write. The persist call now lives inside `useSetDraft`.

## How it works

```flow
Scope | The rule applies to Features and un-owned apps/web/src files, not to the Client, Host, framework, entrypoints or tests.
Import edge | A runtime import of @agora/client-core, createRoomClient or AgoraProvider is rejected before any type is consulted.
Held type | For each React state holder the checker resolves the type and walks aliases, unions, generic arguments and object properties looking for a type declared in client-core or the web-framework projection.
Transport call | A command method on RoomTransport, by member access or destructuring, is rejected. The identity field streamId is read-only and allowed.
Diagnostic | The message names the hook or Host owner to use instead. No exception file applies, so the rule fails closed.
```

## Implementation status

**Built for the bounded static rule.** It does not close U22. Feature discovery, the Client/Host runtime migration and the remaining U22 lanes stay open. Two limits are deliberate. The rule tracks the held type, so `useState(room.id)` is not seen, because a string carries no ownership. A Feature that needs a new durable shape must be added to the client-core or projection allow-list in the policy file. Treating a primitive copied out of Client state as a violation needs a data-flow decision this slice does not make.

## Verification and proof

Inspect [the rule](repo:scripts/client-owner-policy.ts) and [its fixtures](repo:packages/client-core/test/client-state-owner.test.ts). The fixtures lint in-memory text against existing owner files, so nothing is written and parallel runs cannot delete each other. Run `pnpm boundaries` or `pnpm exec vitest run --project unit packages/client-core/test/client-state-owner.test.ts`. The retained red and green receipts, and the guard-disabled run, are under `evidence/U22/client-state-boundary/`.

Next: [application architecture](app-architecture.md), [client synchronization](synchronization.md) and the [R25 contract](agora-application-architecture.md).
