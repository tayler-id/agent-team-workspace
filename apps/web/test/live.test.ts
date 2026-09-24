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
const json = (body: unknown, status = 200, instance?: string): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...(instance === undefined ? {} : { 'x-agora-instance': instance }) } });

function fakeStorage(): Storage {
	const store = new Map<string, string>();
	return { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); }, removeItem: (key: string) => { store.delete(key); }, clear: () => { store.clear(); }, key: () => null, get length() { return store.size; } };
}

let boot: [RoomClient, LiveTransport];
beforeEach(() => {
	vi.stubGlobal('sessionStorage', fakeStorage());
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

test('a 503 retries the frozen command and settles once the server accepts it', async () => {
	const [, transport] = boot;
	let attempts = 0;
	const fetchMock = vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) {
			attempts += 1;
			if (attempts === 1) return Promise.resolve(new Response('temporarily unavailable', { status: 503 }));
			const command = JSON.parse(init?.body ?? '{}') as { command_id: string };
			return Promise.resolve(receiptFor(command.command_id));
		}
		return Promise.reject(new Error(`unexpected request ${url}`));
	});
	vi.stubGlobal('fetch', fetchMock);
	transport.loadSnapshot();
	await flush(6);
	transport.submit('12121212-0000-4000-8000-000000000001', 'sha256:' + 'b'.repeat(64), 'retry 503');
	await flush(12);
	expect(attempts).toBe(2);
	expect(boot[0].getState().commands.find((c) => c.commandId === '12121212-0000-4000-8000-000000000001')?.tag).toBe('received');
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

const receiptFor = (commandId: string): Response => json({ schema_version: 'agora.local-room.receipt/v1', identity: { command_id: commandId, request_digest: 'sha256:' + 'e'.repeat(64) }, receipt: { command_id: commandId, aggregate_id: roomId, revision: '1', event_cursors: [{ stream_id: roomId, committed_seq: '1' }], receipt_id: messageId(503) }, message_id: messageId(4), replayed: false }, 201);
function stubMessages(respond: (commandId: string, attempt: number) => Response | Promise<Response>, instance = 'launch-a'): string[] {
	const posted: string[] = [];
	vi.stubGlobal('fetch', vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, []), 200, instance));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		const command = JSON.parse(init?.body ?? '{}') as { command_id: string };
		posted.push(command.command_id);
		return Promise.resolve(respond(command.command_id, posted.length));
	}));
	return posted;
}

test('local quote retries reuse a persisted action identity, then a later explicit quote gets a fresh identity', async () => {
	const [, transport] = boot;
	const stored = new Map<string, string>();
	vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => { stored.set(key, value); }, removeItem: (key: string) => { stored.delete(key); } });
	const posted: string[] = [];
	vi.stubGlobal('fetch', vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		const command = JSON.parse(init?.body ?? '{}') as { command_id: string };
		posted.push(command.command_id);
		return posted.length === 1 ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve(receiptFor(command.command_id));
	}));
	transport.loadSnapshot();
	await flush(6);
	await expect(transport.answer([messageId(1)])).rejects.toThrow('Failed to fetch');
	const pending = stored.get(`agora.local-answer.pending:${projectId}:${roomId}:${messageId(1)}`) ?? null;
	expect(pending).toBe(posted[0]);
	const reopened = createLiveTransport(createRoomClient(), { baseUrl: 'http://local-room.invalid', pollDelayMs: 0 });
	reopened.loadSnapshot();
	await flush(6);
	await reopened.answer([messageId(1)]);
	expect(posted[1]).toBe(posted[0]);
	expect(stored.get(`agora.local-answer.pending:${projectId}:${roomId}:${messageId(1)}`)).toBeUndefined();
	await transport.answer([messageId(1)]);
	expect(posted[2]).not.toBe(posted[1]);
});

