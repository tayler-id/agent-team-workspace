import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { App } from '../src/components/App.tsx';
import { FixtureControls } from '../src/components/FixtureControls.tsx';
import { load } from '../src/fixture/adapter.ts';
import { createFixtureTransport, type FixtureTransport } from '../src/fixture/fixtureTransport.ts';
import { createStore, type Store } from '../src/store.ts';
import room from '../src/fixture/room.json' with { type: 'json' };

const loaded = load(room);
if (!loaded.ok) throw new Error(loaded.error);
const fixture = loaded.fixture;
const digest = (text: string): Promise<string> => Promise.resolve(`sha256:${text.length.toString(16).padStart(64, '0')}`);
const id = (n: number): string => `0f1c1e5e-0000-4000-8000-${String(n).padStart(12, '0')}`;
let phone = false;
const listeners = new Set<() => void>();
window.matchMedia = (query: string): MediaQueryList => ({ matches: phone && query.includes('700px'), media: query, onchange: null, addEventListener: (_: string, l: unknown) => { listeners.add(l as () => void); }, removeEventListener: (_: string, l: unknown) => { listeners.delete(l as () => void); }, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => true } as MediaQueryList);
const setPhone = (value: boolean): void => { phone = value; act(() => { for (const l of listeners) l(); }); };
afterEach(() => { cleanup(); phone = false; vi.useRealTimers(); });
declare module 'vitest' { interface Assertion { toHaveTextContent: (expected: string) => void } }
expect.extend({ toHaveTextContent(received: unknown, expected: string) { const text = received instanceof Element ? received.textContent : ''; return { pass: text.includes(expected), message: () => `expected element text ${JSON.stringify(text)} to include ${JSON.stringify(expected)}` }; } });

function mount(): { store: Store; transport: FixtureTransport } {
	const store = createStore();
	const transport = createFixtureTransport(store, fixture);
	render(<>
		<App store={store} port={transport} header={fixture.header} presentation={fixture.presentation} digest={digest} />
		<FixtureControls store={store} transport={transport} />
	</>);
	return { store, transport };
}
const status = (): HTMLElement => screen.getByRole('status');
const press = (element: Element, key: string): void => { fireEvent.keyDown(element, { key }); };

test('empty, loading, live, gap, resync, upgrade, error and revoked states are named in landmarks the reader can reach', () => {
	const { transport } = mount();
	expect(screen.getByRole('banner')).toHaveTextContent('Engineering fixture - visual design pending');
	expect(screen.getByRole('main')).toBeTruthy();
	expect(status().dataset['phase']).toBe('empty');
	expect(screen.getByRole('heading', { name: 'No room loaded' })).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Load fixture snapshot' }));
	expect(status().dataset['phase']).toBe('live');
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Agora local room fixture · General room');
	expect(screen.getByRole('banner')).toHaveTextContent('3 members');
	expect(screen.getByRole('banner')).toHaveTextContent('2 unread');
	expect(screen.getByRole('list', { name: 'Messages, 8 total' })).toBeTruthy();
	expect(screen.getByRole('separator', { name: 'Unread messages start here' })).toBeTruthy();
	expect(screen.getByText('Deleted message (tombstone, revision 2)')).toBeTruthy();
	expect(screen.getByText('edited (revision 2)')).toBeTruthy();
	act(() => { transport.skipOne(); });
	expect(status().dataset['phase']).toBe('gap');
	expect(status()).toHaveTextContent('1 buffered after cursor 8; replay requested.');
	act(() => { transport.fillGap(); });
	expect(status().dataset['phase']).toBe('live');
	act(() => { transport.resync(); });
	expect(status().dataset['phase']).toBe('resync');
	fireEvent.click(screen.getByRole('button', { name: 'Load fresh snapshot' }));
	expect(status().dataset['phase']).toBe('live');
	act(() => { transport.unsupported(); });
	expect(status().dataset['phase']).toBe('upgrade');
	act(() => { transport.loadInvalidSnapshot(); });
	expect(screen.getByRole('alert')).toHaveTextContent('snapshot rejected: snapshot');
	fireEvent.click(screen.getByRole('button', { name: 'Revoke access' }));
	expect(status().dataset['phase']).toBe('revoked');
	expect(screen.getByRole('heading', { name: 'Access revoked' })).toBeTruthy();
	expect(screen.getByRole('textbox', { name: /Message/ })).toHaveProperty('disabled', true);
});

