// Live Host transport: local-room L1-L3 HTTP wire (snapshot/events/messages) behind RoomTransport.
// Built under the precompiled browser validator so strict CSP (no unsafe-eval) still holds; see scripts/local-room-service.ts.
import { createWireValidator, type ComponentName, type Schema } from '@agora/contracts';
import type { Message, RetryFailure } from '@agora/client-core';
import type { Author, ConnectionLink, Presentation, RoomClient, RoomTransport, SendPhase, TransportConnection } from '@agora/web-framework';

export interface LiveTransport extends RoomTransport { readonly getPresentation: () => Presentation; answer(selectedIds: readonly string[]): Promise<void> }
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
const isOnline = (): boolean => typeof navigator === 'undefined' || navigator.onLine;

async function requestJson(baseUrl: string, path: string, signal: AbortSignal, body?: unknown): Promise<unknown> {
	const response = await fetch(`${baseUrl}/api/v1/local-room/${path}`, { signal: AbortSignal.any([AbortSignal.timeout(5000), signal]), ...(body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
	if (!response.ok) {
		const reason = await response.json().then((v: { reason_code?: unknown }) => typeof v.reason_code === 'string' ? ` ${v.reason_code}` : '', () => '');
		const error = new Error(`HTTP ${response.status}${reason}`) as Error & { status: number; retryAfterSeconds: number | undefined };
		error.status = response.status;
		const retryAfter = Number(response.headers.get('retry-after'));
		error.retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;
		throw error;
	}
	return response.json() as Promise<unknown>;
}
// Only an unreachable server, a timeout, 408 or 5xx is transient. Any other 4xx, an invalid receipt or a receipt for
// another command would fail the same way again, so the core stops instead of spending the rate budget forever.
function classify(error: unknown): RetryFailure {
	const status = (error as { status?: number } | undefined)?.status;
	if (status === 429) return { tag: 'rate_limited', retryAfterSeconds: (error as { retryAfterSeconds?: number }).retryAfterSeconds ?? 30 };
	const transient = status === undefined ? error instanceof TypeError || (error as Error | undefined)?.name === 'TimeoutError' : status === 408 || status >= 500;
	return transient ? { tag: 'timeout' } : { tag: 'denied', reason: error instanceof Error ? error.message : String(error) };
}
const sleep = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * One browser connection to the fixed local room, with a manual Disconnect/Reconnect control. `generation` is bumped
 * on every disconnect and reconnect; a poll or send retry captures it before each await and checks it after, so a
 * cancelled loop iteration that wakes up late (its fetch aborted, or its backoff timer fires) takes no further
 * action instead of racing a freshly reconnected one. Reconnect resumes polling from the room's own applied cursor
 * (client-core already keeps it) and retries every command left waiting on `wait_connection`, each by its own exact
 * identity: distinct commands submitted while offline never overwrite one another or get dropped.
 */
export function createLiveTransport(client: RoomClient, options: LiveOptions = {}): LiveTransport {
	const baseUrl = options.baseUrl ?? location.origin;
	const pollDelayMs = options.pollDelayMs ?? 250, errorDelayMs = options.errorDelayMs ?? 1000, retryDelayMs = options.retryDelayMs ?? 1000;
	let connection: TransportConnection = { online: isOnline(), phase: 'idle', error: undefined, decision: undefined, link: 'connecting', sendPhase: {} };
	let presentation = emptyPresentation;
	let scope: Schema<'RoomSnapshot'>['scope'] | undefined;
	let streamId = '';
	let started = false;
	let generation = 0;
	let abort = new AbortController();
	const waitingForConnection = new Map<string, { readonly requestDigest: string; readonly text: string }>();
	const unsettled = new Set<string>(); // Draft texts with a command still retrying; a second Send reuses that identity.
	const listeners = new Set<() => void>();
	const notify = (): void => { for (const listener of listeners) listener(); };
	const set = (patch: Partial<TransportConnection>): void => { connection = { ...connection, ...patch }; notify(); };
	const linkFromOnline = (online: boolean): ConnectionLink => online ? 'retrying' : 'offline';
	// Transport-owned attempt phase for a still-`pending` command; cleared once client-core settles it (received or denied) so its own tag becomes authoritative.
	const setPhase = (commandId: string, phase: SendPhase): void => { set({ sendPhase: { ...connection.sendPhase, [commandId]: phase } }); };
	const clearPhase = (commandId: string): void => { if (!(commandId in connection.sendPhase)) return; set({ sendPhase: Object.fromEntries(Object.entries(connection.sendPhase).filter(([id]) => id !== commandId)) }); };

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
	async function poll(myGeneration: number): Promise<void> {
		for (;;) {
			try {
				const room = client.getState().rooms.find((r) => r.streamId === streamId);
				if (!room || room.mode === 'resync') {
					const value = await requestJson(baseUrl, 'snapshot', abort.signal);
					if (myGeneration !== generation) return; // A late response after Disconnect must not mutate committed state.
					applySnapshot(value);
					set({ phase: 'idle', error: undefined, online: true, link: 'online' });
					continue;
				}
				if (room.mode === 'upgrade') { set({ phase: 'error', error: 'upgrade required: reload to resync' }); return; }
				const value = await requestJson(baseUrl, `events?after=${room.cursor}`, abort.signal);
				if (myGeneration !== generation) return; // Same guard: a late events response after Disconnect must not apply.
				const count = applyEvents(value);
				set({ phase: 'idle', error: undefined, online: true, link: 'online' });
				if (count < 50) await sleep(pollDelayMs);
				if (myGeneration !== generation) return;
			} catch (error) {
				if (myGeneration !== generation) return; // Cancelled by disconnect: the abort that caused this rejection needs no further handling.
				const online = isOnline();
				set({ phase: 'error', error: String(error), online, link: linkFromOnline(online) });
				await sleep(errorDelayMs);
				if (myGeneration !== generation) return;
			}
		}
	}
	// A stale attempt's rejection can arrive after an instant Disconnect-then-Reconnect: beginPolling's own drain of
	// waitingForConnection runs synchronously inside reconnect(), before this async catch gets a turn, so writing
	// into the map here would strand the command until some later, unrelated resume. If reconnect() already ran
	// (link is no longer 'disconnected'), resume right away in the current generation instead of only queuing.
	function becomeStale(commandId: string, requestDigest: string, text: string): void {
		if (connection.link === 'disconnected') { waitingForConnection.set(commandId, { requestDigest, text }); setPhase(commandId, 'waiting_connection'); return; }
		setPhase(commandId, 'retrying');
		void attemptSend(generation, commandId, requestDigest, text);
	}
	async function attemptSend(myGeneration: number, commandId: string, requestDigest: string, text: string): Promise<void> {
		if (!scope) return;
		const command: Schema<'SendRoomMessageCommand'> = { schema_version: 'agora.local-room.send-message/v1', command_id: commandId, scope, body: text, citations: [] };
		try {
			const receiptWire = validate('RoomCommandReceipt', await requestJson(baseUrl, 'messages', abort.signal, command));
			if (myGeneration !== generation) return;
			// Only command_id is checked: EnvironmentPort.digestText hashes raw text for client-core's own local dedup and
			// never sees scope/citations, so it cannot reproduce the server's canonical-command digest to compare against.
			if (receiptWire.identity.command_id !== commandId) throw new Error('receipt identity mismatch');
			client.apply({ type: 'receipt', receipt: receiptWire.receipt });
			client.apply({ type: 'draft', streamId, text: '' });
			unsettled.delete(text);
			clearPhase(commandId);
			set({ decision: undefined });
		} catch (error) {
			if (myGeneration !== generation) { becomeStale(commandId, requestDigest, text); return; }
			const online = isOnline();
			const transition = client.apply({ type: 'retry', commandId, requestDigest, online, failure: classify(error) });
			const request = transition.requests[0];
			if (request?.type === 'stop') { unsettled.delete(text); clearPhase(commandId); }
			if (request?.type === 'wait_connection') { waitingForConnection.set(commandId, { requestDigest, text }); setPhase(commandId, 'waiting_connection'); }
			set({ decision: request?.type === 'stop' ? `stop: not sent (${error instanceof Error ? error.message : String(error)}); the draft is kept` : transition.requests.map((r) => r.type).join(', ') || undefined, online, link: request?.type === 'wait_connection' ? linkFromOnline(online) : connection.link });
			if (request?.type === 'resend_same_command') { setPhase(commandId, 'retrying'); await sleep(retryDelayMs); if (myGeneration === generation) void attemptSend(myGeneration, commandId, requestDigest, text); else becomeStale(commandId, requestDigest, text); }
			else if (request?.type === 'wait_retry_after') { setPhase(commandId, 'retrying'); await sleep(request.retryAfterSeconds * 1000); if (myGeneration === generation) void attemptSend(myGeneration, commandId, requestDigest, text); else becomeStale(commandId, requestDigest, text); }
		}
	}
	// Resumes every command still waiting on a connection, each by its own frozen id/digest/text: none is dropped
	// or overwritten by another that was also waiting.
	function resumeWaitingSend(myGeneration: number): void {
		if (myGeneration !== generation || waitingForConnection.size === 0) return;
		const sends = [...waitingForConnection.entries()];
		waitingForConnection.clear();
		for (const [commandId, { requestDigest, text }] of sends) {
			setPhase(commandId, 'retrying');
			void attemptSend(myGeneration, commandId, requestDigest, text);
		}
	}
	function beginPolling(): void {
		const myGeneration = generation;
		set({ phase: 'loading', link: 'connecting' });
		void poll(myGeneration);
		resumeWaitingSend(myGeneration);
	}
	if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
		// The browser's 'online' event reports network reachability, not that this room's own poll or send has
		// succeeded; a prior fetch failure may still be retrying. Only the poll loop's own next successful read
		// sets link: 'online' (in poll, above), so this goes to 'retrying' and lets that read confirm it.
		window.addEventListener('online', () => {
			// A browser online event while still manually Disconnected must not resume a queued send on the
			// controller Disconnect already aborted; Reconnect (which builds a fresh one) is what resumes it.
			const disconnected = connection.link === 'disconnected';
			set({ online: true, link: disconnected ? 'disconnected' : 'retrying' });
			if (!disconnected) resumeWaitingSend(generation);
		});
		window.addEventListener('offline', () => { set({ online: false, link: connection.link === 'disconnected' ? 'disconnected' : 'offline' }); });
	}
	return {
		async answer(selectedIds) {
			if (!scope) throw new Error('room not loaded');
			// Persist the action identity before sending so a lost response and page reload retry the same command.
			// A successful action clears it, so a later explicit Quote locally click starts a new action.
			const key = `agora.local-answer.pending:${scope.project_id}:${scope.room_id}:${selectedIds.join(',')}`;
			const commandId = localStorage.getItem(key) ?? crypto.randomUUID();
			localStorage.setItem(key, commandId);
			const receipt = validate('RoomCommandReceipt', await requestJson(baseUrl, 'answer', abort.signal, { schema_version: 'agora.local-answer.command/v1', command_id: commandId, scope, selected_ids: selectedIds }));
			if (receipt.identity.command_id !== commandId) throw new Error('answer receipt identity mismatch');
			localStorage.removeItem(key);
			// Polling delivers the committed event to every browser; no optimistic answer is rendered.
		},
		get streamId() { return streamId; },
		getState: () => connection,
		getPresentation: () => presentation,
		subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
		loadSnapshot: () => { if (started) return; started = true; beginPolling(); },
		submit: (commandId, requestDigest, text) => {
			if (unsettled.has(text)) return;
			const networkOnline = isOnline();
			const disconnected = connection.link === 'disconnected';
			// A manual Disconnect leaves an already-aborted controller behind until Reconnect makes a fresh one; a new
			// submit must wait for it rather than attempt now and have that abort misread as a permanent HTTP denial.
			const online = networkOnline && !disconnected;
			const transition = client.apply({ type: 'submit', commandId, streamId, requestDigest, online });
			const request = transition.requests[0];
			set({ decision: transition.requests.map((r) => r.type).join(', ') || undefined, online: networkOnline, link: request?.type === 'wait_connection' && !disconnected ? linkFromOnline(online) : connection.link });
			// unsettled also guards the offline path: a repeated click on the same unchanged draft must not mint a
			// second waiting command once the first is already tracked for this exact text.
			if (request?.type === 'wait_connection') { unsettled.add(text); waitingForConnection.set(commandId, { requestDigest, text }); setPhase(commandId, 'waiting_connection'); }
			if (transition.requests.some((r) => r.type === 'send')) { unsettled.add(text); setPhase(commandId, 'sending'); void attemptSend(generation, commandId, requestDigest, text); }
		},
		markSeen: (seq) => { client.apply({ type: 'seen', streamId, seq }); },
		disconnect: () => {
			if (connection.link === 'disconnected') return;
			generation += 1;
			abort.abort();
			set({ phase: 'idle', link: 'disconnected', decision: undefined });
		},
		reconnect: () => {
			if (connection.link !== 'disconnected') return;
			abort = new AbortController();
			started = true;
			beginPolling();
		},
	};
}
