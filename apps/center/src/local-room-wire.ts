import type { Schema } from '@agora/contracts';
import type { RoomMessageRecord, RoomReceipt } from '@agora/domain';

export const toWireMessage = (m: RoomMessageRecord): Schema<'RoomMessage'> => ({
	schema_version: 'agora.local-room.message/v1',
	message_id: m.messageId,
	scope: { project_id: m.projectId, room_id: m.roomId },
	room_seq: m.roomSeq,
	author: { kind: m.author.kind, principal_id: m.author.principalId },
	command_id: m.commandId,
	body: m.body,
	citations: m.citations.map((c) => ({ record_kind: 'message', record_id: c.recordId, room_seq: c.roomSeq })),
	created_at: m.createdAt,
});

export const toWireReceipt = (r: RoomReceipt, replayed: boolean): Schema<'RoomCommandReceipt'> => ({
	schema_version: 'agora.local-room.receipt/v1',
	identity: { command_id: r.commandId, request_digest: r.requestDigest },
	receipt: { command_id: r.commandId, aggregate_id: r.roomId, revision: r.revision, event_cursors: [{ stream_id: r.roomId, committed_seq: r.revision }], receipt_id: r.receiptId },
	message_id: r.messageId,
	replayed,
});

