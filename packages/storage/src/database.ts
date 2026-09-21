import type { LocalRoomStore, ProjectId, ScopeId } from '@agora/domain';
import { Pool, type PoolClient } from 'pg';
import { bindFixtureTransaction, type FixtureTransaction } from './fixture.ts';
import { bindLocalRoomStore } from './local-room.ts';
import { runMigrations, schemaDigest, type MigrationReport } from './migrate.ts';

// The only handle other packages receive. pg types stay inside this package.
export interface Database {
	reachable(): Promise<boolean>;
	migrate(): Promise<MigrationReport>;
	schemaDigest(): Promise<MigrationReport['schema_digest']>;
	withScope<T>(scopeId: ScopeId, work: (tx: FixtureTransaction) => Promise<T>): Promise<T>;
	// One transaction confined to one project; readOnly snapshots run under repeatable read so the counter and the rows agree.
	withLocalRoom<T>(projectId: ProjectId, work: (store: LocalRoomStore) => Promise<T>, options?: { readOnly: boolean }): Promise<T>;
	close(): Promise<void>;
}

export function openDatabase(connectionString: string): Database {
	const pool = new Pool({ connectionString, connectionTimeoutMillis: 2_000 });
	pool.on('error', () => undefined);
	// Binds agora.scope_id for the row-level-security policies, commits on return and rolls back on throw.
	async function transaction<T>(scope: string, begin: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
		const client = await pool.connect();
		let discard: Error | undefined;
		try {
			await client.query(begin);
			await client.query('select set_config($1, $2, true)', ['agora.scope_id', scope]);
			const result = await work(client);
			await client.query('commit');
			return result;
		} catch (error) {
			try {
				await client.query('rollback');
			} catch (rollbackError) {
				// The connection may still hold an open transaction and bound scope; releasing with an error makes pg discard it.
				discard = rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));
			}
			throw error;
		} finally {
			client.release(discard);
		}
	}
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
		withScope: (scopeId, work) => transaction(scopeId, 'begin', (client) => work(bindFixtureTransaction(client))),
		withLocalRoom: (projectId, work, options) => transaction(projectId, options?.readOnly ? 'begin isolation level repeatable read read only' : 'begin', (client) => work(bindLocalRoomStore(client, projectId))),
		close: () => pool.end(),
	};
}
