import type { ClientState } from '@agora/client-core';
import { expect, test } from 'vitest';
import { largeSnapshot, load, toEvent, toSnapshot } from '../src/fixture/adapter.ts';
import { createFixtureTransport, type FixtureTransport } from '../src/fixture/fixtureTransport.ts';
import { createStore, type Store } from '../src/store.ts';
import room from '../src/fixture/room.json' with { type: 'json' };

const loaded = load(room);
if (!loaded.ok) throw new Error(loaded.error);
const fixture = loaded.fixture;
const clone = (): Record<string, unknown> => JSON.parse(JSON.stringify(room)) as Record<string, unknown>;
const boot = (): [Store, FixtureTransport] => { const store = createStore(); const transport = createFixtureTransport(store, fixture); transport.loadSnapshot(); return [store, transport]; };
const roomOf = (store: Store): ClientState['rooms'][number] | undefined => store.getState().rooms.find((r) => r.streamId === fixture.streamId);

test('the fixture file validates through the wire validator and rejects each malformed section by name', () => {
	expect(fixture.streamId).toBe('0f1c1e5e-0000-4000-8000-000000000001');
	expect(fixture.snapshot.messages).toHaveLength(8);
	expect(fixture.events.map((e) => e.seq)).toEqual(['9', '10', '11']);
	const bad = clone();
	bad['schema_version'] = 'agora.web-fixture.room/v2';
	expect(load(bad)).toEqual({ ok: false, error: 'fixture schema_version must be agora.web-fixture.room/v1' });
	const snapshot = clone();
	(snapshot['snapshot'] as Record<string, unknown>)['extra'] = true;
	expect(load(snapshot)).toEqual({ ok: false, error: 'snapshot failed FixtureSyncSnapshot validation' });
	const event = clone();
	const first = (event['events'] as Record<string, unknown>[])[0];
	if (first) first['kind'] = 'fixture.unknown';
	expect(load(event)).toEqual({ ok: false, error: 'event 0 failed fixture event validation' });
	const citations = clone();
	((citations['presentation'] as Record<string, unknown>)['citations'] as Record<string, string[]>)['x'] = ['not-a-message'];
	expect(load(citations)).toEqual({ ok: false, error: 'citations for x must reference fixture messages' });
	const receipt = clone();
	(receipt['receipt'] as Record<string, unknown>)['revision'] = 1;
	expect(load(receipt)).toEqual({ ok: false, error: 'receipt failed CommandReceipt validation' });
	expect(toSnapshot({})).toBeUndefined();
	expect(toEvent(fixture.streamId, { kind: 'fixture.message_revision' })).toEqual({ type: 'unsupported', streamId: fixture.streamId });
	expect(largeSnapshot('s', 3).messages.map((m) => m.createdSeq)).toEqual(['1', '2', '3']);
});

test('duplicate delivery leaves the same frozen state and acknowledges nothing', () => {
	const [store, transport] = boot();
	transport.replayNext();
	const before = store.getState();
	transport.duplicateLast();
	expect(store.getState()).toBe(before);
	expect(store.getTranscript().at(-1)).toMatchObject({ input: 'event', acknowledgements: [], requests: [] });
	expect(roomOf(store)?.cursor).toBe('9');
});

test('a skipped event buffers as a gap with a replay request, and filling it drains both without duplicates', () => {
	const [store, transport] = boot();
	transport.skipOne();
	expect(roomOf(store)).toMatchObject({ mode: 'gap', cursor: '8', pending: [fixture.events[1]] });
	expect(store.getTranscript().at(-1)?.requests).toEqual([{ type: 'replay', streamId: fixture.streamId, after: '8' }]);
	expect(transport.getState().decision).toBe('replay');
	transport.fillGap();
	expect(roomOf(store)).toMatchObject({ mode: 'live', cursor: '10', pending: [] });
	expect(store.getTranscript().at(-1)?.acknowledgements).toEqual([{ streamId: fixture.streamId, seq: '10' }]);
	transport.replayAll();
	const current = roomOf(store);
	expect(current?.cursor).toBe('11');
	expect(new Set(current?.messages.map((m) => m.id)).size).toBe(current?.messages.length);
	expect(current?.messages.find((m) => m.createdSeq === '9')?.content).toEqual({ tag: 'tombstone' });
});

test('receipt settles the pending command and appends the fixture message; retry decisions come from the core', () => {
	const [store, transport] = boot();
	store.dispatch({ type: 'draft', streamId: fixture.streamId, text: 'hello from the composer' });
	transport.submit('0f1c1e5e-0000-4000-8000-0000000009aa', 'sha256:aa', 'hello from the composer');
	expect(transport.getState().decision).toBe('send');
	expect(store.getState().commands).toEqual([{ commandId: '0f1c1e5e-0000-4000-8000-0000000009aa', streamId: fixture.streamId, requestDigest: 'sha256:aa', tag: 'pending' }]);
	for (const [failure, decision] of [['timeout', 'resend_same_command'], ['stale_revision', 'refresh_snapshot'], ['rate_limited', 'wait_retry_after 30s'], ['denied', 'stop']] as const) {
		transport.fail(failure);
		expect(transport.getState().decision).toBe(decision);
	}
	transport.setOnline(false);
	transport.fail('timeout');
	expect(transport.getState().decision).toBe('wait_connection');
	transport.setOnline(true);
	transport.deliverReceipt();
	expect(store.getState().commands[0]).toMatchObject({ tag: 'received', receipt: { command_id: '0f1c1e5e-0000-4000-8000-0000000009aa', event_cursors: [{ stream_id: fixture.streamId, committed_seq: '9' }] } });
	expect(roomOf(store)?.messages.at(-1)?.content).toEqual({ tag: 'visible', body: 'hello from the composer' });
	expect(store.getState().drafts).toEqual([]);
	transport.setOnline(false);
	transport.submit('0f1c1e5e-0000-4000-8000-0000000009bb', 'sha256:bb', 'offline text');
	expect(transport.getState().decision).toBe('wait_connection');
	expect(store.getState().commands).toHaveLength(1);
});

test('revocation clears rooms, drafts and the fixture outbox; an invalid snapshot reports an error phase', () => {
	const [store, transport] = boot();
	store.dispatch({ type: 'draft', streamId: fixture.streamId, text: 'private' });
	transport.submit('0f1c1e5e-0000-4000-8000-0000000009cc', 'sha256:cc', 'private');
	transport.revoke();
	expect(store.getState()).toEqual({ rooms: [], commands: [], drafts: [] });
	expect(transport.getState().phase).toBe('revoked');
	const [, fresh] = boot();
	fresh.loadInvalidSnapshot();
	expect(fresh.getState()).toMatchObject({ phase: 'error', error: 'snapshot rejected: snapshot' });
	fresh.unsupported();
	expect(fresh.getState().decision).toBe('upgrade');
});
