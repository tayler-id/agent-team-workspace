import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

const repo = path.resolve(import.meta.dirname, '../../..');
// Loaded inside each test, so at a parent without the module the suite still loads and its assertions fail.
const discovery = () => import('../../../scripts/feature-discovery.ts');
const noText = (): string => '[]';
const problems = async (files: string[], text = noText): Promise<string[]> => {
	const { DiscoveryError, discoverFeatures } = await discovery();
	try {
		discoverFeatures(files, text);
	} catch (error) {
		if (error instanceof DiscoveryError) return error.problems;
		throw error;
	}
	return [];
};

test('finds a well-formed Feature without registration, per owning package', async () => {
	const { discoverFeatures } = await discovery();
	const rows = discoverFeatures(
		['apps/web/src/features/room/entrypoint.ts', 'apps/web/src/features/room/timeline-card.tsx', 'apps/web/src/features/room/view.tsx', 'apps/center/src/features/room/entrypoint.ts', 'packages/x/features/note/entrypoint.ts'],
		noText,
	);
	expect(rows.map((r) => [r.package, r.name, r.timelineCard])).toEqual([
		['apps/center', 'room', null],
		['apps/web', 'room', 'apps/web/src/features/room/timeline-card.tsx'],
		['packages/x', 'note', null],
	]);
	expect(rows[2]?.root).toBe('packages/x/features/note');
});

test('reads dependencies.json into the row, sorted, and accepts only distinct Feature names', async () => {
	const { discoverFeatures } = await discovery();
	const files = ['apps/web/src/features/a/entrypoint.ts', 'apps/web/src/features/a/dependencies.json'];
	expect(discoverFeatures(files, () => '["z","b"]')[0]?.dependencies).toEqual(['b', 'z']);
	for (const body of ['{}', '[1]', '["b","b"]', '["Room"]', '["../b"]']) {
		expect(await problems(files, () => body), body).toEqual([
			'apps/web/src/features/a/dependencies.json: expected a JSON array of distinct Feature names matching ^[a-z][a-z0-9-]*$; supported owner is apps/web/src/features/<name>/',
		]);
	}
});

test('rejects Feature files outside src/features/<name>/ and names owner and path', async () => {
	for (const file of ['apps/web/src/components/features/room/entrypoint.ts', 'apps/web/src/room/entrypoint.ts', 'apps/web/features/room/entrypoint.ts']) {
		expect(await problems(['apps/web/src/main.tsx', file])).toEqual([`${file}: Feature file outside the conventional path; supported owner is apps/web, conventional path is apps/web/src/features/<name>/`]);
	}
	expect((await problems(['apps/web/src/features/a/b/entrypoint.ts']))[0]).toMatch(/nested inside Feature a/);
});

test('rejects a Feature missing its entrypoint', async () => {
	expect(await problems(['apps/web/src/features/notes/index.ts', 'apps/web/src/features/notes/timeline-card.tsx'])).toEqual([
		'apps/web/src/features/notes: missing reserved entrypoint.ts; supported owner is apps/web/src/features/<name>/',
	]);
});

test('rejects invalid and colliding names', async () => {
	expect((await problems(['apps/web/src/features/Room/entrypoint.ts']))[0]).toMatch(/lowercase kebab-case/);
	expect((await problems(['apps/web/src/features/Room/entrypoint.ts', 'apps/web/src/features/room/entrypoint.ts'])).join('\n')).toMatch(/duplicate Feature name, also declared by apps\/web\/src\/features\/Room/);
});

const put = (dir: string, rel: string, body = 'export {};\n'): void => {
	mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
	writeFileSync(path.join(dir, rel), body);
};
// The CLI tests run against a throwaway copy of the scripts and a namespaced fixture tree.
const fixture = (): { dir: string; run: (args?: string[], script?: string) => SpawnSyncReturns<string> } => {
	const dir = mkdtempSync(path.join(os.tmpdir(), 'agora-u21-'));
	mkdirSync(path.join(dir, 'agora'));
	mkdirSync(path.join(dir, 'scripts'));
	for (const f of ['feature-discovery.ts', 'feature-inventory.ts']) cpSync(path.join(repo, 'scripts', f), path.join(dir, 'scripts', f));
	put(dir, 'apps/web/src/features/room/entrypoint.ts');
	put(dir, 'apps/web/src/features/room/timeline-card.tsx');
	return { dir, run: (args = [], script = 'feature-inventory.ts') => spawnSync(process.execPath, [path.join(dir, 'scripts', script), ...args], { encoding: 'utf8' }) };
};

test('generate is idempotent, check detects a hand-edited row, and removing a Feature drops it', () => {
	const { dir, run } = fixture();
	try {
		expect(run().status).toBe(0);
		const inventory = path.join(dir, 'agora/feature-inventory.json');
		const first = readFileSync(inventory, 'utf8');
		expect(run().stdout).toMatch(/unchanged/);
		expect(readFileSync(inventory, 'utf8')).toBe(first);
		expect(run(['--check']).status).toBe(0);

		put(dir, 'apps/web/src/features/newcomer/entrypoint.ts');
		expect(run(['--check']).status, 'a new Feature that is not generated yet is drift').toBe(1);
		run();
		expect(readFileSync(inventory, 'utf8')).toMatch(/"name": "newcomer"/);

		writeFileSync(inventory, readFileSync(inventory, 'utf8').replace('"name": "newcomer"', '"name": "sneaky"'));
		const drift = run(['--check']);
		expect(drift.status).toBe(1);
		expect(drift.stderr).toMatch(/differs from the Feature directories on disk/);

		rmSync(path.join(dir, 'apps/web/src/features/newcomer'), { recursive: true });
		run();
		expect(readFileSync(inventory, 'utf8')).not.toMatch(/newcomer|sneaky/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('guard negative: with the drift comparison disabled the hand-edit assertion turns red', () => {
	const { dir, run } = fixture();
	try {
		run();
		const inventory = path.join(dir, 'agora/feature-inventory.json');
		writeFileSync(inventory, readFileSync(inventory, 'utf8').replace('"name": "room"', '"name": "forged"'));
		expect(run(['--check']).status).toBe(1);
		const script = path.join(dir, 'scripts/feature-inventory.ts');
		const source = readFileSync(script, 'utf8');
		const weakened = source.replace('if (current !== text) throw new DiscoveryError', 'if (false) throw new DiscoveryError');
		expect(weakened, 'the drift guard line must exist to be disabled').not.toBe(source);
		writeFileSync(script, weakened);
		expect(run(['--check']).status, 'the same assertion passes once the guard is off, proving the guard is what rejects').toBe(0);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('the committed inventory matches the live repository', () => {
	const result = spawnSync(process.execPath, [path.join(repo, 'scripts/feature-inventory.ts'), '--check'], { encoding: 'utf8' });
	expect(result.status, result.stderr).toBe(0);
});
