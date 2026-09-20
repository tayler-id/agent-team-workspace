import { Hono } from 'hono';

export interface HealthReport {
	schema_version: 'agora.health/v1';
	status: 'ok';
	service: 'agora-center';
}

export function createApp(): Hono {
	const app = new Hono();
	app.get('/api/v1/health', (c) => c.json<HealthReport>({ schema_version: 'agora.health/v1', status: 'ok', service: 'agora-center' }));
	return app;
}
