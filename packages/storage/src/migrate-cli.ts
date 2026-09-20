import { openDatabase } from './database.ts';

// Exit codes follow R12: 0 pass, 64 usage error, 70 infrastructure failure.
const connectionString = process.env['AGORA_DATABASE_URL'];
if (!connectionString) {
	console.error(JSON.stringify({ schema_version: 'agora.migration-report/v1', outcome: 'usage_error', message: 'AGORA_DATABASE_URL is unset' }));
	process.exit(64);
}
const database = openDatabase(connectionString);
try {
	const report = await database.migrate();
	process.stdout.write(`${JSON.stringify({ ...report, outcome: 'pass' })}\n`);
} catch (error) {
	console.error(JSON.stringify({ schema_version: 'agora.migration-report/v1', outcome: 'infrastructure_failure', message: error instanceof Error ? error.message : String(error) }));
	process.exitCode = 70;
} finally {
	await database.close();
}
