# Agora handoff, 2026-10-02

Branch `fm/agora-handoff-consolidation`, task `agora-handoff-consolidation`. It starts from local
`main` at `e521cf815c9f0383feb110afabc1e8a45a9b1095` and merges every branch that still held
unlanded Agora work. Git can't name a commit inside that same commit, so the exact final head is
the one whose receipt `node scripts/local-checks.mjs verify fm/agora-handoff-consolidation`
reports. The served code was last changed at `649f8c3`; later commits add only evidence and docs.

Nothing here is 100% done. Two security approvals are still open (below), so this branch must
not land on `main` until both are given.

## What was integrated

Every merge is an ordinary merge commit, so each original branch head is an ancestor of this
branch. No original branch was moved, rebased, force-updated or deleted.

| Branch | Head | What it is | Merge |
| --- | --- | --- | --- |
| `fm/agora-s1-validate-project-evidence` | `d767ce0` | U01b.B02 general evidence validator (`scripts/validate-evidence.mjs`), recorder `manifest.json`, lanes 5-7 | `bf3fe3c`; conflicts in `AGENTS.md` and the docs page count (now 35) |
| `fm/agora-live-room-session-drafts` | `99d9707` | L4 unsent drafts and pending-send identity in `sessionStorage`, bound to the snapshot response's `x-agora-instance` header | `6574581`; real conflicts with the connection controls and delivery feedback already on `main` |
| `fm/agora-code-block-paint-fix` | `602f151` | Diagnosis notes only for the blank code-block paint bug. No code fix. | `850c913`; clean |

One integration fix was needed. The drafts branch saved a pending command id only when a send
posted at once. The connection controls on `main` can hold a send on `wait_connection` and post
it later on Reconnect. A reload during that later POST resent the text under a new id and
committed a duplicate. Commit `649f8c3` saves the pending id for a held send too. Red/green:
`evidence/local-room/session-drafts-held-send/` (red fails only the new test; green 39/39).
The same bundle passes `scripts/validate-evidence.mjs`.

While resolving the snapshot poll, I also moved the identity read behind main's
disconnect-generation check. A snapshot response that arrives after Disconnect is discarded,
and now it can't set the instance id either.

## Proof at this head

- `pnpm typecheck`, eslint on the changed files, `pnpm web:test` (69 tests) pass.
- Served-room browser drive of drafts at 1440x900 and 390x844 with reload, same-port reset at
  cursor 0, and a held send replayed after reload with no duplicate:
  `evidence/local-room/session-drafts-integrated/README.md`.
- Evidence validator negatives. `validator-guards.log` disables the head, artifact-digest and
  signature checks one at a time. Each turns its own lane red, and the restored file has the
  same SHA-256 and passes. `real-bundle-rejections.log` tampers a copy of a real committed bundle
  and gets `artifact_mismatch`, `wrong_head`, `wrong_base`, `missing_proof`,
  `producer_signature_invalid` and `unsupported_target`. Both logs are in this directory.
- The full local-check gate (`node scripts/local-checks.mjs run`) on the final head. Its receipt
  sits in the git directory, not the tree.

Host note: the machine's default Node is 24.16.0. These runs used the official 24.21.0
`darwin-arm64` build from nodejs.org, checked against its `SHASUMS256.txt` and placed first on
`PATH`. This matches the precedent in `evidence/local-checks/gate/README.md`.

## Open approvals (not given)

1. **Independent exact-head security review of the evidence validator.** The task requires it
   (`docs/task-breakdown.md`, `agora-s1-validate-project-evidence`). I found no review record for
   `d767ce0`, and my own checks don't count as that review. Scope for the reviewer:
   `scripts/validate-evidence.mjs`, `scripts/record-red-green.mjs`, `scripts/project.mjs`,
   `scripts/project-checks.mjs`, `packages/verification/test/evidence-validator.test.ts`, as
   merged on this branch (unchanged from `d767ce0` apart from the merge). Known weakness for the
   reviewer: the HMAC producer key is a per-checkout untracked file, so the signature proves only
   "recorded in this checkout", and a bundle from another checkout fails with
   `producer_signature_invalid`.
2. **Security-sensitive landing approval for session drafts.** This change stores private unsent
   text in the browser. Firstmate's last review instruction to that task said explicit landing
   approval is required after an exact-head review. That approval is not on record. Review scope:
   `apps/web/src/host/live.ts`, `scripts/local-room-service.ts` (identity header) and the merge
   resolution in `6574581` plus `649f8c3`.
