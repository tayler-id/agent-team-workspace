// The one local-room event kind (R07 envelope). stream_id is the room and seq equals the message's room_seq, so an
// event sequence is never allocated apart from its message; the storage schema enforces the same identity.
import { randomUUID } from 'node:crypto';
import type { PrincipalId, RoomId, RoomMessageRecord } from './port.ts';

export interface RoomMessageCreated {
	readonly eventId: string;
	readonly streamId: RoomId;
	readonly seq: string;
	readonly kind: 'local_room.message_created';
	readonly actor: PrincipalId;
	readonly occurredAt: string;
	readonly payload: RoomMessageRecord;
}

export const messageCreated = (message: RoomMessageRecord): RoomMessageCreated => ({
	eventId: randomUUID(),
	streamId: message.roomId,
	seq: message.roomSeq,
	kind: 'local_room.message_created',
	actor: message.author.principalId,
	occurredAt: message.createdAt,
	payload: message,
});
