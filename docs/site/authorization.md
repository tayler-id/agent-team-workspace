# Authorization and agent hierarchy

Text proposes. A validated human command authorizes. The intended production system derives actor identity from credentials, not a model's assertions or an actor ID in a request body.

## The center is not every project's main agent

| Principal | Purpose | Boundary and stage |
| --- | --- | --- |
| Workspace center agent | Answer selected-record questions and propose work | S1 planned; no shell, repository writes, assignment or self-approval |
| Project-main A | Stable identity for project A and its reviewed context | Identity inactive in S1; active S2; cannot read project B by default |
| Project-main B | Independent stable identity for project B | Separate scope and reconstructable sessions, not shared scratch memory |
| Task agent | Perform one bounded run's tools | Fixed RunSpec, lease and budget; no nested delegation |
| Observer agent | Propose claims from opted-in conversations | S3 only; cannot execute or activate knowledge |
| Created agent | A human-proposed, human-confirmed agent with its own stable identity and isolated persistent environment | S2/S3 planned; see [Created agents](#created-agents) below |
| Bug Agent | A built-in created-agent role that reproduces and cites defects | S3 planned; read-only by default; see [Created agents](#created-agents) below |

```flow
Human and destination | Determine requester access and where the answer will be visible.
Center or project-main | Intersect selected records with principal grants; never expand access by identity alone.
Context compiler | Freeze exact allowed revisions, omissions and source digests.
Bounded session | Answer or propose; only a separate human command launches execution.
```

Project-main persistence means durable identity and reviewed records, not a permanent model process, VM or worktree. Communication between agents is intended to use task-scoped request/result records through Control, not a private peer network.

## Roles intersect rather than accumulate

Workspace owner/member/observer and project maintainer/contributor/observer are separate grants. Workspace membership alone does not imply project access. A workspace observer cannot write even with a project contributor grant. A workspace owner joining a project must do so through an audited grant.

Authorization must run on commands, subscriptions, event delivery, uploads, downloads, search and provider calls. Database scope keys and row policies are defense in depth, not a replacement for real caller authentication.

## Client device is not worker device

A future native client's token belongs to a human's public-client session. It must not enroll or impersonate a worker. A worker token cannot approve as a human. Sensitive approvals require recent authentication and an exact-action challenge, not merely a refreshed access token.

## Created agents

**Planned, not implemented.** From a room, a human proposes a new agent and a second eligible human confirms it, seeing the exact permission, provider, cost, and lifecycle preview before anything spends. Every created agent gets its own isolated, persistent environment, a desktop VM with browser, filesystem, terminal, and only its approved tools; two agents never share one. That persistence is a distinct thing from R09's per-task-attempt microVM, specified in [the technical specification](repo:docs/technical-spec.md): an attempt's environment is disposable and replaced every run, while a created agent's environment is the one workspace its identity keeps across many attempts, until a human explicitly archives or destroys it. A human can inspect, edit, disable, and immediately stop every routine and automation, and an automation can never expand its agent's authority past what its creation approval granted.

The **Bug Agent** is a built-in created-agent role, distinct from the trusted CI reviewer: CI proves a candidate's own checks, and the Bug Agent looks for defects nobody asked it to find. It is read-only by default, holds no administration, production, merge, or broad GitHub credential, and cannot approve or independently review its own proposed repair. R26, in [the technical specification](repo:docs/technical-spec.md), is the full specification; [the application architecture](app-architecture.md) is where either role's own room-facing surface would eventually render, once its own milestone lands.

## Current proof boundary

Only [pure fixture scope decisions and PostgreSQL isolation](foundation.md) are built. The fixture trusts test-provided scope IDs by design and is not the production identity system. Better Auth invitations, device OAuth, live revocation and recent-auth approvals remain planned under [R04 and U02](repo:docs/technical-spec.md). Never expose the fixture as a production permission endpoint.
