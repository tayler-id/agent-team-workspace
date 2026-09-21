# Local room contracts

## What it is

The local-development room is the first place a person will type into Agora: one project, one room, on this machine, over loopback, opted into explicitly. Its delivery is split into five slices. This page covers slice L1 only, the conversation contracts and a callable service baseline. The contracts are one JSON Schema 2020-12 family, [local-room.schema.json](repo:contracts/schemas/local-room.schema.json), with ten closed components: project and room scope, human or explicitly local-agent authorship, a bounded message body, the send command, the command's idempotency identity, the immutable message, the message-created event, the room snapshot and the command receipt. Cursors and the base receipt reuse the existing [synchronization values](repo:contracts/schemas/sync.schema.json); errors reuse the [stable reason codes](repo:contracts/schemas/errors.schema.json).

## What it does

The family fixes the meaning of every byte the room will carry, before any byte is stored. A command names its room and project, its `command_id`, a body of 1 to 4096 Unicode scalars and up to ten citations to messages already persisted in that room. It never carries an author, because the service derives the actor. A message is immutable and carries its per-room `room_seq`; a correction is a new message, not an edit. An event wraps one message in the R07 envelope with a single closed kind. A snapshot returns messages in ascending sequence with the cursor a subscription must start after. A receipt returns the command identity, the room revision and whether the command was replayed. Unknown fields, unknown variants, null in place of absent, numbers in place of decimal strings and bodies outside their bound are all refused, in TypeScript and in Swift, with the same verdict.

The service side is a baseline, not a room. `POST /api/v1/local-room/messages` validates the command with the shared wire validator, converts it to domain values, dispatches it through a domain-owned port, and answers a typed 404 `unavailable_capability` because the only adapter composed in this slice reports that no persistence path exists. A malformed command is a 400 that names the offending path. The existing health operation still answers on the same process.

## Why it exists

Later slices add persistence, lifecycle, a browser room and a bounded local answer. Each of them needs the same strict shapes, and each would otherwise be tempted to author its own. Publishing the family first, with generated consumers and golden vectors, means L2 can write its behavioral red against a running baseline whose command is already refused or dispatched for the right reasons. The typed 404 matters for the same reason: a missing route and a validated-but-unsupported command look identical to a client unless the service says which one it is.

Keeping the port in the domain package and the adapter selection in one line of the center keeps dispatch and adapters explicit. The whole-repository parity work can move the family, the feature-map entry, the event, the port and the adapter as separate units without changing behavior.

## How it works

```flow
Author | Edit local-room.schema.json and the one operation in openapi.json; nothing else authors a wire shape.
Constrain and generate | The subset gate refuses open objects, unions and unbounded values, then both consumers are regenerated and digested.
Prove agreement | Twenty-nine local-room vectors run through Ajv and the Swift consumer; acceptance, canonical bytes and digests must match.
Validate at the boundary | The center accepts JSON, runs the shared validator, and answers 400 with paths for anything malformed.
Convert and dispatch | Wire values become branded domain values and reach LocalRoomPort; the composed adapter decides the outcome.
Answer honestly | The unsupported adapter yields a typed 404 unavailable_capability; L2 replaces it with a PostgreSQL adapter and a 201 receipt.
```

Generation and dispatch are two different boundaries. Generation turns the authored schema into `@agora/contracts/values` for TypeScript and `AgoraContracts` for Swift; the center's report types come from that consumer, never from a handwritten type. Dispatch turns validated wire values into domain values in [port.ts](repo:packages/domain/src/local-room/port.ts) and hands them to whichever `LocalRoomPort` the center composes. The domain never sees Hono, JSON bytes or the database, and the contracts never see the domain.

## Implementation status

**In progress: L1 of 5 at this snapshot.** Published and proven here: the schema family, the generated TypeScript and Swift consumers, the golden vectors, the domain port with its unsupported adapter, the validated and dispatched HTTP command that answers a typed 404, the probe scenarios and the structured scenario inventory. Not present: any stored message, room counter, snapshot or event delivery, the local project identity, a CLI that starts a room, a browser room, or a local answer. Nothing here is production identity, hosted transport, search, uploads, task authority or a model provider, and this slice does not change the foundation gate or qualify U01b through U01d.

The assertion L2 must satisfy is already written. The last test in [local-room.test.ts](repo:apps/center/test/local-room.test.ts) expects a 201 receipt and is marked as an expected failure; it fails today for the honest reason and will flip red when L2 composes a persistence adapter and removes that marker.

## Verification and proof

Inspect the [schema family](repo:contracts/schemas/local-room.schema.json), the [operation](repo:contracts/openapi.json), the [domain port](repo:packages/domain/src/local-room/port.ts), the [center route](repo:apps/center/src/app.ts), the [contract tests](repo:contracts/test/local-room.test.ts) and the [center tests](repo:apps/center/test/local-room.test.ts). The feature is mapped in [the feature map](repo:agora/feature-map.json) under `local-room-contracts`.

```sh
pnpm contracts:check
pnpm contracts:conform -- --json
pnpm exec vitest run --project contracts contracts/test/local-room.test.ts --project unit apps/center/test/local-room.test.ts
node scripts/probe-center.mjs --scenarios
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs
```

The inventory command starts nothing and lists eight scenarios. The live probe must report `local-room-send-unsupported` as a 404 `unavailable_capability` and `local-room-send-unknown-field` as a 400 `malformed_command`. Retained receipts, the recorded red against the qualified parent, the preserved future red, the size measurement and the preservation inventory live under [evidence/local-room/contracts](repo:evidence/local-room/contracts/outcome.json); the [preservation inventory](repo:evidence/local-room/contracts/preservation-inventory.md) records that zero bytes were carried from the preservation commit. The literal commands are in [verify-agora](repo:.agents/skills/verify-agora/SKILL.md). See [portable contracts](contracts.md) for the generation contract and [the foundation](foundation.md) for the service the route joins.
