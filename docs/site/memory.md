# Durable data and memory

The durable Agora record is designed to live outside every model session and execution environment. PostgreSQL and immutable artifacts retain what matters; a sandbox disk or context window is disposable.

## Ownership boundaries

| Location | Intended content | Authority / lifetime |
| --- | --- | --- |
| PostgreSQL | Membership, message revisions, tasks, runs, receipts, decisions and knowledge versions | Durable service authority; current fixture contains only streams, events and claims |
| S3-compatible artifacts | Logs, screenshots, manifests and bounded attachments | Immutable bytes after quarantine and hash verification; planned |
| Context bundle | Selected authorized revisions with trust labels, digests and omissions | Frozen input for a session/run, never permission; planned |
| Model context | Temporary interpretation of the supplied bundle | Not persistent project truth |
| Worker worktree / cloud disk | One attempt's source and execution output | Disposable working state; preserve dirty recovery data, not authority |
| Repository documents | Reviewed source or export with commit provenance | Input to knowledge review, not a competing live knowledge database |

## From conversation to usable knowledge

```flow
S1 decisions | Preserve the human's exact attributed words and immutable source revision.
S2 proposal | A claim carries evidence, scope, applicability and a regression or rationale.
Human activation | A maintainer approves a version with a review deadline.
Validity filter | Exclude stale, disputed, revoked or inapplicable records before retrieval.
S3 promotion | Create a new redacted workspace candidate with project and workspace approvals.
```

All of this knowledge lifecycle is planned, not implemented by the current storage fixture. S1 agent questions select specific existing records; they do not autonomously activate memory.

## Retrieval is not authorization

The intended compiler intersects requester access, agent grants, selected scope and destination-room audience before lexical search/ranking. A fact readable by a requester may still be unsafe to post in a general room. A context bundle names omitted material rather than silently treating a summary as a decision.

FTS in PostgreSQL is the initial retrieval design. Embeddings and semantic judges are deferred until reviewed miss sets justify them. A model score must never decide permission.

## Invalidation keeps memory honest

Changes to source, dependency, environment, policy, evidence availability or review date can make knowledge stale. Equal-scope contradictions remain disputed until a human resolves them. The default review deadline is 90 days in the design. That is not an implemented timer today.

See [R05/R13](repo:docs/technical-spec.md), [agent isolation](authorization.md), and [recovery boundaries](operations.md). The [research index](research.md) distinguishes shared repository synthesis from private research storage.
