import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, rmdirSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { allocatePostgresSocket } from '../../../scripts/postgres-socket.ts';

interface Receipt { outcome: string; artifactDir: string; socketDir: string; pid: number; message?: string }
const alive = (pid: number): boolean => { try { process.kill(pid, 0); return true; } catch { return false; } };
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^AGORA_(TEST_.*DATABASE_URL|DATABASE_URL|MIGRATION_DATABASE_URL)$/.test(key)));
const binaries = process.env['AGORA_PG_BIN'] ?? spawnSync('pg_config', ['--bindir'], { encoding: 'utf8' }).stdout.trim();
const query = "process.stdout.write(require('node:child_process').execFileSync('psql', [process.env.AGORA_TEST_DATABASE_URL, '-Atc', 'select current_user']))";

test.each(['deep-success', 'child-failure', 'child-signal', 'missing-command', 'initdb-failure', 'initdb-timeout', 'startup-failure', 'bootstrap-failure', 'startup-timeout', 'SIGINT', 'SIGTERM', 'startup-cancel', 'forced-cancel', 'foreign-preservation', 'abort-stop-throw', 'initdb-stderr', 'psql-stderr', 'missing-pg-isready'])('wrapper: %s', async (scenario) => {
	mkdirSync('.scratch', { recursive: true });
	const artifacts = mkdtempSync(`${realpathSync('.scratch')}/wrapper deep artifacts-`);
	const neighbor = allocatePostgresSocket(artifacts);
	const foreign = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)']);
	const receipts: Receipt[] = [];
	let output = '', diagnostic = '', pending = '', marker = '';
	let descendants: number[] = [];
	try {
		mkdirSync(`${artifacts}/bin`); writeFileSync(`${artifacts}/evidence`, 'retained');
		const faulty = scenario.startsWith('initdb-') ? 'initdb' : scenario === 'startup-failure' ? 'postgres' : ['bootstrap-failure', 'psql-stderr'].includes(scenario) ? 'psql' : ['startup-timeout', 'missing-pg-isready'].includes(scenario) ? 'pg_isready' : '';
		for (const name of ['pg_ctl', 'initdb', 'postgres', 'psql', 'pg_isready']) {
			if (name !== faulty) symlinkSync(`${binaries}/${name}`, `${artifacts}/bin/${name}`);
			// The *-stderr shims run the real tool with one bad flag so the diagnostic must carry the tool's own words.
			else if (scenario !== 'missing-pg-isready') writeFileSync(`${artifacts}/bin/${name}`, scenario === 'initdb-timeout' ? '#!/bin/sh\necho $$ > "$TMPDIR/tool.pid"\ntrap "" TERM\nwhile :; do sleep 1; done\n' : scenario.endsWith('-stderr') ? `#!/bin/sh\nexec "${binaries}/${name}" --definitely-not-a-flag "$@"\n` : '#!/bin/sh\nexit 1\n', { mode: 0o700 });
		}
		let wrapper = path.resolve('scripts/with-test-postgres.mjs');
		if (scenario === 'abort-stop-throw') {
			// EPERM for a live command group is not reachable as this user, so a disposable copy injects it at the one kill site.
			const anchor = 'process.kill(-child.pid, sig)', source = readFileSync(wrapper, 'utf8');
			expect(source.split(anchor)).toHaveLength(2);
			mkdirSync(`${artifacts}/scripts`); copyFileSync(path.resolve('scripts/postgres-socket.ts'), `${artifacts}/scripts/postgres-socket.ts`);
			wrapper = `${artifacts}/scripts/with-test-postgres.mjs`;
			writeFileSync(wrapper, source.replace(anchor, "(file === command[0] ? (() => { throw Object.assign(new Error('injected EPERM'), { code: 'EPERM' }); })() : process.kill(-child.pid, sig))"));
		}
		const cancelling = ['SIGINT', 'SIGTERM', 'forced-cancel', 'abort-stop-throw'].includes(scenario);
		const script = cancelling ? "const c=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); console.log(JSON.stringify([process.pid,c.pid])); setInterval(()=>{},1000)" : scenario === 'child-failure' ? 'process.exit(7)' : scenario === 'child-signal' ? "process.kill(process.pid,'SIGTERM')" : query;
		const begin = Date.now();
		const child = spawn(process.execPath, [wrapper, ...(scenario === 'missing-command' ? ['./absent-command'] : [process.execPath, '-e', script])], { cwd: artifacts, env: { ...env, TMPDIR: artifacts, AGORA_PG_BIN: `${artifacts}/bin`, AGORA_PG_STARTUP_TIMEOUT_MS: scenario.endsWith('timeout') || scenario === 'missing-pg-isready' ? '2000' : '30000' } });
		child.stderr.on('data', (bytes: Buffer) => {
			diagnostic += bytes.toString(); pending += bytes.toString();
			while (pending.includes('\n')) {
				const end = pending.indexOf('\n'), line = pending.slice(0, end); pending = pending.slice(end + 1);
				if (!line.startsWith('{"schema_version":')) continue;
				const receipt = JSON.parse(line) as Receipt; receipts.push(receipt);
				if (receipt.outcome === 'starting' && scenario === 'startup-cancel') child.kill('SIGINT');
				if (receipt.outcome === 'started' && scenario === 'forced-cancel') process.kill(receipt.pid, 'SIGSTOP');
				// The wrapper must report the group it cannot signal and keep waiting; only then does the test end that group itself.
				if (receipt.outcome === 'blocked' && receipt.message?.includes('stop failed')) for (const pid of descendants.slice(0, 1)) process.kill(-pid, 'SIGKILL');
				if (receipt.outcome === 'started' && scenario === 'foreign-preservation') { marker = readFileSync(`${receipt.socketDir}/owner.json`, 'utf8'); writeFileSync(`${receipt.socketDir}/owner.json`, '{}'); }
			}
		});
		child.stdout.on('data', (bytes: Buffer) => {
			output += bytes.toString();
			if (cancelling && output.includes('\n')) { descendants = JSON.parse(output) as number[]; child.kill(scenario === 'SIGINT' ? 'SIGINT' : 'SIGTERM'); }
		});
		// A wrapper that dies before its command leaves the command holding the inherited pipes, so end that group once the wrapper has exited.
		if (scenario === 'abort-stop-throw') child.once('exit', () => { for (const pid of descendants) { try { process.kill(-pid, 'SIGKILL'); } catch { /* already gone */ } } });
		const code = await new Promise<number | null>(resolve => child.once('close', resolve));
		console.error(JSON.stringify({ scenario, code, elapsed_ms: Date.now() - begin, output, diagnostic, descendants, neighbor: neighbor.identity, foreign: foreign.pid }));
		expect(code, diagnostic).toBe(scenario === 'deep-success' ? 0 : scenario === 'child-failure' ? 7 : scenario === 'child-signal' ? 1 : ['SIGINT', 'startup-cancel'].includes(scenario) ? 130 : ['SIGTERM', 'forced-cancel'].includes(scenario) ? 143 : 70);
		expect(receipts.filter(record => record.outcome === 'allocated')).toHaveLength(1);
		if (scenario === 'deep-success') expect(output.trim()).toBe('agora_app');
		if (scenario.endsWith('timeout')) { expect(diagnostic).toContain('startup timeout'); expect(Date.now() - begin).toBeLessThan(5_000); }
		if (scenario === 'initdb-timeout') expect(alive(Number(readFileSync(`${artifacts}/tool.pid`, 'utf8')))).toBe(false);
		const blocked = receipts.filter(record => record.outcome === 'blocked');
		if (scenario === 'abort-stop-throw') { expect(diagnostic).toContain('stop failed'); expect(receipts.at(-1)?.outcome).toBe('cleaned'); }
		if (scenario.endsWith('-stderr')) expect(blocked[0]?.message).toContain(`${faulty}: unrecognized option \`--definitely-not-a-flag'`);
		if (scenario === 'missing-pg-isready') { expect(blocked.map(record => record.message)).toHaveLength(2); expect(diagnostic).not.toContain('startup timeout'); expect(Date.now() - begin).toBeLessThan(1_500); for (const record of blocked) expect(record.message).toMatch(/pg_isready ENOENT/); }
		for (const receipt of receipts.filter(record => record.outcome === 'allocated')) {
			expect(Buffer.byteLength(`${receipt.socketDir}/.s.PGSQL.5432`)).toBeLessThan(104);
			if (scenario === 'foreign-preservation') {
				expect(readFileSync(`${receipt.socketDir}/owner.json`, 'utf8')).toBe('{}');
				expect(diagnostic).toContain('socket ownership mismatch');
				writeFileSync(`${receipt.socketDir}/owner.json`, marker); unlinkSync(`${receipt.socketDir}/owner.json`); rmdirSync(receipt.socketDir); rmSync(receipt.artifactDir, { recursive: true });
			}
			expect(existsSync(receipt.socketDir)).toBe(false); expect(existsSync(receipt.artifactDir)).toBe(false);
		}
		for (const pid of [...descendants, ...receipts.filter(record => record.outcome === 'starting').map(record => record.pid)]) expect(alive(pid), `owned PID ${pid} exited`).toBe(false);
		neighbor.verify(); expect(statSync(neighbor.identity.socketDir).mode & 0o777).toBe(0o700);
		expect(alive(foreign.pid ?? 0)).toBe(true); expect(readFileSync(`${artifacts}/evidence`, 'utf8')).toBe('retained');
	} finally {
		foreign.kill(); await new Promise(resolve => foreign.once('close', resolve)); neighbor.cleanup();
		// A red run must not leave this run's own recorded identities behind; the liveness assertions above already reported them.
		for (const pid of [...descendants, ...receipts.filter(record => record.outcome === 'starting').map(record => record.pid)]) for (const target of [-pid, pid]) { try { process.kill(target, 'SIGKILL'); } catch { /* already gone */ } }
		for (const record of receipts.filter(record => record.outcome === 'allocated')) rmSync(record.socketDir, { recursive: true, force: true });
		rmSync(artifacts, { recursive: true });
	}
}, 45_000);
