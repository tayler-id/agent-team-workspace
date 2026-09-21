// P0c-C guard negatives. Each guard is disabled by one exact replacement in a disposable copy of the two
// wrapper sources; the same literal assertions must pass against the unmodified copy and fail against the
// weakened copy for the named reason. Usage: node evidence/ci/P0c/C/driver/guard.mjs --out DIR
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BIN, HOLD, QUERY, ROOT, alive, diff, fakeBin, git, neighbors, ownResidue, residue, runWrapper, scratch, sha256, sleep, snapshot, sweepOwned } from './lib.mjs';

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'evidence/ci/P0c/C';
const SCRATCH = path.resolve('.scratch/p0cc');
const WRAPPER = 'scripts/with-test-postgres.mjs', ALLOCATOR = 'scripts/postgres-socket.ts';
const files = [WRAPPER, ALLOCATOR];
const head = git('rev-parse', 'HEAD').trim();
const committed = Object.fromEntries(files.map(file => [file, git('show', `${head}:${file}`)]));
for (const file of files) assert.equal(sha256(readFileSync(path.join(ROOT, file))), sha256(committed[file]), `${file} matches ${head}`);
const copy = scratch(SCRATCH, 'guard-copy');
const restore = () => { mkdirSync(`${copy}/scripts`, { recursive: true }); for (const file of files) writeFileSync(`${copy}/${file}`, committed[file]); };
const mutate = ({ file, before, after }) => {
	const source = readFileSync(`${copy}/${file}`, 'utf8');
	assert.equal(source.split(before).length, 2, `unique anchor in ${file}: ${before.slice(0, 60)}`);
	writeFileSync(`${copy}/${file}`, source.replace(before, after));
};
const INJECT_EPERM = { file: WRAPPER, before: 'process.kill(-child.pid, sig)', after: "(file === command[0] ? (() => { throw Object.assign(new Error('injected EPERM'), { code: 'EPERM' }); })() : process.kill(-child.pid, sig))" };

