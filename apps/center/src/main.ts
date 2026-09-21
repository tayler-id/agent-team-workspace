import { serve } from '@hono/node-server';
import { LOCAL_ROOM } from '@agora/domain';
import { createPostgresLocalRoom, openDatabase } from '@agora/storage';
import { createApp } from './app.ts';

const connectionString = process.env['AGORA_DATABASE_URL'];
if (!connectionString) {
	console.error(JSON.stringify({ schema_version: 'agora.center-start/v1', outcome: 'usage_error', message: 'AGORA_DATABASE_URL is unset' }));
	process.exit(64);
}
const database = openDatabase(connectionString);
const port = Number(process.env['PORT'] ?? 3000);
// The only composition of this process: the fixed local-development room over PostgreSQL, as the non-owner service role.
const app = createApp({ probeDatabase: () => database.reachable(), localRoom: createPostgresLocalRoom(database, LOCAL_ROOM) });
serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, (address) => {
	process.stdout.write(`${JSON.stringify({ schema_version: 'agora.center-start/v1', address: `http://127.0.0.1:${address.port}` })}\n`);
});
