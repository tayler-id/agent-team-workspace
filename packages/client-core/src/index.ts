import type { ClientInput, ClientState, CoreEvent, Frozen, Message, Receipt, Request, Transition } from './model.ts';
export type { ClientInput, ClientState, CoreEvent, Message, Receipt, Request, Snapshot, Transition } from './model.ts';

type Room = ClientState['rooms'][number];
const compare = (a: string, b: string): number => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
function freeze<T>(value: T): T {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) {
		Object.values(value).forEach(freeze);
		Object.freeze(value);
	}
	return value;
}
// Copy incoming values even if the caller shallow-froze them; freezing caller-owned children would mutate input.
function copy<T>(value: T): T {
	if (!value || typeof value !== 'object') return value;
	return (Array.isArray(value) ? value.map((v: unknown) => copy(v)) : Object.fromEntries(Object.entries(value).map(([k, v]: [string, unknown]) => [k, copy(v)]))) as T;
}
export function initialState(): ClientState { return freeze({ rooms: [], commands: [], drafts: [] }); }
const finish = (state: ClientState, requests: Request[] = [], acknowledgements: Transition['acknowledgements'] = []): Transition => freeze({ state: seenOwn(state), requests, acknowledgements });
const putRoom = (state: ClientState, room: Room): ClientState => ({ ...state, rooms: state.rooms.some((r) => r.streamId === room.streamId) ? state.rooms.map((r) => r.streamId === room.streamId ? room : r) : [...state.rooms, room] });
const unread = (room: Room): Room => ({ ...room, unread: room.messages.filter((m) => m.content.tag === 'visible' && compare(m.createdSeq, room.lastSeen) > 0).length });
// Sending is reading: once the cursor has applied this client's own receipted event, lastSeen moves up to it,
// so your message never counts as unread. Receipt order against the event does not matter; the later of the two moves it.
function seenOwn(state: ClientState): ClientState {
	const own = state.commands.flatMap((c) => c.tag === 'received' ? c.receipt.event_cursors : []);
	let rooms = state.rooms;
	for (const room of state.rooms) {
		const seq = own.reduce((max, c) => c.stream_id === room.streamId && compare(c.committed_seq, room.cursor) <= 0 && compare(c.committed_seq, max) > 0 ? c.committed_seq : max, room.lastSeen);
		if (seq !== room.lastSeen) rooms = rooms.map((r) => r === room ? unread({ ...room, lastSeen: seq }) : r);
	}
	return rooms === state.rooms ? state : { ...state, rooms };
}
const position = (a: Frozen<Message>, b: Frozen<Message>): number => compare(a.createdSeq, b.createdSeq) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const ordered = (messages: readonly Frozen<Message>[]): readonly Frozen<Message>[] => [...messages].sort(position);
const halt = (room: Room, mode: 'resync' | 'upgrade'): Room => ({ ...room, mode, pending: [] });
function apply(room: Room, event: Frozen<CoreEvent>): Room | undefined {
	if (event.change.type === 'message') {
		const message = event.change.message, index = room.messages.findIndex((m) => m.id === message.id), previous = room.messages[index];
		if (compare(message.createdSeq, event.seq) > 0 || (previous && previous.createdSeq !== message.createdSeq)) return undefined;
		if (previous && compare(message.revision, previous.revision) <= 0) return room;
		const messages = [...room.messages];
		if (previous) messages[index] = message;
		else {
			let low = 0, high = messages.length;
			while (low < high) { const mid = (low + high) >>> 1; const at = messages[mid]; if (at && position(at, message) < 0) low = mid + 1; else high = mid; }
			messages.splice(low, 0, message);
		}
		const isUnread = (m: Frozen<Message> | undefined): number => m?.content.tag === 'visible' && compare(m.createdSeq, room.lastSeen) > 0 ? 1 : 0;
		return { ...room, messages, unread: room.unread + isUnread(message) - isUnread(previous) };
	}
	const run = event.change.run, previous = room.runs.find((r) => r.id === run.id);
	return previous && compare(run.revision, previous.revision) <= 0 ? room : { ...room, runs: [...room.runs.filter((r) => r.id !== run.id), run].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) };
}
function drain(room: Room): Room {
	let current = room;
	const pending = [...room.pending].sort((a, b) => compare(a.seq, b.seq));
	while (pending[0] && BigInt(pending[0].seq) === BigInt(current.cursor) + 1n) {
		const event = pending.shift();
		if (!event) break;
		const applied = apply(current, event);
		if (!applied) return halt(current, 'resync');
		current = { ...applied, cursor: event.seq };
	}
	return { ...current, pending, mode: pending.length ? 'gap' : 'live' };
}
function sameReceipt(a: Receipt, b: Receipt): boolean {
	return a.receipt_id === b.receipt_id && a.command_id === b.command_id && a.aggregate_id === b.aggregate_id && a.revision === b.revision && a.event_cursors.length === b.event_cursors.length && a.event_cursors.every((cursor, i) => cursor.stream_id === b.event_cursors[i]?.stream_id && cursor.committed_seq === b.event_cursors[i].committed_seq);
}
function commandTransition(state: ClientState, input: Extract<ClientInput, { type: 'submit' | 'receipt' | 'retry' }>): Transition {
	const commandId = input.type === 'receipt' ? input.receipt.command_id : input.commandId;
	const previous = state.commands.find((c) => c.commandId === commandId);
	if (input.type === 'receipt') {
		if (!previous) return finish(state);
		if (previous.tag === 'received') return finish(state, sameReceipt(previous.receipt, input.receipt) ? [] : [{ type: 'conflict', commandId }]);
		return finish({ ...state, commands: state.commands.map((c) => c === previous ? { ...c, tag: 'received', receipt: input.receipt } : c) });
	}
	if (previous && previous.requestDigest !== input.requestDigest) return finish(state, [{ type: 'conflict', commandId }]);
	if (input.type === 'submit') {
		if (previous) return finish(state);
		if (!input.online) return finish(state, [{ type: 'wait_connection', commandId }]);
		const { streamId, requestDigest } = input;
		return finish({ ...state, commands: [...state.commands, { commandId, streamId, requestDigest, tag: 'pending' }] }, [{ type: 'send', commandId }]);
	}
	if (!previous) return finish(state, [{ type: 'stop', commandId }]);
	if (previous.tag === 'received') return finish(state, [{ type: 'receipt_known', commandId }]);
	switch (input.failure.tag) {
		case 'denied': return finish(state, [{ type: 'stop', commandId }]);
		case 'stale_revision': return finish(state, [{ type: 'refresh_snapshot', commandId }]);
		case 'rate_limited': return finish(state, [input.online ? { type: 'wait_retry_after', commandId, retryAfterSeconds: input.failure.retryAfterSeconds } : { type: 'wait_connection', commandId }]);
		case 'timeout': return finish(state, [{ type: input.online ? 'resend_same_command' : 'wait_connection', commandId }]);
	}
}
export function synchronize(state: ClientState, value: ClientInput): Transition {
	const input = copy(value);
	switch (input.type) {
		case 'idle': return finish(state);
		case 'clear': return finish(initialState());
		case 'submit': case 'receipt': case 'retry': return commandTransition(state, input);
		case 'draft': return finish({ ...state, drafts: [...state.drafts.filter((d) => d.streamId !== input.streamId), ...(input.text ? [{ streamId: input.streamId, text: input.text, tag: 'unsent' as const }] : [])] });
		case 'snapshot': case 'event': case 'unsupported': case 'resync': case 'seen': break;
	}
	const room = state.rooms.find((r) => r.streamId === input.streamId);
	const requestSnapshot: Request[] = [{ type: 'snapshot', streamId: input.streamId }];
	if (input.type === 'snapshot') {
		if (room && compare(input.cursor, room.cursor) < 0) return finish(state);
		if (compare(input.lastSeen, input.cursor) > 0 || input.messages.some((m) => compare(m.createdSeq, input.cursor) > 0) || new Set(input.messages.map((m) => m.id)).size !== input.messages.length || new Set(input.runs.map((r) => r.id)).size !== input.runs.length) return finish(state, requestSnapshot);
		const previousMessages = new Map(room?.messages.map((m) => [m.id, m]));
		const previousRuns = new Map(room?.runs.map((r) => [r.id, r]));
		const next = drain(unread({
			streamId: input.streamId, cursor: input.cursor,
			lastSeen: room && compare(room.lastSeen, input.lastSeen) > 0 ? room.lastSeen : input.lastSeen,
			messages: ordered(input.messages.map((message) => { const old = previousMessages.get(message.id); return old && compare(old.revision, message.revision) >= 0 ? old : message; })),
			runs: input.runs.map((run) => { const old = previousRuns.get(run.id); return old && compare(old.revision, run.revision) > 0 ? old : run; }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
			unread: 0, mode: 'live', pending: (room?.pending ?? []).filter((e) => compare(e.seq, input.cursor) > 0),
		}));
		return finish(putRoom(state, next), next.mode === 'resync' ? requestSnapshot : [{ type: 'replay', streamId: next.streamId, after: next.cursor }], compare(next.cursor, input.cursor) > 0 ? [{ streamId: next.streamId, seq: next.cursor }] : []);
	}
	if (input.type === 'unsupported') return finish(room ? putRoom(state, { ...room, mode: 'upgrade' }) : state, [{ type: 'upgrade', streamId: input.streamId }]);
	if (!room) return finish(state, requestSnapshot);
	if (input.type === 'resync') return finish(putRoom(state, halt(room, 'resync')), requestSnapshot);
	if (input.type === 'seen') {
		const seq = compare(input.seq, room.cursor) > 0 ? room.cursor : input.seq;
		return compare(seq, room.lastSeen) <= 0 ? finish(state) : finish(putRoom(state, unread({ ...room, lastSeen: seq })));
	}
	if (room.mode === 'resync' || room.mode === 'upgrade' || compare(input.seq, room.cursor) <= 0 || room.pending.some((e) => e.seq === input.seq)) return finish(state);
	if (room.pending.length >= 1000 && BigInt(input.seq) !== BigInt(room.cursor) + 1n) return finish(putRoom(state, halt(room, 'resync')), requestSnapshot);
	const next = drain({ ...room, pending: [...room.pending, input] });
	const requests: Request[] = next.mode === 'resync' ? requestSnapshot : next.mode === 'gap' ? [{ type: 'replay', streamId: room.streamId, after: next.cursor }] : [];
	return finish(putRoom(state, next), requests, compare(next.cursor, room.cursor) > 0 ? [{ streamId: room.streamId, seq: next.cursor }] : []);
}
