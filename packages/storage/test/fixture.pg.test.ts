import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Pool } from 'pg';
import { asScopeId } from '@agora/domain';
import { FixtureError, openDatabase } from '@agora/storage';

const owner = openDatabase(process.env['AGORA_TEST_OWNER_DATABASE_URL'] ?? '');
const app = openDatabase(process.env['AGORA_TEST_DATABASE_URL'] ?? '');
const bypass = openDatabase(process.env['AGORA_TEST_BYPASS_DATABASE_URL'] ?? '');
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
	await bypass.close();
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
		// Eight stays below pg's default pool size of ten, so every transaction can hold a client while the latch is closed.
		let begun = 0;
		let release = (): void => undefined;
		const everyTransactionOpen = new Promise<void>((resolve) => { release = resolve; });
		const seqs = await Promise.all(Array.from({ length: 8 }, (_, i) => app.withScope(scopeA, async (tx) => {
			if (++begun === 8) release();
			await everyTransactionOpen;
			return tx.appendEvent(streamId, 'status', { i });
		})));
		expect([...seqs].sort((x, y) => Number(x) - Number(y))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
		const observed = await app.withScope(scopeA, async (tx) => ({ kinds: (await tx.readEvents(streamId)).map((e) => `${e.seq}:${e.kind}`), nextSeq: await tx.readNextSeq(streamId) }));
		expect(observed).toEqual({ kinds: ['1:status', '2:status', '3:status', '4:status', '5:status', '6:status', '7:status', '8:status'], nextSeq: '9' });
	});

	test('twelve appended events read back in numeric sequence order, not text order', async () => {
		const streamId = randomUUID();
		const observed = await app.withScope(scopeA, async (tx) => {
			await tx.ensureStream(streamId);
			for (let i = 0; i < 12; i++) await tx.appendEvent(streamId, 'status', { i });
			return (await tx.readEvents(streamId)).map((e) => `${e.seq}:${(e.payload as { i: number }).i}`);
		});
		expect(observed).toEqual(['1:0', '2:1', '3:2', '4:3', '5:4', '6:5', '7:6', '8:7', '9:8', '10:9', '11:10', '12:11']);
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

	test('another scope cannot attach an event to the owning scope\'s stream through the foreign key', async () => {
		await expect(rawAs(scopeB, 'insert into foundation_fixture.event (stream_id, seq, scope_id, kind, payload) values ($1, 99, $2, $3, $4)', [streamId, scopeB, 'status', '{}'])).rejects.toMatchObject({ code: '23503' });
		const observed = await app.withScope(scopeA, async (tx) => ({ events: (await tx.readEvents(streamId)).map((e) => e.seq), nextSeq: await tx.readNextSeq(streamId) }));
		expect(observed).toEqual({ events: ['1'], nextSeq: '2' });
	});

	test('identifiers are scoped: another scope gets its own stream and claim under the same ids without learning they exist elsewhere', async () => {
		const observed = await app.withScope(scopeB, async (tx) => {
			await tx.ensureStream(streamId);
			const seq = await tx.appendEvent(streamId, 'status', { owner: 'B' });
			const claim = await tx.claimSubject(subjectId, 'worker-b', '5');
			return { seq, claim, events: (await tx.readEvents(streamId)).map((e) => e.payload) };
		});
		expect(observed).toEqual({ seq: '1', claim: { claimed: true, fence: '5' }, events: [{ owner: 'B' }] });
		const untouched = await app.withScope(scopeA, async (tx) => ({ events: (await tx.readEvents(streamId)).map((e) => e.payload), claim: await tx.readClaim(subjectId) }));
		expect(untouched).toEqual({ events: [{ owner: 'A' }], claim: { claimed_by: 'worker-a', fence: '1' } });
	});

	test('a connection without a bound scope sees nothing', async () => {
		const result = await raw.query<{ count: string }>('select count(*)::text as count from foundation_fixture.event where stream_id = $1', [streamId]);
		expect(result.rows[0]).toEqual({ count: '0' });
	});

	test('row security is forced, so even the table owner is confined to the bound scope', async () => {
		const observed = await owner.withScope(scopeB, async (tx) => (await tx.readEvents(streamId)).map((e) => e.payload));
		expect(observed).toEqual([{ owner: 'B' }]);
	});

	test('guard negative: a BYPASSRLS role sees every scope, so the denials above depend on the policies, not on the data', async () => {
		const observed = await bypass.withScope(scopeB, (tx) => tx.readEvents(streamId));
		expect(observed.map((e) => e.payload as { owner: string }).sort((x, y) => x.owner.localeCompare(y.owner))).toEqual([{ owner: 'A' }, { owner: 'B' }]);
	});
});
