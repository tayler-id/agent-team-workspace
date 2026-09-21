# Shared conversation. Accountable work

Agora is a communication center for a small development team: talk in project rooms, ask visible agents for help, and turn a conversation into bounded, human-owned work.

> **Early foundation, not a released product.** The repository has a working non-production fixture and portable contracts. There is no usable chat center, worker installer, or qualified release yet.

The atlas deliberately preserves task-base revision `606cba2`. Newer fixture-only client-core and boundary work landed during this documentation change; [the foundation page](foundation.md#implementation-status) links its implementation, tests and receipts separately. It still does not deliver a usable communication center.

## Choose your path

- **[Use Agora](introduction.md)**: understand the product, what will be available, and what you can actually try today.
- **[Build and operate](architecture.md)**: see the system boundaries, repository, verification tools, and production design.
- **[Progress atlas](atlas.md)**: explore what has landed, what is active, and all 22 milestone outcomes.
- **[Design Handoff](handoff.md)**: a shareable starting point for designing the experience, with the authoritative document map.

## One record, many places to work

```flow
Conversation | People explain the goal and retain the shared record.
Human authorization | An explicit command, not a model's suggestion, permits bounded work.
Isolated execution | A local worker first; cloud execution later. Neither owns durable truth.
Evidence and review | A result has proof. Another human reviews. A human merges on GitHub.
```

This is the intended product flow, not functionality available in the fixture. Read [the mental model](concepts.md) before interpreting a green result as permission to publish.

## What you can inspect today

The [repository foundation](foundation.md) exposes health, readiness, and a scope-policy fixture. [Portable contracts](contracts.md) make TypeScript and Swift agree on wire values. The [local room](local-room.md) fixes the shape of the first conversation and persists a send to one fixed local-development room so it survives a restart. Those are useful engineering foundations, not invitations, conversations, or agent execution.

Start with [installation and first checks](getting-started.md), or read [why this architecture was selected](research.md). Documentation grows in the same change as implementation; [the authoring contract](authoring.md) is part of completion.
