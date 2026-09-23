import { execFile, execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer, request } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createWireValidator, type Schema } from '@agora/contracts';

const instance = `test-${randomUUID()}`;
const root = `.scratch/local-room-${instance}`;
const cli = (command: string, ...args: string[]): Promise<{ exit: number; report: { outcome: string; url: string; launch: string; detail: string } }> => new Promise((resolve, reject) => {
	execFile(process.execPath, ['scripts/local-room.ts', command, '--instance', instance, ...args], { encoding: 'utf8', timeout: 45_000 }, (error, stdout) => {
		try { resolve({ exit: typeof error?.code === 'number' ? error.code : error ? 70 : 0, report: JSON.parse(stdout) as { outcome: string; url: string; launch: string; detail: string } }); }
		catch (e) { reject(new Error(String(e))); }
	});
});
const wire = createWireValidator();
const rawStatus = (url: string, headers: Record<string, string>): Promise<number | undefined> => new Promise((resolve, reject) => {
	request(`${url}/api/v1/local-room/snapshot`, { headers }, (r) => { r.resume(); resolve(r.statusCode); }).on('error', reject).end();
});
const snapshot = async (url: string): Promise<Schema<'RoomSnapshot'>> => {
	const response = await fetch(`${url}/api/v1/local-room/snapshot`);
	expect(response.status).toBe(200);
	const parsed = wire.validate('RoomSnapshot', await response.json());
	if (!parsed.ok) throw new Error(parsed.details.join(';'));
	return parsed.value;
};

test('public runtime owns its lifecycle, retains history, replays committed events and refuses foreign resources', async () => {
	expect((await cli('doctor')).exit).toBe(0);
	const start = (await cli('start'));
	expect(start.report.outcome).toBe('pass'); // R22: the executable parent answers unavailable, not missing runner.
	let url = start.report.url;
	try {
		expect((await fetch(`${url}/api/v1/health`)).status).toBe(200);
		expect((await cli('start')).exit).toBe(2);
		expect((await cli('status')).report.launch).toBe(start.report.launch);
		const harness = await fetch(url);
		expect(harness.headers.get('content-security-policy')).not.toContain('unsafe-eval');
		expect(await harness.text()).toContain('<div id="root">');
		const before = await snapshot(url);
		const command = { schema_version: 'agora.local-room.send-message/v1', command_id: randomUUID(), scope: before.scope, body: '<img src=x onerror=alert(1)> persisted', citations: [] };
		const accepted = await fetch(`${url}/api/v1/local-room/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(command) });
		expect(accepted.status).toBe(201);
		await accepted.body?.cancel(); // The accepted command's receipt never reaches the client projection.
		const replay = await fetch(`${url}/api/v1/local-room/events?after=${before.cursor.committed_seq}`);
		expect(replay.status).toBe(200);
		const events = await replay.json() as Schema<'RoomMessageCreatedEvent'>[];
		expect(events).toHaveLength(1);
		const { RoomClient } = await import('../../../scripts/local-room-client.ts');
		const client = new RoomClient(url);
		client.snapshot(before);
		await client.resume();
		expect(client.state.rooms[0]?.messages.map((m) => m.content)).toEqual([{ tag: 'visible', body: command.body }]);
		client.events(events); client.events(events);
		expect(client.state.rooms[0]?.messages).toHaveLength(1);
		const cursorBeforeReceipt = client.state.rooms[0]?.cursor;
		const retried = await client.send(command);
		expect(retried.replayed).toBe(true);
		expect(client.state.rooms[0]?.cursor).toBe(cursorBeforeReceipt);
		expect((await snapshot(url)).messages).toHaveLength(1);
		expect((await cli('send', '--body', 'second')).exit).toBe(0);
		expect((await cli('send', '--body', 'third')).exit).toBe(0);
		const all = await (await fetch(`${url}/api/v1/local-room/events?after=0`)).json() as Schema<'RoomMessageCreatedEvent'>[];
		client.events(all.slice(2));
		expect(client.state.rooms[0]?.mode).toBe('gap');
		expect(client.state.rooms[0]?.cursor).toBe('1');
		await client.resume();
		expect(client.state.rooms[0]?.cursor).toBe('3');
		expect(client.state.rooms[0]?.messages).toHaveLength(3);
		expect((await cli('replay')).exit).toBe(0);
		expect((await client.request('events?after=1') as Schema<'RoomMessageCreatedEvent'>[]).map((e) => e.seq)).toEqual(['2', '3']);
		for (const headers of [{ host: 'evil.invalid' }, { origin: 'https://evil.invalid' }]) expect(await rawStatus(url, headers)).toBe(403);
		expect((await fetch(`${url}/api/v1/local-room/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(131073) })).status).toBe(413);
		expect((await fetch(`${url}/api/v1/local-room/events?after=-1`)).status).toBe(400);
		expect(await (await fetch(`${url}/api/v1/local-room/events?after=18446744073709551615`)).json()).toEqual([]);
		expect((await fetch(`${url}/_runtime/stop`, { method: 'POST' })).status).toBe(403);
		expect((await cli('reset', '--confirm-disposable')).exit).toBe(2);
		const ownerPath = `${root}/owner.json`, owned = readFileSync(ownerPath, 'utf8');
		for (const field of ['launch', 'center_pid', 'root', 'rootId', 'dataId']) {
			const forged = JSON.parse(owned) as Record<string, unknown>; forged[field] = field === 'center_pid' ? process.pid : randomUUID();
			writeFileSync(ownerPath, JSON.stringify(forged));
			try { expect((await cli('stop')).exit).toBe(2); expect((await cli('reset', '--confirm-disposable')).exit).toBe(2); }
			finally {
				const current = JSON.parse(readFileSync(ownerPath, 'utf8')) as { state: string };
				writeFileSync(ownerPath, current.state === 'stopped' ? JSON.stringify({ ...JSON.parse(owned) as object, state: 'stopped' }) : owned);
			}
		}
		expect((await fetch(`${url}/api/v1/health`)).status).toBe(200);
		const durable = await snapshot(url);
		for (let attempt = 0; attempt < 2; attempt++) {
			expect((await cli('evidence')).exit).toBe(0);
			expect((await cli('stop')).exit).toBe(0);
			expect((await cli('status')).report.detail).toBe('stopped; data retained');
			const next = (await cli('start')); expect(next.exit).toBe(0); expect(next.report.url).toBe(url); url = next.report.url;
			expect(next.report.launch).not.toBe(start.report.launch);
			expect(await snapshot(url)).toEqual(durable);
		}
		expect((await cli('stop')).exit).toBe(0);
		expect((await cli('reset')).exit).toBe(64);
		expect((await cli('reset', '--confirm-disposable')).exit).toBe(0);
		expect(existsSync(root)).toBe(false);
		const fresh = (await cli('start')); expect(fresh.exit).toBe(0); url = fresh.report.url;
		expect((await snapshot(url)).messages).toEqual([]);
	} finally {
		(await cli('stop')); (await cli('reset', '--confirm-disposable'));
	}
}, 180_000);