const guards = [
	{ guard: 'short-socket-selection', file: ALLOCATOR, before: 'path.join(temporaryRoot, `agora-p0c-${runId}`)', after: 'path.join(artifactDir, `agora-p0c-${runId}`)', expect: 'socket path short',
		async input(run, ctx) {
			const deep = path.join(ctx.tmp, ...Array.from({ length: 12 }, (_, i) => `deep dir ${i} with spaces and a long name`)); mkdirSync(deep, { recursive: true });
			const r = await run({ command: [process.execPath, '-e', QUERY], tmp: deep });
			assert.ok(r.allocated, 'allocated');
			assert.ok(Buffer.byteLength(`${r.allocated.socketDir}/.s.PGSQL.5432`) < 104, 'socket path short');
			assert.equal(r.code, 0, 'exit 0'); assert.equal(r.stdout.trim(), 'agora_app|f|f', 'non-owner role');
		} },
	{ guard: 'lease-verification', file: ALLOCATOR, before: "if (!owned()) throw new Error('socket ownership mismatch');", after: "if (false) throw new Error('socket ownership mismatch');", expect: 'ownership denial',
		async input(run, ctx) {
			let marker = '';
			const r = await run({ command: ['sleep', '0.5'], hooks: { onReceipt: x => { if (x.outcome === 'started') { marker = readFileSync(`${x.socketDir}/owner.json`, 'utf8'); writeFileSync(`${x.socketDir}/owner.json`, '{}'); } } } });
			if (r.allocated && existsSync(r.allocated.socketDir)) writeFileSync(`${r.allocated.socketDir}/owner.json`, marker); // so the sweep recognizes our own retained lease
			assert.equal(r.code, 70, 'ownership denial'); assert.ok(r.cleanup_failed.some(m => m.includes('socket ownership mismatch')), 'ownership denial message');
			assert.ok(existsSync(r.allocated.socketDir), 'retained for inspection');
		} },
	{ guard: 'exact-process-group-stop', file: WRAPPER, before: 'process.kill(-child.pid, sig)', after: 'process.kill(child.pid, sig)', expect: 'descendant',
		async input(run, ctx) {
			let pids = [];
			const r = await run({ command: [process.execPath, '-e', HOLD], hooks: { onStdout: (text, child) => { if (text.includes('\n') && !pids.length) { pids = JSON.parse(text); ctx.track(...pids); child.kill('SIGTERM'); } } } });
			await sleep(200);
			assert.equal(r.code, 143, 'exit 143');
			for (const pid of pids) assert.equal(alive(pid), false, `descendant ${pid} exited`);
		} },
	{ guard: 'bounded-startup', file: WRAPPER, before: "const timer = setTimeout(() => { report('blocked', { message: 'startup timeout', startup_ms: startupMs }); cancel(70); }, startupMs);", after: 'const timer = setTimeout(() => {}, startupMs);', expect: 'startup timeout within bound',
		async input(run, ctx) {
			const bin = fakeBin(`${ctx.tmp}/bin`, { pg_isready: '#!/bin/sh\nexit 1\n' }); // live real server, probe shim never ready
			const r = await run({ command: ['true'], env: { AGORA_PG_BIN: bin, AGORA_PG_STARTUP_TIMEOUT_MS: '1500' }, boundMs: 6_000 });
			assert.ok(!r.hung && r.blocked.includes('startup timeout') && r.elapsed_ms < 5_000, 'startup timeout within bound');
			assert.equal(r.code, 70, 'exit 70');
		} },
	{ guard: 'cancellation-cleanup', file: WRAPPER, before: 'const cancel = (code) => { exitCode ||= code; controller.abort(); };', after: 'const cancel = (code) => { exitCode ||= code; };', expect: 'command stopped',
		async input(run, ctx) {
			let signaled = 0;
			const r = await run({ command: ['sh', '-c', 'sleep 3; touch "$TMPDIR/finished"'], hooks: { onReceipt: (x, child) => { if (x.outcome === 'started') { signaled = Date.now(); child.kill('SIGINT'); } } }, boundMs: 10_000 });
			assert.ok(!existsSync(`${ctx.tmp}/finished`) && Date.now() - signaled < 1_500, 'command stopped');
			assert.equal(r.code, 130, 'exit 130');
		} },
	{ guard: 'foreign-lock-refusal', file: WRAPPER, before: "if (lock[0] !== String(server?.child.pid) || lock[1] !== dataDir || !record.isFile() || record.nlink !== 1) throw new Error('foreign socket lock');", after: "if (false) throw new Error('foreign socket lock');", expect: 'foreign lock denial',
		async input(run, ctx) {
			const r = await run({ command: ['sleep', '1.5'], hooks: { onReceipt: async x => { if (x.outcome !== 'started') return; process.kill(x.pid, 'SIGKILL'); await sleep(150); const lock = `${x.socketDir}/.s.PGSQL.5432.lock`; const lines = readFileSync(lock, 'utf8').split('\n'); lines[0] = String(ctx.foreignPid); writeFileSync(lock, lines.join('\n')); } } });
			assert.equal(r.code, 70, 'foreign lock denial'); assert.ok(r.cleanup_failed.some(m => m.includes('foreign socket lock')), 'foreign lock denial message');
			assert.ok(existsSync(`${r.allocated.socketDir}/.s.PGSQL.5432.lock`), 'foreign lock retained'); assert.ok(alive(ctx.foreignPid), 'foreign process alive');
		} },
	{ guard: 'artifact-ownership-refusal', file: WRAPPER, before: "if (!current.isDirectory() || current.ino !== owned.ino || current.dev !== owned.dev) throw new Error('artifact ownership mismatch');", after: "if (false) throw new Error('artifact ownership mismatch');", expect: 'substitute root denial',
		async input(run, ctx) {
			const r = await run({ command: ['sleep', '0.5'], hooks: { onReceipt: x => { if (x.outcome === 'started') { renameSync(x.artifactDir, `${x.artifactDir}.moved`); mkdirSync(x.artifactDir, { mode: 0o700 }); } } } });
			assert.equal(r.code, 70, 'substitute root denial'); assert.ok(r.cleanup_failed.some(m => m.includes('artifact ownership mismatch')), 'substitute root denial message');
			assert.ok(existsSync(r.allocated.artifactDir) && existsSync(`${r.allocated.artifactDir}.moved/data`), 'both roots retained');
		} },
	{ guard: 'stderr-capture', file: WRAPPER, before: 'stderr = `${stderr}${bytes}`.slice(-4_096);', after: "stderr = '';", expect: 'initdb stderr present',
		async input(run, ctx) {
			const bin = fakeBin(`${ctx.tmp}/bin`, { initdb: `#!/bin/sh\nexec "${BIN}/initdb" --definitely-not-a-flag "$@"\n` }); // real initdb, one bad flag
			const r = await run({ command: ['true'], env: { AGORA_PG_BIN: bin } });
			assert.ok(r.blocked.some(m => m.includes("initdb: unrecognized option `--definitely-not-a-flag'")), 'initdb stderr present');
			assert.equal(r.code, 70, 'exit 70');
		} },
	{ guard: 'probe-spawn-failure', file: WRAPPER, before: 'if (probe.error) throw probe.error;', after: 'if (false) throw probe.error;', expect: 'probe failure reported once',
		async input(run, ctx) {
			const bin = fakeBin(`${ctx.tmp}/bin`, { pg_isready: null }); // really absent
			const r = await run({ command: ['true'], env: { AGORA_PG_BIN: bin, AGORA_PG_STARTUP_TIMEOUT_MS: '800' } });
			assert.ok(r.blocked.length === 2 && !r.blocked.includes('startup timeout') && r.elapsed_ms < 700, 'probe failure reported once');
			assert.equal(r.code, 70, 'exit 70');
		} },
	{ guard: 'stop-failure-report', file: WRAPPER, inject: INJECT_EPERM, before: "if (!unstoppable) report('blocked', { message: `stop failed: ${error}`, pid: child.pid, signal: sig });\n\t\t\tunstoppable = true; exitCode = 70;", after: 'throw error;', expect: 'stop failure reported and cleaned',
		async input(run, ctx) {
			// EPERM for a live command group is unreachable as this user, so both runs carry the injected fault (mock, named limit).
			let pids = [];
			const r = await run({ command: [process.execPath, '-e', HOLD], boundMs: 8_000, hooks: {
				onStdout: (text, child) => { if (text.includes('\n') && !pids.length) { pids = JSON.parse(text); ctx.track(...pids); child.kill('SIGTERM'); } },
				onReceipt: x => { if (x.outcome === 'blocked' && x.message?.includes('stop failed')) for (const pid of pids.slice(0, 1)) process.kill(-pid, 'SIGKILL'); } } });
			assert.ok(r.blocked.some(m => m.includes('stop failed')) && r.outcomes.at(-1) === 'cleaned' && !r.orphaned_pipes && !r.hung, 'stop failure reported and cleaned');
			assert.equal(r.code, 70, 'exit 70');
		} },
];

