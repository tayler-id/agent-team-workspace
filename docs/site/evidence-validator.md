# General evidence validator

## What it is

U01b.B02 adds a check that reads a recorded `evidence/<unit>/<task>/` bundle back and refuses a forged, stale or repackaged one. It is separate from the live project-fixture receipt in [owned project controls](project-controls.md): that one checks a still-running instance's own report, this one checks a bundle already committed to the repository, the shape every task's evidence takes under [R11](repo:docs/technical-spec.md). [The recorder](repo:scripts/record-red-green.mjs) and [the validator](repo:scripts/validate-evidence.mjs) are two ends of the same contract, not two independent scripts that happen to agree.

## What it does

[The recorder](repo:scripts/record-red-green.mjs) already ran the head's test patch against the parent (red) and at the head (green); it now also writes `manifest.json` alongside `red.log`, `green.log` and `test-patch.diff`: the declared target, the red/green outcome, a digest and byte length per artifact, and a producer block signed with a local, per-checkout HMAC key (`owner_attested`, never a publication credential). [The validator](repo:scripts/validate-evidence.mjs) re-derives every one of those facts from the actual files on disk and the current repository, so a copied, partly deleted or hand-edited bundle fails even when its JSON still parses.

## Why it exists

A red/green pair that merely exists is not proof it belongs to this change. Its head could be someone else's commit, its base could predate a security fix, its logs could be pasted from a passing run of a different task, or one byte of an artifact could have changed after the fact. `agora.evidence-validation/v1` closes that gap: it names the exact fields it checked and the reason a bundle failed, so a reviewer never has to trust a bundle's own claim about itself.

## How it works

```flow
Read the bundle | Load manifest.json, red.log, green.log and test-patch.diff from the given directory; any missing file is missing_proof.
Bind head, base and config | Parse each log header; both must name the exact expected head and base and carry matching configuration digests.
Check every artifact | Recompute each file's SHA-256 and byte length; a mismatch against the manifest's declared digest is artifact_mismatch, wrong bytes never pass silently.
Cross-check the outcome | Red must be nonzero and green must be zero; the manifest's declared outcome must agree, or the bundle is exit_mismatch/outcome_mismatch.
Verify the producer signature | Recompute the HMAC over the producer fields with the recorded key file; a missing key is a stale producer, a wrong signature is forged.
```

`node scripts/validate-evidence.mjs --dir evidence/U01b/agora-s1-validate-project-evidence [--head SHA] [--base SHA] [--target NAME]` runs this against any recorded bundle; the head/base default to the current repository's `HEAD` and its merge base with `main`. [Owned project controls](project-controls.md)' `pnpm agora project lanes --unit U01b --task agora-s1-validate-project-evidence` instead drives it through [the task lane suite](repo:packages/verification/test/evidence-validator.test.ts), lanes 5 through 7, together with lanes 1-4. Lanes 8-10 (trusted CI reporting identities) remain U01b.B03's unimplemented scope; an unrecognized `--task` blocks rather than silently unlocking them.

## Implementation status

**In progress pending independent exact-head review.** The validator, its recorder integration and three native lane tests exist, including a guard-weakening copy of the signature check. No U01b milestone verdict, FG05/FG06, trusted CI, a real cryptographic identity beyond the local owner-attested key, browser product UI or production execution is claimed.

## Verification and proof

[Behavior tests](repo:packages/verification/test/evidence-validator.test.ts) build a synthetic bundle at a fixed head/base and exercise wrong head, wrong base, mismatched configuration, missing proof, a mutated artifact, an unsupported target, exit/outcome disagreement, a forged signature and a stale producer key, then confirm each refusal names its own reason code. The guard assertion passes normally and turns red when only the signature comparison is disabled in an isolated copy. Full task receipts are retained under `evidence/U01b/agora-s1-validate-project-evidence/`; their headers, not a status badge, name exact tested revisions.
