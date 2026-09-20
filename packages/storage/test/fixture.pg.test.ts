import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Pool } from 'pg';
import { asScopeId } from '@agora/domain';
import { FixtureError, openDatabase } from '@agora/storage';

const owner = openDatabase(process.env['AGORA_TEST_OWNER_DATABASE_URL'] ?? '');
const app = openDatabase(process.env['AGORA_TEST_DATABASE_URL'] ?? '');
const raw = new Pool({ connectionString: process.env['AGORA_TEST_DATABASE_URL'] });
const scopeA = asScopeId(randomUUID());
const scopeB = asScopeId(randomUUID());

// Test-only raw access as agora_app, for statements the port refuses to express.
async function rawAs(scope: string, sql: string, params: unknown[]): Promise<void> {
	const client = await raw.connect();
	try {
		await client.query('begin');
		await client.query('select set_config($1, $2, true)', ['agora.scope_id', scope]);
		await client.query(sql, params);
		await client.query('commit');
	} catch (error) {
		await client.query('rollback');
		throw error;
	} finally {
		client.release();
	}
}

beforeAll(async () => {
	await owner.migrate();
});

afterAll(async () => {
	await raw.end();
	await app.close();
	await owner.close();
});

describe('rollback', () => {
	test('a failed transaction leaves no event and does not advance the stream counter', async () => {
		const streamId = randomUUID();
		await app.withScope(scopeA, (tx) => tx.ensureStream(streamId));
		await expect(
			app.withScope(scopeA, async (tx) => {
				await tx.appendEvent(streamId, 'status', { text: 'about to fail' });
				throw new Error('simulated failure after append');
			}),
		).rejects.toThrow('simulated failure after append');
		const observed = await app.withScope(scopeA, async (tx) => ({ events: await tx.readEvents(streamId), nextSeq: await tx.readNextSeq(streamId) }));
		expect(observed).toEqual({ events: [], nextSeq: '1' });
	});
});

describe('race', () => {
	test('concurrent appends to one stream receive contiguous distinct sequences', async () => {
		const streamId = randomUUID();
		await app.withScope(scopeA, (tx) => tx.ensureStream(streamId));
		const seqs = await Promise.all(Array.from({ length: 8 }, (_, i) => app.withScope(scopeA, (tx) => tx.appendEvent(streamId, 'status', { i }))));
		expect([...seqs].sort((x, y) => Number(x) - Number(y))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
		const observed = await app.withScope(scopeA, async (tx) => ({ kinds: (await tx.readEvents(streamId)).map((e) => `${e.seq}:${e.kind}`), nextSeq: await tx.readNextSeq(streamId) }));
		expect(observed).toEqual({ kinds: ['1:status', '2:status', '3:status', '4:status', '5:status', '6:status', '7:status', '8:status'], nextSeq: '9' });
	});

	test('exactly one of eight concurrent claims wins and the losers see claimed: false', async () => {
		const subjectId = randomUUID();
		const results = await Promise.all(Array.from({ length: 8 }, (_, i) => app.withScope(scopeA, (tx) => tx.claimSubject(subjectId, `worker-${i}`, '7'))));
		expect(results.filter((r) => r.claimed)).toEqual([{ claimed: true, fence: '7' }]);
		expect(results.filter((r) => !r.claimed)).toHaveLength(7);
		const claim = await app.withScope(scopeA, (tx) => tx.readClaim(subjectId));
		expect(claim?.fence).toBe('7');
		expect(claim?.claimed_by).toMatch(/^worker-[0-7]$/);
	});
});

describe('row-level security', () => {
	const streamId = randomUUID();
	const subjectId = randomUUID();

	beforeAll(async () => {
		await app.withScope(scopeA, async (tx) => {
			await tx.ensureStream(streamId);
			await tx.appendEvent(streamId, 'status', { owner: 'A' });
			await tx.claimSubject(subjectId, 'worker-a', '1');
		});
	});

	test('the owning scope reads its own rows', async () => {
		const observed = await app.withScope(scopeA, async (tx) => ({ events: (await tx.readEvents(streamId)).map((e) => e.payload), claim: await tx.readClaim(subjectId) }));
		expect(observed).toEqual({ events: [{ owner: 'A' }], claim: { claimed_by: 'worker-a', fence: '1' } });
	});

	test('another scope sees no rows, cannot append, and cannot forge a row into the owning scope', async () => {
		const observed = await app.withScope(scopeB, async (tx) => ({ events: await tx.readEvents(streamId), claim: await tx.readClaim(subjectId), nextSeq: await tx.readNextSeq(streamId) }));
		expect(observed).toEqual({ events: [], claim: undefined, nextSeq: undefined });
		await expect(app.withScope(scopeB, (tx) => tx.appendEvent(streamId, 'status', {}))).rejects.toThrow(FixtureError);
		await expect(rawAs(scopeB, 'insert into foundation_fixture.stream (stream_id, scope_id) values ($1, $2)', [randomUUID(), scopeA])).rejects.toMatchObject({ code: '42501' });
	});

	test('a connection without a bound scope sees nothing', async () => {
		const result = await raw.query<{ count: string }>('select count(*)::text as count from foundation_fixture.event where stream_id = $1', [streamId]);
		expect(result.rows[0]).toEqual({ count: '0' });
	});

	test('guard negative: the table owner bypasses the policy, so the denial above depends on the non-owner role', async () => {
		const observed = await owner.withScope(scopeB, (tx) => tx.readEvents(streamId));
		expect(observed.map((e) => e.payload)).toEqual([{ owner: 'A' }]);
	});
});
