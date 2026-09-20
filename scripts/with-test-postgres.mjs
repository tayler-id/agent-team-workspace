// Runs one command against a throwaway PostgreSQL cluster, then removes the cluster.
// The cluster listens only on a Unix socket inside a private temp directory; no TCP port is opened.
// Set AGORA_TEST_DATABASE_URL and AGORA_TEST_OWNER_DATABASE_URL yourself to reuse an existing server instead.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OWNER = 'agora_owner';
const APP = 'agora_app';
const DATABASE = 'agora_test';
const command = process.argv.slice(2);
if (command.length === 0) {
	console.error('usage: node scripts/with-test-postgres.mjs <command> [args...]');
	process.exit(64);
}

const run = (file, args, extraEnv = {}) => spawnSync(file, args, { encoding: 'utf8', env: { ...process.env, ...extraEnv } });
const fail = (code, message, detail) => {
	console.error(JSON.stringify({ schema_version: 'agora.test-postgres/v1', outcome: 'blocked', exit: code, message, detail }));
	process.exit(code);
};

const runChild = (env) => new Promise((resolve) => {
	const child = spawn(command[0], command.slice(1), { stdio: 'inherit', env });
	child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
	child.on('error', (error) => {
		console.error(String(error));
		resolve(70);
	});
});

if (process.env.AGORA_TEST_DATABASE_URL && process.env.AGORA_TEST_OWNER_DATABASE_URL) {
	process.exit(await runChild(process.env));
}

const bin = process.env.AGORA_PG_BIN ? (name) => path.join(process.env.AGORA_PG_BIN, name) : (name) => name;
if (run(bin('pg_ctl'), ['--version']).error) fail(3, 'PostgreSQL server binaries (initdb, pg_ctl, psql) are unavailable; set AGORA_PG_BIN or install PostgreSQL 18');

const root = mkdtempSync(path.join(os.tmpdir(), 'agora-pg-'));
const dataDir = path.join(root, 'data');
const cleanup = () => {
	run(bin('pg_ctl'), ['-D', dataDir, '-m', 'fast', '-w', 'stop']);
	rmSync(root, { recursive: true, force: true });
};

const initdb = run(bin('initdb'), ['-D', dataDir, '-U', OWNER, '--auth=trust', '-E', 'UTF8', '--no-locale']);
if (initdb.status !== 0) {
	rmSync(root, { recursive: true, force: true });
	fail(70, 'initdb failed', initdb.stderr);
}
const start = run(bin('pg_ctl'), ['-D', dataDir, '-l', path.join(root, 'postgres.log'), '-o', `-k ${root} -c listen_addresses='' -c fsync=off`, '-w', 'start']);
if (start.status !== 0) {
	rmSync(root, { recursive: true, force: true });
	fail(70, 'pg_ctl start failed', start.stderr + start.stdout);
}
const bootstrap = [
	`CREATE ROLE ${APP} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`,
	`ALTER ROLE ${OWNER} CREATEDB`,
	`CREATE DATABASE ${DATABASE} OWNER ${OWNER}`,
];
for (const sql of bootstrap) {
	const result = run(bin('psql'), ['-v', 'ON_ERROR_STOP=1', '-h', root, '-U', OWNER, '-d', 'postgres', '-c', sql]);
	if (result.status !== 0) {
		cleanup();
		fail(70, `bootstrap statement failed: ${sql}`, result.stderr);
	}
}

const url = (user) => `postgresql://${user}@/${DATABASE}?host=${encodeURIComponent(root)}`;
const env = {
	...process.env,
	AGORA_TEST_DATABASE_URL: url(APP),
	AGORA_TEST_OWNER_DATABASE_URL: url(OWNER),
	// The service runs as the non-owner role; only migrations use the owner.
	AGORA_DATABASE_URL: process.env.AGORA_DATABASE_URL ?? url(APP),
	AGORA_MIGRATION_DATABASE_URL: process.env.AGORA_MIGRATION_DATABASE_URL ?? url(OWNER),
};
console.error(JSON.stringify({ schema_version: 'agora.test-postgres/v1', outcome: 'started', socket_dir: root, database: DATABASE, owner_role: OWNER, app_role: APP }));
let exitCode;
try {
	for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { cleanup(); process.exit(130); });
	exitCode = await runChild(env);
} finally {
	cleanup();
}
process.exit(exitCode);