const receipts = [];
const log = (line) => console.log(line);
for (const guard of guards) for (const weakened of [false, true]) {
	restore(); if (guard.inject) mutate(guard.inject); if (weakened) mutate(guard);
	const source_digests = Object.fromEntries(files.map(file => [file, sha256(readFileSync(`${copy}/${file}`))]));
	const tmp = scratch(SCRATCH, `guard-${guard.guard}-${weakened ? 'weakened' : 'normal'}`);
	const nb = neighbors(tmp); const before = snapshot(tmp);
	const ctx = { tmp, foreignPid: nb.pid, runs: [], tracked: [], track(...pids) { ctx.tracked.push(...pids); } };
	const run = async (options) => { const r = await runWrapper({ name: guard.guard, wrapper: `${copy}/${WRAPPER}`, tmp, tracked: ctx.tracked, ...options }); ctx.runs.push(r); return r; };
	let assertion = null;
	try { await guard.input(run, ctx); } catch (error) { assertion = error.code === 'ERR_ASSERTION' ? error.message : `harness: ${error.stack}`; }
	const runs = ctx.runs.map(r => ({ code: r.code, signal: r.signal, hung: r.hung, orphaned_pipes: r.orphaned_pipes, elapsed_ms: r.elapsed_ms, outcomes: r.outcomes, allocated: r.allocated ?? null, starting_pid: r.starting?.pid ?? null, blocked: r.blocked.map(m => String(m).slice(0, 200)), cleanup_failed: r.cleanup_failed, stdout: r.stdout.slice(0, 200), residue_before_sweep: residue(r) }));
	const swept = ctx.runs.flatMap(r => sweepOwned(r, tmp, ctx.tracked));
	const after = snapshot(tmp); const neighborhood = nb.check(); nb.release(); const residue_after_sweep = ctx.runs.filter(ownResidue).map(r => r.allocated);
	// The verdict covers this run's own identities and neighbors; the global diff is recorded because other lanes share this machine.
	const verdict = (weakened ? assertion !== null && assertion.includes(guard.expect) : assertion === null) && Object.values(neighborhood).every(Boolean) && residue_after_sweep.length === 0 ? 'pass' : 'fail';
	receipts.push({ guard: guard.guard, weakened, file: guard.file, before: weakened ? guard.before : null, after: weakened ? guard.after : null, inject: guard.inject ?? null, source_digests, assertion, expected_assertion: guard.expect, verdict, runs, swept, residue_after_sweep, neighbors: neighborhood, environment_diff: diff(before, after) });
	log(`${verdict.padEnd(4)} ${guard.guard} ${weakened ? 'weakened' : 'normal  '} exit=${runs.map(r => r.code).join(',')} assertion=${assertion === null ? '(none)' : JSON.stringify(assertion.slice(0, 120))} swept=${JSON.stringify(swept)}`);
	rmSync(tmp, { recursive: true, force: true });
}
restore(); rmSync(copy, { recursive: true, force: true });
const driver = Object.fromEntries(['lib.mjs', 'guard.mjs'].map(name => [`evidence/ci/P0c/C/driver/${name}`, sha256(readFileSync(new URL(name, import.meta.url)))]));
const outcome = receipts.every(r => r.verdict === 'pass') ? 'pass' : 'fail';
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'guard.json'), `${JSON.stringify({ schema_version: 'agora.p0c-guard-negatives/v1', head, outcome, committed_source_digests: Object.fromEntries(files.map(file => [file, sha256(committed[file])])), driver, recorded_at: new Date().toISOString(), receipts }, null, 2)}\n`);
log(JSON.stringify({ schema_version: 'agora.p0c-guard-negatives/v1', head, outcome, guards: receipts.length / 2 }));
process.exit(outcome === 'pass' ? 0 : 1);
