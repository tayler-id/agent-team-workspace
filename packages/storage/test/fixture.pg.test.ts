import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { asScopeId } from '@agora/domain';
import { appendEvent, claimSubject, ensureStream, FixtureError, readClaim, readEvents, readNextSeq, runMigrations, withScope } from '@agora/storage';

const owner = new Pool({ connectionString: process.env['AGORA_TEST_OWNER_DATABASE_URL'] });
const app = new Pool({ connectionString: process.env['AGORA_TEST_DATABASE_URL'], max: 16 });
const scopeA = asScopeId(randomUUID());
const scopeB = asScopeId(randomUUID());

beforeAll(async () => {
	await runMigrations(owner);
});

afterAll(async () => {
	await app.end();
	await owner.end();
});

describe('rollback', () => {
	test('a failed transaction leaves no event and does not advance the stream counter', async () => {
		const streamId = randomUUID();
		await withScope(app, scopeA, (client) => ensureStream(client, streamId));
		await expect(
			withScope(app, scopeA, async (client) => {
				await appendEvent(client, streamId, 'status', { text: 'about to fail' });
				throw new Error('simulated failure after append');
			}),
		).rejects.toThrow('simulated failure after append');
		const observed = await withScope(app, scopeA, async (client) => ({ events: await readEvents(client, streamId), nextSeq: await readNextSeq(client, streamId) }));
		expect(observed).toEqual({ events: [], nextSeq: '1' });
	});
});

describe('race', () => {
	test('concurrent appends to one stream receive contiguous distinct sequences', async () => {
		const streamId = randomUUID();
		await withScope(app, scopeA, (client) => ensureStream(client, streamId));
		const seqs = await Promise.all(Array.from({ length: 8 }, (_, i) => withScope(app, scopeA, (client) => appendEvent(client, streamId, 'status', { i }))));
		expect([...seqs].sort((x, y) => Number(x) - Number(y))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
		const observed = await withScope(app, scopeA, async (client) => ({ kinds: (await readEvents(client, streamId)).map((e) => `${e.seq}:${e.kind}`), nextSeq: await readNextSeq(client, streamId) }));
		expect(observed).toEqual({ kinds: ['1:status', '2:status', '3:status', '4:status', '5:status', '6:status', '7:status', '8:status'], nextSeq: '9' });
	});

	test('exactly one of eight concurrent claims wins and the losers see claimed: false', async () => {
		const subjectId = randomUUID();
		const results = await Promise.all(Array.from({ length: 8 }, (_, i) => withScope(app, scopeA, (client) => claimSubject(client, subjectId, `worker-${i}`, '7'))));
		expect(results.filter((r) => r.claimed)).toEqual([{ claimed: true, fence: '7' }]);
		expect(results.filter((r) => !r.claimed)).toHaveLength(7);
		const claim = await withScope(app, scopeA, (client) => readClaim(client, subjectId));
		expect(claim?.fence).toBe('7');
		expect(claim?.claimed_by).toMatch(/^worker-[0-7]$/);
	});
});

describe('row-level security', () => {
	const streamId = randomUUID();
	const subjectId = randomUUID();

	beforeAll(async () => {
		await withScope(app, scopeA, async (client) => {
			await ensureStream(client, streamId);
			await appendEvent(client, streamId, 'status', { owner: 'A' });
			await claimSubject(client, subjectId, 'worker-a', '1');
		});
	});

	test('the owning scope reads its own rows', async () => {
		const observed = await withScope(app, scopeA, async (client) => ({ events: (await readEvents(client, streamId)).map((e) => e.payload), claim: await readClaim(client, subjectId) }));
		expect(observed).toEqual({ events: [{ owner: 'A' }], claim: { claimed_by: 'worker-a', fence: '1' } });
	});

	test('another scope sees no rows, cannot append, and cannot forge a row into the owning scope', async () => {
		const observed = await withScope(app, scopeB, async (client) => ({ events: await readEvents(client, streamId), claim: await readClaim(client, subjectId), nextSeq: await readNextSeq(client, streamId) }));
		expect(observed).toEqual({ events: [], claim: undefined, nextSeq: undefined });
		await expect(withScope(app, scopeB, (client) => appendEvent(client, streamId, 'status', {}))).rejects.toThrow(FixtureError);
		const forge = (client: PoolClient) => client.query('insert into foundation_fixture.stream (stream_id, scope_id) values ($1, $2)', [randomUUID(), scopeA]);
		await expect(withScope(app, scopeB, forge)).rejects.toMatchObject({ code: '42501' });
	});

	test('a connection without a bound scope sees nothing', async () => {
		const result = await app.query<{ count: string }>('select count(*)::text as count from foundation_fixture.event where stream_id = $1', [streamId]);
		expect(result.rows[0]).toEqual({ count: '0' });
	});

	test('guard negative: the table owner bypasses the policy, so the denial above depends on the non-owner role', async () => {
		const observed = await withScope(owner, scopeB, (client) => readEvents(client, streamId));
		expect(observed.map((e) => e.payload)).toEqual([{ owner: 'A' }]);
	});
});
