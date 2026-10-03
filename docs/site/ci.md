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

**Implemented P0b, review pending:** exact toolchain/native diagnosis is checked; the wider CI program remains unqualified. Hosted CI now runs as `agora-ci` on every pull request, but its results do not gate merges yet: the reporting App, its key and branch protection are blocked human prerequisites, see [trusted checks](trusted-checks.md). PostgreSQL socket hardening and React guardrails do not yet exist. This visual explains execution order, not an approved product design system.

## Verification and proof

The [public doctor](repo:scripts/ci-doctor.mjs), [tests](repo:scripts/test/ci-doctor.test.ts) and [feature map](repo:agora/feature-map.json) own this bounded surface. Run `node scripts/ci-doctor.mjs --json` and `node --test scripts/test/ci-doctor.test.ts`. No pnpm aliases or aggregate wiring are added in P0b. The [P0b record](repo:evidence/ci/P0b/README.md) separates prerequisite failure from assertion red and proves each omitted probe loses its denial. Use the [development runbook](repo:docs/runbooks/development.md) and [verifier](repo:.agents/skills/verify-agora/SKILL.md) for the remaining checks.

## Design-negative sandbox closure (P0a)

The document-semantics gate (`node scripts/verify-design.mjs`) runs its rejection fixtures inside a disposable sandbox, not against the real tree, so a mutation can never reach committed documents. CI P0a keeps that sandbox's copied sources matching what the append-only decision trail actually cites: `docs`, `scripts`, `evidence`, `packages`, `contracts`, `apps`, `agora`, and the root `AGENTS.md`, `CLAUDE.md`, `skills-lock.json` and `eslint.config.js`. Run `node scripts/test-design-checks.mjs`; `omitted-application-source` proves a cited application file that goes missing is reported by name, not silently accepted. Receipts are under [`evidence/ci/P0a/`](repo:evidence/ci/P0a/README.md). Widening the sandbox is the only fix a future citation of a new path needs; it does not touch `verify-design.mjs` itself.
