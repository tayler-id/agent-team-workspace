import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { createWireValidator, type Schema } from '@agora/contracts';
import { digestCanonical } from '@agora/domain';
import { openDatabase } from '@agora/storage';

// Drives the real center process over HTTP against the test cluster, as the non-owner service role. The ids are the
// fixed room migration 0001 seeds (LOCAL_ROOM in @agora/domain), written literally so the test depends only on the public surface.
const LOCAL_ROOM = { projectId: 'a0000000-0000-4000-8000-000000000001', roomId: 'a0000000-0000-4000-8000-000000000002', principalId: 'a0000000-0000-4000-8000-000000000003' };
const owner = openDatabase(process.env['AGORA_TEST_OWNER_DATABASE_URL'] ?? '');
const validator = createWireValidator();
const port = 3000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${port}`;
let center: ChildProcessByStdio<null, Readable, null>;

async function start(): Promise<void> {
	center = spawn(process.execPath, ['apps/center/src/main.ts'], { cwd: new URL('../../..', import.meta.url), env: { ...process.env, PORT: String(port), AGORA_DATABASE_URL: process.env['AGORA_TEST_DATABASE_URL'] }, stdio: ['ignore', 'pipe', 'inherit'] });
	await once(center.stdout, 'data');
}
async function stop(): Promise<void> {
	center.kill();
	await once(center, 'exit');
}
const send = async (body: unknown) => {
	const response = await fetch(`${base}/api/v1/local-room/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
	return { status: response.status, body: (await response.json()) as Record<string, unknown> };
};
const snapshot = async (): Promise<Schema<'RoomSnapshot'>> => {
	const response = await fetch(`${base}/api/v1/local-room/snapshot`);
	expect(response.status).toBe(200);
	const result = validator.validate('RoomSnapshot', await response.json());
	if (!result.ok) throw new Error(result.details.join('; '));
	return result.value;
};
const scope = { project_id: LOCAL_ROOM.projectId, room_id: LOCAL_ROOM.roomId };
const command = (body: string, citations: Schema<'RecordCitation'>[] = [], command_id = randomUUID()): Schema<'SendRoomMessageCommand'> => ({ schema_version: 'agora.local-room.send-message/v1', command_id, scope, body, citations });
const first = command('First persisted message.');
let firstReceipt: Schema<'RoomCommandReceipt'>;
let baseSeq: number;

beforeAll(async () => {
	await owner.migrate();
	await owner.close();
	await start();
});
afterAll(stop);

test('an accepted send answers 201 with a schema-valid receipt whose identity digest is the canonical digest of the command and whose revision is the next room sequence', async () => {
	baseSeq = Number((await snapshot()).cursor.committed_seq);
	const { status, body } = await send(first);
	expect(status).toBe(201);
	const receipt = validator.validate('RoomCommandReceipt', body);
	expect(receipt).toMatchObject({ ok: true });
	if (!receipt.ok) return;
	firstReceipt = receipt.value;
	expect(firstReceipt).toMatchObject({ identity: { command_id: first.command_id, request_digest: digestCanonical(first) }, receipt: { command_id: first.command_id, aggregate_id: LOCAL_ROOM.roomId, revision: String(baseSeq + 1), event_cursors: [{ stream_id: LOCAL_ROOM.roomId, committed_seq: String(baseSeq + 1) }] }, replayed: false });
});

test('replaying the same command returns the original receipt with replayed: true and no second message', async () => {
	expect(await send(first)).toEqual({ status: 201, body: { ...firstReceipt, replayed: true } });
	expect((await snapshot()).messages.filter((m) => m.command_id === first.command_id)).toHaveLength(1);
});

test('reusing the command id with a changed body is 409 command_conflict naming the committed digest', async () => {
	const { status, body } = await send({ ...first, body: 'Changed body under the same command id.' });
	expect(status).toBe(409);
	expect(body).toMatchObject({ reason_code: 'command_conflict', details: [expect.stringContaining(firstReceipt.identity.request_digest) as string] });
});

test('another project or room is 404 scope_mismatch and a citation to no persisted record is 404 not_found; nothing is stored', async () => {
	expect(await send({ ...command('elsewhere'), scope: { ...scope, project_id: randomUUID() } })).toMatchObject({ status: 404, body: { reason_code: 'scope_mismatch' } });
	expect(await send({ ...command('elsewhere'), scope: { ...scope, room_id: randomUUID() } })).toMatchObject({ status: 404, body: { reason_code: 'scope_mismatch' } });
	expect(await send(command('cites nothing', [{ record_kind: 'message', record_id: randomUUID(), room_seq: '1' }]))).toMatchObject({ status: 404, body: { reason_code: 'not_found' } });
	expect((await snapshot()).cursor.committed_seq).toBe(String(baseSeq + 1));
});

test('a citation to the persisted message commits at the next sequence, and validation failures are 400 before storage', async () => {
	const cited = await send(command('Replies to the first message.', [{ record_kind: 'message', record_id: firstReceipt.message_id, room_seq: firstReceipt.receipt.revision }]));
	expect(cited).toMatchObject({ status: 201, body: { receipt: { revision: String(baseSeq + 2) }, replayed: false } });
	expect(await send(command('x'.repeat(4097)))).toMatchObject({ status: 400, body: { reason_code: 'malformed_command', details: ['/body must NOT have more than 4096 characters'] } });
	expect(await send({ ...command('forged author'), author: { kind: 'human', principal_id: LOCAL_ROOM.principalId } })).toMatchObject({ status: 400, body: { reason_code: 'malformed_command' } });
	expect((await snapshot()).cursor.committed_seq).toBe(String(baseSeq + 2));
});

test('the snapshot after a service restart is identical, a replay still returns the original receipt, and the next send continues the sequence', async () => {
	const before = await snapshot();
	expect(before.messages.slice(-2).map((m) => [m.room_seq, m.body, m.citations.length])).toEqual([[String(baseSeq + 1), 'First persisted message.', 0], [String(baseSeq + 2), 'Replies to the first message.', 1]]);
	await stop();
	await start();
	expect(await snapshot()).toEqual(before);
	expect(await send(first)).toEqual({ status: 201, body: { ...firstReceipt, replayed: true } });
	expect(await send(command('After restart.'))).toMatchObject({ status: 201, body: { receipt: { revision: String(baseSeq + 3) } } });
	expect((await snapshot()).messages.at(-1)).toMatchObject({ room_seq: String(baseSeq + 3), body: 'After restart.', author: { kind: 'human', principal_id: LOCAL_ROOM.principalId } });
});
