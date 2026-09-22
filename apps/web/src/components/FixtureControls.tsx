import type { ReactElement } from 'react';
import type { Failure, FixtureTransport } from '../fixture/fixtureTransport.ts';
import { useTranscript, type Store } from '../store.ts';
import { useTransportState } from '../transport/port.ts';

interface Props { readonly store: Store; readonly transport: FixtureTransport }
const failures: readonly Failure[] = ['timeout', 'stale_revision', 'denied', 'rate_limited'];

// Development-only scenario buttons. Each dispatches validated fixture inputs through the concrete
// FixtureTransport; only this component may import it, never App, Timeline or Composer.
export function FixtureControls({ store, transport }: Props): ReactElement {
	const state = useTransportState(transport);
	const transcript = useTranscript(store);
	const last = transcript[transcript.length - 1];
	const actions: readonly [string, () => void][] = [
		['Load snapshot', () => { transport.loadSnapshot(); }],
		['Load invalid snapshot', () => { transport.loadInvalidSnapshot(); }],
		['Replay next event', () => { transport.replayNext(); }],
		['Replay all events', () => { transport.replayAll(); }],
		['Duplicate last event', () => { transport.duplicateLast(); }],
		['Skip one event (gap)', () => { transport.skipOne(); }],
		['Fill gap', () => { transport.fillGap(); }],
		['Unsupported event', () => { transport.unsupported(); }],
		['Resync', () => { transport.resync(); }],
		[state.online ? 'Go offline' : 'Go online', () => { transport.setOnline(!state.online); }],
		['Revoke access', () => { transport.revoke(); }],
		['Load large room (50,000)', () => { transport.loadLargeRoom(50_000); }],
		['Append 100 messages', () => { transport.appendLarge(100); }],
		['Deliver fixture receipt', () => { transport.deliverReceipt(); }],
		...failures.map((failure): [string, () => void] => [`Fail send: ${failure.replaceAll('_', ' ')}`, () => { transport.fail(failure); }]),
	];
	return (
		<section aria-labelledby="fixture-heading" className="fixture-controls">
			<h2 id="fixture-heading">Fixture controls (development only)</h2>
			<p className="kicker">Engineering fixture - visual design pending. These buttons replace a transport; nothing here is product authority.</p>
			<div className="button-row">{actions.map(([label, run]) => <button type="button" key={label} onClick={run}>{label}</button>)}</div>
			<dl aria-label="Last transition">
				<dt>Input</dt><dd data-last-input={last?.input ?? ''}>{last?.input ?? 'none'}</dd>
				<dt>Requests</dt><dd>{last && last.requests.length > 0 ? last.requests.map((r) => r.type).join(', ') : 'none'}</dd>
			</dl>
		</section>
	);
}
