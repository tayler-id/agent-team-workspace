import { serve } from '@hono/node-server';
import { createApp } from './app.ts';

const port = Number(process.env['PORT'] ?? 3000);
serve({ fetch: createApp().fetch, port, hostname: '127.0.0.1' }, (address) => {
	process.stdout.write(`${JSON.stringify({ schema_version: 'agora.center-start/v1', address: `http://127.0.0.1:${address.port}` })}\n`);
});
