import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');
const validator = readFileSync(path.join(root, 'docs/site/validate.mjs'), 'utf8');
const assertions = readFileSync(path.join(import.meta.dirname, 'guards.test.ts'), 'utf8');
for (const marker of ['private path', ': section', ': visual', ': link', ': source', 'snapshot revision', 'invalid status', 'Built proof', 'milestone coverage', 'milestone outcome drift', ': outcome', ': stage', 'inventory missing', 'feature documentation']) {
	test(`disabling only the ${marker} guard makes its behavioral assertion fail`, () => {
		const dir = mkdtempSync(path.join(root, '.scratch-docs-guard-'));
		try {
			mkdirSync(path.join(dir, 'test'));
			const lines = validator.split('\n');
			const index = lines.findIndex(line => line.includes('errors.push') && line.includes(marker));
			assert.notEqual(index, -1, `guard marker exists: ${marker}`);
			lines[index] = lines[index].replace('errors.push(', 'void (');
			writeFileSync(path.join(dir, 'validate.mjs'), lines.join('\n'));
			writeFileSync(path.join(dir, 'test/guards.test.ts'), assertions);
			const env = { ...process.env };
			delete env.NODE_TEST_CONTEXT;
			const run = spawnSync(process.execPath, ['--test', path.join(dir, 'test/guards.test.ts')], { encoding: 'utf8', env });
			assert.equal(run.status, 1, run.stdout + run.stderr);
			assert.match(run.stdout + run.stderr, /must reject/);
			assert.doesNotMatch(run.stdout + run.stderr, /SyntaxError|ERR_MODULE_NOT_FOUND/);
		} finally { rmSync(dir, { recursive: true, force: true }); }
	});
}
