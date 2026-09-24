import { AgoraProvider, createRoomClient, type RoomClient } from '@agora/web-framework';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useSyncExternalStore, type ReactElement } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/components/App.tsx';
import { FixtureControls } from '../src/components/FixtureControls.tsx';
import { createBrowserEnvironment, createFixtureTransport, createLiveTransport, load, type FixtureTransport, type LiveTransport } from '../src/host/index.ts';
import room from '../src/fixture/room.json' with { type: 'json' };
import { installGeometry } from './geometry.ts';

const loaded = load(room);
if (!loaded.ok) throw new Error(loaded.error);
const fixture = loaded.fixture;
const digest = (text: string): Promise<string> => Promise.resolve(`sha256:${text.length.toString(16).padStart(64, '0')}`);
const id = (n: number): string => `0f1c1e5e-0000-4000-8000-${String(n).padStart(12, '0')}`;
let phone = false;
const listeners = new Set<() => void>();
beforeEach(() => {
	installGeometry();
	window.matchMedia = (query: string): MediaQueryList => ({ matches: phone && query.includes('700px'), media: query, onchange: null, addEventListener: (_: string, l: unknown) => { listeners.add(l as () => void); }, removeEventListener: (_: string, l: unknown) => { listeners.delete(l as () => void); }, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => true } as MediaQueryList);
});
const setPhone = (value: boolean): void => { phone = value; act(() => { for (const l of listeners) l(); }); };
afterEach(() => { cleanup(); phone = false; vi.useRealTimers(); });
declare module 'vitest' { interface Assertion { toHaveTextContent: (expected: string) => void } }
expect.extend({ toHaveTextContent(received: unknown, expected: string) { const text = received instanceof Element ? received.textContent : ''; return { pass: text.includes(expected), message: () => `expected ${JSON.stringify(text)} to include ${JSON.stringify(expected)}` }; } });

function mount(): { client: RoomClient; transport: FixtureTransport } {
	const client = createRoomClient();
	const transport = createFixtureTransport(client, fixture);
	render(<AgoraProvider client={client} environment={createBrowserEnvironment(transport, { digestText: digest })}><App header={fixture.header} presentation={fixture.presentation} /><FixtureControls transport={transport} /></AgoraProvider>);
	return { client, transport };
}
const status = (): HTMLElement => screen.getByRole('status');
const press = (el: Element, key: string): void => { fireEvent.keyDown(el, { key }); };
const active = (): HTMLElement => { const el = document.activeElement; if (!(el instanceof HTMLElement)) throw new Error('no focus'); return el; };

test('phases, isolation, draft/submit/revoke and phone viewport', async () => {
	const { client, transport } = mount();
	expect(status().dataset['phase']).toBe('empty');
	fireEvent.click(screen.getByRole('button', { name: 'Load fixture snapshot' }));
	expect(status().dataset['phase']).toBe('live');
	expect(screen.getByRole('list', { name: 'Messages, 8 total' })).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
	expect(status().dataset['link']).toBe('disconnected');
	expect(screen.getByText(/Disconnected: a send waits for Reconnect/)).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
	expect(status().dataset['link']).toBe('online');
	const before = screen.getAllByRole('listitem').map((li) => li.dataset['commits']);
	act(() => { transport.setOnline(false); });
	expect(status()).toHaveTextContent('Offline.');
	expect(screen.getAllByRole('listitem').map((li) => li.dataset['commits'])).toEqual(before);
	act(() => { transport.setOnline(true); transport.skipOne(); });
	expect(status().dataset['phase']).toBe('gap');
	act(() => { transport.fillGap(); transport.resync(); });
	expect(status().dataset['phase']).toBe('resync');
	fireEvent.click(screen.getByRole('button', { name: 'Load fresh snapshot' }));
	act(() => { transport.unsupported(); });
	expect(status().dataset['phase']).toBe('upgrade');
	act(() => { transport.loadInvalidSnapshot(); });
	expect(screen.getByRole('alert')).toHaveTextContent('snapshot rejected: snapshot');
	const box = screen.getByRole('textbox', { name: /Message/ });
	fireEvent.change(box, { target: { value: 'keep me' } });
	act(() => { transport.loadSnapshot(); });
	expect(box).toHaveProperty('value', 'keep me');
	fireEvent.keyDown(box, { key: 'Enter' });
	await act(async () => { await Promise.resolve(); await Promise.resolve(); });
	expect(screen.getByText(/1 pending command awaiting a receipt/)).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Fail send: rate limited' }));
	expect(screen.getByText(/Last core decision: wait_retry_after 30s/)).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Deliver fixture receipt' }));
	expect(box).toHaveProperty('value', '');
	fireEvent.change(box, { target: { value: 'private' } });
	fireEvent.click(screen.getByRole('button', { name: 'Revoke access' }));
	expect(client.getState().drafts).toEqual([]);
	expect(status().dataset['phase']).toBe('revoked');
	setPhone(true);
	expect(screen.getByRole('main').parentElement?.dataset['viewport']).toBe('phone');
});

