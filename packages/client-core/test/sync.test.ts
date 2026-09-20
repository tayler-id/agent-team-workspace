import { expect, test } from 'vitest';
import { initialState, synchronize, type ClientInput, type ClientState } from '@agora/client-core';

const room = '11111111-1111-4111-8111-111111111111';
const message = (id = 'm', revision = '1', body = 'hello', createdSeq = '1') => ({ id, revision, createdSeq, content: { tag: 'visible' as const, body } });
const event = (seq: string, revision = seq, body = `edit ${seq}`): ClientInput => ({ type: 'event', streamId: room, seq, change: { type: 'message', message: message('m', revision, body) } });
const snapshot = (cursor = '1'): ClientInput => ({ type: 'snapshot', streamId: room, cursor, lastSeen: '0', messages: [message()], runs: [] });
const drive = (...inputs: ClientInput[]): ClientState => inputs.reduce((s, input) => synchronize(s, input).state, initialState());
const expected = { streamId: room, cursor: '1', lastSeen: '0', mode: 'live', unread: 1, messages: [message()], runs: [], pending: [] };

test('baseline idle driver works before accepting an immutable snapshot and requesting strict-after replay', () => {
	expect(synchronize(initialState(), { type: 'idle' })).toEqual({ state: { rooms: [], drafts: [], commands: [] }, acknowledgements: [], requests: [] });
	const result = synchronize(initialState(), snapshot());
	expect(result).toEqual({ state: { rooms: [expected], drafts: [], commands: [] }, acknowledgements: [], requests: [{ type: 'replay', streamId: room, after: '1' }] });
	const input = snapshot();
	const isolated = synchronize(initialState(), input).state;
	if (input.type === 'snapshot' && input.messages[0]) input.messages[0].content = { tag: 'visible', body: 'caller mutation' };
	expect(isolated.rooms[0]?.messages[0]?.content).toEqual({ tag: 'visible', body: 'hello' });
	expect(Object.isFrozen(isolated.rooms[0]?.messages[0]?.content)).toBe(true);
});

test('ordered replay, gaps and duplicate suppression converge to a literal snapshot', () => {
	const initial = drive(snapshot());
	const gap = synchronize(initial, event('3'));
	expect(gap.acknowledgements).toEqual([]);
	expect(gap.requests).toEqual([{ type: 'replay', streamId: room, after: '1' }]);
	expect(gap.state.rooms[0]).toEqual({ ...expected, mode: 'gap', pending: [event('3')] });
	const filled = synchronize(gap.state, event('2'));
	expect(filled).toEqual({ state: { rooms: [{ ...expected, cursor: '3', messages: [message('m', '3', 'edit 3')] }], commands: [], drafts: [] }, acknowledgements: [{ streamId: room, seq: '3' }], requests: [] });
	expect(drive(snapshot(), event('2'), event('3'), event('2'), event('3'))).toEqual(filled.state);
	expect(synchronize(filled.state, event('3')).acknowledgements).toEqual([]);
	expect(initial.rooms).toEqual([expected]);
});

test('snapshots race replay without dropping buffered events or rolling back a newer cursor', () => {
	const result = drive(snapshot(), event('3'), snapshot('2'));
	expect(result.rooms).toEqual([{ ...expected, cursor: '3', messages: [message('m', '3', 'edit 3')] }]);
	expect(synchronize(result, snapshot()).state).toBe(result);
});

test('decimal cursor and message/run revisions compare beyond Number precision', () => {
	const base = drive({ ...snapshot(), type: 'snapshot', streamId: room, cursor: '9007199254740992', lastSeen: '0', messages: [message('m', '9007199254740993')], runs: [{ id: 'r', revision: '9007199254740993', state: 'running' }] });
	const edited = synchronize(base, event('9007199254740993', '9007199254740992', 'old')).state;
	const result = synchronize(edited, { type: 'event', streamId: room, seq: '9007199254740994', change: { type: 'run', run: { id: 'r', revision: '9007199254740992', state: 'queued' } } });
	expect(result.state.rooms[0]).toEqual({ ...expected, cursor: '9007199254740994', messages: [message('m', '9007199254740993')], runs: [{ id: 'r', revision: '9007199254740993', state: 'running' }] });
	expect(result.acknowledgements).toEqual([{ streamId: room, seq: '9007199254740994' }]);
});

test('unread uses visible created positions, not edits, tombstones or run events; seen is explicit and monotone', () => {
	const first = drive(snapshot(), event('2'));
	const withCard = synchronize(first, { type: 'event', streamId: room, seq: '3', change: { type: 'run', run: { id: 'r', revision: '1', state: 'running' } } }).state;
	expect(withCard.rooms[0]?.unread).toBe(1);
	const read = synchronize(withCard, { type: 'seen', streamId: room, seq: '3' }).state;
	const second = synchronize(read, { type: 'event', streamId: room, seq: '4', change: { type: 'message', message: message('new', '1', 'new', '4') } }).state;
	expect(second.rooms[0]?.unread).toBe(1);
	expect(second.rooms[0]?.lastSeen).toBe('3');
	const deleted = synchronize(second, { type: 'event', streamId: room, seq: '5', change: { type: 'message', message: { id: 'new', revision: '2', createdSeq: '4', content: { tag: 'tombstone' } } } }).state;
	expect(deleted.rooms[0]?.unread).toBe(0);
	expect(synchronize(deleted, { type: 'seen', streamId: room, seq: '1' }).state.rooms[0]?.lastSeen).toBe('3');
	expect(synchronize(deleted, { type: 'seen', streamId: room, seq: '99' }).state.rooms[0]?.lastSeen).toBe('5');
});

