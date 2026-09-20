# System architecture

The target is one hosted modular center, not a fleet of microservices. PostgreSQL owns the shared state. Workers execute elsewhere and send bounded facts back. Current implementation is limited to [foundation fixtures](foundation.md), [portable contracts](contracts.md), and a [renderer-independent core](synchronization.md), not this production topology.

## End-to-end shape

```flow
Browser or later Swift client | Human commands over HTTPS; resumable events back to the client.
Node center | Validate identity, scope, command and current state; own ordering and policy.
PostgreSQL plus artifact storage | Commit durable records and receipt metadata; preserve immutable evidence bytes.
Outbound local worker | Claim explicitly assigned work, execute in isolation, report fenced evidence.
Later cloud runner | Use the same run contract in a fresh E2B microVM, never an automatic fallback.
GitHub | Repository truth, trusted checks, independent review and human merge.
```

The [atlas system map](atlas.md#system-map) shows individual connections and current availability. The flow above summarizes boundaries, not a literal linear network pipeline.

## Why a modular center?

The same transaction often needs to compare membership, head revision, budget, approval and a durable receipt. Keeping those decisions together is simpler to reason about than coordinating independent authorities. The design does not add Redis, a queue broker, workflow engine or vector database.

The API, scanner and outbox are intended to run in one Node process. It must never execute repository hooks, builds or tests. That work belongs outside the center. [The architecture comparison](research.md) explains rejected chat-host and distributed-actor alternatives without claiming performance benchmarks.

## Package and adapter boundaries

| Layer | Owns | Must not own |
| --- | --- | --- |
| Contracts | Language-neutral wire shapes and canonical bytes | Framework types or domain tables |
| Domain | Pure policy and domain-owned capabilities | HTTP, SQL or provider SDKs |
| Storage | Private database adapter and reviewed migrations | Exported ORM/query-builder types |
| Center | Route composition and domain-to-wire conversion | Raw repository execution |
| Client core | Snapshot/replay/receipt state | DOM, React or sockets |
| Browser | Accessible projections and narrow adapters | Authorization or a second timeline |
| Worker | Isolated execution and host brokers | Center/domain/storage imports or database access |

Existing roots and planned modules have [discoverable homes](repository.md). The current [client isolation](synchronization.md) slice enforces import forms, export maps, transitive public-type boundaries and platform-free compilation. These guards do not prove future adapters or product authorization.

## Command and event flow

A production mutation will validate a command ID and expected revision, commit current state, event, audit and receipt together, and deliver only committed events. A duplicate command with identical input returns its original receipt. Reusing the ID with different input is a conflict. Sequence counters are per stream, not timestamps or a global clock.

Those production routes are planned. The fixture proves only scoped counter/event transactions and one-winner claims. Read [data boundaries](memory.md), [authorization](authorization.md), and [operations](operations.md) before treating the map as a deployment recipe.
