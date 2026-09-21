import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { browserValidatorSource, browserValidatorWrapper } from '../contracts/tools/browser-validator.ts';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { LOCAL_ROOM } from '../packages/domain/src/index.ts';
import { openDatabase, createPostgresLocalRoom } from '../packages/storage/src/index.ts';
import { createApp } from '../apps/center/src/app.ts';
import { fileId, loadOwner, pause, proof, saveOwner } from './local-room-owner.ts';

const owner = loadOwner(process.argv[2] ?? '');
const password = existsSync(`${owner.root}/password`) ? readFileSync(`${owner.root}/password`, 'utf8') : owner.secret;
const run = (file: string, args: string[]): string => {
	const r = spawnSync(file, args, { encoding: 'utf8', timeout: 20_000, maxBuffer: 1_048_576, env: { ...process.env, PGPASSWORD: password, PGCONNECT_TIMEOUT: '2' } });
	if (r.status !== 0) throw new Error(`${file} failed: ${r.stderr.slice(0, 500)}`);
	return r.stdout;
};
const bin = (name: string): string => process.env['AGORA_PG_BIN'] ? `${process.env['AGORA_PG_BIN']}/${name}` : name;
const url = (user: string): string => `postgresql://${user}:${password}@127.0.0.1:${owner.postgres_port}/agora_local`;
let postgres: ReturnType<typeof spawn> | undefined;
let database: ReturnType<typeof openDatabase> | undefined;
const server = createServer();
let stopping = false;
async function stop(): Promise<void> {
	if (stopping) return;
	stopping = true;
	server.close(); server.closeAllConnections();
	await database?.close();
	if (postgres?.exitCode === null && postgres.signalCode === null) {
		postgres.kill('SIGINT'); // Only our unreaped direct child, never a PID loaded from disk.
		await Promise.race([once(postgres, 'exit'), pause(8000).then(() => { if (postgres?.exitCode === null && postgres.signalCode === null) throw new Error('database cleanup unconfirmed'); })]);
	}
	owner.state = 'stopped'; saveOwner(owner); process.exit(0);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { void stop().catch((e: unknown) => { console.error(String(e)); process.exit(70); }); });
