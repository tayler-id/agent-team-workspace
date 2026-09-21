import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { App } from '../src/components/App.tsx';
import { load } from '../src/fixture/adapter.ts';
import { createDriver, type Driver } from '../src/fixture/driver.ts';
import { createStore, type Store } from '../src/store.ts';
import room from '../src/fixture/room.json' with { type: 'json' };

const loaded = load(room);
if (!loaded.ok) throw new Error(loaded.error);
const fixture = loaded.fixture;
const digest = (text: string): Promise<string> => Promise.resolve(`sha256:${text.length.toString(16).padStart(64, '0')}`);
const id = (n: number): string => `message-0f1c1e5e-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`;
let phone = false;
const listeners = new Set<() => void>();
window.matchMedia = (query: string): MediaQueryList => ({ matches: phone && query.includes('700px'), media: query, onchange: null, addEventListener: (_: string, l: unknown) => { listeners.add(l as () => void); }, removeEventListener: (_: string, l: unknown) => { listeners.delete(l as () => void); }, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => true } as MediaQueryList);
const setPhone = (value: boolean): void => { phone = value; act(() => { for (const l of listeners) l(); }); };
afterEach(() => { cleanup(); phone = false; vi.useRealTimers(); });
declare module 'vitest' { interface Assertion { toHaveTextContent: (expected: string) => void } }
expect.extend({ toHaveTextContent(received: unknown, expected: string) { const text = received instanceof Element ? received.textContent : ''; return { pass: text.includes(expected), message: () => `expected element text ${JSON.stringify(text)} to include ${JSON.stringify(expected)}` }; } });

function mount(): { store: Store; driver: Driver } {
	const store = createStore();
	const driver = createDriver(store, fixture);
	render(<App store={store} driver={driver} digest={digest} />);
	return { store, driver };
}
const status = (): HTMLElement => screen.getByRole('status');
const press = (element: Element, key: string): void => { fireEvent.keyDown(element, { key }); };

test('empty, loading, live, gap, resync, upgrade, error and revoked states are named in landmarks the reader can reach', () => {
	const { driver } = mount();
	expect(screen.getByRole('banner')).toHaveTextContent('Engineering fixture - visual design pending');
	expect(screen.getByRole('navigation', { name: 'Rooms' })).toBeTruthy();
	expect(screen.getByRole('main')).toBeTruthy();
	expect(status().dataset['phase']).toBe('empty');
	expect(screen.getByRole('heading', { name: 'No room loaded' })).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Load fixture snapshot' }));
	expect(status().dataset['phase']).toBe('live');
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Agora fixture project · General room');
	expect(screen.getByRole('banner')).toHaveTextContent('3 members');
	expect(screen.getByRole('banner')).toHaveTextContent('2 unread');
	expect(screen.getByRole('list', { name: 'Messages, showing 14 of 14' })).toBeTruthy();
	expect(screen.getByRole('separator', { name: 'Unread messages start here' })).toBeTruthy();
	expect(screen.getByText('Deleted message (tombstone, revision 2)')).toBeTruthy();
	expect(screen.getByText('edited (revision 2)')).toBeTruthy();
	act(() => { driver.skipOne(); });
	expect(status().dataset['phase']).toBe('gap');
	expect(status()).toHaveTextContent('1 buffered after cursor 16; replay requested.');
	act(() => { driver.fillGap(); });
	expect(status().dataset['phase']).toBe('live');
	act(() => { driver.resync(); });
	expect(status().dataset['phase']).toBe('resync');
	fireEvent.click(screen.getByRole('button', { name: 'Load fresh snapshot' }));
	expect(status().dataset['phase']).toBe('live');
	expect(status()).toHaveTextContent('Cursor 18 applied.');
	act(() => { driver.unsupported(); });
	expect(status().dataset['phase']).toBe('upgrade');
	act(() => { driver.loadInvalidSnapshot(); });
	expect(screen.getByRole('alert')).toHaveTextContent('snapshot rejected: snapshot');
	act(() => { driver.revoke(); });
	expect(status().dataset['phase']).toBe('revoked');
	expect(screen.getByRole('heading', { name: 'Access revoked' })).toBeTruthy();
	expect(screen.getByRole('textbox', { name: /Message/ })).toHaveProperty('disabled', true);
});

test('keyboard flow: arrow keys rove over message groups, Enter opens the thread, Escape returns focus to the trigger', () => {
	const { driver } = mount();
	act(() => { driver.loadSnapshot(); });
	const rows = screen.getAllByRole('article', { name: /^(Ada|Ben|Cam|Unknown author),/ });
	expect(rows).toHaveLength(14);
	expect(rows.map((r) => r.tabIndex)).toEqual([...Array<number>(13).fill(-1), 0]);
	const active = (): HTMLElement => { const element = document.activeElement; if (!(element instanceof HTMLElement)) throw new Error('nothing focused'); return element; };
	rows[13]?.focus();
	press(active(), 'ArrowUp');
	expect(active().id).toBe(id(13));
	press(active(), 'Home');
	expect(active().id).toBe(id(1));
	press(active(), 'ArrowDown');
	expect(active().id).toBe(id(2));
	expect(active().tabIndex).toBe(0);
	press(active(), 'Enter');
	const pane = screen.getByRole('complementary');
	expect(pane.hidden).toBe(false);
	expect(document.activeElement).toBe(within(pane).getByRole('heading', { name: 'Thread' }));
	expect(within(pane).getByRole('list', { name: 'Thread messages' }).children).toHaveLength(3);
	press(pane, 'Escape');
	expect(pane.hidden).toBe(true);
	return new Promise<void>((resolve) => { setTimeout(() => { expect(document.activeElement?.id).toBe(id(2)); resolve(); }, 0); });
});

