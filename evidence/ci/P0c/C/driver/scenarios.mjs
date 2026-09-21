// P0c-C lifecycle reproduction against the committed public wrapper with real PostgreSQL 18. Every scenario runs
// beside foreign neighbors, asserts literal exits, receipts and removal, and ends with a no-leftover inventory of
// every identity it recorded. Usage: node evidence/ci/P0c/C/driver/scenarios.mjs --out DIR
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { BIN, HOLD, QUERY, ROOT, alive, diff, fakeBin, git, killAt, neighbors, ownResidue, psList, residue, runWrapper, scratch, sha256, sleep, snapshot, sweepOwned, sysvSegments } from './lib.mjs';

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'evidence/ci/P0c/C';
const only = process.argv.slice(2).filter((arg, i, all) => !arg.startsWith('--') && all[i - 1] !== '--out');
const SCRATCH = path.resolve('.scratch/p0cc');
const WRAPPER = path.join(ROOT, 'scripts/with-test-postgres.mjs');
const head = git('rev-parse', 'HEAD').trim();
const deepPath = (tmp) => { const deep = path.join(tmp, ...Array.from({ length: 14 }, (_, i) => `deep dir ${i} with spaces and a long name`)); mkdirSync(deep, { recursive: true }); return deep; };
const lockOf = (x) => `${x.socketDir}/.s.PGSQL.5432.lock`;
const killPostmaster = async (x) => { process.kill(x.pid, 'SIGKILL'); await sleep(150); };
const foreignLock = (x, pid) => { const lines = readFileSync(lockOf(x), 'utf8').split('\n'); lines[0] = String(pid); writeFileSync(lockOf(x), lines.join('\n')); };
const isRemoved = (r) => assert.ok(r.allocated && !existsSync(r.allocated.socketDir) && !existsSync(r.allocated.artifactDir), 'socket directory and artifact root removed');
const isRetained = (r, message) => { assert.equal(r.code, 70, `${message} exit 70`); assert.ok(r.cleanup_failed.some(m => m.includes(message)), `cleanup-failed: ${message}`); };

