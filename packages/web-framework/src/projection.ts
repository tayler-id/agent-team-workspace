// Presentation-free projection of client-core state. No React, DOM, or Host imports.
import type { ClientState } from '@agora/client-core';
import type { SendPhase } from './environment.ts';

export type Room = ClientState['rooms'][number];
export type FrozenMessage = Room['messages'][number];
export interface Author { readonly name: string; readonly kind: 'human' | 'agent' | 'system' }
export interface Presentation { readonly authors: Readonly<Record<string, Author>>; readonly times: Readonly<Record<string, string>>; readonly citations: Readonly<Record<string, readonly string[]>> }
export interface Row { readonly message: FrozenMessage; readonly author: Author; readonly time: string; readonly edited: boolean; readonly unread: boolean; readonly firstUnread: boolean; readonly citations: readonly string[] }
export interface Window { readonly rows: readonly Row[]; readonly older: number; readonly total: number }
export type RoomPhase = 'empty' | 'loading' | 'live' | 'gap' | 'resync' | 'upgrade' | 'error' | 'revoked';
export interface RoomStatus { readonly phase: RoomPhase; readonly online: boolean; readonly link: Connection['link']; readonly label: string; readonly detail: string; readonly unread: number; readonly cursor: string | undefined }
/** Truthful per-command delivery feedback: `sending`/`retrying`/`waiting_connection` come from the transport's own live attempt, `delivered`/`failed` from client-core's own settled command outcome. */
export type ComposerCommandState = SendPhase | 'delivered' | 'failed';
export interface ComposerCommand { readonly commandId: string; readonly state: ComposerCommandState; readonly reason: string | undefined }
export interface ComposerStatus { readonly draft: string; readonly commands: readonly ComposerCommand[]; readonly decision: string | undefined }
export interface Connection { readonly online: boolean; readonly phase: 'idle' | 'loading' | 'error' | 'revoked'; readonly error: string | undefined; readonly link: 'connecting' | 'online' | 'retrying' | 'offline' | 'disconnected' }
export interface RoomHeader { readonly project: string; readonly room: string; readonly lifecycle: string; readonly agentLabel: string; readonly members: number }

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

export function window(all: readonly Row[], limit: number): Window {
	const start = Math.max(0, all.length - limit);
	return { rows: all.slice(start), older: start, total: all.length };
}

const linkSuffix: Readonly<Record<Connection['link'], string>> = {
	connecting: ' Connecting…',
	online: '',
	retrying: ' Retrying the connection.',
	offline: ' Offline: sends wait for a connection.',
	disconnected: ' Disconnected: press Reconnect to resume.',
};

export function status(room: Room | undefined, connection: Connection): RoomStatus {
	const base = { online: connection.online, link: connection.link, unread: room?.unread ?? 0, cursor: room?.cursor };
	if (connection.phase === 'revoked') return { ...base, phase: 'revoked', label: 'Access revoked', detail: 'Private state cleared. Sign in again to load a fresh snapshot.' };
	if (connection.phase === 'error') return { ...base, phase: 'error', label: 'Connection error', detail: connection.error ?? 'Unknown connection error' };
	if (connection.phase === 'loading') return { ...base, phase: 'loading', label: 'Loading snapshot', detail: 'Waiting for the room snapshot.' };
	if (!room) return { ...base, phase: 'empty', label: 'No room loaded', detail: 'Load the room snapshot to start.' };
	const suffix = linkSuffix[connection.link];
	switch (room.mode) {
		case 'live': return { ...base, phase: 'live', label: 'Live', detail: `Cursor ${room.cursor} applied.${suffix}` };
		case 'gap': return { ...base, phase: 'gap', label: 'Replaying gap', detail: `${room.pending.length} buffered after cursor ${room.cursor}; replay requested.${suffix}` };
		case 'resync': return { ...base, phase: 'resync', label: 'Resync required', detail: 'Replay floor lost or buffer exceeded; a fresh snapshot is requested.' };
		case 'upgrade': return { ...base, phase: 'upgrade', label: 'Upgrade required', detail: 'An unsupported state change paused this room without acknowledgement.' };
	}
}

export function composer(state: ClientState, streamId: string, sendPhase: Readonly<Record<string, SendPhase>>, decision: string | undefined): ComposerStatus {
	return {
		draft: state.drafts.find((d) => d.streamId === streamId)?.text ?? '',
		commands: state.commands.filter((c) => c.streamId === streamId).map((c): ComposerCommand => {
			if (c.tag === 'received') return { commandId: c.commandId, state: 'delivered', reason: undefined };
			if (c.tag === 'denied') return { commandId: c.commandId, state: 'failed', reason: c.reason };
			return { commandId: c.commandId, state: sendPhase[c.commandId] ?? 'sending', reason: undefined };
		}),
		decision,
	};
}

export const messageById = (room: Room | undefined, id: string): FrozenMessage | undefined => room?.messages.find((m) => m.id === id);
export function segments(text: string): readonly { kind: 'text' | 'code'; value: string }[] {
	return text.split(/```[a-z]*\n?/).map((value, i) => ({ kind: i % 2 === 1 ? 'code' as const : 'text' as const, value: value.replace(/\n$/, '') })).filter((s) => s.value.length > 0);
}
