import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { runSwiftConsumer } from '../src/conform-cli.ts';
import { runTypeScriptConsumer, type VectorFile } from '../src/conformance.ts';

const probe: VectorFile = { schema_version: 'agora.contract-vectors/v1', vectors: [{ id: 'probe', component: 'HealthReport', wire: '{}', expect: 'reject' }] };

test('the conformance drivers start: each consumer answers a vector file with a report envelope', () => {
	const typescript = runTypeScriptConsumer(probe);
	expect(typescript).toMatchObject({ schema_version: 'agora.contract-conformance/v1', consumer: 'typescript' });
	expect(typescript.vectors.map((v) => v.id)).toEqual(['probe']);
	const dir = mkdtempSync(path.join(os.tmpdir(), 'agora-harness-'));
	try {
		const file = path.join(dir, 'vectors.json');
		writeFileSync(file, JSON.stringify(probe));
		const swift = runSwiftConsumer(file);
		expect(swift.message ?? swift.outcome).toBe('pass');
		expect(swift.report).toMatchObject({ schema_version: 'agora.contract-conformance/v1', consumer: 'swift' });
		expect(swift.report?.vectors.map((v) => v.id)).toEqual(['probe']);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('the generation driver starts and prints a machine-readable run report', () => {
	const run = spawnSync(process.execPath, ['contracts/tools/generate.mjs', '--check'], { cwd: path.resolve(import.meta.dirname, '..', '..'), encoding: 'utf8' });
	expect(JSON.parse(run.stdout.trim().split('\n').at(-1) ?? '{}')).toMatchObject({ schema_version: 'agora.contract-generation-run/v1', mode: 'check' });
});
