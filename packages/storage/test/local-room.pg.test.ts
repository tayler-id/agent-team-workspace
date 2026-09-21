import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Pool } from 'pg';
import { asCommandId, asMessageId, asProjectId, digestCanonical, LOCAL_ROOM, type MessageCitation, type RoomReceipt, type SendRoomMessage, sendRoomMessage } from '@agora/domain';
import { openDatabase, type Database } from '@agora/storage';

const ownerUrl = process.env['AGORA_TEST_OWNER_DATABASE_URL'] ?? '';
const appUrl = process.env['AGORA_TEST_DATABASE_URL'] ?? '';
const owner = openDatabase(ownerUrl);
const bypass = openDatabase(process.env['AGORA_TEST_BYPASS_DATABASE_URL'] ?? '');
let app = openDatabase(appUrl);
const otherProject = asProjectId(randomUUID());

const command = (body: string, citations: MessageCitation[] = [], commandId = asCommandId(randomUUID())): SendRoomMessage => ({ commandId, projectId: LOCAL_ROOM.projectId, roomId: LOCAL_ROOM.roomId, body, citations, requestDigest: digestCanonical({ command_id: commandId, body }) });
const send = (db: Database, c: SendRoomMessage) => db.withLocalRoom(LOCAL_ROOM.projectId, (store) => sendRoomMessage(store, LOCAL_ROOM, c));
const snapshot = (db: Database = app) => db.withLocalRoom(LOCAL_ROOM.projectId, (store) => store.readSnapshot(LOCAL_ROOM.roomId, 1000), { readOnly: true });
const committed = async (db: Database, c: SendRoomMessage): Promise<RoomReceipt> => {
	const result = await send(db, c);
	if (result.outcome !== 'committed') throw new Error(`expected committed, got ${JSON.stringify(result)}`);
	return result.receipt;
};
// Test-only raw statements as a given role inside one scoped transaction, for what the store refuses to express.
async function rawAs(url: string, scope: string, sql: string, params: unknown[] = []): Promise<unknown[]> {
	const pool = new Pool({ connectionString: url });
	const client = await pool.connect();
	try {
		await client.query('begin');
		await client.query('select set_config($1, $2, true)', ['agora.scope_id', scope]);
		const result = await client.query(sql, params);
		await client.query('commit');
		return result.rows as unknown[];
	} catch (error) {
		await client.query('rollback');
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
}

beforeAll(async () => {
	await owner.migrate();
});
afterAll(async () => {
	await app.close();
	await bypass.close();
	await owner.close();
});

test('the migration seeds exactly the fixed room the domain names, and a fresh adapter reads it back after the pool is closed and reopened', async () => {
	expect(await app.withLocalRoom(LOCAL_ROOM.projectId, (store) => store.lockRoom(LOCAL_ROOM.roomId))).toBe(true);
	const receipt = await committed(app, command('survives a reopened pool'));
	await app.close();
	app = openDatabase(appUrl);
	const after = await snapshot();
	expect(after.committedSeq).toBe(receipt.revision);
	expect(after.messages.at(-1)).toMatchObject({ messageId: receipt.messageId, roomSeq: receipt.revision, body: 'survives a reopened pool', author: { kind: 'human', principalId: LOCAL_ROOM.principalId } });
	expect(after.messages.at(-1)?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

describe('ordering', () => {
	test('eight concurrent distinct sends receive unique contiguous room sequences and event sequences equal to them', async () => {
		const base = Number((await snapshot()).committedSeq);
		let begun = 0;
		let release = (): void => undefined;
		const everyTransactionOpen = new Promise<void>((resolve) => { release = resolve; });
		const receipts = await Promise.all(Array.from({ length: 8 }, (_, i) => app.withLocalRoom(LOCAL_ROOM.projectId, async (store) => {
			if (++begun === 8) release();
			await everyTransactionOpen;
			return sendRoomMessage(store, LOCAL_ROOM, command(`concurrent ${i}`));
		})));
		const revisions = receipts.map((r) => (r.outcome === 'committed' ? Number(r.receipt.revision) : NaN)).sort((x, y) => x - y);
		expect(revisions).toEqual(Array.from({ length: 8 }, (_, i) => base + 1 + i));
		const events = await rawAs(appUrl, LOCAL_ROOM.projectId, "select e.seq::text as seq, e.payload->>'roomSeq' as room_seq, e.kind from local_room.event e where e.stream_id = $1 and e.seq > $2 order by e.seq", [LOCAL_ROOM.roomId, base]);
		expect(events).toEqual(revisions.map((seq) => ({ seq: String(seq), room_seq: String(seq), kind: 'local_room.message_created' })));
		expect((await snapshot()).messages.slice(-8).map((m) => Number(m.roomSeq))).toEqual(revisions);
	});

	test('eight concurrent sends of one command commit one message; the others replay its exact receipt', async () => {
		const base = Number((await snapshot()).committedSeq);
		const same = command('sent eight times at once');
		const results = await Promise.all(Array.from({ length: 8 }, () => send(app, same)));
		const receipts = results.map((r) => (r.outcome === 'committed' ? r : undefined));
		expect(receipts.filter((r) => r?.replayed === false)).toHaveLength(1);
		expect(receipts.filter((r) => r?.replayed === true)).toHaveLength(7);
		for (const r of receipts) expect(r?.receipt).toEqual(receipts[0]?.receipt);
		expect(Number((await snapshot()).committedSeq)).toBe(base + 1);
	});

	test('a transaction rolled back after the append consumes no visible sequence and leaves no message', async () => {
		const before = await snapshot();
		await expect(app.withLocalRoom(LOCAL_ROOM.projectId, async (store) => {
			await sendRoomMessage(store, LOCAL_ROOM, command('never committed'));
			throw new Error('simulated failure after append');
		})).rejects.toThrow('simulated failure after append');
		expect(await snapshot()).toEqual(before);
		expect(Number((await committed(app, command('next after rollback'))).revision)).toBe(Number(before.committedSeq) + 1);
	});
});

describe('idempotency and citations', () => {
	test('the same command identity and digest replays the original receipt; a changed body under the same command is command_conflict', async () => {
		const first = command('original body');
		const receipt = await committed(app, first);
		expect(await send(app, first)).toEqual({ outcome: 'committed', receipt, replayed: true });
		const changed = { ...first, body: 'changed body', requestDigest: digestCanonical({ command_id: first.commandId, body: 'changed body' }) };
		expect(await send(app, changed)).toMatchObject({ outcome: 'denied', reasonCode: 'command_conflict', detail: expect.stringContaining(first.requestDigest) as string });
		expect((await snapshot()).messages.filter((m) => m.commandId === first.commandId)).toHaveLength(1);
	});

	test('a citation must name a persisted message at its sequence; an unknown id or a wrong sequence is not_found', async () => {
		const cited = await committed(app, command('to be cited'));
		expect(await send(app, command('cites it', [{ recordId: cited.messageId, roomSeq: cited.revision }]))).toMatchObject({ outcome: 'committed', replayed: false });
		expect(await send(app, command('unknown id', [{ recordId: asMessageId(randomUUID()), roomSeq: cited.revision }]))).toMatchObject({ outcome: 'denied', reasonCode: 'not_found' });
		expect(await send(app, command('wrong seq', [{ recordId: cited.messageId, roomSeq: String(Number(cited.revision) + 1) }]))).toMatchObject({ outcome: 'denied', reasonCode: 'not_found' });
	});
});

describe('bounds at the store', () => {
	test('4096 two-byte scalars commit; 4097 scalars and eleven citations are refused by the table and roll back', async () => {
		const before = await snapshot();
		const max = await committed(app, command('é'.repeat(4096)));
		expect(max.revision).toBe(String(Number(before.committedSeq) + 1));
		await expect(send(app, command('x'.repeat(4097)))).rejects.toMatchObject({ code: '23514' });
		const cite: MessageCitation = { recordId: max.messageId, roomSeq: max.revision };
		await expect(send(app, command('too many', Array.from({ length: 11 }, () => cite)))).rejects.toMatchObject({ code: '23514' });
		expect((await snapshot()).committedSeq).toBe(max.revision);
	});
});

describe('scope and immutability', () => {
	test('a command for another project or room is scope_mismatch before any row is read', async () => {
		expect(await send(app, { ...command('elsewhere'), projectId: otherProject })).toMatchObject({ outcome: 'denied', reasonCode: 'scope_mismatch' });
		expect(await send(app, { ...command('elsewhere'), roomId: otherProject as unknown as SendRoomMessage['roomId'] })).toMatchObject({ outcome: 'denied', reasonCode: 'scope_mismatch' });
	});

	test('another project sees no room and cannot forge a row into the fixed project; a BYPASSRLS role sees the room, so the denial is the policy', async () => {
		expect(await app.withLocalRoom(otherProject, (store) => store.lockRoom(LOCAL_ROOM.roomId))).toBe(false);
		await expect(rawAs(appUrl, otherProject, 'insert into local_room.command_receipt (project_id, actor, command_id, request_digest, receipt) values ($1, $2, $3, $4, $5)', [LOCAL_ROOM.projectId, LOCAL_ROOM.principalId, randomUUID(), digestCanonical({}), '{}'])).rejects.toMatchObject({ code: '42501' });
		await expect(rawAs(appUrl, otherProject, 'insert into local_room.room (project_id, room_id) values ($1, $2)', [otherProject, randomUUID()])).rejects.toMatchObject({ code: '42501' });
		expect(await bypass.withLocalRoom(otherProject, (store) => store.lockRoom(LOCAL_ROOM.roomId))).toBe(true);
	});

	test('messages, events and receipts cannot be updated or deleted by the service role or by the schema owner', async () => {
		const receipt = await committed(app, command('immutable'));
		for (const [table, key] of [['message', 'message_id'], ['event', 'event_id'], ['command_receipt', 'command_id']] as const) {
			const where = table === 'command_receipt' ? `command_id = '${receipt.commandId}'` : `${key} is not null`;
			await expect(rawAs(appUrl, LOCAL_ROOM.projectId, `delete from local_room.${table} where ${where}`)).rejects.toMatchObject({ code: '42501' });
			await expect(rawAs(ownerUrl, LOCAL_ROOM.projectId, `delete from local_room.${table} where ${where}`)).rejects.toThrow(`local_room.${table} is immutable`);
		}
		await expect(rawAs(appUrl, LOCAL_ROOM.projectId, 'update local_room.message set body = $1 where message_id = $2', ['edited', receipt.messageId])).rejects.toMatchObject({ code: '42501' });
		await expect(rawAs(ownerUrl, LOCAL_ROOM.projectId, 'update local_room.message set body = $1 where message_id = $2', ['edited', receipt.messageId])).rejects.toThrow('local_room.message is immutable');
		expect((await snapshot()).messages.find((m) => m.messageId === receipt.messageId)?.body).toBe('immutable');
	});
});
