import { initialState, synchronize, type ClientInput, type ClientState, type Message } from '@agora/client-core';
import { createWireValidator, canonicalJson, type ComponentName, type Schema } from '@agora/contracts';

const wire = createWireValidator();
const message = (m: Schema<'RoomMessage'>): Message => ({ id: m.message_id, createdSeq: m.room_seq, revision: '1', content: { tag: 'visible', body: m.body } });
const validate = <N extends ComponentName>(name: N, value: unknown): Schema<N> => {
	const result = wire.validate(name, value);
	if (!result.ok) throw new Error(`invalid ${name}: ${result.details.join(';')}`);
	return result.value;
};
// This adapter owns HTTP and wire conversion, never a second timeline. Renderers only observe core state.
export class RoomClient {
	state: ClientState = initialState();
	url: string;
	private projectId = '';
	constructor(url: string) { this.url = url; }
	apply(input: ClientInput): void { this.state = synchronize(this.state, input).state; }
	snapshot(value: unknown): void {
		const s = validate('RoomSnapshot', value);
		if (s.cursor.stream_id !== s.scope.room_id || s.messages.some((m) => m.scope.room_id !== s.scope.room_id || m.scope.project_id !== s.scope.project_id)) throw new Error('snapshot scope mismatch');
		this.projectId = s.scope.project_id;
		this.apply({ type: 'snapshot', streamId: s.cursor.stream_id, cursor: s.cursor.committed_seq, lastSeen: '0', messages: s.messages.map(message), runs: [] });
	}
	events(value: unknown): void {
		let events: Schema<'RoomEventBatch'>;
		try { events = validate('RoomEventBatch', value); }
		catch (e) { const room = this.state.rooms[0]; if (room) this.apply({ type: 'unsupported', streamId: room.streamId }); throw e; }
		for (const e of events) {
			if (e.stream_id !== this.state.rooms[0]?.streamId || e.seq !== e.payload.room_seq || e.stream_id !== e.payload.scope.room_id || e.payload.scope.project_id !== this.projectId) throw new Error('event identity mismatch');
			this.apply({ type: 'event', streamId: e.stream_id, seq: e.seq, change: { type: 'message', message: message(e.payload) } });
		}
	}
	async request(path: string, signal?: AbortSignal, body?: unknown): Promise<unknown> {
		const response = await fetch(`${this.url}/api/v1/local-room/${path}`, { signal: AbortSignal.any([AbortSignal.timeout(5000), ...(signal ? [signal] : [])]), ...(body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return response.json() as Promise<unknown>;
	}
	async resume(signal?: AbortSignal): Promise<void> {
		if (!this.state.rooms.length || this.state.rooms[0]?.mode === 'resync') this.snapshot(await this.request('snapshot', signal));
		for (let batch = 0; batch < 200; batch++) {
			const room = this.state.rooms[0];
			if (!room || room.mode === 'upgrade') throw new Error('upgrade required');
			const events = await this.request(`events?after=${room.cursor}`, signal) as Schema<'RoomEventBatch'>;
			this.events(events);
			if (events.length < 50) return;
		}
		throw new Error('replay bound reached; resume again');
	}
	async send(value: unknown, signal?: AbortSignal): Promise<Schema<'RoomCommandReceipt'>> {
		const command = validate('SendRoomMessageCommand', value);
		const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(command)));
		const requestDigest = `sha256:${Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')}`;
		const transition = synchronize(this.state, { type: 'submit', commandId: command.command_id, streamId: command.scope.room_id, requestDigest, online: true });
		if (transition.requests.some((r) => r.type === 'conflict')) throw new Error('command conflict');
		this.state = transition.state;
		const receipt = validate('RoomCommandReceipt', await this.request('messages', signal, command));
		if (receipt.identity.command_id !== command.command_id || receipt.identity.request_digest !== requestDigest || receipt.receipt.command_id !== command.command_id || receipt.receipt.aggregate_id !== command.scope.room_id) throw new Error('receipt identity mismatch');
		this.apply({ type: 'receipt', receipt: receipt.receipt }); // A receipt never moves the room cursor.
		return receipt;
	}
}
