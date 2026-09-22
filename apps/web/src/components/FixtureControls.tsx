import { useTranscript, useTransportState } from '@agora/web-framework';
import type { ReactElement } from 'react';
import type { Failure, FixtureTransport } from '../host/index.ts';

interface Props { readonly transport: FixtureTransport }
const failures: readonly Failure[] = ['timeout', 'stale_revision', 'denied', 'rate_limited'];

// Development-only scenario buttons. Only this component may import the concrete FixtureTransport.
export function FixtureControls({ transport }: Props): ReactElement {
	const state = useTransportState();
	const transcript = useTranscript();
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
		['Load large room (400)', () => { transport.loadLargeRoom(400); }],
		['Append 100 messages', () => { transport.appendLarge(100); }],
		['Deliver fixture receipt', () => { transport.deliverReceipt(); }],
		...failures.map((failure): [string, () => void] => [`Fail send: ${failure.replaceAll('_', ' ')}`, () => { transport.fail(failure); }]),
	];
	return (
		<section aria-labelledby="fixture-heading" className="fixture-controls">
			<h2 id="fixture-heading">Fixture controls (development only)</h2>
			<div className="button-row">{actions.map(([label, run]) => <button type="button" key={label} onClick={run}>{label}</button>)}</div>
			<dl aria-label="Last transition">
				<dt>Input</dt><dd data-last-input={last?.input ?? ''}>{last?.input ?? 'none'}</dd>
				<dt>Requests</dt><dd>{last && last.requests.length > 0 ? last.requests.map((r) => r.type).join(', ') : 'none'}</dd>
			</dl>
		</section>
	);
}