const scenarios = {
	async success(run) { const r = await run({ command: [process.execPath, '-e', QUERY] }); assert.equal(r.code, 0, 'exit 0'); assert.equal(r.stdout.trim(), 'agora_app|f|f', 'non-owner, non-superuser, non-bypass role'); assert.deepEqual(r.outcomes, ['allocated', 'starting', 'started', 'cleaned'], 'lifecycle receipts'); isRemoved(r); },
	async 'deep-tmpdir'(run, ctx) {
		const deep = deepPath(ctx.tmp); const r = await run({ command: [process.execPath, '-e', QUERY], tmp: deep });
		assert.equal(r.code, 0, 'exit 0'); assert.equal(r.stdout.trim(), 'agora_app|f|f', 'non-owner role');
		assert.ok(Buffer.byteLength(deep) > 600 && r.allocated.artifactDir.startsWith(deep) && Buffer.byteLength(`${r.allocated.socketDir}/.s.PGSQL.5432`) < 104, 'deep data root with a short socket'); isRemoved(r);
		return { tmpdir_bytes: Buffer.byteLength(deep), socket_bytes: Buffer.byteLength(`${r.allocated.socketDir}/.s.PGSQL.5432`) };
	},
	async 'command-failure'(run) { const r = await run({ command: ['sh', '-c', 'exit 255'] }); assert.equal(r.code, 255, 'command exit preserved'); assert.equal(r.outcomes.at(-1), 'cleaned', 'cleaned'); isRemoved(r); },
	async 'command-signal'(run) { const r = await run({ command: [process.execPath, '-e', "process.kill(process.pid,'SIGTERM')"] }); assert.equal(r.code, 1, 'signaled command keeps legacy exit 1'); isRemoved(r); },
	async 'missing-command'(run) { const r = await run({ command: ['./absent-command'] }); assert.equal(r.code, 70, 'exit 70'); assert.ok(r.blocked.some(m => m.includes('ENOENT')), 'ENOENT reported'); isRemoved(r); },
	async 'startup-failure'(run) { const r = await run({ command: ['sleep', '1'], hooks: { onReceipt: x => { if (x.outcome === 'starting') process.kill(x.pid, 'SIGKILL'); } } }); assert.equal(r.code, 70, 'exit 70'); assert.ok(r.blocked.some(m => m.includes('postgres exited before readiness')), 'startup failure named'); isRemoved(r); },
	async 'postmaster-killed-at-started'(run) { const r = await run({ command: ['sleep', '1.5'], hooks: { onReceipt: x => { if (x.outcome === 'started') process.kill(x.pid, 'SIGKILL'); } } }); assert.equal(r.code, 0, 'stale socket and lock of the exact postmaster removed'); assert.equal(r.outcomes.at(-1), 'cleaned', 'cleaned'); isRemoved(r); },
	async 'startup-timeout'(run, ctx) {
		const bin = fakeBin(`${ctx.tmp}/bin`, { pg_isready: '#!/bin/sh\nexit 1\n' }); // real live server; the probe shim is the only substitute
		const r = await run({ command: ['true'], env: { AGORA_PG_BIN: bin, AGORA_PG_STARTUP_TIMEOUT_MS: '1200' } });
		assert.equal(r.code, 70, 'exit 70'); assert.ok(r.blocked.includes('startup timeout') && r.elapsed_ms < 4_000 && r.starting, 'live server stopped at the deadline'); isRemoved(r);
	},
	async 'cancel-at-allocated'(run) { const r = await run({ command: [process.execPath, '-e', HOLD], hooks: { onReceipt: killAt('allocated', 'SIGTERM') } }); assert.equal(r.code, 143, 'exit 143'); assert.ok(!r.starting, 'no server started'); isRemoved(r); },
	async 'cancel-during-initdb'(run) { const r = await run({ command: [process.execPath, '-e', HOLD], hooks: { onReceipt: killAt('allocated', 'SIGINT', 60) } }); assert.equal(r.code, 130, 'exit 130'); isRemoved(r); },
	async 'cancel-at-starting'(run) { const r = await run({ command: [process.execPath, '-e', HOLD], hooks: { onReceipt: killAt('starting', 'SIGINT') } }); assert.equal(r.code, 130, 'exit 130'); assert.equal(alive(r.starting.pid), false, 'postmaster exited'); isRemoved(r); },
	async 'cancel-at-started'(run, ctx) {
		let pids = [];
		const r = await run({ command: [process.execPath, '-e', HOLD], hooks: { onStdout: (text, child) => { if (text.includes('\n') && !pids.length) { pids = JSON.parse(text); ctx.track(...pids); child.kill('SIGTERM'); } } } });
		await sleep(200); assert.equal(r.code, 143, 'exit 143'); for (const pid of pids) assert.equal(alive(pid), false, `descendant ${pid} exited`); isRemoved(r);
	},
	async 'signal-storm'(run) {
		const r = await run({ command: [process.execPath, '-e', HOLD], hooks: { onReceipt: (x, child) => { if (x.outcome === 'started') for (let i = 0; i < 6; i++) setTimeout(() => child.kill(i % 2 ? 'SIGTERM' : 'SIGINT'), i * 2); } } });
		assert.equal(r.code, 130, 'first signal wins'); assert.equal(r.outcomes.filter(o => o === 'cleaned').length, 1, 'exactly one cleaned'); isRemoved(r);
	},
	async 'sigint-sweep'(run, ctx) {
		const sweep = [];
		for (const delay of [0, 1, 5, 20, 35, 50, 100, 200, 400, 600, 800]) {
			const r = await run({ command: [process.execPath, '-e', HOLD], hooks: { onSpawn: child => setTimeout(() => child.kill('SIGINT'), delay) } });
			sweep.push({ delay_ms: delay, code: r.code, signal: r.signal, outcomes: r.outcomes });
			assert.ok(r.code === 130 || (r.code === null && r.signal === 'SIGINT' && !r.allocated), `SIGINT at ${delay} ms exits 130 or dies before allocating`);
			if (r.allocated) isRemoved(r);
		}
		return { sweep };
	},
	async 'nested-group'(run, ctx) {
		let members = [];
		const r = await run({ command: ['bash', '-c', 'node -e "setInterval(()=>{},1e3)" & node -e "setInterval(()=>{},1e3)" & sleep 100'], hooks: { onReceipt: async (x, child) => {
			if (x.outcome !== 'started') return; await sleep(400);
			const all = psList(); const leader = all.find(p => p.ppid === child.pid && p.command.startsWith('bash'));
			members = leader ? all.filter(p => p.pgid === leader.pid).map(p => p.pid) : []; ctx.track(...members); child.kill('SIGTERM');
		} } });
		await sleep(200); assert.equal(r.code, 143, 'exit 143'); assert.ok(members.length >= 4, `group census saw ${members.length} members`); for (const pid of members) assert.equal(alive(pid), false, `member ${pid} exited`); isRemoved(r);
		return { group_members: members.length };
	},
	async 'foreign-process-lock'(run, ctx) {
		const r = await run({ command: ['sleep', '1.5'], hooks: { onReceipt: async x => { if (x.outcome === 'started') { await killPostmaster(x); foreignLock(x, ctx.foreignPid); } } } });
		isRetained(r, 'foreign socket lock'); assert.ok(existsSync(lockOf(r.allocated)) && existsSync(`${r.allocated.socketDir}/owner.json`) && existsSync(r.allocated.artifactDir), 'lock, lease and root retained'); assert.ok(alive(ctx.foreignPid), 'foreign process alive');
	},
	async 'foreign-listener'(run, ctx) {
		// The stale socket is replaced by a live foreign Unix listener and the lock names a foreign process: fail closed, listener untouched.
		const server = net.createServer(socket => socket.end('foreign'));
		const r = await run({ command: ['sleep', '1.5'], hooks: { onReceipt: async x => { if (x.outcome !== 'started') return; await killPostmaster(x); unlinkSync(`${x.socketDir}/.s.PGSQL.5432`); await new Promise(resolve => server.listen(`${x.socketDir}/.s.PGSQL.5432`, resolve)); foreignLock(x, ctx.foreignPid); } } });
		const answered = await new Promise(resolve => { const c = net.connect(`${r.allocated.socketDir}/.s.PGSQL.5432`); c.on('data', d => resolve(String(d))); c.on('error', () => resolve(null)); });
		await new Promise(resolve => server.close(resolve));
		isRetained(r, 'foreign socket lock'); assert.equal(answered, 'foreign', 'foreign listener still reachable at its path');
	},
	async 'foreign-listener-exact-lock'(run) {
		// Known limit: a same-user listener bound at the dead postmaster's own socket path, with the lock untouched, is unlinked as the stale socket.
		const server = net.createServer(socket => socket.end('foreign'));
		const r = await run({ command: ['sleep', '1.5'], hooks: { onReceipt: async x => { if (x.outcome !== 'started') return; await killPostmaster(x); unlinkSync(`${x.socketDir}/.s.PGSQL.5432`); await new Promise(resolve => server.listen(`${x.socketDir}/.s.PGSQL.5432`, resolve)); } } });
		const pathGone = r.allocated && !existsSync(`${r.allocated.socketDir}/.s.PGSQL.5432`); await new Promise(resolve => server.close(resolve));
		assert.equal(r.code, 0, 'documented limit: exact-path same-user listener treated as the stale socket'); assert.ok(pathGone, 'listener path unlinked'); isRemoved(r);
		return { known_limit: 'same-user listener at the exact dead-postmaster socket path with an untouched lock is unlinked; outside the accepted trust boundary' };
	},
	async 'foreign-socket-file'(run) {
		const r = await run({ command: ['sleep', '1.5'], hooks: { onReceipt: async x => { if (x.outcome === 'started') { await killPostmaster(x); unlinkSync(`${x.socketDir}/.s.PGSQL.5432`); writeFileSync(`${x.socketDir}/.s.PGSQL.5432`, 'not a socket'); } } } });
		isRetained(r, 'foreign socket'); assert.equal(readFileSync(`${r.allocated.socketDir}/.s.PGSQL.5432`, 'utf8'), 'not a socket', 'substitute file retained');
	},
	async 'foreign-directory'(run) {
		const r = await run({ command: ['sleep', '0.5'], hooks: { onReceipt: x => { if (x.outcome === 'started') { renameSync(x.artifactDir, `${x.artifactDir}.moved`); mkdirSync(x.artifactDir, { mode: 0o700 }); } } } });
		isRetained(r, 'artifact ownership mismatch'); assert.ok(existsSync(r.allocated.artifactDir) && existsSync(`${r.allocated.artifactDir}.moved/data`), 'substitute and original roots retained');
	},
	async 'socket-dir-intruder'(run) { const r = await run({ command: ['sleep', '0.5'], hooks: { onReceipt: x => { if (x.outcome === 'started') writeFileSync(`${x.socketDir}/intruder`, 'x'); } } }); isRetained(r, 'socket not empty'); assert.ok(existsSync(`${r.allocated.socketDir}/intruder`), 'intruder retained'); },
	async 'socket-dir-mode'(run) { const r = await run({ command: ['sleep', '0.5'], hooks: { onReceipt: x => { if (x.outcome === 'started') chmodSync(x.socketDir, 0o755); } } }); isRetained(r, 'socket ownership mismatch'); },
	async 'concurrent-neighbor'(run, ctx) {
		const second = run({ command: [process.execPath, '-e', `setTimeout(()=>{${QUERY}},1500)`], tmp: scratch(ctx.tmp, 'two') });
		const first = await run({ command: [process.execPath, '-e', HOLD], tmp: scratch(ctx.tmp, 'one'), hooks: { onReceipt: killAt('started', 'SIGTERM', 300) } });
		const r = await second;
		assert.equal(first.code, 143, 'first cancelled'); assert.equal(r.code, 0, 'second completed'); assert.equal(r.stdout.trim(), 'agora_app|f|f', 'second connected as agora_app'); assert.notEqual(first.allocated.socketDir, r.allocated.socketDir, 'distinct sockets'); isRemoved(first); isRemoved(r);
	},
	async 'missing-pg-isready'(run, ctx) {
		const bin = fakeBin(`${ctx.tmp}/bin`, { pg_isready: null }); const r = await run({ command: ['true'], env: { AGORA_PG_BIN: bin, AGORA_PG_STARTUP_TIMEOUT_MS: '2000' } });
		assert.equal(r.code, 70, 'exit 70'); assert.ok(r.blocked.length === 2 && r.blocked.every(m => /pg_isready ENOENT/.test(m)) && r.elapsed_ms < 1_500, 'reported twice and promptly, no timeout'); isRemoved(r);
	},
	async 'tool-stderr'(run, ctx) {
		const bin = fakeBin(`${ctx.tmp}/bin`, { psql: `#!/bin/sh\nexec "${BIN}/psql" --definitely-not-a-flag "$@"\n` }); const r = await run({ command: ['true'], env: { AGORA_PG_BIN: bin } });
		assert.equal(r.code, 70, 'exit 70'); assert.ok(r.blocked.some(m => m.includes("psql: unrecognized option `--definitely-not-a-flag'")), "psql's own words in the diagnostic"); isRemoved(r);
	},
	async 'forced-cancel-repeat'(run, ctx) {
		// Five forced stops in a row: the SIGSTOPped postmaster dies by the wrapper's SIGKILL fallback, leaves its Darwin interlock
		// segment, and the run-owned reclaim removes exactly that segment each time while every other segment on the machine survives.
		const foreignIds = () => sysvSegments().map(s => s.id);
		const rounds = [];
		for (let round = 1; round <= 5; round++) {
			const before = foreignIds();
			const r = await run({ command: [process.execPath, '-e', HOLD], tmp: scratch(ctx.tmp, `round-${round}`), hooks: { onReceipt: (x, child) => { if (x.outcome === 'started') { process.kill(x.pid, 'SIGSTOP'); child.kill('SIGTERM'); } } } });
			const leaked = sysvSegments().filter(s => s.cpid === r.starting?.pid);
			assert.equal(r.code, 143, `round ${round} exit 143`); assert.equal(alive(r.starting.pid), false, `round ${round} postmaster dead`);
			assert.ok(leaked.length === 1 && leaked[0].nattch === 0 && process.platform === 'darwin', `round ${round} left exactly one unattached run-owned segment`);
			const swept = sweepOwned(r, ctx.tmp);
			assert.deepEqual(sysvSegments().filter(s => s.cpid === r.starting.pid), [], `round ${round} run-owned segment reclaimed`);
			assert.deepEqual(foreignIds().filter(id => id !== leaked[0].id).sort(), before.filter(id => id !== leaked[0].id).sort(), `round ${round} unrelated segments untouched`);
			rounds.push({ round, postmaster: r.starting.pid, leaked_segment: leaked[0].id, swept });
		}
		return { rounds };
	},
	async 'external-url-passthrough'(run) {
		const url = 'postgresql://x@/x'; const env = { AGORA_TEST_DATABASE_URL: url, AGORA_TEST_OWNER_DATABASE_URL: url, AGORA_TEST_BYPASS_DATABASE_URL: url, AGORA_TEST_SUPERUSER_DATABASE_URL: url };
		const r = await run({ command: ['sh', '-c', 'exit 9'], env }); assert.equal(r.code, 9, 'passthrough exit'); assert.equal(r.receipts.length, 0, 'nothing allocated');
	},
};

