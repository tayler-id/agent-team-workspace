# Product brief

Agora is an invitation-only communication center for a small developer team. People talk with each other and with visible agents in project rooms, ask questions that are answered from the shared record with citations, and launch bounded coding work from a thread. Agora owns the shared record. GitHub owns repositories and the final merge. A developer's own machine, or later a cloud sandbox, executes the work but never owns durable state.

Authority for everything on this page is [the technical specification](../technical-spec.md), sections R01, R02, R14 and R20. Where this brief and the spec disagree, the spec wins.

## Purpose

The problem is coordination cost. Teams that use coding agents today split their attention across a chat tool, an agent dashboard, a terminal, and GitHub, and no single place records who asked for what, what ran where, what it proved, and who approved it. Agora makes the conversation the primary view and attaches typed work objects (tasks, runs, evidence, approvals) to that conversation, so the talking, the working, and the remembering are one record.

The first audience is a trusted team of two to five developers who already share a GitHub organization. One deployment hosts one workspace.

## Principles

These come from spec R01 and shape every screen:

1. Conversation is the primary view. A task card opens details without moving the discussion elsewhere.
2. A person owns every question and task. An agent is a delegate, never the accountable owner.
3. Text proposes. A validated human command authorizes. Model confidence is never permission.
4. Current state, historical activity, and missing evidence carry distinct labels.
5. Code owns ordering, leases, permissions, budgets, publication, and recovery. Models own bounded interpretation.
6. Each attempt owns its own files, processes, ports, and test data.

For the interface, principle 3 means chat never launches anything. Principle 4 means an old status line is history, not the present. Principle 2 means every card names a human owner.

## Current stage

Agora is in stage S1, the first runnable release, and inside S1 it is still in the executable foundation (units U01a to U01d). The foundation must pass before any user-visible feature or write-enabled agent is built. See [the implementation plan](../implementation-plan.md) for unit order and [the task breakdown](../task-breakdown.md) for individual tasks.

## What is built and what is planned

Status was checked against committed `main` at the revision recorded in `manifest.json`. "Built" means a landed task with red/green evidence under `evidence/`. Nothing a person can click exists yet.

| Capability | Status | Evidence or plan reference |
| --- | --- | --- |
| Repository, strict lint/typecheck, test-first gates, red/green recorder | Built | `evidence/U01a/agora-s1-bootstrap-repository/` |
| Center service skeleton with health and readiness endpoints | Built | Same task; `apps/center` |
| PostgreSQL 18 foundation fixture with row-level security under a non-owner role | Built | Same task; `packages/storage` |
| Portable wire contracts: JSON Schema families, OpenAPI operations, generated TypeScript and Swift consumers, drift check | Built | `evidence/U01a/agora-s1-publish-portable-contracts/` |
| Golden contract vectors and joint TypeScript/Swift conformance, canonical JSON, CLI report envelopes | Built | Same task |
| Framework-free client core (snapshots, replay, dedupe, receipts) and import boundaries | In progress | Task `agora-s1-isolate-client-core`, U01a.B03; not on `main` |
| Isolated verification runner, evidence validator, trusted CI, backup/restore, React client qualification | Planned | U01b, U01c, U01d |
| Invitations, sign-in, rooms, threads, search, inbox, unread | Planned | U02, U03 |
| Center agent answers with citations | Planned | U04 |
| Tasks, runs, approvals, budgets, local worker, evidence, publication | Planned | U05 to U08 |
| Two-person release qualification | Planned | U09 |
| Project creation from conversation, cloud execution, persistent project-main agent, reviewed knowledge, native Swift client, external coding-agent adapter | Planned | S2, U10 to U19 |
| Observer, cross-project promotion, hardened operations and deletion, one-way Slack notifications | Planned | S3, U15 to U17 |

The design team is therefore designing ahead of implementation. That is intended. The interface will be built against this packet and the spec, and the first React unit (U01d) qualifies the rendering approach with a fixture before product screens expand.

## Non-goals

From spec R01 and R20. Do not design for these, and do not leave affordances that imply them:

- Replacing GitHub, building an IDE, a browser terminal, or computer takeover.
- Automatic merge, automatic publication, or production deployment by agents.
- A general agent swarm, peer agent messaging, or nested delegation.
- Direct messages, reactions, rich presence, voice, push notifications, or federation in S1 to S3.
- Public tenants or self-service sign-up. Entry is by invitation only.
- A full Slack clone. The S3 Slack bridge is one-way notification, never authority.
- General web research or repository investigation by the center agent in S1. It answers from selected Agora records only.
