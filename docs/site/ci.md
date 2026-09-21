# Mechanical CI guardrails

## What it is

The staged mechanical landing checks that keep ordinary repository gotchas and recurring agent shortcuts from counting as success. P0a is only the design-negative sandbox source closure. Hosted CI, branch protection and the full guard catalog are not present yet.

## What it does

`node scripts/test-design-checks.mjs` builds a disposable tree, accepts an unchanged baseline, then applies isolated mutations. Each mutation must actually change the copy, and each rejection must name its diagnostic. The baseline copies decision-cited application sources so legitimate links such as `apps/center/src/app.ts` resolve.

## Why it exists

A green design gate that fails only because its sandbox omitted real cited sources is setup noise, not a proof. Repairing fixture ownership keeps the legitimate documentation link and makes the omitted-source negative meaningful. Product work may continue on isolated branches while later P0/P1 slices add doctor, lane inventory and hosted enforcement.

## How it works

```flow
Baseline sandbox | Copy docs, scripts, evidence, packages, contracts and apps into a disposable tree.
Unchanged accept | verify-design exits 0 when cited sources and design documents are intact.
Isolated mutation | Edit one document or omit one cited application file; assert the mutation applied.
Named rejection | Require the intended diagnostic text, not merely any nonzero exit.
```

P0a does not wire every standalone negative into `pnpm check`, does not add a toolchain doctor, and does not activate remote protection. See [verification](verification.md) for the broader gate table and [the development runbook](repo:docs/runbooks/development.md) for command coverage limits.

## Implementation status

**In progress: P0a complete, later CI slices open.** The design-negative fixture copies `apps` and rejects `omitted-application-source` with `missing link apps/center/src/app.ts`. Mandatory aggregate CI, React/web lanes, dependency scanning and hosted App-bound reporting remain future slices. Do not read this page as landing protection.

## Verification and proof

```sh
node scripts/verify-design.mjs
node scripts/test-design-checks.mjs
```

Inspect [scripts/test-design-checks.mjs](repo:scripts/test-design-checks.mjs), the [design validation record](repo:docs/validation/design-validation.md) and [evidence/ci/p0a](repo:evidence/ci/p0a/outcome.json). Parent red must show the baseline missing-link failure before the fixture repair; green must list baseline accept plus every named mutation rejection, including omitted application source.