test('pressing Send again on an unchanged unsettled draft reuses the pending identity and persists one message', async () => {
	const [client, transport] = boot;
	const posted = stubMessages((commandId, attempt) => attempt <= 3 ? Promise.reject(new TypeError('Failed to fetch')) : receiptFor(commandId));
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'sent while down' });
	transport.submit('33333333-0000-4000-8000-000000000001', 'sha256:' + 'f'.repeat(64), 'sent while down');
	transport.submit('33333333-0000-4000-8000-000000000002', 'sha256:' + 'f'.repeat(64), 'sent while down');
	await flush(12);
	expect(new Set(posted)).toEqual(new Set(['33333333-0000-4000-8000-000000000001']));
	expect(client.getState().commands.map((c) => [c.commandId, c.tag])).toEqual([['33333333-0000-4000-8000-000000000001', 'received']]);
	expect(client.getState().drafts).toEqual([]);
});

test.each([
	['a 400 malformed_command', (): Response => json({ reason_code: 'malformed_command', correlation_id: messageId(600), details: ['/body must NOT have more than 4096 characters'] }, 400), 'HTTP 400 malformed_command'],
	['a schema-invalid receipt', (): Response => json({ schema_version: 'agora.local-room.receipt/v1' }, 201), 'invalid RoomCommandReceipt'],
	['a receipt for another command', (): Response => receiptFor('99999999-0000-4000-8000-000000000001'), 'receipt identity mismatch'],
])('%s stops retrying, keeps the draft and shows the failure', async (_name, respond, shown) => {
	const [client, transport] = boot;
	const posted = stubMessages(respond);
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'rejected' });
	transport.submit('44444444-0000-4000-8000-000000000001', 'sha256:' + 'f'.repeat(64), 'rejected');
	await flush(20);
	expect(posted).toHaveLength(1);
	expect(transport.getState().decision).toContain('stop');
	expect(transport.getState().decision).toContain(shown);
	expect(client.getState().drafts.map((d) => d.text)).toEqual(['rejected']);
});

function stubEmptyRoom(cursor = 0, instance?: string): void {
	vi.stubGlobal('fetch', vi.fn((url: string): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(cursor, []), 200, instance));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
}
// Simulates a reload: a fresh page loads a fresh client/transport but keeps the same tab's sessionStorage.
function reopen(): [RoomClient, LiveTransport] {
	const client = createRoomClient();
	const transport = createLiveTransport(client, { baseUrl: 'http://local-room.invalid', pollDelayMs: 0, retryDelayMs: 0 });
	return [client, transport];
}
const draftText = (c: RoomClient): readonly string[] => c.getState().drafts.map((d) => d.text);

test('an unsent draft survives a reload in the same tab', async () => {
	const [client, transport] = boot;
	stubEmptyRoom(0, 'launch-a');
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'not sent yet' });
	transport.saveDraft(roomId, 'not sent yet');
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(0, 'launch-a');
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual(['not sent yet']);
});

test('a failed send keeps the draft persisted for the next reload', async () => {
	const [client, transport] = boot;
	stubMessages(() => new Response('down', { status: 503 }));
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'still trying' });
	transport.saveDraft(roomId, 'still trying');
	transport.submit('55555555-0000-4000-8000-000000000001', 'sha256:' + 'a'.repeat(64), 'still trying');
	await flush(6);
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(0, 'launch-a'); // stubMessages answers identity with 'launch-a'; keep the same verified process.
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual(['still trying']);
});

test('a successful send clears the persisted draft so a later reload starts empty', async () => {
	const [client, transport] = boot;
	stubMessages(() => receiptFor('66666666-0000-4000-8000-000000000001'));
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'about to send' });
	transport.saveDraft(roomId, 'about to send');
	transport.submit('66666666-0000-4000-8000-000000000001', 'sha256:' + 'a'.repeat(64), 'about to send');
	await flush(6);
	expect(draftText(client)).toEqual([]);
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(1, 'launch-a');
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual([]);
});

