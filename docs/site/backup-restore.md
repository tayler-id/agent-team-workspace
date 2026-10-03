# Encrypted backup and verified restore

## What it is

The first U01c.B01 slice. [The backup CLI](repo:scripts/backup.ts) turns a disposable PostgreSQL 18 fixture database and a flat directory of artifact files into one encrypted backup directory, then restores that backup into a second, empty database in the same throwaway cluster and a fresh object directory. [Storage](repo:packages/storage/src/backup.ts) owns the encryption and the integrity inventory; the script owns `pg_dump`, `pg_restore` and the files. It is a local foundation fixture, not the S1 backup service, and it does not qualify U01c or FG07.

## What it does

```sh
node scripts/backup.ts keygen  --key KEYFILE
node scripts/backup.ts create  --database-url URL --objects DIR --key KEYFILE --out BACKUP
node scripts/backup.ts restore --backup BACKUP --key KEYFILE --database-url URL --objects NEWDIR
```

`keygen` writes 32 random bytes as 64 hex characters to a new file with mode 0600 and prints only the key's `key_id`, a SHA-256 commitment under a fixed domain prefix. It refuses an existing key file with exit 70. `create` refuses an existing `--out`, then writes a plaintext `backup.json` with the backup ID, `key_id` and cipher name, `database.agb` (the sealed `pg_dump --format=custom` output), one sealed `objects/NNNN.agb` per artifact and `manifest.agb`. `create` reads each artifact once and seals the same bytes it inventories, so a file rewritten while `pg_dump` runs is backed up as it was read. The sealed manifest holds the creation time, artifact file names and the integrity inventory. The inventory records, per table outside the system schemas, the row count and a SHA-256 over the rows' sorted text, and per object, its byte length and SHA-256. The key file never goes in the backup directory; the backup carries only `key_id`.

`restore` decrypts and authenticates everything into memory before it touches the target. Then it checks that the target database has no user tables and creates the `--objects` directory, which must not exist yet. Only then does it run `pg_restore --single-transaction --exit-on-error`, removing that empty directory again if `pg_restore` fails. It writes each object with exclusive create and compares a fresh inventory of the target with the manifest's. Every run prints one JSON line. Exit 0 is pass, 1 denied, 64 usage, 70 infrastructure failure. A denial names a `reason_code` and a `subject`.

| `reason_code` | When | Target written? |
| --- | --- | --- |
| `wrong_key` | `key_id` in `backup.json` differs from the supplied key | No |
| `corrupt` | A sealed file fails AES-GCM authentication or has a bad header, `backup.json` does not parse, or a manifest object name is not a plain file name; subject is the file, for example `database.agb` | No |
| `missing_artifact` | `backup.json`, `manifest.agb`, `database.agb` or a listed `objects/NNNN.agb` is absent | No |
| `target_not_empty` | The target database already holds a user table (subject `database`) or `--objects` exists (subject `objects`) | No |
| `integrity_mismatch` | The restored rows or objects differ from the manifest; subject is the first mismatch, such as `table:schema.name` | Yes, the restored rows and objects stay in the target, which is disposable here |

## Why it exists

