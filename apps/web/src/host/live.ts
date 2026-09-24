// Live Host transport: local-room L1-L3 HTTP wire (snapshot/events/messages) behind RoomTransport.
// Built under the precompiled browser validator so strict CSP (no unsafe-eval) still holds; see scripts/local-room-service.ts.
import { createWireValidator, type ComponentName, type Schema } from '@agora/contracts';
import type { Message } from '@agora/client-core';
import type { Author, Presentation, RoomClient, RoomTransport, TransportConnection } from '@agora/web-framework';

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

async function requestJson(baseUrl: string, path: string, body?: unknown): Promise<unknown> {
	const response = await fetch(`${baseUrl}/api/v1/local-room/${path}`, { signal: AbortSignal.timeout(5000), ...(body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
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
function classify(error: unknown): { tag: 'timeout' | 'denied' } | { tag: 'rate_limited'; retryAfterSeconds: number } {
	const status = (error as { status?: number } | undefined)?.status;
	if (status === 429) return { tag: 'rate_limited', retryAfterSeconds: (error as { retryAfterSeconds?: number }).retryAfterSeconds ?? 30 };
	const transient = status === undefined ? error instanceof TypeError || (error as Error | undefined)?.name === 'TimeoutError' : status === 408 || status >= 500;
	return { tag: transient ? 'timeout' : 'denied' };
}
const sleep = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });
const draftBodyLimit = 4096;
const draftKey = (scope: Schema<'RoomSnapshot'>['scope']): string => `agora.local-room.draft:${scope.project_id}:${scope.room_id}`;
const pendingKey = (scope: Schema<'RoomSnapshot'>['scope']): string => `agora.local-room.pending:${scope.project_id}:${scope.room_id}`;
// /_runtime/identity names the disposable process behind this origin, freshly random on every `local-room start`,
// including the restart a `reset` requires; it never survives a reset even when the reused port and empty cursor do.
// A stale server (or a test double) that lacks the route degrades to undefined, which skips the instance check below
// rather than failing closed, so it never regresses the cursor-only guard that already covers advancing resets.
async function fetchInstance(baseUrl: string): Promise<string | undefined> {
	try {
		const response = await fetch(`${baseUrl}/_runtime/identity`, { signal: AbortSignal.timeout(5000) });
		return response.ok ? (await response.text()).trim() : undefined;
	} catch { return undefined; }
}
// sessionStorage bounds the draft's lifetime to this tab's session and keeps it private to that tab, so a reset or a
// fresh instance (a distinct origin/port) never exposes another session's text. The stored cursor guards an
// advancing reset; the stored instance guards the one case a cursor cannot: a reset of a room still at cursor 0.
function readDraft(scope: Schema<'RoomSnapshot'>['scope'], currentCursor: string, instance: string | undefined): string | undefined {
	const raw = sessionStorage.getItem(draftKey(scope));
	if (!raw) return undefined;
	try {
		const parsed = JSON.parse(raw) as { cursor?: unknown; text?: unknown; instance?: unknown };
		const foreignInstance = instance !== undefined && parsed.instance !== instance;
		if (typeof parsed.cursor !== 'string' || typeof parsed.text !== 'string' || foreignInstance || BigInt(parsed.cursor) > BigInt(currentCursor)) { sessionStorage.removeItem(draftKey(scope)); return undefined; }
		return parsed.text;
	} catch { sessionStorage.removeItem(draftKey(scope)); return undefined; }
}
function writeDraft(scope: Schema<'RoomSnapshot'>['scope'], cursor: string, text: string, instance: string | undefined): void {
	if (text.trim() === '') { sessionStorage.removeItem(draftKey(scope)); return; }
	sessionStorage.setItem(draftKey(scope), JSON.stringify({ cursor, text: text.slice(0, draftBodyLimit), instance }));
}
// Mirrors an in-flight send's identity across a reload so a POST that already committed is replayed, not repeated:
// the next Send on the same still-unsettled text reuses this command_id instead of minting one the server has never
// seen, and the server's own actor/command_id idempotency then returns the original receipt instead of a duplicate.
function readPending(scope: Schema<'RoomSnapshot'>['scope'], instance: string | undefined, text: string): { commandId: string; requestDigest: string } | undefined {
	const raw = sessionStorage.getItem(pendingKey(scope));
	if (!raw) return undefined;
	try {
		const parsed = JSON.parse(raw) as { instance?: unknown; text?: unknown; commandId?: unknown; requestDigest?: unknown };
		if (parsed.text !== text || typeof parsed.commandId !== 'string' || typeof parsed.requestDigest !== 'string' || instance !== undefined && parsed.instance !== instance) return undefined;
		return { commandId: parsed.commandId, requestDigest: parsed.requestDigest };
	} catch { return undefined; }
}
function writePending(scope: Schema<'RoomSnapshot'>['scope'], instance: string | undefined, text: string, commandId: string, requestDigest: string): void {
	sessionStorage.setItem(pendingKey(scope), JSON.stringify({ instance, text, commandId, requestDigest }));
}
function clearPendingIfMatches(scope: Schema<'RoomSnapshot'>['scope'], commandId: string): void {
	const raw = sessionStorage.getItem(pendingKey(scope));
	if (!raw) return;
	try { if ((JSON.parse(raw) as { commandId?: unknown }).commandId === commandId) sessionStorage.removeItem(pendingKey(scope)); }
	catch { sessionStorage.removeItem(pendingKey(scope)); }
}

/** One committed browser connection to the fixed local room. No manual disconnect toggle: the loop runs for the page's lifetime, matching a normal reload-to-reconnect flow. */
export function createLiveTransport(client: RoomClient, options: LiveOptions = {}): LiveTransport {
	const baseUrl = options.baseUrl ?? location.origin;
	const pollDelayMs = options.pollDelayMs ?? 250, errorDelayMs = options.errorDelayMs ?? 1000, retryDelayMs = options.retryDelayMs ?? 1000;
	let connection: TransportConnection = { online: true, phase: 'idle', error: undefined, decision: undefined };
	let presentation = emptyPresentation;
	let scope: Schema<'RoomSnapshot'>['scope'] | undefined;
	let streamId = '';
	let started = false;
	let draftRestored = false; // Restore a saved draft only once per page load, not on every later resync.
	let currentInstance: string | undefined; // This origin's current disposable process identity, if the route answered.
	const unsettled = new Set<string>(); // Draft texts with a command still retrying; a second Send reuses that identity.
	const listeners = new Set<() => void>();
	const notify = (): void => { for (const listener of listeners) listener(); };
	const set = (patch: Partial<TransportConnection>): void => { connection = { ...connection, ...patch }; notify(); };

	function applySnapshot(value: unknown): void {
		const snapshot = validate('RoomSnapshot', value);
		scope = snapshot.scope; streamId = snapshot.cursor.stream_id;
		presentation = annotate(emptyPresentation, snapshot.messages);
		client.apply({ type: 'snapshot', streamId, cursor: snapshot.cursor.committed_seq, lastSeen: snapshot.cursor.committed_seq, messages: snapshot.messages.map(toMessage), runs: [] });
		if (!draftRestored) {
			draftRestored = true;
			const saved = readDraft(scope, snapshot.cursor.committed_seq, currentInstance);
			if (saved !== undefined) client.apply({ type: 'draft', streamId, text: saved });
		}
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
				if (!room || room.mode === 'resync') { currentInstance = await fetchInstance(baseUrl); applySnapshot(await requestJson(baseUrl, 'snapshot')); set({ phase: 'idle', error: undefined }); continue; }
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
			// Only clear the draft if it still holds the text this receipt settled: the user may have already typed a
			// new, still-unsent message while this one was in flight, and that later text must survive the receipt.
			if (client.getState().drafts.find((d) => d.streamId === streamId)?.text === text) {
				client.apply({ type: 'draft', streamId, text: '' });
				writeDraft(scope, receiptWire.receipt.event_cursors[0]?.committed_seq ?? '0', '', currentInstance);
			}
			unsettled.delete(text);
			clearPendingIfMatches(scope, commandId);
			set({ decision: undefined });
		} catch (error) {
			const transition = client.apply({ type: 'retry', commandId, requestDigest, online: true, failure: classify(error) });
			const request = transition.requests[0];
			if (request?.type === 'stop') { unsettled.delete(text); clearPendingIfMatches(scope, commandId); }
			set({ decision: request?.type === 'stop' ? `stop: not sent (${error instanceof Error ? error.message : String(error)}); the draft is kept` : transition.requests.map((r) => r.type).join(', ') || undefined });
			if (request?.type === 'resend_same_command') { await sleep(retryDelayMs); void attemptSend(commandId, requestDigest, text); }
			else if (request?.type === 'wait_retry_after') { await sleep(request.retryAfterSeconds * 1000); void attemptSend(commandId, requestDigest, text); }
		}
	}
	return {
		async answer(selectedIds) {
			if (!scope) throw new Error('room not loaded');
			// Persist the action identity before sending so a lost response and page reload retry the same command.
			// A successful action clears it, so a later explicit Quote locally click starts a new action.
			const key = `agora.local-answer.pending:${scope.project_id}:${scope.room_id}:${selectedIds.join(',')}`;
			const commandId = localStorage.getItem(key) ?? crypto.randomUUID();
			localStorage.setItem(key, commandId);
			const receipt = validate('RoomCommandReceipt', await requestJson(baseUrl, 'answer', { schema_version: 'agora.local-answer.command/v1', command_id: commandId, scope, selected_ids: selectedIds }));
			if (receipt.identity.command_id !== commandId) throw new Error('answer receipt identity mismatch');
			localStorage.removeItem(key);
			// Polling delivers the committed event to every browser; no optimistic answer is rendered.
		},
		get streamId() { return streamId; },
		getState: () => connection,
		getPresentation: () => presentation,
		subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
		loadSnapshot: () => { if (started) return; started = true; set({ phase: 'loading' }); void poll(); },
		submit: (commandId, requestDigest, text) => {
			if (unsettled.has(text)) return;
			// A saved pending identity for this exact still-unsent text (from before a reload) is reused rather than
			// the fresh id the caller minted, so a POST that already committed replays instead of duplicating.
			if (scope) { const saved = readPending(scope, currentInstance, text); if (saved) { commandId = saved.commandId; requestDigest = saved.requestDigest; } }
			const transition = client.apply({ type: 'submit', commandId, streamId, requestDigest, online: connection.online });
			set({ decision: transition.requests.map((r) => r.type).join(', ') || undefined });
			if (transition.requests.some((r) => r.type === 'send')) {
				if (scope) writePending(scope, currentInstance, text, commandId, requestDigest);
				unsettled.add(text);
				void attemptSend(commandId, requestDigest, text);
			}
		},
		markSeen: (seq) => { client.apply({ type: 'seen', streamId, seq }); },
		saveDraft: (draftStreamId, text) => { if (scope && draftStreamId === streamId) writeDraft(scope, client.getState().rooms.find((r) => r.streamId === streamId)?.cursor ?? '0', text, currentInstance); },
	};
}
