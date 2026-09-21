import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactElement } from 'react';
import { rows as projectRows, status as projectStatus, type Presentation } from '../projection.ts';
import { useSelector, type Store } from '../store.ts';
import { type RoomHeader, type RoomTransportPort, useTransportState } from '../transport/port.ts';
import { Composer, subtleDigest, type Digest } from './Composer.tsx';
import { Timeline } from './Timeline.tsx';

export interface AppProps { readonly store: Store; readonly port: RoomTransportPort; readonly header: RoomHeader; readonly presentation: Presentation; readonly digest?: Digest }
const phoneQuery = '(max-width: 700px)';
const media = (): MediaQueryList | undefined => typeof window.matchMedia === 'function' ? window.matchMedia(phoneQuery) : undefined;
const subscribePhone = (listener: () => void): (() => void) => { const list = media(); list?.addEventListener('change', listener); return () => { list?.removeEventListener('change', listener); }; };
const isPhone = (): boolean => media()?.matches ?? false;
const announceDelay = 2000;

// Depends only on the narrow RoomTransportPort, a RoomHeader and a Presentation: all three are neutral types a
// later real transport can supply directly, so no component here imports the fixture module.
export function App({ store, port, header, presentation, digest = subtleDigest }: AppProps): ReactElement {
	const streamId = port.streamId;
	const room = useSelector(store, (state) => state.rooms.find((r) => r.streamId === streamId));
	const connection = useTransportState(port);
	const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
	const [notice, setNotice] = useState('');
	const [announcement, setAnnouncement] = useState('');
	const [focusRequest, setFocusRequest] = useState<string | undefined>(undefined);
	const seenCount = useRef<number | undefined>(undefined);
	const status = projectStatus(room, connection);
	// Rows are rebuilt only when the message list or reading position changes; an unrelated connection or
	// command update leaves this reference untouched, so the timeline below does not recommit any row.
	const messages = room?.messages, lastSeen = room?.lastSeen;
	const rows = useMemo(() => projectRows(room, presentation), [messages, lastSeen, presentation]);

	// New rows announce as one batched count, never each body; the count resets on snapshot replacement.
	useEffect(() => {
		const count = rows.length;
		const previous = seenCount.current;
		seenCount.current = count;
		if (previous === undefined || count <= previous) return;
		const timer = setTimeout(() => { setAnnouncement(`${count - previous} new message${count - previous === 1 ? '' : 's'}.`); }, announceDelay);
		return () => { clearTimeout(timer); };
	}, [rows.length]);
	// Stable across renders so an unrelated connection or command update does not break MessageRow's memoization.
	const loadedOlder = useCallback((count: number): void => { setNotice(`Loaded ${count} older messages.`); }, []);
	const cite = useCallback((messageId: string): void => { setFocusRequest(undefined); setTimeout(() => { setFocusRequest(messageId); }, 0); }, []);
	const composerDisabled = !room || status.phase === 'revoked';

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
					<span data-unread={status.unread}>{status.unread} unread</span>
					{room && status.unread > 0 && <button type="button" onClick={() => { port.markSeen(room.cursor); }}>Mark room as read</button>}
				</p>
				<div role="status" aria-live="polite" className="status" data-phase={status.phase} data-online={connection.online}>
					<span className="badge" data-state={status.phase}>{status.label}</span> <span>{status.detail}</span> <span>{connection.online ? 'Online.' : 'Offline.'}</span> {notice && <span>{notice}</span>} {announcement && <span>{announcement}</span>}
				</div>
				{status.phase === 'error' && <p role="alert" className="alert">{status.detail}</p>}
			</header>
			<main className="main">
				{status.phase === 'empty' && <section className="empty" aria-labelledby="empty-heading"><h2 id="empty-heading">No room loaded</h2><p>{status.detail}</p><button type="button" onClick={port.loadSnapshot}>Load fixture snapshot</button></section>}
				{status.phase === 'loading' && <p className="empty" aria-busy="true">Loading snapshot…</p>}
				{status.phase === 'revoked' && <section className="empty" aria-labelledby="revoked-heading"><h2 id="revoked-heading">Access revoked</h2><p>Drafts, commands and the room were cleared.</p><button type="button" onClick={port.loadSnapshot}>Load fixture snapshot again</button></section>}
				{(status.phase === 'resync' || status.phase === 'upgrade') && <p className="banner">{status.label}: {status.detail} <button type="button" onClick={port.loadSnapshot}>Load fresh snapshot</button></p>}
				{room && <Timeline store={store} streamId={streamId} rows={rows} presentation={presentation} onLoadedOlder={loadedOlder} onCite={cite} focusRequest={focusRequest} />}
				<Composer store={store} port={port} streamId={streamId} disabled={composerDisabled} digest={digest} />
			</main>
		</div>
	);
}
