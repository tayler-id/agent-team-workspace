# Local-room L2 security notes

head: d2e213153ce0ac8b0ec7309f68ac2e1509273875
recorded_at: 2026-09-21T02:18:00Z

## Risk floor

R2: the change adds a migration, durable data, a public contract change (one reason code, a 409 answer, one operation) and a process composition. It adds no dependency, credential, production identity, model call, upload path, search path or task authority.

## Findings

- `pnpm audit --json` at this head: 0 vulnerabilities across 291 dependencies (`audit.json`); `pnpm-lock.yaml` is byte-identical to main.
- Credential-pattern scan (`git grep` at the head for AWS access keys, PEM private-key headers, Slack, GitHub and Google token literal signatures): zero matches.
- `git remote -v`: no remote configured; nothing was pushed, no PR was opened, no merge was made.
- Storage runs as `agora_app`, the non-owner role. Migration `0001_local_room.sql` grants it `SELECT` and the `next_seq` column `UPDATE` on `local_room.room`, and `SELECT` plus `INSERT` on `message`, `event` and `command_receipt`. No `DELETE`, no whole-row `UPDATE`, no `INSERT` on the room table; `packages/storage/test/local-room.pg.test.ts` proves the 42501 denials.
- Row-level security is enabled and forced on all four tables with policies keyed on `agora.scope_id` = project id, so the owner is confined too. The test proves another project sees no room and cannot forge a receipt or a room into the fixed project, and the `BYPASSRLS` guard negative proves the denial depends on the policies. Negative N3 in `gate-negatives.log` shows the test turning red when row security is not enabled on the room.
- Immutability: `BEFORE UPDATE OR DELETE` triggers raise for every role, the owner included; negative N2 shows the owner delete succeeding when the trigger is removed.
- The service derives the author; the fixed human principal is the only actor and a client-offered `author` is 400 at the wire. The request digest is computed by the center over the validated command, never accepted from the client.
- Bounds are enforced twice: 1 to 4096 scalars and at most ten citations at the wire (400 before storage) and by table checks (`length`, `octet_length` at 16 KiB, `jsonb_array_length`); negative N4 shows the store test turning red when the table check is removed.
- The snapshot is read only, under repeatable read, and bounded to the latest 1000 messages; it takes no client parameters, so nothing in a request can widen it beyond the fixed room.
- The process still binds `127.0.0.1` only (`apps/center/src/main.ts`). Host/Origin checks, request-size limits and rate limits remain L3 obligations and are not claimed here. Anyone able to reach the loopback port can send as the fixed principal; that is the stated opt-in, local-development scope.
- No fault injection hook exists in production composition: the rollback test throws inside a test-owned transaction callback.
- Destructive git operations during evidence capture were limited to `git checkout -q -- <one file>` after each of the eight deliberate negatives in `gate-negatives.log`, each proved byte-identical afterwards, and the recorder's own throwaway `git worktree add/remove` pair, pruned afterwards.
- Preservation commits `4a77a8f` and `99aa4f7` were read with `git show` only and are not ancestors of this branch; zero bytes were carried from them.
