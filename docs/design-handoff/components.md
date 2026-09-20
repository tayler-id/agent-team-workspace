# Component inventory

Behavior and variants for the parts the [screens](screens.md) share. No production component exists; these are design targets. The React client is qualified in U01d against a fixture before product screens expand, so components must survive a virtualized timeline of 50,000 messages with four concurrently updating run cards. Sources: spec [R02](../technical-spec.md#r02-browser-experience-and-user-journeys), [R11](../technical-spec.md#r11-git-evidence-publication-review-and-merge), [R16](../technical-spec.md#r16-threat-model-and-security-requirements), [R23](../technical-spec.md#r23-selected-browser-renderer-qualification).

## Component inventory

| Component | Behavior | Variants and states |
| --- | --- | --- |
| Navigation rail | Lists rooms, projects, runs, inbox with unread counts. Keyboard reachable as one landmark | Expanded, collapsed, bottom bar (phone), offline, resync required |
| Room header | Project or room name, lifecycle state, main-agent identity, member count, search entry | Active, paused, archived (read-only), onboarding blocked |
| Timeline item, message | Author, time, body in safe Markdown, attachments as chips, edited marker | Own, other, pending unsent, edited, tombstone, redacted, unread boundary above |
| Timeline item, agent card | Card for status, action summary, question, result, or error. Raw output behind an artifact link | Center answer, project-main (S2), question awaiting answer with deadline, error with reason code |
| Timeline item, task card | Compact summary linking to the task pane | Proposed, ready, executing, review, completed, blocked, cancelled |
| Timeline item, run card | Owner, delegate, placement, state, last progress, evidence link, controls | Every run state in R06 plus stale, unresponsive, waiting for machine |
| Timeline item, system event | Membership change, redaction, resync, revocation | Informational; never a control |
| Composer | Text with safe Markdown, mentions, code fences, attachments; Enter and Shift+Enter with a reversible preference; drafts survive route changes | Idle, typing, over limit, offline unsent, rate limited, disabled for observers, steering mode (immutable prompt) |
| Thread panel | Right pane or phone route with root and replies; focus returns to the trigger on close | Open, empty replies, root tombstone |
| Citation | Inline reference generated from a stored record ID; opens the exact revision | Message revision, decision, evidence, knowledge (S2); unresolved shows as plain text |
| Agent identity | Name plus a delegate marker; never a human avatar style | Center, project-main (`not_enabled` in S1), task agent, observer (S3) |
| Task card (pane) | Full task with intent, acceptance list, scope paths, dependencies, attempts | Same states as the timeline card plus edit mode |
| Run card (pane) | Sticky state header, typed activity stream, steering composer, budget used versus reserved | Live, terminal, historical |
| Evidence card | Manifest summary: head and base, trust class, scenario outcomes, artifacts, validation state | Valid, invalid with reason, upload pending, quarantined artifact |
| Approval card | Bound subject, eligible decider, expiry countdown, grant and deny | Pending, granted, consumed, denied, expired, invalidated, waiting for the other reviewer |
| Budget and placement confirmation | Machine list (own only, heartbeat age), execution and verification budgets, payer, attempt count, data destination (S2) | Ready, no machine, machine offline, cap reached, unpriced usage blocked |
| State badge | Word plus glyph for a closed state vocabulary; color only when live | Current, historical, live (running, awaiting input), terminal, unknown, unconfirmed |
| Check outcome mark | Word plus glyph for pass, fail, blocked, unavailable, infrastructure error | Required, optional |
| Search result | Type, title or snippet, room, time; access already filtered | Message, answer, task, evidence, decision, knowledge (S2) |
| Member and role controls | Role selector with exact subject shown; last-owner protection | Owner, member, observer; maintainer, contributor, observer; revoke |
| Machine status | Name, OS, heartbeat age, registered repositories, capabilities, doctor result | Online, offline, revoked, doctor failing with the named prerequisite |
| Command output | Command ID, redacted argv, exit code, duration, bounded output | Truncated marker, unavailable |
| Recovery actions | Retry fresh, cancel task, keep for manual recovery, with last observed facts | Lost, failed, blocked, cleanup unconfirmed |
| Countdown | Deadline for questions, approvals, queue wait, capability expiry | Running, expired |
| Scope preview list | Selected records with author, time, audience, trust class, omissions | Complete, partial coverage, audience restricted |
| Offline and resync banner | Connection state and required action | Offline with unsent drafts, resync required, revoked |
| Diff viewer | Read-only diff opened last in evidence review; every hunk mappable to a claim | Mapped, unmapped hunk highlighted by label |

## Rendering constraints

- Markdown is a safe subset. No raw HTML, no external image autoload, no unsafe URL schemes. HTML and SVG artifacts download rather than render.
- Links produced by an agent render as plain text. Only citations generated from stored IDs are clickable.
- A run-only update must not repaint unrelated message rows. Keep card state local to the card.
- Secret entry uses a dedicated masked form and is never a message.
- Every control that changes state shows a preview of its effect and returns a receipt.
