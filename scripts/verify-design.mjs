import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const documents = [
	'AGENTS.md',
	'CLAUDE.md',
	'docs/technical-spec.md',
	'docs/implementation-plan.md',
	'docs/task-breakdown.md',
	'docs/research-basis.md',
	'docs/validation/design-validation.md',
];
const slug = heading => heading.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
const anchors = file => new Set([...read(file).matchAll(/^#{1,6} (.+)$/gm)].map(match => slug(match[1])));
let linkCount = 0;
function checkLink(from, target) {
	if (/^(https?:|mailto:)/.test(target)) return;
	const [filePart, fragment] = target.split('#');
	const file = path.normalize(path.join(path.dirname(from), decodeURIComponent(filePart || path.basename(from))));
	assert(!file.startsWith('..'), `${from}: link escapes project: ${target}`);
	assert(fs.existsSync(file), `${from}: missing link: ${target}`);
	if (fragment && file.endsWith('.md')) assert(anchors(file).has(fragment), `${from}: missing anchor: ${target}`);
	linkCount++;
}
for (const file of documents) {
	const content = read(file);
	assert(!/[\u2013\u2014]/u.test(content), `${file}: long dash`);
	assert(!/\b(TODO|TBD|FIXME|XXX)\b|<placeholder>|\[insert\b/iu.test(content), `${file}: unresolved placeholder`);
	assert(!/\/Users\/|\.treehouse\/|\.local\/share\/firstmate\/|FIRSTMATE_OP/.test(content), `${file}: private operational path`);
	if (file === 'CLAUDE.md') {
		assert.equal(content, '<!-- Points Claude at AGENTS.md via import; edit AGENTS.md, not this file. -->\n@AGENTS.md\n');
	} else {
		assert.equal([...content.matchAll(/^# /gm)].length, 1, `${file}: one H1 required`);
	}
	let previous = 0;
	let fence = false;
	for (const line of content.split('\n')) {
		if (line.startsWith('```')) fence = !fence;
		if (fence) continue;
		const match = line.match(/^(#{1,6}) /);
		if (match) {
			assert(match[1].length <= previous + 1, `${file}: skipped heading level`);
			previous = match[1].length;
		}
	}
	assert(!fence, `${file}: unclosed code fence`);
	for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) checkLink(file, match[1]);
}
const spec = read('docs/technical-spec.md');
const plan = read('docs/implementation-plan.md');
const breakdown = read('docs/task-breakdown.md');
const requirements = new Set([...spec.matchAll(/^## (R\d{2})\./gm)].map(match => match[1]));
assert.equal(requirements.size, 20);
const criteria = new Map([...spec.matchAll(/^\| (AC\d{2}) \| (.+)$/gm)].map(match => [match[1], match[2]]));
assert.equal(criteria.size, 20);
for (const [criterion, row] of criteria) assert(row.includes(`LV${criterion.slice(2)}.`), `${criterion}: no live scenario`);
const unitMatches = [...plan.matchAll(/^## .+ \((U\d{2})\)\n([\s\S]*?)(?=^## )/gm)];
const units = new Map(unitMatches.map(match => [match[1], match[2]]));
assert.equal(units.size, 17);
const tasks = [...breakdown.matchAll(/^### (agora-s[123]-[a-z0-9-]+)\n([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm)];
assert.equal(tasks.length, 51);
const taskMap = new Map(tasks.map(match => [match[1], match[2]]));
assert.equal(taskMap.size, tasks.length);
const coveredReq = new Set();
const coveredCriteria = new Set();
const coveredUnits = new Set();
const dependencies = new Map();
for (const [name, body] of taskMap) {
	for (const field of ['Title', 'Stage', 'Prerequisites', 'Outcome', 'Acceptance', 'Verification evidence', 'Plan unit', 'Specification requirements']) {
		assert(body.includes(`- ${field}: `), `${name}: missing ${field}`);
	}
	const unit = body.match(/- Plan unit: (U\d{2})/)[1];
	assert(units.has(unit), `${name}: unknown unit`);
	coveredUnits.add(unit);
	const stage = name.match(/agora-(s\d)-/)[1].toUpperCase();
	assert(body.includes(`- Stage: ${stage}`), `${name}: stage mismatch`);
	assert(units.get(unit).includes(`Stage ${stage}`), `${name}: plan stage mismatch`);
	if (stage !== 'S1') assert(body.includes('later-stage'), `${name}: later stage not labelled`);
	const reqLine = body.match(/- Specification requirements: (.+)/)[1];
	for (const req of reqLine.match(/R\d{2}/g) || []) {
		assert(requirements.has(req), `${name}: unknown requirement ${req}`);
		assert(units.get(unit).includes(req), `${name}: requirement not in plan unit`);
		coveredReq.add(req);
	}
	for (const criterion of reqLine.match(/AC\d{2}/g) || []) {
		assert(criteria.has(criterion), `${name}: unknown criterion`);
		assert(units.get(unit).includes(criterion), `${name}: criterion not in plan unit`);
		assert(criteria.get(criterion).includes(unit), `${name}: spec criterion omits plan unit`);
		coveredCriteria.add(criterion);
	}
	const prereq = body.match(/- Prerequisites: (.+)/)[1];
	const parents = [...prereq.matchAll(/`([^`]+)`/g)].map(match => match[1]);
	for (const parent of parents) {
		assert(taskMap.has(parent), `${name}: unknown prerequisite ${parent}`);
		assert(Number(parent.slice(7, 8)) <= Number(name.slice(7, 8)), `${name}: depends on later stage`);
	}
	dependencies.set(name, parents);
}
const visited = new Set();
function walk(name, pending = new Set()) {
	assert(!pending.has(name), `${name}: task cycle`);
	if (visited.has(name)) return;
	const next = new Set(pending).add(name);
	for (const parent of dependencies.get(name)) walk(parent, next);
	visited.add(name);
}
for (const name of taskMap.keys()) walk(name);
assert.equal(coveredReq.size, requirements.size);
assert.equal(coveredCriteria.size, criteria.size);
assert.equal(coveredUnits.size, units.size);
const lock = JSON.parse(read('skills-lock.json'));
const entries = Object.values(lock.skills);
assert.equal(entries.length, 47);
for (const entry of entries) {
	assert.equal(entry.source, 'cursor/plugins');
	assert(entry.skillPath.startsWith('pstack/skills/'));
	assert(/^[a-f0-9]{64}$/.test(entry.computedHash));
	assert(fs.existsSync(entry.skillPath.replace('pstack/', '.agents/')));
}
const trail = read('docs/decisions.tsv').trimEnd().split('\n');
assert.equal(trail[0], 'ts\tphase\tdecision\twhy\tevidence\tresult');
for (const row of trail.slice(1)) {
	const cells = row.split('\t');
	assert.equal(cells.length, 6);
	assert(cells.every(cell => cell.length));
	assert(!/[\u2013\u2014]/u.test(row));
	assert(!Number.isNaN(Date.parse(cells[0])));
	for (const evidence of cells[4].split('; ')) checkLink('index.md', evidence);
}
console.log(`PASS authored structure: ${documents.length} documents; ${requirements.size} requirements; ${criteria.size} live-scenario mappings`);
console.log(`PASS ${units.size} plan units; ${tasks.length} tasks; acyclic prerequisites; full requirement/criterion/unit coverage`);
console.log(`PASS ${entries.length} official pstack skills; ${trail.length - 1} decision rows; ${linkCount} local links`);
console.log('PASS authored Markdown headings, fences, placeholders, private-path and no-long-dash checks');
console.log('SCOPE vendor skill prose is unchanged and excluded from authored-document style/link checks; external URLs need the recorded source review');
