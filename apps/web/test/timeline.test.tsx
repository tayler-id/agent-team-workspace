import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/components/App.tsx';
import { FixtureControls } from '../src/components/FixtureControls.tsx';
import { load } from '../src/fixture/adapter.ts';
import { createFixtureTransport, type FixtureTransport } from '../src/fixture/fixtureTransport.ts';
import { createStore } from '../src/store.ts';
import room from '../src/fixture/room.json' with { type: 'json' };
import { fonts, geometry, installGeometry, scrollCalls } from './geometry.ts';

// Drives only the public shell surface (App, FixtureControls, fixture transport) with the jsdom geometry doubles
// from geometry.ts. Nothing here imports the sizing or virtualization modules directly.
const loaded = load(room);
if (!loaded.ok) throw new Error(loaded.error);
const fixture = loaded.fixture;
const total = 50_000;
const id = (n: number): string => `aaaaaaaa-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

beforeEach(() => {
	installGeometry();
	window.matchMedia = (query: string): MediaQueryList => ({ matches: query.includes('reduced-motion') && geometry.reducedMotion, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => true } as MediaQueryList);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

// Waits until programmatic scrolling has settled: the virtualizer reconciles a jump over a few frames while newly
// mounted rows are measured, so the scroll offset is read only once it has been stable for two ticks.
const settle = async (): Promise<void> => {
	const region = screen.queryByRole('region', { name: 'Messages' });
	let last = -1, stable = 0;
	for (let i = 0; i < 40 && stable < 2; i++) {
		await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 32); }); });
		const now = region?.scrollTop ?? 0;
		stable = now === last ? stable + 1 : 0;
		last = now;
	}
};
function mountLarge(count = total): { transport: FixtureTransport; region: HTMLElement; list: HTMLElement } {
	const store = createStore();
	const transport = createFixtureTransport(store, fixture);
	render(<><App store={store} port={transport} header={fixture.header} presentation={fixture.presentation} /><FixtureControls store={store} transport={transport} /></>);
	act(() => { transport.loadLargeRoom(count); });
	return { transport, region: screen.getByRole('region', { name: 'Messages' }), list: screen.getByRole('list', { name: /^Messages/ }) };
}
const mounted = (): HTMLElement[] => screen.getAllByRole('listitem');
const positions = (): number[] => mounted().map((li) => Number(li.getAttribute('aria-posinset')));
const active = (): HTMLElement => { const element = document.activeElement; if (!(element instanceof HTMLElement)) throw new Error('nothing focused'); return element; };
const activeIndex = (): number => Number(active().closest('li')?.getAttribute('aria-posinset'));
const jump = async (n: number): Promise<void> => { window.location.hash = `#message-${id(n)}`; fireEvent(window, new Event('hashchange')); await settle(); };
const rowTop = (n: number): number => { const li = mounted().find((l) => l.getAttribute('aria-posinset') === String(n)); if (!li) throw new Error(`message ${n} is not mounted`); return Number(/translateY\((-?[\d.]+)px\)/.exec(li.style.transform)?.[1]); };
const bound = 30; // 600px / 70px minimum rows visible (9) + twice the 8-row overscan + up to 3 pinned rows, rounded up

test('a 50,000-message room mounts only visible rows plus bounded overscan and announces every position', async () => {
	const { region, list } = mountLarge();
	await settle();
	expect(list.getAttribute('aria-label')).toBe('Messages, 50,000 total');
	expect(list.getAttribute('data-total')).toBe(String(total));
	expect(mounted().length).toBeLessThanOrEqual(bound);
	for (const li of mounted()) { expect(li.getAttribute('aria-setsize')).toBe(String(total)); expect(Number(li.getAttribute('aria-posinset'))).toBeGreaterThan(0); }
	expect(positions()).toContain(total);
	for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
		region.scrollTo({ top: Math.round(region.scrollHeight * fraction) });
		await settle();
		expect(mounted().length).toBeLessThanOrEqual(bound);
	}
});

test('keyboard and deep links reach the exact first, middle and last messages', async () => {
	mountLarge();
	await settle();
	const newest = mounted().find((li) => li.getAttribute('aria-posinset') === String(total));
	if (!newest) throw new Error('newest row is not mounted');
	within(newest).getByRole('article').focus();
	expect(activeIndex()).toBe(total);
	fireEvent.keyDown(active(), { key: 'Home' });
	await settle();
	expect(activeIndex()).toBe(1);
	expect(active().dataset['messageId']).toBe(id(1));
	fireEvent.keyDown(active(), { key: 'ArrowDown' });
	await settle();
	expect(activeIndex()).toBe(2);
	fireEvent.keyDown(active(), { key: 'End' });
	await settle();
	expect(activeIndex()).toBe(total);
	await jump(25_000);
	expect(activeIndex()).toBe(25_000);
	expect(mounted().length).toBeLessThanOrEqual(bound);
	fireEvent.keyDown(active(), { key: 'ArrowUp' });
	await settle();
	expect(activeIndex()).toBe(24_999);
});

