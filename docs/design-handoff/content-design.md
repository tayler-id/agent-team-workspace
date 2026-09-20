# Content design

Words carry authority in this product. The interface must say who did what, what was observed, and what was not, in the same plain register everywhere. Sources: spec [R01](../technical-spec.md#r01-product-boundary-and-delivery-stages) principles, [R05](../technical-spec.md#r05-authoritative-records-and-access-paths), [R06](../technical-spec.md#r06-state-machines-and-invariants), [R07](../technical-spec.md#r07-ordered-api-event-and-retry-contracts).

## Canonical nouns

Use these words and no synonyms. Capitalize only at the start of a sentence.

| Noun | Meaning | Do not say |
| --- | --- | --- |
| workspace | The one deployment's membership and general rooms | org, team, tenant |
| project | A registered repository with its room and members | repo (the repository is a property of the project) |
| room | A timeline with an audience | channel |
| thread | A root message and its replies | conversation, topic |
| message | A person's words | post, comment |
| center | The workspace agent that answers questions | assistant, bot, AI |
| project agent | The project-main identity | copilot, teammate |
| task | A human-owned unit of work | ticket, issue, job |
| run | One attempt of a task | job, execution, session |
| attempt | Ordinal of a run within a task | try, retry (retry is the action) |
| session | One question or one run's model conversation | chat |
| machine | A person's enrolled worker | agent, worker (internal), device |
| placement | Where a run executes: a machine or a cloud pool | target, environment |
| evidence | A signed manifest for an exact head | proof, report, results |
| artifact | A file the evidence references | attachment, upload |
| check | A required scenario with an outcome | test (unless quoting the project) |
| approval | A human grant for one exact action | sign-off, LGTM |
| draft | The GitHub pull request Agora opens | PR, merge request |
| decision | A human's exact recorded words | note, memo |
| owner | The accountable human for a task | assignee |
| delegate | The agent or machine executing for an owner | assignee, worker |
| receipt | The committed result of a command | confirmation |

Implementation nouns that stay out of the interface: lease, fence, epoch, outbox, effect key, snapshot cursor. Show their consequences instead: "execution authority expired", "receipt pending", "reconnecting from your last position".

## Status labels

| Internal state | Label | Note |
| --- | --- | --- |
| `queued`, `waiting_for_machine` | Queued, waiting for machine Ada-laptop | Name the machine and the deadline |
| `leased`, `preparing` | Preparing on Ada-laptop | |
| `running` | Running | The only state that uses the live signal by default |
| `verifying` | Running checks | |
| `awaiting_input` | Waiting for your answer, 8 min left | Second person only when the reader can answer |
| `cancelling` | Cancelling, cleanup pending | Always show the cleanup state |
| `succeeded` | Succeeded, evidence ready | Never "done" or "complete" |
| `failed` | Failed: doctor_failed | Reason code in mono |
| `lost` | Lost contact with Ada-laptop | |
| `cancelled` | Cancelled by Ada | Name the human |
| `unresponsive`, `stale` | No acknowledgment for 12 s; No progress for 31 min | Times, not adjectives |
| `unknown`, `unconfirmed` | Cleanup unconfirmed | Never hide |
| `not_enabled` | Project agent not enabled in this release | For the S1 project-main identity |
| `owner_attested`, `trusted_ci` | Owner-attested evidence; Verified by CI | |
| `draft_open` with `ci: pending` | Draft open, CI pending | |
| `blocked`, `unavailable` | Blocked: missing_docker; Unavailable: swift_toolchain | Never a pass |
| `invalidated` | Approval invalidated: head changed | Always with the reason |

## Voice and tone

- Name the actor. "Ada launched run 2 on Ada-laptop", not "Run 2 was launched".
- Say what was observed and what was not. "Checks passed on head 4f2c1a9. Screenshot at 390x844 unavailable." Never fold the missing part into the passing part.
- Agents report; they do not think, believe, want, or promise. "The run reported 3 files changed", not "The agent thinks it fixed the bug".
- No exclamation marks, no apologies, no "oops", no praise.
- Second person only for the reader's own authority: "You are not the task owner, so you can approve this publication."
- Numbers as numbers. "Expires in 29 min", "USD 5.00 reserved".

## Warning and approval language

An approval card reads as a contract: the action, the exact subject, who may decide, what it permits, when it expires, and what it does not permit. Example:

> Approve publication of head 4f2c1a9 (base 91be0d3) to branch agora/task-7/run-2 on acme/billing. This lets Ada's machine push once and open one draft. Expires in 29 min. It does not promote, merge, or bypass checks. You are eligible because you are a maintainer and not the task owner.

A destructive confirmation names the loss: "Revoke Ben from the workspace. Ben's sessions, worker grants, leases, pending approvals, and spending grants end now. Files Ben already downloaded cannot be recalled."

## Trustworthy error text

Reason code, what happened, what to do, correlation ID. Example: "scope_mismatch. This question is in a general room and would need records from project billing. Ask it in the billing room. Ref 7c1e...". Never blame the person, never invent a cause, never show a secret.

## Examples

| Avoid | Use | Why |
| --- | --- | --- |
| Your AI teammate is working on it | Run 2 running on Ada-laptop, last progress 40 s ago | Names delegate, placement, and time |
| Done! | Succeeded, evidence ready for review | Success is a state with a next step |
| Approve | Approve publication of head 4f2c1a9 | The button binds the subject |
| Agent needs your help | Question from run 2, 8 min left: which fixture database? | Owner-facing, deadline visible |
| Tests skipped | Check billing-smoke unavailable: no Docker on Ada-laptop | Unavailable is never neutral |
| Sync error | resync_required. Reconnecting from your last position | Says what the client will do |
| Retry | Retry fresh (new run, same machine) | States the consequence |
