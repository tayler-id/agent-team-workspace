import { AgoraProvider, createRoomClient, rows, type Presentation } from '@agora/web-framework';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, expect, test } from 'vitest';
import { App } from '../src/components/App.tsx';
import { createBrowserEnvironment, createFixtureTransport, formatMessageTime, load, wireInstant, type TimeContext } from '../src/host/index.ts';
import room from '../src/fixture/room.json' with { type: 'json' };
import { installGeometry } from './geometry.ts';

const loaded = load(room);
if (!loaded.ok) throw new Error(loaded.error);
const fixture = loaded.fixture;
const digest = (text: string): Promise<string> => Promise.resolve(`sha256:${text.length.toString(16).padStart(64, '0')}`);
const at = (iso: string): number => Date.parse(iso);
const ctx = (locale: string, timeZone: string, now: string): TimeContext => ({ locale, timeZone, now: at(now) });
const id = (n: number): string => `0f1c1e5e-0000-4000-8000-${String(n).padStart(12, '0')}`;

afterEach(() => { cleanup(); });

test('valid wire times follow the viewer locale, timezone and calendar day, including day and year boundaries', () => {
	const boundary = '2026-09-21T03:30:00Z';
	const now = '2026-09-21T12:00:00Z';
	expect(formatMessageTime(boundary, ctx('en-US', 'UTC', now))).toMatchObject({ state: 'valid', visible: '3:30 AM', dateTime: boundary, spoken: 'September 21, 2026 at 3:30:00 AM Coordinated Universal Time' });
	expect(formatMessageTime(boundary, ctx('en-GB', 'UTC', now)).visible).toBe('3:30');
	expect(formatMessageTime(boundary, ctx('en-US', 'America/Los_Angeles', now)).visible).toBe('Sep 20, 8:30 PM');
	expect(formatMessageTime(boundary, ctx('en-GB', 'America/Los_Angeles', now)).visible).toBe('20 Sept, 20:30');
	expect(formatMessageTime(boundary, ctx('en-US', 'Pacific/Auckland', now)).visible).toBe('Sep 21, 3:30 PM');
	expect(formatMessageTime(boundary, ctx('en-GB', 'Europe/London', now))).toMatchObject({ visible: '4:30', spoken: '21 September 2026 at 4:30:00 British Summer Time' });
	expect(formatMessageTime('2025-12-31T23:30:00Z', ctx('en-US', 'UTC', '2026-01-01T12:00:00Z')).visible).toBe('Dec 31, 2025, 11:30 PM');
	expect(formatMessageTime('2026-09-20T09:01:00.5Z', ctx('en-US', 'America/Los_Angeles', '2026-09-20T18:00:00Z'))).toMatchObject({ visible: '2:01 AM', dateTime: '2026-09-20T09:01:00.5Z', inspected: 'September 20, 2026 at 2:01:00 AM Pacific Daylight Time (2026-09-20T09:01:00.5Z)' });
});

test('malformed timestamps stay explicit and overflow dates are not rolled into another day', () => {
	expect(formatMessageTime('', ctx('en-US', 'UTC', '2026-09-21T12:00:00Z'))).toMatchObject({ state: 'missing', visible: '', spoken: 'no time', dateTime: undefined });
	for (const raw of ['2026-09-20T18:00:00+00:00', '2026-02-31T00:00:00Z', '2026-04-31T12:00:00Z', '2026-12-31T23:59:60Z', 'not-a-time', '2026-09-20 09:01:00Z']) {
		expect(wireInstant(raw)).toBeUndefined();
		expect(formatMessageTime(raw, ctx('en-US', 'UTC', '2026-09-21T12:00:00Z'))).toMatchObject({ state: 'invalid', visible: 'Unreadable time', dateTime: undefined });
	}
	expect(at('2026-02-31T00:00:00Z')).not.toBeNaN();
});

test('committed sequence still orders the room when clocks would sort the other way', () => {
	const streamId = id(1);
	const earlySeq = { id: id(101), createdSeq: '1', revision: '1', content: { tag: 'visible' as const, body: 'first committed' } };
	const laterSeq = { id: id(102), createdSeq: '2', revision: '1', content: { tag: 'visible' as const, body: 'second committed' } };
	const client = createRoomClient();
	client.apply({ type: 'snapshot', streamId, cursor: '2', lastSeen: '2', messages: [laterSeq, earlySeq], runs: [] });
	const roomState = client.getState().rooms.find((item) => item.streamId === streamId);
	const presentation: Presentation = { authors: {}, times: { [earlySeq.id]: '2026-09-22T00:00:00Z', [laterSeq.id]: '2026-09-20T00:00:00Z' }, citations: {} };
	expect(rows(roomState, presentation).map((row) => row.message.createdSeq)).toEqual(['1', '2']);
	expect(rows(roomState, presentation).map((row) => row.time)).toEqual(['2026-09-22T00:00:00Z', '2026-09-20T00:00:00Z']);
});

test('the served shell shows a readable time and keeps the wire created_at for inspection', () => {
	installGeometry();
	window.matchMedia = (query: string): MediaQueryList => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => true } as MediaQueryList);
	const client = createRoomClient();
	const transport = createFixtureTransport(client, fixture);
	const swapped: Presentation = { ...fixture.presentation, times: { ...fixture.presentation.times, [id(101)]: '2026-09-22T00:00:00Z', [id(108)]: '2026-09-19T00:00:00Z' } };
	render(createElement(AgoraProvider, { client, environment: createBrowserEnvironment(transport, { digestText: digest }), children: createElement(App, { header: fixture.header, presentation: swapped }) }));
	fireEvent.click(screen.getByRole('button', { name: 'Load fixture snapshot' }));
	const articles = screen.getAllByRole('article');
	expect(articles.map((article) => article.dataset['seq'])).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
	const first = articles[0];
	const time = first?.querySelector('time');
	expect(time?.getAttribute('datetime')).toBe('2026-09-22T00:00:00Z');
	expect(time?.textContent).not.toBe('2026-09-22T00:00:00Z');
	const resolved = new Intl.DateTimeFormat().resolvedOptions();
	expect(time?.textContent).toBe(formatMessageTime('2026-09-22T00:00:00Z', { locale: resolved.locale || 'en-US', timeZone: resolved.timeZone, now: Date.now() }).visible);
	expect(first?.getAttribute('aria-label')).toContain('2026');
	expect(first?.getAttribute('aria-label')).not.toContain('2026-09-22T00:00:00Z');
	expect(time?.getAttribute('title')).toContain('2026-09-22T00:00:00Z');
	expect(client.getState().rooms[0]?.messages.map((message) => message.createdSeq)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
});
