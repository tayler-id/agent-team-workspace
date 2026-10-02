# Evidence validator forgery fix

Task `agora-handoff-consolidation`, fixing the blocking finding of the 2026-10-02 independent
security review of handoff head `a226663`. The captain authorized this fix before landing. The
change is `549a219`; this bundle's red/green covers it, with `a226663` as the parent.

## What the review reproduced

At `a226663`, `scripts/validate-evidence.mjs` passed bundles that no recorder produced:

- **F1.** The manifest named its own HMAC key file (`producer.key_file`), so a bundle signed with
  `package.json` or `/dev/null` validated in every clone.
- **F2.** The signature covered only the producer block, so anyone could replace an artifact and
  update its unsigned digest.
- **F3.** `observed_exit` went through `Number()`, so a red killed by a signal (`NaN`) counted as
  a failing red.

`repro/before-fix.log` is `repro/repro.sh` run against the real script at `a226663`. All five
forged or edited bundles report `"outcome":"pass"`, including a copy of a real recorder-signed
bundle with `green.log` replaced.

## What changed

- The verifier chooses the key: `--key FILE`, by default this checkout's
  `.scratch/producer.key`. The recorder signs with that same file and no longer writes its path
  into the manifest.
- Manifest `agora.evidence-manifest/v2` signs every field except the signature itself,
  including target, outcome and each artifact's digest and length, over canonical JSON.
  `scripts/project-evidence.mjs` holds the format, so signer and verifier sign the same bytes.
  A v1 manifest is refused as `unsupported_manifest`.
- `observed_exit` must be a plain integer of up to three digits, or the bundle is
  `malformed_exit`. The recorder no longer counts a red with a null exit (signal or timeout) as
  a red.

## Proof

- `red.log`/`green.log`: `record-red-green.mjs` with parent `a226663` and head `549a219`. Red
  fails all three lanes. Lane 7 fails at line 126, where the old validator accepts the
  `package.json`-keyed forgery. Lane 6 fails at line 99, where it accepts a v1 bundle with a
  log replaced. Lane 5 fails only because the old validator can't read a v2 fixture. Green: 3/3.
  The bundle itself validates under v2 with this checkout's key.
- `repro/after-fix.log`: the same script at `de4f5fb`. Every v1 forgery is
  `unsupported_manifest`. On the real v2 bundle, the unsigned artifact swap and a full re-sign
  with `package.json` named as the key are both `producer_signature_invalid`. A red set to
  `observed_exit: null` and re-signed with the owner's own key is `malformed_exit`.
- `repro/guards.log`: three mutations of the committed validator, each restored from a byte
  copy with matching SHA-256. Taking the key from `key_file` again fails line 132. Lenient
  `Number()` exit parsing fails line 143. Disabling the signature comparison fails lines 112
  and 132. The restored files pass 3/3.

## What this does not fix or prove

- The trust class is still `owner_attested`. A valid signature proves that whoever holds this
  checkout's untracked key signed the bundle. It doesn't prove the tests were honest, and a
  bundle validates only where that key exists (see `docs/technical-spec.md`, an owner-attested
  manifest alone never authorizes merge).
- Review finding F3's other items stay open. The validator doesn't compare configuration
  digests, the test command, or `test-patch.diff` with the repository, and doesn't check
  head/base ancestry.
- The `unsupported_manifest` check and the recorder's null-exit rule have no guard-negative test
  of their own. With the version check removed, a v1 bundle still fails its v2 signature check,
  and nothing in this suite drives the recorder.
- F4: `--head` or `--base` given without a value still falls back to the default.
- Bundles recorded before `549a219` (the original U01b bundle and
  `evidence/local-room/session-drafts-held-send`) are v1 and now report `unsupported_manifest`.
