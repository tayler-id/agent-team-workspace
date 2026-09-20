import { expect, test } from 'vitest';
import { createApp } from '@agora/center';

test('GET /api/v1/health reports liveness without touching any dependency', async () => {
	const response = await createApp().request('/api/v1/health');
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ schema_version: 'agora.health/v1', status: 'ok', service: 'agora-center' });
});
