import { expect, test } from 'vitest';
import { createApp } from '../src/app.ts';

const app = createApp({ probeDatabase: () => Promise.resolve(true) });
const decide = (body: unknown) => app.request('/api/v1/fixture/policy/decisions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const POLICY_DIGEST = 'sha256:6bb3839045a8266e1ae93d4e7a2483a73225943fd9360b6c3c11e4e69b8b4fa4';

test('POST /api/v1/fixture/policy/decisions allows an actor in the subject scope', async () => {
	const response = await decide({ schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: A }, subject: { scope_id: A } });
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ schema_version: 'agora.fixture-policy-decision/v1', decision: 'allow', policy_version: 'agora.fixture-policy/v1', policy_digest: POLICY_DIGEST });
});

test('POST /api/v1/fixture/policy/decisions denies a foreign scope with scope_mismatch', async () => {
	const response = await decide({ schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: A }, subject: { scope_id: B } });
	expect(response.status).toBe(200);
	expect(await response.json()).toMatchObject({ decision: 'deny', reason_code: 'scope_mismatch', policy_digest: POLICY_DIGEST });
});

test('an unknown field is a 400 malformed_command with the offending path, never silently removed', async () => {
	const response = await decide({ schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: A, role: 'owner' }, subject: { scope_id: A } });
	expect(response.status).toBe(400);
	expect(await response.json()).toMatchObject({ reason_code: 'malformed_command', details: ['/actor must NOT have additional properties'] });
});

test('a non-UUID scope and a non-JSON body are both 400 malformed_command', async () => {
	const badScope = await decide({ schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: 'root' }, subject: { scope_id: A } });
	expect(badScope.status).toBe(400);
	expect(await badScope.json()).toMatchObject({ details: ['/actor/scope_id must match pattern "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"'] });
	const notJson = await app.request('/api/v1/fixture/policy/decisions', { method: 'POST', body: 'not json' });
	expect(notJson.status).toBe(400);
});

test('every RFC 9562 UUID shape the schema accepts is also accepted by the decision, never a 500', async () => {
	const nil = await decide({ schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: '00000000-0000-0000-0000-000000000000' }, subject: { scope_id: '00000000-0000-0000-0000-000000000000' } });
	expect(nil.status).toBe(200);
	expect(await nil.json()).toMatchObject({ decision: 'allow' });
	const upper = await decide({ schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: A.toUpperCase() }, subject: { scope_id: A } });
	expect(upper.status).toBe(200);
	expect(await upper.json()).toMatchObject({ decision: 'allow' });
	const urn = await decide({ schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: `urn:uuid:${A}` }, subject: { scope_id: A } });
	expect(urn.status).toBe(400);
	expect(await urn.json()).toMatchObject({ reason_code: 'malformed_command', details: ['/actor/scope_id must match pattern "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"'] });
});

test('an unknown route is a JSON 404 with a stable reason code and a correlation id', async () => {
	const response = await app.request('/api/v1/nothing');
	expect(response.status).toBe(404);
	expect(await response.json()).toMatchObject({ reason_code: 'not_found', correlation_id: expect.stringMatching(/^[0-9a-f-]{36}$/) as string });
});
