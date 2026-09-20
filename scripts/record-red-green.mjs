// Records R22 red/green receipts: applies the head's test patch to the parent revision in a throwaway
// worktree, runs the test command there (red), then runs the same command at the head (green).
// Usage: node scripts/record-red-green.mjs --parent SHA --head SHA --out DIR [-- test command...]
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const parent = option('--parent');
const head = option('--head');
const out = option('--out');
const command = args.includes('--') ? args.slice(args.indexOf('--') + 1) : ['pnpm', '-s', 'test'];
if (!parent || !head || !out) {
	console.error('usage: node scripts/record-red-green.mjs --parent SHA --head SHA --out DIR [-- test command...]');
	process.exit(64);
}

const git = (...argv) => {
	const result = spawnSync('git', argv, { encoding: 'utf8' });
	if (result.status !== 0) throw new Error(`git ${argv.join(' ')} failed: ${result.stderr}`);
	return result.stdout;
};
const sha256 = (text) => `sha256:${createHash('sha256').update(text).digest('hex')}`;
const version = (file, argv) => spawnSync(file, argv, { encoding: 'utf8' }).stdout.trim();
// Golden contract vectors are test inputs, so they travel with the test patch.
const isTestPath = (file) => /(^|\/)test\/.*\.test\.ts$/.test(file) || /(^|\/)test\/.*\.pg\.test\.ts$/.test(file) || /^contracts\/fixtures\//.test(file);

const parentSha = git('rev-parse', '--verify', `${parent}^{commit}`).trim();
const headSha = git('rev-parse', '--verify', `${head}^{commit}`).trim();
const changedFiles = git('diff', '--name-only', parentSha, headSha).split('\n').filter(Boolean);
const testFiles = changedFiles.filter(isTestPath);
const testPatch = git('diff', parentSha, headSha, '--', ...testFiles);
const atHead = (file) => spawnSync('git', ['cat-file', '-e', `${headSha}:${file}`]).status === 0;
const fixtureIdentity = {
	migration_journal: sha256(git('show', `${headSha}:packages/storage/drizzle/meta/_journal.json`)),
	migration_sql: changedFiles.filter((f) => f.endsWith('.sql') && atHead(f)).map((f) => ({ file: f, digest: sha256(git('show', `${headSha}:${f}`)) })),
	contract_schemas: changedFiles.filter((f) => f.startsWith('contracts/') && !f.startsWith('contracts/generated/') && !f.includes('/Generated/') && atHead(f)).map((f) => ({ file: f, digest: sha256(git('show', `${headSha}:${f}`)) })),
};
const toolchain = {
	node: version('node', ['--version']),
	pnpm: version('pnpm', ['--version']),
	postgres: version('pg_ctl', ['--version']),
	host: `${os.platform()} ${os.release()} ${os.arch()}`,
};
const configuration = {
	command: command.join(' '),
	vitest_config: sha256(git('show', `${headSha}:vitest.config.ts`)),
	tsconfig_base: sha256(git('show', `${headSha}:tsconfig.base.json`)),
	lockfile: sha256(git('show', `${headSha}:pnpm-lock.yaml`)),
};

function runAt(sha, label, applyPatch) {
	const dir = mkdtempSync(path.join(os.tmpdir(), `agora-${label}-`));
	git('worktree', 'add', '--detach', dir, sha);
	try {
		if (applyPatch) {
			for (const file of testFiles) {
				const content = spawnSync('git', ['show', `${headSha}:${file}`], { encoding: 'utf8' });
				if (content.status !== 0) continue;
				mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
				writeFileSync(path.join(dir, file), content.stdout);
			}
		}
		const install = spawnSync('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], { cwd: dir, encoding: 'utf8' });
		if (install.status !== 0) throw new Error(`install failed at ${sha}: ${install.stderr}`);
		const run = spawnSync(command[0], command.slice(1), { cwd: dir, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
		return { exit: run.status, output: `${run.stdout}${run.stderr}` };
	} finally {
		git('worktree', 'remove', '--force', dir);
		rmSync(dir, { recursive: true, force: true });
		// SwiftPM keeps its build-directory lock files under the temp root, named after the build path; they belong to this worktree.
		for (const entry of readdirSync(os.tmpdir())) if (entry.includes(path.basename(dir)) && entry.endsWith('.lock')) rmSync(path.join(os.tmpdir(), entry), { force: true });
	}
}

mkdirSync(out, { recursive: true });
const header = (label, subject, applied) => [
	`# ${label}.log (agora.red-green/v1)`,
	`recorded_at: ${new Date().toISOString()}`,
	`parent: ${parentSha}`,
	`head: ${headSha}`,
	`subject_revision: ${subject}`,
	`test_patch_applied_to_subject: ${applied}`,
	`test_patch_files: ${testFiles.join(', ')}`,
	`test_patch_digest: ${sha256(testPatch)}`,
	`fixture: ${JSON.stringify(fixtureIdentity)}`,
	`configuration: ${JSON.stringify(configuration)}`,
	`toolchain: ${JSON.stringify(toolchain)}`,
	'',
].join('\n');

const red = runAt(parentSha, 'red', true);
const green = runAt(headSha, 'green', false);
writeFileSync(path.join(out, 'red.log'), `${header('red', parentSha, true)}expected: the head's behavioral assertions fail against the parent behavior (nonzero exit)\nobserved_exit: ${red.exit}\n\n${red.output}`);
writeFileSync(path.join(out, 'green.log'), `${header('green', headSha, false)}expected: every assertion passes at the head (exit 0)\nobserved_exit: ${green.exit}\n\n${green.output}`);
writeFileSync(path.join(out, 'test-patch.diff'), testPatch);
const outcome = red.exit !== 0 && green.exit === 0 ? 'pass' : 'fail';
console.log(JSON.stringify({ schema_version: 'agora.red-green/v1', outcome, parent: parentSha, head: headSha, red_exit: red.exit, green_exit: green.exit, test_patch_digest: sha256(testPatch), out }));
process.exit(outcome === 'pass' ? 0 : 1);
