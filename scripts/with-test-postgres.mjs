// One command, one private socket lease and one directly owned PostgreSQL process group.
// All four AGORA_TEST_*_DATABASE_URL values opt into an externally managed server instead.
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, lstatSync, mkdtempSync, openSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout, clearTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { allocatePostgresSocket } from './postgres-socket.ts';

const SUPERUSER = 'postgres';
const OWNER = 'agora_owner';
const APP = 'agora_app';
const BYPASS = 'agora_bypass';
const DATABASE = 'agora_test';
const command = process.argv.slice(2);
const startupMs = Number(process.env.AGORA_PG_STARTUP_TIMEOUT_MS ?? 30_000);
if (!command.length || !Number.isInteger(startupMs) || startupMs < 1 || startupMs > 300_000) {
	console.error('usage: node scripts/with-test-postgres.mjs <command> [args...]; AGORA_PG_STARTUP_TIMEOUT_MS: 1..300000');
	process.exit(64);
}
const report = (outcome, fields = {}) => console.error(JSON.stringify({ schema_version: 'agora.test-postgres/v1', outcome, ...fields }));
const controller = new globalThis.AbortController();
const children = new Set();
let exitCode = 0;
const cancel = (code) => { exitCode ||= code; controller.abort(); };
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) process.on(signal, () => cancel(code));
const launch = (file, args, options = {}, signal = 'SIGTERM') => {
	controller.signal.throwIfAborted();
	const child = spawn(file, args, { detached: true, stdio: 'ignore', ...options });
	const kill = (sig) => {
		try { if (child.pid) process.kill(-child.pid, sig); }
		catch (error) {
			if (error.code === 'ESRCH') return;
			// Darwin can return EPERM for a group containing only exiting zombies.
			const census = spawnSync('ps', ['-A', '-o', 'pgid=,stat='], { encoding: 'utf8', timeout: 1_000 });
			const live = census.stdout?.split('\n').some(line => { const [group, state] = line.trim().split(/\s+/); return group === String(child.pid) && !state?.startsWith('Z'); });
			if (error.code !== 'EPERM' || census.status !== 0 || live) throw error;
		}
	};
	const done = new Promise(resolve => {
		child.once('error', error => { report('blocked', { message: String(error) }); resolve(70); });
		child.once('exit', (code) => resolve(code ?? 70));
	});
	const stop = async () => {
		kill(signal);
		const timer = setTimeout(() => kill('SIGKILL'), 1_000);
		try { await done; } finally { clearTimeout(timer); kill('SIGKILL'); }
	};
	const abort = () => { void stop(); };
	children.add(stop);
	controller.signal.addEventListener('abort', abort, { once: true });
	void done.then(() => { kill('SIGKILL'); children.delete(stop); controller.signal.removeEventListener('abort', abort); });
	return { child, done };
};
const runChild = (env) => launch(command[0], command.slice(1), { stdio: 'inherit', env }).done;
if (['DATABASE', 'OWNER_DATABASE', 'BYPASS_DATABASE', 'SUPERUSER_DATABASE'].every(name => process.env[`AGORA_TEST_${name}_URL`])) {
	const code = await runChild(process.env);
	process.exitCode = exitCode || code;
} else {
	const bin = (name) => process.env.AGORA_PG_BIN ? path.join(process.env.AGORA_PG_BIN, name) : name;
	const root = mkdtempSync(path.join(os.tmpdir(), 'agora-pg-'));
	const owned = lstatSync(root);
	const dataDir = path.join(root, 'data');
	let lease, server;
	const timer = setTimeout(() => { report('blocked', { message: 'startup timeout', startup_ms: startupMs }); cancel(70); }, startupMs);
	const run = async (name, args) => {
		const code = await launch(bin(name), args).done;
		if (code !== 0) throw new Error(`${name} failed (${code})`);
	};
	try {
		if (await launch(bin('pg_ctl'), ['--version']).done !== 0) { exitCode ||= 3; throw new Error('PostgreSQL 18 binaries unavailable; set AGORA_PG_BIN'); }
		lease = allocatePostgresSocket(root);
		lease.verify();
		report('allocated', lease.identity);
		await run('initdb', ['-D', dataDir, '-U', SUPERUSER, '--auth=trust', '-E', 'UTF8', '--no-locale']);
		lease.verify();
		const log = openSync(path.join(root, 'postgres.log'), 'wx', 0o600);
		try { server = launch(bin('postgres'), ['-D', dataDir, '-k', lease.identity.socketDir, '-p', '5432', '-c', 'listen_addresses=', '-c', 'fsync=off'], { stdio: ['ignore', log, log] }, 'SIGINT'); }
		finally { closeSync(log); }
		report('starting', { ...lease.identity, pid: server.child.pid });
		while (await launch(bin('pg_isready'), ['-h', lease.identity.socketDir, '-p', '5432', '-U', SUPERUSER, '-d', 'postgres']).done !== 0) {
			if (server.child.exitCode !== null || server.child.signalCode !== null) throw new Error('postgres exited before readiness');
			await delay(25, undefined, { signal: controller.signal });
		}
		// Superusers bypass RLS; the schema owner and ordinary test/service role must not.
		for (const sql of [
			`CREATE ROLE ${APP} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`,
			`CREATE ROLE ${OWNER} LOGIN NOSUPERUSER CREATEDB NOCREATEROLE NOBYPASSRLS`,
			`CREATE ROLE ${BYPASS} LOGIN NOSUPERUSER BYPASSRLS IN ROLE ${APP}`,
			`CREATE DATABASE ${DATABASE} OWNER ${OWNER}`,
		]) await run('psql', ['-v', 'ON_ERROR_STOP=1', '-h', lease.identity.socketDir, '-p', '5432', '-U', SUPERUSER, '-d', 'postgres', '-c', sql]);
		controller.signal.throwIfAborted();
		clearTimeout(timer);
		lease.verify();
		const url = (user) => `postgresql://${user}@/${DATABASE}?host=${encodeURIComponent(lease.identity.socketDir)}&port=5432`;
		report('started', { ...lease.identity, socket_dir: lease.identity.socketDir, pid: server.child.pid, database: DATABASE, owner_role: OWNER, app_role: APP, bypass_role: BYPASS });
		const code = await runChild({ ...process.env,
			AGORA_TEST_DATABASE_URL: url(APP), AGORA_TEST_OWNER_DATABASE_URL: url(OWNER),
			AGORA_TEST_BYPASS_DATABASE_URL: url(BYPASS), AGORA_TEST_SUPERUSER_DATABASE_URL: url(SUPERUSER),
			AGORA_DATABASE_URL: process.env.AGORA_DATABASE_URL ?? url(APP),
			AGORA_MIGRATION_DATABASE_URL: process.env.AGORA_MIGRATION_DATABASE_URL ?? url(OWNER),
		});
		exitCode ||= code;
	} catch (error) {
		exitCode ||= 70;
		report('blocked', { message: String(error), detail: existsSync(`${root}/postgres.log`) ? readFileSync(`${root}/postgres.log`, 'utf8') : '' });
	} finally {
		clearTimeout(timer);
		await Promise.all([...children].map(stop => stop()));
		const cleanup = () => {
			lease?.verify();
			// A forced stop can leave the exact postmaster's socket/lock. Never remove foreign entries.
			const socket = `${lease?.identity.socketDir}/.s.PGSQL.5432`;
			if (lease && existsSync(`${socket}.lock`)) {
				const lock = readFileSync(`${socket}.lock`, 'utf8').split('\n');
				const record = lstatSync(`${socket}.lock`);
				if (lock[0] !== String(server?.child.pid) || lock[1] !== dataDir || !record.isFile() || record.nlink !== 1) throw new Error('foreign socket lock');
				if (existsSync(socket)) { if (!lstatSync(socket).isSocket()) throw new Error('foreign socket'); unlinkSync(socket); }
				unlinkSync(`${socket}.lock`);
			}
			lease?.cleanup();
			const current = lstatSync(root);
			if (!current.isDirectory() || current.ino !== owned.ino || current.dev !== owned.dev) throw new Error('artifact ownership mismatch');
			rmSync(root, { recursive: true });
			report('cleaned', { artifactDir: root, socketDir: lease?.identity.socketDir });
		};
		try { cleanup(); } catch (error) { exitCode = 70; report('cleanup-failed', { artifactDir: root, message: String(error) }); }
	}
	process.exitCode = exitCode;
}
