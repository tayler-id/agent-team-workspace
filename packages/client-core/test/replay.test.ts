import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import type { ReplayCorpus } from './replay-corpus.ts';
import type { ReplayReport } from './replay-probe.ts';

// The probe is driven through its CLI with literal expectations, so this suite loads and fails on assertions even where the probe does not exist.
const probe = path.join(import.meta.dirname, 'replay-probe.ts');
const drive = (...args: string[]) => {
	const child = spawnSync(process.execPath, [probe, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	let json: unknown;
	try { json = JSON.parse(child.stdout); } catch { json = undefined; }
	return { status: child.status, json, stderr: child.stderr };
};
const run = (...args: string[]) => { const r = drive(...args); return { ...r, json: r.json as ReplayReport | undefined }; };
// A missing probe gives json undefined; the optional chains below turn that into an assertion failure, not a crash.
const corpus = (seed?: string) => { const r = drive(...(seed ? [seed] : []), '--corpus'); return { ...r, json: r.json as ReplayCorpus | undefined }; };

test('the corpus is versioned, seeded and byte-identical per seed', () => {
	const first = corpus();
	expect(first.status, first.stderr).toBe(0);
	expect([first.json?.version, first.json?.seed]).toEqual(['agora.replay-corpus/v1', 6221057]);
	expect(JSON.stringify(corpus().json)).toBe(JSON.stringify(first.json));
	expect(JSON.stringify(corpus('6221058').json)).not.toBe(JSON.stringify(first.json));
});

test('it holds 1000 missed events, 100 arrivals and long code and Markdown bodies within the 4096 wire limit', () => {
	const { json } = corpus();
	expect(json?.snapshot.messages).toHaveLength(200);
	expect(json?.expectedIds).toHaveLength(1300);
	expect(new Set(json?.expectedIds).size).toBe(1300);
	const bodies = json?.expectedBodies ?? [];
	const sizes = bodies.map((b) => Array.from(b).length);
	expect(Math.max(...sizes)).toBeLessThanOrEqual(4096);
	expect(sizes.filter((n) => n >= 2000).length).toBeGreaterThan(325);
	expect(bodies.filter((b) => b.includes('```')).length).toBeGreaterThan(650);
	expect(bodies.some((b) => b.includes('| seq | state |'))).toBe(true);
});

test('it invents no unpublished shape: only revision-1 visible messages, no run cards', () => {
	const { json } = corpus();
	expect(json?.inputs.length).toBeGreaterThan(1100);
	for (const event of json?.inputs ?? []) expect([event.change.type, event.change.type === 'message' && event.change.message.revision, event.change.type === 'message' && event.change.message.content.tag]).toEqual(['message', '1', 'visible']);
	expect(json?.snapshot.runs).toEqual([]);
});

test('the real client core converges in order with zero duplicates inside two seconds', () => {
	const { status, json, stderr } = run();
	expect(stderr).toBe('');
	expect(json?.failures).toEqual([]);
	expect(status).toBe(0);
	expect(json).toMatchObject({ outcome: 'pass', order: 'converged', budgetMs: 2000, counts: { history: 200, messages: 1300, unique: 1300, duplicates: 0 }, acknowledgements: { strictlyIncreasing: true, last: '1300' } });
	expect(json?.elapsedMs).toBeLessThan(2000);
	expect(json?.counts.delivered).toBeGreaterThan(1100);
	expect(json?.coverage.unavailable.map((u) => u.shape)).toEqual(['thread', 'edit', 'tombstone', 'run-card']);
});

test('the predicate fails a core that exceeds the budget, whatever else it does right', () => {
	const slow = run('--budget', '-1');
	expect(slow.status).toBe(1);
	expect(slow.json?.outcome).toBe('fail');
	expect(slow.json?.failures.join()).toContain('exceeds the -1 ms budget');
});

// Isolated negative: the same predicate against a copy of the real core whose duplicate suppression is removed.
// The unmutated copy must pass first, so the red comes from the dedupe and not the harness.
test('removing duplicate suppression from an isolated core copy turns the predicate red, and the pristine copy stays green', () => {
	const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
	const guard = 'compare(input.seq, room.cursor) <= 0 || room.pending.some((e) => e.seq === input.seq)';
	expect(source.split(guard).length, 'the dedupe guard is unique').toBe(2);
	const dir = mkdtempSync(path.join(tmpdir(), 'agora-replay-dedupe-'));
	try {
		const withCore = (name: string, text: string) => { const file = path.join(dir, name); writeFileSync(file, text); return run('--core', file); };
		const pristine = withCore('pristine.mts', source);
		expect(pristine.json?.outcome, pristine.stderr).toBe('pass');
		const broken = withCore('broken.mts', source.replace(guard, 'false'));
		expect(broken.status).toBe(1);
		expect(broken.json?.failures).toEqual(expect.arrayContaining(['mode resync', 'message order or membership diverged', 'core demanded a new snapshot or upgrade']));
	} finally { rmSync(dir, { recursive: true, force: true }); }
});
