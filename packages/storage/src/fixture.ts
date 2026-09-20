import type { PoolClient } from 'pg';

// Foundation fixture, namespaced under foundation_fixture. Explicit SQL for the counter, event and claim paths.
// Every statement runs inside Database.withScope, which binds agora.scope_id for the row-level-security policies.
// Identifiers are scoped: (scope_id, stream_id) and (scope_id, subject_id) are the keys, so one scope cannot probe another's ids.

export type Seq = string; // nonnegative 64-bit integer as a decimal string (R05)

export interface FixtureEvent {
	stream_id: string;
	seq: Seq;
	kind: string;
	payload: unknown;
}

export type ClaimResult = { claimed: true; fence: Seq } | { claimed: false };

export interface FixtureTransaction {
	ensureStream(streamId: string): Promise<void>;
	appendEvent(streamId: string, kind: string, payload: unknown): Promise<Seq>;
	readEvents(streamId: string): Promise<FixtureEvent[]>;
	readNextSeq(streamId: string): Promise<Seq | undefined>;
	claimSubject(subjectId: string, claimedBy: string, fence: Seq): Promise<ClaimResult>;
	readClaim(subjectId: string): Promise<{ claimed_by: string; fence: Seq } | undefined>;
}

export class FixtureError extends Error {
	readonly reasonCode: 'stream_not_visible';
	constructor(reasonCode: 'stream_not_visible') {
		super(reasonCode);
		this.reasonCode = reasonCode;
	}
}

const SCOPE_SETTING = 'agora.scope_id';

export function bindFixtureTransaction(client: PoolClient): FixtureTransaction {
	return {
		async ensureStream(streamId) {
			await client.query('insert into foundation_fixture.stream (stream_id, scope_id) values ($1, current_setting($2)::uuid) on conflict (scope_id, stream_id) do nothing', [streamId, SCOPE_SETTING]);
		},
		// Locks the per-stream counter row and appends the event in the same transaction, so a rollback leaves neither.
		async appendEvent(streamId, kind, payload) {
			const counter = await client.query<{ seq: Seq }>('update foundation_fixture.stream set next_seq = next_seq + 1 where stream_id = $1 returning (next_seq - 1)::text as seq', [streamId]);
			const seq = counter.rows[0]?.seq;
			if (seq === undefined) throw new FixtureError('stream_not_visible');
			await client.query('insert into foundation_fixture.event (stream_id, seq, scope_id, kind, payload) values ($1, $2, current_setting($3)::uuid, $4, $5)', [streamId, seq, SCOPE_SETTING, kind, JSON.stringify(payload)]);
			return seq;
		},
		async readEvents(streamId) {
			const result = await client.query<FixtureEvent>('select stream_id, seq::text as seq, kind, payload from foundation_fixture.event where stream_id = $1 order by seq', [streamId]);
			return result.rows;
		},
		async readNextSeq(streamId) {
			const result = await client.query<{ next_seq: Seq }>('select next_seq::text as next_seq from foundation_fixture.stream where stream_id = $1', [streamId]);
			return result.rows[0]?.next_seq;
		},
		// First writer wins; every later claim observes claimed: false without an error.
		async claimSubject(subjectId, claimedBy, fence) {
			const result = await client.query<{ fence: Seq }>('insert into foundation_fixture.claim (subject_id, scope_id, claimed_by, fence) values ($1, current_setting($2)::uuid, $3, $4) on conflict (scope_id, subject_id) do nothing returning fence::text as fence', [subjectId, SCOPE_SETTING, claimedBy, fence]);
			const row = result.rows[0];
			return row ? { claimed: true, fence: row.fence } : { claimed: false };
		},
		async readClaim(subjectId) {
			const result = await client.query<{ claimed_by: string; fence: Seq }>('select claimed_by, fence::text as fence from foundation_fixture.claim where subject_id = $1', [subjectId]);
			return result.rows[0];
		},
	};
}
