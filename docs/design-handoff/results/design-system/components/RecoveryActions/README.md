# RecoveryActions

The recovery sheet for a lost, blocked or failed run: last activity, lease expiry, cleanup state, the retained worktree path for the owner only, and three choices.
Every choice names its consequence. A fresh run gets a new ID and fence; the old run stays as history and can never publish. Missing observations render as unknown or unconfirmed, never idle or done.

## Do not

- Do not reuse a run ID.
- Do not remove a retained worktree silently.