test('a focused row and a text selection stay mounted when the viewport scrolls away from them', async () => {
	const { region } = mountLarge();
	await settle();
	await jump(25_000);
	const article = active();
	const paragraph = within(article).getAllByText(/./, { selector: 'p, pre' })[0];
	if (!paragraph) throw new Error('row has no text');
	const selection = window.getSelection();
	if (!selection) throw new Error('no selection');
	const range = document.createRange();
	range.selectNodeContents(paragraph);
	selection.removeAllRanges();
	selection.addRange(range);
	document.dispatchEvent(new Event('selectionchange'));
	region.scrollTo({ top: 0 });
	await settle();
	expect(positions()).toContain(1);
	expect(article.isConnected).toBe(true);
	expect(document.activeElement).toBe(article);
	expect(selection.toString().length).toBeGreaterThan(0);
	expect(selection.anchorNode?.isConnected).toBe(true);
	expect(mounted().length).toBeLessThanOrEqual(bound);
});

test('resize and font readiness re-estimate heights without moving the anchored message', async () => {
	const { region, list } = mountLarge();
	await settle();
	await jump(25_000);
	const before = rowTop(25_000) - region.scrollTop;
	const key = list.getAttribute('data-geometry');
	expect(key).toBeTruthy();
	geometry.width = 400;
	fireEvent(window, new Event('resize'));
	await settle();
	expect(list.getAttribute('data-geometry')).not.toBe(key);
	expect(Math.abs(rowTop(25_000) - region.scrollTop - before)).toBeLessThanOrEqual(1);
	const resized = list.getAttribute('data-geometry');
	act(() => { fonts.dispatchEvent(new Event('loadingdone')); });
	await settle();
	expect(list.getAttribute('data-geometry')).not.toBe(resized);
	expect(Math.abs(rowTop(25_000) - region.scrollTop - before)).toBeLessThanOrEqual(1);
	expect(activeIndex()).toBe(25_000);
});

test('reconnect insertions never move a viewport parked mid-list and follow only when already at the end', async () => {
	const { region } = mountLarge();
	await settle();
	await jump(25_000);
	const parked = region.scrollTop;
	fireEvent.click(screen.getByRole('button', { name: 'Append 100 messages' }));
	await settle();
	expect(screen.getByRole('list', { name: 'Messages, 50,100 total' })).toBeTruthy();
	expect(region.scrollTop).toBe(parked);
	expect(mounted()[0]?.getAttribute('aria-setsize')).toBe('50100');
	fireEvent.keyDown(active(), { key: 'End' });
	await settle();
	fireEvent.click(screen.getByRole('button', { name: 'Append 100 messages' }));
	await settle();
	expect(positions()).toContain(50_200);
});

test('reduced motion makes every programmatic scroll instant', async () => {
	geometry.reducedMotion = true;
	mountLarge();
	await settle();
	await jump(25_000);
	await jump(24_999);
	expect(scrollCalls.length).toBeGreaterThan(0);
	expect(scrollCalls.every((call) => call.behavior !== 'smooth')).toBe(true);
	cleanup();
	geometry.reducedMotion = false;
	scrollCalls.length = 0;
	mountLarge();
	await settle();
	await jump(25_000);
	await jump(24_999);
	expect(scrollCalls.some((call) => call.behavior === 'smooth')).toBe(true);
});

test('message bodies with HTML and javascript URLs render as text, never as elements', async () => {
	const store = createStore();
	const transport = createFixtureTransport(store, fixture);
	render(<><App store={store} port={transport} header={fixture.header} presentation={fixture.presentation} digest={(text) => Promise.resolve(`sha256:${text.length.toString(16).padStart(64, '0')}`)} /><FixtureControls store={store} transport={transport} /></>);
	act(() => { transport.loadSnapshot(); });
	const hostile = '<img src=x onerror="alert(1)"> <a href="javascript:alert(1)">x</a> [x](javascript:alert(1)) javascript:alert(1)';
	fireEvent.change(screen.getByRole('textbox', { name: /Message/ }), { target: { value: hostile } });
	fireEvent.keyDown(screen.getByRole('textbox', { name: /Message/ }), { key: 'Enter' });
	await act(async () => { await Promise.resolve(); });
	fireEvent.click(screen.getByRole('button', { name: 'Deliver fixture receipt' }));
	await settle();
	const row = screen.getByText((_, element) => element?.tagName === 'P' && element.textContent.includes('onerror')).closest('article');
	if (!row) throw new Error('hostile row missing');
	expect(row.querySelectorAll('img, a, script').length).toBe(0);
	expect(row.textContent).toContain('<img src=x onerror="alert(1)">');
	expect(document.querySelectorAll('article a[href^="javascript:"]').length).toBe(0);
});
