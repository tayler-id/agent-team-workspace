# Mandatory local checks

## What it is

For operators, the rule that nothing lands on local `main` until the whole Agora check set has passed on that exact commit, on this machine. For contributors, one policy file, one tool and one git hook. There is no hosted CI, remote or repository to create.

## What it does

`node scripts/local-checks.mjs run` runs every check in [agora/local-checks.json](repo:agora/local-checks.json) against a clean checkout at its current commit, stops at the first red one and writes a receipt for that commit under the git directory. `verify <rev>` answers whether a commit has a complete passing receipt. `install` makes the guard active for this clone. `status` fails when it is not active or has gone stale.

The required set is `ci-doctor`, then `pnpm check` (lint, typecheck, docs, contract drift, every unit, jsdom, PostgreSQL and contract test, including the boundary and application-architecture suites), then `pnpm web:build`, then the gate's own behavioral tests. `pnpm boundaries` is not listed because `pnpm check` already runs the same test files.

## Why it exists

Before this, `pnpm check` was a habit. Firstmate's local landing is `git merge --ff-only` on the primary checkout, and git did not care whether anyone had run it. A red check, a missing run or a commit rebased after the run all landed the same way.

## How it works

```flow
Candidate commit | A worker finishes on its own branch; the head is one exact commit.
Run | node scripts/local-checks.mjs run on a clean checkout, red checks stop it and write a failing receipt.
Receipt | One file per commit under .git/agora-local-checks, naming the commit, tree, each check and its exit code.
Landing | Firstmate verifies the branch, then fast-forwards main. Git calls the hook before the ref moves.
Hook | Refuses the update unless the new commit has a complete passing receipt.
```

A receipt belongs to a commit hash. An amend, rebase, new commit or content-identical rewrite produces a new hash with no receipt, so it has to be run again. `run` refuses a dirty tree, and marks the receipt `changed-during-run` if a check moved HEAD or left files behind.

## What the project enforces and what Firstmate must enforce

Enforced here once `node scripts/local-checks.mjs install` has been run in the primary checkout, because git runs the `reference-transaction` hook for every update of `refs/heads/main`, including `git merge --ff-only`, `git commit` on main and `git update-ref`.

- No receipt, a failing receipt, or a receipt for a different commit or tree refuses the update and leaves main where it was.
- A candidate cannot remove a check that main already requires, and cannot delete the policy, tool or hook files.
- The installed hook and tool are copies kept in the git directory, so a landing that rewrites them does not turn off its own gate. `status` reports when they differ from the checkout, and the copies are refreshed by running `install` again after such a change lands.

Not enforceable from this repository.

- Git hooks live in local configuration. Anyone who unsets `core.hooksPath` or edits the git directory bypasses them, and a fresh clone has nothing installed. The hook stops silent bypass, not a deliberate one.
- The landing tool lives outside Agora. It should run `node scripts/local-checks.mjs status` in the primary checkout and refuse when it fails, run `verify fm/<task> --base main` before `git merge --ff-only`, and report the refusal text instead of retrying. The hook is the backstop if it does not.
- Landing the first commit of this feature is not guarded, since the hook does not exist yet. Run `install` right after it lands.

## Implementation status

**Implemented, review pending.** The gate and its receipts exist and are tested. It proves the machine's checks passed on a commit, not that the product works or that a reviewer approved it. The 24.21.0 Node pin in `ci-doctor` applies, so a host on another Node version is blocked rather than passed.

## Verification and proof

The [tool](repo:scripts/local-checks.mjs), `.githooks/reference-transaction` hook, [policy](repo:agora/local-checks.json) and [behavioral tests](repo:scripts/test/local-checks.test.ts) own this surface. Run `node --test scripts/test/local-checks.test.ts`. The tests build throwaway repositories and drive real `git merge --ff-only`, `git commit` and `git update-ref` against the real hook. Evidence is under `evidence/local-checks/`.