test('typing a new draft while an earlier send is in flight survives that send\'s receipt', async () => {
	const [client, transport] = boot;
	let resolveReceipt: (response: Response) => void = () => undefined;
	vi.stubGlobal('fetch', vi.fn((url: string): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, []), 200, 'launch-a'));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) return new Promise((resolve) => { resolveReceipt = resolve; });
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'message A' });
	transport.saveDraft(roomId, 'message A');
	transport.submit('77777777-0000-4000-8000-000000000001', 'sha256:' + 'a'.repeat(64), 'message A');
	await flush(2);
	// While A's receipt is still in flight, the user types a new, distinct, still-unsent message B.
	client.apply({ type: 'draft', streamId: roomId, text: 'message B' });
	transport.saveDraft(roomId, 'message B');
	resolveReceipt(receiptFor('77777777-0000-4000-8000-000000000001'));
	await flush(6);
	expect(draftText(client)).toEqual(['message B']);
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(0, 'launch-a');
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual(['message B']);
});

test('a deliberate clear (emptying the box) also drops the persisted draft', async () => {
	const [client, transport] = boot;
	stubEmptyRoom(0, 'launch-a');
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'typed then undone' });
	transport.saveDraft(roomId, 'typed then undone');
	client.apply({ type: 'draft', streamId: roomId, text: '' });
	transport.saveDraft(roomId, '');
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(0, 'launch-a');
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual([]);
});

test('a room reset to a lower cursor discards a stale draft instead of exposing old text', async () => {
	const [client, transport] = boot;
	stubEmptyRoom(5, 'launch-a');
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'from before the reset' });
	transport.saveDraft(roomId, 'from before the reset');
	// A disposable reset drops all data and restarts the same room at a fresh, lower cursor (same verified instance
	// here isolates the cursor guard from the separate instance guard covered by the cursor-0 tests below).
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(0, 'launch-a');
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual([]);
});

test('an unsent draft at cursor 0 survives an ordinary reload of the same instance', async () => {
	const [client, transport] = boot;
	stubEmptyRoom(0, 'launch-a');
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'still typing' });
	transport.saveDraft(roomId, 'still typing');
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(0, 'launch-a'); // Same reused port, same disposable process: an ordinary reload, not a reset.
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual(['still typing']);
});

test('a same-origin reset still at cursor 0 is told apart from an ordinary reload by process identity', async () => {
	const [client, transport] = boot;
	stubEmptyRoom(0, 'launch-a');
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'from before the reset' });
	transport.saveDraft(roomId, 'from before the reset');
	// A disposable reset tears the whole process down and restarts it: the reused port keeps the cursor at the same
	// 0, which a cursor-only check cannot tell from a reload, but `local-room start` mints a fresh process identity.
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(0, 'launch-b');
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual([]);
});

test('a send still unsettled when the tab reloads reuses the same command id instead of duplicating it', async () => {
	const [client, transport] = boot;
	const posted: string[] = [];
	let neverSettles: Promise<Response> | undefined;
	vi.stubGlobal('fetch', vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, []), 200, 'launch-a'));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) {
			const command = JSON.parse(init?.body ?? '{}') as { command_id: string };
			posted.push(command.command_id);
			// The first attempt's response never arrives before the reload, matching a page that reloads while the
			// POST is still uncertain: it may already have committed on the server.
			if (posted.length === 1) { neverSettles = new Promise(() => undefined); return neverSettles; }
			return Promise.resolve(receiptFor(command.command_id));
		}
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'uncertain send' });
	transport.saveDraft(roomId, 'uncertain send');
	transport.submit('99999999-0000-4000-8000-000000000001', 'sha256:' + 'a'.repeat(64), 'uncertain send');
	await flush(4);
	expect(posted).toEqual(['99999999-0000-4000-8000-000000000001']);
	const [reloadedClient, reloadedTransport] = reopen();
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual(['uncertain send']);
	// A fresh id minted for the retry must be discarded in favor of the id already posted before the reload.
	reloadedTransport.submit('99999999-0000-4000-8000-000000000002', 'sha256:' + 'a'.repeat(64), 'uncertain send');
	await flush(6);
	expect(posted).toEqual(['99999999-0000-4000-8000-000000000001', '99999999-0000-4000-8000-000000000001']);
	expect(draftText(reloadedClient)).toEqual([]);
});

