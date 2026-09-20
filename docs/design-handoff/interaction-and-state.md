# Interaction and state model

The interface shows several families of record that look similar but carry different authority. Confusing them is the main failure mode this product is designed to prevent. Sources: spec [R05](../technical-spec.md#r05-authoritative-records-and-access-paths), [R06](../technical-spec.md#r06-state-machines-and-invariants), [R07](../technical-spec.md#r07-ordered-api-event-and-retry-contracts), [R13](../technical-spec.md#r13-durable-decisions-knowledge-and-observer-lifecycle).

## Record families

| Family | What it is | Authority | How it must read on screen |
| --- | --- | --- | --- |
| Conversation message | A human's words, with revisions and tombstones | None. Text proposes | Ordinary timeline item with author, time, edited marker |
| Typed activity | A closed-kind fact from a session or run: status, action, elicitation, response, error, prompt, state | Immutable history | Stamped with kind, actor, and sequence. Never editable |
| Run card | A projection of the current run state with `run_revision` | Current state from Control only | Shows owner, delegate, placement, state, last progress, evidence link. An older projection never overwrites a newer one |
| Approval | An exact-action gate | Human authority for one effect | Shows the bound subject, the eligible decider, expiry, and the reason on denial or invalidation |
| Evidence | A signed manifest for an exact head | Proof, with a trust class | Shows `owner_attested` or `trusted_ci`, validation state, and each check outcome |
| Decision | A human's exact words, stored separately from any summary | Durable record | Quotes the words; shows scope, date, and supersession |
| Notification | An inbox item pointing at a record | None | Reading marks attention; the source record keeps its own state |
| Presence | `last_seen` within 60 seconds | None | A small neutral indicator on people only. Never on machines or agents |
| Unread state | Last seen room sequence | Per person | A boundary line in the timeline and a count on the rail |
| Provisional streaming | Provider text deltas | None; a preview | Visibly labelled provisional, in muted type, replaced by the committed response |
| Committed state | The snapshot after a receipt | Authoritative | Ordinary weight. The only thing that drives card state |
| Retry | A new run or session with a new ID | New attempt | The old attempt stays visible as history and cannot publish |
| Stale authority | Approval or evidence whose head, policy, role, or deadline changed | None any more | Marked invalidated with the reason; controls disabled |
| Historical record | Terminal runs, superseded decisions, tombstones, late diagnostics | History | Labelled as history. Never shown as the present |

## State rules the interface must honor

- Current state comes from the committed snapshot and receipts, never from the last prose activity. A status line that says "done" is history until the run state says `succeeded`.
- `unknown` and `unconfirmed` are rendered values. A missing observation never renders as idle, dead, or done.
- Liveness and progress are different. Heartbeats prove a worker is alive. Ten seconds without acknowledgment shows unresponsive; thirty minutes without semantic progress shows stale. Awaiting input and offline machine show their own reason instead.
- Reading resolves nothing. Only a decision, an answer, or a completion changes the source record.
- Offline: drafts are kept locally and shown unsent. No privileged command is ever shown as accepted while offline.
- A duplicate send returns the original receipt. The interface shows one message, one run, one push.
- Cancellation shows two facts separately: authority revoked (immediate) and cleanup (confirmed, pending, failed, unconfirmed).
- Budgets show execution and verification reservations separately and never imply that a cap is a measured sufficiency.
- A check outcome is one of pass, fail, blocked, unavailable, or infrastructure error. Skipped and neutral do not exist in Agora.

## Never implied by color or prose alone

Each of these needs a glyph or word and a text label that a screen reader announces:

- Whether a record is current or historical.
- Whether a check passed, failed, was blocked, or was unavailable.
- Whether evidence is owner-attested or from trusted CI.
- Whether an approval is pending, granted, consumed, or invalidated, and why.
- Which principal owns a task and which one is executing it.
- Whether a run is waiting for a machine, waiting for a human answer, or stale.
- Whether text is provisional streaming or a committed answer.
- Whether a citation resolves to a stored record or is plain text from the model.
- Whose account will be charged and how much is reserved.
