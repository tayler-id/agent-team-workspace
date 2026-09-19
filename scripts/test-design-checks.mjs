import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const workspace = path.join(root, '.scratch', 'design-check-tests');
fs.mkdirSync(workspace, { recursive: true });
const runRoot = fs.mkdtempSync(path.join(workspace, 'run-'));
const cases = [
	['baseline', null, null],
	['missing-requirement', 'docs/task-breakdown.md', text => text.replace('R03, R12, R17, R18', 'R99, R12, R17, R18')],
	['dependency-cycle', 'docs/task-breakdown.md', text => text.replace('- Prerequisites: None.', '- Prerequisites: `agora-s1-bootstrap-repository`.')],
	['missing-live-scenario', 'docs/technical-spec.md', text => text.replace('LV01.', 'Scenario one.')],
	['broken-local-link', 'AGENTS.md', text => `${text}\n[Missing](docs/absent-design.md)\n`],
	['placeholder', 'docs/technical-spec.md', text => `${text}\nTODO\n`],
	['long-dash', 'docs/technical-spec.md', text => `${text}\n${String.fromCodePoint(0x2014)}\n`],
	['unofficial-skill', 'skills-lock.json', text => text.replace('cursor/plugins', 'unofficial/port')],
	['missing-decision-evidence', 'docs/decisions.tsv', text => text.replace('skills-lock.json;', 'absent-lock.json;')],
];
for (const [name, file, mutate] of cases) {
	const fixture = path.join(runRoot, name);
	fs.mkdirSync(fixture);
	fs.cpSync(path.join(root, 'docs'), path.join(fixture, 'docs'), { recursive: true });
	for (const name of ['AGENTS.md', 'CLAUDE.md', 'skills-lock.json']) fs.copyFileSync(path.join(root, name), path.join(fixture, name));
	fs.symlinkSync(path.join(root, '.agents'), path.join(fixture, '.agents'), 'dir');
	if (file) {
		const target = path.join(fixture, file);
		const before = fs.readFileSync(target, 'utf8');
		const after = mutate(before);
		assert.notEqual(before, after, `${name}: mutation did not apply`);
		fs.writeFileSync(target, after);
	}
	const result = spawnSync(process.execPath, [path.join(root, 'scripts/verify-design.mjs')], { cwd: fixture, encoding: 'utf8' });
	assert.equal(result.error, undefined);
	assert.equal(result.status === 0, name === 'baseline', `${name}: unexpected result\n${result.stdout}\n${result.stderr}`);
	console.log(`PASS ${name === 'baseline' ? 'accepts' : 'rejects'} ${name}`);
}
console.log(`PASS ${cases.length} design-check cases; fixtures remain under .scratch/design-check-tests`);
