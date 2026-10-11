import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

// U21 live lanes 1 to 10, driven through the committed inventory generator against real files in throwaway copies.
// Each lane leaves its commands and outputs in .scratch/u21-lanes/lane-N.json for the evidence folder.
const repo = path.resolve(import.meta.dirname, '../../..');
const FIRST_DISCOVERY = '650b850';
const OWNER = 'apps/web/src/features/<name>/';
const ROOM = ['apps/web/src/features/room/entrypoint.ts', 'apps/web/src/features/room/timeline-card.tsx'];

interface Step { command: string; exit: number | null; stdout: string; stderr: string }
const save = (lane: number, steps: Step[]): void => {
	mkdirSync(path.join(repo, '.scratch/u21-lanes'), { recursive: true });
	writeFileSync(path.join(repo, `.scratch/u21-lanes/lane-${lane}.json`), `${JSON.stringify({ lane, steps }, null, 2)}\n`);
};
const git = (...argv: string[]): Step => {
	const r = spawnSync('git', ['-C', repo, ...argv], { encoding: 'utf8' });
	return { command: `git ${argv.join(' ')}`, exit: r.status, stdout: r.stdout, stderr: r.stderr };
};

function lane(n: number, title: string, files: string[], body: (s: Scenario) => void | Promise<void>): void {
	test(`project lane ${n} ${title}`, async () => {
		const s = scenario(files);
		try {
			await body(s);
		} finally {
			save(n, s.steps);
			rmSync(s.dir, { recursive: true, force: true });
		}
	});
}
type Scenario = ReturnType<typeof scenario>;
function scenario(files: string[]) {
	const dir = mkdtempSync(path.join(os.tmpdir(), 'agora-u21-lane-'));
	const steps: Step[] = [];
	mkdirSync(path.join(dir, 'agora'));
	mkdirSync(path.join(dir, 'scripts'));
	for (const f of ['feature-discovery.ts', 'feature-inventory.ts']) cpSync(path.join(repo, 'scripts', f), path.join(dir, 'scripts', f));
	const put = (rel: string, body = 'export {};\n'): void => {
		mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
		writeFileSync(path.join(dir, rel), body);
	};
	files.forEach((f) => put(f));
	const run = (...args: string[]): Step => {
		const r = spawnSync(process.execPath, ['scripts/feature-inventory.ts', ...args], { cwd: dir, encoding: 'utf8' });
		const step = { command: `node scripts/feature-inventory.ts ${args.join(' ')}`.trim(), exit: r.status, stdout: r.stdout, stderr: r.stderr };
		steps.push(step);
		return step;
	};
	return { dir, steps, put, run, inventory: path.join(dir, 'agora/feature-inventory.json') };
}
const read = (file: string): string => readFileSync(file, 'utf8');

test('project lane 1 head generates the committed inventory and trunk before discovery had no generator', async () => {
	const steps: Step[] = [];
	try {
		const check = spawnSync(process.execPath, ['scripts/feature-inventory.ts', '--check'], { cwd: repo, encoding: 'utf8' });
		steps.push({ command: 'node scripts/feature-inventory.ts --check', exit: check.status, stdout: check.stdout, stderr: check.stderr });
		expect(check.status, check.stderr).toBe(0);
		const tracked = git('ls-files', 'apps', 'packages');
		const { discoverFeatures } = await import('../../../scripts/feature-discovery.ts');
		const rows = discoverFeatures(tracked.stdout.split('\n').filter(Boolean), (f) => read(path.join(repo, f)));
		const committed = JSON.parse(read(path.join(repo, 'agora/feature-inventory.json'))) as { features: unknown[] };
		expect(committed.features).toEqual(rows);
		const before = git('cat-file', '-e', `${FIRST_DISCOVERY}^:scripts/feature-discovery.ts`);
		const after = git('cat-file', '-e', `${FIRST_DISCOVERY}:scripts/feature-discovery.ts`);
		steps.push(before, after);
		expect(before.exit, 'the parent of the discovery commit has no generator').not.toBe(0);
		expect(after.exit, 'the discovery commit introduces it').toBe(0);
	} finally {
		save(1, steps);
	}
});

lane(2, 'a new Feature with both reserved files appears with no registration', ROOM, (s) => {
	s.run();
	s.put('apps/web/src/features/newcomer/entrypoint.ts');
	s.put('apps/web/src/features/newcomer/timeline-card.tsx');
	expect(s.run('--check').exit, 'not yet generated').toBe(1);
	expect(s.run().stdout).toMatch(/written/);
	const rows = (JSON.parse(read(s.inventory)) as { features: { name: string; timelineCard: string | null }[] }).features;
	expect(rows.map((r) => r.name)).toEqual(['newcomer', 'room']);
	expect(rows[0]?.timelineCard).toBe('apps/web/src/features/newcomer/timeline-card.tsx');
	expect(s.run('--check').exit).toBe(0);
});

lane(3, 'a Feature missing its entrypoint fails naming the missing reserved file', ['apps/web/src/features/notes/view.tsx'], (s) => {
	const r = s.run();
	expect(r.exit).toBe(1);
	expect(r.stderr).toBe(`apps/web/src/features/notes: missing reserved entrypoint.ts; supported owner is ${OWNER}\n`);
	expect(existsSync(s.inventory), 'nothing is written on rejection').toBe(false);
});

