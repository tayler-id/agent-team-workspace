import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const workspace = path.join(root, '.scratch', 'design-check-tests');
fs.mkdirSync(workspace, { recursive: true });
const runRoot = fs.mkdtempSync(path.join(workspace, 'run-'));
const change = (file, mutate) => ({ file, mutate });
const task = (text, name, mutate) => text.replace(new RegExp(`(^### ${name}\\n)([\\s\\S]*?)(?=^### |^## )`, 'm'), (_, title, body) => title + mutate(body));
const unit = (text, id, mutate) => text.replace(new RegExp(`(^## .+ \\(${id}\\)\\n)([\\s\\S]*?)(?=^## )`, 'm'), (_, title, body) => title + mutate(body));
const cases = [
	{ name: 'baseline', changes: [], expected: 0 },
	{ name: 'independent-reviewer-without-model-literal', changes: [change('docs/implementation-plan.md', t => t.replaceAll('grok-4.6-fast-xhigh', 'approved-independent-reviewer'))], expected: 0 },
	{ name: 'missing-requirement', changes: [change('docs/task-breakdown.md', t => t.replace('- Specification requirements: R03', '- Specification requirements: R99'))], reason: 'unknown requirement R99' },
	{ name: 'dependency-cycle', changes: [change('docs/task-breakdown.md', t => t.replace('- Prerequisites: None.', '- Prerequisites: `agora-s1-bootstrap-repository`.'))], reason: 'combined task/milestone cycle' },
	{ name: 'missing-live-scenario', changes: [change('docs/technical-spec.md', t => t.replace('LV01.', 'Scenario one.'))], reason: 'no live scenario' },
	{ name: 'broken-local-link', changes: [change('AGENTS.md', t => `${t}\n[Missing](docs/absent-design.md)\n`)], reason: 'missing link' },
	{ name: 'placeholder', changes: [change('docs/technical-spec.md', t => `${t}\nTODO\n`)], reason: 'unresolved placeholder' },
	{ name: 'long-dash', changes: [change('docs/technical-spec.md', t => `${t}\n${String.fromCodePoint(0x2014)}\n`)], reason: 'long dash' },
	{ name: 'unofficial-skill', changes: [change('skills-lock.json', t => t.replace('cursor/plugins', 'unofficial/port'))], reason: 'cursor/plugins' },
	{ name: 'missing-decision-evidence', changes: [change('docs/decisions.tsv', t => `${t}2026-09-20T00:00:00Z\ttest\tfixture\tnegative\tabsent-lock.json\treject\n`)], reason: 'missing link' },
	{ name: 'historical-decision-rewrite', changes: [change('docs/decisions.tsv', t => t.replace('D01 Retain', 'D01 Replace'))], reason: 'append-only decision baseline changed' },
	{ name: 'outcome-build-mismatch', changes: [change('docs/task-breakdown.md', t => t.replace(/^- Outcome: .+$/m, '- Outcome: Publish an unrelated unverified result.'))], reason: 'Outcome-to-Build mismatch' },
	{ name: 'deleted-build-outcome', changes: [change('docs/implementation-plan.md', t => t.replace(/^- \[ \] `U01a\.B01` .+\n/m, ''))], reason: 'unknown or foreign Build box' },
	{ name: 'unowned-build-outcome', changes: [change('docs/implementation-plan.md', t => t.replace('**Build.**\n', '**Build.**\n\n- [ ] `U01a.B99` Add unowned behavior.\n'))], reason: 'Build must have exactly one task owner' },
	{ name: 'duplicate-build-owner', changes: [change('docs/task-breakdown.md', t => {
		const outcome = t.match(/^- Outcome: (.+)$/m)[1];
		return task(t, 'agora-s1-publish-portable-contracts', b => b.replace('U01a.B02', 'U01a.B01').replace(/^- Outcome: .+$/m, `- Outcome: ${outcome}`));
	})], reason: 'Build must have exactly one task owner' },
	{ name: 'own-milestone-deadlock', changes: [change('docs/task-breakdown.md', t => t.replace('- Unit gates: None.', '- Unit gates: U01a.'))], reason: 'task waits for its own milestone' },
	{ name: 'milestone-close-gate', changes: [change('docs/task-breakdown.md', t => t.replace('- Close gate: task.', '- Close gate: milestone.'))], reason: 'task must close on its own gate' },
	{ name: 'missing-foundation-proof', changes: [change('docs/implementation-plan.md', t => t.replace('Foundation proofs. FG01, FG02, FG03.', 'Foundation proofs. FG01, FG02.'))], reason: 'missing foundation proof' },
	{ name: 'foundation-proof-in-dependent-feature', changes: [
		change('docs/technical-spec.md', t => t.replace(/^(\| FG05 \| .+ \| )U01b( \|)$/m, '$1U07$2')),
		change('docs/implementation-plan.md', t => unit(unit(t, 'U01b', b => b.replace('FG04, FG05, FG06', 'FG04, FG06')), 'U07', b => b.replace('Foundation proofs. None.', 'Foundation proofs. FG05.'))),
	], reason: 'foundation proof requires a foundation owner' },
	{ name: 'missing-integration-scenario', changes: [change('docs/implementation-plan.md', t => t.replace(/^- \[ \] Lane 10\..+\n/m, ''))], reason: 'live coverage' },
	{ name: 'model-write-before-canary', changes: [change('docs/task-breakdown.md', t => task(t, 'agora-s1-execute-headless-task', b => b.replace('`agora-s1-qualify-scripted-worker`', '`agora-s1-isolate-local-environment`')))], reason: 'model writes precede agora-s1-qualify-scripted-worker' },
	{ name: 'feature-bypasses-foundation', changes: [change('docs/implementation-plan.md', t => t.replaceAll('U01c, U01d', 'U01c')), change('docs/task-breakdown.md', t => t.replaceAll('- Unit gates: U01c, U01d.', '- Unit gates: U01c.'))], reason: 'feature bypasses foundation U01d' },
	{ name: 'memory-unnecessarily-needs-cloud', changes: [
		change('docs/implementation-plan.md', t => unit(t, 'U13', b => b.replace('**Depends on.** U09.', '**Depends on.** U09, U12.')).replace('| U13 | U09 | S2 |', '| U13 | U09, U12 | S2 |')),
		change('docs/task-breakdown.md', t => {
			for (const name of ['agora-s2-activate-reviewed-knowledge', 'agora-s2-invalidate-stale-knowledge', 'agora-s2-activate-project-main']) t = task(t, name, b => b.replace('- Unit gates: U09.', '- Unit gates: U09, U12.'));
			return t;
		}),
	], reason: 'unjustified cloud dependency' },
];
for (const test of cases) {
	const fixture = path.join(runRoot, test.name);
	fs.mkdirSync(fixture);
	fs.cpSync(path.join(root, 'docs'), path.join(fixture, 'docs'), { recursive: true });
	fs.cpSync(path.join(root, 'scripts'), path.join(fixture, 'scripts'), { recursive: true });
	for (const file of ['AGENTS.md', 'CLAUDE.md', 'skills-lock.json']) fs.copyFileSync(path.join(root, file), path.join(fixture, file));
	fs.symlinkSync(path.join(root, '.agents'), path.join(fixture, '.agents'), 'dir');
	// Decision rows cite evidence receipts and reviewed migration files; copy them so a mutation can never reach the real tree.
	for (const cited of ['evidence', 'packages']) fs.cpSync(path.join(root, cited), path.join(fixture, cited), { recursive: true, filter: source => !source.includes('node_modules') });
	for (const { file, mutate } of test.changes) {
		const target = path.join(fixture, file);
		const before = fs.readFileSync(target, 'utf8');
		const after = mutate(before);
		assert.notEqual(before, after, `${test.name}: mutation did not apply to ${file}`);
		fs.writeFileSync(target, after);
	}
	const result = spawnSync(process.execPath, [path.join(root, 'scripts/verify-design.mjs')], { cwd: fixture, encoding: 'utf8' });
	assert.equal(result.error, undefined);
	assert.equal(result.status, test.expected ?? 1, `${test.name}: unexpected exit\n${result.stdout}\n${result.stderr}`);
	if (test.reason) assert(result.stderr.includes(test.reason), `${test.name}: rejected for wrong reason\n${result.stderr}`);
	console.log(`PASS ${test.expected === 0 ? 'accepts' : 'rejects'} ${test.name}`);
}
fs.rmSync(runRoot, { recursive: true, force: true });
console.log(`PASS ${cases.length} behavioral design-check cases; no application acceptance implied`);
