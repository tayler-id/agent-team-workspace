# Information architecture

The hosted browser client has a left navigation rail, a center timeline, and a right detail pane. On narrow screens the right pane becomes its own route with a back control. Deep links address rooms, messages, tasks, runs, and evidence by ID. Source: spec [R02](../technical-spec.md#r02-browser-experience-and-user-journeys) and [R05](../technical-spec.md#r05-authoritative-records-and-access-paths). Diagrams are in [visual maps](visual-maps.md).

## Areas

Stage labels say when an area first ships. `S1` areas are the first release. `S1 prototype` marks the smallest coherent slice to design first.

| Area | What it holds | Primary object | Stage |
| --- | --- | --- | --- |
| Workspace | One per deployment. Members, roles, general rooms, project list | Membership | S1 prototype |
| Projects | Registered GitHub repositories with explicit membership, one room, one project-main identity, lifecycle state | Project | S1 prototype |
| Rooms | General rooms readable by the workspace; project rooms visible to project members only. No private general rooms, no direct messages | Room timeline | S1 prototype |
| Threads | A root message and ordered replies. Where questions are asked and tasks are created | Thread | S1 prototype |
| Inbox | Attention items for one person: mentions, questions, approvals, failures. Reading does not resolve | Inbox item | S1 prototype |
| Search | Full-text over current messages, final agent answers, task titles, evidence titles, decisions, active knowledge. Access filtered before ranking. 50 results per page | Search result | S1 |
| Tasks | Human-owned units of work with intent, acceptance criteria, scope, dependencies, state, current run | Task | S1 prototype |
| Runs | Attempts of a task with an immutable RunSpec, placement, fenced lease, state, outcome | Run | S1 prototype |
| Agent sessions | One center-agent question or one run's model session, with typed activities | Session | S1 prototype |
| Evidence | Signed manifests with exact base and head, checks, artifacts, validation state | Evidence manifest | S1 prototype |
| Approvals | Exact-action gates with subject digest, eligible decider, decision, expiry | Approval | S1 prototype |
| Machines | A person's enrolled worker machines with heartbeat, registered repositories, capabilities | Machine | S1 |
| Decisions | A human's exact words recorded as a durable decision with scope and supersession | Decision | S1 |
| Project settings | Roles, policy version, environment version, pause, resume, archive | Project | S1 |
| Workspace settings | Invitations, roles, revocation, registered projects | Membership | S1 |
| Project proposals | Center-proposed project charters awaiting owner authorization, with a provisioning journal | Proposal | S2 |
| Cloud placement | A cloud pool as a run placement with data destination and budget | Placement | S2 |
| Knowledge | Reviewed claims with evidence, applicability, review date, conflicts | Knowledge item | S2 |
| Observer proposals | Attributed claims and decision candidates from an opt-in room observer | Proposal | S3 |
| Operations | Health, backup age, reconciliation, deletion previews for the operator | Report | S3 |

## Navigation rail

The rail lists rooms, projects, runs, and the inbox. Unread counts use the last seen room sequence. Mentions and questions create inbox items. Presence is a `last_seen` indicator with a 60-second freshness window and is never proof that a worker is available. Workers have a separate heartbeat shown on the machine, not on the person.

## Right pane

The right pane opens exactly one of a thread, a run, an evidence manifest, or an approval. It never becomes a second timeline. On phones it is a full route with a back control, and focus returns to the trigger when it closes.

## Audience rule for agents

A center answer posted in a general room cannot reveal project-only records even when the asker could read them. The interface must move such a question to the project room rather than answer with a leak. Design the scope preview so the audience is visible before spending.
