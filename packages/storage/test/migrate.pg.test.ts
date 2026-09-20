import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { Pool } from 'pg';
import { MigrationPrerequisiteError, openDatabase, type Database } from '@agora/storage';

const ownerUrl = process.env['AGORA_TEST_OWNER_DATABASE_URL'] ?? '';
const appUrl = process.env['AGORA_TEST_DATABASE_URL'] ?? '';
const superuserUrl = process.env['AGORA_TEST_SUPERUSER_DATABASE_URL'] ?? '';
const probeName = `agora_migrate_probe_${randomUUID().replaceAll('-', '')}`;
const admin = new Pool({ connectionString: ownerUrl });
let probe: Database;

beforeAll(async () => {
	await admin.query(`create database ${probeName}`);
	probe = openDatabase(withDatabase(ownerUrl, probeName));
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

// Replaces only the database segment of a connection string that may have no host and an unencoded socket dir in its query.
const withDatabase = (url: string, name: string) => url.replace(/^([a-z]+:\/\/[^/?]*)\/[^?]*(\?.*)?$/, (_match, prefix: string, query: string | undefined) => `${prefix}/${name}${query ?? ''}`);

test('a missing agora_app role blocks the migration with a prerequisite error and applies nothing', async () => {
	const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8')) as { entries: unknown[] };
	const superuser = new Pool({ connectionString: superuserUrl });
	const blockedName = `agora_blocked_probe_${randomUUID().replaceAll('-', '')}`;
	let blocked: Database | undefined;
	try {
		// Repair a rename left behind by an aborted earlier run before hiding the role again.
		await superuser.query("do $$ begin if exists (select 1 from pg_roles where rolname = 'agora_app_hidden') then alter role agora_app_hidden rename to agora_app; end if; end $$");
		await admin.query(`create database ${blockedName}`);
		blocked = openDatabase(withDatabase(ownerUrl, blockedName));
		await superuser.query('alter role agora_app rename to agora_app_hidden');
		try {
			await expect(blocked.migrate()).rejects.toThrow(MigrationPrerequisiteError);
		} finally {
			await superuser.query('alter role agora_app_hidden rename to agora_app');
		}
		expect(await blocked.migrate()).toMatchObject({ applied: journal.entries.length, total: journal.entries.length });
	} finally {
		await blocked?.close();
		await admin.query(`drop database if exists ${blockedName}`);
		await superuser.end();
	}
});
