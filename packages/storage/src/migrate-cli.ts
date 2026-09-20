import { openDatabase } from './database.ts';
import { MigrationPrerequisiteError } from './migrate.ts';

// Exit codes follow R12: 0 pass, 2 blocked prerequisite, 64 usage error, 70 infrastructure failure.
// Migrations run as the schema owner, never as the service role.
const connectionString = process.env['AGORA_MIGRATION_DATABASE_URL'];
if (!connectionString) {
	console.error(JSON.stringify({ schema_version: 'agora.migration-report/v1', outcome: 'usage_error', message: 'AGORA_MIGRATION_DATABASE_URL is unset' }));
	process.exit(64);
}
const database = openDatabase(connectionString);
try {
	const report = await database.migrate();
	process.stdout.write(`${JSON.stringify({ ...report, outcome: 'pass' })}\n`);
} catch (error) {
	const blocked = error instanceof MigrationPrerequisiteError;
	console.error(JSON.stringify({ schema_version: 'agora.migration-report/v1', outcome: blocked ? 'blocked' : 'infrastructure_failure', message: error instanceof Error ? error.message : String(error) }));
	process.exitCode = blocked ? 2 : 70;
} finally {
	await database.close();
}
