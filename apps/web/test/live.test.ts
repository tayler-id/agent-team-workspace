import { createRoomClient, type RoomClient } from '@agora/web-framework';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createLiveTransport, type LiveTransport } from '../src/host/index.ts';

const roomId = 'aaaaaaaa-0000-4000-8000-000000000001';
const projectId = 'bbbbbbbb-0000-4000-8000-000000000001';
const scope = { project_id: projectId, room_id: roomId };
const messageId = (n: number): string => `cccccccc-0000-4000-8000-${String(n).padStart(12, '0')}`;

function message(seq: number, body: string): Record<string, unknown> {
	return { schema_version: 'agora.local-room.message/v1', message_id: messageId(seq), scope, room_seq: String(seq), author: { kind: 'human', principal_id: 'dddddddd-0000-4000-8000-000000000001' }, command_id: `eeeeeeee-0000-4000-8000-${String(seq).padStart(12, '0')}`, body, citations: [], created_at: '2026-09-22T00:00:00.000Z' };
}
function snapshot(cursor: number, messages: readonly Record<string, unknown>[]): Record<string, unknown> {
	return { schema_version: 'agora.local-room.snapshot/v1', scope, cursor: { stream_id: roomId, committed_seq: String(cursor) }, messages };
}
function event(seq: number, payload: Record<string, unknown>): Record<string, unknown> {
	return { schema_version: 'agora.local-room.event/v1', stream_id: roomId, seq: String(seq), event_id: messageId(900 + seq), kind: 'local_room.message_created', actor: 'dddddddd-0000-4000-8000-000000000001', occurred_at: '2026-09-22T00:00:00.000Z', payload };
}
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let boot: [RoomClient, LiveTransport];
beforeEach(() => {
	const client = createRoomClient();
	const transport = createLiveTransport(client, { baseUrl: 'http://local-room.invalid', pollDelayMs: 0, retryDelayMs: 0 });
	boot = [client, transport];
});
afterEach(() => { vi.unstubAllGlobals(); });
const room = (): ReturnType<RoomClient['getState']>['rooms'][number] | undefined => boot[0].getState().rooms.find((r) => r.streamId === roomId);
// pollDelayMs/retryDelayMs are 0 in tests, but the loop still yields through real setTimeout(0) macrotasks between fetches.
const flush = async (times = 6): Promise<void> => { for (let i = 0; i < times; i++) await new Promise((resolve) => { setTimeout(resolve, 0); }); };

test('loadSnapshot applies the wire snapshot, then polls events into the committed projection', async () => {
	const [, transport] = boot;
	const fetchMock = vi.fn((url: string): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(1, [message(1, 'first')])));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		return Promise.reject(new Error(`unexpected request ${url}`));
	});
	vi.stubGlobal('fetch', fetchMock);
	transport.loadSnapshot();
	await flush(6);
	expect(room()?.messages.map((m) => m.content)).toEqual([{ tag: 'visible', body: 'first' }]);
	expect(transport.getPresentation().authors[messageId(1)]).toEqual({ name: 'You', kind: 'human' });
	expect(transport.getPresentation().times[messageId(1)]).toBe('2026-09-22T00:00:00.000Z');
	expect(transport.streamId).toBe(roomId);
	expect(transport.getState().phase).toBe('idle');
});

test('a second tab that reconnects after restart converges on the same persisted order without duplicates', async () => {
	const [client, transport] = boot;
	let polls = 0;
	const fetchMock = vi.fn((url: string): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(1, [message(1, 'first')])));
		if (url.includes('/api/v1/local-room/events?after=')) { polls += 1; return Promise.resolve(json(polls === 1 ? [event(2, message(2, 'second'))] : [])); }
		return Promise.reject(new Error(`unexpected request ${url}`));
	});
	vi.stubGlobal('fetch', fetchMock);
	transport.loadSnapshot();
	await flush(8);
	expect(room()?.messages.map((m) => m.content.tag === 'visible' ? m.content.body : 'tombstone')).toEqual(['first', 'second']);
	// A duplicate delivery of the already-applied event must not insert a second row.
	client.apply({ type: 'event', streamId: roomId, seq: '2', change: { type: 'message', message: { id: messageId(2), createdSeq: '2', revision: '1', content: { tag: 'visible', body: 'second' } } } });
	expect(room()?.messages).toHaveLength(2);
});

