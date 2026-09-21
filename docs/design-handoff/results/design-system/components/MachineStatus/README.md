# MachineStatus

A person's enrolled workers: name, owner, OS, heartbeat age, registered repositories, capabilities, adapter versions, doctor result. Revoke is the one action.

## States

Online with heartbeat age; offline with last heartbeat and what queueing means; doctor failing with the named prerequisite and the checks it blocks; revoked with what ended.

## Do not

- Do not show a presence dot on a machine.
- Do not describe a missing capability as a skipped check.
