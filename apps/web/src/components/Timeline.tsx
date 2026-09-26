import { messageById, segments, useClientSelector, type Presentation, type Row } from '@agora/web-framework';
import { memo, useRef, type ReactElement } from 'react';
import { overscan, rowDomId, useTimelineVirtualizer } from '../framework/index.ts';
import { displayMessageTime } from '../host/index.ts';
import { classify } from '../rows.ts';

export const kindLabel: Readonly<Record<Row['author']['kind'], string>> = { human: 'human', agent: 'local agent (fixture)', system: 'system' };

interface RowProps { readonly streamId: string; readonly row: Row; readonly presentation: Presentation; readonly active: boolean; readonly unreadCount: number; readonly onCite: (messageId: string) => void; readonly onAnswer?: ((messageId: string) => void) | undefined; readonly answerBusy?: boolean | undefined; readonly answered?: boolean | undefined }

// Each row subscribes to its own message reference. An unrelated connection or command update leaves the
// reference untouched, so the row does not commit; data-commits exposes the count to the browser verification.
const MessageRow = memo(function MessageRow({ streamId, row, presentation, active, unreadCount, onCite, onAnswer, answerBusy, answered }: RowProps): ReactElement {
	const message = useClientSelector((state) => messageById(state.rooms.find((r) => r.streamId === streamId), row.message.id)) ?? row.message;
	const commits = useRef(0);
	commits.current += 1;
	const deleted = message.content.tag === 'tombstone';
	const kind = kindLabel[row.author.kind];
	const shown = displayMessageTime(row.time);
	const label = `${row.author.name}, ${kind}, ${shown.spoken}${deleted ? ', deleted message' : ''}${row.edited ? ', edited' : ''}${row.unread ? ', unread' : ''}`;
	return (
		<article id={rowDomId(message.id)} tabIndex={active ? 0 : -1} aria-label={label} data-message-id={message.id} data-unread={row.unread} data-commits={commits.current} data-seq={message.createdSeq} data-revision={message.revision} className={row.unread ? 'message unread' : 'message'}>
			{row.firstUnread && (
				<div role="separator" aria-label={`Unread messages start here, ${unreadCount} new`} className="unread-boundary">
					<span className="chip live"><span className="dot" aria-hidden="true" />{unreadCount} new</span>
					<i aria-hidden="true" />
				</div>
			)}
			<div className="meta">
				<span className="author">{row.author.name}</span>
				<span className="kicker">{kind}</span>
				<time dateTime={shown.dateTime} title={shown.inspected}>{shown.visible}</time>
				{row.edited && <span className="kicker">edited (revision {message.revision})</span>}
			</div>
			{deleted ? <p className="tombstone">Deleted message (tombstone, revision {message.revision})</p> : segments(message.content.body).map((segment, i) => segment.kind === 'code' ? <pre key={i}><code>{segment.value}</code></pre> : <p key={i} dir="auto">{segment.value}</p>)}
			{onAnswer && row.author.kind === 'human' && <button type="button" disabled={Boolean(answerBusy) || Boolean(answered)} onClick={() => { onAnswer(message.id); }}>{answered ? 'Quoted locally' : 'Quote locally'}</button>}
			{row.citations.length > 0 && <div className="citations" aria-label="Citations">{row.citations.map((id) => <button type="button" key={id} tabIndex={-1} onClick={() => { onCite(id); }}>Cited: {presentation.authors[id]?.name ?? 'a message'}</button>)}</div>}
		</article>
	);
});

export interface TimelineProps { readonly streamId: string; readonly rows: readonly Row[]; readonly presentation: Presentation; readonly onCite: (messageId: string) => void; readonly focusRequest: string | undefined; readonly onAnswer?: ((messageId: string) => void) | undefined; readonly answerBusy?: boolean | undefined }

// A pure render over the framework's useTimelineVirtualizer view-model: no raw effects or DOM globals live here,
// per the Host/framework-only exemption in scripts/renderer-policy.ts (agora/renderer-footgun).
export function Timeline({ streamId, rows, presentation, onCite, focusRequest, onAnswer, answerBusy }: TimelineProps): ReactElement {
	const { scroller, list, items, totalSize, active, sizerKind, geometryKeyValue, measureElement, move } = useTimelineVirtualizer(rows, focusRequest);
	const answered = new Set(rows.filter((row) => row.author.kind === 'agent').flatMap((row) => row.citations));
	const unreadCount = rows.reduce((count, row) => row.unread ? count + 1 : count, 0);
	return (
		<section aria-labelledby="timeline-heading" className="timeline" ref={scroller}>
			<h2 id="timeline-heading" className="visually-hidden">Messages</h2>
			{rows.length === 0 && <p className="empty">No messages in this room yet.</p>}
			<ol ref={list} aria-label={`Messages, ${rows.length.toLocaleString('en-US')} total`} className="rows" onKeyDown={move} style={{ height: totalSize }} data-total={rows.length} data-mounted={items.length} data-overscan={overscan} data-sizing={sizerKind} data-geometry={geometryKeyValue}>
				{items.map((item) => { const row = rows[item.index]; return row && (
					<li key={item.key} className="row" data-index={item.index} data-estimate={item.size} data-sizing={classify(row).kind} aria-setsize={rows.length} aria-posinset={item.index + 1} ref={measureElement} style={{ transform: `translateY(${item.start}px)` }}>
						<MessageRow streamId={streamId} row={row} presentation={presentation} active={item.index === active} unreadCount={unreadCount} onCite={onCite} onAnswer={onAnswer} answerBusy={answerBusy} answered={answered.has(row.message.id)} />
					</li>); })}
			</ol>
		</section>
	);
}
