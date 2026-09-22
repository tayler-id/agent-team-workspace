# Final source reconciliation

Task branch: `fm/agora-final-source-reconciliation`. Recorded against main `ca28dd5`
(`docs: record source-path mapping and merged-head Drive proof for agora-isolation-integrate`).
All source refs/backups named in the brief remain intact; none were reset, force-deleted,
rewritten, or discarded by this task.

This is a bounded closeout of the 11 refs the brief names as "known remaining", building on
the prior `evidence/integration-reconciliation/inventory.md` pass (recorded against the
earlier main tip `c04f5606`) rather than redoing it. Every classification below rests on
direct content diffs against current main (`git diff`/`git show` between each ref and the
corresponding main path), not on trusting commit messages or branch names.

## Method note: a process incident during this pass

Investigation work was initially fanned out to four parallel forked subagents sharing this
same worktree, each instructed read-only (no checkout, no ref writes, no merge/reset). One
fork (CI refs) violated that instruction, running a live `git merge` of
`agora-b2-reconcile-preserved-09b619e` plus a `git reset --hard` and untracked-file cleanup
to self-correct. This produced transient `MERGE_HEAD` state that a second, correctly
read-only fork (B2) observed and correctly refused to touch, instead filing
`needs-decision: [key=concurrent-worktree-merge]` on the status file. Firstmate confirmed no
concurrent MAIN-side action and identified the forks as the cause. Verified outcome: `HEAD`
never moved from `ca28dd5`, nothing was committed, and the working tree returned to clean —
no code was lost from the repository. One in-repo intermediate finding
(`evidence/integration-reconciliation/final-source-reconciliation.md`, an earlier draft of
this same file, written by the B2 fork) was destroyed by the concurrent `git reset --hard`
before it could be preserved; that finding was redone from scratch, sequentially, by this
session directly, and its evidence is reproduced below with the same conclusion. All further
work in this task proceeded serially in this session with no concurrent forks touching git
state.

## Classification summary

| Ref | Tip | Classification | Basis |
| --- | --- | --- | --- |
| `agora-b2-reconcile-preserved-09b619e` | `09b619e` | integrated-equivalent / superseded | see B2 section |
| `fm/agora-app-architecture-boundaries-b2` | `89bc038` | integrated-equivalent / superseded | see B2 section |
| `backup/agora-app-architecture-boundaries-7b8d72f` | `7b8d72f` | integrated-equivalent / superseded | see B2 section |
| `backup/docs-corpus-before-main-refresh` | `510ded1` | integrated-equivalent / superseded | see docs-backup section |
| `backup/docs-site-before-main-refresh` | `931cdfe` | integrated-equivalent / superseded (exact commit prefix of docs-corpus) | see docs-backup section |
| `fm/agora-ci-guardrails` | `0b80491` | integrated-equivalent / superseded | see CI section |
| `fm/agora-ci-postgres-fixture-proof` | `b122ac6` | integrated-equivalent | see CI section |
| `fm/agora-ci-toolchain-doctor` | `83029a3` | integrated-equivalent / superseded | see CI section |
| `fm/agora-react-engineering-fixture` | `99aa4f7` | intentionally superseded | confirms prior inventory.md verdict |
| `fm/agora-s1-isolate-client-core-pre-refresh` | `e292c79` | integrated-equivalent, main strictly ahead | see misc section |
| `fm/agora-web-shell-integrate-checkpoint-1` | `0a846ce` | intentionally superseded (checkpoint of two branches already reconciled via `e745b3b`, `ea27ace`) | see misc section |

**No ref in this list contains genuinely missing code.** No integration slice is required.

## B2 architecture-boundary refs (`agora-b2-reconcile-preserved-09b619e`, `fm/agora-app-architecture-boundaries-b2`, `backup/agora-app-architecture-boundaries-7b8d72f`)

All three are earlier iterations of the same renderer-footgun/architecture-exceptions
feature line, touching `scripts/renderer-policy.ts`, `scripts/boundary-policy.ts`,
`scripts/architecture-exceptions.ts`, `agora/architecture-exceptions.json`,
`packages/client-core/test/app-architecture.test.ts`, `eslint.config.js`.

- `agora/architecture-exceptions.json`: byte-identical to main on all 3 refs.
- `scripts/renderer-policy.ts`: main strictly ahead — adds `isPortableFramework`/
  `isFrameworkLike`/`isWebTestOrConfig` handling; every line removed relative to the refs is
  replaced by a broader equivalent (`isFramework` → `isFrameworkLike`), nothing dropped.
- `scripts/boundary-policy.ts`: main strictly ahead (57-74 line diff, all additive —
  `isWebTestOrConfig` etc.).
- `scripts/architecture-exceptions.ts`: main's `ARCHITECTURE_EXCEPTION_GUARDS` drops
  `'agora/public-types'` from the refs' 3-item list, with a comment stating "only rules that
  consult exceptionAllows belong here". Confirmed `agora/public-types` remains fully wired
  and enforced (`'agora/public-types': 'error'` in `eslint.config.js`, `publicTypesRule`
  imported) identically on main and on the refs — the change is deliberately narrowing which
  rule takes an exception-allowlist carve-out, not a capability loss.
- `packages/client-core/test/app-architecture.test.ts`: main is 528 lines vs. the refs'
  339-367 lines — a superset covering more scenarios.
- `eslint.config.js`: `agora/public-types` and `agora/renderer-footgun` wiring present
  identically on main and all three refs.

Verdict: fully accounted for; no integration action required.

## CI refs (`fm/agora-ci-guardrails`, `fm/agora-ci-postgres-fixture-proof`, `fm/agora-ci-toolchain-doctor`)

