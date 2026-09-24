// Composition root for the live local-room connection: same App/Timeline/Composer shell as main.tsx, over createLiveTransport
// instead of the development fixture. Built by scripts/local-room-service.ts, never by the fixture's own vite build.
import { AgoraProvider, createRoomClient } from '@agora/web-framework';
import { useSyncExternalStore, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App.tsx';
import { createBrowserEnvironment, createLiveTransport, getMountRoot, type LiveTransport } from './host/index.ts';
import './fixture.css';

// L1 carries no room/project name; these are fixed labels for the one local room, not persisted state.
const header = { project: 'Local project', room: 'Local room', lifecycle: 'active', agentLabel: 'Local agent', members: 1 } as const;

function Root({ transport }: { readonly transport: LiveTransport }): ReactElement {
	const presentation = useSyncExternalStore(transport.subscribe, transport.getPresentation, transport.getPresentation);
	return <App live header={header} presentation={presentation} onAnswer={(ids) => transport.answer(ids)} />;
}

const container = getMountRoot('root');
if (!container) throw new Error('missing #root');
const client = createRoomClient();
const transport = createLiveTransport(client);
const environment = createBrowserEnvironment(transport);
createRoot(container).render(
	<AgoraProvider client={client} environment={environment}><Root transport={transport} /></AgoraProvider>,
);
transport.loadSnapshot();
