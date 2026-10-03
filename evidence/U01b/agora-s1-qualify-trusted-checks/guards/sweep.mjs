// Guard-negative sweep for U01b.B03. Each mutation weakens exactly one rule in a committed file, runs the
// owning tests, records whether they turned red, then restores the original bytes and checks the SHA-256
// before the next mutation. Refuses to start on a dirty tree. Run from the repository root:
//   node evidence/U01b/agora-s1-qualify-trusted-checks/guards/sweep.mjs > evidence/U01b/agora-s1-qualify-trusted-checks/guards/sweep.log
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...argv) => spawnSync('git', argv, { encoding: 'utf8' }).stdout.trim();
if (git('status', '--porcelain', '--', 'scripts', 'packages')) throw new Error('commit first: scripts/ or packages/ is dirty');
const mutations = [];
const checks = 'scripts/trusted-checks.mjs';
const lines = readFileSync(checks, 'utf8').split('\n');
lines.forEach((line, index) => {
	if (line.includes('denials.push(')) mutations.push({ file: checks, line: index + 1, from: 'denials.push(', to: 'void (', test: 'packages/verification/test/trusted-checks.test.ts' });
});
mutations.push({ file: checks, line: lines.findIndex(line => line.includes('!verify(null')) + 1, from: '!verify(null', to: 'false && !verify(null', test: 'packages/verification/test/trusted-checks.test.ts' });
mutations.push({ file: checks, line: lines.findIndex(line => line.includes("throw stop('plan_upgrade_required'")) + 1, from: "throw stop('plan_upgrade_required', 'blocked')", to: 'void 0', test: 'packages/verification/test/trusted-checks.test.ts' });
mutations.push({ file: checks, line: lines.findIndex(line => line.includes("throw stop('reporting_app_unenrolled'")) + 1, from: "throw stop('reporting_app_unenrolled', 'blocked')", to: 'void 0', test: 'packages/verification/test/trusted-checks.test.ts' });
const report = 'scripts/trusted-report.mjs';
const reportLines = readFileSync(report, 'utf8').split('\n');
for (const [from, to] of [
	["env: { PATH: process.env.PATH ?? '' }", 'env: process.env'],
	["permissions: { checks: 'write' }", 'permissions: {}'],
	["throw stop('reporting_credentials_missing', 'blocked')", 'void 0'],
	['await github(`${repo}/check-runs`, publish,', 'await github(`${repo}/check-runs`, read,'],
	["decision.outcome === 'pass' ? 'success' : 'failure'", "'success'"],
]) mutations.push({ file: report, line: reportLines.findIndex(line => line.includes(from)) + 1, from, to, test: 'packages/verification/test/trusted-report.test.ts' });

let failures = 0;
for (const mutation of mutations) {
	const original = readFileSync(mutation.file);
	const before = sha(original);
	const text = original.toString('utf8').split('\n');
	const target = text[mutation.line - 1];
	if (mutation.line < 1 || !target.includes(mutation.from)) throw new Error(`needle missing at ${mutation.file}:${mutation.line}`);
	text[mutation.line - 1] = target.replace(mutation.from, mutation.to);
	writeFileSync(mutation.file, text.join('\n'));
	let run;
	try {
		run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project', 'unit', mutation.test], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
	} finally {
		writeFileSync(mutation.file, original);
	}
	const restored = sha(readFileSync(mutation.file));
	if (restored !== before) throw new Error(`restore failed for ${mutation.file}`);
	const failed = [...(run.stdout + run.stderr).matchAll(/^\s+×\s+(.+?)\s+\d+ms$/gm)].map(match => match[1]);
	const red = run.status !== 0;
	if (!red) failures++;
	console.log(JSON.stringify({ file: mutation.file, line: mutation.line, mutated: text[mutation.line - 1].trim().slice(0, 160), exit: run.status, red, failed, sha_before: before, sha_restored: restored }));
}
const clean = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project', 'unit', 'packages/verification/test/trusted-checks.test.ts', 'packages/verification/test/trusted-report.test.ts'], { encoding: 'utf8' });
console.log(JSON.stringify({ restored_tree_exit: clean.status, mutations: mutations.length, survived: failures, head: git('rev-parse', 'HEAD') }));
process.exit(failures === 0 && clean.status === 0 ? 0 : 1);
