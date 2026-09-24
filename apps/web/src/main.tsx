// Composition root: one RoomClient, Host EnvironmentPort, fixture transport. Features never construct these.
import { AgoraProvider, createRoomClient } from '@agora/web-framework';
import { createRoot } from 'react-dom/client';
import { App } from './components/App.tsx';
import { FixtureControls } from './components/FixtureControls.tsx';
import { createBrowserEnvironment, createFixtureTransport, getMountRoot, load, renderMountError } from './host/index.ts';
import room from './fixture/room.json' with { type: 'json' };
import './fixture.css';

const container = getMountRoot('root');
if (!container) throw new Error('missing #root');
const loaded = load(room);
if (loaded.ok) {
	const client = createRoomClient();
	const transport = createFixtureTransport(client, loaded.fixture);
	const environment = createBrowserEnvironment(transport);
	createRoot(container).render(
		<AgoraProvider client={client} environment={environment}>
			<App header={loaded.fixture.header} presentation={loaded.fixture.presentation} />
			<FixtureControls transport={transport} />
		</AgoraProvider>,
	);
} else {
	renderMountError(container, `Fixture rejected: ${loaded.error}`);
}
