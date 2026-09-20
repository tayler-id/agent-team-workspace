import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const task = 'agora-s1-enforce-test-first';
export const testFile = 'packages/verification/test/admission.test.ts';
export const policyFile = 'scripts/foundation-policy.mjs';
export const command = ['bash', '-c', `pnpm exec vitest run --project unit ${testFile} --reporter=json --outputFile=.scratch/admission.json >/dev/null; s=$?; node -e 'process.stdout.write(require("node:fs").readFileSync(".scratch/admission.json"))'; exit $s`];
export const hash = value => `sha256:${createHash('sha256').update(value).digest('hex')}`;
export function run(argv, cwd = process.cwd()) {
	const result = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', timeout: 600_000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
	if (result.error || result.signal) throw new Error('probe_infrastructure');
	return { exit: result.status, output: `${result.stdout}${result.stderr}` };
}
export function git(...argv) {
	const result = run(['git', ...argv]);
	if (result.exit !== 0) throw new Error('revision_unavailable');
	return result.output.trim();
}
export function scratch() { mkdirSync('.scratch', { recursive: true }); return mkdtempSync(path.resolve('.scratch/foundation-')); }
export function withCopy(head, action) {
	const copy = scratch();
	try {
		git('worktree', 'add', '--detach', copy, head);
		if (run(['pnpm', 'install', '--frozen-lockfile', '--prefer-offline'], copy).exit !== 0) throw new Error('install_blocked');
		const files = git('ls-tree', '-r', '--name-only', head).split('\n');
		const digest = () => hash(files.map(file => `${file}:${hash(readFileSync(path.join(copy, file)))}`).join('\n'));
		const before = digest();
		const result = action(copy);
		if (before !== digest()) throw new Error('source_mutation');
		return result;
	} finally {
		try { git('worktree', 'remove', '--force', copy); } finally { rmSync(copy, { recursive: true, force: true }); }
	}
}
export function assertions(document) {
	if (!Array.isArray(document.testResults) || !document.testResults.length) throw new Error('assertions_missing');
	const rows = document.testResults.flatMap(suite => suite.assertionResults);
	if (!rows.length || rows.length !== document.numTotalTests || new Set(rows.map(row => row.fullName)).size !== rows.length) throw new Error('assertions_invalid');
	return rows.map(row => ({ subject: row.fullName, status: row.status, cause: row.failureMessages.map(message => message.split('\n')[0]).join('\n') })).sort((a, b) => a.subject.localeCompare(b.subject));
}
export function behavior(rows, red) {
	return rows.some(row => row.subject === 'baseline admission driver accepts a complete task' && row.status === 'passed') &&
		rows.some(row => row.subject === 'FG01.red-required' && (red ? row.status === 'failed' && row.cause === "AssertionError: expected [] to include 'red_missing'" : row.status === 'passed')) &&
		rows.every(row => row.status === 'passed' || (red && row.status === 'failed' && row.cause.startsWith('AssertionError:')));
}
export function receipt(text, label) {
	const marker = /observed_exit: ([01])\n\n/.exec(text);
	if (!marker) throw new Error(`${label}_malformed`);
	const header = Object.fromEntries(text.slice(0, marker.index).split('\n').filter(line => line.includes(': ')).map(line => { const i = line.indexOf(': '); return [line.slice(0, i), line.slice(i + 2)]; }));
	delete header.recorded_at;
	const rows = assertions(JSON.parse(text.slice(marker.index + marker[0].length)));
	if (Number(marker[1]) !== (label === 'red' ? 1 : 0) || !behavior(rows, label === 'red')) throw new Error(`${label}_assertion`);
	return { header, rows };
}
export function compareReceipts(retained, fresh, parent, head) {
	const denials = [];
	for (const label of ['red', 'green']) {
		try {
			const file = path.join(retained, `${label}.log`);
			if (!existsSync(file)) { denials.push(`${label}_missing`); continue; }
			const actual = receipt(readFileSync(file, 'utf8'), label);
			const expected = receipt(readFileSync(path.join(fresh, `${label}.log`), 'utf8'), label);
			if (actual.header.parent !== parent || actual.header.head !== head || actual.header.subject_revision !== (label === 'red' ? parent : head)) denials.push(`${label}_revision`);
			if (JSON.stringify(actual) !== JSON.stringify(expected)) denials.push(`${label}_replay_mismatch`);
		} catch { denials.push(`${label}_malformed`); }
	}
	try { if (hash(readFileSync(path.join(retained, 'test-patch.diff'))) !== hash(readFileSync(path.join(fresh, 'test-patch.diff')))) denials.push('test_patch_mismatch'); }
	catch { denials.push('test_patch_missing'); }
	return denials;
}
export function compareGuard(retained, fresh) {
	try {
		const value = JSON.parse(retained);
		if (!value || value.id !== 'red-required' || value.cleanup !== 'removed' || !behavior(value.normal, false) || !behavior(value.weakened, true)) return ['guard_invalid'];
		return JSON.stringify(value) === JSON.stringify(fresh) ? [] : ['guard_replay_mismatch'];
	} catch { return ['guard_missing_or_malformed']; }
}
export function replay(parent, head, out) {
	const result = run(['node', 'scripts/record-red-green.mjs', '--parent', parent, '--head', head, '--out', out, '--', ...command]);
	if (result.exit !== 0) throw new Error('red_green_replay_failed');
	for (const label of ['red', 'green']) receipt(readFileSync(path.join(out, `${label}.log`), 'utf8'), label);
}
export function guard(head) {
	return withCopy(head, copy => {
		const file = path.join(copy, policyFile);
		const original = readFileSync(file, 'utf8');
		const before = 'if (!records.some(record => record.id === id))';
		const after = "if (id !== 'red' && !records.some(record => record.id === id))";
		if (original.split(before).length !== 2) throw new Error('guard_mutation_invalid');
		const normal = run(command, copy);
		let weakened;
		try { writeFileSync(file, original.replace(before, after)); weakened = run(command, copy); }
		finally { writeFileSync(file, original); }
		const normalRows = assertions(JSON.parse(normal.output));
		const weakenedRows = assertions(JSON.parse(weakened.output));
		if (normal.exit !== 0 || !behavior(normalRows, false) || weakened.exit !== 1 || !behavior(weakenedRows, true) || weakenedRows.filter(row => row.status === 'failed').length !== 1) throw new Error('guard_ineffective');
		return { id: 'red-required', head, source: hash(original), test: hash(readFileSync(path.join(copy, testFile))), before, after, normal: normalRows, weakened: weakenedRows, cleanup: 'removed' };
	});
}
