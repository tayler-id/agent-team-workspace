import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

const root = process.cwd();
const cli = (args: string[], cwd = root) => spawnSync(process.execPath, ['scripts/project.mjs', ...args], { cwd, encoding: 'utf8', timeout: 10_000 });
const registry = () => existsSync('.scratch/project') ? readdirSync('.scratch/project', { recursive: true }).sort() : [];

test('project help lists implemented fixture routes without launching', () => {
	const before = registry();
	for (const args of [['--help'], ['project', '--help'], ['project', '-h'], ['project', 'start', '--help']]) {
		const result = cli(args);
		expect(result.error).toBeUndefined();
		expect(result.status, result.stdout + result.stderr).toBe(0);
		expect(result.stderr).toBe('');
		expect(result.stdout).toContain('Usage: pnpm -s agora project');
		for (const command of ['doctor', 'scenarios', 'start', 'verify', 'evidence', 'stop', 'lanes']) expect(result.stdout).toContain(command);
		expect(result.stdout).toContain('policy, controls, guards');
		expect(result.stdout).toContain('lanes 8-10 unavailable');
		expect(result.stdout).toContain('not production authority');
	}
	expect(registry()).toEqual(before);
});

test('project help needs no dependency install, Git history or database', () => {
	mkdirSync('.scratch', { recursive: true });
	const copy = mkdtempSync(path.resolve('.scratch/project-help-'));
	try {
		mkdirSync(path.join(copy, 'scripts'));
		copyFileSync('scripts/project.mjs', path.join(copy, 'scripts/project.mjs'));
		const result = cli(['project', '--help'], copy);
		expect(result.status, result.stdout + result.stderr).toBe(0);
		expect(result.stdout).toContain('cleanup handle');
		expect(readdirSync(copy)).toEqual(['scripts']);
	} finally { rmSync(copy, { recursive: true }); }
});

test('project help does not hide unknown routes or malformed options', () => {
	for (const args of [['project', 'imaginary', '--help'], ['project', '--help', '--wat'], ['project', 'doctor', '--wat'], ['project', 'start', '--instance']]) {
		const result = cli(args);
		expect(result.error).toBeUndefined();
		expect(result.status, result.stdout + result.stderr).toBe(64);
		const report: unknown = JSON.parse(result.stdout);
		expect(report).toMatchObject({ outcome: 'usage_error' });
	}
});
