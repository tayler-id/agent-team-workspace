import { initialState, type Snapshot } from '@agora/client-core';
import { expect, test } from 'vitest';
import { createRoomClient } from '../src/client.ts';
import { composer, rows, segments, status, window } from '../src/projection.ts';

const snap = (cursor = '1'): Snapshot => ({ type: 'snapshot', streamId: 's1', cursor, lastSeen: '0', runs: [], messages: [{ id: 'm1', createdSeq: '1', revision: '1', content: { tag: 'visible', body: 'hello' } }] });

test('one writer keeps immutable identity; alternate clients do not share state', () => {
	const a = createRoomClient(), b = createRoomClient();
	expect(a.getState()).toEqual(initialState());
	const first = a.apply(snap()).state;
	expect(a.apply({ type: 'event', streamId: 's1', seq: '1', change: { type: 'message', message: { id: 'm1', createdSeq: '1', revision: '1', content: { tag: 'visible', body: 'hello' } } } }).state).toBe(first);
	b.apply(snap());
	expect(b.getState().rooms[0]?.messages[0]).not.toBe(a.getState().rooms[0]?.messages[0]);
});

test('command routing, gap/duplicate agreement, unsubscribe and offline decisions stay on one writer', () => {
	const client = createRoomClient();
	client.apply(snap('8'));
	client.apply({ type: 'draft', streamId: 's1', text: 'draft' });
	expect(client.apply({ type: 'submit', commandId: 'c1', streamId: 's1', requestDigest: 'sha256:x', online: true }).requests).toEqual([{ type: 'send', commandId: 'c1' }]);
	const event = { type: 'event' as const, streamId: 's1', seq: '10', change: { type: 'message' as const, message: { id: 'm10', createdSeq: '10', revision: '1', content: { tag: 'visible' as const, body: 'later' } } } };
	expect(client.apply(event).state.rooms[0]?.mode).toBe('gap');
	expect(client.apply({ type: 'event', streamId: 's1', seq: '9', change: { type: 'message', message: { id: 'm9', createdSeq: '9', revision: '1', content: { tag: 'visible', body: 'missing' } } } }).state.rooms[0]?.cursor).toBe('10');
	const before = client.getState();
	client.apply(event);
	expect(client.getState()).toBe(before);
	let ticks = 0;
	const stop = client.subscribe(() => { ticks += 1; });
	client.apply({ type: 'draft', streamId: 's1', text: 'x' });
	stop();
	client.apply({ type: 'draft', streamId: 's1', text: 'y' });
	expect(ticks).toBe(1);
	expect(client.apply({ type: 'submit', commandId: 'c2', streamId: 's1', requestDigest: 'sha256:y', online: false }).requests).toEqual([{ type: 'wait_connection', commandId: 'c2' }]);
});

test('pure projection covers rows, window, status, composer and safe segments', () => {
	const client = createRoomClient();
	client.apply(snap());
	const room = client.getState().rooms[0];
	const projected = rows(room, { authors: { m1: { name: 'Ada', kind: 'human' } }, times: { m1: 't' }, citations: {} });
	expect(projected[0]).toMatchObject({ author: { name: 'Ada' }, firstUnread: true });
	expect(window(projected, 1).total).toBe(1);
	expect(status(room, { online: true, phase: 'idle', error: undefined, link: 'online' }).phase).toBe('live');
	expect(status(undefined, { online: true, phase: 'error', error: 'boom', link: 'retrying' }).phase).toBe('error');
	client.apply({ type: 'draft', streamId: 's1', text: 'note' });
	expect(composer(client.getState(), 's1', {}, 'send').draft).toBe('note');
	expect(segments('a\n```\ncode\n```\nb')).toEqual([{ kind: 'text', value: 'a' }, { kind: 'code', value: 'code' }, { kind: 'text', value: 'b' }]);
});
