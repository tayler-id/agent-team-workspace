import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { expect, test } from 'vitest';
import { RoomClient } from '../../../scripts/local-room-client.ts';
import { synchronize } from '@agora/client-core';

const room = 'a0000000-0000-4000-8000-000000000002';
const scope = { project_id: 'a0000000-0000-4000-8000-000000000001', room_id: room };
const snapshot = { schema_version: 'agora.local-room.snapshot/v1', scope, cursor: { stream_id: room, committed_seq: '0' }, messages: [] };
const event = { schema_version: 'agora.local-room.event/v1', stream_id: room, seq: '1', event_id: randomUUID(), kind: 'local_room.message_created', actor: randomUUID(), occurred_at: '2026-09-21T00:00:00.000Z', payload: { schema_version: 'agora.local-room.message/v1', message_id: randomUUID(), scope, room_seq: '1', author: { kind: 'human', principal_id: randomUUID() }, command_id: randomUUID(), body: 'committed', citations: [], created_at: '2026-09-21T00:00:00.000Z' } };

test('projection rejects unknown and mismatched frames, preserves newer revisions and ignores stale snapshots', () => {
	const c = new RoomClient('http://127.0.0.1:1'); c.snapshot(snapshot);
	expect(() => { c.events([{ ...event, kind: 'unknown' }]); }).toThrow('invalid');
	expect(c.state.rooms[0]?.mode).toBe('upgrade'); c.snapshot(snapshot);
	expect(() => { c.events([{ ...event, seq: '2' }]); }).toThrow('identity');
	c.events([event]);
	c.state = synchronize(c.state, { type: 'event', streamId: room, seq: '2', change: { type: 'message', message: { id: event.payload.message_id, createdSeq: '1', revision: '2', content: { tag: 'visible', body: 'newer revision' } } } }).state;
	c.events([{ ...event, seq: '3', payload: { ...event.payload, room_seq: '3' } }]); // Contradictory creation position requests resync, never overwrites.
	expect(c.state.rooms[0]?.mode).toBe('resync');
	c.snapshot(snapshot);
	expect(c.state.rooms[0]?.cursor).toBe('2');
	expect(c.state.rooms[0]?.messages[0]?.content).toEqual({ tag: 'visible', body: 'newer revision' });
});

test('cancellation is bounded before any request and leaves the committed cursor unchanged', async () => {
	const c = new RoomClient('http://127.0.0.1:1'); c.snapshot(snapshot);
	const abort = new AbortController(); abort.abort();
	await expect(c.resume(abort.signal)).rejects.toThrow();
	expect(c.state.rooms[0]?.cursor).toBe('0');
});

test('a stalled HTTP read times out within a bounded wall interval without cursor movement', async () => {
	const server = createServer(() => undefined);
	await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
	try {
		const address = server.address(); if (!address || typeof address === 'string') throw new Error('no listener');
		const c = new RoomClient(`http://127.0.0.1:${address.port}`); c.snapshot(snapshot);
		const begin = Date.now(); await expect(c.resume()).rejects.toThrow();
		expect(Date.now() - begin).toBeLessThan(7000); expect(c.state.rooms[0]?.cursor).toBe('0');
	} finally { server.closeAllConnections(); await new Promise<void>((r) => { server.close(() => { r(); }); }); }
}, 10_000);

// Isolated copies only: each exact public denial must turn red when that single guard is removed.
const mutations = [
	['wire validation', 'client', "if (!result.ok) throw new Error(`invalid ${name}: ${result.details.join(';')}`);", 'if (!result.ok) return value as Schema<N>;', `const c = new m.RoomClient(''); c.snapshot(${JSON.stringify(snapshot)}); assert.throws(() => c.events([${JSON.stringify({ ...event, kind: 'unknown' })}]), /invalid/);`],
	['event identity', 'client', "if (e.stream_id !== this.state.rooms[0]?.streamId || e.seq !== e.payload.room_seq || e.stream_id !== e.payload.scope.room_id || e.payload.scope.project_id !== this.projectId) throw new Error('event identity mismatch');", '', `const c = new m.RoomClient(''); c.snapshot(${JSON.stringify(snapshot)}); assert.throws(() => c.events([${JSON.stringify({ ...event, seq: '2' })}]), /identity/);`],
	['snapshot scope', 'client', "if (s.cursor.stream_id !== s.scope.room_id || s.messages.some((m) => m.scope.room_id !== s.scope.room_id || m.scope.project_id !== s.scope.project_id)) throw new Error('snapshot scope mismatch');", '', `const c = new m.RoomClient(''); assert.throws(() => c.snapshot(${JSON.stringify({ ...snapshot, scope: { ...scope, room_id: randomUUID() } })}), /scope/);`],
	['launch challenge', 'owner', "if (response.headers.get('x-agora-proof') !== proof(o, nonce)) throw new Error('foreign runtime challenge');", '', "globalThis.fetch = async () => new Response('', {headers:{'x-agora-proof':'foreign'}}); await assert.rejects(m.authenticate({url:'http://127.0.0.1:1',launch:'other',secret:'key'}), /foreign/);"],
	['foreign symlink', 'owner', "if (s.isSymbolicLink()) throw new Error('foreign symlink refused');", '', "fs.symlinkSync('..', root+'/link'); assert.throws(() => m.safeTree(root+'/link'), /foreign/);"],
	['running reset', 'owner', "if (o.state !== 'stopped' || existsSync(`${o.root}/data/postmaster.pid`)) throw new Error('not proven stopped');", '', "await assert.rejects(m.stopped({state:'running',root,url:'http://127.0.0.1:0',postgres_port:0}), /stopped/);"],
];
for (const [name, module, guard, replacement, assertion] of mutations) test(`guard negative: ${name ?? ''}`, () => {
	if (!module || !guard || replacement === undefined || !assertion) throw new Error('invalid fixture');
	const root = resolve(`.scratch/guard-${randomUUID()}`); mkdirSync(root, { recursive: true });
	const source = readFileSync(`scripts/local-room-${module}.ts`, 'utf8'); expect(source).toContain(guard);
	try {
		for (const disabled of [false, true]) {
			const file = `${root}/subject.ts`; writeFileSync(file, disabled ? source.replace(guard, replacement) : source);
			const script = `import assert from 'node:assert/strict'; import fs from 'node:fs'; import * as m from ${JSON.stringify(file)}; const root=${JSON.stringify(root)}; ${assertion}`;
			const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 10_000 });
			expect(result.status, result.stderr).toBe(disabled ? 1 : 0);
			if (disabled) expect(result.stderr).toContain('AssertionError');
			if (name === 'foreign symlink') rmSync(`${root}/link`);
		}
	} finally { rmSync(root, { recursive: true, force: true }); }
});
