import { useState, type KeyboardEvent, type ReactElement, type SyntheticEvent } from 'react';
import type { Driver, Failure } from '../fixture/driver.ts';
import { useDriverState } from '../fixture/driver.ts';
import { composer as composerStatus } from '../projection.ts';
import { useSelector, type Store } from '../store.ts';

export type Digest = (text: string) => Promise<string>;
export const subtleDigest: Digest = async (text) => {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return `sha256:${[...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
};

interface ComposerProps { readonly store: Store; readonly driver: Driver; readonly streamId: string; readonly disabled: boolean; readonly digest: Digest }

// The draft lives in the core (draft input); the textarea is a projection of it, so it survives snapshot reloads
// and is erased by revocation without any component state of its own.
export function Composer({ store, driver, streamId, disabled, digest }: ComposerProps): ReactElement {
	const driverState = useDriverState(driver);
	const drafts = useSelector(store, (state) => state.drafts);
	const commands = useSelector(store, (state) => state.commands);
	const status = composerStatus({ ...store.getState(), drafts, commands }, streamId, undefined);
	const [busy, setBusy] = useState(false);
	const pending = status.pending.filter((c) => c.tag === 'pending');
	const submit = (event?: SyntheticEvent): void => {
		event?.preventDefault();
		if (disabled || busy || status.draft.trim() === '') return;
		setBusy(true);
		void digest(status.draft).then((requestDigest) => { driver.submit(crypto.randomUUID(), requestDigest, status.draft); }).finally(() => { setBusy(false); });
	};
	const keys = (event: KeyboardEvent<HTMLTextAreaElement>): void => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } };
	return (
		<form className="composer" aria-labelledby="composer-heading" onSubmit={submit}>
			<h2 id="composer-heading" className="visually-hidden">Composer</h2>
			<label htmlFor="composer-text">Message (Enter sends, Shift+Enter adds a line)</label>
			<textarea id="composer-text" value={status.draft} disabled={disabled} rows={3} onKeyDown={keys} onChange={(event) => { store.dispatch({ type: 'draft', streamId, text: event.target.value }); }} aria-describedby="composer-state" />
			<div className="composer-actions">
				<button type="submit" disabled={disabled || busy}>Send</button>
				<p id="composer-state" className="composer-state" data-decision={driverState.decision ?? ''}>
					{disabled ? 'Composer unavailable: no room loaded or access revoked.' : status.draft ? `Unsent draft (${status.draft.length} characters).` : 'No draft.'}
					{pending.length > 0 && ` ${pending.length} pending command${pending.length === 1 ? '' : 's'} awaiting a receipt.`}
					{driverState.decision && ` Last core decision: ${driverState.decision}.`}
					{!driverState.online && ' Offline: a send waits for a connection and is never queued as accepted.'}
				</p>
			</div>
			{pending.length > 0 && <div className="composer-actions" aria-label="Fixture receipt controls">
				<button type="button" onClick={() => { driver.deliverReceipt(); }}>Deliver fixture receipt</button>
				{(['timeout', 'stale_revision', 'denied', 'rate_limited'] as Failure[]).map((failure) => <button type="button" key={failure} onClick={() => { driver.fail(failure); }}>Fail send: {failure.replaceAll('_', ' ')}</button>)}
			</div>}
		</form>
	);
}
