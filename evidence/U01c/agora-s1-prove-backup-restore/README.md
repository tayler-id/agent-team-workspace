# U01c.B01 slice 1: encrypted backup artifact and verified restore integrity

Task receipts for the first bounded slice of `U01c.B01`. They prove the slice, not the U01c
milestone, FG07, separate-host survival or production protection. The feature page is
[backup-restore](../../../docs/site/backup-restore.md).

Toolchain: official Node 24.21.0 `darwin-arm64` from nodejs.org, checked against its
`SHASUMS256.txt` and first on `PATH`; pnpm 10.34.1; Homebrew PostgreSQL 18.4; the Python
venv from `packages/verification/fixture/requirements.txt` first on `PATH`.

## Red and green

`red.log`, `green.log`, `test-patch.diff` and `manifest.json` come from
`node scripts/record-red-green.mjs --parent a62662e --head 54169fa` with the command
`node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg packages/storage/test/backup.pg.test.ts`.
At the parent all 7 tests fail on CLI exit status and receipt assertions
(`expected { status: 1, receipt: undefined } ...`), because `scripts/backup.ts` does not
exist there. No test fails at module link. At the head all 7 pass. The two logs carry
machine paths because the signed manifest covers their exact bytes.

## Guard negatives

`guard-negatives/summary.json` lists each mutation, the test it must turn red, the exit
status, the failing test names and a byte-identical restore check. A Node script applied
each edit only after confirming its source text matched exactly once, ran the pg test,
then restored the file from the commit before the next edit.

| Mutation | File | Disabled guard | Red test |
| --- | --- | --- | --- |
| `key-id-check` | `scripts/backup.ts` | `key_id` comparison before decryption | wrong key is denied |
| `gcm-auth` | `packages/storage/src/backup.ts` | `decipher.final()` tag check | flipped byte is denied as corrupt |
| `missing-artifact` | `scripts/backup.ts` | ENOENT to `missing_artifact` | missing sealed object is denied |
| `target-empty-check` | `scripts/backup.ts` | non-empty target database check | restore into a used database is denied |
| `object-write-dropped` | `scripts/backup.ts` | writes one object fewer | restore rebuilds rows and objects |
| `object-write-dropped-and-compare-off` | `scripts/backup.ts` | the same, with the CLI inventory compare off | restore rebuilds rows and objects |
| `key-leak` | `scripts/backup.ts` | writes the key hex into `backup.json` | backup holds no key |

All seven went red on exactly the named test and every file was restored byte for byte.
The last two rows show the test's own row and byte checks catch a lost object even with
the CLI's `integrity_mismatch` compare disabled. Disabling only that compare turns no
test red, because no test feeds a restore whose output differs from the manifest. That
denial is untested here.

## Recipe drive

`drive/` holds the outputs of the `.agents/skills/verify-agora/SKILL.md` backup Launch,
Drive and Cleanup blocks, run literally at this head. `drive/recipe-transcript.txt` is the
`bash -x` transcript with machine paths replaced by `<tmp>`. The assertion command printed
`outcome: pass`, Cleanup printed `removed` and `no key file in evidence`, and
`drive/wrapper.ndjson` records `allocated`, `started` and `cleaned` for one cluster.

## Not proved

WAL archiving, separate-host restore, off-host key recovery, epoch rotation and fencing,
RPO and RTO, a dedicated backup role, external storage, key rotation, a normalized schema
comparison, one snapshot for dump and inventory, and the CLI-only `integrity_mismatch`
path. No independent security review has happened; the implementer's own checks are not one.
The AES-256-GCM mechanism is proposed in D111 and awaits operator acceptance.
