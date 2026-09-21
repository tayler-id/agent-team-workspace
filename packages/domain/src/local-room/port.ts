// Domain-owned boundaries of the local-development room. The center validates wire bytes, converts them to these
// values and dispatches to whichever LocalRoomPort is composed; a storage adapter binds LocalRoomStore to one
// transaction confined to one project, and sendRoomMessage decides replay, denial or append over that store.
import { randomUUID } from 'node:crypto';
import type { Digest } from '@agora/contracts/canonical';
import { messageCreated, type RoomMessageCreated } from './events.ts';

export type ProjectId = string & { readonly ProjectId: unique symbol };
export type RoomId = string & { readonly RoomId: unique symbol };
export type CommandId = string & { readonly CommandId: unique symbol };
export type MessageId = string & { readonly MessageId: unique symbol };
export type PrincipalId = string & { readonly PrincipalId: unique symbol };

// Any RFC 9562 textual UUID, lowercased so equal identifiers compare equal (R05); same shape as the contract pattern.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function asUuid(kind: string, value: string): string {
	if (!UUID.test(value)) throw new TypeError(`${kind} must be an RFC 9562 UUID`);
	return value.toLowerCase();
}
export const asProjectId = (value: string): ProjectId => asUuid('ProjectId', value) as ProjectId;
export const asRoomId = (value: string): RoomId => asUuid('RoomId', value) as RoomId;
export const asCommandId = (value: string): CommandId => asUuid('CommandId', value) as CommandId;
export const asMessageId = (value: string): MessageId => asUuid('MessageId', value) as MessageId;
export const asPrincipalId = (value: string): PrincipalId => asUuid('PrincipalId', value) as PrincipalId;

// The one fixed local-development room (L2). The migration seeds exactly this room; the human principal is the
// only actor the service derives. None of these values is production identity.
export interface LocalRoomIdentity {
	readonly projectId: ProjectId;
	readonly roomId: RoomId;
	readonly principalId: PrincipalId;
}
export const LOCAL_ROOM: LocalRoomIdentity = {
	projectId: asProjectId('a0000000-0000-4000-8000-000000000001'),
	roomId: asRoomId('a0000000-0000-4000-8000-000000000002'),
	principalId: asPrincipalId('a0000000-0000-4000-8000-000000000003'),
};

export interface MessageCitation {
	readonly recordId: MessageId;
	readonly roomSeq: string;
}

// The actor is absent on purpose: the composing service derives it, exactly as R07 requires of every command.
// requestDigest is the canonical digest of the validated wire command; it is the idempotency identity with commandId.
export interface SendRoomMessage {
	readonly commandId: CommandId;
	readonly projectId: ProjectId;
	readonly roomId: RoomId;
	readonly body: string;
	readonly citations: readonly MessageCitation[];
	readonly requestDigest: Digest;
}

export interface RoomAuthor {
	readonly kind: 'human' | 'local_agent';
	readonly principalId: PrincipalId;
}

export interface RoomMessageRecord {
	readonly messageId: MessageId;
	readonly projectId: ProjectId;
	readonly roomId: RoomId;
	readonly roomSeq: string;
	readonly author: RoomAuthor;
	readonly commandId: CommandId;
	readonly body: string;
	readonly citations: readonly MessageCitation[];
	readonly createdAt: string;
}

export interface RoomReceipt {
	readonly commandId: CommandId;
	readonly requestDigest: Digest;
	readonly roomId: RoomId;
	readonly revision: string;
	readonly messageId: MessageId;
	readonly receiptId: string;
}

export interface RoomSnapshotRecord {
	readonly projectId: ProjectId;
	readonly roomId: RoomId;
	readonly committedSeq: string;
	readonly messages: readonly RoomMessageRecord[];
}

export type DenialReason = 'scope_mismatch' | 'not_found' | 'command_conflict';
export interface Unsupported { readonly outcome: 'unsupported'; readonly reasonCode: 'unavailable_capability'; readonly detail: string }
export type SendRoomMessageResult =
	| { readonly outcome: 'committed'; readonly receipt: RoomReceipt; readonly replayed: boolean }
	| { readonly outcome: 'denied'; readonly reasonCode: DenialReason; readonly detail: string }
	| Unsupported;
