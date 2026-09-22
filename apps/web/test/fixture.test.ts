import type { ClientState } from '@agora/client-core';
import { createRoomClient, type RoomClient } from '@agora/web-framework';
import { expect, test } from 'vitest';
import { createFixtureTransport, largeSnapshot, load, toEvent, toSnapshot, type FixtureTransport } from '../src/host/index.ts';
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
