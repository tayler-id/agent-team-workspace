import { composer as composerStatus, rows as projectRows, status as projectStatus, useClientSelector, useDeferredFocus, useDelayedAnnouncement, useDiscardCommand, useEnvironment, useMediaQuery, useRoomCommands, useSetDraft, useStaleSafeBusy, useTransportState, type ComposerCommand, type Presentation, type RoomHeader } from '@agora/web-framework';
import { useMemo, useState, type ReactElement, type SyntheticEvent } from 'react';
import { useHashDeepLink } from '../framework/index.ts';
import { Timeline } from './Timeline.tsx';

export interface AppProps { readonly header: RoomHeader; readonly presentation: Presentation; readonly live?: boolean; readonly onAnswer?: (ids: readonly string[]) => Promise<void> }
const phoneQuery = '(max-width: 700px)';
const announceDelay = 2000;

// Truthful per-command labels: `sending`/`retrying`/`waiting_connection` are the transport's own live attempt, `delivered`/`failed` are client-core's own settled outcome.
const commandLabel: Readonly<Record<ComposerCommand['state'], (reason: string | undefined) => string>> = {
	sending: () => 'Sending…',
	retrying: () => 'Retrying…',
	waiting_connection: () => 'Waiting for a connection…',
	delivered: () => 'Delivered.',
	failed: (reason) => `Failed: ${reason ?? 'not sent'}.`,
};

function Composer({ streamId, disabled }: { readonly streamId: string; readonly disabled: boolean }): ReactElement {
	const connection = useTransportState();
	const drafts = useClientSelector((state) => state.drafts);
	const commands = useClientSelector((state) => state.commands);
	const setDraft = useSetDraft();
	const discard = useDiscardCommand();
	const { submit } = useRoomCommands();
	const { busy, run } = useStaleSafeBusy();
	const status = composerStatus({ rooms: [], drafts, commands }, streamId, connection.decision, connection.sendPhase);
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
			<textarea id="composer-text" value={status.draft} disabled={disabled} rows={3} maxLength={4096} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSubmit(); } }} onChange={(event) => { setDraft(streamId, event.target.value); }} aria-describedby="composer-state" />
			<div className="composer-actions">
				<button type="submit" disabled={disabled || busy}>Send</button>
				<p id="composer-state" className="composer-state">
					{disabled ? 'Composer unavailable: no room loaded or access revoked.' : status.draft ? `Unsent draft (${status.draft.length} characters).` : 'No draft.'}
					{!connection.online && ' Offline: a send waits for a connection and is never queued as accepted.'}
					{connection.link === 'disconnected' && ' Disconnected: a send waits for Reconnect and is never queued as accepted.'}
				</p>
				{status.commands.length > 0 && (
					<ul className="composer-commands" aria-live="polite" aria-label="Send status">
						{status.commands.map((command) => (
							<li key={command.commandId} data-command-state={command.state}>
								<span>{commandLabel[command.state](command.reason)}</span>
								{command.state === 'failed' && <button type="button" onClick={() => { discard(command.commandId); }}>Discard, edit and send again</button>}
							</li>
						))}
					</ul>
				)}
			</div>
		</form>
	);
}

