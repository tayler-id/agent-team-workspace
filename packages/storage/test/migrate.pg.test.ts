import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { Pool } from 'pg';
import { openDatabase, type Database } from '@agora/storage';

const ownerUrl = process.env['AGORA_TEST_OWNER_DATABASE_URL'] ?? '';
const appUrl = process.env['AGORA_TEST_DATABASE_URL'] ?? '';
const probeName = `agora_migrate_probe_${randomUUID().replaceAll('-', '')}`;
const admin = new Pool({ connectionString: ownerUrl });
let probe: Database;

beforeAll(async () => {
	await admin.query(`create database ${probeName}`);
	// Replace only the database segment; the URL may have no host and may carry an unencoded socket dir in its query.
	probe = openDatabase(ownerUrl.replace(/^([a-z]+:\/\/[^/?]*)\/[^?]*(\?.*)?$/, (_match, prefix: string, query: string | undefined) => `${prefix}/${probeName}${query ?? ''}`));
});

afterAll(async () => {
	await probe.close();
	await admin.query(`drop database ${probeName}`);
	await admin.end();
});

test('the app role and the schema owner are neither superusers nor BYPASSRLS, so forced row security binds both', async () => {
	const roleOf = async (url: string) => {
		const pool = new Pool({ connectionString: url });
		const role = await pool.query<{ name: string; superuser: boolean; bypass: boolean }>('select current_user as name, rolsuper as superuser, rolbypassrls as bypass from pg_roles where rolname = current_user');
		await pool.end();
		return role.rows[0];
	};
	expect(await roleOf(appUrl)).toEqual({ name: 'agora_app', superuser: false, bypass: false });
	expect(await roleOf(ownerUrl)).toEqual({ name: 'agora_owner', superuser: false, bypass: false });
});

test('a fresh database applies every journal entry once and a second run is a no-op with the same schema digest', async () => {
	const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8')) as { entries: unknown[] };
	const first = await probe.migrate();
	const second = await probe.migrate();
	expect(first.database_version).toMatch(/^PostgreSQL 18\.\d+/);
	expect(first.applied).toBe(journal.entries.length);
	expect(first.total).toBe(journal.entries.length);
	expect(second).toEqual({ ...first, applied: 0 });
});
