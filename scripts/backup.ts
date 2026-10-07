import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BackupDeniedError, captureDatabase, compareInventory, createBackupKeyFile, inventoryDatabase, inventoryDigest, inventoryObject, loadBackupKey, openBlob, readObjects, sealBlob, type BackupKey, type IntegrityInventory } from '../packages/storage/src/index.ts';

// Exit codes follow scripts/project-checks.mjs: 0 pass, 1 denied, 64 usage, 70 infrastructure failure.
interface BackupHeader { schema_version: 'agora.backup/v1'; backup_id: string; key_id: string; cipher: 'aes-256-gcm' }
interface Manifest { backup_id: string; created_at: string; inventory: IntegrityInventory; objects: { file: string; name: string }[] }
class UsageError extends Error {}
const COMMANDS: Record<string, string[]> = {
	keygen: ['--key'],
	create: ['--database-url', '--objects', '--key', '--out'],
	restore: ['--backup', '--key', '--database-url', '--objects'],
};
const SCHEMAS: Record<string, string> = { keygen: 'agora.backup-key/v1', create: 'agora.backup-receipt/v1', restore: 'agora.restore-receipt/v1' };
const GIB = 1024 ** 3;
const [command = '', ...rest] = process.argv.slice(2);
const emit = (report: object, code: number): void => { process.stdout.write(`${JSON.stringify(report)}\n`); process.exitCode = code; };

function parse(): Map<string, string> {
	const allowed = COMMANDS[command];
	if (!allowed) throw new UsageError('usage: backup keygen|create|restore (see docs/site/cli.md)');
	const options = new Map<string, string>();
	for (let i = 0; i < rest.length; i += 2) {
		const [flag = '', value] = [rest[i], rest[i + 1]];
		if (!allowed.includes(flag) || options.has(flag) || !value || value.startsWith('--')) throw new UsageError(`unknown, duplicate or valueless option: ${flag}`);
		options.set(flag, value);
	}
	const missing = allowed.find(flag => !options.has(flag));
	if (missing) throw new UsageError(`missing option: ${missing}`);
	return options;
}

function tool(name: string, args: string[], input?: Buffer): Buffer {
	const result = spawnSync(process.env['AGORA_PG_BIN'] ? path.join(process.env['AGORA_PG_BIN'], name) : name, args, { input, maxBuffer: GIB, stdio: ['pipe', 'pipe', 'pipe'] });
	if (result.error) throw new Error(`${name} failed: ${result.error.message}`);
	if (result.status !== 0) throw new Error(`${name} failed (${result.status ?? result.signal}): ${result.stderr.toString('utf8').trim().slice(-2_000)}`);
	return result.stdout;
}

const writeNew = (file: string, bytes: Uint8Array | string): void => { writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); };

async function create(o: Map<string, string>, key: BackupKey): Promise<object> {
	const url = o.get('--database-url') ?? '', source = o.get('--objects') ?? '', out = o.get('--out') ?? '';
	const objects = readObjects(source);
	const { dump, tables } = await captureDatabase(url, (snapshot) => tool('pg_dump', ['--format=custom', '--no-password', `--snapshot=${snapshot}`, '--dbname', url]));
	const inventory: IntegrityInventory = { tables, objects: objects.map(inventoryObject) };
	const header: BackupHeader = { schema_version: 'agora.backup/v1', backup_id: randomUUID(), key_id: key.keyId, cipher: 'aes-256-gcm' };
	const id = header.backup_id;
	mkdirSync(out, { mode: 0o700 });
	mkdirSync(path.join(out, 'objects'), { mode: 0o700 });
	writeNew(path.join(out, 'backup.json'), `${JSON.stringify(header)}\n`);
	writeNew(path.join(out, 'database.agb'), sealBlob(key, dump, `${id}/database`));
	const files = objects.map(({ name, bytes }, i) => {
		const file = `objects/${String(i + 1).padStart(4, '0')}.agb`;
		writeNew(path.join(out, file), sealBlob(key, bytes, `${id}/${file.slice(0, -4)}`));
		return { file, name };
	});
	const manifest: Manifest = { backup_id: id, created_at: new Date().toISOString(), inventory, objects: files };
	writeNew(path.join(out, 'manifest.agb'), sealBlob(key, Buffer.from(JSON.stringify(manifest), 'utf8'), `${id}/manifest`));
	return { schema_version: SCHEMAS['create'], outcome: 'created', backup_id: id, key_id: key.keyId, inventory_digest: inventoryDigest(inventory), tables: tables.length, objects: objects.length };
}

