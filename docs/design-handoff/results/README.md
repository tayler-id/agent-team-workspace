# Design results

Results for the design assignment in the packet one folder up. Everything here proposes presentation. Product behavior stays owned by the technical specification, and nothing in this folder edits the specification, plan, task breakdown or decision trail.

## What is here

| Item | Where | Assignment step |
| --- | --- | --- |
| Token file, light theme | `design-system/tokens.json` | 2 |
| Brand book and usage rules | `design-system/README.md` | 2 |
| S1 prototype flow, desktop 1440x900 | `frames/screen-*.png` at 1x, `mocks/screens/*.png` at 2x | 3 |
| S1 prototype flow, phone 390 | `frames/screen-phone.png`, `mocks/screens/screen-phone.png` | 3 |
| Layout mocks of every component, 2x PNG, indexed | `mocks/README.md`, `mocks/components/*.png` | 3, 4 |
| Component and state matrix | `state-matrix.md` | 4 |
| Standalone previews of every component and screen | `design-system/components/*/preview.html` with `README.md` beside each. Each opens in a browser on its own and loads `design-system/tokens.css` | 4, 6 |
| Generated stylesheet for the previews | `design-system/tokens.css`, built from `tokens.json`, fonts relative to `design-system/fonts/` | 2 |
| Clickable prototype | The Agora Design System artifact on claude.ai, shared on request | 5 |
| Fonts, with license | `design-system/fonts/` | 2 |

The live artifact renders `design-system/` as a browsable page. Ask the author for the link; it is private until shared.

## Viewport, mode and state on every frame

All frames are light mode. The system is light only by decision.

| Frame | Viewport | State shown |
| --- | --- | --- |
| `screen-signin.png` | 1440x700 | Magic link entry and invitation acceptance, both before send |
| `screen-room.png` | 1440x900 | Room active, unread boundary at 4, thread pane open with 3 replies |
| `screen-ask.png` | 1440x900 | Scope preview sheet, 4 records selected, 2 omitted, partial coverage |
| `screen-launch.png` | 1440x900 | Launch preview, Ada-laptop selected, budgets reserved, attempt 2 of 2 |
| `screen-run.png` | 1440x900 | Run pane, running, question answered, check failed, budget used of reserved |
| `screen-recovery.png` | 1440x900 | Recovery sheet, lost, cleanup unconfirmed, worktree retained |
| `screen-evidence.png` | 1440x900 | Evidence pane, owner-attested, manifest valid, 1 blocked, 1 unavailable, 1 failed |
| `screen-approval.png` | 1440x900 | Approval pane pending 29 min, publication card draft open with CI pending |
| `screen-inbox.png` | 1440x900 | Inbox with 5 items, empty right pane greeting |
| `screen-phone.png` | 3 x 390x800 | Room route, run pane route with sticky head, inbox greeting |

## Decisions the packet did not make

Raised here rather than resolved silently, as the assignment asks.

1. Visual theme. The ledger-room direction in `visual-theme.md` was replaced by a light, rounded, three-pane shell after the product owner supplied references on 20 Sep. Radii are 24 for the shell and sheets, 16 for tiles, 12 for controls and marks, pill for chips and avatars. The packet's 6 and 4 are not used.
2. Live signal color. The packet's orange was rejected. Live is a soft violet dot. No orange, amber or rust appears anywhere.
3. Agent identity. Six cool pastels identify agents: blue for the center, violet for the project agent, mint, sky, pink and teal for task agents in spin-up order, stable for a run's life. The glyph on a mark is a soft hue of the same family. Names are always ink. The packet's rule against cycling a color per item was read as a rule about state; identity is a different job and tints never carry state.
4. State chips. A chip is a neutral pill with the word in ink and one 8px dot: violet live, green pass, red fail, grey glyph otherwise. Chips never take a colored fill. This departs from `radius-pill` badges with tinted fills.
5. Type. Cal Sans UI for interface text and Cal Sans Text for bodies, both OFL, shipped in `design-system/fonts/`. IBM Plex Mono for data. Body is 15px rather than 14. Both Cal Sans families carry `tnum` and `zero`, which the packet requires and its starting choice only assumed.
6. Run board versus rail. Runs are listed in the rail with the delegate's mark and a state dot; no separate run board was drawn. The inbox plus rail plus room cards carries the S1 story. This is the packet's open question and it remains open.
7. Density. Messages keep 8px vertical padding. The shell, panes and tiles take 16 to 20. A comfortable density toggle was not drawn.
8. Composer Enter behavior on phone. Kept identical to desktop, with the reversible preference. Not tested.
9. RunSpec on the launch preview. Machine, both budgets and payer stay above the fold; RunSpec details collapse below a visible digest.
10. Unknown and unconfirmed. Rendered as a neutral chip with the question glyph at the same weight as any other state, with a consequence line. Proposed, not tested.

## Not done

- The comprehension test from spec R23 has not been run. The script is ready in the frames: a proposed task (`TaskCard`), a failed check (`EvidenceCard`), a stale approval (`ApprovalCard` invalidated), a recovery card (`RecoveryActions`). Two people who did not design them are needed.
- Accessibility annotations are in each component README as rules, not on the frames as callouts. Focus order, live region text and announced text still need to be marked per frame.
- Dark mode. Light only by decision; dark would be a separate pass, not an inversion.
- S1 routes outside the prototype set: search page, machines page, decision record page, project and workspace settings, repository registration wizard, artifact viewer. S2 and S3 surfaces.

## Proposals for the maintainers

None of these change behavior; they are wording and presentation questions that came up while drawing.

- R18, contrast. The packet's hairline at 1.25:1 on white cannot be the only boundary of a control. Every control here carries a fill or a fill shift as well. Confirm that the hairline rule is for dividers only.
- R02, badges. Confirm that a state may be rendered as a neutral chip with a dot rather than a tinted badge.
- R06, live states. Confirm that only `running` and `awaiting_input` take the live signal, and that `verifying` reads as current rather than live.
