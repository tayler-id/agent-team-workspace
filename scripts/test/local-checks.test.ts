import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const sh = (cwd: string, file: string, args: string[]) => spawnSync(file, args, { cwd, encoding: 'utf8' });
const git = (cwd: string, ...args: string[]) => sh(cwd, 'git', args);
const tool = (cwd: string, ...args: string[]) => sh(cwd, process.execPath, ['scripts/local-checks.mjs', ...args]);
const gate = 'node -e "process.exit(require(\'fs\').readFileSync(\'flag.txt\',\'utf8\').trim()===\'ok\'?0:1)"';
const policy = (ids = ['gate', 'second']) => JSON.stringify({ schema_version: 'agora.local-checks/v1', protected_refs: ['refs/heads/main'], guard_files: ['scripts/local-checks.mjs', '.githooks/reference-transaction', 'agora/local-checks.json'], checks: ids.map(id => ({ id, command: gate })) });
const commit = (cwd: string, message: string) => { git(cwd, 'add', '-A'); assert.equal(git(cwd, 'commit', '-q', '-m', message).status, 0); return git(cwd, 'rev-parse', 'HEAD').stdout.trim(); };

// A throwaway repository on main with the real tool and hook, a two-check policy, hooks installed.
const made: string[] = [];
after(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });
const repo = () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'agora-lc-'));
	made.push(dir);
	git(dir, 'init', '-q', '-b', 'main');
	git(dir, 'config', 'user.email', 't@example.invalid');
	git(dir, 'config', 'user.name', 't');
	for (const dirName of ['scripts', '.githooks', 'agora']) mkdirSync(path.join(dir, dirName));
	copyFileSync(path.join(root, 'scripts/local-checks.mjs'), path.join(dir, 'scripts/local-checks.mjs'));
	copyFileSync(path.join(root, '.githooks/reference-transaction'), path.join(dir, '.githooks/reference-transaction'));
	spawnSync('chmod', ['+x', path.join(dir, '.githooks/reference-transaction')]);
	writeFileSync(path.join(dir, 'agora/local-checks.json'), policy());
	writeFileSync(path.join(dir, 'flag.txt'), 'ok\n');
	commit(dir, 'base');
	assert.equal(tool(dir, 'install').status, 0);
	return dir;
};
const branch = (dir: string, name: string, flag = 'ok') => { git(dir, 'checkout', '-q', '-b', name); writeFileSync(path.join(dir, 'flag.txt'), `${flag}\n`); writeFileSync(path.join(dir, 'candidate.txt'), `${name}\n`); return commit(dir, name); };
const land = (dir: string, name: string) => { git(dir, 'checkout', '-q', 'main'); return git(dir, 'merge', '--ff-only', name); };
const head = (dir: string) => git(dir, 'rev-parse', 'main').stdout.trim();
const refused = (result: { status: number | null; stderr: string }, pattern: RegExp) => { assert.notEqual(result.status, 0); assert.match(result.stderr, pattern); };

await test('status reports a missing hook and an installed one', () => {
	const dir = repo();
	git(dir, 'config', '--unset', 'core.hooksPath');
	refused(tool(dir, 'status'), /not installed/);
	tool(dir, 'install');
	assert.equal(tool(dir, 'status').status, 0);
	writeFileSync(path.join(dir, '.githooks/reference-transaction'), 'exit 0\n');
	refused(tool(dir, 'status'), /differs from this checkout/);
});

await test('landing with no receipt is refused and main does not move', () => {
	const dir = repo(); const before = head(dir);
	branch(dir, 'fm/a');
	refused(land(dir, 'fm/a'), /no receipt/);
	assert.equal(head(dir), before);
	refused(tool(dir, 'verify', 'fm/a'), /no receipt/);
});

await test('a green run lets the exact commit land', () => {
	const dir = repo(); const sha = branch(dir, 'fm/a');
	assert.equal(tool(dir, 'run').status, 0);
	assert.equal(tool(dir, 'verify', 'fm/a').status, 0);
	assert.equal(land(dir, 'fm/a').status, 0);
	assert.equal(head(dir), sha);
});

