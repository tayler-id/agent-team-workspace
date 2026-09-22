import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// D83 bans the label Dune for Agora's own architecture or any workspace package, case-insensitively,
// confined to docs/research-basis.md and docs/site/research.md as the only permitted provenance pages.
// This file is deliberately separate from scripts/test-design-checks.mjs so its cases and its
// disabled-guard proof stay reviewable on their own, without touching that runner's unrelated baseline.

const root = process.cwd();
const workspace = path.join(root, '.scratch', 'naming-guard-tests');
fs.mkdirSync(workspace, { recursive: true });
const runRoot = fs.mkdtempSync(path.join(workspace, 'run-'));

function makeFixture(name) {
	const fixture = path.join(runRoot, name);
	fs.mkdirSync(fixture);
	fs.cpSync(path.join(root, 'docs'), path.join(fixture, 'docs'), { recursive: true });
	fs.cpSync(path.join(root, 'scripts'), path.join(fixture, 'scripts'), { recursive: true });
	for (const file of ['AGENTS.md', 'CLAUDE.md', 'skills-lock.json', 'package.json', 'pnpm-workspace.yaml', 'eslint.config.js']) fs.copyFileSync(path.join(root, file), path.join(fixture, file));
	fs.symlinkSync(path.join(root, '.agents'), path.join(fixture, '.agents'), 'dir');
	for (const cited of ['evidence', 'packages', 'contracts', 'apps', 'agora']) fs.cpSync(path.join(root, cited), path.join(fixture, cited), { recursive: true, filter: source => !source.split(path.sep).some(part => ['node_modules', '.build'].includes(part)) });
	return fixture;
}

function run(fixture) {
	return spawnSync(process.execPath, [path.join(root, 'scripts/verify-design.mjs')], { cwd: fixture, encoding: 'utf8' });
}

const cases = [
	{ name: 'baseline', mutate: fixture => assert(fs.existsSync(fixture), 'baseline: fixture must exist unmutated'), expected: 0 },
	{ name: 'lowercase-dune-in-spec', mutate: fixture => {
		const target = path.join(fixture, 'docs/technical-spec.md');
		fs.writeFileSync(target, `${fs.readFileSync(target, 'utf8')}\nAgora uses the dune application architecture.\n`);
	}, expected: 1, reason: 'must not be labeled Dune' },
	{ name: 'uppercase-dune-in-spec', mutate: fixture => {
		const target = path.join(fixture, 'docs/technical-spec.md');
		fs.writeFileSync(target, `${fs.readFileSync(target, 'utf8')}\nAgora uses the Dune application architecture.\n`);
	}, expected: 1, reason: 'must not be labeled Dune' },
	{ name: 'dune-in-site-page', mutate: fixture => {
		const target = path.join(fixture, 'docs/site/app-architecture.md');
		fs.writeFileSync(target, `${fs.readFileSync(target, 'utf8')}\nSee the Dune architecture.\n`);
	}, expected: 1, reason: 'must not be labeled Dune' },
	{ name: 'lowercase-dune-package-name', mutate: fixture => {
		const target = path.join(fixture, 'apps/center/package.json');
		const pkg = JSON.parse(fs.readFileSync(target, 'utf8'));
		pkg.name = '@agora/dune';
		fs.writeFileSync(target, JSON.stringify(pkg, null, '\t') + '\n');
	}, expected: 1, reason: 'package name must not reference Dune' },
	{ name: 'mixed-case-dune-package-name', mutate: fixture => {
		const target = path.join(fixture, 'packages/domain/package.json');
		const pkg = JSON.parse(fs.readFileSync(target, 'utf8'));
		pkg.name = '@agora/DuneDomain';
		fs.writeFileSync(target, JSON.stringify(pkg, null, '\t') + '\n');
	}, expected: 1, reason: 'package name must not reference Dune' },
	{ name: 'root-package-dune-name', mutate: fixture => {
		const target = path.join(fixture, 'package.json');
		const pkg = JSON.parse(fs.readFileSync(target, 'utf8'));
		pkg.name = 'dune';
		fs.writeFileSync(target, JSON.stringify(pkg, null, '\t') + '\n');
	}, expected: 1, reason: 'package name must not reference Dune' },
	{ name: 'allowed-provenance-page-unaffected', mutate: fixture => {
		const target = path.join(fixture, 'docs/research-basis.md');
		fs.writeFileSync(target, `${fs.readFileSync(target, 'utf8')}\nAdditional dune provenance note.\n`);
	}, expected: 0 },
];

for (const test of cases) {
	const fixture = makeFixture(test.name);
	test.mutate(fixture);
	const result = run(fixture);
	assert.equal(result.error, undefined);
	assert.equal(result.status, test.expected, `${test.name}: unexpected exit\n${result.stdout}\n${result.stderr}`);
	if (test.reason) assert(result.stderr.includes(test.reason), `${test.name}: rejected for wrong reason\n${result.stderr}`);
	console.log(`PASS ${test.expected === 0 ? 'accepts' : 'rejects'} ${test.name}`);
}

// Guard-negative: disable the naming check inside a copied verify-design.mjs, reapply a case that
// must be rejected with the guard live, and require the same assertion to turn red (pass wrongly).
{
	const fixture = makeFixture('disabled-guard');
	const target = path.join(fixture, 'docs/technical-spec.md');
	fs.writeFileSync(target, `${fs.readFileSync(target, 'utf8')}\nAgora uses the dune application architecture.\n`);
	const verifierPath = path.join(fixture, 'scripts/verify-design.mjs');
	const verifier = fs.readFileSync(verifierPath, 'utf8');
	const guardLine = 'for (const file of duneFiles) if (!duneAllowed.has(file)) assert(!/\\bdune\\b/iu.test(read(file)), `${file}: architecture must not be labeled Dune`);';
	assert(verifier.includes(guardLine), 'disabled-guard: guard line not found verbatim in scripts/verify-design.mjs');
	const disabled = verifier.replace(guardLine, '// naming guard disabled for red proof');
	assert.notEqual(disabled, verifier, 'disabled-guard: mutation did not apply to scripts/verify-design.mjs');
	fs.writeFileSync(verifierPath, disabled);
	const result = spawnSync(process.execPath, [verifierPath], { cwd: fixture, encoding: 'utf8' });
	assert.equal(result.error, undefined);
	assert.equal(result.status, 0, `disabled-guard: expected the disabled check to wrongly pass\n${result.stdout}\n${result.stderr}`);
	console.log('PASS disabled-guard: naming rejection turns red when the check is removed, proving the guard is real');
}

fs.rmSync(runRoot, { recursive: true, force: true });
console.log(`PASS ${cases.length} naming-guard cases plus one disabled-guard proof; D83 scope only`);
