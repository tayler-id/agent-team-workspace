# Priority workflows

Each flow lists actors, entry condition, steps, system feedback, denials, failure and recovery states, and completion. Sources: spec [R02](../technical-spec.md#r02-browser-experience-and-user-journeys) required journeys, [R06](../technical-spec.md#r06-state-machines-and-invariants) states, [R07](../technical-spec.md#r07-ordered-api-event-and-retry-contracts) receipts, [R11](../technical-spec.md#r11-git-evidence-publication-review-and-merge) publication, [R15](../technical-spec.md#r15-failure-recovery) recovery. Screens for each step are in the [screen inventory](screens.md).

One rule applies to every flow. A mutation returns a receipt with a revision, and the interface shows the committed state from that receipt, not the optimistic guess. A lost network response is retried with the same command ID and can never duplicate a message, run, or push.

## Invitation and sign-in

| Field | Content |
| --- | --- |
| Actors | Workspace owner (inviter), invitee |
| Entry | Owner is signed in with authentication in the last 10 minutes |
| Steps | Owner enters an email and workspace role and sends. Invitee opens the link within 72 hours, completes email verification, accepts once. Project membership is a separate maintainer grant afterwards |
| Feedback | Invitation appears as pending with expiry. Acceptance shows exactly one membership. Login uses a magic link that expires in 10 minutes |
| Denials | Email does not match the verified recipient. Link expired or already accepted. Public sign-up does not exist |
| Failure and recovery | Expired invitation is re-sent as a new invitation, never revived. Five magic links per email per hour |
| Completion | Member sees general rooms and the projects they were granted |

## Entering a project room

| Field | Content |
| --- | --- |
| Actors | Project member |
| Entry | Member holds a project grant |
| Steps | Select the project room from the rail. Snapshot loads state and cursor. Subscription starts after the cursor |
| Feedback | Timeline with unread boundary at the last seen sequence, room header naming the project, lifecycle state, and main-agent identity (`not_enabled` in S1) |
| Denials | Non-member sees no room, no title, no count, no artifact. A workspace owner without a grant sees the same nothing |
| Failure and recovery | Cursor older than the 30-day replay floor returns `resync_required`; the client fetches a fresh snapshot and says so. A paused or archived project shows a read-only banner with the reason |
| Completion | Member reads and posts |

## Human conversation

| Field | Content |
| --- | --- |
| Actors | Two or more project members |
| Entry | Room is active, member may post |
| Steps | Compose plain text, safe Markdown, code fences, mentions, attachments. Enter sends, Shift+Enter breaks (reversible preference). Reply in a thread. Edit within 15 minutes; delete any time |
| Feedback | Pending message shows as unsent until the receipt arrives, then takes its committed sequence. Others see it within one second. Edits create revisions; deletes leave a tombstone |
| Denials | Observer cannot post. Message over 16 KiB, more than 20 mentions, or more than ten attachments is refused before sending. Rate limit returns a retry interval |
| Failure and recovery | Offline drafts stay visibly unsent in session storage and clear at logout. A retry after reconnection sends the same client message ID and never duplicates. Maintainer redaction replaces the body and marks dependent context and evidence invalid |
| Completion | Both members see the same ordered timeline and unread boundary |

## Asking the center agent

| Field | Content |
| --- | --- |
| Actors | Member with room access; the center agent |
| Entry | Member mentions the center in a thread or chooses Ask center |
| Steps | A scope preview lists the selected records (this thread's messages, chosen decisions, evidence) with author, time, and audience, plus the payer and the cost ceiling. Member confirms. A session card appears |
| Feedback | Queued or starting card within 10 seconds. Streaming text is a labelled provisional preview. The committed answer carries citations that link to stored record revisions, and a partial-coverage label when records were omitted for size |
| Denials | Observer cannot ask. A question in a general room cannot read project records; the interface offers to move it. Budget cap reached blocks with the cap named |
| Failure and recovery | No acknowledgment for 10 seconds marks the session unresponsive. Provider timeout records an incomplete answer and billable uncertainty; the human retries with a fresh session. There is no silent provider switch |
| Completion | A committed answer with citations, or an explicit statement that evidence is insufficient |

## Creating and owning a task

| Field | Content |
| --- | --- |
| Actors | Project contributor (becomes owner); optionally the center agent as proposer |
| Entry | A thread exists in an active project with coding runs enabled |
| Steps | Choose Create task from the thread, or accept a center proposal. Edit intent and acceptance criteria. Scope is a list of allowed paths. Save creates a task in `proposed` state |
| Feedback | Task card appears in the thread naming the human owner, project, origin message, intent, acceptance list, scope, and state |
| Denials | An imperative mention only opens this proposal and never launches. Empty acceptance criteria block the next step |
| Failure and recovery | Task moves to `blocked` with a reason and the prior state when a precondition fails; the owner sees the reason on the card |
| Completion | A `ready` task owned by one person, with at most one active run at a time |

## Launching on a selected machine

| Field | Content |
| --- | --- |
| Actors | Task owner; their enrolled machine |
| Entry | Task is `ready`; owner has a registered machine for this repository |
| Steps | Select a machine explicitly from the owner's own machines. Review the launch preview: RunSpec digest, repository, base commit, allowed paths, environment version, tool set, provider account, model route, payer, execution and verification budgets shown separately, attempt count. Confirm Run on my machine |
| Feedback | A run card appears in the thread within 10 seconds showing queued, then leased and preparing. Waiting for an offline machine is shown by name with the 15-minute deadline |
| Denials | Wrong owner or wrong repository is refused immediately. No machine-to-machine or local-to-cloud fallback exists. Two attempts per task in S1; a third needs a new explicit limit approval |
| Failure and recovery | Queue deadline expiry fails the run with `machine_unavailable`. Doctor failure on the machine produces a blocked check and no model execution |
| Completion | Run state `running` with a live activity stream |

## Following and steering a run

| Field | Content |
| --- | --- |
| Actors | Task owner or project maintainer; the task agent |
| Entry | A run is nonterminal |
| Steps | Open the run pane. Read typed activities: status, action, question, response, error, state. Answer a question before its deadline. Send an immutable steering prompt. Cancel |
| Feedback | Owner, delegate, placement, last progress time, state, and evidence link on the card. Thirty minutes without semantic progress shows stale. Heartbeats show liveness, never progress |
| Denials | A prompt cannot widen scope, tools, payer, or placement; the composer says so before sending. A non-owner non-maintainer sees no controls |
| Failure and recovery | Cancel revokes the lease within a second, then shows cleanup as confirmed, pending, failed, or unconfirmed. Awaiting input past its deadline counts against the 30-minute wall time |
| Completion | Run reaches `succeeded`, `failed`, `lost`, or `cancelled`, each with its reason |

## Recovering a run

| Field | Content |
| --- | --- |
| Actors | Task owner |
| Entry | Run is `lost`, `blocked`, or `failed` |
| Steps | Read the last observed facts: last activity, lease expiry, cleanup state, retained worktree path (owner only). Choose Retry fresh, Cancel task, or Keep for manual recovery |
| Feedback | A fresh run gets a new ID and fence. The old run remains as history and can never publish. A retained dirty worktree is labelled retained, never removed silently |
| Denials | Retry beyond the attempt limit needs a new approval. A stale worker's late events land in a historical channel and cannot satisfy a gate |
| Failure and recovery | Missing observations render as `unknown` or `unconfirmed`, never as idle or done |
| Completion | Task returns to `ready` with a new attempt, or to `cancelled` |

## Reviewing evidence

| Field | Content |
| --- | --- |
| Actors | A project maintainer who is not the task owner |
| Entry | A run succeeded and its manifest validated |
| Steps | Open the evidence pane. Read intent, exact base and head, changed paths with size and risk facts, each required scenario with its outcome, artifacts (screenshots at both viewports, video, accessibility results), trust class, cleanup outcome, then the diff last |
| Feedback | Every claim links to a hunk, check, or artifact. Unavailable, blocked, or missing scenarios are shown as failures, never hidden |
| Denials | `owner_attested` evidence alone never authorizes merge. A quarantined or missing artifact fails closed |
| Failure and recovery | Wrong head, altered digest, or stale producer invalidates the manifest with the reason shown |
| Completion | Reviewer proceeds to the publication approval or asks the owner for a fresh attempt |

## Approving publication

| Field | Content |
| --- | --- |
| Actors | Non-author project maintainer (approver); task owner (credential owner); the worker |
| Entry | Valid evidence for the exact head; overlap check passed or overlap review recorded |
| Steps | Approver reads the approval card: repository, branch, base and head, patch and evidence digests, policy, intended action, expiry. Approver grants with authentication in the last 10 minutes. Owner separately confirms use of their local Git credential. Worker rechecks live remote state, pushes, opens a draft, submits a read-back receipt |
| Feedback | Publication moves through awaiting approval, authorized, pushing, reconciling, then `draft_open` with the CI state labelled `CI pending` until required checks pass. The draft link appears on the card |
| Denials | Self-approval refused. Stale head, changed policy, changed role, or expired approval invalidates. One approval covers one effect only |
| Failure and recovery | Lost push response enters reconciling until read-back agrees; nothing is repeated blindly. Failure becomes `blocked` with a reason |
| Completion | A draft is open on GitHub. Review, promotion, and merge happen on GitHub. Agora marks the task completed only after it observes the merge and a post-merge scenario passes |

## Revocation

| Field | Content |
| --- | --- |
| Actors | Workspace owner or project maintainer; the revoked person |
| Entry | Owner chooses Revoke on a member with the exact subject and role shown |
| Steps | Confirm. One transaction invalidates sessions, subscriptions, worker grants, leases, pending approvals, and spending grants |
| Feedback | The revoked client receives a revoke event, clears memory and session drafts, and shows a signed-out state with the reason |
| Denials | The last workspace owner cannot be removed |
| Failure and recovery | Files already downloaded cannot be erased; the confirmation says so |
| Completion | New calls from the revoked identity are denied immediately |

## Project provisioning and cloud execution (S2)

| Field | Content |
| --- | --- |
| Actors | Member (asks), workspace owner (authorizes), GitHub organization administrator, contributor (cloud launch) |
| Entry | S2 units U10 to U12 and U14 are released |
| Steps | Member asks the center for a project. Owner edits the proposal (repository owner and name, private visibility, members, template, policy, spend) and confirms. The room shows each observed provisioning step. For cloud runs, the contributor selects Cloud and confirms the data destination and budget |
| Feedback | The project appears in `proposed` state at once and activates only after repository, checks, environment, and main agent pass onboarding. A cloud run shows a fresh microVM with the same card as a local run |
| Denials | No public repositories. No fallback from an unavailable local machine to cloud |
| Failure and recovery | Failed provisioning enters `repair_required` with the resume phase; an occupied repository name blocks. Uncertain cloud deletion shows `unconfirmed` and keeps counting cost |
| Completion | An active project room, or a cloud run's evidence and approval card in the originating thread |
