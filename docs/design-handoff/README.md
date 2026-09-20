# Agora design handoff

This packet gives a design team everything needed to start designing Agora's interface and experience: what the product is, who uses it, what every object means, how each workflow behaves, what to design first, and where every claim comes from. It is self-contained when copied out of the repository, and every fact in it traces to a repository document listed in the [source map](source-map.md).

Agora is an invitation-only communication center where a small developer team talks with each other and with visible agents, asks questions answered from the shared record, and launches bounded coding work from a thread. Agora owns the record. GitHub owns the code and the merge. A person's own machine runs the work.

## Truth labels

The packet uses two fixed vocabularies. Stage labels say when a surface ships: `S1 prototype` (design first), `S1`, `S2`, `S3`, `Deferred`. Status labels say what exists on committed `main` today: `Built`, `In progress`, `Planned`, `Not a goal`. At the base revision in `manifest.json`, only the repository foundation and portable wire contracts are Built. No screen exists. The framework-free client core is In progress. Everything a person will see is Planned, and this packet is how it gets designed ahead of implementation.

## Read in this order

| Step | File | What you get |
| --- | --- | --- |
| 1 | [Product brief](product-brief.md) | Purpose, principles, current stage, what is built, non-goals |
| 2 | [Audiences and authority](audiences-and-authority.md) | Every principal, what each sees and can do, the authorization matrix |
| 3 | [Information architecture](information-architecture.md) | Areas, navigation, panes, stage of each area |
| 4 | [Priority workflows](workflows.md) | Twelve flows with actors, steps, feedback, denials, recovery, completion |
| 5 | [Screen and surface inventory](screens.md) | Every surface, its data, actions, states, responsive behavior, stage, and the first prototype set |
| 6 | [Interaction and state model](interaction-and-state.md) | Record families, what is current versus historical, what color may never carry |
| 7 | [Component inventory](components.md) | Shared parts, their variants, rendering constraints |
| 8 | [Visual theme and art direction](visual-theme.md) | One recommended direction with starting tokens |
| 9 | [Accessibility and responsive requirements](accessibility-and-responsive.md) | Release gates for keyboard, screen reader, motion, contrast, viewports |
| 10 | [Content design](content-design.md) | Canonical nouns, status labels, voice, approval and error language |
| 11 | [Visual maps](visual-maps.md) | Six Mermaid diagrams: system, architecture, journey, lifecycle, memory, stages |
| 12 | [Design assignment](design-assignment.md) | The checklist, unresolved decisions, how to hand results back |
| 13 | [Source map](source-map.md) | Where each claim comes from |

## Design first

Design the `S1 prototype` set in [the screen inventory](screens.md#first-prototype) as one two-person story on both viewports: invite, talk, ask the center, create a task, launch on the owner's machine, follow and answer the run, recover a lost run, review evidence, approve publication, see the draft open. The story is drawn in [the journey diagram](visual-maps.md#conversation-to-work-journey). Do not start with search, settings, or any S2 surface.

Three rules to hold while designing, each explained in [interaction and state](interaction-and-state.md):

1. Chat never authorizes. Every consequential action is a previewed command with a receipt.
2. Current state and history look different. A run card shows committed state, not the last sentence an agent wrote.
3. Missing proof is a visible outcome. Unavailable, blocked, unknown, and unconfirmed are rendered words, never a spinner.

## Deliverables

The full list is in [the design assignment](design-assignment.md). In short: a token file in light and dark, desktop and phone frames for the prototype story, a component and state matrix, clickable prototype paths for owner, approver, and absent-reviewer cases, accessibility annotations on every frame, the two-person comprehension test record, and a list of decisions you had to make that the packet did not.

## How this packet is checked

`node scripts/verify-design-handoff.mjs` (from the repository root) checks required sections, relative links and anchors, Mermaid presence and diagram types, stage and status labels, machine-specific paths, placeholders, long dashes, the manifest, and the size limit of 1,000 meaningful lines and 25 files. `node scripts/test-design-handoff-checks.mjs` proves each check rejects a broken packet. `pnpm docs:check` runs markdownlint and the design gates over every Markdown file under `docs/`.
