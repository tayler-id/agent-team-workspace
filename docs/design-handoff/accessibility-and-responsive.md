# Accessibility and responsive requirements

These are release gates, not preferences. Sources: spec [R12](../technical-spec.md#r12-verification-contract-for-agora-and-managed-projects) (UI changes require keyboard, screen-reader, contrast, two viewports, and a short video), [R18](../technical-spec.md#r18-accessibility-and-performance-budgets), and [R23](../technical-spec.md#r23-selected-browser-renderer-qualification).

## Requirements

| Area | Requirement |
| --- | --- |
| Standard | WCAG 2.2 AA. Zero critical or serious automated findings. Include the 2.2 criteria: focus not obscured, minimum target size 24x24 CSS px, no dragging-only interactions, consistent help placement |
| Keyboard | Every action reachable by keyboard. The rail, timeline, composer, and pane are landmarks. The timeline uses a roving tab stop over message groups with arrow keys inside a group. Enter opens, Escape closes and returns focus to the trigger |
| Focus | Visible 2px neutral ring on everything. Focus returns to the trigger after a pane, sheet, or modal closes. Opening a pane moves focus to its heading |
| Screen reader | Message groups are a list with author, time, and body. Cards announce kind, owner, state, and the next available action. State badges are text, not icon-only. Kickers are real text, not CSS-generated |
| Live updates | One polite live region per room, batching progress into a summary at most every few seconds. Never announce every streamed token. New messages announce a count, not each body. A question aimed at the current person is announced assertively once |
| Reduced motion | Honor `prefers-reduced-motion`: no pulse, no slide, fades only, no auto-scrolling except to the item the person requested |
| Contrast | 4.5:1 for text, 3:1 for UI parts and the live signal against its surface, in both modes |
| Color independence | No state, outcome, ownership, or authority is conveyed by color alone. See the list in [interaction and state](interaction-and-state.md) |
| Virtualization | The timeline is virtualized and still exposes semantic groups, a Load older messages control, stable focus, preserved text selection, and a stable scroll anchor while new items arrive |
| Update isolation | A run card update repaints only that card. Unrelated message rows do not change |
| Approval previews | Readable action, audience, cost, and consequence text before any confirm control |
| Viewports | Design and verify at 390x844 and 1440x900. Chrome and Safari, VoiceOver on macOS |
| Performance budgets | Room usable within 2.5 seconds on 10 Mbps; 350 KiB compressed initial JavaScript; input to visible state under 100 ms p95; 1,000 missed events resumed within two seconds without duplicates |

## Small-screen collapse

At 390px wide the three-pane layout becomes a stack of routes: rail as a bottom bar or drawer, timeline as the main route, and every pane as its own route with a back control in the header.

Dense records collapse in this order:

1. Run pane: a sticky one-line state header (state, owner, placement, last progress), then the activity stream, then controls pinned at the bottom. Budget meters move into a collapsible section.
2. Evidence pane: an accordion in review order: intent, head and base, changed paths, scenarios, artifacts, trust and cleanup, then the diff as its own route. Each section header shows its outcome mark so a reviewer can scan without opening.
3. Launch preview: budgets, payer, and machine stay above the fold; RunSpec details collapse below with their digest always visible.
4. Approval card: the bound subject and expiry are always visible; digests collapse to their first 12 characters with copy.
5. Tables become key-value lists. Digests, paths, and hashes wrap at any character and never overflow horizontally; command output keeps horizontal scroll inside its own box.

Never hide a state, an outcome, or a denial reason behind a collapse. Collapse details, not facts.
