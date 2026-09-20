# Roles and workflows

These are the intended S1 journeys, not runnable UI instructions. No invitation, room, task, approval or worker UI is implemented at the atlas snapshot.

## Who does what?

| Role | Intended responsibility | Boundary |
| --- | --- | --- |
| Deployment operator | Install, secure, back up and recover infrastructure | Infrastructure trust is disclosed, not hidden by app roles |
| Workspace owner | Invite people, manage workspace membership, register projects | Not automatically a reader of every project's content |
| Project maintainer | Grant project access, manage policy, review and approve eligible publication | Cannot approve their own authored result |
| Contributor | Talk, ask, propose and explicitly launch on their own machine | Cannot borrow another person's machine |
| Observer | Read authorized content | Workspace observer blocks writes even with a project contributor grant |

Agent principals are delegates, not accountable owners. [Authorization](authorization.md) explains the center and project-main distinction.

## From conversation to reviewed change

```flow
Developer A | Discuss a bug, select relevant records and propose acceptance criteria.
Developer A confirms | Freeze RunSpec and choose their registered machine explicitly.
Worker reports | Run fixed tools, verify an exact commit and upload evidence.
Developer B reviews | Inspect intent, diff and proof; approve an exact draft-publication action.
Developer A confirms credentials | Permit the host Git broker to use their credential for that action.
Human review and merge | Review on GitHub after trusted CI; observe merge and post-merge proof before task completion.
```

If Developer B is unavailable, publication waits visibly. Agora does not replace the absent reviewer with an agent. A fresh commit invalidates old exact-head evidence and approvals.

## Ask without executing

A member selects a thread and specific Agora records, sees the scope and model-cost ceiling, and confirms an answer. The planned center can cite these records or state evidence is insufficient. It is not a web researcher or repository investigation agent in S1. An answer in a general room cannot leak project-only information, even when the requester can read it.

## Join and leave safely

An invitation is for a verified matching email and one workspace role. Project access is granted separately. Revocation must invalidate subscriptions, worker grants, pending approvals and spending authority, and clients must clear private caches. That is specified behavior still awaiting implementation.

## Practical work today

Contributors can [probe the fixture](cookbook.md#inspect-a-real-policy-response), [change a contract](cookbook.md#change-a-wire-contract), and [update the atlas](authoring.md). Product installation and operation remain unavailable until the relevant milestone proof exists.
