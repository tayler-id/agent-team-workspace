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
afterEach(() => { boot[1].disconnect(); vi.unstubAllGlobals(); }); // Stops each test's poll loop so it cannot leak stray fetches into the next test.
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
function stubMessages(respond: (commandId: string, attempt: number) => Response | Promise<Response>): string[] {
	const posted: string[] = [];
	vi.stubGlobal('fetch', vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
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
	reopened.disconnect(); // Its own poll loop would otherwise keep hitting whatever fetch mock later tests install.
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
	// The permanent outcome is client-core's own settled command state, carrying the real reason, not just the transient decision string.
	const denied = client.getState().commands.find((c) => c.commandId === '44444444-0000-4000-8000-000000000001');
	expect(denied?.tag).toBe('denied');
	expect(denied?.tag === 'denied' && denied.reason).toContain(shown);
	expect(transport.getState().sendPhase).toEqual({}); // A settled command carries no transient transport phase; its own tag is authoritative.
});

test('a live send reports sending then retrying transport phases while the command is still pending, and discard removes only a denied one', async () => {
	const [client, transport] = boot;
	let attempts = 0;
	const fetchMock = vi.fn((url: string): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) { attempts += 1; return Promise.reject(new TypeError('Failed to fetch')); }
		return Promise.reject(new Error(`unexpected request ${url}`));
	});
	vi.stubGlobal('fetch', fetchMock);
	transport.loadSnapshot();
	await flush(6);
	transport.submit('55555555-0000-4000-8000-000000000001', 'sha256:' + 'a'.repeat(64), 'watch the phase');
	expect(transport.getState().sendPhase).toEqual({ '55555555-0000-4000-8000-000000000001': 'sending' });
	await flush(4);
	expect(attempts).toBeGreaterThan(0);
	expect(transport.getState().sendPhase).toEqual({ '55555555-0000-4000-8000-000000000001': 'retrying' });
	expect(client.getState().commands.find((c) => c.commandId === '55555555-0000-4000-8000-000000000001')?.tag).toBe('pending');
	expect(client.apply({ type: 'discard', commandId: '55555555-0000-4000-8000-000000000001' }).state.commands).toHaveLength(1); // Still pending: discard is a no-op, never a quiet cancel.
});

test('two commands submitted while genuinely offline each keep their own identity; reconnecting sends both', async () => {
	const [client, transport] = boot;
	const fetchMock = vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) { const command = JSON.parse(init?.body ?? '{}') as { command_id: string }; return Promise.resolve(receiptFor(command.command_id)); }
		return Promise.reject(new Error(`unexpected request ${url}`));
	});
	vi.stubGlobal('fetch', fetchMock);
	transport.loadSnapshot();
	await flush(6);
	Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
	const first = '88888888-0000-4000-8000-000000000001', second = '88888888-0000-4000-8000-000000000002';
	transport.submit(first, 'sha256:' + 'a'.repeat(64), 'first offline send');
	transport.submit(second, 'sha256:' + 'b'.repeat(64), 'second offline send');
	// Neither offline send is dropped or overwritten by the other; both are tracked with their own identity.
	expect(client.getState().commands.map((c) => c.commandId)).toEqual([first, second]);
	expect(client.getState().commands.every((c) => c.tag === 'pending')).toBe(true);
	expect(transport.getState().sendPhase).toEqual({ [first]: 'waiting_connection', [second]: 'waiting_connection' });
	Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
	window.dispatchEvent(new Event('online'));
	await flush(6);
	expect(client.getState().commands.map((c) => c.tag)).toEqual(['received', 'received']);
	expect(transport.getState().sendPhase).toEqual({});
});

function hangingFetch(onMessagesSignal: (signal: AbortSignal | undefined) => void): { fetchMock: (url: string, init?: { readonly signal?: AbortSignal }) => Promise<Response>; resolveEvents: (events: readonly Record<string, unknown>[]) => void } {
	let resolveEvents: ((body: readonly Record<string, unknown>[]) => void) | undefined;
	const fetchMock = vi.fn((url: string, init?: { readonly signal?: AbortSignal }): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) {
			return new Promise<Response>((resolve, reject) => {
				resolveEvents = (body) => { resolve(json(body)); };
				init?.signal?.addEventListener('abort', () => { reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); });
			});
		}
		if (url.endsWith('/api/v1/local-room/messages')) {
			onMessagesSignal(init?.signal);
			return new Promise<Response>((_resolve, reject) => { init?.signal?.addEventListener('abort', () => { reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); }); });
		}
		return Promise.reject(new Error(`unexpected request ${url}`));
	});
	return { fetchMock, resolveEvents: (events) => resolveEvents?.(events) };
}

