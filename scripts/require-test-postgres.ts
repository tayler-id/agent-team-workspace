// Vitest global setup for the pg project: a missing database is a blocked prerequisite, never a skipped test.
export default function requireTestPostgres(): void {
	for (const name of ['AGORA_TEST_DATABASE_URL', 'AGORA_TEST_OWNER_DATABASE_URL']) {
		if (!process.env[name]) {
			throw new Error(`blocked prerequisite: ${name} is unset. Run "pnpm test:pg" to boot a throwaway PostgreSQL cluster, or export both URLs for an existing PostgreSQL 18 server.`);
		}
	}
}