test('bounded committed pump resumes between batches, receipt alone never advances, and rate denial stores nothing', async () => {
	const start = (await cli('start')); expect(start.exit).toBe(0);
	const url = start.report.url;
	try {
		const before = await snapshot(url);
		const { RoomClient } = await import('../../../scripts/local-room-client.ts');
		const c = new RoomClient(url); c.snapshot(before);
		for (let i = 0; i < 51; i++) await c.send({ schema_version: 'agora.local-room.send-message/v1', command_id: randomUUID(), scope: before.scope, body: `ordered ${i}`, citations: [] });
		expect(c.state.rooms[0]?.cursor).toBe('0');
		const batch = await c.request('events?after=0') as Schema<'RoomMessageCreatedEvent'>[];
		expect(batch).toHaveLength(50); c.events(batch);
		expect(c.state.rooms[0]?.cursor).toBe('50');
		const cancel = new AbortController(); cancel.abort();
		await expect(c.resume(cancel.signal)).rejects.toThrow();
		await c.resume();
		expect(c.state.rooms[0]?.messages.map((m) => m.content)).toEqual(Array.from({ length: 51 }, (_, i) => ({ tag: 'visible', body: `ordered ${i}` })));
		const responses = await Promise.all(Array.from({ length: 20 }, (_, i) => fetch(`${url}/api/v1/local-room/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ schema_version: 'agora.local-room.send-message/v1', command_id: randomUUID(), scope: before.scope, body: `rate ${i}`, citations: [] }) })));
		expect(responses.some((r) => r.status === 429)).toBe(true);
		expect((await snapshot(url)).messages).toHaveLength(51 + responses.filter((r) => r.status === 201).length);
		for (const r of responses) await r.body?.cancel();
	} finally { expect((await cli('stop')).exit).toBe(0); expect((await cli('reset', '--confirm-disposable')).exit).toBe(0); }
}, 90_000);

test('concurrent startup has one owner and cancellation cleans only its own pending launch', async () => {
	const starts = await Promise.all([cli('start'), cli('start')]);
	try { expect(starts.map((s) => s.exit).sort()).toEqual([0, 2]); }
	finally { expect((await cli('stop')).exit).toBe(0); expect((await cli('reset', '--confirm-disposable')).exit).toBe(0); }
	const child = spawn(process.execPath, ['scripts/local-room.ts', 'start', '--instance', instance], { stdio: ['ignore', 'pipe', 'pipe'] });
	const done = once(child, 'exit');
	for (let i = 0; i < 200; i++) {
		if (existsSync(`${root}/owner.json`) && (JSON.parse(readFileSync(`${root}/owner.json`, 'utf8')) as { postgres_pid: number }).postgres_pid) break;
		await new Promise((r) => setTimeout(r, 10));
	}
	child.kill('SIGINT'); await done;
	try { expect((await cli('status')).report.detail).toBe('stopped; data retained'); }
	finally { await cli('stop'); expect((await cli('reset', '--confirm-disposable')).exit).toBe(0); }
}, 90_000);

test('foreign listener and symlink collisions are refused without touching their owner', async () => {
	const server = createServer((_request, response) => response.end('foreign'));
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	try {
		const address = server.address(); if (!address || typeof address === 'string') throw new Error('no listener');
		expect((await cli('start', '--port', String(address.port))).exit).toBe(2);
		expect(await (await fetch(`http://127.0.0.1:${address.port}`)).text()).toBe('foreign');
		if (existsSync(root)) { (await cli('stop')); (await cli('reset', '--confirm-disposable')); }
		execFileSync('ln', ['-s', '..', root]);
		expect((await cli('start')).exit).toBe(2);
		expect((await cli('reset', '--confirm-disposable')).exit).toBe(2);
	} finally {
		execFileSync('rm', ['-f', root]);
		await new Promise<void>((resolve) => server.close(() => { resolve(); }));
	}
}, 60_000);