await test('a red check records a failing receipt and blocks landing', () => {
	const dir = repo(); const before = head(dir);
	branch(dir, 'fm/red', 'broken');
	refused(tool(dir, 'run'), /fail/);
	const receipt = JSON.parse(readFileSync(path.join(dir, '.git/agora-local-checks', `${git(dir, 'rev-parse', 'HEAD').stdout.trim()}.json`), 'utf8'));
	assert.equal(receipt.outcome, 'fail');
	assert.deepEqual(receipt.checks.map((c: { id: string }) => c.id), ['gate']);
	refused(land(dir, 'fm/red'), /is fail/);
	assert.equal(head(dir), before);
});

await test('any change to the candidate invalidates its receipt, including a content-identical rewrite', () => {
	const dir = repo(); const before = head(dir);
	branch(dir, 'fm/a');
	assert.equal(tool(dir, 'run').status, 0);
	git(dir, 'commit', '-q', '--amend', '--no-edit', '--date=2001-01-01T00:00:00');
	refused(tool(dir, 'verify', 'fm/a'), /no receipt/);
	refused(land(dir, 'fm/a'), /no receipt/);
	git(dir, 'checkout', '-q', 'fm/a'); writeFileSync(path.join(dir, 'extra.txt'), 'x\n'); commit(dir, 'more');
	refused(land(dir, 'fm/a'), /no receipt/);
	assert.equal(head(dir), before);
});

await test('run refuses a dirty worktree', () => {
	const dir = repo(); branch(dir, 'fm/a');
	writeFileSync(path.join(dir, 'untracked.txt'), 'x\n');
	refused(tool(dir, 'run'), /not clean/);
});

await test('a candidate cannot drop a check that main already requires', () => {
	const dir = repo(); const before = head(dir);
	git(dir, 'checkout', '-q', '-b', 'fm/weak');
	writeFileSync(path.join(dir, 'agora/local-checks.json'), policy(['gate']));
	commit(dir, 'weaker');
	assert.equal(tool(dir, 'run').status, 0);
	refused(land(dir, 'fm/weak'), /drops required check "second"/);
	assert.equal(head(dir), before);
});

await test('a candidate cannot delete the gate files', () => {
	const dir = repo(); const before = head(dir);
	git(dir, 'checkout', '-q', '-b', 'fm/strip');
	git(dir, 'rm', '-q', '.githooks/reference-transaction'); commit(dir, 'strip');
	refused(land(dir, 'fm/strip'), /removes guard file/);
	assert.equal(head(dir), before);
});

await test('a receipt missing a required check or naming another commit is rejected', () => {
	const dir = repo(); const sha = branch(dir, 'fm/a');
	tool(dir, 'run');
	const file = path.join(dir, '.git/agora-local-checks', `${sha}.json`);
	const receipt = JSON.parse(readFileSync(file, 'utf8'));
	writeFileSync(file, JSON.stringify({ ...receipt, checks: receipt.checks.slice(0, 1) }));
	refused(tool(dir, 'verify', 'fm/a'), /lacks a passing run of "second"/);
	writeFileSync(file, JSON.stringify({ ...receipt, commit: 'f'.repeat(40) }));
	refused(tool(dir, 'verify', 'fm/a'), /does not match/);
});

await test('direct commits on main are refused as well', () => {
	const dir = repo(); const before = head(dir);
	writeFileSync(path.join(dir, 'direct.txt'), 'x\n'); git(dir, 'add', '-A');
	refused(git(dir, 'commit', '-q', '-m', 'direct'), /no receipt/);
	assert.equal(head(dir), before);
});

await test('git update-ref cannot move main past the hook either', () => {
	const dir = repo(); const before = head(dir); const sha = branch(dir, 'fm/a');
	refused(git(dir, 'update-ref', 'refs/heads/main', sha), /REFUSED update of refs\/heads\/main/);
	assert.equal(head(dir), before);
});
