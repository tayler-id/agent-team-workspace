import { spawnSync } from 'node:child_process';
import { expect, test } from 'vitest';

const run = (value: unknown): string[] => {
	const script = `import {assess} from './scripts/foundation-policy.mjs'; console.log(JSON.stringify(assess(${JSON.stringify(value)})))`;
	const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
	expect(result.status, result.stderr).toBe(0);
	return JSON.parse(result.stdout) as string[];
};
const valid = () => ({
	parent: 'a'.repeat(40), head: 'b'.repeat(40), scope: 'task', applicability: 'behavior',
	records: ['red', 'green', 'guard', 'bootstrap', 'contracts', 'client', 'documentation', 'static'].map(id => ({ id, subject: id, revision: id === 'red' ? 'a'.repeat(40) : 'b'.repeat(40), verified: true })),
	mapped: true, prerequisites: true,
});

test('baseline admission driver accepts a complete task', () => { expect(run(valid())).toEqual([]); });
test('FG01.red-required', () => {
	const value = valid(); value.records = value.records.filter(record => record.id !== 'red');
	expect(run(value)).toContain('red_missing');
});
test.each([
	['green', 'green_missing'], ['guard', 'guard_missing'], ['client', 'client_missing'],
])('missing %s denies with %s', (id, code) => {
	const value = valid(); value.records = value.records.filter(record => record.id !== id);
	expect(run(value)).toContain(code);
});
test('forged or stale proof cannot pass', () => {
	const value = valid(); value.records[0] = { id: 'red', subject: 'red', revision: value.head, verified: false };
	expect(run(value)).toEqual(expect.arrayContaining(['red_revision', 'red_unverified']));
});
test('unknown proof and duplicate subjects deny', () => {
	const value = valid(); value.records.push({ id: 'FG99', subject: 'red', revision: value.head, verified: true });
	expect(run(value)).toEqual(expect.arrayContaining(['proof_unknown', 'subject_duplicate']));
});
test('applicability cannot waive behavioral tests', () => {
	const value = valid(); value.applicability = 'prose';
	expect(run(value)).toContain('applicability_invalid');
});
test('semantic prerequisite and feature mapping are required', () => {
	const value = valid(); value.mapped = false; value.prerequisites = false;
	expect(run(value)).toEqual(expect.arrayContaining(['feature_map_drift', 'prerequisite_unmet']));
});
test('task success is not foundation or feature admission', () => {
	const value = valid(); value.scope = 'feature';
	expect(run(value)).toEqual(expect.arrayContaining(['FG04_missing', 'FG05_missing', 'FG06_missing', 'FG07_missing', 'FG08_missing', 'feature_premature']));
});
