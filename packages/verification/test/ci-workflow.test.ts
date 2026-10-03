import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, expect, test } from 'vitest';

interface Step { uses?: string; with?: Record<string, unknown>; run?: string }
interface Job { 'runs-on': string; steps: Step[]; [key: string]: unknown }
interface Workflow { on: Record<string, { branches: string[] }>; permissions: Record<string, string>; jobs: Record<string, Job>; [key: string]: unknown }

const root = path.resolve(import.meta.dirname, '../../..');
// The workflow is committed as JSON, which is valid YAML, so JSON.parse reads exactly what GitHub reads.
const workflow = (): Workflow => JSON.parse(readFileSync(path.join(root, '.github/workflows/agora-ci.yml'), 'utf8')) as Workflow;
const commands = (job: Job) => job.steps.flatMap(step => (step.run ? [step.run] : []));

test('candidate CI runs only on pull requests to main with read-only contents and no credentials', () => {
	const flow = workflow();
	expect(flow.on).toEqual({ pull_request: { branches: ['main'] } });
	expect(flow.permissions).toEqual({ contents: 'read' });
	const everyString: string[] = [];
	JSON.stringify(flow, (_key: string, value: unknown): unknown => { if (typeof value === 'string') everyString.push(value); return value; });
	expect(everyString.filter(text => /secrets\.|GITHUB_TOKEN|agora-report|agora\/evidence|agora\/policy/.test(text))).toEqual([]);
	for (const job of Object.values(flow.jobs)) {
		expect(Object.keys(job).sort()).toEqual(['runs-on', 'steps', 'timeout-minutes']);
		const checkout: Step = job.steps[0] ?? {}, node: Step = job.steps[1] ?? {};
		expect(checkout.uses).toMatch(/^actions\/checkout@[0-9a-f]{40}$/);
		expect(checkout.with).toEqual({ 'fetch-depth': 0, 'persist-credentials': false });
		expect(node.uses).toMatch(/^actions\/setup-node@[0-9a-f]{40}$/);
		expect(node.with).toEqual({ 'node-version-file': '.node-version' });
		expect(job['runs-on']).toMatch(/^(ubuntu-24\.04|macos-15)$/);
		expect(job.steps.filter(step => step.uses).length).toBe(2);
	}
});

test('seven verification areas run their real driver commands', () => {
	const jobs = workflow().jobs;
	const sha = '"${{ github.event.pull_request.base.sha }}" "${{ github.event.pull_request.head.sha }}"';
	expect(Object.fromEntries(Object.entries(jobs).map(([id, job]) => [id, [job['runs-on'], ...commands(job)]]))).toEqual({
		doctor: ['ubuntu-24.04', 'bash scripts/ci-setup.sh', 'node scripts/ci-doctor.mjs --json'],
		static: ['ubuntu-24.04', 'bash scripts/ci-setup.sh', 'pnpm lint', 'pnpm typecheck'],
		contracts: ['ubuntu-24.04', 'bash scripts/ci-setup.sh swift', 'pnpm contracts:check', 'pnpm boundaries'],
		docs: ['ubuntu-24.04', 'bash scripts/ci-setup.sh', 'pnpm docs:check'],
		tests: ['macos-15', 'bash scripts/ci-setup.sh postgres python swift', 'pnpm test'],
		'red-green': ['ubuntu-24.04', 'bash scripts/ci-setup.sh postgres python swift', `bash scripts/ci-red-green.sh ${sha}`],
		guards: ['ubuntu-24.04', 'bash scripts/ci-setup.sh postgres python', 'pnpm -s agora project lanes --unit U01b --task agora-s1-validate-project-evidence --artifacts .scratch/ci-lanes --json'],
	});
});

test('every pnpm script and file the workflow names exists', () => {
	const scripts = (JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts;
	for (const job of Object.values(workflow().jobs)) {
		for (const command of commands(job)) {
			const pnpm = /^pnpm (?:-s )?([\w:]+)/.exec(command);
			if (pnpm) expect(Object.keys(scripts), command).toContain(pnpm[1]);
			const file = /(?:bash|node) (scripts\/[\w.-]+)/.exec(command);
			if (file) expect(existsSync(path.join(root, file[1] ?? '')), command).toBe(true);
		}
	}
});

const sandboxes: string[] = [];
afterAll(() => { for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true }); });
const redGreen = (...changed: string[]) => {
	const dir = mkdtempSync(path.join(os.tmpdir(), 'agora-red-green-'));
	sandboxes.push(dir);
	const git = (...argv: string[]) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...argv], { cwd: dir, encoding: 'utf8' });
	git('init', '-q');
	writeFileSync(path.join(dir, 'README.md'), 'base\n');
	git('add', '.'); git('commit', '-qm', 'base');
	const base = git('rev-parse', 'HEAD').stdout.trim();
	for (const file of changed) {
		mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		writeFileSync(path.join(dir, file), 'changed\n');
	}
	git('add', '.'); git('commit', '-qm', 'change');
	const head = git('rev-parse', 'HEAD').stdout.trim();
	return spawnSync('bash', [path.join(root, 'scripts/ci-red-green.sh'), base, head], { cwd: dir, encoding: 'utf8' });
};

test('red-green job accepts documentation-only changes', () => {
	const result = redGreen('docs/note.md');
	expect(result.status).toBe(0);
	expect(result.stdout).toContain('documentation-only change, not applicable');
});

test('red-green job rejects a source change that has no changed test', () => {
	const result = redGreen('packages/storage/src/thing.ts');
	expect(result.status).toBe(1);
	expect(result.stderr).toContain('red_green_missing: source changed without a changed test');
});

test('red-green job skips red for a commit that changes only tests, docs or evidence', () => {
	const result = redGreen('packages/storage/test/thing.test.ts');
	expect(result.status).toBe(0);
	expect(result.stdout).toContain('changes only tests, docs or evidence, so it has no behavior to turn red');
});

test('red-green job still demands a red for a commit that changes source with its test', () => {
	for (const source of ['packages/storage/src/thing.ts', 'scripts/tool.mjs', 'apps/web/vitest.config.ts']) {
		const result = redGreen('packages/storage/test/thing.test.ts', source);
		expect(result.stdout, source).not.toContain('no behavior to turn red');
		expect(result.status, source).not.toBe(0);
	}
});