test('disconnect cancels the in-flight poll; reconnect resumes from the applied cursor without duplicates', async () => {
	const [client, transport] = boot;
	let eventsSignal: AbortSignal | undefined;
	const { fetchMock } = hangingFetch(() => undefined);
	vi.stubGlobal('fetch', vi.fn((url: string, init?: { readonly signal?: AbortSignal }) => {
		if (url.includes('/api/v1/local-room/events?after=')) eventsSignal = init?.signal;
		return fetchMock(url, init);
	}));
	transport.loadSnapshot();
	await flush(6);
	expect(eventsSignal?.aborted).toBe(false);
	transport.disconnect();
	expect(transport.getState().link).toBe('disconnected');
	expect(eventsSignal?.aborted).toBe(true);
	vi.stubGlobal('fetch', vi.fn((url: string): Promise<Response> => {
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([event(1, message(1, 'after reconnect'))]));
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	transport.reconnect();
	expect(transport.getState().link).not.toBe('disconnected');
	await flush(6);
	expect(room()?.messages.map((m) => m.content)).toEqual([{ tag: 'visible', body: 'after reconnect' }]);
	// A duplicate delivery of the already-applied event must not insert a second row.
	client.apply({ type: 'event', streamId: roomId, seq: '1', change: { type: 'message', message: { id: messageId(1), createdSeq: '1', revision: '1', content: { tag: 'visible', body: 'after reconnect' } } } });
	expect(room()?.messages).toHaveLength(1);
});

test('disconnect cancels an in-flight command retry without settling it; reconnect resumes and settles the same command', async () => {
	const [client, transport] = boot;
	let messagesSignal: AbortSignal | undefined;
	const { fetchMock, resolveEvents } = hangingFetch((signal) => { messagesSignal = signal; });
	vi.stubGlobal('fetch', fetchMock);
	transport.loadSnapshot();
	await flush(6);
	resolveEvents([]);
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'held by disconnect' });
	transport.submit('66666666-0000-4000-8000-000000000001', 'sha256:' + 'a'.repeat(64), 'held by disconnect');
	await flush(4);
	expect(messagesSignal?.aborted).toBe(false);
	transport.disconnect();
	await flush(4);
	expect(messagesSignal?.aborted).toBe(true);
	expect(client.getState().commands.find((c) => c.commandId === '66666666-0000-4000-8000-000000000001')?.tag).toBe('pending');
	vi.stubGlobal('fetch', vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) { const command = JSON.parse(init?.body ?? '{}') as { command_id: string }; return Promise.resolve(receiptFor(command.command_id)); }
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	transport.reconnect();
	await flush(6);
	expect(client.getState().commands.find((c) => c.commandId === '66666666-0000-4000-8000-000000000001')?.tag).toBe('received');
	expect(client.getState().drafts).toEqual([]);
});

