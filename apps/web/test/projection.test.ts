import { expect, test } from 'vitest';
import { load } from '../src/fixture/adapter.ts';
import { composer, rows, segments, status, thread, window } from '../src/projection.ts';
import { createStore } from '../src/store.ts';
import room from '../src/fixture/room.json' with { type: 'json' };

const loaded = load(room);
if (!loaded.ok) throw new Error(loaded.error);
const fixture = loaded.fixture;
const id = (n: number): string => `0f1c1e5e-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`;
const online = { online: true, phase: 'idle' as const, error: undefined };

test('rows project the ordered core timeline with authors, edits, tombstones, threads and one unread boundary', () => {
	const store = createStore();
	store.dispatch(fixture.snapshot);
	const projected = rows(store.getState().rooms[0], fixture.presentation);
	expect(projected.map((r) => r.message.createdSeq)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14']);
	expect(projected.map((r) => r.author.name)).toEqual(['Ada', 'Ben', 'Ada', 'Ben', 'Cam', 'Ada', 'Cam', 'Ada', 'Ben', 'Cam', 'Ada', 'Ben', 'Cam', 'Ada']);
	expect(projected[2]?.edited).toBe(true);
	expect(projected[4]?.message.content).toEqual({ tag: 'tombstone' });
	expect(projected[1]?.replies).toBe(2);
	expect(projected[3]?.replyTo).toBe(id(2));
	expect(projected.filter((r) => r.unread).map((r) => r.message.createdSeq)).toEqual(['13', '14']);
	expect(projected.map((r) => r.firstUnread)).toEqual([...Array<boolean>(12).fill(false), true, false]);
	expect(thread(projected, id(2)).map((r) => r.message.createdSeq)).toEqual(['2', '4', '8']);
	expect(rows(undefined, fixture.presentation)).toEqual([]);
});

test('window keeps the newest rows and counts older ones for the explicit load path', () => {
	const store = createStore();
	store.dispatch(fixture.snapshot);
	const projected = rows(store.getState().rooms[0], fixture.presentation);
	expect(window(projected, 5)).toMatchObject({ older: 9, total: 14 });
	expect(window(projected, 5).rows.map((r) => r.message.createdSeq)).toEqual(['10', '11', '12', '13', '14']);
	expect(window(projected, 50)).toMatchObject({ older: 0, total: 14 });
});

test('status names every phase from core mode and adapter connection state without inventing one', () => {
	const store = createStore();
	expect(status(undefined, online)).toMatchObject({ phase: 'empty', label: 'No room loaded', unread: 0 });
	expect(status(undefined, { ...online, phase: 'loading' })).toMatchObject({ phase: 'loading' });
	expect(status(undefined, { ...online, phase: 'error', error: 'snapshot rejected: snapshot' })).toMatchObject({ phase: 'error', detail: 'snapshot rejected: snapshot' });
	store.dispatch(fixture.snapshot);
	const live = store.getState().rooms[0];
	expect(status(live, online)).toMatchObject({ phase: 'live', label: 'Live', unread: 2, cursor: '16', detail: 'Cursor 16 applied.' });
	expect(status(live, { ...online, online: false }).detail).toBe('Cursor 16 applied. Offline: sends wait for a connection.');
	const second = fixture.events[1];
	if (!second) throw new Error('fixture needs two events');
	const gap = store.dispatch({ ...second, seq: '18' }).state.rooms[0];
	expect(status(gap, online)).toMatchObject({ phase: 'gap', detail: '1 buffered after cursor 16; replay requested.' });
	expect(status(store.dispatch({ type: 'resync', streamId: fixture.streamId }).state.rooms[0], online).phase).toBe('resync');
	expect(status(store.dispatch({ type: 'unsupported', streamId: fixture.streamId }).state.rooms[0], online).phase).toBe('upgrade');
	expect(status(store.dispatch({ type: 'clear', reason: 'revoked' }).state.rooms[0], { ...online, phase: 'revoked' })).toMatchObject({ phase: 'revoked', label: 'Access revoked' });
});

test('composer status reflects only the core draft and pending commands for its stream', () => {
	const store = createStore();
	store.dispatch(fixture.snapshot);
	store.dispatch({ type: 'draft', streamId: fixture.streamId, text: 'unsent idea' });
	store.dispatch({ type: 'draft', streamId: 'other', text: 'elsewhere' });
	store.dispatch({ type: 'submit', commandId: 'c', streamId: fixture.streamId, requestDigest: 'sha256:0', online: true });
	expect(composer(store.getState(), fixture.streamId, 'send')).toEqual({ draft: 'unsent idea', pending: [{ commandId: 'c', tag: 'pending' }], decision: 'send' });
	expect(composer(store.getState(), 'other', undefined).pending).toEqual([]);
});

test('segments split code fences into code blocks and never produce HTML', () => {
	expect(segments('before\n```ts\nconst a = 1;\n```\nafter')).toEqual([{ kind: 'text', value: 'before' }, { kind: 'code', value: 'const a = 1;' }, { kind: 'text', value: 'after' }]);
	expect(segments('<b>plain</b>')).toEqual([{ kind: 'text', value: '<b>plain</b>' }]);
});
