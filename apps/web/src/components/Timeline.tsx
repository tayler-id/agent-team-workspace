import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { createTextSizer, geometryKey, observeFonts, observeWidth, prefersReducedMotion, readGeometry, type TextGeometry } from '../host/index.ts';
import { messageById, segments, type Presentation, type Row } from '../projection.ts';
import { calibrate, classify, defaultChrome, estimateRow, type RowChrome } from '../rows.ts';
import { useSelector, type Store } from '../store.ts';

export const rowDomId = (id: string): string => `message-${id}`;
export const overscan = 8;
export const kindLabel: Readonly<Record<Row['author']['kind'], string>> = { human: 'human', agent: 'local agent (fixture)', system: 'system' };
const engine = (): 'auto' | 'fallback' => typeof location !== 'undefined' && new URLSearchParams(location.search).get('sizing') === 'fallback' ? 'fallback' : 'auto';
const initialGeometry: TextGeometry = { font: 'normal 400 15px Helvetica Neue, Helvetica, Arial, sans-serif', fontSize: 15, lineHeight: 22.5, width: 0, letterSpacing: 0, whiteSpace: 'pre-wrap', lang: '', fontsVersion: 0 };

interface RowProps { readonly store: Store; readonly streamId: string; readonly row: Row; readonly presentation: Presentation; readonly active: boolean; readonly onCite: (messageId: string) => void }

// Each row subscribes to its own message reference. An unrelated connection or command update leaves the
// reference untouched, so the row does not commit; data-commits exposes the count to the browser verification.
const MessageRow = memo(function MessageRow({ store, streamId, row, presentation, active, onCite }: RowProps): ReactElement {
	const message = useSelector(store, (state) => messageById(state.rooms.find((r) => r.streamId === streamId), row.message.id)) ?? row.message;
	const commits = useRef(0);
	commits.current += 1;
	const deleted = message.content.tag === 'tombstone';
	const kind = kindLabel[row.author.kind];
	const label = `${row.author.name}, ${kind}, ${row.time || 'no time'}${deleted ? ', deleted message' : ''}${row.edited ? ', edited' : ''}${row.unread ? ', unread' : ''}`;
	return (
		<article id={rowDomId(message.id)} tabIndex={active ? 0 : -1} aria-label={label} data-message-id={message.id} data-unread={row.unread} data-commits={commits.current} data-seq={message.createdSeq} data-revision={message.revision} className={row.unread ? 'message unread' : 'message'}>
			{row.firstUnread && <div role="separator" aria-label="Unread messages start here" className="unread-boundary">New</div>}
			<div className="meta">
				<span className="author">{row.author.name}</span>
				<span className="kicker">{kind}</span>
				<time dateTime={row.time}>{row.time}</time>
				{row.edited && <span className="kicker">edited (revision {message.revision})</span>}
			</div>
			{deleted ? <p className="tombstone">Deleted message (tombstone, revision {message.revision})</p> : segments(message.content.body).map((segment, i) => segment.kind === 'code' ? <pre key={i}><code>{segment.value}</code></pre> : <p key={i} dir="auto">{segment.value}</p>)}
			{row.citations.length > 0 && <div className="citations" aria-label="Citations">{row.citations.map((id) => <button type="button" key={id} tabIndex={-1} onClick={() => { onCite(id); }}>Cited: {presentation.authors[id]?.name ?? 'a message'}</button>)}</div>}
		</article>
	);
});

interface TimelineProps { readonly store: Store; readonly streamId: string; readonly rows: readonly Row[]; readonly presentation: Presentation; readonly onCite: (messageId: string) => void; readonly focusRequest: string | undefined }

// The virtualizer owns scroll offset, range and positioning; the sizer only answers "how tall is this text".
// Focus, selection and the active row are pinned into the mounted range so they are never silently unmounted.
export function Timeline({ store, streamId, rows, presentation, onCite, focusRequest }: TimelineProps): ReactElement {
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
	const items = virtualizer.getVirtualItems();
	return (
		<section aria-labelledby="timeline-heading" className="timeline" ref={scroller}>
			<h2 id="timeline-heading" className="visually-hidden">Messages</h2>
			{rows.length === 0 && <p className="empty">No messages in this room yet.</p>}
			<ol ref={list} aria-label={`Messages, ${rows.length.toLocaleString('en-US')} total`} className="rows" onKeyDown={move} style={{ height: virtualizer.getTotalSize() }} data-total={rows.length} data-mounted={items.length} data-overscan={overscan} data-sizing={sizer.kind} data-geometry={sizer.key}>
				{items.map((item) => { const row = rows[item.index]; return row && (
					<li key={item.key} className="row" data-index={item.index} data-estimate={item.size} data-sizing={classify(row).kind} aria-setsize={rows.length} aria-posinset={item.index + 1} ref={virtualizer.measureElement} style={{ transform: `translateY(${item.start}px)` }}>
						<MessageRow store={store} streamId={streamId} row={row} presentation={presentation} active={item.index === active} onCite={onCite} />
					</li>); })}
			</ol>
		</section>
	);
}
