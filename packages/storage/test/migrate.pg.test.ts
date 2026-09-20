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
	const url = new URL(ownerUrl);
	url.pathname = `/${probeName}`;
	probe = openDatabase(url.toString());
});

afterAll(async () => {
	await probe.close();
	await admin.query(`drop database ${probeName}`);
	await admin.end();
});

test('the app role connects as a non-owner without superuser or BYPASSRLS', async () => {
	const app = new Pool({ connectionString: appUrl });
	const role = await app.query<{ name: string; superuser: boolean; bypass: boolean }>('select current_user as name, rolsuper as superuser, rolbypassrls as bypass from pg_roles where rolname = current_user');
	await app.end();
	expect(role.rows[0]).toEqual({ name: 'agora_app', superuser: false, bypass: false });
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
