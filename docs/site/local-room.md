# Local room

## What it is

The local-development room is the first place a person types into Agora: one project, one room, on this machine, over loopback, opted into explicitly. Its delivery is split into five slices. This page covers the two that have landed. L1 published the conversation contracts, one JSON Schema 2020-12 family in [local-room.schema.json](repo:contracts/schemas/local-room.schema.json) with ten closed components. L2 makes the room durable: a send is committed to PostgreSQL in one transaction, and the room reads back in the same order after the service restarts. Cursors and the base receipt reuse the [synchronization values](repo:contracts/schemas/sync.schema.json); errors reuse the [stable reason codes](repo:contracts/schemas/errors.schema.json), which now include `command_conflict`.

## What it does

`POST /api/v1/local-room/messages` takes a command that names the fixed room, a `command_id`, a body of 1 to 4096 Unicode scalars and up to ten citations to messages already in the room. The service derives the author; a command never carries one. An accepted command answers 201 with a receipt: the command identity (the id plus the canonical digest of the command bytes), the room revision the message received, the message id and whether the command was replayed. `GET /api/v1/local-room/snapshot` answers the room's messages in ascending `room_seq` with the cursor a later subscription must start after, at most the latest 1000 messages.

Sending the same command again returns the original receipt with `replayed: true` and stores nothing. Sending the same `command_id` with a different body is a 409 `command_conflict`. A command for another project or room is a 404 `scope_mismatch`. A citation that names no persisted message at its sequence is a 404 `not_found`. A malformed command is a 400 that names the offending path, and it reaches no storage. Messages, events and receipts are immutable once committed: neither the service role nor the schema owner can update or delete them.

## Why it exists

A room that loses or reorders messages when the process restarts is not a room. Persistence is the first product behavior a person can feel, and it decides the shape of everything after it: the browser room (L4) will render exactly the snapshot this slice returns, and the bounded local answer (L5) will cite exactly the record ids it stores.

Transactionality is what makes the order trustworthy. The room counter, the message, its `message_created` event and the command receipt are written in one PostgreSQL transaction. If any of them fails, none of them exists and the counter has not moved, so a rollback never leaves a gap that a later reader would take for a lost message. Concurrent sends serialize on the room's counter row, which is why eight simultaneous commands receive eight contiguous sequences and the event sequence always equals the message sequence. The idempotency identity is the R07 one: the same actor, `command_id` and request digest replay; a changed digest is refused rather than silently creating a second message. That is what lets a client retry a send after a lost response without fear.

## How it works

```flow
Validate | The center runs the shared wire validator; a malformed command is 400 with its path and never reaches the domain or the database.
Convert and digest | Wire values become branded domain values and the request digest is computed over the validated command bytes.
Open one transaction | The adapter binds the fixed project for row-level security and locks the room's counter row; every later step in this request holds that lock.
Decide | The domain replays a matching receipt, denies a changed digest with command_conflict, denies a citation that names no persisted record with not_found, or allocates the next room sequence.
Append together | The message, its message_created event with the same sequence, and the receipt are inserted; commit makes all of them visible at once, rollback none.
Answer and read back | The receipt is answered as 201; a snapshot reads the counter and the messages in one repeatable read, so the cursor and the rows agree even during concurrent sends.
```

The pieces stay separable. [port.ts](repo:packages/domain/src/local-room/port.ts) owns the dispatch port, the store port and the send decision; it knows nothing about SQL or HTTP. [events.ts](repo:packages/domain/src/local-room/events.ts) owns the one event kind. [local-room.ts](repo:packages/storage/src/local-room.ts) binds the store to one PostgreSQL transaction confined to one project. [app.ts](repo:apps/center/src/app.ts) maps wire to domain and denials to R07 statuses; [main.ts](repo:apps/center/src/main.ts) is the one place the PostgreSQL adapter is composed. A process without that adapter still answers a typed 404 `unavailable_capability`.

Storage runs as the non-owner service role. Migration [0001_local_room.sql](repo:packages/storage/drizzle/0001_local_room.sql) creates the `local_room` schema, seeds the one fixed room, forces row-level security keyed on the project, grants the service role only what the path needs (select and the counter column update on the room; select and insert on the three record tables) and adds triggers that refuse updates and deletes for every role, the owner included. The event table's primary key references the message's sequence, so an event cannot exist at a sequence its message does not hold.

## Implementation status

**In progress: L2 of 5 at this snapshot.** Present and proven: everything L1 published, plus the fixed room, the transactional send, the replayed and conflicting receipts, the snapshot operation, restart durability, the storage bounds and the immutability, scope and row-level-security guards. The room is fixed by the migration; there is no login, no project provisioning and no second room. The author is always the one fixed human principal. Not present: a project CLI that starts and stops the service (L3), realtime event delivery and cursor reconnect (L3), a browser room (L4), a local answer (L5), search, uploads, model providers, task authority, Skills, Routines or any external gateway. The snapshot returns at most the latest 1000 messages and defines no paging; older history is durable but not yet readable through the public surface. Nothing here is production identity or hosted transport, and this slice does not change the foundation gate or qualify U01b through U01d.

## Verification and proof

Inspect the [schema family](repo:contracts/schemas/local-room.schema.json), the [operations](repo:contracts/openapi.json), the [domain port and send decision](repo:packages/domain/src/local-room/port.ts), the [PostgreSQL adapter](repo:packages/storage/src/local-room.ts), the [migration](repo:packages/storage/drizzle/0001_local_room.sql), the [center route](repo:apps/center/src/app.ts), the [storage tests](repo:packages/storage/test/local-room.pg.test.ts), the [center process tests](repo:apps/center/test/local-room.pg.test.ts) and the [contract tests](repo:contracts/test/local-room.test.ts). The features are mapped in [the feature map](repo:agora/feature-map.json) under `local-room-contracts` and `local-room-persistence`.

```sh
pnpm contracts:check
pnpm contracts:conform -- --json
pnpm test:pg
node scripts/probe-center.mjs --scenarios
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs
```

The inventory command starts nothing and lists sixteen scenarios. The live probe applies the migration, starts the real center process as the service role, sends, replays, provokes the 409, 404 and 400 answers, then stops the process, starts it again and proves the snapshot and a replay survive. The storage tests prove contiguous concurrent sequences, one message under eight simultaneous copies of one command, rollback without a consumed sequence, the 4096-scalar and ten-citation bounds at the table, project isolation with a `BYPASSRLS` guard negative, and immutability for both roles. Retained receipts, the recorded red against the L1 parent, the size measurement and the security notes live under [evidence/local-room/persistence](repo:evidence/local-room/persistence/outcome.json); L1's are under [evidence/local-room/contracts](repo:evidence/local-room/contracts/outcome.json). The literal commands are in [verify-agora](repo:.agents/skills/verify-agora/SKILL.md). See [portable contracts](contracts.md) for the generation contract and [the foundation](foundation.md) for the service and storage the room joins.