lane(4, 'Feature files outside src/features/<name>/ are rejected', ['apps/web/src/main.tsx', 'apps/web/src/room/entrypoint.ts', 'apps/web/src/components/features/room/timeline-card.tsx'], (s) => {
	const r = s.run();
	expect(r.exit).toBe(1);
	expect(r.stderr.trim().split('\n').sort()).toEqual([
		`apps/web/src/components/features/room/timeline-card.tsx: Feature file outside the conventional path; supported owner is apps/web, conventional path is ${OWNER}`,
		`apps/web/src/room/entrypoint.ts: Feature file outside the conventional path; supported owner is apps/web, conventional path is ${OWNER}`,
	]);
});

lane(5, 'a hand-edited inventory row is rejected as drift', ROOM, (s) => {
	s.run();
	writeFileSync(s.inventory, read(s.inventory).replace('"name": "room"', '"name": "forged"'));
	const r = s.run('--check');
	expect(r.exit).toBe(1);
	expect(r.stderr).toMatch(/agora\/feature-inventory\.json differs from the Feature directories on disk/);
});

lane(6, 'with drift detection disabled in an isolated copy the lane 5 assertion turns red', ROOM, (s) => {
	s.run();
	writeFileSync(s.inventory, read(s.inventory).replace('"name": "room"', '"name": "forged"'));
	expect(s.run('--check').exit, 'lane 5 assertion with the guard on').toBe(1);
	const script = path.join(s.dir, 'scripts/feature-inventory.ts');
	const weakened = read(script).replace('if (current !== text) throw new DiscoveryError', 'if (false) throw new DiscoveryError');
	expect(weakened).not.toBe(read(script));
	writeFileSync(script, weakened);
	const off = s.run('--check');
	expect(off.exit, 'the forged row now passes, so the guard is what rejected it').toBe(0);
	expect(off.stdout).toBe('feature inventory matches\n');
});

lane(7, 'removing a Feature directory drops it and leaves no stale reference', [...ROOM, 'apps/web/src/features/gone/entrypoint.ts'], (s) => {
	s.run();
	expect(read(s.inventory)).toMatch(/"name": "gone"/);
	rmSync(path.join(s.dir, 'apps/web/src/features/gone'), { recursive: true });
	expect(s.run('--check').exit, 'the inventory still lists it until regenerated').toBe(1);
	s.run();
	expect(read(s.inventory)).not.toMatch(/gone/);
	expect(s.run('--check').exit).toBe(0);
});

lane(8, 'two Features with the same declared name are rejected', [], async (s) => {
	const features = path.join(s.dir, 'apps/web/src/features');
	s.put('apps/web/src/features/Room/entrypoint.ts');
	s.put('apps/web/src/features/room/entrypoint.ts');
	if (readdirSync(features).length === 2) {
		const r = s.run();
		expect(r.exit).toBe(1);
		expect(r.stderr).toMatch(/duplicate Feature name, also declared by apps\/web\/src\/features\/Room/);
		return;
	}
	// A case-insensitive filesystem cannot hold Room and room side by side. This host feeds the generator's own file-list entry the same two paths.
	s.steps.push({ command: 'case-insensitive filesystem: real directories cannot collide here', exit: 0, stdout: readdirSync(features).join(','), stderr: '' });
	const { DiscoveryError, discoverFeatures } = await import('../../../scripts/feature-discovery.ts');
	const thrown = (() => {
		try {
			discoverFeatures(['apps/web/src/features/Room/entrypoint.ts', 'apps/web/src/features/room/entrypoint.ts'], () => '[]');
		} catch (error) {
			return error;
		}
	})();
	expect(thrown).toBeInstanceOf(DiscoveryError);
	expect((thrown as Error).message).toMatch(/duplicate Feature name, also declared by apps\/web\/src\/features\/Room/);
});

lane(9, 'rejection messages for a misplaced or missing reserved file name the supported owner and path', ['apps/web/src/features/notes/view.tsx', 'apps/web/src/room/timeline-card.tsx'], (s) => {
	const r = s.run();
	expect(r.exit).toBe(1);
	expect(r.stderr).toContain(`apps/web/src/features/notes: missing reserved entrypoint.ts; supported owner is ${OWNER}\n`);
	expect(r.stderr).toContain(`apps/web/src/room/timeline-card.tsx: Feature file outside the conventional path; supported owner is apps/web, conventional path is ${OWNER}\n`);
	expect(r.stderr, 'a message, not a stack trace').not.toMatch(/\bat \S+ \(|node:internal/);
});

lane(10, 'regenerating twice with no source change is a no-op with an identical digest', ROOM, (s) => {
	s.run();
	const first = read(s.inventory);
	const past = new Date('2020-01-01T00:00:00Z');
	utimesSync(s.inventory, past, past);
	const again = s.run();
	expect(again.stdout).toBe('feature inventory unchanged\n');
	expect(read(s.inventory)).toBe(first);
	expect(statSync(s.inventory).mtime.getTime(), 'the second run did not rewrite the file').toBe(past.getTime());
	const { digest, features } = JSON.parse(first) as { digest: string; features: unknown[] };
	expect(digest).toBe(`sha256:${createHash('sha256').update(JSON.stringify(features)).digest('hex')}`);
	expect((JSON.parse(read(s.inventory)) as { digest: string }).digest).toBe(digest);
});
