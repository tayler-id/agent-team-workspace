// Non-production fixture composition only. The production center does not mount this journal.
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createApp } from './app.ts';
import { openDatabase } from '@agora/storage';
import { asScopeId } from '@agora/domain';
/** @param {{database: string, id: string, handle: string, object_namespace: string}} state */
export async function start(state) {
	const owner = openDatabase(state.database.replace('agora_app@', 'agora_owner@'));
	try { await owner.migrate(); } finally { await owner.close(); }
	const database = openDatabase(state.database), scope = asScopeId(state.id);
	const core = createApp({ probeDatabase: () => database.reachable() }); const app = new Hono();
	app.use('*', async (c, next) => { if (c.req.header('x-agora-handle') !== state.handle) return c.json({ reason_code: 'scope_mismatch' }, 403); await next(); return undefined; });
	app.get('/api/v1/fixture/effects', async c => {
		const rows = await database.withScope(scope, tx => tx.readEvents(state.id));
		return c.json(rows.map(row => ({ report: row.payload, object: JSON.parse(readFileSync(path.join(state.object_namespace, row.seq + '.json'), 'utf8')) })));
	});
	app.all('*', async c => {
		const response = await core.fetch(c.req.raw);
		if (c.req.path === '/api/v1/fixture/policy/decisions' && c.req.method === 'POST' && response.status === 200) {
			const report = await response.clone().json();
			await database.withScope(scope, async tx => {
				await tx.ensureStream(state.id); const seq = await tx.appendEvent(state.id, 'policy', report);
				mkdirSync(state.object_namespace, { recursive: true }); writeFileSync(path.join(state.object_namespace, seq + '.json'), JSON.stringify(report), { flag: 'wx' });
			});
		}
		return response;
	});
	const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 });
	await new Promise((resolve, reject) => { server.once('listening', () => resolve(true)); server.once('error', reject); });
	const address = server.address(); if (!address || typeof address === 'string') throw new Error('listener_unavailable');
	return { url: `http://127.0.0.1:${address.port}`, close: async () => { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve(true))); await database.close(); } };
}
