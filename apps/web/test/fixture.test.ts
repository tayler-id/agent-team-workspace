import type { ClientState } from '@agora/client-core';
import { createRoomClient, type RoomClient } from '@agora/web-framework';
import { expect, test } from 'vitest';
import { createFixtureTransport, largeSnapshot, load, toEvent, toSnapshot, type FixtureTransport } from '../src/host/index.ts';
import { corpusBody, corpusTombstone } from '../src/fixture/corpus.ts';
import room from '../src/fixture/room.json' with { type: 'json' };

const loaded = load(room);
if (!loaded.ok) throw new Error(loaded.error);
const fixture = loaded.fixture;
const clone = (): Record<string, unknown> => JSON.parse(JSON.stringify(room)) as Record<string, unknown>;
const boot = (): [RoomClient, FixtureTransport] => { const client = createRoomClient(); const transport = createFixtureTransport(client, fixture); transport.loadSnapshot(); return [client, transport]; };
const roomOf = (client: RoomClient): ClientState['rooms'][number] | undefined => client.getState().rooms.find((r) => r.streamId === fixture.streamId);

test('fixture validates and rejects malformed sections; duplicate and gap agree with core', () => {
	expect(fixture.snapshot.messages).toHaveLength(8);
	expect(load({ ...clone(), schema_version: 'agora.web-fixture.room/v2' })).toEqual({ ok: false, error: 'fixture schema_version must be agora.web-fixture.room/v1' });
	const badSnap = clone(); (badSnap['snapshot'] as Record<string, unknown>)['extra'] = true;
	expect(load(badSnap)).toEqual({ ok: false, error: 'snapshot failed FixtureSyncSnapshot validation' });
	expect(toSnapshot({})).toBeUndefined();
	expect(toEvent(fixture.streamId, { kind: 'fixture.message_revision' })).toEqual({ type: 'unsupported', streamId: fixture.streamId });
	expect(largeSnapshot('s', 3).messages).toHaveLength(3);
	const [client, transport] = boot();
	transport.replayNext();
	const before = client.getState();
	transport.duplicateLast();
	expect(client.getState()).toBe(before);
	transport.skipOne();
	expect(roomOf(client)?.mode).toBe('gap');
	transport.fillGap();
	expect(roomOf(client)?.mode).toBe('live');
});

test('corpus is deterministic across runs and covers RTL/CJK/emoji/markdown/hostile-HTML content', () => {
	expect(corpusBody(1)).toBe(corpusBody(1));
	expect(corpusBody(50000)).toBe(corpusBody(50000));
	const bodies = Array.from({ length: 12 }, (_, i) => corpusBody(i));
	expect(new Set(bodies).size).toBe(12);
	expect(corpusTombstone(97)).toBe(true);
	expect(corpusTombstone(98)).toBe(false);
});

test('appendLarge inserts count synthetic events after the current cursor without clearing the room', () => {
	const [client, transport] = boot();
	transport.loadLargeRoom(400);
	const before = roomOf(client);
	if (!before) throw new Error('missing room after loadLargeRoom');
	expect(before.messages).toHaveLength(400);
	transport.appendLarge(100);
	const after = roomOf(client);
	if (!after) throw new Error('missing room after appendLarge');
	expect(after.messages).toHaveLength(500);
	expect(BigInt(after.cursor)).toBeGreaterThan(BigInt(before.cursor));
	expect(after.messages.slice(0, 400)).toEqual(before.messages);
});
