// P0c-C proof runner. Drives a wrapper as a black box through its command line and NDJSON receipts,
// snapshots owned and foreign resources around every run, and removes only identities a run reported.
// Run from the repository root; nothing here imports project code.
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();
export const BIN = spawnSync('pg_config', ['--bindir'], { encoding: 'utf8' }).stdout.trim();
export const baseEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^AGORA_/.test(key) && !/TOKEN/.test(key)));
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };
export const psList = () => spawnSync('ps', ['-A', '-o', 'pid=,pgid=,ppid=,stat=,command='], { encoding: 'utf8' }).stdout.split('\n').map(line => line.trim()).filter(Boolean).map(line => { const [pid, pgid, ppid, stat, ...command] = line.split(/\s+/); return { pid: Number(pid), pgid: Number(pgid), ppid: Number(ppid), stat, command: command.join(' ') }; });
export const git = (...argv) => spawnSync('git', argv, { cwd: ROOT, encoding: 'utf8' }).stdout;
// PostgreSQL keeps one small System V interlock segment per postmaster; a SIGKILLed postmaster leaves it behind on Darwin.
export const sysvSegments = () => process.platform !== 'darwin' ? [] : spawnSync('ipcs', ['-ma'], { encoding: 'utf8' }).stdout.split('\n').filter(line => line.startsWith('m ')).map(line => { const f = line.trim().split(/\s+/); return { id: Number(f[1]), key: f[2], nattch: Number(f[8]), cpid: Number(f[10]) }; });

export function scratch(root, name) { const dir = path.join(root, name); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); return dir; }

// Symlink real binaries into a private bin, replacing (or omitting with null) the named tools.
export function fakeBin(dir, faulty = {}) {
	mkdirSync(dir, { recursive: true });
	for (const name of ['pg_ctl', 'initdb', 'postgres', 'psql', 'pg_isready']) {
		if (!(name in faulty)) symlinkSync(`${BIN}/${name}`, `${dir}/${name}`);
		else if (faulty[name] !== null) writeFileSync(`${dir}/${name}`, faulty[name], { mode: 0o700 });
	}
	return dir;
}

export function snapshot(tmp) {
	const sockets = readdirSync('/private/tmp').filter(name => name.startsWith('agora-p0c-') && lstatSync(`/private/tmp/${name}`).isDirectory()).sort();
	const roots = existsSync(tmp) ? readdirSync(tmp).filter(name => name.startsWith('agora-pg-')).sort() : [];
	const postmasters = psList().filter(p => /postgres -D/.test(p.command)).map(p => `${p.pid} ${p.command.slice(0, 140)}`).sort();
	const listeners = spawnSync('lsof', ['-U', '-n', '-P'], { encoding: 'utf8', maxBuffer: 64 << 20 }).stdout.split('\n').filter(line => line.includes('agora-p0c')).map(line => line.trim().replace(/\s+/g, ' ').slice(0, 160)).sort();
	const segments = sysvSegments().map(s => `${s.id} key=${s.key} cpid=${s.cpid}`).sort();
	return { sockets, roots, postmasters, listeners, segments };
}
export function diff(before, after) {
	const out = {};
	for (const key of Object.keys(before)) {
		const added = after[key].filter(x => !before[key].includes(x)), removed = before[key].filter(x => !after[key].includes(x));
		if (added.length || removed.length) out[key] = { added, removed };
	}
	return out;
}

// Foreign neighbors every run must leave alone: a prefixed directory that is not a lease, a live process, a file in TMPDIR.
export function neighbors(tmp) {
	const dir = `/private/tmp/agora-p0c-${randomUUID()}`;
	mkdirSync(dir, { mode: 0o700 }); writeFileSync(`${dir}/owner.json`, '{"foreign":true}', { mode: 0o600 }); writeFileSync(`${dir}/keep`, 'keep');
	const proc = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
	mkdirSync(tmp, { recursive: true }); writeFileSync(`${tmp}/agora-pg-foreign-file`, 'foreign');
	return {
		dir, pid: proc.pid,
		check: () => ({ dir_intact: existsSync(`${dir}/keep`) && readFileSync(`${dir}/owner.json`, 'utf8') === '{"foreign":true}', process_alive: alive(proc.pid), file_intact: readFileSync(`${tmp}/agora-pg-foreign-file`, 'utf8') === 'foreign' }),
		release: () => { proc.kill('SIGKILL'); rmSync(dir, { recursive: true, force: true }); rmSync(`${tmp}/agora-pg-foreign-file`, { force: true }); },
	};
}