try {
	await new Promise<void>((yes, no) => { server.once('error', no); server.listen(Number(new URL(owner.url).port), '127.0.0.1', yes); });
	const fresh = !existsSync(`${owner.root}/data`);
	if (fresh) {
		writeFileSync(`${owner.root}/password`, password, { mode: 0o600 });
		run(bin('initdb'), ['-D', `${owner.root}/data`, '-U', 'postgres', '-A', 'scram-sha-256', '--pwfile', `${owner.root}/password`, '--no-locale', '-E', 'UTF8']);
		owner.dataId = fileId(`${owner.root}/data`); saveOwner(owner);
	}
	postgres = spawn(bin('postgres'), ['-D', `${owner.root}/data`, '-k', '', '-h', '127.0.0.1', '-p', String(owner.postgres_port), '-c', `cluster_name=${owner.launch}`, '-c', 'statement_timeout=5000'], { stdio: ['ignore', 'ignore', 'inherit'] });
	postgres.once('error', (e) => { console.error(e.message); });
	owner.postgres_pid = postgres.pid ?? 0; owner.center_pid = process.pid; saveOwner(owner);
	const psql = (sql: string): string => run(bin('psql'), ['-h', '127.0.0.1', '-p', String(owner.postgres_port), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql]);
	let ready = false;
	const deadline = Date.now() + 8000;
	while (Date.now() < deadline) {
		if (postgres.exitCode !== null || postgres.signalCode !== null) throw new Error('postgres start failed');
		try { if (psql('show cluster_name').trim() !== owner.launch) throw new Error('foreign PostgreSQL launch'); ready = true; break; } catch { await pause(100); }
	}
	if (!ready) throw new Error('postgres readiness timeout');
	if (fresh) {
		psql(`CREATE ROLE agora_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${password}'; CREATE ROLE agora_owner LOGIN NOSUPERUSER CREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${password}'`);
		psql('CREATE DATABASE agora_local OWNER agora_owner');
	}
	const migration = openDatabase(url('agora_owner'));
	try { await migration.migrate(); } finally { await migration.close(); }
	const appDatabase = openDatabase(url('agora_app')); database = appDatabase;
	const app = createApp({ probeDatabase: () => appDatabase.reachable(), localRoom: createPostgresLocalRoom(appDatabase, LOCAL_ROOM) });
	// Reuse Vite from the existing locked Vitest toolchain, without changing dependencies.
	const vite = await import(createRequire(import.meta.resolve('vitest/config')).resolve('vite')) as { build(options: unknown): Promise<unknown> };
	const contractRequire = createRequire(import.meta.resolve('@agora/contracts'));
	writeFileSync(`${owner.root}/validator.cjs`, browserValidatorSource());
	writeFileSync(`${owner.root}/validator.mjs`, browserValidatorWrapper(`${owner.root}/validator.cjs`, resolve('contracts/src/canonical.ts')));
	await vite.build({ configFile: false, logLevel: 'silent', resolve: { alias: { '@agora/contracts': `${owner.root}/validator.mjs`, ajv: dirname(contractRequire.resolve('ajv/package.json')), 'ajv-formats': dirname(contractRequire.resolve('ajv-formats/package.json')) } }, build: { commonjsOptions: { include: [/node_modules/, /validator.cjs/] }, outDir: `${owner.root}/harness`, emptyOutDir: true, lib: { entry: 'scripts/local-room-browser.ts', formats: ['es'], fileName: 'harness' } } });
	let tokens = 60, last = Date.now();
	server.on('request', (request, response) => {
		const answer = (status: number, text: string, type = 'text/plain'): void => {
			if (status >= 400 && type === 'text/plain') { text = JSON.stringify({ reason_code: status === 403 ? 'scope_mismatch' : status === 429 ? 'blocked_prerequisite' : status >= 500 ? 'infrastructure_failure' : 'malformed_command', correlation_id: randomUUID(), details: [text] }); type = 'application/json'; }
			response.writeHead(status, { 'content-type': type }); response.end(text);
		};
		request.on('error', () => response.destroy());
		response.setHeader('content-security-policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
		response.setHeader('cache-control', 'no-store'); response.setHeader('x-content-type-options', 'nosniff');
		if (request.headers.host !== new URL(owner.url).host || request.headers.origin && request.headers.origin !== owner.url) { answer(403, 'loopback origin refused'); return; }
		const target = new URL(request.url ?? '/', owner.url);
		if (target.pathname === '/_runtime/identity' && request.method === 'GET') { response.setHeader('x-agora-proof', proof(owner, target.searchParams.get('nonce') ?? '')); answer(200, owner.launch); return; }
		if (target.pathname === '/_runtime/stop' && request.method === 'POST') {
			if (request.headers.authorization !== `Bearer ${owner.secret}`) { answer(403, 'foreign owner'); return; }
			answer(200, 'stopping'); setTimeout(() => { void stop(); }, 20); return;
		}
		if (target.pathname === '/') { answer(200, readFileSync('scripts/local-room-harness.html', 'utf8'), 'text/html'); return; }
		if (target.pathname === '/harness.js') { answer(200, readFileSync(`${owner.root}/harness/harness.js`, 'utf8'), 'text/javascript'); return; }
		if (request.method === 'POST' && request.headers['content-type'] !== 'application/json') { answer(415, 'JSON required'); return; }
		let size = 0; const chunks: Buffer[] = [];
		request.on('data', (chunk: Buffer) => {
			size += chunk.length;
			if (size > 131072) { if (!response.writableEnded) { answer(413, 'body limit'); response.once('finish', () => request.destroy()); } }
			else chunks.push(chunk);
		});
		request.on('end', () => {
			if (response.writableEnded) return;
			if (request.method === 'POST') {
				tokens = Math.min(60, tokens + (Date.now() - last) / 1000); last = Date.now();
				if (tokens < 1) { response.setHeader('retry-after', '1'); answer(429, 'rate limit'); return; } tokens--;
			}
			if (chunks.length && (request.method === 'GET' || request.method === 'HEAD')) { answer(400, 'read body refused'); return; }
			void Promise.resolve().then(() => app.fetch(new Request(target, { method: request.method ?? 'GET', ...(chunks.length ? { body: Buffer.concat(chunks) } : {}) }))).then(async (result) => { answer(result.status, await result.text(), result.headers.get('content-type') ?? 'application/json'); }).catch(() => { answer(500, 'request failed'); });
		});
	});
	server.requestTimeout = 5000; server.headersTimeout = 5000; server.setTimeout(5000, (socket) => socket.destroy());
	owner.state = 'running'; saveOwner(owner); process.send?.('ready');
} catch (e) {
	console.error(String(e)); process.send?.('failed'); await stop();
}
