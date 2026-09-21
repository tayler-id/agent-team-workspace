# Local-room L1 security notes

head: 4af669a8799137d58a743c3f104384586f3e496f
recorded_at: 2026-09-21T00:45:59Z

## Risk floor

R2: the change adds a public contract family and one authored HTTP operation. It adds no dependency, credential, migration, production identity, model call, upload path, search path or task authority.

## Findings

- `pnpm audit --json` at this head: 0 vulnerabilities across 291 dependencies (`audit.json`); the lockfile is byte-identical to the parent.
- Credential-pattern scan (`git grep` at the head for AWS access keys, PEM private-key headers, Slack, GitHub and Google token literal signatures): zero matches.
- `git remote -v`: no remote configured; nothing was pushed, no PR was opened, no merge was made.
- The new route is served only by the existing center process, which binds `127.0.0.1` (`apps/center/src/main.ts`); the family description states the loopback-only, opt-in scope. Host/Origin checks, request limits and the fixed local project identity are L2 and L3 obligations and are not claimed here.
- The command never carries an author or actor; `RoomAuthor` exists only on persisted records. A client-offered author is rejected as an unknown field (400, proven by `apps/center/test/local-room.test.ts` and `local-room-command-unknown-field`).
- The body is bounded to 4096 Unicode scalars in both consumers and is described as text, never markup; rendering safety belongs to L4.
- The only adapter composed is `unsupportedLocalRoom`; a well-formed command reaches no storage, so no data can be written through this slice.
- Destructive git operations during evidence capture were limited to `git checkout -q -- <one file>` after each of the four deliberate negatives in `gate-negatives.log`, each proved byte-identical afterwards, and the recorder's own throwaway `git worktree add/remove` pairs, pruned afterwards (`git worktree list` and the temp directory are clean).
- Preservation commits `4a77a8f` and `99aa4f7` were inspected read-only and are not ancestors of this branch (`preservation-inventory.md`).
