import type { Row } from '@agora/web-framework';
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { createTextSizer, geometryKey, observeFonts, observeWidth, prefersReducedMotion, readGeometry, type TextGeometry } from '../host/index.ts';
import { calibrate, classify, defaultChrome, estimateRow, type RowChrome } from '../rows.ts';

export const rowDomId = (id: string): string => `message-${id}`;
export const overscan = 8;
const engine = (): 'auto' | 'fallback' => typeof location !== 'undefined' && new URLSearchParams(location.search).get('sizing') === 'fallback' ? 'fallback' : 'auto';
const initialGeometry: TextGeometry = { font: 'normal 400 15px Helvetica Neue, Helvetica, Arial, sans-serif', fontSize: 15, lineHeight: 22.5, width: 0, letterSpacing: 0, whiteSpace: 'pre-wrap', lang: '', fontsVersion: 0 };

export interface TimelineVirtualItem { readonly key: string; readonly index: number; readonly start: number; readonly size: number }

export interface TimelineVirtualizer {
	readonly scroller: RefObject<HTMLElement | null>;
	readonly list: RefObject<HTMLOListElement | null>;
	readonly items: readonly TimelineVirtualItem[];
	readonly totalSize: number;
	readonly active: number;
	readonly sizerKind: string;
	readonly geometryKeyValue: string;
	readonly measureElement: (node: HTMLLIElement | null) => void;
	readonly move: (event: KeyboardEvent<HTMLOListElement>) => void;
}

