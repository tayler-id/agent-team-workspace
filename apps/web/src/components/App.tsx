import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactElement } from 'react';
import { useDriverState, type Driver } from '../fixture/driver.ts';
import { rows as projectRows, status as projectStatus, thread as projectThread, type Row } from '../projection.ts';
import { useSelector, type Store } from '../store.ts';
import { ApprovalCard, Badge, CenterAnswer, EvidenceCard, RunCard, TaskCard } from './Cards.tsx';
import { Composer, subtleDigest, type Digest } from './Composer.tsx';
import { FixtureControls } from './FixtureControls.tsx';
import { Timeline } from './Timeline.tsx';

export interface AppProps { readonly store: Store; readonly driver: Driver; readonly digest?: Digest }
type Pane = { readonly kind: 'none' } | { readonly kind: 'thread'; readonly rootId: string; readonly trigger: string } | { readonly kind: 'cards'; readonly trigger: string };
const phoneQuery = '(max-width: 700px)';
const media = (): MediaQueryList | undefined => typeof window.matchMedia === 'function' ? window.matchMedia(phoneQuery) : undefined;
const subscribePhone = (listener: () => void): (() => void) => { const list = media(); list?.addEventListener('change', listener); return () => { list?.removeEventListener('change', listener); }; };
const isPhone = (): boolean => media()?.matches ?? false;
const announceDelay = 2000;

