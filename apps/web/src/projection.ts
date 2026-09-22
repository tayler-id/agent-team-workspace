// Presentation-free projection of client-core state into row and status view models. No React, DOM or styling here.
// Reused from the preserved React engineering checkpoint (evidence/local-room/preservation/README.md), trimmed of
// the reply-thread and run-card view models that belong to a later, separately gated slice.
import type { ClientState, Message } from '@agora/client-core';

export type Room = ClientState['rooms'][number];
export type FrozenMessage = Room['messages'][number];
export interface Author { readonly name: string; readonly kind: 'human' | 'agent' | 'system' }
export interface Presentation { readonly authors: Readonly<Record<string, Author>>; readonly times: Readonly<Record<string, string>>; readonly citations: Readonly<Record<string, readonly string[]>> }
export interface Row { readonly message: FrozenMessage; readonly author: Author; readonly time: string; readonly edited: boolean; readonly unread: boolean; readonly firstUnread: boolean; readonly citations: readonly string[] }
export interface Window { readonly rows: readonly Row[]; readonly older: number; readonly total: number }
export type RoomPhase = 'empty' | 'loading' | 'live' | 'gap' | 'resync' | 'upgrade' | 'error' | 'revoked';
export interface RoomStatus { readonly phase: RoomPhase; readonly online: boolean; readonly label: string; readonly detail: string; readonly unread: number; readonly cursor: string | undefined }
export interface ComposerStatus { readonly draft: string; readonly pending: readonly { commandId: string; tag: 'pending' | 'received' }[]; readonly decision: string | undefined }

const compare = (a: string, b: string): number => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
const unknownAuthor: Author = { name: 'Unknown author', kind: 'system' };

export function rows(room: Room | undefined, presentation: Presentation): readonly Row[] {
	if (!room) return [];
	let boundary = true;
	return room.messages.map((message) => {
		const unread = message.content.tag === 'visible' && compare(message.createdSeq, room.lastSeen) > 0;
		const firstUnread = unread && boundary;
		if (unread) boundary = false;
		return { message, author: presentation.authors[message.id] ?? unknownAuthor, time: presentation.times[message.id] ?? '', edited: message.content.tag === 'visible' && message.revision !== '1', unread, firstUnread, citations: presentation.citations[message.id] ?? [] };
	});
}

// Bounded window over the newest rows; older rows stay reachable through an explicit Load older messages step.
export function window(all: readonly Row[], limit: number): Window {
	const start = Math.max(0, all.length - limit);
	return { rows: all.slice(start), older: start, total: all.length };
}

export interface Connection { readonly online: boolean; readonly phase: 'idle' | 'loading' | 'error' | 'revoked'; readonly error: string | undefined }

export function status(room: Room | undefined, connection: Connection): RoomStatus {
	const base = { online: connection.online, unread: room?.unread ?? 0, cursor: room?.cursor };
	if (connection.phase === 'revoked') return { ...base, phase: 'revoked', label: 'Access revoked', detail: 'Private state cleared. Sign in again to load a fresh snapshot.' };
	if (connection.phase === 'error') return { ...base, phase: 'error', label: 'Fixture error', detail: connection.error ?? 'Unknown fixture error' };
	if (connection.phase === 'loading') return { ...base, phase: 'loading', label: 'Loading snapshot', detail: 'Waiting for the fixture snapshot.' };
	if (!room) return { ...base, phase: 'empty', label: 'No room loaded', detail: 'Load the fixture snapshot to start.' };
	const suffix = connection.online ? '' : ' Offline: sends wait for a connection.';
	switch (room.mode) {
		case 'live': return { ...base, phase: 'live', label: 'Live', detail: `Cursor ${room.cursor} applied.${suffix}` };
		case 'gap': return { ...base, phase: 'gap', label: 'Replaying gap', detail: `${room.pending.length} buffered after cursor ${room.cursor}; replay requested.${suffix}` };
		case 'resync': return { ...base, phase: 'resync', label: 'Resync required', detail: 'Replay floor lost or buffer exceeded; a fresh snapshot is requested.' };
		case 'upgrade': return { ...base, phase: 'upgrade', label: 'Upgrade required', detail: 'An unsupported state change paused this room without acknowledgement.' };
	}
}

export function composer(state: ClientState, streamId: string, decision: string | undefined): ComposerStatus {
	return {
		draft: state.drafts.find((d) => d.streamId === streamId)?.text ?? '',
		pending: state.commands.filter((c) => c.streamId === streamId).map((c) => ({ commandId: c.commandId, tag: c.tag })),
		decision,
	};
}

export const messageById = (room: Room | undefined, id: string): FrozenMessage | undefined => room?.messages.find((m) => m.id === id);
export const body = (message: Message | FrozenMessage): string => message.content.tag === 'visible' ? message.content.body : '';

// Split a body on code fences; the fixture renders text and code blocks only, never raw HTML or agent links.
export function segments(text: string): readonly { kind: 'text' | 'code'; value: string }[] {
	return text.split(/```[a-z]*\n?/).map((value, i) => ({ kind: i % 2 === 1 ? 'code' as const : 'text' as const, value: value.replace(/\n$/, '') })).filter((s) => s.value.length > 0);
}