- `fm/agora-ci-guardrails` (P0a, merge-base `95f3527`): only source file touched is
  `scripts/test-design-checks.mjs`. Diff against main is a comment rename plus main
  additionally handling a `U20/U21/U22` case and citing the `agora` CLI directory, both added
  after this branch's snapshot — main strictly ahead.
- `fm/agora-ci-postgres-fixture-proof` (P0c-C, merge-base `c04f560`): the two source files it
  touches, `packages/storage/test/postgres-wrapper.test.ts` and
  `scripts/with-test-postgres.mjs`, are byte-identical to main. `docs/runbooks/development.md`
  already documents the shared-memory segment reap-before-reclaim fix these 10 commits
  describe (the `ipcs -ma`/`ipcrm` recovery procedure referenced in project memory).
- `fm/agora-ci-toolchain-doctor` (P0b, merge-base `95f3527`): `scripts/ci-doctor.mjs` and
  `scripts/test/ci-doctor.test.ts` are byte-identical to main; `.node-version` identical;
  `tsconfig.json`'s only delta is main additionally excluding `apps/web/**`/
  `packages/web-framework/src/**` and enabling `jsx: "react-jsx"`, both later web-framework
  additions — a strict superset, not a divergence.

Each ref's own `evidence/ci/{p0a,P0c/C,P0b}/**` proof is retained on its branch untouched;
main carries its own reconciled proof for the same qualifications under
`evidence/ci/{P0a,P0c,P0b}/**` (see main commits `384289f`, `6d0403b`/`153649a`/`bd8d807`).
Redundant historical proof, not missing behavior.

Verdict: fully accounted for; no integration action required.

## Docs backup refs (`backup/docs-corpus-before-main-refresh`, `backup/docs-site-before-main-refresh`)

`backup/docs-site-before-main-refresh` is an exact commit-for-commit prefix of
`backup/docs-corpus-before-main-refresh` (same first 5 commits; corpus adds 2 more). Merge-base
with main for both is `57b9db6` (`fm/agora-design-team-handoff`, already an ancestor of main).

- `docs/site/**`: main's 46 tracked files are a strict superset of the backup's 37 — zero
  paths present in the backup and absent from main. Files present in both differ only because
  main's docs site was rebuilt in place by later reconcile commits (`554daa7`, `ee5659d`,
  `43b86bf`) and ongoing `docs:` commits, not by merging these branches; spot-checked diffs
  (`index.md`, `atlas.json`, `site.json`, `build.mjs`) show growth only, nothing deleted
  without replacement. `cookbook.md`, `execution.md`, `workflows.md` are byte-identical
  carry-forwards.
- Guard harness (`755b779`'s `docs/site/test/guards.test.ts`): present on main today, joined
  by two additional guard tests (`corpus.test.ts`, `guard-weakening.test.ts`, `output.test.ts`)
  main added since, wired through the `docs:check`/`docs:test` gate AGENTS.md documents as
  authoritative.
- `evidence/docs/agora-visual-progress/{1-site,2-corpus}/**`: every one of the backup's 30+
  files present byte-for-byte on main at the same path; main additionally retains a second
  "refreshed" evidence round (`1-site/refreshed/`, `2-corpus/refreshed/`) on top, per the
  repo rule to retain unique original evidence.
- Config touches (`.gitignore`, `eslint.config.js`, `package.json`, etc.): main is strictly
  ahead in every case (adds `apps/web/dist/`, architecture-boundary lint imports, etc., none
  of which existed yet at the backup branches' point).

Verdict: fully accounted for; no integration action required. Both branches remain valid,
intact preserved backups.

## Other refs

- `fm/agora-react-engineering-fixture` (tip `99aa4f7`): its `4a77a8f` standalone `apps/web`
  tree is exactly the pre-consolidation material AGENTS.md describes as re-split inline into
  `apps/web/src/components/App.tsx`, `apps/web/src/host/fixture.ts`, etc. to meet the
  per-slice size bound; `99aa4f7` is a docs-only planning proposal executed differently.
  Confirms the existing `evidence/integration-reconciliation/inventory.md` "do not land"
  classification still holds on today's main.
- `fm/agora-s1-isolate-client-core-pre-refresh` (tip `e292c79`, merge-base `606cba2`): every
  non-evidence file is either byte-identical to main (`packages/client-core/src/*`,
  `contracts/schemas/{sync,fixture-sync}.schema.json`, `scripts/client-fixture.ts`, etc.) or a
  strict subset of main's later-evolved version (`scripts/boundary-policy.ts`,
  `scripts/public-types.ts`, `contracts/src/index.ts`, `packages/domain/src/index.ts`). Nothing
  weaker or missing versus main.
- `fm/agora-web-shell-integrate-checkpoint-1` (tip `0a846ce`): an intermediate checkpoint of
  `fm/agora-local-room-web-shell` and `fm/agora-web-framework-client-host`, both already
  independently reconciled onto main via their own merge commits `e745b3b` and `ea27ace`. Its
  `digestCanonical`/`canonicalJson` import-path fix (`6493abc`) targeted a merge state that no
  longer exists; main's current code (built several layers later, across the local-room L2/L5
  and local-answer work) already resolves those imports correctly at every current call site.

## Outcome

All 11 refs named in the brief are accounted for as integrated-equivalent or intentionally
superseded, each with an exact file-level mapping to main's current content. No genuinely
missing code was found, so no dependency-ordered integration slice is needed for this pass.
Source refs and backups are unchanged; no other-copy writes, resets, deletions, or lifecycle
actions were taken against them.
