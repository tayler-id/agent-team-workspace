# Security notes for agora-s1-publish-portable-contracts

Recorded 2026-09-20 at the branch 3 code head. Findings are from reading the change and running the guard negatives; no external scanner ran.

## Boundary behavior proven by vectors and negatives

- Unknown fields are rejected at every level of every object, including nested `checks`, `actor` and `versions`, by Ajv and by the generated Swift types independently (`health-unknown-field`, `readiness-unknown-check`, `policy-command-unknown-field`, `cli-command-shell-text`). The `removeAdditional` guard negative shows what silent removal would look like and that the joint gate catches it.
- Command text is never accepted: `CliCommand` is a closed object of registered verbs and bounded arguments; an `argv` string is refused (`cli-command-shell-text`). The R12 rule that the runner never evaluates command text received from chat is now enforceable at the wire.
- Null is never absent (`decision-allow-reason-null`, `cli-report-cleanup-null`). Generated Swift optionals decode JSON null as nil, so the runtime validator, not the generated type, is what refuses it; the test pins that split so it cannot regress unnoticed.
- Integers are bounded to the JavaScript safe range and 64-bit values travel as decimal strings with an exact pattern bound; oversize, negative, fractional and stringified numbers are refused without coercion.
- Timestamps must be UTC with `Z`; numeric offsets and a trailing newline are refused. Patterns avoid `\d` and unescaped `.` so ICU and JavaScript evaluate them identically, and the Swift matcher requires the match to span the whole UTF-16 range because ICU lets `$` match before a final newline.
- Digests and signatures are computed over RFC 8785 canonical bytes of the wire value, never over a typed object (R05). The tampered-signature vector fails in both languages.

## Keys and secrets

- The Ed25519 key in `contracts/fixtures/vectors.json` is derived from a public seed string, is labelled fixture-only in the file, and authorizes nothing anywhere in the system. No private key material is committed; the seed derivation is stated so the signature can be regenerated.
- No secret, token or credential appears in schemas, vectors, generated files or evidence. Error reports carry a reason code and correlation id only.

## Supply chain

- `openapi-typescript` 7.13.0 and its dependency tree (Redocly core) are development dependencies of the contracts package only; they never run in the center. `ajv` 8.20.0 and `ajv-formats` 3.0.1 are runtime dependencies pinned exactly.
- SwiftPM fetches `swift-openapi-generator` 1.13.1 and `swift-openapi-runtime` 1.12.1 from GitHub with exact version pins; `contracts/swift/Package.resolved` records the resolved revisions. The generator runs only at generation and check time; the runtime is linked into the generated client and the conformance consumer.
- Ajv is configured with no network reference resolution; a `$ref` to anything outside the published families fails the subset gate before generation.

## Residual risks and omissions

- The Swift runtime validator is a project-owned subset validator, not a full JSON Schema implementation. The subset gate in `generate.mjs` is what keeps schemas inside what it implements; widening the subset requires extending the validator and its vectors together.
- Generated Swift and TypeScript types cannot express pattern, length or numeric bounds. Runtime validation is mandatory in every consumer, as R21 already requires; nothing here relaxes that.
- No independent security review has run; this file is the author's reading and the merge authority's review remains separate.