export type RoomSnapshotResult = { readonly outcome: 'ok'; readonly snapshot: RoomSnapshotRecord } | Unsupported;

export interface LocalRoomPort {
	send(command: SendRoomMessage): Promise<SendRoomMessageResult>;
	snapshot(): Promise<RoomSnapshotResult>;
	events(after: string): Promise<readonly RoomMessageCreated[]>;
}

// One transaction over one project's rows. lockRoom must hold the room counter row until commit so that the
// receipt lookup, the citation check and the append observe and produce one serial order per room.
export interface LocalRoomStore {
	lockRoom(roomId: RoomId): Promise<boolean>;
	findReceipt(actor: PrincipalId, commandId: CommandId): Promise<RoomReceipt | undefined>;
	hasMessage(roomId: RoomId, citation: MessageCitation): Promise<boolean>;
	nextSeq(roomId: RoomId): Promise<string>;
	append(message: RoomMessageRecord, event: RoomMessageCreated, actor: PrincipalId, receipt: RoomReceipt): Promise<void>;
	readSnapshot(roomId: RoomId, limit: number): Promise<RoomSnapshotRecord>;
	readEvents(roomId: RoomId, after: string, limit: number): Promise<readonly RoomMessageCreated[]>;
}

const inScope = (identity: LocalRoomIdentity, command: SendRoomMessage): boolean => command.projectId === identity.projectId && command.roomId === identity.roomId;

const denied = (reasonCode: DenialReason, detail: string): SendRoomMessageResult => ({ outcome: 'denied', reasonCode, detail });

// The send decision (R07): replay the original receipt for the same identity and digest, deny a changed body
// under a reused command, deny a citation that names no persisted record, otherwise allocate the next room
// sequence and append the message, its event and its receipt together. The caller commits or rolls back all of it.
export async function sendRoomMessage(store: LocalRoomStore, identity: LocalRoomIdentity, command: SendRoomMessage): Promise<SendRoomMessageResult> {
	if (!inScope(identity, command)) return denied('scope_mismatch', 'the command names a project or room other than the fixed local-development room');
	if (!(await store.lockRoom(command.roomId))) return denied('not_found', `room ${command.roomId} is not persisted in project ${command.projectId}`);
	const existing = await store.findReceipt(identity.principalId, command.commandId);
	if (existing) {
		if (existing.requestDigest === command.requestDigest) return { outcome: 'committed', receipt: existing, replayed: true };
		return denied('command_conflict', `command ${command.commandId} was committed with request_digest ${existing.requestDigest}`);
	}
	for (const citation of command.citations) {
		if (!(await store.hasMessage(command.roomId, citation))) return denied('not_found', `citation ${citation.recordId} names no persisted message at room_seq ${citation.roomSeq}`);
	}
	const roomSeq = await store.nextSeq(command.roomId);
	const message: RoomMessageRecord = {
		messageId: asMessageId(randomUUID()),
		projectId: command.projectId,
		roomId: command.roomId,
		roomSeq,
		author: { kind: 'human', principalId: identity.principalId },
		commandId: command.commandId,
		body: command.body,
		citations: command.citations,
		createdAt: new Date().toISOString(),
	};
	const receipt: RoomReceipt = { commandId: command.commandId, requestDigest: command.requestDigest, roomId: command.roomId, revision: roomSeq, messageId: message.messageId, receiptId: randomUUID() };
	await store.append(message, messageCreated(message), identity.principalId, receipt);
	return { outcome: 'committed', receipt, replayed: false };
}

// The adapter of a composition without persistence: it accepts a well-formed command and reports that no persistence path is composed.
const unsupported: Unsupported = { outcome: 'unsupported', reasonCode: 'unavailable_capability', detail: 'local-room message persistence is not composed in this process; the command was validated and dispatched' };
export const unsupportedLocalRoom: LocalRoomPort = { send: () => Promise.resolve(unsupported), snapshot: () => Promise.resolve(unsupported), events: () => Promise.resolve([]) };
