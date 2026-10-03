# Toolchain and native readiness

## What it is

For operators, a read-only prerequisite diagnosis before tests. For contributors, CI P0b checks the exact Node/pnpm contract and the native import used by Vitest through Vite. It is not mandatory CI or product qualification.

## What it does

`node scripts/ci-doctor.mjs --json` reports structured prerequisites; omit `--json` for remedies. Exit 0 means these prerequisites pass, 2 means blocked, 64 means invalid usage. No tools are installed or repaired.

## Why it exists

A clean install can succeed while macOS rejects the native library under a signed Node launcher. That is blocked infrastructure, never behavioral red. Keep the lockfile; use the approved compatible runtime before diagnosing product assertions.

## How it works

```flow
Prerequisites | Check Node 24.21.0, pnpm 10.34.1 and the real Vitest/Vite Rolldown import.
Blocked | Diagnose runtime or binding; operator resolves the prerequisite and repeats the doctor.
Ready for tests | Run behavioral checks separately; prerequisite success proves no product behavior.
```

## Implementation status

**Implemented P0b, review pending:** exact toolchain/native diagnosis is checked; the wider CI program remains unqualified. Mandatory CI, PostgreSQL socket hardening, React guardrails and hosted enforcement do not yet exist. This visual explains execution order, not an approved product design system.

## Verification and proof

The [public doctor](repo:scripts/ci-doctor.mjs), [tests](repo:scripts/test/ci-doctor.test.ts) and [feature map](repo:agora/feature-map.json) own this bounded surface. Run `node scripts/ci-doctor.mjs --json` and `node --test scripts/test/ci-doctor.test.ts`. No pnpm aliases or aggregate wiring are added in P0b. The [P0b record](repo:evidence/ci/P0b/README.md) separates prerequisite failure from assertion red and proves each omitted probe loses its denial. Use the [development runbook](repo:docs/runbooks/development.md) and [verifier](repo:.agents/skills/verify-agora/SKILL.md) for the remaining checks.

## Design-negative sandbox closure (P0a)

The document-semantics gate (`node scripts/verify-design.mjs`) runs its rejection fixtures inside a disposable sandbox, not against the real tree, so a mutation can never reach committed documents. CI P0a keeps that sandbox's copied sources matching what the append-only decision trail actually cites: `docs`, `scripts`, `evidence`, `packages`, `contracts`, `apps`, `agora`, and the root `AGENTS.md`, `CLAUDE.md`, `skills-lock.json` and `eslint.config.js`. Run `node scripts/test-design-checks.mjs`; `omitted-application-source` proves a cited application file that goes missing is reported by name, not silently accepted. Receipts are under [`evidence/ci/P0a/`](repo:evidence/ci/P0a/README.md). Widening the sandbox is the only fix a future citation of a new path needs; it does not touch `verify-design.mjs` itself.

## Candidate pull request checks

For contributors, every pull request to `main` runs the candidate workflow `.github/workflows/agora-ci.yml` on GitHub. It is ordinary, unprivileged test execution. It is not a trusted evidence signature, it publishes no `agora/evidence` or `agora/policy` check, and it grants no merge authority. The credential-bearing reporter and the U01b qualification are a separate security task and stay unqualified here.

Seven jobs, one per verification area, each run in its own fresh checkout:

| Job | Runner | Commands |
| --- | --- | --- |
| `doctor` | ubuntu-24.04 | `node scripts/ci-doctor.mjs --json` |
| `static` | ubuntu-24.04 | `pnpm lint`, `pnpm typecheck` |
| `contracts` | ubuntu-24.04 | `pnpm contracts:check`, `pnpm boundaries` |
| `docs` | ubuntu-24.04 | `pnpm docs:check` |
| `tests` | macos-15 | `pnpm test` |
| `red-green` | ubuntu-24.04 | `bash scripts/ci-red-green.sh BASE HEAD` |
| `guards` | ubuntu-24.04 | `pnpm -s agora project lanes --unit U01b --task agora-s1-validate-project-evidence` |

```flow
Pull request | A push to a branch with an open pull request to main starts the workflow from the merge ref.
Setup | Pinned checkout without persisted credentials, Node from .node-version, then scripts/ci-setup.sh installs pnpm dependencies and only the named prerequisites.
Seven jobs | doctor, static, contracts, docs, tests, red-green and guards run independently with contents read-only permission.
Result | Each job reports as a GitHub Actions check. A red job means that area failed on that exact head.
```

[scripts/ci-setup.sh](repo:scripts/ci-setup.sh) runs the locked `pnpm install` and accepts `postgres`, `python` and `swift`. [scripts/ci-red-green.sh](repo:scripts/ci-red-green.sh) replays each commit's changed tests against its parent and against itself with the existing recorder, then checks the receipt with the existing validator. A commit that changes only tests, documentation or evidence has no behavior to turn red, so its red is skipped and its tests still run at the head in the `tests` job. Any commit that also changes source or configuration needs a red before its green, and a pull request whose source changes carry no changed test fails. A documentation-only change is not applicable. A `.test.ts` file under `apps`, `packages` or `contracts` counts as a changed test.

The workflow keeps the Node and pnpm versions pinned (`.node-version`, `packageManager`), pins both actions by commit, grants `contents: read` only, references no secret, and sets `persist-credentials: false`. [The workflow test](repo:packages/verification/test/ci-workflow.test.ts) parses the committed workflow and asserts those facts and the seven command lists, so a change that removes a job or widens a permission fails `pnpm test`.

Pull requests opened before this workflow reached `main` show no checks. GitHub runs the workflow only on a `pull_request` event, so rebase, push a new commit or close and reopen the pull request to start it. The local gate (`node scripts/local-checks.mjs run`) stays mandatory for landing; these checks do not replace it.
