import type { Row } from '@agora/web-framework';
import { afterEach, expect, test, vi } from 'vitest';
import { createTextSizer, fallbackSizer, geometryKey, pretextSizer, pretextSupported, type TextGeometry, type TextSizer } from '../src/host/index.ts';
import { calibrate, classify, defaultChrome, estimateRow } from '../src/rows.ts';

const base: TextGeometry = { font: 'normal 400 15px Helvetica', fontSize: 15, lineHeight: 22.5, width: 400, letterSpacing: 0, whiteSpace: 'pre-wrap', lang: 'en', fontsVersion: 0 };
const long = 'word '.repeat(120).trim();
let measured = 0;
// A fake OffscreenCanvas whose glyphs all advance 8px: Pretext's real segmentation and line breaking run in jsdom.
const fakeCanvas = (): void => { Object.defineProperty(globalThis, 'OffscreenCanvas', { configurable: true, value: class { getContext(): unknown { return { font: '', letterSpacing: '0px', measureText: (text: string) => { measured += 1; return { width: text.length * 8 }; } }; } } }); };
const noCanvas = (): void => { Object.defineProperty(globalThis, 'OffscreenCanvas', { configurable: true, value: class { getContext(): null { return null; } } }); };
afterEach(() => { Reflect.deleteProperty(globalThis, 'OffscreenCanvas'); measured = 0; });
const row = (body: string, extra: Partial<Row> = {}, tag: 'visible' | 'tombstone' = 'visible'): Row => ({ message: { id: 'm', createdSeq: '1', revision: '1', content: tag === 'visible' ? { tag, body } : { tag } }, author: { name: 'Ada', kind: 'human' }, time: '', edited: false, unread: false, firstUnread: false, citations: [], ...extra });
const spy = (): TextSizer & { calls: number } => { const sizer: TextSizer & { calls: number } = { kind: 'fallback', key: 'spy', calls: 0, height: (text: string): number => { sizer.calls += 1; return text.length; } }; return sizer; };

test('every rendered geometry input changes the cache identity, so a sizer never answers for another font, width, spacing, language or font-loading state', () => {
	const variants: Partial<TextGeometry>[] = [{ font: 'normal 700 15px Helvetica' }, { fontSize: 16 }, { lineHeight: 24 }, { width: 399 }, { letterSpacing: 0.5 }, { whiteSpace: 'normal' }, { lang: 'ar' }, { fontsVersion: 1 }];
	const keys = new Set([geometryKey(base), ...variants.map((v) => geometryKey({ ...base, ...v }))]);
	expect(keys.size).toBe(variants.length + 1);
	const wide = fallbackSizer(base), narrow = fallbackSizer({ ...base, width: 100 });
	expect(wide.key).not.toBe(narrow.key);
	expect(narrow.height(long)).toBeGreaterThan(wide.height(long));
	expect(fallbackSizer(base)).not.toBe(wide);
});

test('the fallback sizer breaks on newlines, never returns less than one line and is deterministic', () => {
	const sizer = fallbackSizer(base);
	expect(sizer.height('')).toBe(22.5);
	expect(sizer.height('a\nb\nc')).toBe(67.5);
	expect(sizer.height(long)).toBe(fallbackSizer(base).height(long));
	expect(sizer.kind).toBe('fallback');
});

test('Pretext runs behind the sizer: narrower widths make paragraphs taller, repeated text hits the cache, and RTL and CJK text size to whole lines', () => {
	fakeCanvas();
	expect(pretextSupported()).toBe(true);
	const wide = createTextSizer(base);
	expect(wide.kind).toBe('pretext');
	const tall = wide.height(long);
	expect(tall % 22.5).toBe(0);
	expect(measured).toBeGreaterThan(0);
	measured = 0;
	expect(wide.height(long)).toBe(tall);
	expect(measured).toBe(0);
	expect(createTextSizer({ ...base, width: 100 }).height(long)).toBeGreaterThan(tall);
	for (const text of ['مرحبا بالعالم. هذا النص يكتب من اليمين إلى اليسار.', '日本語と中文のテキストは空白なしで折り返されます。', 'שלום עולם']) {
		const height = pretextSizer(base).height(text);
		expect(height).toBeGreaterThanOrEqual(22.5);
		expect(height % 22.5).toBe(0);
	}
});

test('without Canvas 2D the sizer falls back deterministically instead of throwing, and the fallback can be forced', () => {
	noCanvas();
	expect(pretextSupported()).toBe(false);
	expect(createTextSizer(base).kind).toBe('fallback');
	expect(createTextSizer(base).height(long)).toBe(fallbackSizer(base).height(long));
	fakeCanvas();
	expect(createTextSizer(base, 'fallback').kind).toBe('fallback');
});

test('rows with code blocks, tombstones or citations are measured and never reach the text sizer', () => {
	const sizer = spy();
	const code = row('Before\n```ts\nconst x = 1;\n```\nAfter');
	const tombstone = row('', {}, 'tombstone');
	const cited = row('See above', { citations: ['other'] });
	expect(classify(code)).toEqual({ kind: 'measured', reason: 'code' });
	expect(classify(tombstone)).toEqual({ kind: 'measured', reason: 'tombstone' });
	expect(classify(cited)).toEqual({ kind: 'measured', reason: 'citations' });
	for (const dynamic of [code, tombstone, cited]) expect(estimateRow(dynamic, sizer, defaultChrome)).toBe(defaultChrome.measured);
	expect(sizer.calls).toBe(0);
	expect(classify(row('one\n\ntwo'))).toEqual({ kind: 'text', paragraphs: ['one\n\ntwo'] });
	expect(estimateRow(row('hello'), sizer, defaultChrome)).toBe(defaultChrome.base + 5);
	expect(sizer.calls).toBe(1);
});

test('a measured text row calibrates the fixed chrome once; measured rows leave it untouched', () => {
	const sizer = spy();
	expect(calibrate(row('hello'), 100, sizer, defaultChrome)).toEqual({ ...defaultChrome, base: 95 });
	expect(calibrate(row('', {}, 'tombstone'), 100, sizer, defaultChrome)).toBe(defaultChrome);
	expect(calibrate(row('x'), 0, sizer, defaultChrome).base).toBe(0);
});

test('a stale sizer is unusable after a geometry change because the component must ask for a new one', () => {
	fakeCanvas();
	const before = createTextSizer(base);
	const after = createTextSizer({ ...base, fontsVersion: 1 });
	expect(after.key).not.toBe(before.key);
	const probe = vi.fn(after.height);
	expect(probe(long)).toBe(before.height(long));
	expect(after).not.toBe(before);
});
