// Entry point for the development fixture. Fixture bytes are validated before any state exists.
import { createRoot } from 'react-dom/client';
import { App } from './components/App.tsx';
import { FixtureControls } from './components/FixtureControls.tsx';
import { load } from './fixture/adapter.ts';
import { createFixtureTransport } from './fixture/fixtureTransport.ts';
import room from './fixture/room.json' with { type: 'json' };
import { createStore } from './store.ts';
import './fixture.css';

const container = document.getElementById('root');
if (!container) throw new Error('missing #root');
const loaded = load(room);
if (loaded.ok) {
	const store = createStore();
	const transport = createFixtureTransport(store, loaded.fixture);
	createRoot(container).render(<>
		<App store={store} port={transport} header={loaded.fixture.header} presentation={loaded.fixture.presentation} />
		<FixtureControls store={store} transport={transport} />
	</>);
} else {
	container.textContent = `Fixture rejected: ${loaded.error}`;
	container.setAttribute('role', 'alert');
}
