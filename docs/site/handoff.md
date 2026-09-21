# Design Handoff

A shareable entrance for the team designing Agora's product experience. Start here, then use the repository document map rather than guessing which design note is authoritative.

> The detailed portable packet under `docs/design-handoff/` landed independently at revision `57b9db6` and is linked below as ordinary documentation pages. Its own product snapshot remains `606cba2`. The site renders the committed packet without copying its content into a second authoring tree; no product screen is implied to be built.

## Design results: the approved starting direction

[The committed design results](repo:docs/design-handoff/results/README.md) are the **approved starting direction for implementation**, not a finished or final design. They fix real choices, a light-only theme, a token set and font pair, agent-identity colors, and a neutral-chip state language, that the earlier packet had left open. Preserve them as the working baseline rather than reopening choices they already made. They still need browser, accessibility, comprehension, and product-owner review before any of it is final acceptance; [the component and state matrix](repo:docs/design-handoff/results/state-matrix.md) lists coverage, and the results README's own "Not done" section names the outstanding review steps. Nothing here edits the specification, plan, task breakdown, or decision trail; product behavior stays owned by [the technical specification](repo:docs/technical-spec.md).

## Read in this order

1. [Introduction](introduction.md): the product's purpose, audience and honest availability.
2. [Roles and workflows](workflows.md): who owns work and which actions need human confirmation.
3. [Progress atlas](atlas.md): target connections and the small actual implementation scope.
4. [Repository document map](repository.md#authoritative-document-map): specification, plan, task breakdown, decisions, research, contributor rules and feature map.
5. [Mental model and terminology](concepts.md): task/run/session/approval distinctions that visual language must preserve.
6. [Authorization and agent hierarchy](authorization.md): workspace center versus isolated project-main identities.
7. [Verification contract](verification.md): literal public behavior and proof, not screenshots alone.
8. [Design results](repo:docs/design-handoff/results/README.md): the approved starting visual direction, above, and what it still needs before final acceptance.

## Product information architecture

The specified browser experience has rooms/projects/runs/attention navigation, a room timeline in the center, and a thread/run/evidence/approval detail pane. On a narrow screen that detail pane becomes a route with a back action. Conversation remains the primary surface; a task card opens detail without creating a separate job dashboard.

```flow
Find the conversation | Select an authorized room, project or attention item.
Read and discuss | Follow the ordered timeline and focused thread.
Understand the action | Inspect owner, placement, scope, state and missing evidence.
Act deliberately | Ask, propose, confirm, stop or review through the same coded authority.
```

This is the production design, not the layout of the fixture or a promise that these controls already exist.

## Surface and state inventory

The packet must cover invitation and sign-in, project registration, room/thread/search/composer, answer sessions, task/run cards, evidence, exact-action approvals, worker availability, recovery and operator health. Every consequential surface needs empty, loading, pending, denied, failed, unavailable and recovery states as applicable.

Agent cards distinguish status, action, question, result and error. A task in review is not a merged result. Lost, stale, blocked and unknown must not look like success. [R02/R06/R18/R23](repo:docs/technical-spec.md) owns the full behavior and accessibility constraints.

## Constraints versus open choices

**Fixed:** human ownership and merge, explicit scope/placement/budget, no authority by chat text, no private-room leaks, keyboard and screen-reader operation, reduced motion, narrow-screen comprehension, and clear evidence/availability labels.

**Approved as a starting direction, not yet final:** [the design results](repo:docs/design-handoff/results/README.md) already fix typography (Cal Sans UI/Text plus IBM Plex Mono), a light-only theme, agent-identity colors, and the neutral state-chip language described there. Treat these as the working baseline to refine through browser, accessibility, comprehension, and product-owner review, not as choices still open for a fresh proposal.

**Still open:** icon language, a comfortable/compact density toggle, run board versus rail, dark mode, and diagram treatment remain undecided; [the results README's "Decisions the packet did not make" and "Not done" sections](repo:docs/design-handoff/results/README.md) name most of these, though icon language and diagram treatment are absent from the packet entirely rather than listed as open. The field guide's restrained green/neutral style is a documentation choice, not a pre-approved product design system. A design-system proposal must preserve state distinctions and test comprehension, not copy Noodle branding or this site's chrome blindly.

## Shareable research

[The research index](research.md) links repository-owned synthesis and original public citations. Larger local reports are outside this site and require a separate confidentiality and provenance review before sharing. No private archive paths are exposed here.
