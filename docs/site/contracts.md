# Portable wire contracts

## What it is

U01a.B02 makes authored JSON Schema and OpenAPI the shared wire authority. TypeScript and Swift consumers are generated from the same source. The current surface has 20 components across five families: primitives, health, fixture policy, errors and CLI envelopes.

## What it does

The generator bundles schema families, rejects unsupported constructs, produces both consumers and records source/output digests. The conformance driver sends 66 golden vectors through both implementations, comparing acceptance, canonical bytes, SHA-256 digests and detached Ed25519 signature verdicts.

A compiled generated type is not sufficient validation. For example, a generated Swift type can collapse null into absence or ignore a pattern. The Swift runtime subset validator enforces those restrictions too.

## Why it exists

A browser, standalone worker and native client must agree on meaning without sharing center internals. A TypeScript-only schema or lossy export can quietly widen an authorization-bearing contract. Schema-first generation prevents that second authority; golden vectors expose differences between language runtimes.

## How it works

```flow
Author | Edit contracts/schemas/*.schema.json and operations-only contracts/openapi.json.
Constrain | Validate the common subset and resolve only known local references.
Generate | Bundle once, generate TypeScript and Swift, record output digests.
Compare | Run canonical and malformed vectors through both consumers.
Reject drift | Regenerate into a clean temporary tree and compare every output byte.
```

## Implementation status

**Built at the atlas revision.** These are foundation contracts, not the complete production API. There is no implemented RunSpec, room-event family, native login, Swift UI, or worker protocol at this base. A CLI report schema does not mean the `agora project` executable exists.

The tested subset supports closed objects, explicit required fields, arrays, bounded integers, string/integer enums and restricted anchored ASCII patterns. It rejects unsupported keywords rather than generating unconstrained types. Schema extension must preserve cross-language proof; do not edit generated files.

## Verification and proof

Inspect [the generator](repo:contracts/tools/generate.mjs), [TypeScript conformance runner](repo:contracts/src/conformance.ts), [Swift runtime validator](repo:contracts/swift/Sources/AgoraContractsConform/SchemaValidator.swift), [generation negatives](repo:contracts/test/generation.test.ts), and [joint conformance tests](repo:contracts/test/conformance.test.ts). The [task outcome](repo:evidence/U01a/agora-s1-publish-portable-contracts/outcome.json) records the three review-sized delivery branches and their limits.

```sh
pnpm contracts:generate
pnpm contracts:check
pnpm contracts:conform -- --json
```

Generation changes source consumers. Check regenerates elsewhere without changing the tracked outputs. Conformance must report TypeScript and Swift pass; missing Swift is unavailable, not success. See [the authoring contract](authoring.md) and [current driver reference](repo:docs/runbooks/development.md).
