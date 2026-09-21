# ApprovalCard

A grant for one exact action, written as a contract: action, repository, branch, base and head, patch and evidence digests, policy, proposer, eligible decider, expiry. The grant button binds the head.

## States

Pending; waiting for the other reviewer with the control disabled and the reason as the reader's own authority; granted; consumed; denied with the reason; expired; invalidated with the reason.

## Do

- Keep subject and expiry visible at 390; digests collapse to twelve characters with copy.
- State what the grant does not permit.

## Do not

- Do not hide a disabled control.
- Do not let an invalidated approval keep a live countdown.