async function restore(o: Map<string, string>, key: BackupKey): Promise<object> {
	const backup = o.get('--backup') ?? '', url = o.get('--database-url') ?? '', target = o.get('--objects') ?? '';
	const read = (file: string): Buffer => {
		try { return readFileSync(path.join(backup, file)); }
		catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new BackupDeniedError('missing_artifact', file); throw error; }
	};
	const open = (file: string, label: string): Uint8Array => {
		try { return openBlob(key, read(file), label); }
		catch (error) { if (error instanceof BackupDeniedError && error.reasonCode === 'corrupt') throw new BackupDeniedError('corrupt', file); throw error; }
	};
	let header: BackupHeader;
	try { header = JSON.parse(read('backup.json').toString('utf8')) as BackupHeader; }
	catch (error) { if (error instanceof SyntaxError) throw new BackupDeniedError('corrupt', 'backup.json'); throw error; }
	if (header.key_id !== key.keyId) throw new BackupDeniedError('wrong_key', 'backup.json');
	const id = header.backup_id;
	const manifest = JSON.parse(Buffer.from(open('manifest.agb', `${id}/manifest`)).toString('utf8')) as Manifest;
	const dump = open('database.agb', `${id}/database`);
	const objects = manifest.objects.map(({ file, name }) => {
		if (name !== path.basename(name) || name === '.' || name === '..') throw new BackupDeniedError('corrupt', 'manifest.agb');
		return { name, bytes: open(file, `${id}/${file.slice(0, -4)}`) };
	});
	// Nothing above touches the target; the emptiness checks are the first reads of it.
	if ((await inventoryDatabase(url)).length > 0) throw new BackupDeniedError('target_not_empty', 'database');
	try { mkdirSync(target, { mode: 0o700 }); }
	catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new BackupDeniedError('target_not_empty', 'objects'); throw error; }
	try { tool('pg_restore', ['--exit-on-error', '--single-transaction', '--no-password', '--dbname', url], Buffer.from(dump)); }
	catch (error) { rmdirSync(target); throw error; }
	for (const { name, bytes } of objects) writeNew(path.join(target, name), bytes);
	const observed: IntegrityInventory = { tables: await inventoryDatabase(url), objects: readObjects(target).map(inventoryObject) };
	const [mismatch] = compareInventory(manifest.inventory, observed);
	if (mismatch) throw new BackupDeniedError('integrity_mismatch', mismatch);
	return { schema_version: SCHEMAS['restore'], outcome: 'restored', backup_id: id, key_id: key.keyId, inventory_digest: inventoryDigest(manifest.inventory), tables: observed.tables.length, objects: observed.objects.length };
}

try {
	const options = parse();
	const keyFile = options.get('--key') ?? '';
	if (command === 'keygen') emit({ schema_version: SCHEMAS['keygen'], outcome: 'created', key_id: createBackupKeyFile(keyFile).keyId }, 0);
	else if (command === 'create') emit(await create(options, loadBackupKey(keyFile)), 0);
	else emit(await restore(options, loadBackupKey(keyFile)), 0);
} catch (error) {
	if (error instanceof UsageError) emit({ outcome: 'usage_error', message: error.message }, 64);
	else if (error instanceof BackupDeniedError) emit({ schema_version: SCHEMAS['restore'], outcome: 'denied', reason_code: error.reasonCode, subject: error.subject }, 1);
	else emit({ schema_version: SCHEMAS[command], outcome: 'infrastructure_failure', message: error instanceof Error ? error.message : String(error) }, 70);
}
