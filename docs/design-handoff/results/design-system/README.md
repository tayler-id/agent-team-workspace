# Agora design system

Agora is an invitation-only communication center where a small developer team talks with each other and with visible agents, asks questions answered from the shared record, and launches bounded coding work from a thread. Agora owns the record. GitHub owns the code and the merge. A person's own machine runs the work.

Start with [Screen-Room](components/Screen-Room/README.md) and follow the story: it is the `S1 prototype` set from the packet's screen inventory, drawn end to end on both viewports. Everything the packet says about what is built, in what order, with which words, is unchanged here. This system decides only how it looks.

## Components

Grouped as the packet groups them. Chrome: NavigationRail, RoomHeader, OfflineBanner, SearchResult, MemberRoleControls, MachineStatus. Timeline: TimelineMessage, AgentCard, TaskCard, RunCard, SystemEvent, Composer, ThreadPanel, Citation, PublicationStatus. Panes and sheets: TaskPane, RunPane, EvidenceCard, ApprovalCard, LaunchPreview, RecoveryActions, ScopePreviewList, TaskEditor, CredentialConfirmation, DecisionRecord. Evidence: CommandOutput, DiffViewer. Foundations and identity: AgentIdentity, StateBadge, CheckOutcomeMark, Countdown.

## The story, in the order the packet asks for it

| Step | Screen | Workflow |
| --- | --- | --- |
| 1 | [Screen-SignIn](components/Screen-SignIn/README.md) | Invitation and sign-in |
| 2, 3 | [Screen-Room](components/Screen-Room/README.md) | Entering a project room, human conversation, the thread pane |
| 4 | [Screen-Ask](components/Screen-Ask/README.md) | Asking the center: the scope preview |
| 5, 6 | [Screen-Launch](components/Screen-Launch/README.md) | Creating a task, launching on a selected machine |
| 7 | [Screen-Run](components/Screen-Run/README.md) | Following and steering a run |
| 8 | [Screen-Recovery](components/Screen-Recovery/README.md) | Recovering a lost run |
| 9 | [Screen-Evidence](components/Screen-Evidence/README.md) | Reviewing evidence |
| 10, 11 | [Screen-Approval](components/Screen-Approval/README.md) | Approving publication, seeing the draft open |
| 12 | [Screen-Inbox](components/Screen-Inbox/README.md) | The inbox |
| all | [Screen-Phone](components/Screen-Phone/README.md) | The same story at 390 |

## The three rules

1. **Chat never authorizes.** Every consequential action is a previewed command with a receipt. Ask center opens a scope preview; Create task opens an editor; Run opens a launch preview; approval is a contract with the head in the button.
2. **Current state and history look different.** A run's chip is committed state from Control. The activity stream beneath it is history, numbered and immutable.
3. **Missing proof is a visible outcome.** Unknown, unconfirmed, lost, blocked and unavailable are neutral chips with the question glyph, at full weight, with a consequence line. Never a spinner.

## The look

One white shell with rounded corners on a warm off-white canvas, split by hairlines into rail, timeline and pane. Light, airy, rounded, tight. Black is the only action colour. Colour has exactly two other jobs and they never overlap: **pastels identify agents** and **one bright dot carries state**. Text is always ink or grey; a hue is never set on its own tint, and nothing is orange, rust, forest or brick.

**Surfaces.** `surface-base` is the canvas. `surface-raised` is the shell and every pane. `surface-inset` is the rail column, the composer box and a person's typed card. There are no cards on cards: a typed work object in the timeline is a `radius-tile` tile with a hairline, or an agent's tinted tile, sitting flat in the white pane. Sheets take `surface-overlay` and the one shadow, `shadow-card`.

**Agents have identity.** Every agent is a pastel rounded square, `radius-control`, with its glyph in the soft medium hue of the same family, never black. `center` is always `agent-blue-tint`; the project agent is always `agent-violet-tint`, shown as `not_enabled` in the room header rather than hidden. Task agents take the next free pastel at spin-up from mint, sky, pink, teal and keep it for the run's whole life: in the rail, on the run card, on the typed card, in the run pane and in the inbox. Names are always ink. People are circles with initials on `surface-selected`, with a presence dot inside a 60-second window, and never take a tint. A reader tells agent from person by shape, and one agent from another by its pastel, before reading a word. The composer shows which agents are present in the room as stacked marks.