test('keyboard roving, virtualized large rooms, citations, announcement and no alternate client', async () => {
	const { transport } = mount();
	act(() => { transport.loadSnapshot(); });
	const items = screen.getAllByRole('article');
	items[7]?.focus();
	press(active(), 'ArrowUp');
	expect(active().dataset['messageId']).toBe(id(107));
	press(active(), 'Home');
	expect(active().dataset['messageId']).toBe(id(101));
	press(active(), 'End');
	expect(active().dataset['messageId']).toBe(id(108));
	act(() => { transport.loadLargeRoom(400); });
	const list = screen.getByRole('list', { name: 'Messages, 400 total' });
	expect(list.getAttribute('data-total')).toBe('400');
	expect(screen.getAllByRole('listitem').length).toBeLessThan(400);
	act(() => { transport.revoke(); transport.loadSnapshot(); });
	const [citation] = within(screen.getByRole('article', { name: /^Local room agent,/ })).getAllByRole('button', { name: 'Cited: Ada' });
	if (!citation) throw new Error('missing citation');
	fireEvent.click(citation);
	await act(async () => { await new Promise((r) => { setTimeout(r, 0); }); });
	expect((document.activeElement as HTMLElement | null)?.dataset['messageId']).toBe(id(101));
	cleanup();
	vi.useFakeTimers();
	const again = mount();
	act(() => { again.transport.loadSnapshot(); });
	act(() => { again.transport.replayNext(); });
	act(() => { vi.advanceTimersByTime(2000); });
	expect(status()).toHaveTextContent('1 new message, 3 unread.');
	expect(screen.getByRole('banner')).toHaveTextContent('3 unread');
	for (const relative of ['src/components/App.tsx', 'src/components/FixtureControls.tsx']) {
		expect(readFileSync(resolve(import.meta.dirname, '..', relative), 'utf8').includes('createRoomClient')).toBe(false);
	}
});

test('every button in the phone shell has at least a 44x44 CSS px touch target; desktop sizing is unchanged', () => {
	const sheet = document.createElement('style');
	sheet.textContent = readFileSync(resolve(import.meta.dirname, '..', 'src/fixture.css'), 'utf8');
	document.head.append(sheet);
	try {
		const { transport } = mount();
		act(() => { transport.loadSnapshot(); });
		const size = (name: string): readonly string[] => { const [button] = screen.getAllByRole('button', { name }); if (!button) throw new Error(`missing ${name}`); const style = getComputedStyle(button); return [style.minWidth, style.minHeight]; };
		expect(size('Send')).toEqual(['88px', '40px']);
		setPhone(true);
		expect([size('Send'), size('Mark room as read')]).toEqual([['88px', '44px'], ['44px', '44px']]);
	} finally { sheet.remove(); }
});

test('the live route labels itself as the local development room, with no fixture wording', () => {
	const client = createRoomClient();
	const transport = createFixtureTransport(client, fixture);
	render(<AgoraProvider client={client} environment={createBrowserEnvironment(transport, { digestText: digest })}><App live header={{ project: 'Local project', room: 'Local room', lifecycle: 'active', agentLabel: 'Local agent', members: 1 }} presentation={fixture.presentation} /></AgoraProvider>);
	expect(screen.getByRole('banner')).toHaveTextContent('LOCAL DEVELOPMENT');
	expect(screen.getByRole('banner').textContent).toMatch(/1 member(?!s)/);
	expect(screen.getByRole('button', { name: 'Load room snapshot' })).toBeTruthy();
	expect(screen.getByRole('textbox')).toHaveProperty('maxLength', 4096);
	expect(document.body.textContent).not.toMatch(/fixture/i);
});

