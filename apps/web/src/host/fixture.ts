// Development-only fixture adapter + transport behind RoomTransport. Production components never import this.
import { createWireValidator, type Schema } from '@agora/contracts';
import type { ClientInput, CoreEvent, Receipt, Request, Snapshot } from '@agora/client-core';
import type { Author, Presentation, Room, RoomClient, RoomHeader, RoomTransport, TransportConnection } from '@agora/web-framework';

export interface RoomFixture { readonly streamId: string; readonly header: RoomHeader; readonly snapshot: Snapshot; readonly events: readonly CoreEvent[]; readonly presentation: Presentation; readonly receipt: Receipt }
export type Loaded = { ok: true; fixture: RoomFixture } | { ok: false; error: string };
export type Failure = 'timeout' | 'stale_revision' | 'denied' | 'rate_limited';
export interface FixtureTransport extends RoomTransport {
	readonly fixture: RoomFixture; readonly loadInvalidSnapshot: () => void; readonly loadLargeRoom: (count: number) => void;
	readonly replayNext: () => CoreEvent | undefined; readonly replayAll: () => number; readonly duplicateLast: () => void;
	readonly skipOne: () => void; readonly fillGap: () => void; readonly unsupported: () => void; readonly resync: () => void;
	readonly setOnline: (online: boolean) => void; readonly revoke: () => void; readonly deliverReceipt: () => void; readonly fail: (failure: Failure) => void;
}

const validator = createWireValidator();
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const lower = (id: string): string => id.toLowerCase();
const describe = (requests: readonly Request[]): string | undefined => requests.map((r) => r.type === 'wait_retry_after' ? `wait_retry_after ${r.retryAfterSeconds}s` : r.type).join(', ') || undefined;
const nextSeq = (cursor: string): string => (BigInt(cursor) + 1n).toString();
const syntheticId = (seq: bigint): string => `aaaaaaaa-0000-4000-8000-${seq.toString(16).padStart(12, '0')}`;

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
	if (!Array.isArray(value['events'])) return { ok: false, error: 'events must be an array' };
	const events: CoreEvent[] = [];
	for (const [i, raw] of value['events'].entries()) {
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
	return { ok: true, fixture: { streamId: snapshot.streamId, snapshot, events, presentation: shown, receipt, header: { project: project['name'], room: project['room'], lifecycle: project['lifecycle'], agentLabel: project['agent'], members: project['members'] } } };
}

export function largeSnapshot(streamId: string, count: number): Snapshot {
	return { type: 'snapshot', streamId, cursor: String(count), lastSeen: String(Math.max(0, count - 5)), runs: [], messages: Array.from({ length: count }, (_, i) => { const seq = BigInt(i + 1); return { id: syntheticId(seq), createdSeq: seq.toString(), revision: '1', content: { tag: 'visible' as const, body: `Large room message ${seq}` } }; }) };
}

export function createFixtureTransport(client: RoomClient, fixture: RoomFixture): FixtureTransport {
	let state: TransportConnection = { online: true, phase: 'idle', error: undefined, decision: undefined };
	let nextEvent = 0, last: CoreEvent | undefined, skipped: CoreEvent | undefined, outbox: readonly { commandId: string; text: string }[] = [];
	const listeners = new Set<() => void>();
	const set = (patch: Partial<TransportConnection>): void => { state = { ...state, ...patch }; for (const l of listeners) l(); };
	const room = (): Room | undefined => client.getState().rooms.find((r) => r.streamId === fixture.streamId);
	const dispatch = (input: ClientInput): void => { set({ decision: describe(client.apply(input).requests) }); };
	const deliver = (event: CoreEvent): void => { last = event; dispatch(event); };
	const freshSnapshot = (): Snapshot => {
		const current = room();
		if (!current || BigInt(current.cursor) <= BigInt(fixture.snapshot.cursor)) return fixture.snapshot;
		return { type: 'snapshot', streamId: fixture.streamId, cursor: current.cursor, lastSeen: current.lastSeen, messages: [...current.messages], runs: [...current.runs] };
	};
	return {
		streamId: fixture.streamId, fixture, getState: () => state,
		subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
		loadSnapshot: () => { set({ phase: 'loading', error: undefined }); const snap = freshSnapshot(); dispatch(snap); set({ phase: 'idle' }); if (snap === fixture.snapshot) nextEvent = 0; },
		loadInvalidSnapshot: () => { const snap = freshSnapshot(); const t = client.apply({ ...snap, lastSeen: nextSeq(snap.cursor) }); set({ phase: 'error', error: `snapshot rejected: ${describe(t.requests) ?? 'no request'}`, decision: describe(t.requests) }); },
		loadLargeRoom: (count) => { dispatch({ type: 'clear', reason: 'logout' }); dispatch(largeSnapshot(fixture.streamId, count)); set({ phase: 'idle' }); nextEvent = fixture.events.length; },
		replayNext: () => { const event = fixture.events[nextEvent]; if (!event) return undefined; deliver(event); nextEvent += 1; return event; },
		replayAll: () => { let count = 0; for (const event of fixture.events.slice(nextEvent)) { deliver(event); count++; } nextEvent = fixture.events.length; return count; },
		duplicateLast: () => { if (last) dispatch(last); },
		skipOne: () => { const [held, following] = [fixture.events[nextEvent], fixture.events[nextEvent + 1]]; if (!held || !following) return; skipped = held; deliver(following); nextEvent += 2; },
		fillGap: () => { if (skipped) { deliver(skipped); skipped = undefined; } },
		unsupported: () => { dispatch({ type: 'unsupported', streamId: fixture.streamId }); },
		resync: () => { dispatch({ type: 'resync', streamId: fixture.streamId }); },
		setOnline: (online) => { set({ online }); },
		revoke: () => { dispatch({ type: 'clear', reason: 'revoked' }); set({ phase: 'revoked' }); outbox = []; },
		submit: (commandId, requestDigest, text) => { const t = client.apply({ type: 'submit', commandId, streamId: fixture.streamId, requestDigest, online: state.online }); set({ decision: describe(t.requests) }); if (t.requests.some((r) => r.type === 'send')) outbox = [...outbox, { commandId, text }]; },
		deliverReceipt: () => {
			const entry = outbox[0], current = room();
			if (!entry || !current) return;
			const seq = nextSeq(current.cursor), messageId = `cccccccc-0000-4000-8000-${BigInt(seq).toString(16).padStart(12, '0')}`;
			dispatch({ type: 'receipt', receipt: { ...fixture.receipt, command_id: entry.commandId, aggregate_id: messageId, event_cursors: [{ stream_id: fixture.streamId, committed_seq: seq }] } });
			deliver({ type: 'event', streamId: fixture.streamId, seq, change: { type: 'message', message: { id: messageId, createdSeq: seq, revision: '1', content: { tag: 'visible', body: entry.text } } } });
			dispatch({ type: 'draft', streamId: fixture.streamId, text: '' }); outbox = outbox.slice(1);
		},
		fail: (failure) => {
			const entry = outbox[0], command = client.getState().commands.find((c) => c.commandId === entry?.commandId);
			if (!entry || !command) return;
			dispatch({ type: 'retry', commandId: entry.commandId, requestDigest: command.requestDigest, online: state.online, failure: failure === 'rate_limited' ? { tag: failure, retryAfterSeconds: 30 } : { tag: failure } });
		},
		markSeen: (seq) => { dispatch({ type: 'seen', streamId: fixture.streamId, seq }); },
	};
}