test('a snapshot with no verified identity when the draft is typed never persists it, even once it recovers by reload', async () => {
	const [client, transport] = boot;
	stubEmptyRoom(0); // No instance arg: the snapshot response carries no x-agora-instance header.
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'lost to the outage' });
	transport.saveDraft(roomId, 'lost to the outage');
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(0, 'launch-a'); // The route is back, but nothing was ever saved to restore.
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual([]);
});

test('a reload snapshot with no verified identity fails closed on a draft saved under a verified instance', async () => {
	const [client, transport] = boot;
	stubEmptyRoom(0, 'launch-a');
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'saved while healthy' });
	transport.saveDraft(roomId, 'saved while healthy');
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(0); // No header on this reload's snapshot; the saved instance can't be verified, so it fails closed.
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual([]);
});

test('a malformed or empty identity header counts as no verified instance, so a saved draft is not restored', async () => {
	const [client, transport] = boot;
	stubEmptyRoom(0, 'launch-a');
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'saved while healthy' });
	transport.saveDraft(roomId, 'saved while healthy');
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(0, '   '); // Trims to empty.
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual([]);
});

test('a pending command id from before the reload is not reused once the reload snapshot carries no verified instance', async () => {
	const [client, transport] = boot;
	vi.stubGlobal('fetch', vi.fn((url: string): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, []), 200, 'launch-a'));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) return new Promise(() => undefined); // Never settles before reload.
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'uncertain send' });
	transport.saveDraft(roomId, 'uncertain send');
	transport.submit('88888888-0000-4000-8000-000000000001', 'sha256:' + 'a'.repeat(64), 'uncertain send');
	await flush(4);
	const posted: string[] = [];
	const [reloadedClient, reloadedTransport] = reopen();
	// The reload's own snapshot response comes back with no x-agora-instance header at all: a down or stripped
	// identity is now indistinguishable from a reset, since both are read off this one response.
	vi.stubGlobal('fetch', vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) {
			const command = JSON.parse(init?.body ?? '{}') as { command_id: string };
			posted.push(command.command_id);
			return Promise.resolve(receiptFor(command.command_id));
		}
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	reloadedTransport.loadSnapshot();
	await flush(6);
	// Without a verified instance to compare against, the saved pending id from before the reload is not trusted, so
	// the draft is not restored either: a fresh Send mints its own new command id instead of replaying the old one.
	expect(draftText(reloadedClient)).toEqual([]);
	reloadedClient.apply({ type: 'draft', streamId: roomId, text: 'uncertain send' });
	reloadedTransport.submit('88888888-0000-4000-8000-000000000002', 'sha256:' + 'a'.repeat(64), 'uncertain send');
	await flush(6);
	expect(posted).toEqual(['88888888-0000-4000-8000-000000000002']);
});

test('draft identity is read off the snapshot response itself, not a second request a reset could race between', async () => {
	// Regresses the exact race a review found: fetching identity and the snapshot as two separate requests let a
	// reset that lands between them attach the OLD instance to the NEW room's cursor-0 snapshot, restoring stale
	// text. This asserts the fix's structural guarantee directly: exactly one request per resync ever carries
	// instance data, so there is no second, race-prone request left for a reset to land inside.
	const [client, transport] = boot;
	const calls: string[] = [];
	vi.stubGlobal('fetch', vi.fn((url: string): Promise<Response> => {
		calls.push(url);
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, []), 200, 'launch-a'));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'atomic' });
	transport.saveDraft(roomId, 'atomic');
	expect(calls.some((c) => c.endsWith('/_runtime/identity'))).toBe(false);
	const [reloadedClient, reloadedTransport] = reopen();
	stubEmptyRoom(0, 'launch-a');
	reloadedTransport.loadSnapshot();
	await flush(6);
	expect(draftText(reloadedClient)).toEqual(['atomic']);
});