test('a run-only burst rerenders only the run card, leaving every message row commit count unchanged', () => {
	const { driver } = mount();
	act(() => { driver.loadSnapshot(); });
	fireEvent.click(screen.getByRole('button', { name: 'Runs, tasks and approvals' }));
	const before = screen.getAllByRole('listitem').filter((li) => li.dataset['commits']).map((li) => [li.dataset['seq'], li.dataset['commits']]);
	expect(before).toHaveLength(14);
	const card = (): HTMLElement => { const found = screen.getAllByRole('article', { name: /^Run card/ }).find((a) => a.dataset['runId']?.endsWith('01')); if (!found) throw new Error('run card 01 missing'); return found; };
	const cardCommits = Number(card().dataset['commits']);
	act(() => { driver.runBurst(200); });
	const after = screen.getAllByRole('listitem').filter((li) => li.dataset['commits']).map((li) => [li.dataset['seq'], li.dataset['commits']]);
	expect(after).toEqual(before);
	expect(card().dataset['revision']).toBe('203');
	expect(card()).toHaveTextContent('succeeded');
	expect(Number(card().dataset['commits'])).toBeGreaterThan(cardCommits);
	expect(screen.getByRole('article', { name: 'Task card, proposed' })).toHaveTextContent('Launch (unavailable)');
	expect(screen.getByRole('article', { name: 'Evidence card, valid, owner attested' })).toHaveTextContent('swift: ? unavailable');
	expect(screen.getByRole('article', { name: 'Approval card, waiting for other reviewer' })).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Launch (unavailable)' }));
	expect(status()).toHaveTextContent('Launch: unavailable in this fixture. Launch needs a bound machine, budget and approval from the control service.');
});

test('drafts survive a snapshot reload, submits show a pending command, and revocation clears the composer', async () => {
	const { store, driver } = mount();
	act(() => { driver.loadSnapshot(); });
	const box = screen.getByRole('textbox', { name: /Message/ });
	fireEvent.change(box, { target: { value: 'keep me' } });
	expect(store.getState().drafts).toEqual([{ streamId: fixture.streamId, text: 'keep me', tag: 'unsent' }]);
	act(() => { driver.loadSnapshot(); });
	expect(box).toHaveProperty('value', 'keep me');
	expect(screen.getByText(/Unsent draft \(7 characters\)/)).toBeTruthy();
	fireEvent.keyDown(box, { key: 'Enter' });
	await act(async () => { await Promise.resolve(); });
	expect(screen.getByText(/1 pending command awaiting a receipt/)).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Fail send: rate limited' }));
	expect(screen.getByText(/Last core decision: wait_retry_after 30s/)).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Deliver fixture receipt' }));
	expect(box).toHaveProperty('value', '');
	expect(screen.getByRole('article', { name: /^Unknown author, no time, unread$/ })).toHaveTextContent('keep me');
	fireEvent.change(box, { target: { value: 'private' } });
	act(() => { driver.revoke(); });
	expect(store.getState().drafts).toEqual([]);
	expect(box).toHaveProperty('value', '');
});

test('phone viewport turns the pane into a route with a back control and hides the timeline while open', () => {
	const { driver } = mount();
	act(() => { driver.loadSnapshot(); });
	setPhone(true);
	expect(screen.getByRole('main', { hidden: true }).parentElement?.dataset['viewport']).toBe('phone');
	fireEvent.click(screen.getByRole('button', { name: 'Runs, tasks and approvals' }));
	expect(screen.getByRole('main', { hidden: true }).hidden).toBe(true);
	fireEvent.click(screen.getByRole('button', { name: 'Back to timeline' }));
	expect(screen.getByRole('main').hidden).toBe(false);
	setPhone(false);
	fireEvent.click(screen.getByRole('button', { name: 'Runs, tasks and approvals' }));
	expect(screen.getByRole('main').hidden).toBe(false);
	expect(screen.queryByRole('button', { name: 'Back to timeline' })).toBeNull();
});

test('large rooms window to the newest page, Load older messages extends it, and citations focus the cited message', () => {
	vi.useFakeTimers();
	const { driver } = mount();
	act(() => { driver.loadLargeRoom(5000); });
	expect(screen.getByRole('list', { name: 'Messages, showing 50 of 5000' })).toBeTruthy();
	expect(screen.getAllByRole('article', { name: /^Unknown author/ })).toHaveLength(50);
	fireEvent.click(screen.getByRole('button', { name: 'Load older messages (4950 older)' }));
	expect(screen.getByRole('list', { name: 'Messages, showing 100 of 5000' })).toBeTruthy();
	expect(status()).toHaveTextContent('Loaded 50 older messages.');
	act(() => { vi.advanceTimersByTime(2000); });
	expect(status()).toHaveTextContent('5000 new messages.');
	act(() => { driver.revoke(); driver.loadSnapshot(); });
	act(() => { driver.replayNext(); });
	expect(status()).toHaveTextContent('5000 new messages.');
	act(() => { vi.advanceTimersByTime(2000); });
	expect(status()).toHaveTextContent('1 new message.');
	fireEvent.click(screen.getByRole('button', { name: "Cam's comparator (message revision)" }));
	act(() => { vi.advanceTimersByTime(0); });
	expect(document.activeElement?.id).toBe(id(7));
	expect(screen.getByText('unresolved, plain text')).toBeTruthy();
});
