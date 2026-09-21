# Component and state matrix

One row per component in the packet's inventory, plus the S1 surfaces from the screen inventory that the component table does not list. The preview column names the file in `design-system/components/`. States are the ones drawn in that preview; the packet's default states (empty, loading, error, revoked, offline) follow the shared treatment in `design-system/README.md`.

| Packet row | Preview | States drawn | Built |
| --- | --- | --- | --- |
| Navigation rail | `NavigationRail` | expanded, collapsed, bottom bar, offline, resync required | yes |
| Room header | `RoomHeader` | active, paused, archived read-only, onboarding blocked | yes |
| Timeline item, message | `TimelineMessage` | own, other, pending unsent, edited, tombstone, redacted, unread boundary | yes |
| Timeline item, agent card | `AgentCard` | queued, provisional, committed with citations, question with deadline, unresponsive, error, insufficient evidence | yes |
| Timeline item, task card | `TaskCard` | proposed, ready, executing, review, completed, blocked, cancelled | yes |
| Timeline item, run card | `RunCard` | running, awaiting input, lost, succeeded, historical; queued, preparing, cancelling via StateBadge | yes |
| Timeline item, system event | `SystemEvent` | membership change, redaction, resync, revocation | yes |
| Composer | `Composer` | idle, typing, over limit, offline unsent, rate limited, observer, steering | yes |
| Thread panel | `ThreadPanel` | open, empty replies, root tombstone | yes |
| Citation | `Citation` | message revision, decision, evidence, unresolved plain text; knowledge is S2 | yes |
| Agent identity | `AgentIdentity` | center, project agent not_enabled, task agents; people for contrast | yes |
| Task card (pane) | `TaskPane` | intent, acceptance, scope, dependencies, attempts, edit | yes |
| Run card (pane) | `RunPane` | live head, stream, question, response, error, historical late event, cleanup, budget, steering | yes |
| Evidence card | `EvidenceCard` | valid, invalid with reason, quarantined artifact, unavailable and blocked checks | yes |
| Approval card | `ApprovalCard` | pending, waiting for the other reviewer, granted and consumed, invalidated, denied, expired | yes |
| Budget and placement confirmation | `LaunchPreview` | ready, offline machine queue, no eligible machine, attempt limit | yes |
| State badge | `StateBadge` | live, current, terminal, unknown, historical, deltas | yes |
| Check outcome mark | `CheckOutcomeMark` | pass, fail, blocked, unavailable, infrastructure error; required and optional | yes |
| Search result | `SearchResult` | message, answer, task, evidence, decision; filtered count | yes |
| Member and role controls | `MemberRoleControls` | owner, maintainer, contributor, observer, revoke, last-owner protection, destructive preview | yes |
| Machine status | `MachineStatus` | online, offline, doctor failing, revoked | yes |
| Command output | `CommandOutput` | complete, truncated, unavailable | yes |
| Recovery actions | `RecoveryActions` | lost with last observed facts, unconfirmed cleanup, three choices | yes |
| Countdown | `Countdown` | running, estimate, expired | yes |
| Scope preview list | `ScopePreviewList` | complete, partial coverage, audience restricted | yes |
| Offline and resync banner | `OfflineBanner` | offline with drafts, resync required, revoked | yes |
| Diff viewer | `DiffViewer` | mapped hunk, unmapped hunk | yes |
| Task proposal editor (screens.md) | `TaskEditor` | empty acceptance blocks save | yes |
| Publication status (screens.md) | `PublicationStatus` | awaiting approval, pushing, reconciling, draft open CI pending, CI failed, blocked | yes |
| Credential confirmation (screens.md) | `CredentialConfirmation` | confirm, decline, expired | yes |
| Decision record (screens.md) | `DecisionRecord` | current, superseded | yes |

Cells intentionally identical across components: every loading state is the component's layout with `ink-muted` text and no spinner; every revoked state is the OfflineBanner revoked line above a read-only shell; every error state is a reason code in mono, what happened, what to do, and a correlation ID.
