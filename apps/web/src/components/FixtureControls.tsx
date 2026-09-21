import type { ReactElement } from 'react';
import { useDriverState, type Driver } from '../fixture/driver.ts';
import { useTranscript, type Store } from '../store.ts';

interface Props { readonly store: Store; readonly driver: Driver; readonly onReport: (text: string) => void }

// Development-only scenario buttons. Each one dispatches validated fixture inputs; none reaches a service.
export function FixtureControls({ store, driver, onReport }: Props): ReactElement {
	const state = useDriverState(driver);
	const transcript = useTranscript(store);
	const last = transcript[transcript.length - 1];
	const actions: readonly [string, () => void][] = [
		['Load snapshot', () => { driver.loadSnapshot(); onReport('Snapshot loaded.'); }],
		['Load invalid snapshot', () => { driver.loadInvalidSnapshot(); }],
		['Replay next event', () => { const event = driver.replayNext(); onReport(event ? `Delivered sequence ${event.seq}.` : 'No fixture events left.'); }],
		['Replay all events', () => { onReport(`Delivered ${driver.replayAll()} events.`); }],
		['Duplicate last event', () => { driver.duplicateLast(); onReport('Duplicate delivered; the core must ignore it.'); }],
		['Skip one event (gap)', () => { driver.skipOne(); onReport('Delivered one event out of order.'); }],
		['Fill gap', () => { driver.fillGap(); onReport('Delivered the missing event.'); }],
		['Deliver 1,000 missed events', () => { onReport(`Delivered ${driver.missed(1000)} missed events.`); }],
		['200 run-only updates', () => { onReport(`Delivered ${driver.runBurst(200)} run updates.`); }],
		['Unsupported event', () => { driver.unsupported(); }],
		['Resync', () => { driver.resync(); }],
		[state.online ? 'Go offline' : 'Go online', () => { driver.setOnline(!state.online); }],
		['Revoke access', () => { driver.revoke(); }],
		['Load large room (5,000)', () => { driver.loadLargeRoom(5000); onReport('Large room loaded.'); }],
	];
	return (
		<section aria-labelledby="fixture-heading" className="fixture-controls">
			<h2 id="fixture-heading">Fixture controls (development only)</h2>
			<p className="kicker">Engineering fixture - visual design pending. These buttons replace a transport; nothing here is product authority.</p>
			<div className="button-row">{actions.map(([label, run]) => <button type="button" key={label} onClick={run}>{label}</button>)}</div>
			<dl aria-label="Last transition">
				<dt>Input</dt><dd data-last-input={last?.input ?? ''}>{last?.input ?? 'none'}</dd>
				<dt>Requests</dt><dd data-last-requests={last?.requests.map((r) => r.type).join(',') ?? ''}>{last && last.requests.length > 0 ? last.requests.map((r) => r.type).join(', ') : 'none'}</dd>
				<dt>Acknowledged</dt><dd>{last && last.acknowledgements.length > 0 ? last.acknowledgements.map((a) => a.seq).join(', ') : 'none'}</dd>
			</dl>
		</section>
	);
}
