# Local room header alignment

Task `agora-live-room-header-alignment`. Closes the `RoomHeader` gap noted in [`docs/site/local-room.md`](repo:docs/site/local-room.md#header), measured against [`docs/design-handoff/results/design-system/components/RoomHeader/`](repo:docs/design-handoff/results/design-system/components/RoomHeader/README.md).

## What changed

- `apps/web/src/components/App.tsx`: the crumb (`{header.project} · {header.room}`) is split into `<span className="crumb-project">` (grey) and `<span className="crumb-room">` (ink), matching the baseline's `acme /` grey prefix and ink room name. The project agent's `not_enabled` state gets its own explicit badge (`data-agent-state="not_enabled"`, text `project agent · not enabled`) instead of being folded into a parenthetical after the agent's display name; the agent name and the existing truthful local-development/no-model-provider detail stay, unabridged, as a separate line.
- `apps/web/src/fixture.css`: `.crumb`, `.crumb-project`, `.crumb-room` for the two-tone treatment; `.badge[data-agent-state="not_enabled"]` keeps the badge neutral (grey text, no capitalize transform, no color tint), matching the baseline's `chip hist` neutral style. No new color, border, or outline was introduced; the existing hairline/neutral-surface palette is unchanged.

Deliberately **not** added, per the design handoff's own Do-not list and the task's scope: a repository affordance, a search control, member identities beyond the existing member count, or new navigation. The design handoff's own preview also shows those elements, but they claim capabilities (repository binding, search, named members) this local-only single-person prototype does not have; adding them would be an untruthful claim, so they stay out of scope.

## Proof

- `red-green/web-red.log`, `red-green/web-green.log`: the recorder only carries `.ts` test paths (`apps/web/test/app.test.tsx` is `.tsx`), so the new test was hand-applied to a disposable worktree at parent `14a2e84`. Red: 1 failed (`room header two-tone crumb names the project agent as not enabled...`, missing crumb spans and `not_enabled` badge), 7 passed. Green at head `a95134f`: 8 passed.
- `desktop-1440x900.jpg`, `phone-390x844.jpg`: the real served room (`node scripts/local-room.ts start`) driven with `claude-in-chrome` (`chrome-devtools-axi` was unavailable in this session). Desktop 1440x900 and true phone 390x844 both show the two-tone crumb and the separate `project agent · not enabled` chip beside the `Active` lifecycle chip, with member count and unread intact.
- At 390x844 (actual CSS viewport 570x719 after window-manager rounding, confirmed via `window.innerWidth` and `.shell[data-viewport="phone"]`), computed styles show `.room-header` padding drops to the phone rule's `16px` and `h1` to `20px`, while `.crumb-project` renders `rgb(111, 111, 120)` (`--secondary`) and `.crumb-room` `rgb(20, 20, 20)` (`--text`), the same two colors at both widths.
- The accessibility tree (`read_page`) at phone width shows one `heading` node reading "Local project / Local room" containing the two crumb spans, the `not_enabled` badge as a sibling generic node, the lifecycle chip, member count, unread count and the `status` live region all present and in the same order as before this change. `read_console_messages` after a fresh navigation showed no page errors (only the extension's own content-script log).

## Left open

Per `docs/site/local-room.md`, `Composer` toolbar, timeline live-chip boundary and Cal Sans font delivery (blocked by the CSP's missing `font-src`) remain unimplemented; this slice only closes the `RoomHeader` crumb/agent-status gap.
