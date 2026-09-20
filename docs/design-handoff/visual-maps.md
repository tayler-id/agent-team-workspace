# Visual maps

Six Mermaid diagrams. Each is written so it reads in source form. Sources: spec [R03](../technical-spec.md#r03-architecture-and-component-ownership), [R06](../technical-spec.md#r06-state-machines-and-invariants), [R07](../technical-spec.md#r07-ordered-api-event-and-retry-contracts), [R13](../technical-spec.md#r13-durable-decisions-knowledge-and-observer-lifecycle), and the [implementation plan](../implementation-plan.md).

## System map

Who talks to whom. Only the center service holds durable state. Workers connect outbound and hold no database access.

```mermaid
flowchart LR
  Browser["Browser client (React)"] -->|HTTPS commands + WebSocket events| Center["Center service (one Node process)"]
  Native["Native Mac client (S2)"] -->|same commands, scoped tokens| Center
  Center --> PG[("PostgreSQL 18: the shared record")]
  Center --> S3[("Artifact store")]
  Center --> Model["Model provider (workspace account)"]
  Center --> GitHub["GitHub: repositories, drafts, merge"]
  Worker["Local worker on a developer's machine"] -->|outbound TLS: claim, heartbeat, events, uploads| Center
  Worker --> Attempt["Isolated task worktree + container"]
  Cloud["Cloud runner (S2, E2B microVM)"] -->|same worker protocol| Center
  Human(("Human")) --> Browser
  Human -.->|reviews and merges| GitHub
```

## Information architecture

What sits where in the shell and how records relate. Stage labels mark later-stage areas.

```mermaid
flowchart TB
  WS["Workspace"] --> GR["General rooms"]
  WS --> PR["Projects"]
  WS --> INBOX["Inbox (per person)"]
  WS --> SEARCH["Search"]
  WS --> MACH["Machines (per person)"]
  PR --> ROOM["Project room"]
  PR --> SET["Project settings"]
  PR --> PMA["Project agent (not_enabled in S1)"]
  ROOM --> THREAD["Threads"]
  THREAD --> MSG["Messages"]
  THREAD --> SESSION["Agent sessions"]
  THREAD --> TASK["Tasks"]
  TASK --> RUN["Runs"]
  RUN --> EVID["Evidence"]
  EVID --> APPR["Approvals"]
  APPR --> PUB["Publication (draft on GitHub)"]
  ROOM --> DEC["Decisions"]
  PR --> KNOW["Knowledge (S2)"]
  ROOM --> OBS["Observer proposals (S3)"]
```

## Conversation to work journey

The primary story, from a message to a merged change, with every human authority point named.

```mermaid
sequenceDiagram
  participant A as Ada (owner)
  participant B as Ben (maintainer)
  participant C as Center
  participant W as Ada's machine
  participant G as GitHub
  A->>C: Post message in project room
  A->>C: Ask center (scope preview, cost ceiling)
  C-->>A: Cited answer or "evidence insufficient"
  A->>C: Create task (intent, acceptance, scope)
  A->>C: Confirm Run on my machine (RunSpec frozen)
  W->>C: Claim run (fenced lease)
  W-->>C: Typed activities, question, evidence upload
  A->>C: Answer question or steer (immutable prompt)
  C-->>A: Run succeeded, evidence validated
  B->>C: Review evidence, approve publication (exact head)
  A->>C: Confirm local Git credential
  W->>G: Push branch, open draft, read back
  C-->>B: Draft open, CI pending
  B->>G: Review and merge on GitHub
  C-->>A: Merge observed, post-merge scenario, task completed
```

## Run, evidence and publication lifecycle

Run states from R06, then the publication states that follow a succeeded run. Every terminal state is final; a retry is a new run.

```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> leased: machine claims
  queued --> failed: 15 min deadline, machine_unavailable
  leased --> preparing
  preparing --> running: doctor passed
  preparing --> failed: doctor blocked
  running --> awaiting_input: question
  awaiting_input --> running: human answers
  running --> verifying
  verifying --> succeeded: checks pass, evidence valid
  verifying --> failed
  running --> lost: lease expired
  running --> cancelling: human cancels
  cancelling --> cancelled: cleanup observed
  succeeded --> awaiting_approval: publication requested
  awaiting_approval --> authorized: non-author approves + credential confirmed
  authorized --> pushing
  pushing --> draft_open: read-back agrees
  pushing --> reconciling: response lost
  reconciling --> draft_open
  awaiting_approval --> blocked: head, policy or role changed
  draft_open --> [*]: human merges on GitHub
```

## Memory scopes

What the center may read when answering, and what is added in later stages. Nothing here grants authority; memory advises.

```mermaid
flowchart LR
  subgraph S1["S1: selected records"]
    T["This thread's messages"]
    D["Human decisions"]
    E["Evidence titles and manifests"]
  end
  subgraph S2["S2: reviewed knowledge"]
    K["Active knowledge items"]
    PMC["Project agent context"]
  end
  subgraph S3["S3: observer"]
    O["Observer proposals (not active until a maintainer activates)"]
  end
  T --> BUNDLE["Context bundle: quoted data with author, time, audience, omissions"]
  D --> BUNDLE
  E --> BUNDLE
  K --> BUNDLE
  BUNDLE --> ANSWER["Cited answer with partial-coverage label"]
  O -.->|human review| K
  PMC --> BUNDLE
```

## Release-stage surface map

Which surfaces belong to which stage. Design the S1 prototype set first.

```mermaid
flowchart TB
  subgraph P["S1 prototype"]
    P1["Sign-in, invitation"]
    P2["Shell, room timeline, thread, composer"]
    P3["Scope preview, agent session card"]
    P4["Task editor, task card"]
    P5["Launch preview, run card, run pane, recovery sheet"]
    P6["Evidence pane, approval card, publication status"]
    P7["Inbox"]
  end
  subgraph S1["S1 remainder"]
    S1a["Search, machines, decisions"]
    S1b["Project and workspace settings, repository registration"]
    S1c["Command output, artifact viewer, credential confirmation"]
  end
  subgraph S2["S2"]
    S2a["Project proposal, provisioning journal"]
    S2b["Cloud placement"]
    S2c["Knowledge items, active project agent"]
    S2d["Native Mac client"]
  end
  subgraph S3["S3"]
    S3a["Observer notice and proposals"]
    S3b["Operator health, deletion preview"]
    S3c["Slack notification bridge"]
  end
  P --> S1 --> S2 --> S3
```
