# Design assignment

What the design team produces, in what order, and how results come back without changing product authority. Product behavior stays owned by [the technical specification](../technical-spec.md); this packet and your designs propose presentation.

## Checklist

Produce these, in this order:

1. Read [the README](README.md), [product brief](product-brief.md), [audiences and authority](audiences-and-authority.md), and [interaction and state](interaction-and-state.md) before opening a design tool.
2. A theme file that turns [the visual theme](visual-theme.md) into tokens: surfaces, ink, hairline, signal, marks, type roles, radius, spacing, focus ring, in light and dark. Record any value you changed and why.
3. The S1 prototype flow, both viewports, as desktop frames at 1440x900 and phone frames at 390x844: invite and sign in, enter a room, converse, ask the center, create a task, launch on a machine, follow and answer a run, recover a lost run, review evidence, approve publication, see the draft open. One frame per step in [workflows](workflows.md), each showing the committed state after the step.
4. A component and state matrix for every row in the [component inventory](components.md): one column per state named there, including empty, loading, error, revoked, offline, historical, and unknown. Mark cells that are intentionally identical.
5. Clickable prototype paths for the two-person story: one path as the task owner, one as the approving maintainer, and one where the other reviewer is absent so the waiting state is visible.
6. Accessibility annotations on every frame: landmark roles, focus order, focus return target, live region text for each update, announced text for every badge and card, contrast values for any new color, and the reduced-motion variant of any motion.
7. The comprehension test from spec R23: script a proposed task, a failed check, a stale approval, and a recovery card. Two people who did not design them must name the owner, placement, current authority, missing proof, and safe next action without coaching. Record mistaken readings as well as completion time.
8. Content review of every label against [content design](content-design.md). Flag any place the design needed a word the packet does not define.

## Unresolved decisions to flag

Raise these rather than resolving them silently in the design:

- Whether a run board grouped by state (queued, running, waiting, review, done) belongs in S1 or whether the inbox plus room cards is enough. The research recommends testing both; the spec lists runs in the rail.
- Comfortable density and a manual density toggle. Compact is the S1 default.
- Final type families and their licensing.
- The live signal hue, if orange conflicts with a future brand palette.
- Whether the composer's Enter-to-send default should differ on phone.
- How much of a RunSpec to show inline on the launch preview versus behind a details control, given the rule that budgets and payer stay above the fold.
- Presentation of `unknown` and `unconfirmed` so that they never read as idle or done. Propose one treatment and test it in the comprehension script.

## Handing results back

- Deliver design files, exported frames at both viewports, the token file, the state matrix, prototype links, and the comprehension test record as a folder that lives beside this packet, for example `docs/design-handoff/results/`, or as links recorded in a short Markdown index in that folder.
- Do not edit the specification, plan, task breakdown, or decision trail. If a design finding argues for a behavior change, write it as a proposal with the affected requirement ID (for example R02 or R18) and the reason. The maintainers decide and, if accepted, append a decision row.
- Keep any new prose free of machine-specific paths and long dashes; the packet check rejects them, and the documentation gate runs on every Markdown file under `docs/`.
- Every screenshot or video you attach must name its viewport, mode (light or dark), and the state it shows.
- Ask questions in the project room, addressed to a maintainer. Reading is not resolution here either.