test('submit posts the command, applies the receipt and clears the draft without an optimistic insert', async () => {
	const [client, transport] = boot;
	const calls: string[] = [];
	const fetchMock = vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		calls.push(url);
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) {
			const command = JSON.parse(init?.body ?? '{}') as { command_id: string };
			return Promise.resolve(json({ schema_version: 'agora.local-room.receipt/v1', identity: { command_id: command.command_id, request_digest: 'sha256:' + 'a'.repeat(64) }, receipt: { command_id: command.command_id, aggregate_id: roomId, revision: '1', event_cursors: [{ stream_id: roomId, committed_seq: '1' }], receipt_id: messageId(500) }, message_id: messageId(1), replayed: false }, 201));
		}
		return Promise.reject(new Error(`unexpected request ${url}`));
	});
	vi.stubGlobal('fetch', fetchMock);
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'hello' });
	transport.submit('ffffffff-0000-4000-8000-000000000001', 'sha256:' + 'a'.repeat(64), 'hello');
	await flush(6);
	expect(client.getState().drafts).toEqual([]);
	expect(client.getState().commands.find((c) => c.commandId === 'ffffffff-0000-4000-8000-000000000001')?.tag).toBe('received');
	expect(room()?.messages).toHaveLength(0); // The receipt settles the command; only the polled event inserts the row.
	expect(calls.filter((c) => c.endsWith('/messages'))).toHaveLength(1);
});

test('a successful send settles even though the server digest never equals the Host digestText hash', async () => {
	// EnvironmentPort.digestText hashes raw text for client-core's own local dedup; it cannot reproduce the
	// server's canonical-command digest (which also covers scope/citations), so the two are expected to differ.
	const [client, transport] = boot;
	let attempts = 0;
	const fetchMock = vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) {
			attempts += 1;
			const command = JSON.parse(init?.body ?? '{}') as { command_id: string };
			return Promise.resolve(json({ schema_version: 'agora.local-room.receipt/v1', identity: { command_id: command.command_id, request_digest: 'sha256:' + 'c'.repeat(64) }, receipt: { command_id: command.command_id, aggregate_id: roomId, revision: '1', event_cursors: [{ stream_id: roomId, committed_seq: '1' }], receipt_id: messageId(502) }, message_id: messageId(3), replayed: false }, 201));
		}
		return Promise.reject(new Error(`unexpected request ${url}`));
	});
	vi.stubGlobal('fetch', fetchMock);
	transport.loadSnapshot();
	await flush(6);
	transport.submit('22222222-0000-4000-8000-000000000001', 'sha256:' + 'd'.repeat(64), 'settles once');
	await flush(6);
	expect(attempts).toBe(1); // A server-identity-only match must settle on the first accepted response, not loop.
	expect(client.getState().drafts).toEqual([]);
	expect(client.getState().commands.find((c) => c.commandId === '22222222-0000-4000-8000-000000000001')?.tag).toBe('received');
});

test('a rejected send retries the frozen command and settles once the server accepts it', async () => {
	const [, transport] = boot;
	let attempts = 0;
	const fetchMock = vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) {
			attempts += 1;
			if (attempts === 1) return Promise.resolve(new Response('blocked', { status: 429, headers: { 'retry-after': '1' } }));
			const command = JSON.parse(init?.body ?? '{}') as { command_id: string };
			return Promise.resolve(json({ schema_version: 'agora.local-room.receipt/v1', identity: { command_id: command.command_id, request_digest: 'sha256:' + 'b'.repeat(64) }, receipt: { command_id: command.command_id, aggregate_id: roomId, revision: '1', event_cursors: [{ stream_id: roomId, committed_seq: '1' }], receipt_id: messageId(501) }, message_id: messageId(2), replayed: false }, 201));
		}
		return Promise.reject(new Error(`unexpected request ${url}`));
	});
	vi.stubGlobal('fetch', fetchMock);
	transport.loadSnapshot();
	await flush(6);
	transport.submit('11111111-0000-4000-8000-000000000001', 'sha256:' + 'b'.repeat(64), 'retry me');
	await new Promise((resolve) => { setTimeout(resolve, 1100); }); // The server's real retry-after: 1 header, honored as a real second.
	await flush(4);
	expect(attempts).toBe(2);
	expect(boot[0].getState().commands.find((c) => c.commandId === '11111111-0000-4000-8000-000000000001')?.tag).toBe('received');
});
