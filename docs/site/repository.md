# Repository and tool map

Every executable, package and public driver needs a documentation home. This inventory links what exists to its explanation; planned roots below are explicitly not present at the atlas snapshot.

## Current packages and scripts

```inventory
```

The site inventory is `docs/site/site.json`. Build validation discovers current package roots and root scripts and rejects missing homes. New public tools inside a package must also extend [the CLI reference](cli.md) and [feature map](repo:agora/feature-map.json), not merely inherit the package's name.

`packages/client-core` and its fixture/boundary drivers landed after the atlas seed. They appear in the current inventory above; [synchronization](synchronization.md) separates their committed proof from the historical snapshot.

`packages/verification/test` now holds [task admission tests](test-first.md). The bounded public driver lives under `scripts/foundation*.mjs`; this is not the general U01b runner.

## Planned ownership roots

| Root | Why it exists | Documentation home |
| --- | --- | --- |
| `apps/web` | React browser projections of the core | [Architecture](architecture.md), S1 |
| `packages/adapters` | Keep artifact, email, model and GitHub SDK details private | [Architecture](architecture.md), S1/S2 |
| `apps/worker` | Standalone protocol client and isolated execution | [Workers](execution.md), S1/S2 |
| `apps/macos` | SwiftUI human client, not an execution agent | [Architecture](architecture.md), S2 |
| `tests`, `agora/project.json` | General registered CLI/scenario runners and evidence validation | [Verification](verification.md), S1 |
| `infra` | Compose, TLS, backup and recovery | [Operations](operations.md), S1 |

## Planned domain modules

Identity owns membership and device grants. Collaboration owns rooms and message revisions; its first port, `packages/domain/src/local-room/port.ts`, landed with the [local room contracts](local-room.md). Control owns tasks, leases, budgets and receipts. Policy makes pure decisions. Agents compile context and call providers without shell authority. Evidence verifies exact-head manifests. Projects owns registration and provisioning. Knowledge owns reviewed claims and invalidation. Integrations reconciles external effects. These are responsibilities in [R03](repo:docs/technical-spec.md), not a claim that modules already exist in source.

```flow
Contracts | Public values cross language and process boundaries.
Domain | Domain-owned interfaces express decisions, not SDK plumbing.
Adapters | Storage and external services implement those ports privately.
Applications | Center, clients and workers compose only their allowed boundaries.
```

## Authoritative document map

| Question | Owner |
| --- | --- |
| What behavior is required? | [Technical specification](repo:docs/technical-spec.md) |
| In what delivery order? | [Implementation plan](repo:docs/implementation-plan.md) |
| What exact task may close? | [Task breakdown](repo:docs/task-breakdown.md) |
| Why was a choice made? | [Append-only decisions](repo:docs/decisions.tsv), [research synthesis](research.md) |
| How must contributors work? | [Contributor rules](repo:AGENTS.md), [documentation contract](authoring.md) |
| What must be verified? | [Feature map](repo:agora/feature-map.json), [verification contract](verification.md) |
| What has landed? | [Atlas](atlas.md), linked committed code and task receipts |
| What should a design team receive? | [Design Handoff](handoff.md) |

The design baseline is not a progress tracker. Do not check milestone boxes merely because a task is merged, and do not copy historical “not started” prose over current code evidence.
