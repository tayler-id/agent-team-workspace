import { memo, useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { messageById, segments, window as windowRows, type Presentation, type Row } from '../projection.ts';
import { useSelector, type Store } from '../store.ts';

export const rowDomId = (id: string): string => `message-${id}`;
export const pageSize = 50;
export const kindLabel: Readonly<Record<Row['author']['kind'], string>> = { human: 'human', agent: 'local agent (fixture)', system: 'system' };

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
		<li className="row" data-commits={commits.current} data-seq={message.createdSeq} data-revision={message.revision}>
			{row.firstUnread && <div role="separator" aria-label="Unread messages start here" className="unread-boundary">New</div>}
			<article id={rowDomId(message.id)} tabIndex={active ? 0 : -1} aria-label={label} data-message-id={message.id} data-unread={row.unread} className={row.unread ? 'message unread' : 'message'}>
				<div className="meta">
					<span className="author">{row.author.name}</span>
					<span className="kicker">{kind}</span>
					<time dateTime={row.time}>{row.time}</time>
					{row.edited && <span className="kicker">edited (revision {message.revision})</span>}
				</div>
				{deleted ? <p className="tombstone">Deleted message (tombstone, revision {message.revision})</p> : segments(message.content.body).map((segment, i) => segment.kind === 'code' ? <pre key={i}><code>{segment.value}</code></pre> : <p key={i}>{segment.value}</p>)}
				{row.citations.length > 0 && <div className="citations" aria-label="Citations">{row.citations.map((id) => <button type="button" key={id} tabIndex={-1} onClick={() => { onCite(id); }}>Cited: {presentation.authors[id]?.name ?? 'a message'}</button>)}</div>}
			</article>
		</li>
	);
});

interface TimelineProps { readonly store: Store; readonly streamId: string; readonly rows: readonly Row[]; readonly presentation: Presentation; readonly onLoadedOlder: (count: number) => void; readonly onCite: (messageId: string) => void; readonly focusRequest: string | undefined }

export function Timeline({ store, streamId, rows, presentation, onLoadedOlder, onCite, focusRequest }: TimelineProps): ReactElement {
	const [limit, setLimit] = useState(pageSize);
	const [activeId, setActiveId] = useState<string | undefined>(undefined);
	const shown = windowRows(rows, limit);
	const ids = shown.rows.map((r) => r.message.id);
	const current = activeId && ids.includes(activeId) ? activeId : ids[ids.length - 1];
	useEffect(() => {
		if (!focusRequest) return;
		const index = rows.findIndex((r) => r.message.id === focusRequest);
		if (index < 0) return;
		const needed = rows.length - index;
		if (needed > limit) { setLimit(Math.ceil(needed / pageSize) * pageSize); return; }
		setActiveId(focusRequest);
		document.getElementById(rowDomId(focusRequest))?.focus();
	}, [focusRequest, rows, limit]);
	const move = (event: KeyboardEvent<HTMLOListElement>): void => {
		const index = current ? ids.indexOf(current) : -1;
		const target = event.key === 'ArrowDown' ? ids[index + 1] : event.key === 'ArrowUp' ? ids[index - 1] : event.key === 'Home' ? ids[0] : event.key === 'End' ? ids[ids.length - 1] : undefined;
		if (!target) return;
		event.preventDefault();
		setActiveId(target);
		document.getElementById(rowDomId(target))?.focus();
	};
	return (
		<section aria-labelledby="timeline-heading" className="timeline">
			<h2 id="timeline-heading" className="visually-hidden">Messages</h2>
			{shown.older > 0 && <button type="button" className="load-older" onClick={() => { setLimit(limit + pageSize); onLoadedOlder(Math.min(pageSize, shown.older)); }}>Load older messages ({shown.older} older)</button>}
			{rows.length === 0 && <p className="empty">No messages in this room yet.</p>}
			<ol aria-label={`Messages, showing ${shown.rows.length} of ${shown.total}`} className="rows" onKeyDown={move} data-window={shown.rows.length} data-total={shown.total}>
				{shown.rows.map((row) => <MessageRow key={row.message.id} store={store} streamId={streamId} row={row} presentation={presentation} active={row.message.id === current} onCite={onCite} />)}
			</ol>
		</section>
	);
}
