import { composer as composerStatus, messageById, rows as projectRows, segments, status as projectStatus, useClientSelector, useEnvironment, useMediaQuery, useRoomCommands, useScheduleFocus, useSetDraft, useStaleSafeBusy, useTransportState, window as windowRows, type Presentation, type RoomHeader, type Row } from '@agora/web-framework';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement, type SyntheticEvent } from 'react';

export interface AppProps { readonly header: RoomHeader; readonly presentation: Presentation }
const phoneQuery = '(max-width: 700px)';
const announceDelay = 2000;
export const rowDomId = (id: string): string => `message-${id}`;
export const pageSize = 50;
export const kindLabel: Readonly<Record<Row['author']['kind'], string>> = { human: 'human', agent: 'local agent (fixture)', system: 'system' };

const MessageRow = memo(function MessageRow({ streamId, row, presentation, active, onCite }: { readonly streamId: string; readonly row: Row; readonly presentation: Presentation; readonly active: boolean; readonly onCite: (messageId: string) => void }): ReactElement {
	const message = useClientSelector((state) => messageById(state.rooms.find((r) => r.streamId === streamId), row.message.id)) ?? row.message;
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

function Timeline({ streamId, rows, presentation, onLoadedOlder, onCite, focusRequest }: { readonly streamId: string; readonly rows: readonly Row[]; readonly presentation: Presentation; readonly onLoadedOlder: (count: number) => void; readonly onCite: (messageId: string) => void; readonly focusRequest: string | undefined }): ReactElement {
	const [limit, setLimit] = useState(pageSize);
	const [activeId, setActiveId] = useState<string | undefined>(undefined);
	const scheduleFocus = useScheduleFocus();
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
		// Sync focus after the limit window includes the target (effect re-runs once setLimit commits).
		scheduleFocus(rowDomId(focusRequest));
	}, [focusRequest, rows, limit, scheduleFocus]);
	const move = (event: KeyboardEvent<HTMLOListElement>): void => {
		const index = current ? ids.indexOf(current) : -1;
		const target = event.key === 'ArrowDown' ? ids[index + 1] : event.key === 'ArrowUp' ? ids[index - 1] : event.key === 'Home' ? ids[0] : event.key === 'End' ? ids[ids.length - 1] : undefined;
		if (!target) return;
		event.preventDefault();
		setActiveId(target);
		scheduleFocus(rowDomId(target));
	};
	return (
		<section aria-labelledby="timeline-heading" className="timeline">
			<h2 id="timeline-heading" className="visually-hidden">Messages</h2>
			{shown.older > 0 && <button type="button" className="load-older" onClick={() => { setLimit(limit + pageSize); onLoadedOlder(Math.min(pageSize, shown.older)); }}>Load older messages ({shown.older} older)</button>}
			{rows.length === 0 && <p className="empty">No messages in this room yet.</p>}
			<ol aria-label={`Messages, showing ${shown.rows.length} of ${shown.total}`} className="rows" onKeyDown={move} data-window={shown.rows.length} data-total={shown.total}>
				{shown.rows.map((row) => <MessageRow key={row.message.id} streamId={streamId} row={row} presentation={presentation} active={row.message.id === current} onCite={onCite} />)}
			</ol>
		</section>
	);
}

function Composer({ streamId, disabled }: { readonly streamId: string; readonly disabled: boolean }): ReactElement {
	const connection = useTransportState();
	const drafts = useClientSelector((state) => state.drafts);
	const commands = useClientSelector((state) => state.commands);
	const setDraft = useSetDraft();
	const { submit } = useRoomCommands();
	const { busy, run } = useStaleSafeBusy();
	const status = composerStatus({ rooms: [], drafts, commands }, streamId, undefined);
	const pending = status.pending.filter((c) => c.tag === 'pending').length;
	const onSubmit = (event?: SyntheticEvent): void => {
		event?.preventDefault();
		if (disabled || busy || status.draft.trim() === '') return;
		const text = status.draft;
		run(async () => { await submit(text); });
	};
	return (
		<form className="composer" aria-labelledby="composer-heading" onSubmit={onSubmit}>
			<h2 id="composer-heading" className="visually-hidden">Composer</h2>
			<label htmlFor="composer-text">Message (Enter sends, Shift+Enter adds a line)</label>
			<textarea id="composer-text" value={status.draft} disabled={disabled} rows={3} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSubmit(); } }} onChange={(event) => { setDraft(streamId, event.target.value); }} aria-describedby="composer-state" />
			<div className="composer-actions">
				<button type="submit" disabled={disabled || busy}>Send</button>
				<p id="composer-state" className="composer-state">
					{disabled ? 'Composer unavailable: no room loaded or access revoked.' : status.draft ? `Unsent draft (${status.draft.length} characters).` : 'No draft.'}
					{pending > 0 && ` ${pending} pending command${pending === 1 ? '' : 's'} awaiting a receipt.`}
					{connection.decision && ` Last core decision: ${connection.decision}.`}
					{!connection.online && ' Offline: a send waits for a connection and is never queued as accepted.'}
				</p>
			</div>
		</form>
	);
}

