# Agora application architecture

**Planned, not implemented.** Every noun and rule on this page is a specified contract, not running code; see [Implementation status](#implementation-status) below for exactly what exists today.

## What it is

Agora's application architecture organizes product code as owned Features, each discovered from reserved files instead of registered by hand, rendered through named Client hooks and one typed Host boundary. It has five nouns: Feature, Entrypoint, Timeline Card, Client, and Host. [The technical specification](repo:docs/technical-spec.md) fixes the mechanical contract those nouns satisfy; this page explains it for a developer adding a Feature.

## What it does

A build-time scan finds every Feature by its reserved Entrypoint and Timeline Card files and generates a drift-checked inventory instead of a hand-maintained one. Import-boundary lint rejects a Feature that reaches into another Feature without a declared contract, a component that writes durable timeline state directly, and code outside the framework layer that calls a browser global or the transport layer directly. Every rejection names the file's supported owner and the sanctioned alternative, not only the rule it broke.

## Why it exists

Product feature work had no conventional path: the first local-room contracts slice touched four shared roots by hand, and a paused renderer branch shows exactly the drift an unnamed convention predicts, unlinted `.tsx` files and direct browser-global calls outside any boundary. Naming the five nouns and their mechanical contract gives a reviewer, not only a lint rule, a way to tell a Feature apart from a shared root before a change grows past review size.

## How it works

```flow
Feature | One directory owns everything for one product capability; discovered, not registered.
Entrypoint | A reserved file inside the Feature says how it is reached, a route, a command, or a mention target.
Timeline Card | A reserved file inside the Feature says how it renders into the room timeline.
Client | The one writer of durable browser state; a Feature reads and writes only through its named hooks and commands.
Host | The one typed boundary around every browser global and transport call; a Feature never calls fetch, a socket, document, or window directly.
```

A concrete Feature directory looks like this. The reserved filenames are illustrative; the mechanical contract in the specification is authoritative, not the exact name.

```text
apps/web/src/features/local-room/
  entrypoint.ts        reserved: how this Feature is reached
  timeline-card.tsx    reserved: how this Feature renders in the room timeline
  message-list.tsx
  composer.tsx
apps/web/src/framework/
  client.ts             the one Client: named hooks and commands
  host.ts               the one Host: the typed browser/transport boundary
```

The framework layer and the package layer under [portable contracts](contracts.md) never import a Feature. A Feature may import the framework layer, generated contracts, and its own declared dependencies on another Feature, named in a reserved `dependencies.json` file inside that Feature's own directory. [Client synchronization](synchronization.md) already isolates replay and import boundaries at the package level; this architecture extends the same discipline to product features and the renderer, and does not replace that package-level table.

## Where existing work lands

Moving a capability into a Feature folder relocates its consumer wiring, not its schema or domain authority. Local room's contracts and domain port keep their existing package homes; only the call sites that use them move:

```text
contracts/schemas/local-room.schema.json   stays in Contracts; a Feature imports only its generated types
packages/domain/src/local-room/port.ts     stays in Domain; the browser Feature never imports it directly
apps/center/src/features/local-room/       new: the server Entrypoint that replaces one hand-wired route line
apps/web/src/features/local-room/          new: the renderer, rewritten onto the Client and Host, not just moved
```

[The technical specification](repo:docs/technical-spec.md) fixes this ownership map (R25, "Ownership map for existing work") as authoritative for this table.

## Implementation status

**Not implemented.** `.ts` import boundaries and the framework/package-never-imports-application rule are enforced today at the package level; see [synchronization](synchronization.md). `.tsx` coverage, Feature/Entrypoint/Timeline Card discovery, declared Feature-to-Feature dependencies, the Client's one-writer boundary, and a typed Host interface do not exist yet. [The implementation plan](repo:docs/implementation-plan.md) sequences four migration units, U20 boundary lint (including the Feature-dependency and framework-edge checks), U21 feature discovery, U22 the Client/Host boundary, then U23 moving existing local-room work into the new layout, each independently reviewable.

This architecture also governs where a future [created agent](authorization.md#created-agents) and the built-in [Bug Agent](authorization.md#created-agents) would render their own room-facing surfaces, once R26's own milestone lands; neither exists yet, and neither depends on R25 to be specified.

## Verification and proof

Run `pnpm lint` for the current package-level boundaries; there is no `.tsx` or feature-discovery check to run yet. Each migration unit registers its own guard-negative fixture before its rule is enforced, the same discipline the [test-first foundation](test-first.md) already requires. Record screenshots, observed assertions, and limits under `evidence/U20/`, `evidence/U21/`, `evidence/U22/`, and `evidence/U23/` as each unit lands. [Research and decisions](research.md#provenance) records where the five-noun shape came from and why nothing here is named after it.
