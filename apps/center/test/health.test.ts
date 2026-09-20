import { expect, test } from 'vitest';
import { createApp } from '../src/app.ts';

test('GET /api/v1/health reports liveness without touching any dependency', async () => {
	const response = await createApp({ probeDatabase: () => Promise.reject(new Error('liveness must not probe')) }).request('/api/v1/health');
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ schema_version: 'agora.health/v1', status: 'ok', service: 'agora-center' });
});

test('GET /api/v1/health/ready reports not_ready with a 503 when the database probe fails', async () => {
	const response = await createApp({ probeDatabase: () => Promise.resolve(false) }).request('/api/v1/health/ready');
	expect(response.status).toBe(503);
	expect(await response.json()).toEqual({ schema_version: 'agora.readiness/v1', status: 'not_ready', checks: { database: 'unavailable' } });
});
