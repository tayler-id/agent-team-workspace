# What is Agora?

Agora is designed to keep a team's conversation and its work together. It is invitation-only, initially for two to five trusted developers in one workspace per deployment.

## Begin with the conversation

A developer describes a problem in a project room. A thread holds the discussion. A visible center agent can eventually answer from selected Agora records, with citations. If the team wants code changed, a person turns that discussion into a task and confirms its scope and execution placement.

The distinction matters: **asking is not launching**. An imperative message does not authorize a shell, a model bill without limits, or use of another person's computer.

```flow
Ask a question | Planned S1: select records and approve a bounded read-only answer.
Propose a task | Planned S1: state a goal and acceptance criteria in the originating thread.
Confirm a run | Planned S1: freeze scope, owner, base commit, machine, tools and budget.
Review the result | Planned S1: inspect exact-head evidence before a separately approved draft.
```

## What it is not

Agora does not replace GitHub, become an IDE, automatically merge changes, or allow an open-ended agent swarm. A worker on macOS runs Linux containers in S1, not native Xcode projects. The later native Mac **client** is a different capability.

## Availability

| Stage | Intended experience | Available now? |
| --- | --- | --- |
| Foundation in S1 | Fixture endpoints, schema generation and cross-language vectors | Partially built, not fully qualified |
| S1 release | Hosted browser, invitations, rooms, cited answers, owner-machine work and review | Not released |
| S2 | Project creation, cloud attempts, reviewed knowledge, project-main agents, external adapter, native client | Specified only |
| S3 | Observer proposals, hardening, optional one-way Slack notifications | Specified only |

You can [run the foundation checks](getting-started.md) without model, email, GitHub, or sandbox credentials. You cannot yet invite a teammate or launch a coding task. [The atlas](atlas.md) keeps this boundary visible.

## Where to go next

Read [the mental model](concepts.md) for task versus run, [role workflows](workflows.md) for human authority, or [the system map](architecture.md) for the engineering design. The [FAQ](faq.md) answers common availability questions without presenting future commands as working software.
