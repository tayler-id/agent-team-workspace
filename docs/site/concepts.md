# A mental model for Agora

Separate the conversation, the permission, the attempt, and the proof. They answer different questions and have different lifetimes.

## Four layers

```flow
Shared record | What did people say, decide and request? Rooms, threads and exact message revisions.
Human authority | Who may authorize this action now? Roles, scope, recent authentication and approvals.
Bounded attempt | What is executing, where, and until when? RunSpec, lease, fence and environment.
Observed proof | What actually happened at this exact revision? Receipts, artifacts and independent review.
```

These are design concepts. Only the [fixture and contracts](atlas.md) exist at the current snapshot.

## Glossary

| Term | Meaning | Do not confuse with |
| --- | --- | --- |
| Workspace | One deployment's shared membership boundary | Automatic access to all projects |
| Project | One repository, explicit members, one room, one stable project-main identity | A permanent VM |
| Room / thread | Shared timeline / focused conversation under a message | A task scheduler |
| Message revision | Immutable version pinned by citations and runs | The current editable display |
| Task | Human-owned goal and acceptance criteria | A single attempt |
| Run | One bounded attempt, with its own ID | Retry by reopening an old run |
| RunSpec | Frozen scope, base, tools, placement, payer and limits | Follow-up chat that expands authority |
| Session | One question or run's agent interaction | Persistent project identity |
| Lease / fence | Temporary execution grant / monotonically advancing rejection boundary for stale writers | Worker liveness alone |
| Epoch | Deployment generation that invalidates old authority after recovery | An event timestamp |
| Receipt | Durable acknowledgment of a command or observed effect | A optimistic local UI state |
| Evidence | Exact-head observations and artifact references | A model claiming tests passed |
| Approval | One human decision bound to one exact action and subject | A standing permission to publish |
| Context bundle | Authorized selected revisions with sources and omissions | Unbounded private agent memory |
| Knowledge | Human-reviewed claim with applicability and expiry | Any sentence in chat |
| Milestone | Task outcomes plus integration qualification | One completed task |

## Think in attempts, not restarts

Suppose a laptop disappears halfway through work. In the intended S1 design, the center keeps its durable task record. The old run loses its lease and cannot complete or publish later. A human chooses a fresh attempt. The worker retains dirty local work for recovery rather than deleting it to make the UI look clean.

See [execution and recovery](execution.md) and [operations](operations.md). These are future safety requirements, not tested recovery features today.

## Current state is not historical activity

A historical “started” event does not prove something is still running. A heartbeat proves responsiveness, not meaningful progress. A successful run does not imply a draft was published, CI passed, or a human merged it. [Role workflows](workflows.md) show the separate gates.
