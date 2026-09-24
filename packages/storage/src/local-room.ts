import { compileAnswerContext, proposeLocalAnswer, messageCreated, asMessageId, asPrincipalId, type LocalRoomIdentity, type LocalRoomPort, type LocalRoomStore, type MessageCitation, type MessageId, type RoomId, type RoomMessageRecord, type RoomReceipt, sendRoomMessage } from '@agora/domain';
import { randomUUID } from 'node:crypto';
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
		async readEvents(roomId, after, limit) {
			const rows = await client.query<{ event_id: string; seq: string; payload: RoomMessageRecord }>('select event_id, seq::text, payload from local_room.event e where stream_id = $1 and seq > $2::numeric order by e.seq limit $3', [roomId, after, limit]);
			return rows.rows.map((r) => ({ eventId: r.event_id, streamId: roomId, seq: r.seq, kind: 'local_room.message_created', actor: r.payload.author.principalId, occurredAt: r.payload.createdAt, payload: r.payload }));
		},
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
		async readSelected(roomId, ids) {
			const rows = await client.query<MessageRow>(`select m.message_id, m.room_id, m.room_seq::text as room_seq, m.author_kind, m.author_principal_id, m.command_id, m.body, m.citations, ${CREATED_AT} as created_at from local_room.message m where m.room_id = $1 and m.message_id = any($2::uuid[])`, [roomId, ids]);
			return rows.rows.map(toRecord);
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
const LOCAL_AGENT = asPrincipalId('a0000000-0000-4000-8000-000000000004');
const LABEL = 'Deterministic local fixture (not AI inference)';

// Lock, dedupe, load persisted source records, construct the proposal and append in one transaction.
// The receipt belongs to the local agent, not the human send identity. No caller can supply an author or answer text.
async function answer(store: LocalRoomStore, identity: LocalRoomIdentity, command: Parameters<NonNullable<LocalRoomPort['answer']>>[0]): ReturnType<NonNullable<LocalRoomPort['answer']>> {
	if (command.projectId !== identity.projectId || command.roomId !== identity.roomId) return { outcome: 'denied', reasonCode: 'scope_mismatch', detail: 'fixed room only' };
	if (!(await store.lockRoom(identity.roomId))) return { outcome: 'denied', reasonCode: 'not_found', detail: 'room not found' };
	const prior = await store.findReceipt(LOCAL_AGENT, command.commandId);
	if (prior) return prior.requestDigest === command.requestDigest
		? { outcome: 'committed', receipt: prior, replayed: true }
		: { outcome: 'denied', reasonCode: 'command_conflict', detail: 'command identity reused with another selection' };
	const records = await store.readSelected(identity.roomId, command.selectedIds);
	const context = compileAnswerContext({ scope: identity, requestId: command.commandId, selectedIds: command.selectedIds }, { kind: 'persisted_messages', records });
	if (context.outcome === 'denied') return { outcome: 'denied', reasonCode: 'not_found', detail: `selection refused: ${context.reason}` };
	const proposed = proposeLocalAnswer(context.value);
	if (proposed.outcome === 'denied') return { outcome: 'denied', reasonCode: 'not_found', detail: `citation refused: ${proposed.reason}` };
	const body = `${LABEL}\n${proposed.value.claims.map(c => `> ${c.text}`).join('\n')}`;
	if (Array.from(body).length > 4096) return { outcome: 'denied', reasonCode: 'not_found', detail: 'answer exceeds message bound' };
	const seq = await store.nextSeq(identity.roomId);
	const message: RoomMessageRecord = { messageId: asMessageId(randomUUID()), projectId: identity.projectId, roomId: identity.roomId, roomSeq: seq, author: { kind: 'local_agent', principalId: LOCAL_AGENT }, commandId: command.commandId, body, citations: proposed.value.claims.map(c => c.citation), createdAt: new Date().toISOString() };
	const receipt: RoomReceipt = { commandId: command.commandId, requestDigest: command.requestDigest, roomId: identity.roomId, revision: seq, messageId: message.messageId, receiptId: randomUUID() };
	await store.append(message, messageCreated(message), LOCAL_AGENT, receipt);
	return { outcome: 'committed', receipt, replayed: false };
}


export function createPostgresLocalRoom(database: Database, identity: LocalRoomIdentity): LocalRoomPort {
	return {
		events: (after) => database.withLocalRoom(identity.projectId, (store) => store.readEvents(identity.roomId, after, 50), { readOnly: true }),
		send: (command) => database.withLocalRoom(identity.projectId, (store) => sendRoomMessage(store, identity, command)),
		answer: (command) => database.withLocalRoom(identity.projectId, (store) => answer(store, identity, command)),
		snapshot: async () => ({ outcome: 'ok', snapshot: await database.withLocalRoom(identity.projectId, (store) => store.readSnapshot(identity.roomId, SNAPSHOT_LIMIT), { readOnly: true }) }),
	};
}