test('keyboard flow: arrow keys rove across message rows in a predictable order', () => {
	const { transport } = mount();
	act(() => { transport.loadSnapshot(); });
	const items = screen.getAllByRole('article');
	expect(items).toHaveLength(8);
	expect(items.map((r) => r.tabIndex)).toEqual([...Array<number>(7).fill(-1), 0]);
	const active = (): HTMLElement => { const element = document.activeElement; if (!(element instanceof HTMLElement)) throw new Error('nothing focused'); return element; };
	items[7]?.focus();
	press(active(), 'ArrowUp');
	expect(active().dataset['messageId']).toBe(id(107));
	press(active(), 'Home');
	expect(active().dataset['messageId']).toBe(id(101));
	press(active(), 'ArrowDown');
	expect(active().dataset['messageId']).toBe(id(102));
	expect(active().tabIndex).toBe(0);
	press(active(), 'End');
	expect(active().dataset['messageId']).toBe(id(108));
});

test('an unrelated connection update leaves every message row uncommitted', () => {
	const { transport } = mount();
	act(() => { transport.loadSnapshot(); });
	const before = screen.getAllByRole('listitem').map((li) => li.dataset['commits']);
	expect(before).toHaveLength(8);
	act(() => { transport.setOnline(false); });
	expect(status()).toHaveTextContent('Offline.');
	const after = screen.getAllByRole('listitem').map((li) => li.dataset['commits']);
	expect(after).toEqual(before);
});

test('new rows announce as one batched, delayed count', () => {
	vi.useFakeTimers();
	const { transport } = mount();
	act(() => { transport.loadSnapshot(); });
	act(() => { transport.replayNext(); });
	expect(status()).not.toHaveTextContent('new message');
	act(() => { vi.advanceTimersByTime(2000); });
	expect(status()).toHaveTextContent('1 new message.');
});

test('drafts survive a snapshot reload, submits show a pending command, and revocation clears the composer', async () => {
	const { store, transport } = mount();
	act(() => { transport.loadSnapshot(); });
	const box = screen.getByRole('textbox', { name: /Message/ });
	fireEvent.change(box, { target: { value: 'keep me' } });
	expect(store.getState().drafts).toEqual([{ streamId: fixture.streamId, text: 'keep me', tag: 'unsent' }]);
	act(() => { transport.loadSnapshot(); });
	expect(box).toHaveProperty('value', 'keep me');
	expect(screen.getByText(/Unsent draft \(7 characters\)/)).toBeTruthy();
	fireEvent.keyDown(box, { key: 'Enter' });
	await act(async () => { await Promise.resolve(); });
	expect(screen.getByText(/1 pending command awaiting a receipt/)).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Fail send: rate limited' }));
	expect(screen.getByText(/Last core decision: wait_retry_after 30s/)).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Deliver fixture receipt' }));
	expect(box).toHaveProperty('value', '');
	expect(screen.getByRole('article', { name: /^Unknown author, system, no time, unread$/ })).toHaveTextContent('keep me');
	fireEvent.change(box, { target: { value: 'private' } });
	fireEvent.click(screen.getByRole('button', { name: 'Revoke access' }));
	expect(store.getState().drafts).toEqual([]);
	expect(box).toHaveProperty('value', '');
});

test('phone viewport applies a compact layout without hiding the timeline behind a route', () => {
	const { transport } = mount();
	act(() => { transport.loadSnapshot(); });
	expect(screen.getByRole('main').parentElement?.dataset['viewport']).toBe('desktop');
	setPhone(true);
	expect(screen.getByRole('main').parentElement?.dataset['viewport']).toBe('phone');
	expect(screen.getByRole('list', { name: /^Messages, / })).toBeTruthy();
	setPhone(false);
	expect(screen.getByRole('main').parentElement?.dataset['viewport']).toBe('desktop');
});

test('a citation focuses the cited message', async () => {
	const { transport } = mount();
	act(() => { transport.loadSnapshot(); });
	const agentRow = screen.getByRole('article', { name: /^Local room agent,/ });
	const [firstCitation] = within(agentRow).getAllByRole('button', { name: 'Cited: Ada' });
	if (!firstCitation) throw new Error('citation button missing');
	fireEvent.click(firstCitation);
	await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 0); }); });
	expect((document.activeElement as HTMLElement | null)?.dataset['messageId']).toBe(id(101));
});
