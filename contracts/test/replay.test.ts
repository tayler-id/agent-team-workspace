import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { runSwiftConsumer } from '../src/conform-cli.ts';

test('the existing Swift conformance driver independently reproduces each golden replay projection', () => {
	const path = new URL('../fixtures/replay.json', import.meta.url).pathname;
	const file = JSON.parse(readFileSync(path, 'utf8')) as { replays: { id: string; expected: unknown }[] };
	const run = runSwiftConsumer(path);
	expect(run.message ?? run.outcome).toBe('pass');
	const report = run.report as { replays?: { id: string; outcome: string; state: unknown }[] } | undefined;
	expect(report?.replays).toEqual(file.replays.map((v) => ({ id: v.id, outcome: 'pass', state: v.expected })));
	const cli = spawnSync(process.execPath, ['scripts/drive-client-core.ts', '--json', '--swift'], { encoding: 'utf8' });
	expect(cli.status, cli.stderr).toBe(0);
	expect(JSON.parse(cli.stdout)).toMatchObject({ outcome: 'pass', swift: { outcome: 'pass' } });
});
