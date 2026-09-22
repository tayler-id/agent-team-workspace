# Local room

## What it is

One explicitly started, loopback-only development room with one fixed human principal. L1 defines its language-neutral contracts; L2 persists messages in PostgreSQL; L3 adds an owned runtime, cursor replay and a minimal browser harness. This is **not the finished room UI**, production identity or a hosted deployment.

L1 published the conversation contracts, one JSON Schema 2020-12 family in [local-room.schema.json](repo:contracts/schemas/local-room.schema.json) with ten closed components. L2 makes the room durable: a send is committed to PostgreSQL in one transaction, and the room reads back in the same order after the service restarts. Cursors and the base receipt reuse the [synchronization values](repo:contracts/schemas/sync.schema.json); errors reuse the [stable reason codes](repo:contracts/schemas/errors.schema.json), which now include `command_conflict`.

L4 owns the usable room interface; L5 owns the bounded local response. L4's first vertical slice is landed here: the same apps/web room shell (App, Timeline, Composer) used by the development fixture now also runs against the live L1-L3 runtime over a dedicated Host transport, replacing the plain-DOM harness this page used to describe. It does not yet cover manual disconnect/reconnect toggling, request cancellation, or a non-placeholder room header; see "Live room UI" below for exact scope. L5's read-only pure preparation core was built stacked on L2 and is now integrated at the landed L1-L3 base, deliberately kept independently testable; these local receipts alone do not authorize landing the final response feature, which still needs its own CI protections and independent review.

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

Open the `url` printed by start. It serves the same apps/web room shell (App, Timeline, Composer) used by the development fixture, now over `apps/web/src/host/live.ts`: a Host transport that sends through the same HTTP command as the CLI and displays the **client-core committed projection**, not an optimistic timeline. The page connects automatically on load and polls for committed events for its whole lifetime; there is no manual Disconnect/Reconnect toggle in this first slice, so a network failure surfaces as a status error and a dropped tab's history simply resumes from its last applied cursor when reopened. A failed send retries its frozen command automatically (rate-limit and timeout backoff), so Send never needs to be pressed twice for the same identity. Reload discards any unsent draft and fetches a fresh snapshot; persistent drafts and polished delivery states remain later L4 work.

Ordinary stop/start preserves the database and URL. Only `reset --confirm-disposable`, while stopped, removes that instance's disposable data. It is not an undo, backup or migration rollback. Use `--instance NAME` on every command for a separate development instance. Each instance has its own cluster, listeners and credentials, but the same fixed room IDs, not multi-room provisioning. [The CLI reference](cli.md#local-room-runtime) lists flags and structured results.

### Read-only local answer preparation

A separate pure core can prepare an attributed quotation of explicitly selected stored messages. Its visible label is **Deterministic local fixture (not AI inference)**. Each claim is only that the cited record contains the quoted text, not that its contents are true. It neither answers arbitrary questions nor follows instructions inside messages. Embedded citations and links stay data and never expand the selection.

This is a contributor-testable package capability, not an Ask center button, a product CLI trigger, or a posted response. Nothing new appears in the room. Posting, cross-restart duplicate suppression and browser visibility remain later L5 work after L3/L4.

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

[Lifecycle control](repo:scripts/local-room.ts), [ownership checks](repo:scripts/local-room-owner.ts), [service composition](repo:scripts/local-room-service.ts), [wire conversion](repo:apps/center/src/local-room-wire.ts), [domain dispatch](repo:packages/domain/src/local-room/port.ts), [SQL storage](repo:packages/storage/src/local-room.ts), the [CLI transport/projection adapter](repo:scripts/local-room-client.ts) and the [live browser Host transport](repo:apps/web/src/host/live.ts) are separate files. Neither the domain nor client core imports transport mechanics.

### Live room UI

