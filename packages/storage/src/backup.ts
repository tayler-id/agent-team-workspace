import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { digestCanonical, type Digest } from '@agora/domain';
import { Client } from 'pg';

export type BackupDenial = 'wrong_key' | 'corrupt' | 'missing_artifact' | 'target_not_empty' | 'integrity_mismatch';

export class BackupDeniedError extends Error {
	readonly reasonCode: BackupDenial;
	readonly subject: string;
	constructor(reasonCode: BackupDenial, subject: string) {
		super(`backup denied: ${reasonCode} (${subject})`);
		this.name = 'BackupDeniedError';
		this.reasonCode = reasonCode;
		this.subject = subject;
	}
}

export interface BackupKey { readonly keyId: string; readonly bytes: Uint8Array }

export interface TableInventory { table: string; rows: string; digest: string }
export interface ObjectInventory { name: string; byte_length: number; digest: string }
export interface IntegrityInventory { tables: TableInventory[]; objects: ObjectInventory[] }

const MAGIC = Buffer.from('AGB1', 'ascii');
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const sha256 = (...parts: Uint8Array[]): string => `sha256:${parts.reduce((hash, part) => hash.update(part), createHash('sha256')).digest('hex')}`;
const byCodePoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function backupKey(bytes: Uint8Array): BackupKey {
	// The id commits to the key under a domain prefix; it is safe to print and store beside the backup.
	return { keyId: sha256(Buffer.from('agora.backup-key-id/v1\n', 'utf8'), bytes), bytes };
}

export function createBackupKeyFile(file: string): BackupKey {
	const bytes = randomBytes(32);
	writeFileSync(file, `${bytes.toString('hex')}\n`, { flag: 'wx', mode: 0o600 });
	return backupKey(bytes);
}

export function loadBackupKey(file: string): BackupKey {
	const text = readFileSync(file, 'utf8');
	if (!/^[0-9a-f]{64}\n?$/i.test(text)) throw new Error('invalid backup key');
	return backupKey(Buffer.from(text.slice(0, 64), 'hex'));
}

// Layout: 'AGB1' | nonce | tag | ciphertext. The label is bound as AAD, so a blob moved to another slot fails authentication.
export function sealBlob(key: BackupKey, plaintext: Uint8Array, label: string): Uint8Array {
	const nonce = randomBytes(NONCE_BYTES);
	const cipher = createCipheriv('aes-256-gcm', key.bytes, nonce);
	cipher.setAAD(Buffer.from(label, 'utf8'));
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	return Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), ciphertext]);
}

export function openBlob(key: BackupKey, sealed: Uint8Array, label: string): Uint8Array {
	const blob = Buffer.from(sealed.buffer, sealed.byteOffset, sealed.byteLength);
	const body = MAGIC.length + NONCE_BYTES + TAG_BYTES;
	if (blob.length < body || !blob.subarray(0, MAGIC.length).equals(MAGIC)) throw new BackupDeniedError('corrupt', label);
	try {
		const decipher = createDecipheriv('aes-256-gcm', key.bytes, blob.subarray(MAGIC.length, MAGIC.length + NONCE_BYTES));
		decipher.setAAD(Buffer.from(label, 'utf8'));
		decipher.setAuthTag(blob.subarray(MAGIC.length + NONCE_BYTES, body));
		return Buffer.concat([decipher.update(blob.subarray(body)), decipher.final()]);
	} catch {
		throw new BackupDeniedError('corrupt', label);
	}
}

// The role must bypass row-level security, or the counts and digests cover only the rows its scope can see.
export async function inventoryDatabase(connectionString: string): Promise<TableInventory[]> {
	const client = new Client({ connectionString, connectionTimeoutMillis: 2_000 });
	client.on('error', () => undefined);
	try {
		await client.connect();
		await client.query('begin isolation level repeatable read read only');
		const tables = await client.query<{ table: string; ident: string }>(`select n.nspname || '.' || c.relname as "table", format('%I.%I', n.nspname, c.relname) as ident
			from pg_class c join pg_namespace n on n.oid = c.relnamespace
			where c.relkind in ('r', 'p') and n.nspname not in ('pg_catalog', 'information_schema') and n.nspname not like 'pg\\_toast%'
			order by n.nspname collate "C", c.relname collate "C"`);
		const inventory: TableInventory[] = [];
		for (const { table, ident } of tables.rows) {
			const result = await client.query<{ rows: string; hex: string }>(`select count(*)::text as rows, encode(sha256(convert_to(coalesce(string_agg(t::text, E'\\n' order by t::text collate "C"), ''), 'UTF8')), 'hex') as hex from ${ident} t`);
			for (const row of result.rows) inventory.push({ table, rows: row.rows, digest: `sha256:${row.hex}` });
		}
		return inventory;
	} finally {
		await client.end();
	}
}

export function inventoryObjects(dir: string): ObjectInventory[] {
	const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => byCodePoint(a.name, b.name));
	return entries.map((entry) => {
		if (!entry.isFile()) throw new Error(`objects directory holds a non-regular entry: ${entry.name}`);
		const bytes = readFileSync(path.join(dir, entry.name));
		return { name: entry.name, byte_length: bytes.length, digest: sha256(bytes) };
	});
}

export function compareInventory(expected: IntegrityInventory, observed: IntegrityInventory): string[] {
	const subjects = (inventory: IntegrityInventory): Map<string, string> => new Map([...inventory.tables.map((t) => [`table:${t.table}`, `${t.rows}|${t.digest}`] as const), ...inventory.objects.map((o) => [`object:${o.name}`, `${o.byte_length}|${o.digest}`] as const)]);
	const want = subjects(expected);
	const have = subjects(observed);
	return [...new Set([...want.keys(), ...have.keys()])].filter((subject) => want.get(subject) !== have.get(subject)).sort(byCodePoint);
}

// Interfaces carry no index signature, so copy into plain records for the canonical JSON digest.
export const inventoryDigest = (inventory: IntegrityInventory): Digest => digestCanonical({ tables: inventory.tables.map((t) => ({ ...t })), objects: inventory.objects.map((o) => ({ ...o })) });
