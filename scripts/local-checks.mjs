import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const POLICY = 'agora/local-checks.json';
const ZERO = /^0+$/;
const [command, ...rest] = process.argv.slice(2);
const flag = name => { const at = rest.indexOf(name); return at < 0 ? undefined : rest[at + 1]; };
const fail = message => { console.error(`local-checks: ${message}`); process.exit(1); };
const git = (...argv) => {
	const result = spawnSync('git', argv, { encoding: 'utf8' });
	return result.status === 0 ? result.stdout.trim() : undefined;
};
const receiptDir = () => resolve(git('rev-parse', '--git-common-dir') ?? fail('not a git repository'), 'agora-local-checks');
const policyAt = rev => {
	const text = git('show', `${rev}:${POLICY}`);
	return text === undefined ? undefined : JSON.parse(text);
};
const dirty = () => git('status', '--porcelain', '--untracked-files=all') !== '';

// Returns a refusal reason, or undefined when the exact commit has a complete passing receipt.
const refusal = (rev, base) => {
	const commit = git('rev-parse', '--verify', `${rev}^{commit}`);
	if (!commit) return `cannot resolve ${rev}`;
	const policy = policyAt(commit);
	if (!policy) return `${commit.slice(0, 12)} has no ${POLICY}`;
	const baseIds = (base && !ZERO.test(base) ? policyAt(base)?.checks.map(c => c.id) : undefined) ?? [];
	const baseGuards = (base && !ZERO.test(base) ? policyAt(base)?.guard_files : undefined) ?? [];
	for (const id of baseIds) if (!policy.checks.some(c => c.id === id)) return `candidate drops required check "${id}"; landing a weaker policy needs its own reviewed step`;
	for (const path of [...baseGuards, ...policy.guard_files]) if (git('cat-file', '-e', `${commit}:${path}`) === undefined) return `candidate removes guard file ${path}`;
	let receipt;
	try { receipt = JSON.parse(readFileSync(resolve(receiptDir(), `${commit}.json`), 'utf8')); }
	catch { return `no receipt for ${commit.slice(0, 12)}; run \`node scripts/local-checks.mjs run\` at that exact commit`; }
	if (receipt.commit !== commit || receipt.tree !== git('rev-parse', `${commit}^{tree}`)) return 'receipt does not match the candidate commit or tree';
	if (receipt.outcome !== 'pass') return `receipt for ${commit.slice(0, 12)} is ${receipt.outcome}`;
	for (const check of policy.checks) {
		const ran = receipt.checks.find(c => c.id === check.id);
		if (!ran || ran.exit_code !== 0 || ran.command !== check.command) return `receipt lacks a passing run of "${check.id}" (${check.command})`;
	}
};

if (command === 'run') {
	if (dirty()) fail('worktree is not clean; commit or remove changes so the receipt describes one exact commit');
	const commit = git('rev-parse', 'HEAD') ?? fail('no HEAD');
	const policy = policyAt(commit) ?? fail(`${POLICY} is not committed at HEAD`);
	mkdirSync(receiptDir(), { recursive: true });
	const file = resolve(receiptDir(), `${commit}.json`);
	rmSync(file, { force: true });
	const checks = [];
	let outcome = 'pass';
	for (const { id, command: line } of policy.checks) {
		console.error(`local-checks: ${id}: ${line}`);
		const started = Date.now();
		const result = spawnSync('bash', ['-c', line], { stdio: 'inherit' });
		checks.push({ id, command: line, exit_code: result.status ?? 1, seconds: Math.round((Date.now() - started) / 1000) });
		if (result.status !== 0) { outcome = 'fail'; break; }
	}
	if (outcome === 'pass' && (git('rev-parse', 'HEAD') !== commit || dirty())) outcome = 'changed-during-run';
	writeFileSync(file, `${JSON.stringify({ schema_version: 'agora.local-checks-receipt/v1', commit, tree: git('rev-parse', 'HEAD^{tree}'), outcome, node: process.version, checks }, null, '\t')}\n`);
	console.error(`local-checks: ${outcome} for ${commit}`);
	process.exit(outcome === 'pass' ? 0 : 1);
} else if (command === 'verify') {
	const reason = refusal(rest[0] ?? fail('usage: verify <rev> [--base <rev>]'), flag('--base') ?? 'main');
	if (reason) fail(`REFUSED: ${reason}`);
	console.log(`verified ${git('rev-parse', rest[0])}`);
} else if (command === 'hook') {
	for (const line of readFileSync(0, 'utf8').split('\n').filter(Boolean)) {
		const [old, next, ref] = line.split(' ');
		if (ZERO.test(next) || !(policyAt(old) ?? policyAt(next))?.protected_refs.includes(ref)) continue;
		const reason = refusal(next, old);
		if (reason) fail(`REFUSED update of ${ref}: ${reason}`);
	}
} else if (command === 'install') {
	// The hook and tool are copied out of the worktree so a landing that deletes or rewrites them cannot disable its own gate.
	const dir = resolve(receiptDir(), '../agora-hooks');
	mkdirSync(dir, { recursive: true });
	copyFileSync('.githooks/reference-transaction', resolve(dir, 'reference-transaction'));
	chmodSync(resolve(dir, 'reference-transaction'), 0o755);
	copyFileSync('scripts/local-checks.mjs', resolve(dir, 'local-checks.mjs'));
	if (git('config', 'core.hooksPath', dir) === undefined) fail('could not set core.hooksPath');
	console.log(`core.hooksPath=${dir}`);
} else if (command === 'status') {
	const dir = git('config', '--get', 'core.hooksPath');
	if (dir !== resolve(receiptDir(), '../agora-hooks')) fail('enforcement hook not installed; run `node scripts/local-checks.mjs install`');
	const same = (a, b) => { try { return readFileSync(a, 'utf8') === readFileSync(b, 'utf8'); } catch { return false; } };
	if (!same('.githooks/reference-transaction', resolve(dir, 'reference-transaction')) || !same('scripts/local-checks.mjs', resolve(dir, 'local-checks.mjs'))) fail('installed hook differs from this checkout; rerun `node scripts/local-checks.mjs install`');
	console.log('enforcement hook installed and current');
} else {
	fail('usage: run | verify <rev> [--base <rev>] | install | status');
}
