// Live Host transport: local-room L1-L3 HTTP wire (snapshot/events/messages) behind RoomTransport.
// Built under the precompiled browser validator so strict CSP (no unsafe-eval) still holds; see scripts/local-room-service.ts.
import { createWireValidator, type ComponentName, type Schema } from '@agora/contracts';
import type { Message } from '@agora/client-core';
import type { Author, Presentation, RoomClient, RoomTransport, TransportConnection } from '@agora/web-framework';

export interface LiveTransport extends RoomTransport { readonly getPresentation: () => Presentation }
export interface LiveOptions { readonly baseUrl?: string; readonly pollDelayMs?: number; readonly errorDelayMs?: number; readonly retryDelayMs?: number }

const wire = createWireValidator();
const validate = <N extends ComponentName>(name: N, value: unknown): Schema<N> => {
	const result = wire.validate(name, value);
	if (!result.ok) throw new Error(`invalid ${name}: ${result.details.join(';')}`);
	return result.value;
};
const emptyPresentation: Presentation = { authors: {}, times: {}, citations: {} };
const toMessage = (m: Schema<'RoomMessage'>): Message => ({ id: m.message_id, createdSeq: m.room_seq, revision: '1', content: { tag: 'visible', body: m.body } });
const toAuthor = (m: Schema<'RoomMessage'>): Author => m.author.kind === 'human' ? { name: 'You', kind: 'human' } : { name: 'Local agent', kind: 'agent' };
function annotate(presentation: Presentation, messages: readonly Schema<'RoomMessage'>[]): Presentation {
	if (!messages.length) return presentation;
	const authors = { ...presentation.authors }, times = { ...presentation.times }, citations = { ...presentation.citations };
	for (const m of messages) { authors[m.message_id] = toAuthor(m); times[m.message_id] = m.created_at; citations[m.message_id] = m.citations.map((c) => c.record_id); }
	return { authors, times, citations };
}

async function requestJson(baseUrl: string, path: string, body?: unknown): Promise<unknown> {
	const response = await fetch(`${baseUrl}/api/v1/local-room/${path}`, { signal: AbortSignal.timeout(5000), ...(body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
	if (!response.ok) {
		const error = new Error(`HTTP ${response.status}`) as Error & { status: number; retryAfterSeconds: number | undefined };
		error.status = response.status;
		const retryAfter = Number(response.headers.get('retry-after'));
		error.retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;
		throw error;
	}
	return response.json() as Promise<unknown>;
}
function classify(error: unknown): { tag: 'timeout' } | { tag: 'rate_limited'; retryAfterSeconds: number } {
	const status = (error as { status?: number } | undefined)?.status;
	return status === 429 ? { tag: 'rate_limited', retryAfterSeconds: (error as { retryAfterSeconds?: number }).retryAfterSeconds ?? 30 } : { tag: 'timeout' };
}
const sleep = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

/** One committed browser connection to the fixed local room. No manual disconnect toggle: the loop runs for the page's lifetime, matching a normal reload-to-reconnect flow. */
export function createLiveTransport(client: RoomClient, options: LiveOptions = {}): LiveTransport {
	const baseUrl = options.baseUrl ?? location.origin;
	const pollDelayMs = options.pollDelayMs ?? 250, errorDelayMs = options.errorDelayMs ?? 1000, retryDelayMs = options.retryDelayMs ?? 1000;
	let connection: TransportConnection = { online: true, phase: 'idle', error: undefined, decision: undefined };
	let presentation = emptyPresentation;
	let scope: Schema<'RoomSnapshot'>['scope'] | undefined;
	let streamId = '';
	let started = false;
	const listeners = new Set<() => void>();
	const notify = (): void => { for (const listener of listeners) listener(); };
	const set = (patch: Partial<TransportConnection>): void => { connection = { ...connection, ...patch }; notify(); };

	function applySnapshot(value: unknown): void {
		const snapshot = validate('RoomSnapshot', value);
		scope = snapshot.scope; streamId = snapshot.cursor.stream_id;
		presentation = annotate(emptyPresentation, snapshot.messages);
		client.apply({ type: 'snapshot', streamId, cursor: snapshot.cursor.committed_seq, lastSeen: snapshot.cursor.committed_seq, messages: snapshot.messages.map(toMessage), runs: [] });
	}
	function applyEvents(value: unknown): number {
		const events = validate('RoomEventBatch', value);
		presentation = annotate(presentation, events.map((e) => e.payload));
		for (const event of events) client.apply({ type: 'event', streamId: event.stream_id, seq: event.seq, change: { type: 'message', message: toMessage(event.payload) } });
		if (events.length) notify();
		return events.length;
	}
	async function poll(): Promise<void> {
		for (;;) {
			try {
				const room = client.getState().rooms.find((r) => r.streamId === streamId);
				if (!room || room.mode === 'resync') { applySnapshot(await requestJson(baseUrl, 'snapshot')); set({ phase: 'idle', error: undefined }); continue; }
				if (room.mode === 'upgrade') { set({ phase: 'error', error: 'upgrade required: reload to resync' }); return; }
				const count = applyEvents(await requestJson(baseUrl, `events?after=${room.cursor}`));
				set({ phase: 'idle', error: undefined });
				if (count < 50) await sleep(pollDelayMs);
			} catch (error) {
				set({ phase: 'error', error: String(error) });
				await sleep(errorDelayMs);
			}
		}
	}
	async function attemptSend(commandId: string, requestDigest: string, text: string): Promise<void> {
		if (!scope) return;
		const command: Schema<'SendRoomMessageCommand'> = { schema_version: 'agora.local-room.send-message/v1', command_id: commandId, scope, body: text, citations: [] };
		try {
			const receiptWire = validate('RoomCommandReceipt', await requestJson(baseUrl, 'messages', command));
			// Only command_id is checked: EnvironmentPort.digestText hashes raw text for client-core's own local dedup and
			// never sees scope/citations, so it cannot reproduce the server's canonical-command digest to compare against.
			if (receiptWire.identity.command_id !== commandId) throw new Error('receipt identity mismatch');
			client.apply({ type: 'receipt', receipt: receiptWire.receipt });
			client.apply({ type: 'draft', streamId, text: '' });
			set({ decision: undefined });
		} catch (error) {
			const transition = client.apply({ type: 'retry', commandId, requestDigest, online: true, failure: classify(error) });
			set({ decision: transition.requests.map((r) => r.type).join(', ') || undefined });
			const request = transition.requests[0];
			if (request?.type === 'resend_same_command') { await sleep(retryDelayMs); void attemptSend(commandId, requestDigest, text); }
			else if (request?.type === 'wait_retry_after') { await sleep(request.retryAfterSeconds * 1000); void attemptSend(commandId, requestDigest, text); }
		}
	}
	return {
		get streamId() { return streamId; },
		getState: () => connection,
		getPresentation: () => presentation,
		subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
		loadSnapshot: () => { if (started) return; started = true; set({ phase: 'loading' }); void poll(); },
		submit: (commandId, requestDigest, text) => {
			const transition = client.apply({ type: 'submit', commandId, streamId, requestDigest, online: connection.online });
			set({ decision: transition.requests.map((r) => r.type).join(', ') || undefined });
			if (transition.requests.some((r) => r.type === 'send')) void attemptSend(commandId, requestDigest, text);
		},
		markSeen: (seq) => { client.apply({ type: 'seen', streamId, seq }); },
	};
}
