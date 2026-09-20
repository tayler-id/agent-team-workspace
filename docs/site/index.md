# Agora field guide

Agora is a planned invitation-only communication center for small developer teams. Shared conversation becomes bounded, human-owned work; agents propose and execute within explicit authority, and humans review and merge.

> No usable communication center exists yet. Only the non-production repository fixture and portable contracts have landed at the atlas snapshot. Client synchronization is In progress. No milestone is qualified.

## Two tracks, one growing site

- **Use Agora:** the complete installation, concepts, role workflows, CLI/configuration, cookbook and FAQ track follows in the independently gated documentation-corpus change. Today, only contributor fixture commands work.
- **Build and operate:** inspect [the repository foundation](foundation.md), [portable contracts](contracts.md) and [progress atlas](atlas.md). Architecture, production operations and recovery remain specified, not deployed.
- **Design Handoff:** the [committed portable packet](repo:docs/design-handoff/README.md) describes the planned product experience. It is not proof of implemented screens.

## The intended boundary

```flow
Conversation | People discuss goals and retain the shared record.
Human command | Confirm scope, owner, placement, tools and budget before execution.
Isolated attempt | An outbound local worker first, cloud later; neither owns durable truth.
Evidence and review | Inspect exact-head proof, obtain independent review, and merge as a human.
```

[The specification](repo:docs/technical-spec.md) owns behavior; [the plan](repo:docs/implementation-plan.md) owns milestones; [the task breakdown](repo:docs/task-breakdown.md) owns independently gated changes. The [documentation contract](authoring.md) requires an explanation and visual in the same change as implementation.

## Read locally

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
```

Open `http://127.0.0.1:4173`; Ctrl+C stops the loopback server. Set `DOCS_PORT` if occupied. `pnpm docs:build` creates ordinary self-contained HTML/CSS in `.docs-dist/`. No hosted service or external account is needed.
