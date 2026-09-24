import { AgoraProvider, createRoomClient, type RoomClient } from '@agora/web-framework';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/components/App.tsx';
import { FixtureControls } from '../src/components/FixtureControls.tsx';
import { createBrowserEnvironment, createFixtureTransport, load, type FixtureTransport } from '../src/host/index.ts';
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
	expect(status()).toHaveTextContent('1 new message.');
	for (const relative of ['src/components/App.tsx', 'src/components/FixtureControls.tsx']) {
		expect(readFileSync(resolve(import.meta.dirname, '..', relative), 'utf8').includes('createRoomClient')).toBe(false);
	}
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