**State is a chip.** A neutral `surface-inset` pill with the word in `ink` and one 8px dot. Violet `signal-live` for running, awaiting an answer and countdowns, pulsing on running. Green `mark-pass` and red `mark-fail` for verdicts and deltas. A grey glyph for everything else. Chips never take a coloured fill, and there is no orange anywhere in the system. See [StateBadge](components/StateBadge/README.md).

**Actions.** `action` black pill with `on-action` text for the primary: Confirm and ask, Run on Ada-laptop, Grant · publish 4f2c1a9, Answer, send. `surface-inset` soft pill for the secondary: Ask center, Create task, Open. `surface-raised` with a hairline for the quiet one. Destructive is a ghost pill with `mark-fail` text. The button binds its subject.

**Typography.** Cal Sans UI for `display`, `title`, `room-title`, `item-title`, `numeral`, `meta`, `caps`, `chip`. Cal Sans Text for `body` and `quote`. IBM Plex Mono for `data`. Headings are two-tone: the lead-in in `ink-secondary`, the payload in `ink`, as in `acme /` **billing** and `Hi Ada,` **2 things need you**. Digests and amounts take tabular figures and the slashed zero; both Cal Sans families carry `tnum` and `zero`.

**Spacing and radius.** A 4px scale from `space-1` to `space-10`. `radius-card` 24 for the shell and sheets, `radius-tile` 16 for cards in the timeline, `radius-control` 12 for marks and rows, `radius-pill` for pills, chips, avatars and the phone nav.

**Motion.** 220ms with `cubic-bezier(0.2, 0.8, 0.2, 1)` for pills, sheets and pane changes. Press scales to 0.97. Lists reveal with a 40ms stagger. The live dot pulses at 1.6s. Under `prefers-reduced-motion` the pulse stops, slides become fades, stagger is removed. Nothing else moves.

**Fun, and where it stops.** One emoji, in the greeting. Tints, roundness, the dark pill nav on the phone. No illustration, no gradient, no mascot. The record itself is never playful: chips, digests and reason codes are set plainly.

## Departures from visual-theme.md

The packet's colour rules and non-goals are kept. These are the places this system departs, each on the strength of the references supplied on 20 Sep, and each is for the packet's authors to confirm or reject.

| Packet | Here | Why |
| --- | --- | --- |
| Radius 6px cards, 4px controls | 24 / 16 / 12 / pill | Every reference is built on large radii; it is most of what "modern and friendly" means in them |
| Never cycle a colour per item | Six identity tints, assigned per agent | The packet forbids this for state. Identity is a different job, the product spins agents up constantly, and a busy room needs it. Tints never carry state |
| Density: compact by default | Timeline compact, panes and cards breathe | Messages keep 8px vertical padding; the shell and typed cards take 16 to 20 |
| Body 14px | 15px | The references and the composer read better at 15; logged as a change |
| One shadow on overlay | `shadow-card` on sheets and phone frames | Same rule, larger value to suit the larger radius |
| Live signal is orange | Live signal is soft violet | Every reference shares a cool accent and none has orange; orange read as an error colour beside the pastels |

## Open findings

- `hairline` is 1.25:1 on white and may never be the only boundary of a control. Pills carry a fill or a hairline plus a fill shift, never a hairline alone.
- `ink-muted` is 2.81:1 and is used for disabled pill text and provisional text only. Placeholders use `ink-secondary`.
- This is a light-only system by decision. Dark would be a separate pass with its own pastels, not an inversion.
- The soft gradient canvas that several references use is forbidden by the packet. It is the first thing to argue about if the canvas feels flat.
- Every row of the packet's component inventory is built in this system, plus four S1 surfaces from the screen inventory that the component table does not list: TaskEditor, PublicationStatus, CredentialConfirmation and DecisionRecord. Still unbuilt: the S1 (non-prototype) routes for search, machines page, decision record page, project and workspace settings, repository registration, and the S2 and S3 surfaces.
