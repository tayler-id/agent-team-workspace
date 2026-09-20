import type { ScopeId } from '@agora/domain';
import type { Pool, PoolClient } from 'pg';

// Foundation fixture, namespaced under foundation_fixture. Explicit SQL for the counter, event and claim paths.
// Every statement runs inside withScope, which binds agora.scope_id for the row-level-security policies.

export type Seq = string; // nonnegative 64-bit integer as a decimal string (R05)

export interface FixtureEvent {
	stream_id: string;
	seq: Seq;
	kind: string;
	payload: unknown;
}

export type ClaimResult = { claimed: true; fence: Seq } | { claimed: false };

export class FixtureError extends Error {
	readonly reasonCode: 'stream_not_visible';
	constructor(reasonCode: 'stream_not_visible') {
		super(reasonCode);
		this.reasonCode = reasonCode;
	}
}

export async function withScope<T>(pool: Pool, scopeId: ScopeId, work: (client: PoolClient) => Promise<T>): Promise<T> {
	const client = await pool.connect();
	try {
		await client.query('begin');
		await client.query('select set_config($1, $2, true)', ['agora.scope_id', scopeId]);
		const result = await work(client);
		await client.query('commit');
		return result;
	} catch (error) {
		await client.query('rollback');
		throw error;
	} finally {
		client.release();
	}
}

export async function ensureStream(client: PoolClient, streamId: string): Promise<void> {
	await client.query('insert into foundation_fixture.stream (stream_id, scope_id) values ($1, current_setting($2)::uuid) on conflict (stream_id) do nothing', [streamId, 'agora.scope_id']);
}

// Locks the per-stream counter row and appends the event in the same transaction, so a rollback leaves neither.
export async function appendEvent(client: PoolClient, streamId: string, kind: string, payload: unknown): Promise<Seq> {
	const counter = await client.query<{ seq: Seq }>('update foundation_fixture.stream set next_seq = next_seq + 1 where stream_id = $1 returning (next_seq - 1)::text as seq', [streamId]);
	const seq = counter.rows[0]?.seq;
	if (seq === undefined) throw new FixtureError('stream_not_visible');
	await client.query('insert into foundation_fixture.event (stream_id, seq, scope_id, kind, payload) values ($1, $2, current_setting($3)::uuid, $4, $5)', [streamId, seq, 'agora.scope_id', kind, JSON.stringify(payload)]);
	return seq;
}

export async function readEvents(client: PoolClient, streamId: string): Promise<FixtureEvent[]> {
	const result = await client.query<FixtureEvent>('select stream_id, seq::text as seq, kind, payload from foundation_fixture.event where stream_id = $1 order by seq', [streamId]);
	return result.rows;
}

export async function readNextSeq(client: PoolClient, streamId: string): Promise<Seq | undefined> {
	const result = await client.query<{ next_seq: Seq }>('select next_seq::text as next_seq from foundation_fixture.stream where stream_id = $1', [streamId]);
	return result.rows[0]?.next_seq;
}

// First writer wins; every later claim observes claimed: false without an error.
export async function claimSubject(client: PoolClient, subjectId: string, claimedBy: string, fence: Seq): Promise<ClaimResult> {
	const result = await client.query<{ fence: Seq }>('insert into foundation_fixture.claim (subject_id, scope_id, claimed_by, fence) values ($1, current_setting($2)::uuid, $3, $4) on conflict (subject_id) do nothing returning fence::text as fence', [subjectId, 'agora.scope_id', claimedBy, fence]);
	const row = result.rows[0];
	return row ? { claimed: true, fence: row.fence } : { claimed: false };
}

export async function readClaim(client: PoolClient, subjectId: string): Promise<{ claimed_by: string; fence: Seq } | undefined> {
	const result = await client.query<{ claimed_by: string; fence: Seq }>('select claimed_by, fence::text as fence from foundation_fixture.claim where subject_id = $1', [subjectId]);
	return result.rows[0];
}
