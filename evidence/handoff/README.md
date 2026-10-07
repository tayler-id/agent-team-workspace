# Agora handoff, 2026-10-02

Branch `fm/agora-handoff-consolidation`, task `agora-handoff-consolidation`. It starts from local
`main` at `e521cf815c9f0383feb110afabc1e8a45a9b1095` and merges every branch that still held
unlanded Agora work. Git can't name a commit inside that same commit, so the exact final head is
the one whose receipt `node scripts/local-checks.mjs verify fm/agora-handoff-consolidation`
reports. The served room code was last changed at `649f8c3`, and the evidence validator at
`549a219`. Later commits add only evidence and docs.

Nothing here is 100% done. An independent security review of `a226663` blocked landing on an
evidence-validator defect. The captain authorized fixing it before the approved merge, and the fix
is on this branch from `549a219`. The new head needs that reviewer's re-review before it lands.

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
That bundle uses the v1 manifest, which the fixed validator refuses as `unsupported_manifest`.

While resolving the snapshot poll, I also moved the identity read behind main's
disconnect-generation check. A snapshot response that arrives after Disconnect is discarded,
and now it can't set the instance id either.

## Proof at this head

- `pnpm typecheck`, eslint on the changed files, `pnpm web:test` (69 tests) pass.
- Served-room browser drive of drafts at 1440x900 and 390x844 with reload, same-port reset at
  cursor 0, and a held send replayed after reload with no duplicate:
  `evidence/local-room/session-drafts-integrated/README.md`.
- Evidence validator forgery fix (`549a219`). Before the fix, the real script passed every
  forgery the review reproduced: a bundle naming `package.json` or `/dev/null` as its own key,
  an artifact replaced with only its digest updated, and a signal-killed red. After the fix it
  refuses each one. The record has red/green, before and after logs from one reproduction
  script, and three guard negatives:
  `evidence/U01b/agora-s1-validate-project-evidence-forgery-fix/README.md`.
- Earlier validator negatives at `a226663`: `validator-guards.log` and
  `real-bundle-rejections.log` in this directory. They prove each check line was tested, and
  the review showed they were not sufficient: the tampering never updated a digest, so it never
  reached the gap.
- The full local-check gate (`node scripts/local-checks.mjs run`) on the final head. Its receipt
  sits in the git directory, not the tree.

Host note: the machine's default Node is 24.16.0. These runs used the official 24.21.0
`darwin-arm64` build from nodejs.org, checked against its `SHASUMS256.txt` and placed first on
`PATH`. This matches the precedent in `evidence/local-checks/gate/README.md`.
The first gate run, at `42bd807`, went red. `packages/verification/test/project.test.ts` lanes 1
and 2 reported `blocked_prerequisite` ("Install the locked Python requirements") because the
system Python lacked `jsonschema`, while the other 290 tests passed. The rerun used the venv from
the verify-agora setup step (`python3 -m venv .scratch/python`, install
`packages/verification/fixture/requirements.txt`, put `.scratch/python/bin` first on `PATH`).

## Open approvals (not given)

1. **Re-review of the evidence-validator fix.** Independent review `agora-handoff-security-review`
   of `a226663` blocked on findings F1-F3. The fix (`549a219`, evidence `de4f5fb`) needs that
   reviewer's re-review at this branch's final head; my own checks don't count. Scope:
   `scripts/validate-evidence.mjs`, `scripts/project-evidence.mjs`,
   `scripts/record-red-green.mjs`, `packages/verification/test/evidence-validator.test.ts`.
   Still open, and not claimed as fixed: the remaining F3 items (configuration, command and
   test patch aren't compared with the repository; no ancestry check) and F4 (a value-less
   `--head` falls back to the default). The trust class stays `owner_attested`: a signature
   proves the key holder signed the bundle, not that the tests were honest.
2. **Session drafts.** The same review passed the draft storage at `a226663`, with four
   non-blocking findings left unfixed on purpose. D1: a stale pending id can swallow a later
   identical message. D2: pending text outlives a reset in the same tab. D3: one pending slot per
   room. D4: a `sessionStorage` write error is not caught. Landing approval for private text in
   browser storage belongs to Firstmate and the captain.
3. **Code-block paint bug.** The decision is held by the captain under key
   `code-block-pre-wrap-tradeoff`. Options: ship `white-space: pre-wrap`, keep it as a known
   issue, or design a threshold or truncation variant. Nothing is implemented.
4. **Production preview.** The `pnpm web:build` output rendered blank under the strict CSP
   because Ajv compiles schemas with `eval`. Branch `fm/agora-production-browser-slice` builds it
   with the same build-time standalone validators the served room uses and keeps the CSP
   unchanged. `docs/site/local-room-web-shell.md` explains the fix and
   `evidence/U01d/production-browser-csp/` holds its proof. Its red/green receipt names fix head
   `1111c95` on base `15619b1`. The recorder signed it with the key it generated in the review
   checkout. Another clone's validator reports `producer_signature_invalid` with that clone's own
   key, or `stale_producer` when it has none. The pre-rebase
   receipt for `a9efaa6` is kept under `history/a9efaa6/`. The fix needs independent review
   before it lands. Do not loosen the CSP.

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
node scripts/validate-evidence.mjs --dir evidence/U01b/agora-s1-validate-project-evidence-forgery-fix \
  --head 549a21930b51f2694fdb551411499eeaadcb3889 --base a226663b308adfebe29a690344ea2a18ced8974b
bash evidence/U01b/agora-s1-validate-project-evidence-forgery-fix/repro/repro.sh  # forgery repro
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
   land that branch until the evidence-validator re-review in the handoff's "Open approvals"
   is recorded by someone other than the author. If you are asked to do that review, review
   only the listed files at that exact head and write the findings under evidence/.
2. Pick the next open S1 task from docs/task-breakdown.md in prerequisite order. Every behavior
   change needs a failing test watched red first, `node scripts/record-red-green.mjs` receipts
   under evidence/<unit>/<task>/, an agora/feature-map.json entry, and a docs/site page update
   with a visual (`pnpm docs:build`).
3. Use Node 24.21.0 exactly. Before handing back, run `node scripts/local-checks.mjs run` on your
   final commit and report the receipt.
4. Do not loosen the served-room CSP, choose the code-block wrap behavior, configure model
   providers or create remotes. Those decisions belong to the project owner.
```