3. **Code-block paint bug.** The decision is held by the captain under key
   `code-block-pre-wrap-tradeoff`. Options: ship `white-space: pre-wrap`, keep it as a known
   issue, or design a threshold or truncation variant. Nothing is implemented.
4. **Production preview.** The `pnpm web:build` output renders blank under the strict CSP
   because Ajv compiles schemas with `eval`. The served dev room avoids this with standalone Ajv.
   A fix is not approved. Do not loosen the CSP.

## Not re-verified here

- The first-slice L4 predicates in `.agents/skills/verify-agora/SKILL.md` still expect the old
  aggregate `1 pending command` text and a clean console. Delivery feedback replaced that text,
  and a known `data:` font CSP error now appears. I added a note and did not rewrite the recipe
  without re-running it.
- `scripts/test-design-checks.mjs` has failed on `main` since D69, independent of this branch.
- Draft bundles recorded before the validator have no `manifest.json` and fail validation as
  `missing_proof`. That is expected, not tampering.

## Remaining product work

- S1 tasks with retained evidence: bootstrap repository, publish portable contracts, isolate
  client core, enforce test first, isolate development, lint application architecture (U20), and
  validate project evidence (review pending). Every other `agora-s1-*` task in
  `docs/task-breakdown.md` is open, starting with `agora-s1-qualify-trusted-checks`. All S2 and
  R26 work is open. `docs/site/progress.md` tracks the unit view.
- Local room: L4 still needs retained latency, bundle and replay measurements and a VoiceOver
  pass. L5 still needs cross-tab coordination of independently triggered actions, broader user
  acceptance and independent review (`docs/site/local-room.md#implementation-status`).

## Copies of the repository at handoff

Read-only inventory taken at the start of this task. I cleaned up no copies; Firstmate owns
guarded cleanup after landing.

- Primary checkout: on `main` at `e521cf8`, clean.
- Slot 1: `fm/agora-code-block-paint-fix` at `602f151`, clean. Its one commit is merged here.
- Slot 2: `fm/agora-s1-validate-project-evidence` at `d767ce0`, clean. Merged here. Its untracked
  `.scratch/producer.key` is the only key that validates the committed U01b bundle.
- Slot 3: `fm/agora-live-room-session-drafts` at `99d9707`, clean. Merged here.
- Slot 4: belongs to another active task. Not inspected.
- Slot 5: this task. It was a detached copy at `842a944`, already reachable from `main`.
- No other local branch has commits that `main` lacks. One stash exists,
  `docs-check-baseline-probe-1790229994` on `fm/agora-web-root-test-environment`. I left it alone.

## Start and verify

```sh
pnpm install --frozen-lockfile
node scripts/ci-doctor.mjs --json          # needs Node 24.21.0 exactly
pnpm check                                  # lint, typecheck, docs, contracts, all tests
pnpm web:test
node scripts/local-room.ts doctor
node scripts/local-room.ts start --instance dev   # open the printed url
node scripts/local-room.ts stop --instance dev
node scripts/validate-evidence.mjs --dir evidence/local-room/session-drafts-held-send \
  --head 649f8c39bd9e4efecc7175c8aa13fa63e5a239fd --base 850c91336750f8d4d5568c923b7e5a5ad859cfcd
node scripts/local-checks.mjs run          # exact-head receipt; verify with `verify HEAD`
```

`.agents/skills/verify-agora/SKILL.md` has the full Doctor, Launch, Drive, Evidence and Cleanup
recipe. `AGENTS.md` is the contributor entry point.

## Prompt for the next agent

```text
You are taking over the Agora repository. Read AGENTS.md, then evidence/handoff/README.md, then
docs/technical-spec.md and docs/task-breakdown.md. Work only on your own branch. Never push or
force-update, and never delete any branch, stash or copy.

1. Run `node scripts/local-checks.mjs status` and `verify fm/agora-handoff-consolidation`. Do not
   land that branch until both security approvals in the handoff's "Open approvals" are recorded
   by someone other than the author. If you are asked to do one of those reviews, review only
   the listed files at that exact head and write the findings under evidence/.
2. Pick the next open S1 task from docs/task-breakdown.md in prerequisite order. Every behavior
   change needs a failing test watched red first, `node scripts/record-red-green.mjs` receipts
   under evidence/<unit>/<task>/, an agora/feature-map.json entry, and a docs/site page update
   with a visual (`pnpm docs:build`).
3. Use Node 24.21.0 exactly. Before handing back, run `node scripts/local-checks.mjs run` on your
   final commit and report the receipt.
4. Do not loosen the served-room CSP, choose the code-block wrap behavior, configure model
   providers or create remotes. Those decisions belong to the project owner.
```
