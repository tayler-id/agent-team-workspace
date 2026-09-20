import { fileURLToPath } from 'node:url';
import { digestCanonical, type Digest } from '@agora/domain';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Pool } from 'pg';

export interface MigrationReport {
	schema_version: 'agora.migration-report/v1';
	applied: number;
	total: number;
	schema_digest: Digest;
	database_version: string;
}

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
const BOOKKEEPING = 'drizzle';
const HIDDEN_SCHEMAS = `('pg_catalog', 'information_schema', '${BOOKKEEPING}')`;

async function appliedCount(pool: Pool): Promise<number> {
	const exists = await pool.query<{ table: string | null }>(`select to_regclass('${BOOKKEEPING}.__drizzle_migrations')::text as "table"`);
	if (exists.rows[0]?.table === null) return 0;
	const count = await pool.query<{ count: string }>(`select count(*)::text as count from ${BOOKKEEPING}.__drizzle_migrations`);
	return Number(count.rows[0]?.count ?? 0);
}

// Applies every journal entry not yet recorded. Rerunning is a no-op that returns applied: 0 and the same digest.
export async function runMigrations(pool: Pool): Promise<MigrationReport> {
	const before = await appliedCount(pool);
	await migrate(drizzle(pool), { migrationsFolder, migrationsSchema: BOOKKEEPING });
	const total = await appliedCount(pool);
	const version = await pool.query<{ version: string }>('select version() as version');
	return {
		schema_version: 'agora.migration-report/v1',
		applied: total - before,
		total,
		schema_digest: await schemaDigest(pool),
		database_version: version.rows[0]?.version.split(' on ')[0] ?? 'unknown',
	};
}

// Content digest of the reviewed schema: relations, columns, constraints, indexes, row security, policies and grants outside bookkeeping schemas.
export async function schemaDigest(pool: Pool): Promise<Digest> {
	const rows = async (sql: string): Promise<Record<string, string | boolean | string[] | null>[]> => (await pool.query(sql)).rows as Record<string, string | boolean | string[] | null>[];
	const structure = {
		schemas: await rows(`select nspname from pg_namespace where nspname not in ${HIDDEN_SCHEMAS} and nspname not like 'pg\\_%' order by 1`),
		columns: await rows(`select table_schema, table_name, column_name, udt_name, is_nullable, column_default from information_schema.columns where table_schema not in ${HIDDEN_SCHEMAS} order by 1, 2, ordinal_position`),
		constraints: await rows(`select n.nspname as schema, c.conrelid::regclass::text as relation, c.conname as name, pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname not in ${HIDDEN_SCHEMAS} order by 1, 2, 3`),
		indexes: await rows(`select schemaname, tablename, indexname, indexdef from pg_indexes where schemaname not in ${HIDDEN_SCHEMAS} order by 1, 2, 3`),
		rowSecurity: await rows(`select n.nspname as schema, c.relname as relation, c.relrowsecurity as enabled, c.relforcerowsecurity as forced from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r' and n.nspname not in ${HIDDEN_SCHEMAS} order by 1, 2`),
		policies: await rows(`select schemaname, tablename, policyname, permissive, roles::text[] as roles, cmd, qual, with_check from pg_policies where schemaname not in ${HIDDEN_SCHEMAS} order by 1, 2, 3`),
		grants: await rows(`select table_schema, table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema not in ${HIDDEN_SCHEMAS} order by 1, 2, 3, 4`),
	};
	return digestCanonical(structure);
}
