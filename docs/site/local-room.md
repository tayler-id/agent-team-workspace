# Local room

## What it is

One explicitly started, loopback-only development room with one fixed human principal. L1 defines its language-neutral contracts; L2 persists messages in PostgreSQL; this L3 candidate adds an owned runtime, cursor replay and a minimal browser harness. This is **not the finished room UI**, production identity or a hosted deployment.

The candidate is deliberately stacked on L2 `55269a5`. Neither the stack nor these local receipts authorize landing before L2 and the mandatory CI protections are available. L4 owns the usable room interface; L5 owns the bounded local response. Neither is implemented here.

## What it does

Run these commands from the checkout root. No database URL or external account is needed:

```sh
node scripts/local-room.ts doctor
node scripts/local-room.ts start
node scripts/local-room.ts send --body 'Hello from the local room'
node scripts/local-room.ts history
node scripts/local-room.ts replay --after 0
node scripts/local-room.ts evidence
node scripts/local-room.ts stop
```

Open the `url` printed by start. The harness sends through the same HTTP command as the CLI and displays the **client-core committed projection**, not an optimistic timeline. Disconnect pauses its event requests; Reconnect resumes after its last applied cursor. A failed send retains its frozen command in that page so Send retries the same identity. Reload discards that pending command and unsent text; persistent drafts and polished delivery states belong to L4.

Ordinary stop/start preserves the database and URL. Only `reset --confirm-disposable`, while stopped, removes that instance's disposable data. It is not an undo, backup or migration rollback. Use `--instance NAME` on every command for a separate development instance. Each instance has its own cluster, listeners and credentials, but the same fixed room IDs, not multi-room provisioning. [The CLI reference](cli.md#local-room-runtime) lists flags and structured results.

## Why it exists

A receipt can be lost after PostgreSQL has committed. A client can disconnect between a snapshot and its next event. The room must still converge without duplicating a message or inventing a cursor. L2 commits the counter, immutable message, event and command receipt together under a room lock and forced project row-level security. Same actor, command ID and digest replays the original receipt; a changed body is 409 `command_conflict`.

L3 reads those committed event rows, never in-memory notifications. The snapshot's state and cursor come from one repeatable read. Reading strictly after that cursor covers messages committed while the snapshot was travelling. Client core deduplicates stream sequences, buffers gaps and refuses older revisions. A receipt settles a command but **never advances the room cursor**. This is why acceptance, delivery and reading remain distinct.

## How it works

```flow
Doctor and allocate | Check Node/PostgreSQL; exclusively claim the instance path. Refuse existing foreign or ambiguous paths and occupied listeners.
Launch and prove ownership | Start a private SCRAM-protected PostgreSQL child and center. A fresh 256-bit launch key authenticates a nonce bound to the launch, paths, listener and process inventory.
Snapshot at cursor C | Read state and counter together; show only the immutable client-core projection. Concurrent later commits are not lost.
Replay strictly after C | HTTP reads at most 50 committed events in numeric sequence order. Apply contiguous events, deduplicate copies, buffer gaps and repeat after the applied cursor.
Disconnect and resume | Cancel bounded HTTP reads. Reconnect from the applied cursor, including across ordinary service stop/start. Retry an unsettled command with its original ID and bytes.
Stop or explicit reset | Authenticated stop shuts down the owned child, proves listeners absent and retains data. Separate confirmed reset checks stopped ownership and deletes only that disposable instance path.
```

[Lifecycle control](repo:scripts/local-room.ts), [ownership checks](repo:scripts/local-room-owner.ts), [service composition](repo:scripts/local-room-service.ts), [wire conversion](repo:apps/center/src/local-room-wire.ts), [domain dispatch](repo:packages/domain/src/local-room/port.ts), [SQL storage](repo:packages/storage/src/local-room.ts) and the [client transport/projection adapter](repo:scripts/local-room-client.ts) are separate files. Neither the domain nor client core imports transport mechanics. The harness is a small renderer, not a React shell imported from another branch.

The narrow development transport is bounded HTTP polling using the existing Hono HTTP surface: `GET /api/v1/local-room/events?after=CURSOR`. Each page is a schema-validated `RoomEventBatch`; an empty page means caught up. Polling uses 250 ms between attempts, a five-second read timeout and cancellation. This does not claim the production R07 WebSocket handshake, subscription or queue protocol. The replaceable adapter leaves that work separate.

Browser validators are compiled from the same authored schemas before launch; CSP permits neither runtime evaluation nor external scripts. Message text is rendered with `textContent`. The runtime checks exact Host and, when present, Origin; accepts JSON mutations only; bounds bodies to 128 KiB and uses a shared 60-token bucket refilling one token per second. The database listens only on loopback, requires its private SCRAM password and runs product queries as non-owner `agora_app`. Migration credentials never serve product queries.

## Implementation status

**In progress: L3 of 5, stacked candidate only.** Snapshot history is bounded to the latest 1000 messages. Older immutable records remain readable through event replay in pages of 50; this disposable runtime has no event compaction or retention expiry. CLI replay prints one page; continue with the last event's `seq`. The client drains at most 200 pages per call, then reports the bound and can resume again.

There is no login, second principal, production membership, search, upload, external provider, agent response, task, repository authority, publication, cloud execution or final visual design. Reset creates a new disposable database, not a historical continuation: reload the harness after reset. A crashed supervisor with ambiguous surviving resources is refused rather than adopted or killed by a stored PID. See [operator recovery](operations.md#local-room-lifecycle). These receipts do not qualify FG04-FG08, AC02, AC04 or the S1 release.

## Verification and proof

[Runtime tests](repo:apps/center/test/runtime.pg.test.ts) exercise CLI/HTTP with real owned PostgreSQL: snapshot/replay interleaving, lost receipt, gap and duplicate convergence, numeric ordering beyond sequence 9, page boundaries, same-port restart durability, explicit reset, concurrent startup, cancellation, foreign identity and listener refusal, body/rate bounds and cleanup. [Adapter and guard tests](repo:apps/center/test/runtime.test.ts) cover unsupported frames, stale revisions, cancellation and isolated guard mutations. Existing [client-core tests](repo:packages/client-core/test/sync.test.ts) retain the transport-neutral ordering and retry proofs.

```sh
pnpm contracts:check
pnpm contracts:conform -- --json
pnpm client:replay -- --json --swift
pnpm test
node scripts/local-room.ts doctor
```

The literal Doctor, Launch, Drive, Evidence and Cleanup commands live in [verify-agora](repo:.agents/skills/verify-agora/SKILL.md). The feature map includes `local-room-runtime`. Retained [runtime evidence](repo:evidence/local-room/runtime/README.md) distinguishes local assertions, native CLI and browser observations from unavailable CI and independent review. Earlier [L1](repo:evidence/local-room/contracts/outcome.json) and [L2](repo:evidence/local-room/persistence/outcome.json) receipts keep their own exact subjects.
