# Troubleshooting and FAQ

Use failure states as information. A missing tool or unqualified milestone must not be translated into a passing release.

## Can I use Agora with my team today?

Not yet. You can read this site and run foundation checks. There is no product login, invitation, room timeline, worker installer or hosted deployment. [The atlas](atlas.md) distinguishes the two landed foundation tasks from the unfinished 22 milestones.

## Can I send a message to a room?

In the local development room, yes. Run `node scripts/local-room.ts start` and open its printed URL, or send through the CLI. The [local room](local-room.md) persists messages in PostgreSQL and resumes committed events after reconnect or ordinary stop/start. The page is L4's first slice of the apps/web room shell, not a finished room UI or a production deployment. The rest of L4 and L5's bounded local answer remain.

## The site says Built. Why is S1 still incomplete?

Built applies to the named scope only. A health fixture or contract generator can be built while the containing milestone still lacks replay, guards, integration lanes or independent qualification. “Two tasks landed” is not a percentage of product completion.

## Why does `agora project doctor` not work?

Its report schema is published, but the binary and lifecycle commands are planned. Use the [current public drivers](cli.md), not a command copied from the future specification.

## PostgreSQL tests report a blocked prerequisite

Check `pg_ctl --version` and PostgreSQL 18 server binaries on PATH. Prefer `pnpm test` over invoking raw Vitest pg tests: the wrapper supplies a private cluster and required roles. Existing-server overrides must all refer to a disposable cluster because a negative test temporarily renames a role. Never point them at production.

## Swift generation or conformance is unavailable

Check `swift --version`, toolchain availability, and access to the pinned Swift packages on first build. Do not remove Swift checks or treat exit 3 as pass. The current receipts exercise macOS Swift; another host needs fresh proof. The build cache is not evidence.

## Docs build rejects a link or section

Read the named page and error. Local site links use `page.md#heading`; repository proof links use `repo:path/to/file`. Add required feature sections and a two-or-more-step `flow` fence. Do not add empty headings or a decorative picture to satisfy a check without explanation. [Authoring](authoring.md) owns the contract.

## Atlas companion drifted

Edit `docs/site/atlas.json`, then run `pnpm docs:atlas`. Never edit the generated Markdown mirror. Keep the snapshot revision honest: Built proof must exist at that committed revision.

## Is a worktree a sandbox?

No. Git worktrees share metadata. The planned worker combines a private mirror, isolated worktree, restricted container and host-owned credential brokers. Neither a worktree lock nor a green test is permission to publish.

## Will agents run or merge on their own?

The specified product requires explicit human launch, another human's exact-head publication approval, local credential-owner confirmation, and human review/merge. There is no automatic merge. Cloud execution in S2 is an explicit placement, not fallback from an offline laptop.

## Does memory automatically improve the agents?

No guarantee is made. S2 knowledge needs evidence, applicability and human activation. S3 observers propose; they cannot activate their own claims or rewrite policy. Read [memory boundaries](memory.md).
