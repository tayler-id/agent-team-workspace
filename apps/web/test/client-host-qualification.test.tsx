// U22.B01 lanes 5 and 8 over the already-built hooks: a command through useRoomCommands and its receipt, and no transport
// subscription outliving the component that opened it. Lane 7 (compile negatives) is packages/web-framework/test/host-calls.test.ts.
import { createWireValidator } from '@agora/contracts';
import { AgoraProvider, createRoomClient, useRoomCommands, useTransportState, type EnvironmentPort, type RoomTransport, type TransportConnection } from '@agora/web-framework';
import { act, cleanup, render } from '@testing-library/react';
import { useEffect, useSyncExternalStore, type ReactElement } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createBrowserEnvironment, createLiveTransport } from '../src/host/index.ts';

const roomId = 'aaaaaaaa-0000-4000-8000-000000000001', projectId = 'bbbbbbbb-0000-4000-8000-000000000001';
const scope = { project_id: projectId, room_id: roomId };
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-agora-instance': 'launch-a' } });
const snapshot = { schema_version: 'agora.local-room.snapshot/v1', scope, cursor: { stream_id: roomId, committed_seq: '0' }, messages: [] };
const receiptBody = (commandId: string): Record<string, unknown> => ({ schema_version: 'agora.local-room.receipt/v1', identity: { command_id: commandId, request_digest: `sha256:${'e'.repeat(64)}` }, receipt: { command_id: commandId, aggregate_id: roomId, revision: '1', event_cursors: [{ stream_id: roomId, committed_seq: '1' }], receipt_id: 'cccccccc-0000-4000-8000-000000000503' }, message_id: 'cccccccc-0000-4000-8000-000000000004', replayed: false });
const flush = async (times = 8): Promise<void> => { for (let i = 0; i < times; i++) await act(() => new Promise<void>((resolve) => { setTimeout(resolve, 0); })); };

beforeEach(() => {
	const store = new Map<string, string>();
	vi.stubGlobal('sessionStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function stubRoom(respond: (commandId: string) => unknown, sent: string[], received: unknown[]): void {
	vi.stubGlobal('fetch', vi.fn((url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/snapshot')) return Promise.resolve(json(snapshot));
		if (url.includes('/events?after=')) return Promise.resolve(json([]));
		const command = JSON.parse(init?.body ?? '{}') as { command_id: string };
		sent.push(command.command_id);
		const body = respond(command.command_id);
		received.push(body);
		return Promise.resolve(json(body, 201));
	}));
}

async function sendThroughHook(respond: (commandId: string) => unknown): Promise<{ sent: string[]; received: unknown[]; client: ReturnType<typeof createRoomClient>; transport: ReturnType<typeof createLiveTransport> }> {
	const sent: string[] = [], received: unknown[] = [];
	stubRoom(respond, sent, received);
	const client = createRoomClient();
	const transport = createLiveTransport(client, { baseUrl: 'http://local-room.invalid', pollDelayMs: 0, retryDelayMs: 0 });
	const environment = createBrowserEnvironment(transport, { digestText: () => Promise.resolve(`sha256:${'e'.repeat(64)}`) });
	let commands: ReturnType<typeof useRoomCommands> | undefined;
	const Consumer = (): ReactElement => { commands = useRoomCommands(); return <span />; };
	render(<AgoraProvider client={client} environment={{ ...environment, createId: () => 'dddddddd-0000-4000-8000-000000000001' }}><Consumer /></AgoraProvider>);
	act(() => { commands?.loadSnapshot(); });
	await flush();
	await act(async () => { await commands?.submit('hello'); });
	await flush();
	transport.disconnect();
	return { sent, received, client, transport };
}

test('lane 5: a command sent through useRoomCommands settles on a receipt the generated validator accepts', async () => {
	const { sent, received, client } = await sendThroughHook(receiptBody);
	expect(sent).toEqual(['dddddddd-0000-4000-8000-000000000001']);
	const verdict = createWireValidator().validate('RoomCommandReceipt', received[0]);
	expect(verdict.ok ? 'ok' : verdict.details).toBe('ok');
	const command = client.getState().commands[0];
	expect(command?.tag).toBe('received');
	// Local shape only: this proves the published schema and the client's acceptance, not production R07 atomic commit.
	expect(command?.tag === 'received' && command.receipt.event_cursors).toEqual([{ stream_id: roomId, committed_seq: '1' }]);
});

test('lane 5 negative: a receipt missing required R07 fields is denied by the validator and by the client', async () => {
	const broken = (id: string): unknown => Object.fromEntries(Object.entries(receiptBody(id)).filter(([key]) => key !== 'receipt'));
	const { received, client } = await sendThroughHook(broken);
	const verdict = createWireValidator().validate('RoomCommandReceipt', received[0]);
	expect(verdict.ok).toBe(false);
	expect(client.getState().commands[0]?.tag).toBe('denied');
});

function countingTransport(): { transport: RoomTransport; open: () => number } {
	const listeners = new Set<() => void>();
	const state: TransportConnection = { online: true, phase: 'idle', error: undefined, decision: undefined, link: 'online', sendPhase: {} };
	const noop = (): void => undefined;
	return { open: () => listeners.size, transport: { streamId: 's', getState: () => state, subscribe: (l) => { listeners.add(l); return () => { listeners.delete(l); }; }, loadSnapshot: noop, submit: noop, markSeen: noop, disconnect: noop, reconnect: noop, saveDraft: noop } };
}
const environmentFor = (transport: RoomTransport): EnvironmentPort => ({ ...createBrowserEnvironment(transport), subscribeMediaQuery: () => () => undefined });

function mountMany(transport: RoomTransport, Consumer: () => ReactElement, times: number): void {
	const client = createRoomClient(), environment = environmentFor(transport);
	for (let i = 0; i < times; i++) render(<AgoraProvider client={client} environment={environment}><Consumer /></AgoraProvider>).unmount();
}

test('lane 8: 200 mounts and unmounts of a transport-subscribed hook consumer leave zero transport subscriptions', () => {
	const { transport, open } = countingTransport();
	const Consumer = (): ReactElement => { useTransportState(); return <span />; };
	const client = createRoomClient(), environment = environmentFor(transport);
	const held = render(<AgoraProvider client={client} environment={environment}><Consumer /></AgoraProvider>);
	expect(open()).toBe(1);
	held.unmount();
	mountMany(transport, Consumer, 200);
	expect(open()).toBe(0);
});

test('lane 8 counterfactual: a consumer that drops its unsubscribe leaks one subscription per mount', () => {
	const { transport, open } = countingTransport();
	const Leaky = (): ReactElement => { useEffect(() => { transport.subscribe(() => undefined); }, []); useSyncExternalStore(() => () => undefined, () => 0); return <span />; };
	mountMany(transport, Leaky, 200);
	expect(open()).toBe(200);
});
