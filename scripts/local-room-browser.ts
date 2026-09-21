/// <reference lib="dom" />
import { RoomClient } from './local-room-client.ts';
const client = new RoomClient(location.origin);
const output = document.querySelector('pre');
const status = document.querySelector('[role=status]');
const form = document.querySelector('form');
const body = document.querySelector('textarea');
const toggle = document.querySelector('#connection');
if (!output || !status || !form || !body || !toggle) throw new Error('harness elements missing');
let controller: AbortController | undefined;
let pending: { schema_version: 'agora.local-room.send-message/v1'; command_id: string; scope: { project_id: string; room_id: string }; body: string; citations: [] } | undefined;
const show = (element: Element, text: string): void => { if (element.textContent !== text) element.textContent = text; };
const render = (): void => { show(output, JSON.stringify(client.state, null, 2)); };
const connect = async (): Promise<void> => {
	controller = new AbortController();
	const signal = controller.signal;
	toggle.textContent = 'Disconnect';
	const aborted = (): boolean => signal.aborted;
	while (!aborted()) {
		try { await client.resume(signal); render(); show(status, 'Connected: committed events applied'); }
		catch (error) { show(status, aborted() ? 'Disconnected' : `Reconnecting: ${String(error)}`); }
		if (!aborted()) await new Promise((resolve) => setTimeout(resolve, 250));
	}
};
toggle.addEventListener('click', () => {
	if (controller && !controller.signal.aborted) { controller.abort(); toggle.textContent = 'Reconnect'; status.textContent = 'Disconnected'; }
	else void connect();
});
form.addEventListener('submit', (event) => {
	event.preventDefault();
	void (async () => {
		try {
			if (!controller || controller.signal.aborted) throw new Error('Reconnect before sending; no offline queue');
			const snapshot = await client.request('snapshot', controller.signal) as { scope: { project_id: string; room_id: string } };
			pending ??= { schema_version: 'agora.local-room.send-message/v1', command_id: crypto.randomUUID(), scope: snapshot.scope, body: body.value, citations: [] };
			await client.send(pending, controller.signal); pending = undefined; body.value = ''; render();
			status.textContent = 'Receipt received; waiting for committed event';
		} catch (error) { status.textContent = `Not settled: ${String(error)}. Send again retries the frozen command.`; }
	})();
});
void connect();
