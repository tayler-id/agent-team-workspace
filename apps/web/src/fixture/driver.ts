// Scenario driver: stands in for the transport during development. It only chooses which validated inputs reach
// the store and when; the store's client-core state remains the single timeline. No request is executed automatically.
import type { ClientInput, CoreEvent, Request, Snapshot } from '@agora/client-core';
import { useSyncExternalStore } from 'react';
import type { Connection } from '../projection.ts';
import type { Store } from '../store.ts';
import { largeSnapshot, missedMessages, runUpdates, type RoomFixture } from './adapter.ts';

export type Failure = 'timeout' | 'stale_revision' | 'denied' | 'rate_limited';
export interface DriverState extends Connection { readonly nextEvent: number; readonly decision: string | undefined; readonly outbox: readonly { commandId: string; text: string }[] }
export interface Driver {
	readonly fixture: RoomFixture;
	readonly getState: () => DriverState;
	readonly subscribe: (listener: () => void) => () => void;
	readonly loadSnapshot: () => void;
	readonly loadInvalidSnapshot: () => void;
	readonly loadLargeRoom: (count: number) => void;
	readonly replayNext: () => CoreEvent | undefined;
	readonly replayAll: () => number;
	readonly duplicateLast: () => void;
	readonly skipOne: () => void;
	readonly fillGap: () => void;
	readonly missed: (count: number) => number;
	readonly runBurst: (count: number) => number;
	readonly unsupported: () => void;
	readonly resync: () => void;
	readonly setOnline: (online: boolean) => void;
	readonly revoke: () => void;
	readonly submit: (commandId: string, requestDigest: string, text: string) => void;
	readonly deliverReceipt: () => void;
	readonly fail: (failure: Failure) => void;
	readonly markSeen: (seq: string) => void;
}

const describe = (requests: readonly Request[]): string | undefined => requests.map((r) => r.type === 'wait_retry_after' ? `wait_retry_after ${r.retryAfterSeconds}s` : r.type).join(', ') || undefined;
const nextSeq = (cursor: string): string => (BigInt(cursor) + 1n).toString();

export function createDriver(store: Store, fixture: RoomFixture): Driver {
	let state: DriverState = { online: true, phase: 'idle', error: undefined, nextEvent: 0, decision: undefined, outbox: [] };
	let last: CoreEvent | undefined;
	let skipped: CoreEvent | undefined;
	const listeners = new Set<() => void>();
	const set = (patch: Partial<DriverState>): void => { state = { ...state, ...patch }; for (const listener of listeners) listener(); };
	const room = () => store.getState().rooms.find((r) => r.streamId === fixture.streamId);
	const dispatch = (input: ClientInput): void => { set({ decision: describe(store.dispatch(input).requests) }); };
	const deliver = (event: CoreEvent): void => { last = event; dispatch(event); };
	const cursorOrSnapshot = (): string => room()?.cursor ?? fixture.snapshot.cursor;
	const runId = fixture.snapshot.runs[0]?.id ?? fixture.streamId;
	// A fresh snapshot is what a server would return now: the room at its current cursor, or the fixture bytes when no room exists.
	const freshSnapshot = (): Snapshot => {
		const current = room();
		if (!current || BigInt(current.cursor) <= BigInt(fixture.snapshot.cursor)) return fixture.snapshot;
		return { type: 'snapshot', streamId: fixture.streamId, cursor: current.cursor, lastSeen: current.lastSeen, messages: [...current.messages], runs: [...current.runs] };
	};

	return {
		fixture,
		getState: () => state,
		subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
		loadSnapshot: () => {
			set({ phase: 'loading', error: undefined });
			const snapshot = freshSnapshot();
			dispatch(snapshot);
			set({ phase: 'idle', nextEvent: snapshot === fixture.snapshot ? 0 : state.nextEvent });
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
			set({ phase: 'idle', nextEvent: fixture.events.length });
		},
		replayNext: () => {
			const event = fixture.events[state.nextEvent];
			if (!event) return undefined;
			deliver(event);
			set({ nextEvent: state.nextEvent + 1 });
			return event;
		},
		replayAll: () => {
			let count = 0;
			for (const event of fixture.events.slice(state.nextEvent)) { deliver(event); count++; }
			set({ nextEvent: fixture.events.length });
			return count;
		},
		duplicateLast: () => { if (last) dispatch(last); },
		skipOne: () => {
			const [held, following] = [fixture.events[state.nextEvent], fixture.events[state.nextEvent + 1]];
			if (!held || !following) return;
			skipped = held;
			deliver(following);
			set({ nextEvent: state.nextEvent + 2 });
		},
		fillGap: () => { if (skipped) { deliver(skipped); skipped = undefined; } },
		missed: (count) => {
			const events = missedMessages(fixture.streamId, cursorOrSnapshot(), count);
			for (const event of events) deliver(event);
			return events.length;
		},
		runBurst: (count) => {
			const current = room()?.runs.find((r) => r.id === runId);
			const events = runUpdates(fixture.streamId, runId, cursorOrSnapshot(), current?.revision ?? '0', count);
			for (const event of events) deliver(event);
			return events.length;
		},
		unsupported: () => { dispatch({ type: 'unsupported', streamId: fixture.streamId }); },
		resync: () => { dispatch({ type: 'resync', streamId: fixture.streamId }); },
		setOnline: (online) => { set({ online }); },
		revoke: () => { dispatch({ type: 'clear', reason: 'revoked' }); set({ phase: 'revoked', outbox: [] }); },
		submit: (commandId, requestDigest, text) => {
			const transition = store.dispatch({ type: 'submit', commandId, streamId: fixture.streamId, requestDigest, online: state.online });
			const sent = transition.requests.some((r) => r.type === 'send');
			set({ decision: describe(transition.requests), outbox: sent ? [...state.outbox, { commandId, text }] : state.outbox });
		},
		deliverReceipt: () => {
			const entry = state.outbox[0];
			const current = room();
			if (!entry || !current) return;
			const seq = nextSeq(current.cursor);
			const messageId = `cccccccc-0000-4000-8000-${BigInt(seq).toString(16).padStart(12, '0')}`;
			dispatch({ type: 'receipt', receipt: { ...fixture.receipt, command_id: entry.commandId, aggregate_id: messageId, event_cursors: [{ stream_id: fixture.streamId, committed_seq: seq }] } });
			deliver({ type: 'event', streamId: fixture.streamId, seq, change: { type: 'message', message: { id: messageId, createdSeq: seq, revision: '1', content: { tag: 'visible', body: entry.text } } } });
			dispatch({ type: 'draft', streamId: fixture.streamId, text: '' });
			set({ outbox: state.outbox.slice(1) });
		},
		fail: (failure) => {
			const entry = state.outbox[0];
			const command = store.getState().commands.find((c) => c.commandId === entry?.commandId);
			if (!entry || !command) return;
			dispatch({ type: 'retry', commandId: entry.commandId, requestDigest: command.requestDigest, online: state.online, failure: failure === 'rate_limited' ? { tag: failure, retryAfterSeconds: 30 } : { tag: failure } });
		},
		markSeen: (seq) => { dispatch({ type: 'seen', streamId: fixture.streamId, seq }); },
	};
}

export function useDriverState(driver: Driver): DriverState {
	return useSyncExternalStore(driver.subscribe, driver.getState, driver.getState);
}
