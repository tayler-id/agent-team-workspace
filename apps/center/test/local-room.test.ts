import { expect, test } from 'vitest';
import { createApp } from '../src/app.ts';

// No localRoom adapter is composed here; the persisted path is apps/center/test/local-room.pg.test.ts against the real process.
const app = createApp({ probeDatabase: () => Promise.reject(new Error('the local room never probes the database')) });
const P = '11111111-1111-4111-8111-111111111111';
const R = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const command = { schema_version: 'agora.local-room.send-message/v1', command_id: C, scope: { project_id: P, room_id: R }, body: 'hello', citations: [] };
const send = (body: unknown) => app.request('/api/v1/local-room/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('the same app answers the health baseline before any local-room assertion', async () => {
	const response = await app.request('/api/v1/health');
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ schema_version: 'agora.health/v1', status: 'ok', service: 'agora-center' });
});

test('without a persistence adapter composed, a well-formed send and the snapshot are typed 404 unavailable_capability, not an unknown route', async () => {
	const response = await send(command);
	expect(response.status).toBe(404);
	expect(await response.json()).toMatchObject({ reason_code: 'unavailable_capability', correlation_id: expect.stringMatching(/^[0-9a-f-]{36}$/) as string, details: [expect.stringContaining('not composed') as string] });
	const snapshot = await app.request('/api/v1/local-room/snapshot');
	expect(snapshot.status).toBe(404);
	expect(await snapshot.json()).toMatchObject({ reason_code: 'unavailable_capability' });
});

test('an unknown field, an author offered by the client, a numeric sequence and a non-JSON body are each 400 malformed_command at their path', async () => {
	for (const [body, detail] of [
		[{ ...command, retries: 3 }, '$ must NOT have additional properties'],
		[{ ...command, author: { kind: 'human', principal_id: P } }, '$ must NOT have additional properties'],
		[{ ...command, citations: [{ record_kind: 'message', record_id: P, room_seq: 1 }] }, '/citations/0/room_seq must be string'],
		[{ ...command, body: '' }, '/body must NOT have fewer than 1 characters'],
	] as const) {
		const response = await send(body);
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ reason_code: 'malformed_command', details: [detail] });
	}
	const notJson = await app.request('/api/v1/local-room/messages', { method: 'POST', body: 'not json' });
	expect(notJson.status).toBe(400);
});
