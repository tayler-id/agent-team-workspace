// Development-only room transport: stands in for a real transport during development, choosing which validated
// fixture inputs reach the store and when. It implements the narrow RoomTransportPort plus scenario-only methods
// (replay, duplicate, gap, resync, revoke, receipt/failure) that FixtureControls alone may call; production room
// components never import this module, so swapping in a real transport later touches no component.
import type { ClientInput, CoreEvent, Request, Snapshot } from '@agora/client-core';
import type { Connection, Room } from '../projection.ts';
import type { Store } from '../store.ts';
import type { RoomTransportPort, TransportState } from '../transport/port.ts';
import { largeSnapshot, syntheticMessage, type RoomFixture } from './adapter.ts';

export type Failure = 'timeout' | 'stale_revision' | 'denied' | 'rate_limited';
export interface FixtureTransport extends RoomTransportPort {
	readonly fixture: RoomFixture;
	readonly loadInvalidSnapshot: () => void;
	readonly loadLargeRoom: (count: number) => void;
	readonly appendLarge: (count: number) => void;
	readonly replayNext: () => CoreEvent | undefined;
	readonly replayAll: () => number;
	readonly duplicateLast: () => void;
	readonly skipOne: () => void;
	readonly fillGap: () => void;
	readonly unsupported: () => void;
	readonly resync: () => void;
	readonly setOnline: (online: boolean) => void;
	readonly revoke: () => void;
	readonly deliverReceipt: () => void;
	readonly fail: (failure: Failure) => void;
}

const describe = (requests: readonly Request[]): string | undefined => requests.map((r) => r.type === 'wait_retry_after' ? `wait_retry_after ${r.retryAfterSeconds}s` : r.type).join(', ') || undefined;
const nextSeq = (cursor: string): string => (BigInt(cursor) + 1n).toString();
const idle: Connection = { online: true, phase: 'idle', error: undefined };

export function createFixtureTransport(store: Store, fixture: RoomFixture): FixtureTransport {
	let state: TransportState = { ...idle, decision: undefined };
	let nextEvent = 0;
	let last: CoreEvent | undefined;
	let skipped: CoreEvent | undefined;
	let outbox: readonly { commandId: string; text: string }[] = [];
	const listeners = new Set<() => void>();
	const set = (patch: Partial<TransportState>): void => { state = { ...state, ...patch }; for (const listener of listeners) listener(); };
	const room = (): Room | undefined => store.getState().rooms.find((r) => r.streamId === fixture.streamId);
	const dispatch = (input: ClientInput): void => { set({ decision: describe(store.dispatch(input).requests) }); };
	const deliver = (event: CoreEvent): void => { last = event; dispatch(event); };
	// A fresh snapshot is what a server would return now: the room at its current cursor, or the fixture bytes when no room exists.
	const freshSnapshot = (): Snapshot => {
		const current = room();
		if (!current || BigInt(current.cursor) <= BigInt(fixture.snapshot.cursor)) return fixture.snapshot;
		return { type: 'snapshot', streamId: fixture.streamId, cursor: current.cursor, lastSeen: current.lastSeen, messages: [...current.messages], runs: [...current.runs] };
	};

	return {
		streamId: fixture.streamId, fixture,
		getState: () => state,
		subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
		loadSnapshot: () => {
			set({ phase: 'loading', error: undefined });
			const snapshot = freshSnapshot();
			dispatch(snapshot);
			set({ phase: 'idle' });
			if (snapshot === fixture.snapshot) nextEvent = 0;
		},
		loadInvalidSnapshot: () => {
			// A snapshot whose last_seen runs ahead of its own cursor is invalid: the core refuses it and requests a fresh one.
			const snapshot = freshSnapshot();
			const transition = store.dispatch({ ...snapshot, lastSeen: nextSeq(snapshot.cursor) });
			set({ phase: 'error', error: `snapshot rejected: ${describe(transition.requests) ?? 'no request'}`, decision: describe(transition.requests) });
		},
		loadLargeRoom: (count) => {
			dispatch({ type: 'clear', reason: 'logout' });
			dispatch(largeSnapshot(fixture.streamId, count));
			set({ phase: 'idle' });
			nextEvent = fixture.events.length;
		},
		// Reconnect insertion at scale: count synthetic events after the current cursor, as a resumed stream delivers them.
		appendLarge: (count) => {
			for (let i = 0; i < count; i++) { const current = room(); if (!current) return; const seq = Number(nextSeq(current.cursor)); deliver({ type: 'event', streamId: fixture.streamId, seq: String(seq), change: { type: 'message', message: syntheticMessage(seq) } }); }
		},
		replayNext: () => {
			const event = fixture.events[nextEvent];
			if (!event) return undefined;
			deliver(event);
			nextEvent += 1;
			return event;
		},
		replayAll: () => {
			let count = 0;
			for (const event of fixture.events.slice(nextEvent)) { deliver(event); count++; }
			nextEvent = fixture.events.length;
			return count;
		},
		duplicateLast: () => { if (last) dispatch(last); },
		skipOne: () => {
			const [held, following] = [fixture.events[nextEvent], fixture.events[nextEvent + 1]];
			if (!held || !following) return;
			skipped = held;
			deliver(following);
			nextEvent += 2;
		},
		fillGap: () => { if (skipped) { deliver(skipped); skipped = undefined; } },
		unsupported: () => { dispatch({ type: 'unsupported', streamId: fixture.streamId }); },
		resync: () => { dispatch({ type: 'resync', streamId: fixture.streamId }); },
		setOnline: (online) => { set({ online }); },
		revoke: () => { dispatch({ type: 'clear', reason: 'revoked' }); set({ phase: 'revoked' }); outbox = []; },
		submit: (commandId, requestDigest, text) => {
			const transition = store.dispatch({ type: 'submit', commandId, streamId: fixture.streamId, requestDigest, online: state.online });
			set({ decision: describe(transition.requests) });
			if (transition.requests.some((r) => r.type === 'send')) outbox = [...outbox, { commandId, text }];
		},
		deliverReceipt: () => {
			const entry = outbox[0];
			const current = room();
			if (!entry || !current) return;
			const seq = nextSeq(current.cursor);
			const messageId = `cccccccc-0000-4000-8000-${BigInt(seq).toString(16).padStart(12, '0')}`;
			dispatch({ type: 'receipt', receipt: { ...fixture.receipt, command_id: entry.commandId, aggregate_id: messageId, event_cursors: [{ stream_id: fixture.streamId, committed_seq: seq }] } });
			deliver({ type: 'event', streamId: fixture.streamId, seq, change: { type: 'message', message: { id: messageId, createdSeq: seq, revision: '1', content: { tag: 'visible', body: entry.text } } } });
			dispatch({ type: 'draft', streamId: fixture.streamId, text: '' });
			outbox = outbox.slice(1);
		},
		fail: (failure) => {
			const entry = outbox[0];
			const command = store.getState().commands.find((c) => c.commandId === entry?.commandId);
			if (!entry || !command) return;
			dispatch({ type: 'retry', commandId: entry.commandId, requestDigest: command.requestDigest, online: state.online, failure: failure === 'rate_limited' ? { tag: failure, retryAfterSeconds: 30 } : { tag: failure } });
		},
		markSeen: (seq) => { dispatch({ type: 'seen', streamId: fixture.streamId, seq }); },
	};
}
