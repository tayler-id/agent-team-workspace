import type { ClientState } from '@agora/client-core';
import { expect, test } from 'vitest';
import { largeSnapshot, load, missedMessages, toEvent, toSnapshot } from '../src/fixture/adapter.ts';
import { createDriver, type Driver } from '../src/fixture/driver.ts';
import { createStore, type Store } from '../src/store.ts';
import room from '../src/fixture/room.json' with { type: 'json' };

const loaded = load(room);
if (!loaded.ok) throw new Error(loaded.error);
const fixture = loaded.fixture;
const clone = (): Record<string, unknown> => JSON.parse(JSON.stringify(room)) as Record<string, unknown>;
const boot = (): [Store, Driver] => { const store = createStore(); const driver = createDriver(store, fixture); driver.loadSnapshot(); return [store, driver]; };
const roomOf = (store: Store): ClientState['rooms'][number] | undefined => store.getState().rooms.find((r) => r.streamId === fixture.streamId);

test('the fixture file validates through the wire validator and rejects each malformed section by name', () => {
	expect(fixture.streamId).toBe('0f1c1e5e-0000-4000-8000-000000000001');
	expect(fixture.snapshot.messages).toHaveLength(14);
	expect(fixture.events.map((e) => e.seq)).toEqual(['17', '18', '19', '20', '21', '22']);
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
	const threads = clone();
	((threads['presentation'] as Record<string, unknown>)['threads'] as Record<string, string>)['x'] = 'not-a-message';
	expect(load(threads)).toEqual({ ok: false, error: 'thread root for x is not a fixture message' });
	const receipt = clone();
	(receipt['receipt'] as Record<string, unknown>)['revision'] = 1;
	expect(load(receipt)).toEqual({ ok: false, error: 'receipt failed CommandReceipt validation' });
	expect(toSnapshot({})).toBeUndefined();
	expect(toEvent(fixture.streamId, { kind: 'fixture.message_revision' })).toEqual({ type: 'unsupported', streamId: fixture.streamId });
});

test('duplicate delivery leaves the same frozen state and acknowledges nothing', () => {
	const [store, driver] = boot();
	driver.replayNext();
	const before = store.getState();
	driver.duplicateLast();
	expect(store.getState()).toBe(before);
	expect(store.getTranscript().at(-1)).toMatchObject({ input: 'event', acknowledgements: [], requests: [] });
	expect(roomOf(store)?.cursor).toBe('17');
});

test('a skipped event buffers as a gap with a replay request, and filling it drains both without duplicates', () => {
	const [store, driver] = boot();
	driver.skipOne();
	expect(roomOf(store)).toMatchObject({ mode: 'gap', cursor: '16', pending: [fixture.events[1]] });
	expect(store.getTranscript().at(-1)?.requests).toEqual([{ type: 'replay', streamId: fixture.streamId, after: '16' }]);
	expect(driver.getState().decision).toBe('replay');
	driver.fillGap();
	expect(roomOf(store)).toMatchObject({ mode: 'live', cursor: '18', pending: [] });
	expect(store.getTranscript().at(-1)?.acknowledgements).toEqual([{ streamId: fixture.streamId, seq: '18' }]);
	driver.replayAll();
	const current = roomOf(store);
	expect(current?.cursor).toBe('22');
	expect(new Set(current?.messages.map((m) => m.id)).size).toBe(current?.messages.length);
	expect(current?.messages.find((m) => m.createdSeq === '13')?.content).toEqual({ tag: 'tombstone' });
	expect(current?.runs.map((r) => [r.id.slice(-2), r.revision, r.state])).toEqual([['01', '4', 'running'], ['02', '2', 'running'], ['03', '2', 'succeeded'], ['04', '1', 'failed']]);
});

test('1,000 missed events converge in order with unique ids, and 200 run-only updates leave message references untouched', () => {
	const [store, driver] = boot();
	driver.replayAll();
	expect(driver.missed(1000)).toBe(1000);
	const after = roomOf(store);
	expect(after?.cursor).toBe('1022');
	expect(after?.messages).toHaveLength(1016);
	expect(new Set(after?.messages.map((m) => m.id)).size).toBe(1016);
	expect(after?.unread).toBe(1003);
	const messages = after?.messages;
	expect(driver.runBurst(200)).toBe(200);
	const burst = roomOf(store);
	expect(burst?.messages).toBe(messages);
	expect(burst?.runs.find((r) => r.id.endsWith('01'))).toEqual({ id: fixture.snapshot.runs[0]?.id, revision: '204', state: 'succeeded' });
	expect(burst?.cursor).toBe('1222');
	expect(missedMessages('s', '5', 2).map((e) => e.seq)).toEqual(['6', '7']);
	expect(largeSnapshot('s', 3).messages.map((m) => m.createdSeq)).toEqual(['1', '2', '3']);
});

test('receipt settles the pending command and appends the fixture message; retry decisions come from the core', () => {
	const [store, driver] = boot();
	store.dispatch({ type: 'draft', streamId: fixture.streamId, text: 'hello from the composer' });
	driver.submit('0f1c1e5e-0000-4000-8000-0000000009aa', 'sha256:aa', 'hello from the composer');
	expect(driver.getState().decision).toBe('send');
	expect(store.getState().commands).toEqual([{ commandId: '0f1c1e5e-0000-4000-8000-0000000009aa', streamId: fixture.streamId, requestDigest: 'sha256:aa', tag: 'pending' }]);
	for (const [failure, decision] of [['timeout', 'resend_same_command'], ['stale_revision', 'refresh_snapshot'], ['rate_limited', 'wait_retry_after 30s'], ['denied', 'stop']] as const) {
		driver.fail(failure);
		expect(driver.getState().decision).toBe(decision);
	}
	driver.setOnline(false);
	driver.fail('timeout');
	expect(driver.getState().decision).toBe('wait_connection');
	driver.setOnline(true);
	driver.deliverReceipt();
	expect(store.getState().commands[0]).toMatchObject({ tag: 'received', receipt: { command_id: '0f1c1e5e-0000-4000-8000-0000000009aa', event_cursors: [{ stream_id: fixture.streamId, committed_seq: '17' }] } });
	expect(roomOf(store)?.messages.at(-1)?.content).toEqual({ tag: 'visible', body: 'hello from the composer' });
	expect(store.getState().drafts).toEqual([]);
	driver.setOnline(false);
	driver.submit('0f1c1e5e-0000-4000-8000-0000000009bb', 'sha256:bb', 'offline text');
	expect(driver.getState()).toMatchObject({ decision: 'wait_connection', outbox: [] });
	expect(store.getState().commands).toHaveLength(1);
});

test('revocation clears rooms, drafts and the fixture outbox; an invalid snapshot reports an error phase', () => {
	const [store, driver] = boot();
	store.dispatch({ type: 'draft', streamId: fixture.streamId, text: 'private' });
	driver.submit('0f1c1e5e-0000-4000-8000-0000000009cc', 'sha256:cc', 'private');
	driver.revoke();
	expect(store.getState()).toEqual({ rooms: [], commands: [], drafts: [] });
	expect(driver.getState()).toMatchObject({ phase: 'revoked', outbox: [] });
	const [, fresh] = boot();
	fresh.loadInvalidSnapshot();
	expect(fresh.getState()).toMatchObject({ phase: 'error', error: 'snapshot rejected: snapshot' });
	fresh.unsupported();
	expect(fresh.getState().decision).toBe('upgrade');
});