// One wrapper run. hooks: onReceipt(receipt, child), onSpawn(child), onStdout(text, child). A run past boundMs is
// interrupted (SIGINT, then SIGKILL) and reported as hung; that is a failed run, never a pass. `tracked` lists command
// pids the caller learned; a wrapper that exits while they still hold its pipes is reported as orphaning them.
export async function runWrapper({ name, wrapper, command, env = {}, tmp, cwd = tmp, hooks = {}, boundMs = 20_000, tracked = [] }) {
	const begin = Date.now();
	const child = spawn(process.execPath, [wrapper, ...command], { cwd, env: { ...baseEnv, TMPDIR: tmp, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
	const receipts = []; let stdout = '', stderr = '', pending = '', hung = false, orphaned = false;
	hooks.onSpawn?.(child);
	child.stdout.on('data', bytes => { stdout += bytes; hooks.onStdout?.(stdout, child); });
	child.stderr.on('data', bytes => {
		stderr += bytes; pending += bytes;
		while (pending.includes('\n')) {
			const end = pending.indexOf('\n'), line = pending.slice(0, end); pending = pending.slice(end + 1);
			if (!line.startsWith('{"schema_version":')) continue;
			let receipt; try { receipt = JSON.parse(line); } catch { continue; }
			receipts.push(receipt); hooks.onReceipt?.(receipt, child);
		}
	});
	const endTracked = () => { for (const pid of tracked) for (const target of [-pid, pid]) { try { process.kill(target, 'SIGKILL'); } catch { /* gone */ } } };
	const watchdog = setTimeout(() => { hung = true; child.kill('SIGINT'); setTimeout(() => { child.kill('SIGKILL'); endTracked(); }, 3_000).unref(); }, boundMs);
	const closed = new Promise(resolve => child.once('close', (c, s) => resolve([c, s])));
	await new Promise(resolve => child.once('exit', resolve));
	const drained = await Promise.race([closed.then(() => true), sleep(1_000).then(() => false)]);
	if (!drained) { orphaned = true; endTracked(); }
	const [code, signal] = await closed;
	clearTimeout(watchdog);
	const find = (outcome) => receipts.find(r => r.outcome === outcome);
	return { name, code, signal, hung, orphaned_pipes: orphaned, elapsed_ms: Date.now() - begin, receipts, outcomes: receipts.map(r => r.outcome), stdout, stderr, pid: child.pid, allocated: find('allocated'), starting: find('starting'), blocked: receipts.filter(r => r.outcome === 'blocked').map(r => r.message), cleanup_failed: receipts.filter(r => r.outcome === 'cleanup-failed').map(r => r.message) };
}

export function residue(run) {
	if (!run.allocated) return { none_allocated: true };
	const { socketDir, artifactDir } = run.allocated;
	const postmaster = run.starting ? psList().find(p => p.pid === run.starting.pid && p.command.includes(socketDir)) : undefined;
	return { socket_dir: existsSync(socketDir), socket_listing: existsSync(socketDir) ? readdirSync(socketDir).sort() : null, artifact_root: existsSync(artifactDir), postmaster_alive: Boolean(postmaster), sysv_segment: run.starting ? sysvSegments().some(s => s.cpid === run.starting.pid) : false, listeners: snapshot(path.dirname(artifactDir)).listeners.filter(line => line.includes(socketDir)) };
}

// Remove only what this run reported as its own: the postmaster whose command line names the run's socket
// directory, the socket directory whose owner record names an artifact root under `tmp`, and that root.
export function sweepOwned(run, tmp, extraPids = []) {
	const swept = [];
	for (const pid of extraPids) if (alive(pid)) { for (const target of [-pid, pid]) { try { process.kill(target, 'SIGKILL'); } catch { /* gone */ } } swept.push(`pid ${pid}`); }
	if (!run.allocated) return swept;
	const { socketDir, artifactDir } = run.allocated;
	const postmaster = run.starting ? psList().find(p => p.pid === run.starting.pid && p.command.includes(socketDir)) : undefined;
	if (postmaster) { try { process.kill(-postmaster.pid, 'SIGKILL'); } catch { try { process.kill(postmaster.pid, 'SIGKILL'); } catch { /* gone */ } } swept.push(`postmaster ${postmaster.pid}`); }
	if (existsSync(socketDir)) {
		let owner = {}; try { owner = JSON.parse(readFileSync(`${socketDir}/owner.json`, 'utf8')); } catch { /* not a lease record */ }
		if (typeof owner.artifactDir === 'string' && owner.artifactDir.startsWith(tmp)) { rmSync(socketDir, { recursive: true, force: true }); swept.push(`socket ${socketDir}`); }
		else swept.push(`refused ${socketDir}`);
	}
	for (const dir of [artifactDir, `${artifactDir}.moved`]) if (dir.startsWith(tmp) && existsSync(dir)) { rmSync(dir, { recursive: true, force: true }); swept.push(`root ${dir}`); }
	// Only the segment whose creator is this run's recorded postmaster, and only once that creator is dead and nothing is attached.
	if (run.starting && !alive(run.starting.pid)) for (const segment of sysvSegments().filter(s => s.cpid === run.starting.pid && s.nattch === 0)) { spawnSync('ipcrm', ['-m', String(segment.id)]); swept.push(`sysv-segment ${segment.id} key=${segment.key} cpid=${segment.cpid} creator-dead unattached`); }
	return swept;
}

// True when anything this run reported as its own still exists; foreign activity on the machine does not count.
export const ownResidue = (run) => { const r = residue(run); return Boolean(r.socket_dir || r.artifact_root || r.postmaster_alive || r.sysv_segment || r.listeners?.length); };
export const killAt = (outcome, sig, delay = 0) => (receipt, child) => { if (receipt.outcome === outcome) setTimeout(() => child.kill(sig), delay); };
export const QUERY = "process.stdout.write(require('node:child_process').execFileSync('psql',[process.env.AGORA_TEST_DATABASE_URL,'-Atc','select current_user, rolsuper, rolbypassrls from pg_roles where rolname = current_user']))";
export const HOLD = "const c=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); console.log(JSON.stringify([process.pid,c.pid])); setInterval(()=>{},1000)";