test('a browser offline event, not a fabricated heartbeat, distinguishes offline from a live retry backoff', async () => {
	const [, transport] = boot;
	Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
	let attempts = 0;
	vi.stubGlobal('fetch', vi.fn((url: string): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) { attempts += 1; return Promise.reject(new TypeError('Failed to fetch')); }
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	transport.loadSnapshot();
	await flush(4);
	expect(transport.getState().link).toBe('retrying');
	Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
	window.dispatchEvent(new Event('offline'));
	expect(transport.getState().link).toBe('offline');
	expect(transport.getState().online).toBe(false);
	await flush(4);
	expect(transport.getState().link).toBe('offline'); // The next poll failure reclassifies from navigator.onLine, not a synthetic ping.
	Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
	window.dispatchEvent(new Event('online'));
	expect(transport.getState().online).toBe(true);
	expect(attempts).toBeGreaterThan(0);
});

test('a browser online event does not claim link: online until a poll actually succeeds', async () => {
	const client = createRoomClient();
	const transport = createLiveTransport(client, { baseUrl: 'http://local-room.invalid', pollDelayMs: 0, errorDelayMs: 0 });
	Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
	let fail = true;
	vi.stubGlobal('fetch', vi.fn((url: string): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) return fail ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve(json([]));
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	transport.loadSnapshot();
	await flush(4);
	expect(transport.getState().link).toBe('retrying'); // Still failing: no fetch has confirmed a live connection yet.
	window.dispatchEvent(new Event('online'));
	// The 'online' event is only network reachability, not an observed read; the still-failing poll must not be masked as connected.
	expect(transport.getState().link).toBe('retrying');
	expect(transport.getState().link).not.toBe('online');
	fail = false;
	await flush(4);
	expect(transport.getState().link).toBe('online'); // Only the poll loop's own successful read sets 'online'.
	transport.disconnect();
});

test('disconnect cancels a queued retry backoff; reconnect resumes the exact same command identity', async () => {
	const client = createRoomClient();
	const transport = createLiveTransport(client, { baseUrl: 'http://local-room.invalid', pollDelayMs: 0, retryDelayMs: 50 });
	const posted: string[] = [];
	let attempts = 0;
	vi.stubGlobal('fetch', vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) return Promise.resolve(json([]));
		if (url.endsWith('/api/v1/local-room/messages')) {
			attempts += 1;
			const command = JSON.parse(init?.body ?? '{}') as { command_id: string };
			posted.push(command.command_id);
			return attempts === 1 ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve(receiptFor(command.command_id));
		}
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	transport.loadSnapshot();
	await flush(6);
	client.apply({ type: 'draft', streamId: roomId, text: 'queued retry' });
	transport.submit('77777777-0000-4000-8000-000000000001', 'sha256:' + 'a'.repeat(64), 'queued retry');
	await flush(3); // Lets the first rejection classify and enter the retryDelayMs backoff, well before its 50 ms timer fires.
	expect(attempts).toBe(1);
	transport.disconnect(); // Cancels while the retry sits in its backoff sleep, not mid-fetch: a distinct race from the in-flight-fetch case above.
	await new Promise((resolve) => { setTimeout(resolve, 90); }); // Let the queued 50 ms backoff elapse; the disconnected generation must stand down instead of resending.
	expect(attempts).toBe(1);
	expect(client.getState().commands.find((c) => c.commandId === '77777777-0000-4000-8000-000000000001')?.tag).toBe('pending');
	transport.reconnect();
	await flush(6);
	expect(posted).toEqual(['77777777-0000-4000-8000-000000000001', '77777777-0000-4000-8000-000000000001']); // Same identity resumed, not a new command.
	expect(client.getState().commands.find((c) => c.commandId === '77777777-0000-4000-8000-000000000001')?.tag).toBe('received');
	transport.disconnect();
});

test('a snapshot response that arrives after Disconnect is discarded instead of mutating committed state', async () => {
	const client = createRoomClient();
	const transport = createLiveTransport(client, { baseUrl: 'http://local-room.invalid', pollDelayMs: 0 });
	let resolveSnapshot: ((response: Response) => void) | undefined;
	vi.stubGlobal('fetch', vi.fn((url: string): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return new Promise<Response>((resolve) => { resolveSnapshot = resolve; });
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	transport.loadSnapshot();
	await flush(2);
	transport.disconnect(); // Bumps the generation while the snapshot fetch is still outstanding.
	expect(transport.getState().link).toBe('disconnected');
	// The underlying fetch is not hooked to the AbortController in this mock, mirroring the real race where a
	// response already arrived on the wire before the abort actually cancelled it.
	resolveSnapshot?.(json(snapshot(1, [message(1, 'late arrival')])));
	await flush(4);
	expect(client.getState().rooms).toHaveLength(0); // The late snapshot must not apply after Disconnect.
	expect(transport.getState().link).toBe('disconnected');
});

test('an events response that arrives after Disconnect is discarded instead of mutating committed state', async () => {
	const client = createRoomClient();
	const transport = createLiveTransport(client, { baseUrl: 'http://local-room.invalid', pollDelayMs: 0 });
	let resolveEvents: ((response: Response) => void) | undefined;
	vi.stubGlobal('fetch', vi.fn((url: string): Promise<Response> => {
		if (url.endsWith('/api/v1/local-room/snapshot')) return Promise.resolve(json(snapshot(0, [])));
		if (url.includes('/api/v1/local-room/events?after=')) return new Promise<Response>((resolve) => { resolveEvents = resolve; });
		return Promise.reject(new Error(`unexpected request ${url}`));
	}));
	transport.loadSnapshot();
	await flush(4); // Lets the initial snapshot land and the poll loop move on to its first events fetch.
	expect(resolveEvents).toBeDefined();
	transport.disconnect(); // Bumps the generation while the events fetch is still outstanding.
	expect(transport.getState().link).toBe('disconnected');
	// The underlying fetch is not hooked to the AbortController in this mock, mirroring the real race where a
	// response already arrived on the wire before the abort actually cancelled it.
	resolveEvents?.(json([event(1, message(1, 'late arrival'))]));
	await flush(4);
	expect(client.getState().rooms.find((r) => r.streamId === roomId)?.cursor).toBe('0'); // The late event must not advance the cursor after Disconnect.
	expect(transport.getState().link).toBe('disconnected');
});
