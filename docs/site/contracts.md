# Portable wire contracts

## What it is

U01a.B02 publishes JSON Schema/OpenAPI as the language-neutral wire authority. The landed surface has 20 components across primitives, health, fixture policy, errors and CLI report families.

## What it does

Generate TypeScript and Swift consumers from one bundle; reject unsupported constructs and output drift. Run 66 golden vectors comparing acceptance, canonical bytes, hashes and Ed25519 verdicts across both consumers.

## Why it exists

A client or worker must understand the same bytes without importing center internals. Generated types alone do not enforce every pattern or null/absence restriction; both consumers also need runtime validation.

## How it works

```flow
Author | Change schema families and operations-only OpenAPI, never generated consumers.
Constrain and generate | Enforce the tested common subset; produce both consumers and digest manifest.
Compare | Run golden and malformed vectors through TypeScript and Swift.
Reject drift | Regenerate in a clean directory and compare exact bytes.
```

## Implementation status

Built at the atlas revision, foundation contracts only. There is no room-event family, RunSpec, native login, worker protocol or production CLI binary yet. A CLI envelope schema is not an installed command.

## Verification and proof

Inspected [generator](repo:contracts/tools/generate.mjs), [conformance source](repo:contracts/src/conformance.ts), [joint tests](repo:contracts/test/conformance.test.ts), and [task outcome](repo:evidence/U01a/agora-s1-publish-portable-contracts/outcome.json). Run `pnpm contracts:generate`, `pnpm contracts:check` and `pnpm contracts:conform -- --json`. Missing Swift is unavailable, never a pass. [The development runbook](repo:docs/runbooks/development.md) documents the common subset and toolchain.
