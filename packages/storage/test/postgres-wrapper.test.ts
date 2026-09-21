import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, rmdirSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { allocatePostgresSocket } from '../../../scripts/postgres-socket.ts';

interface Receipt { outcome: string; artifactDir: string; socketDir: string; pid: number }
const alive = (pid: number): boolean => { try { process.kill(pid, 0); return true; } catch { return false; } };
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^AGORA_(TEST_.*DATABASE_URL|DATABASE_URL|MIGRATION_DATABASE_URL)$/.test(key)));
const binaries = process.env['AGORA_PG_BIN'] ?? spawnSync('pg_config', ['--bindir'], { encoding: 'utf8' }).stdout.trim();
const query = "process.stdout.write(require('node:child_process').execFileSync('psql', [process.env.AGORA_TEST_DATABASE_URL, '-Atc', 'select current_user']))";

test.each(['deep-success', 'child-failure', 'missing-command', 'initdb-failure', 'initdb-timeout', 'startup-failure', 'bootstrap-failure', 'startup-timeout', 'SIGINT', 'SIGTERM', 'startup-cancel', 'forced-cancel', 'foreign-preservation'])('wrapper: %s', async (scenario) => {
	mkdirSync('.scratch', { recursive: true });
	const artifacts = mkdtempSync(`${realpathSync('.scratch')}/wrapper deep artifacts-`);
	const neighbor = allocatePostgresSocket(artifacts);
	const foreign = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)']);
	const receipts: Receipt[] = [];
	let output = '', diagnostic = '', pending = '', marker = '';
	let descendants: number[] = [];
	try {
		mkdirSync(`${artifacts}/bin`); writeFileSync(`${artifacts}/evidence`, 'retained');
		const faulty = scenario.startsWith('initdb-') ? 'initdb' : scenario === 'startup-failure' ? 'postgres' : scenario === 'bootstrap-failure' ? 'psql' : scenario === 'startup-timeout' ? 'pg_isready' : '';
		for (const name of ['pg_ctl', 'initdb', 'postgres', 'psql', 'pg_isready']) {
			if (name === faulty) writeFileSync(`${artifacts}/bin/${name}`, scenario === 'initdb-timeout' ? '#!/bin/sh\necho $$ > "$TMPDIR/tool.pid"\ntrap "" TERM\nwhile :; do sleep 1; done\n' : '#!/bin/sh\nexit 1\n', { mode: 0o700 });
			else symlinkSync(`${binaries}/${name}`, `${artifacts}/bin/${name}`);
		}
		const cancelling = ['SIGINT', 'SIGTERM', 'forced-cancel'].includes(scenario);
		const script = cancelling ? "const c=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); console.log(JSON.stringify([process.pid,c.pid])); setInterval(()=>{},1000)" : scenario === 'child-failure' ? 'process.exit(7)' : query;
		const begin = Date.now();
		const child = spawn(process.execPath, [path.resolve('scripts/with-test-postgres.mjs'), ...(scenario === 'missing-command' ? ['./absent-command'] : [process.execPath, '-e', script])], { cwd: artifacts, env: { ...env, TMPDIR: artifacts, AGORA_PG_BIN: `${artifacts}/bin`, AGORA_PG_STARTUP_TIMEOUT_MS: scenario.endsWith('timeout') ? '2000' : '30000' } });
		child.stderr.on('data', (bytes: Buffer) => {
			diagnostic += bytes.toString(); pending += bytes.toString();
			while (pending.includes('\n')) {
				const end = pending.indexOf('\n'), line = pending.slice(0, end); pending = pending.slice(end + 1);
				if (!line.startsWith('{"schema_version":')) continue;
				const receipt = JSON.parse(line) as Receipt; receipts.push(receipt);
				if (receipt.outcome === 'starting' && scenario === 'startup-cancel') child.kill('SIGINT');
				if (receipt.outcome === 'started' && scenario === 'forced-cancel') process.kill(receipt.pid, 'SIGSTOP');
				if (receipt.outcome === 'started' && scenario === 'foreign-preservation') { marker = readFileSync(`${receipt.socketDir}/owner.json`, 'utf8'); writeFileSync(`${receipt.socketDir}/owner.json`, '{}'); }
			}
		});
		child.stdout.on('data', (bytes: Buffer) => {
			output += bytes.toString();
			if (cancelling && output.includes('\n')) { descendants = JSON.parse(output) as number[]; child.kill(scenario === 'SIGINT' ? 'SIGINT' : 'SIGTERM'); }
		});
		const code = await new Promise<number | null>(resolve => child.once('close', resolve));
		console.error(JSON.stringify({ scenario, code, elapsed_ms: Date.now() - begin, output, diagnostic, descendants, neighbor: neighbor.identity, foreign: foreign.pid }));
		expect(receipts.filter(record => record.outcome === 'allocated')).toHaveLength(1);
		expect(code).toBe(scenario === 'deep-success' ? 0 : scenario === 'child-failure' ? 7 : ['SIGINT', 'startup-cancel'].includes(scenario) ? 130 : ['SIGTERM', 'forced-cancel'].includes(scenario) ? 143 : 70);
		if (scenario === 'deep-success') expect(output.trim()).toBe('agora_app');
		if (scenario.endsWith('timeout')) { expect(diagnostic).toContain('startup timeout'); expect(Date.now() - begin).toBeLessThan(5_000); }
		if (scenario === 'initdb-timeout') expect(alive(Number(readFileSync(`${artifacts}/tool.pid`, 'utf8')))).toBe(false);
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
		expect(receipts.some(record => record.outcome === 'starting' && alive(record.pid)), `live owned server retained at ${artifacts}`).toBe(false);
		rmSync(artifacts, { recursive: true });
	}
}, 45_000);
