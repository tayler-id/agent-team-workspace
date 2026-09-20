import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSite } from '../validate.mjs';

const content = '# Fixture\n\n' + ['What it is', 'What it does', 'Why it exists', 'How it works', 'Implementation status', 'Verification and proof'].map(h => `## ${h}\n\nSpecific explanation.\n`).join('\n') + '\n```flow\nInput | Validate bytes\nOutput | Return receipt\n```\n[Home](index.md#fixture)';
const fixture = () => ({
	pages: [{ id: 'index', kind: 'feature', content }],
	atlas: { revision: '606cba2', date: '2026-09-20', features: [{ id: 'fixture', status: 'Built', proof: ['repo:apps/center/src/app.ts', 'repo:apps/center/test/policy.test.ts', 'repo:evidence/proof.log'] }], milestones: [{ id: 'U01a', stage: 'S1', status: 'In progress', outcome: 'A real public fixture.' }] },
	expectedMilestones: ['U01a'], expectedMilestoneDetails: [{ id: 'U01a', stage: 'S1', outcome: 'A real public fixture.' }], inventory: ['apps/center'], documentedInventory: ['apps/center'],
	sources: ['apps/center/src/app.ts', 'apps/center/test/policy.test.ts', 'evidence/proof.log'], featurePages: ['docs/site/index.md'],
});
const rejects = (mutate, reason) => {
	const input = fixture();
	mutate(input);
	assert.ok(validateSite(input).some(e => e.includes(reason)), `must reject ${reason}`);
};

test('public documentation guard accepts the complete valid fixture', () => assert.deepEqual(validateSite(fixture()), []));
test('broken internal page and anchor links fail', () => {
	rejects(i => { i.pages[0].content += '\n[Missing](lost.md)'; }, 'link');
	rejects(i => { i.pages[0].content += '\n[Missing](index.md#absent)'; }, 'link');
	rejects(i => { i.pages[0].content += '\n[Missing](repo:missing.ts)'; }, 'source');
});
test('feature explanations and visual flows are mandatory', () => {
	rejects(i => { i.pages[0].content = content.replace('## Why it exists', '## Other'); }, 'section');
	rejects(i => { i.pages[0].content = content.replace(/```flow[\s\S]*?```/, ''); }, 'visual');
});
test('progress statuses are closed and Built requires source test and evidence', () => {
	rejects(i => { i.atlas.features[0].status = 'Done-ish'; }, 'status');
	rejects(i => { i.atlas.features[0].proof = []; }, 'proof');
	rejects(i => { i.atlas.revision = ''; }, 'snapshot');
});
test('all milestones must occur exactly once with an outcome and release stage', () => {
	rejects(i => { i.atlas.milestones = []; }, 'coverage');
	rejects(i => { i.atlas.milestones.push(i.atlas.milestones[0]); }, 'coverage');
	rejects(i => { i.atlas.milestones[0].outcome = ''; }, 'outcome required');
	rejects(i => { i.atlas.milestones[0].stage = 'S4'; }, 'stage required');
});
test('milestone outcomes mirror the authoritative plan instead of drifting', () => rejects(i => { i.atlas.milestones[0].outcome = 'Unrelated outcome'; }, 'milestone outcome drift'));
test('every executable and package must have a documentation home', () => rejects(i => { i.documentedInventory = []; }, 'inventory'));
test('every feature-map entry requires a validated feature page', () => rejects(i => { i.featurePages = [undefined]; }, 'feature documentation'));
test('private absolute paths and unsafe links never enter the site', () => {
	rejects(i => { i.pages[0].content += '\n/Users/someone/private/archive'; }, 'private');
	rejects(i => { i.pages[0].content += '\n[Escape](../secret.md)'; }, 'link');
});
