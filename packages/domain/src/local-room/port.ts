// Domain-owned dispatch boundary of the local-development room. The center validates wire bytes, converts them to
// these domain values and dispatches to whichever LocalRoomPort is composed; adapters stay behind this port.
export type ProjectId = string & { readonly ProjectId: unique symbol };
export type RoomId = string & { readonly RoomId: unique symbol };
export type CommandId = string & { readonly CommandId: unique symbol };
export type MessageId = string & { readonly MessageId: unique symbol };

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

export interface MessageCitation {
	readonly recordId: MessageId;
	readonly roomSeq: string;
}

// The actor is absent on purpose: the composing service derives it, exactly as R07 requires of every command.
export interface SendRoomMessage {
	readonly commandId: CommandId;
	readonly projectId: ProjectId;
	readonly roomId: RoomId;
	readonly body: string;
	readonly citations: readonly MessageCitation[];
}

// L1 knows one outcome. L2 adds the committed and replayed outcomes when a persistence adapter exists.
export interface SendRoomMessageResult {
	readonly outcome: 'unsupported';
	readonly reasonCode: 'unavailable_capability';
	readonly detail: string;
}

export interface LocalRoomPort {
	send(command: SendRoomMessage): Promise<SendRoomMessageResult>;
}

// The only adapter of this slice: it accepts a well-formed command and reports that no persistence path is composed.
export const unsupportedLocalRoom: LocalRoomPort = {
	send: () => Promise.resolve({ outcome: 'unsupported', reasonCode: 'unavailable_capability', detail: 'local-room message persistence is not composed in this slice (local-room L1); the command was validated and dispatched' }),
};