A backup file that exists is not a restore. U01c needs proof that restored rows and artifact bytes equal what was backed up, and that a wrong key, a flipped byte or a missing file stops the restore before it writes partial state. This slice builds that artifact format and its integrity check first, so the later separate-host, WAL and key-recovery work restores into something already checked. [Operations](operations.md#target-production-topology) states the production targets this slice does not yet meet.

## How it works

```flow
Generate a key | keygen writes 32 random bytes to a 0600 file outside the backup directory and prints only key_id.
Seal the backup | create exports one repeatable-read snapshot, runs pg_dump against it and counts rows in that same transaction, reads each object once, seals each blob with AES-256-GCM under a fresh 12-byte nonce, binds the blob's own slot name as associated data and records a row/object inventory in the sealed manifest.
Check before writing | restore compares key_id, then authenticates the manifest, the dump and every listed object in memory; wrong_key, corrupt and missing_artifact deny here with the target untouched.
Claim an empty target | A target database with any user table is target_not_empty. Restore then creates the objects directory before pg_restore, so an existing path is target_not_empty and an unwritable one fails with no row restored.
Restore and compare | pg_restore in one transaction, objects written with exclusive create, then a fresh inventory must equal the manifest or the run is integrity_mismatch.
```

Binding the slot name (`<backup_id>/database`, `<backup_id>/objects/0002`) as associated data means a sealed blob copied into another slot or another backup fails authentication as `corrupt`. The inventory reads every table in one repeatable-read, read-only transaction. During `create` that transaction first calls `pg_export_snapshot()` and `pg_dump --snapshot` reads the same snapshot, so a concurrent writer cannot make the sealed row counts disagree with the dump. The inventory must run as a role that bypasses row-level security, or it would count only the rows one scope can see, so this slice backs up and inventories as the cluster superuser.

The cipher is an implementation decision under the accepted requirement for encrypted backups ([R17](repo:docs/technical-spec.md), D32). [Decision D111](repo:docs/decisions.tsv) records AES-256-GCM through `node:crypto` with a 32-byte key file and no new dependency, and why. It is not a captain or operator acceptance, and the crypto and key handling still need independent review.

## Implementation status

**In progress.** Built in this slice is the encrypted backup artifact, the pre-restore checks for key, corruption, missing files and a used target, and the row and object integrity proof. All of it runs on disposable fixtures in one throwaway cluster, restoring into a second database. Still open U01c work, with no claim made here:

- WAL archiving and point-in-time recovery.
- Restore on a separate host, and fencing the old instance.
- Off-host key escrow and proof that the key is recoverable without the original host.
- Epoch rotation and old-epoch denial.
- RPO and RTO measurement against the 15-minute and four-hour targets.
- A dedicated least-privilege backup role in place of the superuser.
- Upload to external storage.
- Real key rotation.
- A normalized schema comparison. The repository's `schemaDigest()` differs between source and restored database because PostgreSQL re-deparses the `local_room.message_body_check` constraint text (the same nested AND, flattened). This slice proves rows, object bytes and an unchanged migration journal, not a schema text digest.
- Independent security review of the format and the cipher choice.
- Restore across PostgreSQL versions. The manifest records no source server version and restore checks none. This slice proves a PostgreSQL 18 to PostgreSQL 18 restore only.

No U01c milestone verdict, FG07 or production backup claim follows from this page.

## Verification and proof

[The end-to-end test](repo:packages/storage/test/backup.pg.test.ts) drives the CLI as a child process. It migrates and seeds a dedicated source database `agora_backup_source_<uuid>` and restores into `agora_restore_<uuid>` databases in the same throwaway cluster. Its first assertion proves the same driver reaches the CLI's usage route, the R22 baseline that makes a later failure a behavioral one. It runs the denials before the successful restore. It asserts that no file in the backup holds the key, as hex text or as raw bytes. A wrong key, one flipped byte in `database.agb` and a deleted `objects/0002.agb` are each denied with their reason code while the target stays empty. A good restore matches the create receipt's `inventory_digest`, returns the same events and claims through the application role and matches every object's bytes, and `migrate()` on the restored database applies 0 migrations with the same total. The schema text digest is deliberately not compared; see the open work above. A second restore into the same target is `target_not_empty`. A manifest re-sealed by the test's own AES-GCM code with one table's row count changed restores and is then denied as `integrity_mismatch` with subject `table:foundation_fixture.event`. A backup created while the test appends events in a loop must restore with its own `inventory_digest`; before the one-snapshot change it was denied as `integrity_mismatch` every run. A `pg_dump` substituted through `AGORA_PG_BIN` rewrites an object before running the real one; that backup must restore the object's original bytes under its own `inventory_digest`. A restore whose `--objects` parent is missing exits 70 with the target database still empty, and a `pg_restore` that exits 1 leaves neither rows nor the objects directory behind. [The verification recipe](repo:.agents/skills/verify-agora/SKILL.md) has the literal launch, drive and cleanup commands; receipts go under `evidence/U01c/agora-s1-prove-backup-restore/`. [The CLI reference](cli.md#encrypted-backup-and-restore) lists the commands and outputs.
