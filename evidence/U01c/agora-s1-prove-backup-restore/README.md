# U01c.B01 slice 1: encrypted backup artifact and verified restore integrity

Task receipts for the first bounded slice of `U01c.B01`. They prove the slice, not the U01c
milestone, FG07, separate-host survival or production protection. The feature page is
[backup-restore](../../../docs/site/backup-restore.md).

Toolchain: official Node 24.21.0 `darwin-arm64` from nodejs.org, checked against its
`SHASUMS256.txt` and first on `PATH`; pnpm 10.34.1; Homebrew PostgreSQL 18.4; the Python
venv from `packages/verification/fixture/requirements.txt` first on `PATH`.

## Red and green

`red.log`, `green.log`, `test-patch.diff` and `manifest.json` come from
`node scripts/record-red-green.mjs --parent 1eea48b --head 4385f34` with the command
`node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg packages/storage/test/backup.pg.test.ts`.

`1eea48b` is the R22 test-only parent revision: the slice's real parent `a62662e` plus a
three-line `scripts/backup.ts` that prints only the usage route
(`outcome: usage_error`, exit 64) for every call. A parent with no CLI at all is not valid
red, because the driver would prove nothing there. The branch merges `1eea48b` with the
ours strategy (`4385f34`), so the commit is reachable and the tree is unchanged.

At the baseline, the first test passes: the same `cli()` driver reaches the usage route.
Nine fail. Five fail on literal values, the CLI answering `{ status: 64, usage_error }`
where the test expects `created`, `denied` or `restored`. Four fail with ENOENT on the key
or backup files that the failed keygen and create never wrote. At the head all ten pass.
The logs carry machine paths because the signed manifest covers their exact bytes.
`node scripts/validate-evidence.mjs` passes on both bundles when given full SHAs, `--base 1eea48bf63c84d51a9e635e8fef0ed71cb083ed0` or
`--base 07d19c1e2d84d4d9ef81233644d0eee0973c8036` with `--head 4385f3492655f42ce7d6330937aa39131c1dcdd6`.

`snapshot-race/` is the pair for the one-snapshot fix, parent `07d19c1` (the commit that
added the concurrent-writer test, before the fix) and head `4385f34`. Its red fails only
that test, with `reason_code: integrity_mismatch`: `create` counted rows in a later
snapshot than `pg_dump`, so a backup taken under writes could not restore. The race
reproduced on every run before the fix (two manual runs plus this red) and passed three
manual runs after it.

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
| `object-write-dropped-and-compare-off` | `scripts/backup.ts` | the same, with the inventory compare off | restore rebuilds rows and objects |
| `inventory-compare-off` | `scripts/backup.ts` | the restored-inventory compare | forged manifest is denied as `integrity_mismatch` |
| `snapshot-off` | `scripts/backup.ts` | `pg_dump --snapshot` on the exported snapshot | backup taken under writes restores |
| `key-leak` | `scripts/backup.ts` | writes the key hex into `backup.json` | backup holds no key |

All nine went red on the named test and every file was restored byte for byte. The
forged-manifest test re-seals the manifest with the test's own AES-GCM code, following the
documented layout, after changing `foundation_fixture.event` from 4 rows to 5.

## Recipe drive

`drive/` holds the outputs of the `.agents/skills/verify-agora/SKILL.md` backup Launch,
Drive and Cleanup blocks, run literally at this head. `drive/recipe-transcript.txt` is the
`bash -x` transcript with machine paths replaced by `<tmp>`. The assertion command printed
`outcome: pass`, Cleanup printed `removed` and `no key file in evidence`, and
`drive/wrapper.ndjson` records `allocated`, `started` and `cleaned` for one cluster.

## Review fixes

The review round (`19ebf4c`) changed three things. `create` reads each object once and
seals the bytes it inventoried. `restore` creates the `--objects` directory before
`pg_restore` and removes it if `pg_restore` fails. The unused `database_version` manifest
field and its `pg_restore --list` pass are gone. The round added three tests, so the file
now has thirteen. The receipts above stay as recorded for `4385f34`.

`review-fixes/` holds the pair from
`node scripts/record-red-green.mjs --parent 8bf2661 --head 19ebf4c` with the same
command. Red fails two tests and passes eleven:

- `an objects path whose parent is missing fails before any row is restored` finds 8
  tables in the target where it expects 0. The parent ran `pg_restore` before it created
  the directory.
- `an object rewritten while pg_dump runs ...` fails at `create` with exit 70, not with an
  inventory mismatch. The parent's `create` also ran `pg_restore --list`, and the test's
  substituted `AGORA_PG_BIN` directory holds only `pg_dump`. The `object-reread` guard
  negative below isolates the mechanism the test is for.

The third new test, `a failed pg_restore removes the objects directory it claimed`, passes
at the parent because the parent never created the directory before `pg_restore`. Only
its guard negative shows it can fail. Green passes all thirteen.
`node scripts/validate-evidence.mjs --dir evidence/U01c/agora-s1-prove-backup-restore/review-fixes --base 8bf2661acecf637580b16e62df431e9ead8500f9 --head 19ebf4cf93ccbe40c9eb79efb73bcd0db2b3120c`
passes with this checkout's producer key.

`review-fixes/guard-negatives/summary.json` records three mutations of `scripts/backup.ts`
at `19ebf4c`, applied and restored the same way as the nine above:

| Mutation | Disabled guard | Red test | Observed |
| --- | --- | --- | --- |
| `object-reread` | seal re-reads the file after `pg_dump` | object rewritten while `pg_dump` runs | `integrity_mismatch` on `object:alpha.txt` |
| `objects-claim-after-restore` | `pg_restore` runs before the directory is created | objects path whose parent is missing | 8 tables left in the target |
| `rmdir-off` | no `rmdirSync` after a failed `pg_restore` | failed `pg_restore` removes the directory | directory left behind |

Each went red on its named test alone, and the file was restored byte for byte after each
one. The recipe drive under `drive/` was not re-run at `19ebf4c`.

## Not proved

WAL archiving, separate-host restore, off-host key recovery, epoch rotation and fencing,
RPO and RTO, a dedicated backup role, external storage, key rotation, a normalized
schema comparison and restore across PostgreSQL versions. No independent security review has happened, and the implementer's own
checks are not one. D111 records AES-256-GCM as an implementation decision under R17 and
D32; it claims no captain or operator acceptance.
