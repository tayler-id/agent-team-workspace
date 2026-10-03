# U01c.B01 slice 1: encrypted backup artifact and verified restore integrity

Task receipts for the first bounded slice of `U01c.B01`. They prove the slice, not the U01c
milestone, FG07, separate-host survival or production protection. The feature page is
[backup-restore](../../../docs/site/backup-restore.md).

Toolchain: official Node 24.21.0 `darwin-arm64` from nodejs.org, checked against its
`SHASUMS256.txt` and first on `PATH`; pnpm 10.34.1; Homebrew PostgreSQL 18.4; the Python
venv from `packages/verification/fixture/requirements.txt` first on `PATH`.

## Current and historical receipts

The branch was rebased onto `main` at `15619b1` after the first receipts were recorded, so
this directory holds two sets.

- Current. `rebased/` holds the three red/green pairs re-recorded at the rebased SHAs, and
  `drive/` holds the recipe drive at `1ac8af7`. The three `rebased/` pairs validate with the
  existing producer key for target `local-foundation-fixture`, this checkout's
  `.scratch/producer.key`.
- Historical. The bundle root, `snapshot-race/`, `review-fixes/` and both
  `guard-negatives/` directories were recorded before the rebase. They stay byte for byte as
  recorded, signatures included, and name pre-rebase commits that are not ancestors of this
  branch. [Historical receipts](#historical-receipts-before-the-rebase) describes them.

The owner confirmed separately that the local ref
`refs/heads/archive/agora-backup-integrity-slice-pre-rebase` in the original owning
repository retains the pre-rebase commits. It points at
`6f2304c8998ecfb4268199f5fb888c50932737cf`, the pre-rebase branch head, and every other
pre-rebase commit in the table below is its ancestor. The ref is local to that repository.
This branch neither merges that history nor carries the ref, and nothing here promises
that the pipeline clone or `origin` holds it.

Each pre-rebase commit differs from its rebased twin only in the 22 files `main` changed
between `a62662e` and `15619b1`, which are the candidate CI workflow and its scripts, test,
evidence and docs. None of the backup source and test files, the lockfile,
`vitest.config.ts` or `tsconfig.base.json` is among them. In
`.agents/skills/verify-agora/SKILL.md` the only difference is `main`'s candidate CI
section, so the backup recipe blocks are the same.

| Pre-rebase | Rebased | Commit |
| --- | --- | --- |
| `4385f34` | `c3cd5f3` | ours merge of `1eea48b`, head of the first two pairs |
| `07d19c1` | `790f154` | concurrent-writer test, snapshot-race parent |
| `8bf2661` | `765911c` | first evidence commit, review-fix parent |
| `19ebf4c` | `f2cc13f` | review-fix code change |
| `206e4c2` | `ee70e79` | `AGORA_PG_BIN` test change, review-fix head |
| `6f2304c` | `1ac8af7` | branch head, recipe drive commit |

`1eea48b` kept its SHA, because the merge brings it in as a second parent.

`rebased/` holds the three pairs re-recorded at the rebased SHAs with the same recorder
and command:

| Bundle | Parent | Head | Red | Green |
| --- | --- | --- | --- | --- |
| `rebased/baseline/` | `1eea48b` | `c3cd5f3` | 9 fail, 1 passes | 10 pass |
| `rebased/snapshot-race/` | `790f154` | `c3cd5f3` | only the concurrent-writer test fails, `integrity_mismatch` | 10 pass |
| `rebased/review-fixes/` | `765911c` | `ee70e79` | 2 fail, 11 pass | 13 pass |

Each red fails the same tests with the same assertions as its pre-rebase pair. The
baseline patch also carries `packages/verification/test/ci-workflow.test.ts`, because
`main` added that test after `1eea48b`. The backup command never runs it. The Python venv
was not on `PATH` for these runs, and the backup test does not use it.
`node scripts/validate-evidence.mjs` passes on all three with the existing
`local-foundation-fixture` key when given full SHAs:

- `rebased/baseline`: `--base 1eea48bf63c84d51a9e635e8fef0ed71cb083ed0 --head c3cd5f3309ae65c0a002c59b6cb5fe7604a38f45`
- `rebased/snapshot-race`: `--base 790f154d606c69723c2385c250de20057f19433c --head c3cd5f3309ae65c0a002c59b6cb5fe7604a38f45`
- `rebased/review-fixes`: `--base 765911c3d89efc22564b6c40370031f2c1a4c013 --head ee70e79391c39e240f983d32d3b533c97672e1d7`

For the historical receipts, the same key signed `review-fixes/`, which still passes. It
rejects the root bundle and `snapshot-race/` with `producer_signature_invalid`. Another
checkout's key signed those two, and that key is not here, so only its holder can re-check
them. The twelve historical guard negatives were applied at `4385f34` and `206e4c2` and
were not re-run. The files they mutate are byte-identical at the rebased twins.

## Recipe drive

`drive/` holds the outputs of the `.agents/skills/verify-agora/SKILL.md` backup Launch,
Drive and Cleanup blocks, extracted from the recipe and run literally in one `bash -x`
session at `1ac8af7`, whose code matches the rebased review-fix head `ee70e79`. They
replace the drives at `206e4c2` and, before that, `4385f34`.
`drive/recipe-transcript.txt` is that transcript. It and `drive/wrapper.ndjson` have
temporary paths replaced by `<tmp>` and the home directory by `~`. The pg test step
passed thirteen of thirteen, the assertion command printed `outcome: pass`, Cleanup
printed `removed` and
`no key file in evidence`, and `drive/wrapper.ndjson` records `allocated`, `started` and
`cleaned` for one cluster.

## Historical receipts before the rebase

Everything in this section was recorded at the pre-rebase commits and is kept as recorded.
The current proof for the same tests is in `rebased/`.

### Red and green

`red.log`, `green.log`, `test-patch.diff` and `manifest.json` come from
`node scripts/record-red-green.mjs --parent 1eea48b --head 4385f34` with the command
`node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg packages/storage/test/backup.pg.test.ts`.

`1eea48b` is the R22 test-only parent revision: `a62662e`, the slice's parent before the
rebase, plus a three-line `scripts/backup.ts` that prints only the usage route
(`outcome: usage_error`, exit 64) for every call. A parent with no CLI at all is not valid
red, because the driver would prove nothing there. The branch merges `1eea48b` with the
ours strategy (`c3cd5f3`, `4385f34` before the rebase), so the commit is reachable and the
tree is unchanged.

At the baseline, the first test passes: the same `cli()` driver reaches the usage route.
Nine fail. Five fail on literal values, the CLI answering `{ status: 64, usage_error }`
where the test expects `created`, `denied` or `restored`. Four fail with ENOENT on the key
or backup files that the failed keygen and create never wrote. At the head all ten pass.
The logs carry machine paths because the signed manifest covers their exact bytes.
When recorded, `node scripts/validate-evidence.mjs` passed on both bundles with full SHAs, `--base 1eea48bf63c84d51a9e635e8fef0ed71cb083ed0` or
`--base 07d19c1e2d84d4d9ef81233644d0eee0973c8036` with `--head 4385f3492655f42ce7d6330937aa39131c1dcdd6`.
This checkout's key rejects both, see [Current and historical receipts](#current-and-historical-receipts).

`snapshot-race/` is the pair for the one-snapshot fix, parent `07d19c1` (the commit that
added the concurrent-writer test, before the fix) and head `4385f34`. Its red fails only
that test, with `reason_code: integrity_mismatch`: `create` counted rows in a later
snapshot than `pg_dump`, so a backup taken under writes could not restore. The race
reproduced on every run before the fix (two manual runs plus this red) and passed three
manual runs after it.

### Guard negatives

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

### Review fixes

The review round changed three things in `19ebf4c`. `create` reads each object once and
seals the bytes it inventoried. `restore` creates the `--objects` directory before
`pg_restore` and removes it if `pg_restore` fails. The unused `database_version` manifest
field and its `pg_restore --list` pass are gone. The round added three tests, so the file
now has thirteen. `206e4c2` then changed only the test's substituted `AGORA_PG_BIN`
directory: it now links `pg_dump`, `pg_restore` and `psql` to the binaries the CLI would
resolve and replaces just the one tool. Before that, the parent's `create` failed the
object-rewrite test with exit 70 on a missing `pg_restore`, not on the re-read. The
receipts above stay as recorded for `4385f34`.

`review-fixes/` holds the pair from
`node scripts/record-red-green.mjs --parent 8bf2661 --head 206e4c2` with the same
command. Red fails two tests on behavior and passes eleven:

- `an object rewritten while pg_dump runs ...` is denied `integrity_mismatch` on
  `object:alpha.txt` at restore. The parent sealed the file as it read it after
  `pg_dump`, while its inventory held the bytes from before.
- `an objects path whose parent is missing fails before any row is restored` finds 8
  tables in the target where it expects 0. The parent ran `pg_restore` before it created
  the directory.

The third new test, `a failed pg_restore removes the objects directory it claimed`, passes
at the parent because the parent never created the directory before `pg_restore`. Only
its guard negative shows it can fail. Green passes all thirteen.
`node scripts/validate-evidence.mjs --dir evidence/U01c/agora-s1-prove-backup-restore/review-fixes --base 8bf2661acecf637580b16e62df431e9ead8500f9 --head 206e4c22fd55157f744102ff06a6a3a036e58428`
passes with this checkout's producer key.

`review-fixes/guard-negatives/summary.json` records three mutations of `scripts/backup.ts`
at `206e4c2`, applied and restored the same way as the nine above:

| Mutation | Disabled guard | Red test | Observed |
| --- | --- | --- | --- |
| `object-reread` | seal re-reads the file after `pg_dump` | object rewritten while `pg_dump` runs | `integrity_mismatch` on `object:alpha.txt` |
| `objects-claim-after-restore` | `pg_restore` runs before the directory is created | objects path whose parent is missing | 8 tables left in the target |
| `rmdir-off` | no `rmdirSync` after a failed `pg_restore` | failed `pg_restore` removes the directory | directory left behind |

Each went red on its named test alone, and the file was restored byte for byte after each
one.

## Not proved

WAL archiving, separate-host restore, off-host key recovery, epoch rotation and fencing,
RPO and RTO, a dedicated backup role, external storage, key rotation, a normalized
schema comparison and restore across PostgreSQL versions. No independent security review
has happened, and the implementer's own checks are not one. D111 records AES-256-GCM as an implementation decision under R17 and
D32; it claims no captain or operator acceptance.