export function App({ header, presentation, live = false, onAnswer }: AppProps): ReactElement {
	const [answerState, setAnswerState] = useState('');
	const [answerBusy, setAnswerBusy] = useState(false);
	const answer = onAnswer && ((id: string): void => {
		if (answerBusy) return;
		setAnswerBusy(true); setAnswerState('Posting local quoted response…');
		void onAnswer([id]).then(() => { setAnswerState('Local response committed; waiting for room event.'); }).catch((error: unknown) => { setAnswerState(`Local response not posted: ${String(error)}`); }).finally(() => { setAnswerBusy(false); });
	});
	const { transport } = useEnvironment();
	const streamId = transport.streamId;
	const room = useClientSelector((state) => state.rooms.find((r) => r.streamId === streamId));
	const connection = useTransportState();
	const phone = useMediaQuery(phoneQuery);
	const commands = useRoomCommands();
	const [focusRequest, requestFocus] = useDeferredFocus();
	useHashDeepLink(requestFocus);
	const roomStatus = projectStatus(room, connection);
	const messages = room?.messages, lastSeen = room?.lastSeen;
	const projected = useMemo(() => projectRows(room, presentation), [messages, lastSeen, presentation]);
	const announcement = useDelayedAnnouncement(room?.unread, announceDelay);
	const composerDisabled = !room || roomStatus.phase === 'revoked';
	return (
		<div className={phone ? 'shell phone' : 'shell'} data-viewport={phone ? 'phone' : 'desktop'}>
			<a href="#timeline-heading" className="skip-link">Skip to messages</a>
			<header className="room-header">
				<p className="kicker">{live ? 'LOCAL DEVELOPMENT' : 'ENGINEERING FIXTURE'}</p>
				<h1 className="crumb"><span className="crumb-project">{header.project} /</span> <span className="crumb-room">{header.room}</span></h1>
				<p className="meta">
					<span className="badge" data-state={header.lifecycle}>{header.lifecycle.replaceAll('_', ' ')}</span>
					<span className="badge" data-agent-state="not_enabled">project agent · not enabled</span>
					<span>{header.agentLabel}: {live ? 'local runtime, no model provider' : 'read-only, local fixture, no live provider'}</span>
					<span>{header.members} member{header.members === 1 ? '' : 's'}</span>
					<span data-unread={roomStatus.unread}>{roomStatus.unread} unread</span>
					{room && roomStatus.unread > 0 && <button type="button" onClick={() => { commands.markSeen(room.cursor); }}>Mark room as read</button>}
				</p>
				<div role="status" aria-live="polite" className="status" data-phase={roomStatus.phase} data-online={connection.online} data-link={connection.link}>
					<span className="badge" data-state={roomStatus.phase}>{roomStatus.label}</span> <span>{roomStatus.detail}</span> <span>{connection.online ? 'Browser network available.' : 'Browser network unavailable.'}</span> {announcement && <span>{announcement}</span>}
					{room && connection.link === 'disconnected' && <button type="button" onClick={commands.reconnect}>Reconnect</button>}
					{room && connection.link !== 'disconnected' && <button type="button" onClick={commands.disconnect}>Disconnect</button>}
				</div>
				{roomStatus.phase === 'error' && <p role="alert" className="alert">{roomStatus.detail}</p>}
			</header>
			<main className="main">
				{roomStatus.phase === 'empty' && <section className="empty" aria-labelledby="empty-heading"><h2 id="empty-heading">No room loaded</h2><p>{roomStatus.detail}</p><button type="button" onClick={commands.loadSnapshot}>Load {live ? 'room' : 'fixture'} snapshot</button></section>}
				{roomStatus.phase === 'loading' && <p className="empty" aria-busy="true">Loading snapshot…</p>}
				{roomStatus.phase === 'revoked' && <section className="empty" aria-labelledby="revoked-heading"><h2 id="revoked-heading">Access revoked</h2><p>Drafts, commands and the room were cleared.</p><button type="button" onClick={commands.loadSnapshot}>Load {live ? 'room' : 'fixture'} snapshot again</button></section>}
				{(roomStatus.phase === 'resync' || roomStatus.phase === 'upgrade') && <p className="banner">{roomStatus.label}: {roomStatus.detail} <button type="button" onClick={commands.loadSnapshot}>Load fresh snapshot</button></p>}
				{room && <Timeline streamId={streamId} rows={projected} presentation={presentation} onCite={requestFocus} focusRequest={focusRequest} onAnswer={answer} answerBusy={answerBusy} />}
				{onAnswer && <p role="status" aria-live="polite">{answerState}</p>}
				<Composer streamId={streamId} disabled={composerDisabled} />
			</main>
		</div>
	);
}