// The virtualizer owns scroll offset, range and positioning; the sizer only answers "how tall is this text".
// Focus, selection and the active row are pinned into the mounted range so they are never silently unmounted.
// This hook is the one place apps/web/src/components/Timeline.tsx delegates raw React effects and DOM globals
// to, per the Host/framework exemption in scripts/renderer-policy.ts: components stay declarative render-only.
export function useTimelineVirtualizer(rows: readonly Row[], focusRequest: string | undefined): TimelineVirtualizer {
	const scroller = useRef<HTMLElement>(null);
	const list = useRef<HTMLOListElement>(null);
	const chrome = useRef<{ key: string; value: RowChrome }>({ key: '', value: defaultChrome });
	const pendingAnchor = useRef<{ index: number; key: string | number | bigint; delta: number } | undefined>(undefined);
	const pendingFocus = useRef<string | undefined>(undefined);
	const previousKey = useRef<string | undefined>(undefined);
	const [geometry, setGeometry] = useState<TextGeometry>(initialGeometry);
	const [fontsVersion, setFontsVersion] = useState(0);
	const [active, setActive] = useState(-1);
	const [selected, setSelected] = useState<readonly number[]>([]);
	const sizer = useMemo(() => createTextSizer(geometry, engine()), [geometry]);
	const pinned = useMemo(() => [active, ...selected].filter((i) => i >= 0 && i < rows.length), [active, selected, rows.length]);
	const virtualizer = useVirtualizer<HTMLElement, HTMLLIElement>({
		count: rows.length,
		getScrollElement: () => scroller.current,
		estimateSize: (index) => { const row = rows[index]; return row ? estimateRow(row, sizer, chrome.current.value) : chrome.current.value.measured; },
		getItemKey: (index) => rows[index]?.message.id ?? index,
		overscan,
		anchorTo: 'end',
		followOnAppend: true,
		rangeExtractor: useCallback((range: Range) => { const base = defaultRangeExtractor(range); return [...new Set([...pinned, ...base])].sort((a, b) => a - b); }, [pinned]),
		// The first measured text row per geometry calibrates the fixed chrome once; later rows only correct themselves.
		measureElement: (element) => {
			const height = element.offsetHeight;
			const row = rows[Number(element.dataset['index'])];
			if (row && chrome.current.key !== sizer.key && classify(row).kind === 'text') chrome.current = { key: sizer.key, value: calibrate(row, height, sizer, chrome.current.value) };
			return height;
		},
	});
	const indexOf = (messageId: string): number => rows.findIndex((r) => r.message.id === messageId);

	// Geometry: read what the browser renders with and re-read on width and font changes. The anchor (first visible
	// row and its offset) is captured before the new sizer renders, because rows measured during that commit already
	// shift every estimate; the geometry effect then drops cached sizes and remeasures mounted rows.
	const refresh = useCallback((): void => {
		const probe = list.current?.querySelector('.message p, .message pre') ?? list.current;
		const width = [list.current?.clientWidth, scroller.current?.clientWidth, scroller.current?.offsetWidth].find((n) => n !== undefined && n > 0) ?? 0;
		if (!probe) return;
		const next = readGeometry(probe, width, fontsVersion);
		if (previousKey.current === geometryKey(next)) return;
		const offset = scroller.current?.scrollTop ?? 0;
		const anchor = previousKey.current === undefined ? undefined : virtualizer.getVirtualItems().find((item) => item.end > offset);
		if (anchor) pendingAnchor.current = { index: anchor.index, key: anchor.key, delta: offset - anchor.start };
		previousKey.current = geometryKey(next);
		setGeometry(next);
	}, [fontsVersion, virtualizer]);
	useEffect(() => { refresh(); return list.current ? observeWidth(list.current, refresh) : undefined; }, [refresh, rows.length > 0]);
	useEffect(() => observeFonts(() => { setFontsVersion((v) => v + 1); }), []);
	useLayoutEffect(() => {
		if (!pendingAnchor.current) return;
		virtualizer.shouldAdjustScrollPositionOnItemSizeChange = () => false;
		virtualizer.measure();
		for (const node of virtualizer.elementsCache.values()) virtualizer.measureElement(node);
		virtualizer.shouldAdjustScrollPositionOnItemSizeChange = undefined;
	}, [geometry]);
	useLayoutEffect(() => {
		const anchor = pendingAnchor.current;
		// Restore only once the list's DOM height carries the new sizes, so the browser's scroll clamp cannot cut the offset.
		if (!anchor || list.current?.style.height !== `${virtualizer.getTotalSize()}px`) return;
		pendingAnchor.current = undefined;
		const moved = virtualizer.measurementsCache[anchor.index];
		if (moved?.key === anchor.key) virtualizer.scrollToOffset(moved.start + anchor.delta, { behavior: 'auto' });
	});

	// Navigation: the active row roves tabindex over all rows; jumps are instant under reduced motion or when the
	// target is outside the mounted range, smooth only for short hops.
	const go = useCallback((index: number, align: 'auto' | 'start'): void => {
		const row = rows[index];
		if (!row) return;
		const near = virtualizer.getVirtualItems().some((item) => item.index === index);
		setActive(index);
		pendingFocus.current = row.message.id;
		virtualizer.scrollToIndex(index, { align, behavior: prefersReducedMotion() || !near ? 'auto' : 'smooth' });
	}, [rows, virtualizer]);
	useEffect(() => { if (focusRequest) { const index = indexOf(focusRequest); if (index >= 0) go(index, 'start'); } }, [focusRequest]);
	useEffect(() => { if (rows.length > 0 && (active < 0 || active >= rows.length)) { setActive(rows.length - 1); virtualizer.scrollToIndex(rows.length - 1, { align: 'end', behavior: 'auto' }); } }, [rows.length]);
	useEffect(() => { const id = pendingFocus.current; if (!id) return; const element = document.getElementById(rowDomId(id)); if (element) { pendingFocus.current = undefined; element.focus({ preventScroll: true }); } });
	useEffect(() => {
		const track = (): void => {
			const selection = document.getSelection();
			const rowIndex = (node: Node | null): number => { const li = node instanceof Element ? node.closest('li[data-index]') : node?.parentElement?.closest('li[data-index]'); return li ? Number(li.getAttribute('data-index')) : -1; };
			setSelected(selection && !selection.isCollapsed ? [rowIndex(selection.anchorNode), rowIndex(selection.focusNode)].filter((i) => i >= 0) : []);
		};
		document.addEventListener('selectionchange', track);
		return () => { document.removeEventListener('selectionchange', track); };
	}, []);
	const move = (event: KeyboardEvent<HTMLOListElement>): void => {
		const step = Math.max(1, Math.floor((scroller.current?.clientHeight ?? 0) / Math.max(1, chrome.current.value.base + geometry.lineHeight)));
		const target = event.key === 'ArrowDown' ? active + 1 : event.key === 'ArrowUp' ? active - 1 : event.key === 'PageDown' ? active + step : event.key === 'PageUp' ? active - step : event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : undefined;
		if (target === undefined) return;
		event.preventDefault();
		go(Math.min(rows.length - 1, Math.max(0, target)), 'auto');
	};
	const items = virtualizer.getVirtualItems().map((item) => ({ key: String(item.key), index: item.index, start: item.start, size: item.size }));
	return { scroller, list, items, totalSize: virtualizer.getTotalSize(), active, sizerKind: sizer.kind, geometryKeyValue: sizer.key, measureElement: virtualizer.measureElement, move };
}
