import { Pool } from 'pg';

// The only handle other packages receive. pg types stay inside this package.
export interface Database {
	reachable(): Promise<boolean>;
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
		close: () => pool.end(),
	};
}
