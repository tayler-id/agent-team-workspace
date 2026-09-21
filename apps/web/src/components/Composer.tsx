import { useState, type KeyboardEvent, type ReactElement, type SyntheticEvent } from 'react';
import { composer as composerStatus } from '../projection.ts';
import { useSelector, type Store } from '../store.ts';
import { useTransportState, type RoomTransportPort } from '../transport/port.ts';

export type Digest = (text: string) => Promise<string>;
export const subtleDigest: Digest = async (text) => {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return `sha256:${[...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
};

interface ComposerProps { readonly store: Store; readonly port: RoomTransportPort; readonly streamId: string; readonly disabled: boolean; readonly digest: Digest }

// The draft lives in the core (draft input); the textarea is a projection of it, so it survives snapshot reloads
// and is erased by revocation without any component state of its own. Only port.submit is called: a real
// transport settles pending commands on its own, so no receipt/failure control belongs on this component.
export function Composer({ store, port, streamId, disabled, digest }: ComposerProps): ReactElement {
	const connection = useTransportState(port);
	const drafts = useSelector(store, (state) => state.drafts);
	const commands = useSelector(store, (state) => state.commands);
	const status = composerStatus({ ...store.getState(), drafts, commands }, streamId, undefined);
	const [busy, setBusy] = useState(false);
	const pending = status.pending.filter((c) => c.tag === 'pending');
	const submit = (event?: SyntheticEvent): void => {
		event?.preventDefault();
		if (disabled || busy || status.draft.trim() === '') return;
		setBusy(true);
		void digest(status.draft).then((requestDigest) => { port.submit(crypto.randomUUID(), requestDigest, status.draft); }).finally(() => { setBusy(false); });
	};
	const keys = (event: KeyboardEvent<HTMLTextAreaElement>): void => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } };
	return (
		<form className="composer" aria-labelledby="composer-heading" onSubmit={submit}>
			<h2 id="composer-heading" className="visually-hidden">Composer</h2>
			<label htmlFor="composer-text">Message (Enter sends, Shift+Enter adds a line)</label>
			<textarea id="composer-text" value={status.draft} disabled={disabled} rows={3} onKeyDown={keys} onChange={(event) => { store.dispatch({ type: 'draft', streamId, text: event.target.value }); }} aria-describedby="composer-state" />
			<div className="composer-actions">
				<button type="submit" disabled={disabled || busy}>Send</button>
				<p id="composer-state" className="composer-state">
					{disabled ? 'Composer unavailable: no room loaded or access revoked.' : status.draft ? `Unsent draft (${status.draft.length} characters).` : 'No draft.'}
					{pending.length > 0 && ` ${pending.length} pending command${pending.length === 1 ? '' : 's'} awaiting a receipt.`}
					{connection.decision && ` Last core decision: ${connection.decision}.`}
					{!connection.online && ' Offline: a send waits for a connection and is never queued as accepted.'}
				</p>
			</div>
		</form>
	);
}