const names = only.length ? only : Object.keys(scenarios);
const receipts = []; const identities = [];
const start = snapshot(SCRATCH);
for (const name of names) {
	const tmp = scratch(SCRATCH, `scenario-${name}`); const nb = neighbors(tmp); const before = snapshot(tmp);
	const ctx = { tmp, foreignPid: nb.pid, runs: [], tracked: [], track(...pids) { ctx.tracked.push(...pids); } };
	const run = async (options) => { const r = await runWrapper({ name, wrapper: WRAPPER, tmp, tracked: ctx.tracked, ...options }); ctx.runs.push(r); return r; };
	let assertion = null, extra = {};
	try { extra = (await scenarios[name](run, ctx)) ?? {}; } catch (error) { assertion = error.code === 'ERR_ASSERTION' ? error.message : `harness: ${error.stack}`; }
	const runs = ctx.runs.map(r => ({ code: r.code, signal: r.signal, hung: r.hung, orphaned_pipes: r.orphaned_pipes, elapsed_ms: r.elapsed_ms, outcomes: r.outcomes, allocated: r.allocated ?? null, starting_pid: r.starting?.pid ?? null, blocked: r.blocked.map(m => String(m).slice(0, 200)), cleanup_failed: r.cleanup_failed, stdout: r.stdout.slice(0, 200), residue_before_sweep: residue(r) }));
	for (const r of ctx.runs) if (r.allocated) identities.push({ scenario: name, ...r.allocated, postmaster: r.starting?.pid ?? null });
	const swept = ctx.runs.flatMap(r => sweepOwned(r, tmp, ctx.tracked));
	const after = snapshot(tmp); const neighborhood = nb.check(); nb.release(); const residue_after_sweep = ctx.runs.filter(ownResidue).map(r => r.allocated);
	// The verdict covers this run's own identities and neighbors; the global diff is recorded because other lanes share this machine.
	const verdict = assertion === null && Object.values(neighborhood).every(Boolean) && residue_after_sweep.length === 0 ? 'pass' : 'fail';
	receipts.push({ scenario: name, verdict, assertion, ...extra, runs, swept, residue_after_sweep, neighbors: neighborhood, environment_diff: diff(before, after) });
	console.log(`${verdict.padEnd(4)} ${name.padEnd(28)} exit=${runs.map(r => r.code).join(',').padEnd(8)} outcomes=${runs.length === 1 ? runs[0].outcomes.join(',') : `${runs.length} runs`} ${assertion === null ? '' : `assertion=${JSON.stringify(assertion.slice(0, 100))} `}${swept.length ? `swept=${JSON.stringify(swept.map(s => s.replace(SCRATCH, '.')))}` : ''}`);
	rmSync(tmp, { recursive: true, force: true });
}
// No-leftover inventory over every identity this driver recorded, plus the global before/after picture.
const leftovers = identities.filter(i => existsSync(i.socketDir) || existsSync(i.artifactDir) || (i.postmaster && psList().some(p => p.pid === i.postmaster && p.command.includes(i.socketDir))));
const inventory = { identities_checked: identities.length, leftovers, worktrees: spawnSync('git', ['worktree', 'list'], { encoding: 'utf8' }).stdout.trim().split('\n'), environment_diff: diff(start, snapshot(SCRATCH)), environment_diff_note: 'informational; other lanes share this machine and their clusters may appear here, only leftovers decides' };
const outcome = receipts.every(r => r.verdict === 'pass') && leftovers.length === 0 ? 'pass' : 'fail';
const driver = Object.fromEntries(['lib.mjs', 'scenarios.mjs'].map(n => [`evidence/ci/P0c/C/driver/${n}`, sha256(readFileSync(new URL(n, import.meta.url)))]));
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'scenarios.json'), `${JSON.stringify({ schema_version: 'agora.p0c-lifecycle-scenarios/v1', head, outcome, wrapper_digest: sha256(readFileSync(WRAPPER)), driver, recorded_at: new Date().toISOString(), receipts }, null, 2)}\n`);
writeFileSync(path.join(out, 'no-leftovers.json'), `${JSON.stringify({ schema_version: 'agora.p0c-no-leftovers/v1', head, scope: 'Only identities recorded by this driver. No global sweep.', ...inventory }, null, 2)}\n`);
console.log(JSON.stringify({ schema_version: 'agora.p0c-lifecycle-scenarios/v1', head, outcome, scenarios: receipts.length, identities: identities.length, leftovers: leftovers.length }));
process.exit(outcome === 'pass' ? 0 : 1);
