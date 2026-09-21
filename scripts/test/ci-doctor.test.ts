import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

await test('doctor public help baseline', () => {
	const result = spawnSync(process.execPath, ['scripts/ci-doctor.mjs', '--help'], { encoding: 'utf8' });
	assert.equal(result.status, 0);
	assert.match(result.stdout, /read-only Node\/pnpm\/Rolldown prerequisites/);
});
