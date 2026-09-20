// One owned foreground host behind each detached instance. No PID-only stop or global process sweep.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { command, environment, json, requireThat, safe } from './project-checks.mjs';
const registry = safe(process.argv[2]); const state = json(path.join(registry, 'state.json'));
const save = () => writeFileSync(path.join(registry, 'state.json'), JSON.stringify(state));
const pg = name => process.env.AGORA_PG_BIN ? path.join(process.env.AGORA_PG_BIN, name) : name;
const data = path.join(state.root, 'pg'); let databaseStarted = false, application, python;
async function cleanup() {
	if (application) await application();
	if (python && python.exitCode === null) { python.kill('SIGTERM'); await new Promise(resolve => python.once('exit', resolve)); }
	if (databaseStarted) requireThat(command([pg('pg_ctl'), '-D', data, '-m', 'fast', '-w', 'stop']).status === 0, 'database_cleanup_failed');
	rmSync(state.root, { recursive: true }); state.phase = 'removed'; save();
}
const control = createServer(async (request, response) => {
	if (request.headers['x-agora-handle'] !== state.handle) { response.writeHead(403).end(); return; }
	try {
		if (request.url === '/stop' && request.method === 'POST') {
			await cleanup(); response.end(JSON.stringify({ outcome: 'removed', handle: state.handle })); control.close();
		} else if (request.url === '/inspect') response.end(JSON.stringify(state));
		else response.writeHead(404).end();
	} catch { response.writeHead(500).end(); }
});
try {
	requireThat(state.owner === process.cwd() && state.phase === 'starting', 'foreign_owner');
	state.pid = process.pid; state.process_start = command(['ps', '-p', String(process.pid), '-o', 'lstart=']).stdout.trim(); save();
	await new Promise((resolve, reject) => { control.once('error', reject); control.listen(path.join(state.root, 'control.sock'), resolve); });
	chmodSync(path.join(state.root, 'control.sock'), 0o600);
	mkdirSync(path.join(state.root, 'objects')); state.object_namespace = path.join(state.root, 'objects');
	if (state.fixture === 'agora') {
		for (const argv of [
			[pg('initdb'), '-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--no-locale'],
			[pg('pg_ctl'), '-D', data, '-l', path.join(state.root, 'postgres.log'), '-o', `-k ${state.root} -c listen_addresses=''`, '-w', 'start'],
		]) { const r = command(argv); requireThat(r.status === 0, 'postgres_start_failed', 'infrastructure_failure'); }
		databaseStarted = true;
		for (const sql of ['CREATE ROLE agora_app LOGIN NOSUPERUSER NOBYPASSRLS', 'CREATE ROLE agora_owner LOGIN NOSUPERUSER CREATEDB NOBYPASSRLS', 'CREATE DATABASE agora_fixture OWNER agora_owner']) requireThat(command([pg('psql'), '-v', 'ON_ERROR_STOP=1', '-h', state.root, '-U', 'postgres', '-d', 'postgres', '-c', sql]).status === 0, 'postgres_setup_failed');
		state.database = `postgresql://agora_app@/agora_fixture?host=${encodeURIComponent(state.root)}`;
		const { start } = await import('../apps/center/src/verification.mjs');
		const server = await start(state); application = server.close; state.url = server.url;
		state.database_pid = Number(readFileSync(path.join(data, 'postmaster.pid'), 'utf8').split('\n')[0]);
	} else {
		state.database = path.join(state.root, 'fixture.sqlite');
		python = spawn('python3', ['-B', 'packages/verification/fixture/project.py', 'serve', JSON.stringify(state)], { env: environment(), stdio: ['ignore', 'pipe', 'inherit'] });
		state.application_pid = python.pid;
		state.url = await new Promise((resolve, reject) => { python.once('error', reject); python.once('exit', () => reject(new Error('python_start_failed'))); python.stdout.once('data', bytes => resolve(JSON.parse(String(bytes)).url)); });
	}
	state.phase = 'ready'; save();
	for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { cleanup().then(() => control.close()).catch(() => process.exit(70)); });
} catch (error) {
	state.phase = 'failed'; state.failure = error.message; save();
	try { await cleanup(); } catch { /* Preserve failed cleanup and exact owned paths for manual recovery. */ }
	if (existsSync(state.root)) state.phase = 'cleanup_failed'; else state.phase = 'failed'; save(); control.close(); process.exitCode = 70;
}
