# Agora application architecture

**Partially implemented.** This page specifies the full five-noun contract (R25); see [Implementation status](#implementation-status) below for exactly what exists today, and [Application architecture boundaries](app-architecture.md) for the piece that is already built and enforced.

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

The framework layer and the package layer under [portable contracts](contracts.md) never import a Feature. A Feature may import the framework layer, generated contracts, and its own declared dependencies on another Feature, named in a reserved `dependencies.json` file inside that Feature's own directory. The file is a JSON array of Feature names, and `pnpm boundaries` rejects an import of a Feature it omits, naming the file to edit. [Client synchronization](synchronization.md) already isolates replay and import boundaries at the package level; this architecture extends the same discipline to product features and the renderer, and does not replace that package-level table.

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

**U20 boundary lint is built, and the U21.B01 build-time discovery slice is built; the rest of U21, the Client/Host boundary, and migration are not.** `.ts` and `.tsx` import boundaries, the framework/package-never-imports-application rule, and renderer foot-guns are enforced today across `apps/web` under U20 (B1 import ownership, B2a the exception registry, B2b renderer foot-guns); see [Application architecture boundaries](app-architecture.md) for that mechanism. Build-time Feature discovery (U21.B01, see [Feature discovery](feature-discovery.md)) generates `agora/feature-inventory.json`, but U21 is not qualified and no real product Feature has moved into the layout. U22, the Client's one-writer boundary and the typed Host interface, is open; its `agora/client-owner` rule and qualification lanes 5, 7 and 8 are built, see [Client state boundary](client-state-boundary.md). Moving existing local-room work into the new layout (U23) does not exist yet. [The implementation plan](repo:docs/implementation-plan.md) sequences these four migration units, each independently reviewable.

This architecture also governs where a future [created agent](authorization.md#created-agents) and the built-in [Bug Agent](authorization.md#created-agents) would render their own room-facing surfaces, once R26's own milestone lands; neither exists yet, and neither depends on R25 to be specified.

## Verification and proof

Run `pnpm lint` and `pnpm boundaries` for U20's landed `.ts`/`.tsx` import-boundary and renderer-footgun checks (evidence under `evidence/U20/`); run `pnpm features:check` for U21.B01 discovery; [Client state boundary](client-state-boundary.md) names the commands for the U22 checks built so far. Each remaining migration unit registers its own guard-negative fixture before its rule is enforced, the same discipline the [test-first foundation](test-first.md) already requires. Record screenshots, observed assertions, and limits under `evidence/U21/`, `evidence/U22/`, and `evidence/U23/` as each lands. [Research and decisions](research.md#provenance) records where the five-noun shape came from and why nothing here is named after it.