export function App({ store, driver, digest = subtleDigest }: AppProps): ReactElement {
	const { fixture } = driver;
	const streamId = fixture.streamId;
	const room = useSelector(store, (state) => state.rooms.find((r) => r.streamId === streamId));
	const connection = useDriverState(driver);
	const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
	const [pane, setPane] = useState<Pane>({ kind: 'none' });
	const [notice, setNotice] = useState('');
	const [announcement, setAnnouncement] = useState('');
	const [focusRequest, setFocusRequest] = useState<string | undefined>(undefined);
	const paneHeading = useRef<HTMLHeadingElement>(null);
	const seenCount = useRef<number | undefined>(undefined);
	const status = projectStatus(room, connection);
	// Rows are rebuilt only when the message list or reading position changes; run-only events keep every Row reference.
	const messages = room?.messages, lastSeen = room?.lastSeen;
	const rows = useMemo(() => projectRows(room, fixture.presentation), [messages, lastSeen, fixture.presentation]);

	// New rows announce as one batched count, never each body; the count resets on snapshot replacement.
	useEffect(() => {
		const count = rows.length;
		const previous = seenCount.current;
		seenCount.current = count;
		if (previous === undefined || count <= previous) return;
		const timer = setTimeout(() => { setAnnouncement(`${count - previous} new message${count - previous === 1 ? '' : 's'}.`); }, announceDelay);
		return () => { clearTimeout(timer); };
	}, [rows.length]);
	useEffect(() => { if (pane.kind !== 'none') paneHeading.current?.focus(); }, [pane]);
	const closePane = (): void => {
		const trigger = pane.kind === 'none' ? undefined : pane.trigger;
		setPane({ kind: 'none' });
		if (trigger) setTimeout(() => { document.getElementById(trigger)?.focus(); }, 0);
	};
	const openThread = useCallback((rootId: string, trigger: string): void => { setPane({ kind: 'thread', rootId, trigger }); }, []);
	const loadedOlder = useCallback((count: number): void => { setNotice(`Loaded ${count} older messages.`); }, []);
	const cite = (messageId: string): void => { setPane({ kind: 'none' }); setFocusRequest(undefined); setTimeout(() => { setFocusRequest(messageId); }, 0); };
	const paneOpen = pane.kind !== 'none';
	const composerDisabled = !room || status.phase === 'revoked';
	const threadRows: readonly Row[] = pane.kind === 'thread' ? projectThread(rows, pane.rootId) : [];
	const rootDeleted = pane.kind === 'thread' && threadRows[0]?.message.content.tag === 'tombstone';

	return (
		<div className={phone ? 'shell phone' : 'shell'} data-viewport={phone ? 'phone' : 'desktop'}>
			<a href="#timeline-heading" className="skip-link">Skip to messages</a>
			<header className="room-header">
				<p className="kicker">Engineering fixture - visual design pending</p>
				{phone && paneOpen && <button type="button" onClick={closePane} aria-label="Back to timeline">← Back</button>}
				<h1>{fixture.project.name} · {fixture.project.room}</h1>
				<p className="meta">
					<Badge state={fixture.project.lifecycle} />
					<span>{fixture.project.agent} (read-only answers)</span>
					<span>{fixture.project.members} members</span>
					<span data-unread={status.unread}>{status.unread} unread</span>
					{room && status.unread > 0 && <button type="button" onClick={() => { driver.markSeen(room.cursor); }}>Mark room as read</button>}
				</p>
				<div role="status" aria-live="polite" className="status" data-phase={status.phase} data-online={connection.online}>
					<Badge state={status.phase} live={status.phase === 'live'} /> <span>{status.label}. {status.detail}</span> <span>{connection.online ? 'Online.' : 'Offline.'}</span> {notice && <span>{notice}</span>} {announcement && <span>{announcement}</span>}
				</div>
				{status.phase === 'error' && <p role="alert" className="alert">{status.detail}</p>}
			</header>
			<nav aria-label="Rooms" className="rail">
				<ul>
					<li><a href="#timeline-heading" aria-current="page">{fixture.project.room} <span className="count">{status.unread}</span></a></li>
					<li><button type="button" id="open-cards" onClick={() => { setPane({ kind: 'cards', trigger: 'open-cards' }); }}>Runs, tasks and approvals</button></li>
				</ul>
			</nav>
			<main hidden={phone && paneOpen} className="main">
				{status.phase === 'empty' && <section className="empty" aria-labelledby="empty-heading"><h2 id="empty-heading">No room loaded</h2><p>{status.detail}</p><button type="button" onClick={() => { driver.loadSnapshot(); }}>Load fixture snapshot</button></section>}
				{status.phase === 'loading' && <p className="empty" aria-busy="true">Loading snapshot…</p>}
				{status.phase === 'revoked' && <section className="empty" aria-labelledby="revoked-heading"><h2 id="revoked-heading">Access revoked</h2><p>Drafts, commands and rooms were cleared.</p><button type="button" onClick={() => { driver.loadSnapshot(); }}>Load fixture snapshot again</button></section>}
				{(status.phase === 'resync' || status.phase === 'upgrade') && <p className="banner">{status.label}: {status.detail} <button type="button" onClick={() => { driver.loadSnapshot(); }}>Load fresh snapshot</button></p>}
				{room && <Timeline store={store} streamId={streamId} rows={rows} presentation={fixture.presentation} onOpenThread={openThread} onLoadedOlder={loadedOlder} focusRequest={focusRequest} />}
				{room && <CenterAnswer answer={fixture.answer} onCite={cite} />}
				<Composer store={store} driver={driver} streamId={streamId} disabled={composerDisabled} digest={digest} />
			</main>
			<aside aria-labelledby="pane-heading" className="pane" hidden={!paneOpen} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); closePane(); } }}>
				{pane.kind === 'thread' && <>
					<h2 id="pane-heading" ref={paneHeading} tabIndex={-1}>Thread{rootDeleted ? ' (root deleted)' : ''}</h2>
					<button type="button" onClick={closePane}>Close thread</button>
					<ol aria-label="Thread messages">{threadRows.map((row) => <li key={row.message.id}><span className="author">{row.author.name}</span> {row.message.content.tag === 'visible' ? row.message.content.body : 'Deleted message'}</li>)}</ol>
					{threadRows.length <= 1 && <p>No replies yet.</p>}
				</>}
				{pane.kind === 'cards' && <>
					<h2 id="pane-heading" ref={paneHeading} tabIndex={-1}>Runs, tasks and approvals</h2>
					<button type="button" onClick={closePane}>Close</button>
					{room?.runs.map((run) => <RunCard key={run.id} store={store} streamId={streamId} runId={run.id} shown={fixture.runs[run.id]} onExplain={setNotice} />)}
					<TaskCard card={fixture.cards.task} onExplain={setNotice} />
					<EvidenceCard card={fixture.cards.evidence} />
					<ApprovalCard card={fixture.cards.approval} onExplain={setNotice} />
				</>}
			</aside>
			<FixtureControls store={store} driver={driver} onReport={setNotice} />
		</div>
	);
}