test('unknown state changes pause with no projection mutation or ack and require supported resync', () => {
	const before = drive(snapshot());
	const unknown = synchronize(before, { type: 'unsupported', streamId: room });
	expect(unknown.state.rooms[0]).toEqual({ ...expected, mode: 'upgrade' });
	expect(unknown.acknowledgements).toEqual([]);
	expect(unknown.requests).toEqual([{ type: 'upgrade', streamId: room }]);
	expect(synchronize(unknown.state, event('2')).state).toBe(unknown.state);
	expect(drive(snapshot(), { type: 'resync', streamId: room }, snapshot('2')).rooms[0]?.cursor).toBe('2');
});

test('streams have independent cursors and a missing snapshot cannot be invented from an event', () => {
	expect(synchronize(initialState(), event('2'))).toEqual({ state: initialState(), acknowledgements: [], requests: [{ type: 'snapshot', streamId: room }] });
	const two = drive(snapshot(), { ...snapshot(), type: 'snapshot', streamId: 'other', cursor: '7', lastSeen: '0', messages: [], runs: [] }, event('2'));
	expect(two.rooms.map((r) => [r.streamId, r.cursor])).toEqual([[room, '2'], ['other', '7']]);
});

test('gaps are bounded and invalid snapshot or changed message positions resync instead of acknowledging', () => {
	const full = Array.from({ length: 1001 }, (_, i) => event(String(i + 3)));
	const bounded = drive(snapshot(), ...full);
	expect(bounded.rooms[0]).toEqual({ ...expected, mode: 'resync' });
	const invalid: ClientInput = { type: 'snapshot', streamId: room, cursor: '1', lastSeen: '2', messages: [message()], runs: [] };
	expect(synchronize(initialState(), invalid)).toEqual({ state: initialState(), acknowledgements: [], requests: [{ type: 'snapshot', streamId: room }] });
	const changed = synchronize(drive(snapshot()), { type: 'event', streamId: room, seq: '2', change: { type: 'message', message: message('m', '2', 'changed', '2') } });
	expect(changed.state.rooms[0]).toEqual({ ...expected, mode: 'resync' });
	expect(changed.acknowledgements).toEqual([]);
});

const submit: ClientInput = { type: 'submit', commandId: 'c', streamId: room, requestDigest: 'hash', online: true };
const receipt = { command_id: 'c', aggregate_id: 'm', revision: '2', event_cursors: [{ stream_id: room, committed_seq: '2' }], receipt_id: 'receipt' };
test('receipts dedupe commands but never fast-forward a timeline; offline sends are not queued', () => {
	const base = drive(snapshot());
	expect(synchronize(base, { ...submit, type: 'submit', commandId: 'c', streamId: room, requestDigest: 'hash', online: false }).state).toBe(base);
	const pending = synchronize(base, submit);
	expect(pending.requests).toEqual([{ type: 'send', commandId: 'c' }]);
	expect(synchronize(pending.state, submit).requests).toEqual([]);
	expect(synchronize(pending.state, { ...submit, type: 'submit', commandId: 'c', streamId: room, online: true, requestDigest: 'changed' }).requests).toEqual([{ type: 'conflict', commandId: 'c' }]);
	const result = synchronize(pending.state, { type: 'receipt', receipt });
	expect(result.state.commands).toEqual([{ commandId: 'c', streamId: room, requestDigest: 'hash', tag: 'received', receipt }]);
	expect(result.state.rooms).toEqual([expected]);
	expect(result.acknowledgements).toEqual([]);
	expect(synchronize(result.state, { type: 'receipt', receipt }).state).toBe(result.state);
});

test('retry decisions preserve the original id/digest, refresh stale state and respect denial/rate delay', () => {
	const pending = drive(snapshot(), submit);
	for (const [failure, online, digest, type] of [
		[{ tag: 'timeout' }, true, 'hash', 'resend_same_command'],
		[{ tag: 'timeout' }, false, 'hash', 'wait_connection'],
		[{ tag: 'timeout' }, true, 'changed', 'conflict'],
		[{ tag: 'stale_revision' }, true, 'hash', 'refresh_snapshot'],
		[{ tag: 'denied' }, true, 'hash', 'stop'],
		[{ tag: 'rate_limited', retryAfterSeconds: 30 }, true, 'hash', 'wait_retry_after'],
	] as const) {
		const result = synchronize(pending, { type: 'retry', commandId: 'c', requestDigest: digest, online, failure });
		expect(result.requests[0]?.type).toBe(type);
		expect(result.state).toBe(pending);
	}
	expect(synchronize(drive(snapshot(), submit, { type: 'receipt', receipt }), { type: 'retry', commandId: 'c', requestDigest: 'hash', online: true, failure: { tag: 'timeout' } }).requests).toEqual([{ type: 'receipt_known', commandId: 'c' }]);
});

test('a full gap can still drain, and newer snapshot cursors cannot resurrect older message revisions', () => {
	const buffered = drive(snapshot(), ...Array.from({ length: 1000 }, (_, i) => event(String(i + 3))));
	expect(synchronize(buffered, event('2')).state.rooms[0]?.cursor).toBe('1002');
	const current = drive(snapshot(), event('2', '3', 'newest'));
	expect(synchronize(current, snapshot('3')).state.rooms[0]?.messages).toEqual([message('m', '3', 'newest')]);
});

test('drafts stay explicitly unsent through route/snapshot changes; logout and revoke erase private state', () => {
	const draft = { streamId: room, text: 'offline idea', tag: 'unsent' };
	const state = drive(snapshot(), { type: 'draft', streamId: room, text: draft.text }, snapshot('2'), submit);
	expect(state.drafts).toEqual([draft]);
	for (const reason of ['logout', 'revoked'] as const) expect(synchronize(state, { type: 'clear', reason }).state).toEqual({ rooms: [], commands: [], drafts: [] });
});
