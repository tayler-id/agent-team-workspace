import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const scratch = path.join(root, '.scratch');
mkdirSync(scratch, { recursive: true });
const work = mkdtempSync(path.join(scratch, 'doctor-native-'));
// Stands in for the signed host launcher: the loader rejects only the Rolldown addon, with the macOS Team ID message.
const fixture = path.join(work, 'unsigned-launcher.cjs');
writeFileSync(fixture, "const real = process.dlopen; process.dlopen = (m, f, ...r) => { if (/rolldown-binding/.test(f)) throw new Error(`dlopen(${f}) (code signature in <x> not valid for use in process: mapping process and mapped file (non-platform) have different Team IDs)`); return real(m, f, ...r); };\n");
const denied = { ...process.env, NODE_OPTIONS: `--require=${fixture}` };
interface Report { outcome: string; detail: string }
const cli = (script: string, args: string[], env: NodeJS.ProcessEnv, cwd = root): { exit: number | null; report: Report } => {
	const r = spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8', timeout: 60_000 });
	return { exit: r.status, report: JSON.parse(r.stdout) as Report };
};
const instance = `doctor-native-${randomUUID().slice(0, 8)}`;
const supported = /official nodejs\.org Node 24\.21\.0/;
const assertBlockedWithRemedy = (r: { exit: number | null; report: Report }): void => {
	expect(r.exit).toBe(2);
	expect(r.report.outcome).toBe('blocked');
	expect(r.report.detail).toMatch(/Rolldown native addon.*different Team ID/);
	expect(r.report.detail).toMatch(supported);
};

afterAll(() => {
	cli('scripts/local-room.ts', ['reset', '--instance', instance, '--confirm-disposable'], process.env);
	rmSync(work, { recursive: true, force: true });
});

describe('local room doctor and start native readiness', () => {
	test('doctor passes and says the addon loads when Rolldown loads', () => {
		const r = cli('scripts/local-room.ts', ['doctor'], process.env);
		expect(r.report.outcome).toBe('pass');
		expect(r.report.detail).toMatch(/Rolldown native addon loads/);
	});

	test('doctor is blocked with the supported runtime remedy when the addon cannot load', () => {
		assertBlockedWithRemedy(cli('scripts/local-room.ts', ['doctor'], denied));
	});

	test('start reports the selected native cause, not an instruction to read the log', () => {
		const r = cli('scripts/local-room.ts', ['start', '--instance', instance, '--port', '0'], denied);
		assertBlockedWithRemedy(r);
		expect(r.report.detail).toMatch(/^Error: startup failed\. /);
		expect(r.report.detail).not.toMatch(/LOG:|dlopen\(/);
	});

	test('guard negative: with the probe removed the same readiness assertion goes red', () => {
		const source = readFileSync(path.join(root, 'scripts/local-room.ts'), 'utf8');
		const call = "try { nativeProbe(); } catch (e) { throw new Error(`${nativeCause(e)}. ${supportedRuntimeRemedy}`, { cause: e }); }";
		expect(source.split(call).length, 'exactly one doctor probe call').toBe(2);
		const copy = path.join(work, 'scripts');
		mkdirSync(copy);
		for (const name of ['local-room-client.ts', 'local-room-owner.ts', 'native-probe.ts']) copyFileSync(path.join(root, 'scripts', name), path.join(copy, name));
		for (const name of ['.node-version', 'package.json']) copyFileSync(path.join(root, name), path.join(work, name));
		symlinkSync(path.join(root, 'node_modules'), path.join(work, 'node_modules'), 'dir');
		writeFileSync(path.join(copy, 'local-room.ts'), source);
		assertBlockedWithRemedy(cli(path.join(copy, 'local-room.ts'), ['doctor'], denied, work));
		writeFileSync(path.join(copy, 'local-room.ts'), source.replace(call, ''));
		const weakened = cli(path.join(copy, 'local-room.ts'), ['doctor'], denied, work);
		expect(weakened.report.outcome, 'doctor false-passes without the probe').toBe('pass');
		expect(() => { assertBlockedWithRemedy(weakened); }).toThrow();
	});
});