export function App({ header, presentation }: AppProps): ReactElement {
	const { transport } = useEnvironment();
	const streamId = transport.streamId;
	const room = useClientSelector((state) => state.rooms.find((r) => r.streamId === streamId));
	const connection = useTransportState();
	const phone = useMediaQuery(phoneQuery);
	const commands = useRoomCommands();
	const [notice, setNotice] = useState('');
	const [announcement, setAnnouncement] = useState('');
	const [focusRequest, setFocusRequest] = useState<string | undefined>(undefined);
	const seenCount = useRef<number | undefined>(undefined);
	const roomStatus = projectStatus(room, connection);
	const messages = room?.messages, lastSeen = room?.lastSeen;
	const projected = useMemo(() => projectRows(room, presentation), [messages, lastSeen, presentation]);
	useEffect(() => {
		const count = projected.length;
		const previous = seenCount.current;
		seenCount.current = count;
		if (previous === undefined || count <= previous) return;
		const timer = setTimeout(() => { setAnnouncement(`${count - previous} new message${count - previous === 1 ? '' : 's'}.`); }, announceDelay);
		return () => { clearTimeout(timer); };
	}, [projected.length]);
	const loadedOlder = useCallback((count: number): void => { setNotice(`Loaded ${count} older messages.`); }, []);
	const cite = useCallback((messageId: string): void => { setFocusRequest(undefined); setTimeout(() => { setFocusRequest(messageId); }, 0); }, []);
	const composerDisabled = !room || roomStatus.phase === 'revoked';
	return (
		<div className={phone ? 'shell phone' : 'shell'} data-viewport={phone ? 'phone' : 'desktop'}>
			<a href="#timeline-heading" className="skip-link">Skip to messages</a>
			<header className="room-header">
				<p className="kicker">Engineering fixture - visual design pending</p>
				<h1>{header.project} · {header.room}</h1>
				<p className="meta">
					<span className="badge" data-state={header.lifecycle}>{header.lifecycle.replaceAll('_', ' ')}</span>
					<span>{header.agentLabel} (read-only, local fixture, no live provider)</span>
					<span>{header.members} members</span>
					<span data-unread={roomStatus.unread}>{roomStatus.unread} unread</span>
					{room && roomStatus.unread > 0 && <button type="button" onClick={() => { commands.markSeen(room.cursor); }}>Mark room as read</button>}
				</p>
				<div role="status" aria-live="polite" className="status" data-phase={roomStatus.phase} data-online={connection.online}>
					<span className="badge" data-state={roomStatus.phase}>{roomStatus.label}</span> <span>{roomStatus.detail}</span> <span>{connection.online ? 'Online.' : 'Offline.'}</span> {notice && <span>{notice}</span>} {announcement && <span>{announcement}</span>}
				</div>
				{roomStatus.phase === 'error' && <p role="alert" className="alert">{roomStatus.detail}</p>}
			</header>
			<main className="main">
				{roomStatus.phase === 'empty' && <section className="empty" aria-labelledby="empty-heading"><h2 id="empty-heading">No room loaded</h2><p>{roomStatus.detail}</p><button type="button" onClick={commands.loadSnapshot}>Load fixture snapshot</button></section>}
				{roomStatus.phase === 'loading' && <p className="empty" aria-busy="true">Loading snapshot…</p>}
				{roomStatus.phase === 'revoked' && <section className="empty" aria-labelledby="revoked-heading"><h2 id="revoked-heading">Access revoked</h2><p>Drafts, commands and the room were cleared.</p><button type="button" onClick={commands.loadSnapshot}>Load fixture snapshot again</button></section>}
				{(roomStatus.phase === 'resync' || roomStatus.phase === 'upgrade') && <p className="banner">{roomStatus.label}: {roomStatus.detail} <button type="button" onClick={commands.loadSnapshot}>Load fresh snapshot</button></p>}
				{room && <Timeline streamId={streamId} rows={projected} presentation={presentation} onLoadedOlder={loadedOlder} onCite={cite} focusRequest={focusRequest} />}
				<Composer streamId={streamId} disabled={composerDisabled} />
			</main>
		</div>
	);
}
