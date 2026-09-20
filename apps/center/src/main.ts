import { serve } from '@hono/node-server';
import { openDatabase } from '@agora/storage';
import { createApp } from './app.ts';

const connectionString = process.env['AGORA_DATABASE_URL'];
if (!connectionString) {
	console.error(JSON.stringify({ schema_version: 'agora.center-start/v1', outcome: 'usage_error', message: 'AGORA_DATABASE_URL is unset' }));
	process.exit(64);
}
const database = openDatabase(connectionString);
const port = Number(process.env['PORT'] ?? 3000);
serve({ fetch: createApp({ probeDatabase: () => database.reachable() }).fetch, port, hostname: '127.0.0.1' }, (address) => {
	process.stdout.write(`${JSON.stringify({ schema_version: 'agora.center-start/v1', address: `http://127.0.0.1:${address.port}` })}\n`);
});