`scripts/local-room-service.ts` builds [`apps/web/src/main-live.tsx`](repo:apps/web/src/main-live.tsx) with the same standalone-Ajv aliasing it already applied to the plain harness, so the served bundle still needs no `unsafe-eval`. That entry mounts the same `App` shell described in [the web shell](local-room-web-shell.md) over [`createLiveTransport`](repo:apps/web/src/host/live.ts), which polls `GET events?after=CURSOR` on the same 250 ms cadence as the CLI adapter, posts `SendRoomMessageCommand` on submit, and retries a rejected send with the client-core `retry` input (timeout resend, rate-limit backoff from `Retry-After`) instead of leaving it stuck. Per-message author and time come from the wire `RoomMessage.author`/`created_at`, rebuilt on every snapshot and event since L1 carries no display name; the header project/room/member chrome is a fixed placeholder, because L1 has no project or room naming concept yet. Not in this first slice: a manual Disconnect/Reconnect toggle (the poll loop runs for the tab's lifetime; reload is the reconnect path), request cancellation, and a non-fixture room header — later L4 work.

The narrow development transport is bounded HTTP polling using the existing Hono HTTP surface: `GET /api/v1/local-room/events?after=CURSOR`. Each page is a schema-validated `RoomEventBatch`; an empty page means caught up. Polling uses 250 ms between attempts, a five-second read timeout and cancellation. This does not claim the production R07 WebSocket handshake, subscription or queue protocol. The replaceable adapter leaves that work separate.

Browser validators are compiled from the same authored schemas before launch; CSP permits neither runtime evaluation nor external scripts. Message text is rendered with `textContent`. The runtime checks exact Host and, when present, Origin; accepts JSON mutations only; bounds bodies to 128 KiB and uses a shared 60-token bucket refilling one token per second. The database listens only on loopback, requires its private SCRAM password and runs product queries as non-owner `agora_app`. Migration credentials never serve product queries.

### Selected messages to a cited proposal

```flow
Selected messages | A trusted caller supplies validated persisted records and an explicit list of stored message IDs from one project and room; no storage handle enters the core.
Bounded context | Refuse more than 100 supplied records, more than 10 selected IDs, or more than 4096 selected body scalars. Sort numerically by room sequence, never timestamp; freeze a private copy and digest it.
Deterministic proposal | Emit exact quotes with the not-AI label. Bind the requester, project, room, request ID and selected content to deterministic identities, with no provider or execution authority.
Cited records | Every claim names its selected stored message ID and exact sequence. Unknown, foreign or unselected citations deny; there is no transitive citation lookup or generated URL.
Posting boundary | A separate type describes a future adapter. No instance exists, no function receives it, and no message is posted.
```

The [context compiler](repo:packages/domain/src/local-answer/context.ts), [citation constructor](repo:packages/domain/src/local-answer/citations.ts), [proposal function](repo:packages/domain/src/local-answer/proposal.ts) and [future posting port](repo:packages/domain/src/local-answer/posting.ts) are separate files. They use existing domain values, not new wire contracts. The [developer guide](repo:docs/runbooks/development.md) explains validation, digests and typed denials; the [driver reference](cli.md#local-answer-pure-core) gives the exact test command.

## Implementation status

**In progress: L3 of 5, stacked candidate only.** Snapshot history is bounded to the latest 1000 messages. Older immutable records remain readable through event replay in pages of 50; this disposable runtime has no event compaction or retention expiry. CLI replay prints one page; continue with the last event's `seq`. The client drains at most 200 pages per call, then reports the bound and can resume again.

There is no login, second principal, production membership, search, upload, external provider, agent response, task, repository authority, publication, cloud execution or final visual design. Reset creates a new disposable database, not a historical continuation: reload the harness after reset. A crashed supervisor with ambiguous surviving resources is refused rather than adopted or killed by a stored PID. See [operator recovery](operations.md#local-room-lifecycle). These receipts do not qualify FG04-FG08, AC02, AC04 or the S1 release.

**L5 pure-core preparation is also present, independent of L3/L4.** Present and proven: bounded context compilation from explicitly supplied validated persisted records, deterministic attributed quote proposals with the not-AI label, and direct-citation integrity checks. Not present: a persisted local answer, any response trigger, posting, cross-restart duplicate suppression or browser visibility — those remain final L5 work after L4.

## Verification and proof

[Runtime tests](repo:apps/center/test/runtime.pg.test.ts) exercise CLI/HTTP with real owned PostgreSQL: snapshot/replay interleaving, lost receipt, gap and duplicate convergence, numeric ordering beyond sequence 9, page boundaries, same-port restart durability, explicit reset, concurrent startup, cancellation, foreign identity and listener refusal, body/rate bounds and cleanup. [Adapter and guard tests](repo:apps/center/test/runtime.test.ts) cover unsupported frames, stale revisions, cancellation and isolated guard mutations. Existing [client-core tests](repo:packages/client-core/test/sync.test.ts) retain the transport-neutral ordering and retry proofs. The pure core has its own [behavior tests](repo:packages/domain/test/local-answer.test.ts) and [isolated guard mutations and authority negatives](repo:packages/domain/test/local-answer-guards.test.ts). The features are mapped in [the feature map](repo:agora/feature-map.json) under `local-room-contracts`, `local-room-persistence`, `local-room-runtime` and `local-room-agent-core`.

```sh
pnpm contracts:check
pnpm contracts:conform -- --json
pnpm client:replay -- --json --swift
pnpm test
node scripts/local-room.ts doctor
```

The literal Doctor, Launch, Drive, Evidence and Cleanup commands live in [verify-agora](repo:.agents/skills/verify-agora/SKILL.md). Retained [runtime evidence](repo:evidence/local-room/runtime/README.md) distinguishes local assertions, native CLI and browser observations from unavailable CI and independent review. Earlier [L1](repo:evidence/local-room/contracts/outcome.json) and [L2](repo:evidence/local-room/persistence/outcome.json) receipts keep their own exact subjects. The pure core's [stacked candidate receipts](repo:evidence/local-room/agent-core/outcome.json) prove bounds, chronology, citation integrity and the three isolated guard mutations at its own exact head; they do not qualify AC04, FG04-FG08, final L5 or S1, and remain subject to their own applicable CI protections and independent exact-head review. See [portable contracts](contracts.md) for the generation contract and [the foundation](foundation.md) for the service and storage the room joins.
