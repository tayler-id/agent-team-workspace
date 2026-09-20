import { afterAll, expect, test } from 'vitest';
import { createApp } from '../src/app.ts';
import { openDatabase } from '@agora/storage';

const live = openDatabase(process.env['AGORA_TEST_DATABASE_URL'] ?? '');
const unreachable = openDatabase('postgresql://agora_app@127.0.0.1:1/agora_test');

afterAll(async () => {
	await live.close();
	await unreachable.close();
});

test('GET /api/v1/health/ready is 200 ready against the real test database', async () => {
	const response = await createApp({ probeDatabase: () => live.reachable() }).request('/api/v1/health/ready');
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ schema_version: 'agora.readiness/v1', status: 'ready', checks: { database: 'ok' } });
});

test('GET /api/v1/health/ready is 503 not_ready when the database port refuses connections', async () => {
	const response = await createApp({ probeDatabase: () => unreachable.reachable() }).request('/api/v1/health/ready');
	expect(response.status).toBe(503);
	expect(await response.json()).toEqual({ schema_version: 'agora.readiness/v1', status: 'not_ready', checks: { database: 'unavailable' } });
});
