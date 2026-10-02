# TaskCard

The task's persistent summary in the thread: owner, state, current run, attempt count and the origin message, with the actions the state allows.
A task is owned by a person, always. At `proposed` the honest value is "no owner yet" and the first action is to take ownership. An imperative mention only opens the proposal and never launches.

## States

Proposed, ready, executing, review, completed, blocked with reason and prior state, cancelled by a named human. Only executing takes the live dot. Empty acceptance criteria block save and the card says so.

## Do

- Show the owner on every state.
- Name the blocking fact with its reason code and the state it came from.
- Say "waiting for a maintainer who is not Ada" so the reader knows whether they are the hold-up.

## Do not

- Do not call it a ticket or its owner an assignee.
- Do not take state from the delegate's last message.
