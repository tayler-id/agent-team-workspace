import type { ScopeId } from '@agora/domain';
import { Pool } from 'pg';
import { bindFixtureTransaction, type FixtureTransaction } from './fixture.ts';
import { runMigrations, schemaDigest, type MigrationReport } from './migrate.ts';

// The only handle other packages receive. pg types stay inside this package.
export interface Database {
	reachable(): Promise<boolean>;
	migrate(): Promise<MigrationReport>;
	schemaDigest(): Promise<MigrationReport['schema_digest']>;
	withScope<T>(scopeId: ScopeId, work: (tx: FixtureTransaction) => Promise<T>): Promise<T>;
	close(): Promise<void>;
}

export function openDatabase(connectionString: string): Database {
	const pool = new Pool({ connectionString, connectionTimeoutMillis: 2_000 });
	pool.on('error', () => undefined);
	return {
		async reachable() {
			try {
				await pool.query('select 1');
				return true;
			} catch {
				return false;
			}
		},
		migrate: () => runMigrations(pool),
		schemaDigest: () => schemaDigest(pool),
		async withScope(scopeId, work) {
			const client = await pool.connect();
			try {
				await client.query('begin');
				await client.query('select set_config($1, $2, true)', ['agora.scope_id', scopeId]);
				const result = await work(bindFixtureTransaction(client));
				await client.query('commit');
				return result;
			} catch (error) {
				await client.query('rollback');
				throw error;
			} finally {
				client.release();
			}
		},
		close: () => pool.end(),
	};
}