// A fake local-room server behind fetch: snapshot, strictly-after events and a send that commits the next sequence.
function liveServer(seeded: number): { readonly add: (body: string) => void } {
	const roomId = 'aaaaaaaa-0000-4000-8000-000000000001', scope = { project_id: 'bbbbbbbb-0000-4000-8000-000000000001', room_id: roomId };
	const uuid = (prefix: string, n: number): string => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;
	const messages: Record<string, unknown>[] = [];
	const add = (body: string): string => {
		const seq = messages.length + 1;
		messages.push({ schema_version: 'agora.local-room.message/v1', message_id: uuid('cccccccc', seq), scope, room_seq: String(seq), author: { kind: 'human', principal_id: uuid('dddddddd', 1) }, command_id: uuid('eeeeeeee', seq), body, citations: [], created_at: '2026-09-23T00:00:00.000Z' });
		return String(seq);
	};
	for (let n = 1; n <= seeded; n++) add(`seed ${n}`);
	const json = (body: unknown, status = 200): Promise<Response> => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
	vi.stubGlobal('fetch', (url: string, init?: { readonly body?: string }): Promise<Response> => {
		if (url.endsWith('/snapshot')) return json({ schema_version: 'agora.local-room.snapshot/v1', scope, cursor: { stream_id: roomId, committed_seq: String(messages.length) }, messages });
		const after = /events\?after=(\d+)/.exec(url)?.[1];
		if (after !== undefined) return json(messages.slice(Number(after)).map((payload) => ({ schema_version: 'agora.local-room.event/v1', stream_id: roomId, seq: payload['room_seq'], event_id: uuid('ffffffff', Number(payload['room_seq'])), kind: 'local_room.message_created', actor: uuid('dddddddd', 1), occurred_at: '2026-09-23T00:00:00.000Z', payload })));
		const command = JSON.parse(init?.body ?? '{}') as { command_id: string; body: string };
		const seq = add(command.body);
		return json({ schema_version: 'agora.local-room.receipt/v1', identity: { command_id: command.command_id, request_digest: 'sha256:' + 'a'.repeat(64) }, receipt: { command_id: command.command_id, aggregate_id: roomId, revision: seq, event_cursors: [{ stream_id: roomId, committed_seq: seq }], receipt_id: uuid('99999999', Number(seq)) }, message_id: uuid('cccccccc', Number(seq)), replayed: false }, 201);
	});
	return { add: (body) => { add(body); } };
}
function LiveRoot({ transport }: { readonly transport: LiveTransport }): ReactElement {
	const presentation = useSyncExternalStore(transport.subscribe, transport.getPresentation, transport.getPresentation);
	return <App live header={{ project: 'Local project', room: 'Local room', lifecycle: 'active', agentLabel: 'Local agent', members: 1 }} presentation={presentation} />;
}

test('live room: your own send is never unread or announced; arrivals from elsewhere are announced with the header count', async () => {
	vi.useFakeTimers();
	vi.stubGlobal('crypto', { randomUUID: () => '12345678-0000-4000-8000-000000000001', subtle: globalThis.crypto.subtle });
	const server = liveServer(4);
	const client = createRoomClient();
	const transport = createLiveTransport(client, { baseUrl: 'http://local-room.invalid', pollDelayMs: 10 });
	render(<AgoraProvider client={client} environment={createBrowserEnvironment(transport, { digestText: digest })}><LiveRoot transport={transport} /></AgoraProvider>);
	const wait = async (ms: number): Promise<void> => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
	const unread = (): string => screen.getByRole('banner').querySelector('span[data-unread]')?.textContent ?? '';
	act(() => { transport.loadSnapshot(); });
	await wait(2100);
	expect([unread(), screen.getAllByRole('article').length]).toEqual(['0 unread', 4]);
	expect(status().textContent).not.toMatch(/new message/);

	const box = screen.getByRole('textbox', { name: /Message/ });
	fireEvent.change(box, { target: { value: 'my own message' } });
	fireEvent.keyDown(box, { key: 'Enter' });
	await wait(2100);
	expect([unread(), screen.getAllByRole('article').length]).toEqual(['0 unread', 5]);
	expect(screen.queryByRole('separator', { name: 'Unread messages start here' })).toBeNull();
	expect(screen.queryByRole('button', { name: 'Mark room as read' })).toBeNull();
	expect(status().textContent).not.toMatch(/new message/);

	server.add('from another tab');
	await wait(100);
	expect(unread()).toBe('1 unread');
	expect(status().textContent).not.toMatch(/new message/);
	await wait(2000);
	expect(status()).toHaveTextContent('1 new message, 1 unread.');
	server.add('from another tab again');
	await wait(100);
	expect([unread(), status().textContent]).toEqual(['2 unread', expect.not.stringMatching(/new message/)]);
	await wait(2000);
	expect([unread(), /\d+ new messages?, \d+ unread\./.exec(status().textContent)?.[0]]).toEqual(['2 unread', '1 new message, 2 unread.']);

	fireEvent.click(screen.getByRole('button', { name: 'Mark room as read' }));
	expect(unread()).toBe('0 unread');
	expect(status().textContent).not.toMatch(/new message/);
	server.add('burst one');
	await wait(500);
	server.add('burst two');
	await wait(2100);
	expect(status()).toHaveTextContent('2 new messages, 2 unread.');
});
