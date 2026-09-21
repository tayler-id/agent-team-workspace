// Narrow fixture adapter: validates development-only fixture bytes with the authoritative wire validator and
// translates them into neutral client-core inputs. It defines no service route, persistence or authority.
// Adapted from the preserved React engineering checkpoint (evidence/local-room/preservation/README.md); the
// run-card, task/evidence/approval card and answer payloads are dropped, and a citations map replaces threads.
import { createWireValidator, type Schema } from '@agora/contracts';
import type { ClientInput, CoreEvent, Receipt, Snapshot } from '@agora/client-core';
import type { Author, Presentation } from '../projection.ts';
import type { RoomHeader } from '../transport/port.ts';

export interface RoomFixture {
	readonly streamId: string;
	readonly header: RoomHeader;
	readonly snapshot: Snapshot;
	readonly events: readonly CoreEvent[];
	readonly presentation: Presentation;
	readonly receipt: Receipt;
}
export type Loaded = { ok: true; fixture: RoomFixture } | { ok: false; error: string };

const validator = createWireValidator();
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const lower = (id: string): string => id.toLowerCase();

export function toSnapshot(value: unknown): Snapshot | undefined {
	const parsed = validator.validate('FixtureSyncSnapshot', value);
	if (!parsed.ok) return undefined;
	const s = parsed.value;
	return {
		type: 'snapshot', streamId: lower(s.cursor.stream_id), cursor: s.cursor.committed_seq, lastSeen: s.last_seen_room_seq,
		messages: [...s.state.messages.map((m) => ({ id: lower(m.message_id), createdSeq: m.created_seq, revision: m.revision, content: { tag: 'visible' as const, body: m.body } })), ...s.state.tombstones.map((m) => ({ id: lower(m.message_id), createdSeq: m.created_seq, revision: m.revision, content: { tag: 'tombstone' as const } }))],
		runs: s.state.run_cards.map((r) => ({ id: lower(r.run_id), revision: r.run_revision, state: r.state })),
	};
}

export function toEvent(streamId: string, value: unknown): ClientInput {
	for (const component of ['FixtureSyncMessageEvent', 'FixtureSyncTombstoneEvent', 'FixtureSyncRunCardEvent'] as const) {
		const parsed = validator.validate(component, value);
		if (!parsed.ok || lower(parsed.value.stream_id) !== streamId) continue;
		const event = parsed.value;
		switch (event.kind) {
			case 'fixture.message_revision': return { type: 'event', streamId, seq: event.seq, change: { type: 'message', message: { id: lower(event.payload.message_id), createdSeq: event.payload.created_seq, revision: event.payload.revision, content: { tag: 'visible', body: event.payload.body } } } };
			case 'fixture.message_tombstone': return { type: 'event', streamId, seq: event.seq, change: { type: 'message', message: { id: lower(event.payload.message_id), createdSeq: event.payload.created_seq, revision: event.payload.revision, content: { tag: 'tombstone' } } } };
			case 'fixture.run_card': return { type: 'event', streamId, seq: event.seq, change: { type: 'run', run: { id: lower(event.payload.run_id), revision: event.payload.run_revision, state: event.payload.state } } };
		}
	}
	return { type: 'unsupported', streamId };
}

export function toReceipt(value: unknown): Receipt | undefined {
	const parsed = validator.validate('CommandReceipt', value);
	if (!parsed.ok) return undefined;
	const r: Schema<'CommandReceipt'> = parsed.value;
	return { ...r, command_id: lower(r.command_id), aggregate_id: lower(r.aggregate_id), receipt_id: lower(r.receipt_id), event_cursors: r.event_cursors.map((c) => ({ ...c, stream_id: lower(c.stream_id) })) };
}

function presentation(value: unknown, ids: ReadonlySet<string>): Presentation | string {
	if (!isRecord(value) || !isRecord(value['authors']) || !isRecord(value['times']) || !isRecord(value['citations'])) return 'presentation must have authors, times and citations objects';
	const authors: Record<string, Author> = {}, times: Record<string, string> = {}, citations: Record<string, readonly string[]> = {};
	for (const [id, author] of Object.entries(value['authors'])) {
		if (!isRecord(author) || typeof author['name'] !== 'string' || !['human', 'agent', 'system'].includes(String(author['kind']))) return `author ${id} is malformed`;
		authors[lower(id)] = { name: author['name'], kind: author['kind'] as Author['kind'] };
	}
	for (const [id, time] of Object.entries(value['times'])) { if (typeof time !== 'string') return `time ${id} is malformed`; times[lower(id)] = time; }
	for (const [id, cited] of Object.entries(value['citations'])) {
		if (!Array.isArray(cited) || cited.some((c) => typeof c !== 'string' || !ids.has(lower(c)))) return `citations for ${id} must reference fixture messages`;
		citations[lower(id)] = cited.map(lower);
	}
	return { authors, times, citations };
}

export function load(value: unknown): Loaded {
	if (!isRecord(value) || value['schema_version'] !== 'agora.web-fixture.room/v1') return { ok: false, error: 'fixture schema_version must be agora.web-fixture.room/v1' };
	const snapshot = toSnapshot(value['snapshot']);
	if (!snapshot) return { ok: false, error: 'snapshot failed FixtureSyncSnapshot validation' };
	const ids = new Set(snapshot.messages.map((m) => m.id));
	const rawEvents = value['events'];
	if (!Array.isArray(rawEvents)) return { ok: false, error: 'events must be an array' };
	const events: CoreEvent[] = [];
	for (const [i, raw] of rawEvents.entries()) {
		const event = toEvent(snapshot.streamId, raw);
		if (event.type !== 'event') return { ok: false, error: `event ${i} failed fixture event validation` };
		if (event.change.type === 'message') ids.add(event.change.message.id);
		events.push(event);
	}
	const shown = presentation(value['presentation'], ids);
	if (typeof shown === 'string') return { ok: false, error: shown };
	const receipt = toReceipt(value['receipt']);
	if (!receipt) return { ok: false, error: 'receipt failed CommandReceipt validation' };
	const project = value['project'];
	if (!isRecord(project) || typeof project['name'] !== 'string' || typeof project['room'] !== 'string' || typeof project['lifecycle'] !== 'string' || typeof project['agent'] !== 'string' || typeof project['members'] !== 'number') return { ok: false, error: 'project header is malformed' };
	return {
		ok: true,
		fixture: {
			streamId: snapshot.streamId, snapshot, events, presentation: shown, receipt,
			header: { project: project['name'], room: project['room'], lifecycle: project['lifecycle'], agentLabel: project['agent'], members: project['members'] },
		},
	};
}

// Synthetic scale input for the bounded-rendering and update-isolation proofs. IDs derive from the sequence so
// repeated runs are identical; this never becomes a second fixture format, only a larger valid Snapshot.
const syntheticId = (seq: bigint): string => `aaaaaaaa-0000-4000-8000-${seq.toString(16).padStart(12, '0')}`;
export function largeSnapshot(streamId: string, count: number): Snapshot {
	const messages = Array.from({ length: count }, (_, i) => { const seq = BigInt(i + 1); return { id: syntheticId(seq), createdSeq: seq.toString(), revision: '1', content: { tag: 'visible' as const, body: `Large room message ${seq}` } }; });
	return { type: 'snapshot', streamId, cursor: String(count), lastSeen: String(Math.max(0, count - 5)), messages, runs: [] };
}
