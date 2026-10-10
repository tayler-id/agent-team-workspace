# General evidence validator

## What it is

U01b.B02 adds a check that reads a recorded `evidence/<unit>/<task>/` bundle back and refuses one that was edited, re-packaged, signed with another key or recorded for a different head. It is an owner-attested check: it trusts whoever holds this checkout's key, not the honesty of the tests that key signed. It is separate from the live project-fixture receipt in [owned project controls](project-controls.md): that one checks a still-running instance's own report, this one checks a bundle already committed to the repository, the shape every task's evidence takes under [R11](repo:docs/technical-spec.md). [The recorder](repo:scripts/record-red-green.mjs) and [the validator](repo:scripts/validate-evidence.mjs) are two ends of the same contract, not two independent scripts that happen to agree.

## What it does

[The recorder](repo:scripts/record-red-green.mjs) runs the head's test patch against the parent (red) and at the head (green), then writes `manifest.json` alongside `red.log`, `green.log` and `test-patch.diff`. The manifest (`agora.evidence-manifest/v2`) holds the declared target, the red/green outcome, a digest and byte length per artifact and a producer block. One HMAC signature covers all of it, using this checkout's untracked `.scratch/producer.key` (`owner_attested`, never a publication credential). The manifest never names the key. [The validator](repo:scripts/validate-evidence.mjs) recomputes every digest from the files on disk, checks the logs against the expected head and base, and recomputes the signature with a key the verifier chooses: `--key FILE`, or by default this checkout's own `.scratch/producer.key`. A bundle whose bytes, digests, target or outcome changed after signing fails, as does one signed with any other key. [`scripts/project-evidence.mjs`](repo:scripts/project-evidence.mjs) holds the signed format, so the recorder and the validator sign exactly the same bytes.

## Why it exists

A red/green pair that merely exists is not proof it belongs to this change. Its head could be someone else's commit, its base could predate a security fix, its logs could be pasted from a passing run of a different task, or one byte of an artifact could have changed after the fact. `agora.evidence-validation/v1` closes that gap: it names the exact fields it checked and the reason a bundle failed, so a reviewer trusts the holder of the signing key instead of the bundle's description of itself.

## How it works

```flow
Read the bundle | Load manifest.json, red.log, green.log and test-patch.diff from the given directory; any missing file is missing_proof, and a manifest that is not v2 is unsupported_manifest.
Bind head, base and config | Parse each log header; both must name the exact expected head and base and carry matching configuration digests.
Check every artifact | Recompute each file's SHA-256 and byte length; a mismatch against the manifest's declared digest is artifact_mismatch, wrong bytes never pass silently.
Cross-check the outcome | Each log's observed_exit must be a plain integer (a signal kill is malformed_exit); red must be nonzero and green must be zero; the manifest's declared outcome must agree, or the bundle is exit_mismatch/outcome_mismatch.
Verify the producer signature | Recompute the HMAC over every manifest field except the signature, with the verifier's key, never one the bundle names; a missing key is stale_producer, any other mismatch is producer_signature_invalid.
```

`node scripts/validate-evidence.mjs --dir evidence/U01b/agora-s1-validate-project-evidence-forgery-fix [--head SHA] [--base SHA] [--target NAME] [--key FILE]` runs this against any recorded bundle; the head/base default to the current repository's `HEAD` and its merge base with `main`, so pass the bundle's own recorded revisions. [Owned project controls](project-controls.md)' `pnpm agora project lanes --unit U01b --task agora-s1-validate-project-evidence` instead drives it through [the task lane suite](repo:packages/verification/test/evidence-validator.test.ts), lanes 5 through 7, together with lanes 1-4. Lanes 8-10 belong to [trusted checks](trusted-checks.md) (`--task agora-s1-qualify-trusted-checks`); an unrecognized `--task` blocks rather than silently unlocking them.

## Startup cost

The validator starts as a child process once per check, and the task lanes start it twelve times in one test. It therefore imports only what it uses. [`scripts/project-primitives.mjs`](repo:scripts/project-primitives.mjs) holds `exits`, `hash` and `requireThat` and imports nothing but `node:crypto`; [the project checks](repo:scripts/project-checks.mjs) re-export the same three names for their other consumers. Before this split the validator imported them from the project checks, which compiled the full wire validator at load for a result the validator never reads, about three quarters of every start.

```flow
validate-evidence.mjs | Imports project-evidence.mjs for the signed format and project-primitives.mjs for exits, hash and requireThat.
project-primitives.mjs | Three definitions, one built-in import. The only owner of each, so the exit codes cannot drift between callers.
project-checks.mjs | Re-exports the three names and still compiles the wire validator, because the project fixture checks use it. The validator no longer loads this file.
```

[The startup test](repo:packages/verification/test/validator-startup.test.ts) runs the real CLI under a resolve hook that logs every module Node loads, then asserts the run still refuses an absent bundle with `missing_proof` and that nothing under `contracts/`, Ajv or the project checks was loaded. The correction changes no result, signature, key rule, exit code or time budget.

## Implementation status

**In progress, re-review pending.** An independent exact-head review of `a226663` found that the validator accepted forged bundles. The manifest named its own key file, the signature left the artifact digests out, and a signal-killed red counted as a red. The fix at `549a219` is retained with its forgery reproductions in [`evidence/U01b/agora-s1-validate-project-evidence-forgery-fix/README.md`](repo:evidence/U01b/agora-s1-validate-project-evidence-forgery-fix/README.md). It needs a new independent review of its exact head.

What the signature does not give you:

- A valid signature means the holder of this checkout's key signed the bundle. It does not mean the tests were honest; the [specification](repo:docs/technical-spec.md) states that an owner-attested manifest alone never authorizes merge. A bundle validates only where its signing key exists, so a reviewer in another clone gets `stale_producer` or `producer_signature_invalid` unless the owner shares the key.
- The validator does not compare the recorded configuration digests, test command or `test-patch.diff` with the repository, and does not check that head and base are related.
- Bundles recorded before `549a219` use the v1 manifest and report `unsupported_manifest`.

No U01b milestone verdict, FG05/FG06, trusted CI, a real cryptographic identity beyond the local owner-attested key, browser product UI or production execution is claimed.

## Verification and proof

[Behavior tests](repo:packages/verification/test/evidence-validator.test.ts) build a synthetic bundle at a fixed head/base and exercise wrong head, wrong base, mismatched configuration, missing proof, a mutated artifact, an unsupported target, exit/outcome disagreement, a non-integer exit, a forged signature and a stale producer key, then confirm each refusal names its own reason code. Lanes 6 and 7 also carry the review's forgeries: a bundle that names `package.json` or `/dev/null` as its key, and an artifact replaced with only its digest updated. The guard assertion passes normally and turns red when only the signature comparison is disabled in an isolated copy. Full task receipts are retained under `evidence/U01b/agora-s1-validate-project-evidence/`; their headers, not a status badge, name exact tested revisions.
