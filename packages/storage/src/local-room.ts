import { type LocalRoomIdentity, type LocalRoomPort, type LocalRoomStore, type MessageCitation, type MessageId, type RoomId, type RoomMessageRecord, type RoomReceipt, sendRoomMessage } from '@agora/domain';
import type { PoolClient } from 'pg';
import type { Database } from './database.ts';

// PostgreSQL adapter of the local room, namespaced under local_room. Every statement runs inside
// Database.withLocalRoom, which binds agora.scope_id to the project for the row-level-security policies, so no
// statement here names the project column: a row outside the bound project is invisible and uninsertable.

const SCOPE_SETTING = 'agora.scope_id';
// Read back exactly what the domain wrote (millisecond UTC), never a driver Date.
const CREATED_AT = `to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

interface MessageRow { message_id: MessageId; room_id: RoomId; room_seq: string; author_kind: 'human' | 'local_agent'; author_principal_id: string; command_id: string; body: string; citations: MessageCitation[]; created_at: string }

export function bindLocalRoomStore(client: PoolClient, projectId: string): LocalRoomStore {
	const toRecord = (row: MessageRow): RoomMessageRecord => ({ messageId: row.message_id, projectId: projectId as RoomMessageRecord['projectId'], roomId: row.room_id, roomSeq: row.room_seq, author: { kind: row.author_kind, principalId: row.author_principal_id as RoomMessageRecord['author']['principalId'] }, commandId: row.command_id as RoomMessageRecord['commandId'], body: row.body, citations: row.citations, createdAt: row.created_at });
	return {
		async lockRoom(roomId) {
			const result = await client.query('select 1 from local_room.room where room_id = $1 for update', [roomId]);
			return (result.rowCount ?? 0) === 1;
		},
		async findReceipt(actor, commandId) {
			const result = await client.query<{ receipt: RoomReceipt }>('select receipt from local_room.command_receipt where actor = $1 and command_id = $2', [actor, commandId]);
			return result.rows[0]?.receipt;
		},
		async hasMessage(roomId, citation) {
			const result = await client.query('select 1 from local_room.message where room_id = $1 and message_id = $2 and room_seq = $3', [roomId, citation.recordId, citation.roomSeq]);
			return (result.rowCount ?? 0) === 1;
		},
		async nextSeq(roomId) {
			const result = await client.query<{ seq: string }>('update local_room.room set next_seq = next_seq + 1 where room_id = $1 returning (next_seq - 1)::text as seq', [roomId]);
			const seq = result.rows[0]?.seq;
			if (seq === undefined) throw new Error(`room ${roomId} is not visible in the bound project`);
			return seq;
		},
		async append(message, event, actor, receipt) {
			await client.query('insert into local_room.message (project_id, room_id, room_seq, message_id, author_kind, author_principal_id, command_id, body, citations, created_at) values (current_setting($1)::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [SCOPE_SETTING, message.roomId, message.roomSeq, message.messageId, message.author.kind, message.author.principalId, message.commandId, message.body, JSON.stringify(message.citations), message.createdAt]);
			await client.query('insert into local_room.event (project_id, stream_id, seq, event_id, kind, actor, occurred_at, payload) values (current_setting($1)::uuid, $2, $3, $4, $5, $6, $7, $8)', [SCOPE_SETTING, event.streamId, event.seq, event.eventId, event.kind, event.actor, event.occurredAt, JSON.stringify(event.payload)]);
			await client.query('insert into local_room.command_receipt (project_id, actor, command_id, request_digest, receipt) values (current_setting($1)::uuid, $2, $3, $4, $5)', [SCOPE_SETTING, actor, receipt.commandId, receipt.requestDigest, JSON.stringify(receipt)]);
		},
		// The latest `limit` messages in ascending order plus the counter, both from the caller's repeatable read.
		async readSnapshot(roomId, limit) {
			const room = await client.query<{ committed_seq: string }>('select (next_seq - 1)::text as committed_seq from local_room.room where room_id = $1', [roomId]);
			const committedSeq = room.rows[0]?.committed_seq;
			if (committedSeq === undefined) throw new Error(`room ${roomId} is not visible in the bound project`);
			const rows = await client.query<MessageRow>(`select m.message_id, m.room_id, m.room_seq::text as room_seq, m.author_kind, m.author_principal_id, m.command_id, m.body, m.citations, ${CREATED_AT} as created_at from local_room.message m where m.room_id = $1 order by m.room_seq desc limit $2`, [roomId, limit]);
			return { projectId: projectId as RoomMessageRecord['projectId'], roomId, committedSeq, messages: rows.rows.reverse().map(toRecord) };
		},
	};
}

export const SNAPSHOT_LIMIT = 1000;

export function createPostgresLocalRoom(database: Database, identity: LocalRoomIdentity): LocalRoomPort {
	return {
		send: (command) => database.withLocalRoom(identity.projectId, (store) => sendRoomMessage(store, identity, command)),
		snapshot: async () => ({ outcome: 'ok', snapshot: await database.withLocalRoom(identity.projectId, (store) => store.readSnapshot(identity.roomId, SNAPSHOT_LIMIT), { readOnly: true }) }),
	};
}
