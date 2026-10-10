import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as core from '@agora/client-core';
import { expect, test } from 'vitest';
import { ARRIVING, BODY_LIMIT, buildCorpus, CORPUS_VERSION, DEFAULT_SEED, HISTORY, MISSED, UNAVAILABLE } from './replay-corpus.ts';
import { BUDGET_MS, runReplay, type ReplayReport } from './replay-probe.ts';

test('the corpus is versioned, seeded and byte-identical per seed', () => {
	const corpus = buildCorpus();
	expect([corpus.version, corpus.seed]).toEqual([CORPUS_VERSION, DEFAULT_SEED]);
	expect(CORPUS_VERSION).toBe('agora.replay-corpus/v1');
	expect(JSON.stringify(buildCorpus())).toBe(JSON.stringify(corpus));
	expect(JSON.stringify(buildCorpus(DEFAULT_SEED + 1))).not.toBe(JSON.stringify(corpus));
});

test('it holds 1000 missed events, 100 arrivals and long code and Markdown bodies within the 4096 wire limit', () => {
	const corpus = buildCorpus();
	expect(corpus.snapshot.messages).toHaveLength(HISTORY);
	expect(corpus.expectedIds).toHaveLength(HISTORY + MISSED + ARRIVING);
	expect(new Set(corpus.expectedIds).size).toBe(corpus.expectedIds.length);
	const sizes = corpus.expectedBodies.map((b) => Array.from(b).length);
	expect(Math.max(...sizes)).toBeLessThanOrEqual(BODY_LIMIT);
	expect(sizes.filter((n) => n >= 2000).length).toBeGreaterThan(corpus.expectedBodies.length / 4);
	expect(corpus.expectedBodies.filter((b) => b.includes('```')).length).toBeGreaterThan(corpus.expectedBodies.length / 2);
	expect(corpus.expectedBodies.some((b) => b.includes('| seq | state |'))).toBe(true);
});

test('it invents no unpublished shape: only revision-1 visible messages, no run cards', () => {
	const corpus = buildCorpus();
	for (const event of corpus.inputs) {
		expect(event.change.type).toBe('message');
		if (event.change.type === 'message') expect([event.change.message.revision, event.change.message.content.tag]).toEqual(['1', 'visible']);
	}
	expect(corpus.snapshot.runs).toEqual([]);
	expect(UNAVAILABLE.map((u) => u.shape)).toEqual(['thread', 'edit', 'tombstone', 'run-card']);
});

test('the real client core converges in order with zero duplicates inside two seconds', () => {
	const report = runReplay(core);
	expect(report.failures).toEqual([]);
	expect(report).toMatchObject({ outcome: 'pass', order: 'converged', budgetMs: 2000, counts: { history: 200, messages: 1300, unique: 1300, duplicates: 0 }, acknowledgements: { strictlyIncreasing: true, last: '1300' } });
	expect(BUDGET_MS).toBe(2000);
	expect(report.elapsedMs).toBeLessThan(BUDGET_MS);
	expect(report.counts.delivered).toBeGreaterThan(MISSED + ARRIVING);
	expect(report.coverage.unavailable).toBe(UNAVAILABLE);
});

test('the predicate fails a core that exceeds the budget, whatever else it does right', () => {
	const slow = runReplay(core, buildCorpus(), -1);
	expect(slow.outcome).toBe('fail');
	expect(slow.failures.join()).toContain('exceeds the -1 ms budget');
});

// Isolated negative: the same predicate, run in a child process against a copy of the real core whose duplicate
// suppression is removed. The unmutated copy must pass first, so the red comes from the dedupe and not the harness.
test('removing duplicate suppression from an isolated core copy turns the predicate red, and the pristine copy stays green', () => {
	const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
	const guard = 'compare(input.seq, room.cursor) <= 0 || room.pending.some((e) => e.seq === input.seq)';
	expect(source.split(guard).length, 'the dedupe guard is unique').toBe(2);
	const dir = mkdtempSync(path.join(tmpdir(), 'agora-replay-dedupe-'));
	try {
		const run = (text: string): ReplayReport => {
			const file = path.join(dir, 'core.mts');
			writeFileSync(file, text);
			const url = (name: string): string => JSON.stringify(pathToFileURL(path.join(import.meta.dirname, name)).href);
			const script = `import*as core from ${JSON.stringify(pathToFileURL(file).href)};import{buildCorpus}from ${url('replay-corpus.ts')};import{runReplay}from ${url('replay-probe.ts')};process.stdout.write(JSON.stringify(runReplay(core,buildCorpus())))`;
			const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
			expect(child.status, child.stderr).toBe(0);
			return JSON.parse(child.stdout) as ReplayReport;
		};
		expect(run(source).outcome).toBe('pass');
		const broken = run(source.replace(guard, 'false'));
		expect(broken.outcome).toBe('fail');
		expect(broken.failures).toEqual(expect.arrayContaining(['mode resync', 'message order or membership diverged', 'core demanded a new snapshot or upgrade']));
	} finally { rmSync(dir, { recursive: true, force: true }); }
});
