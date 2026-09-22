import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const read = file => fs.readFileSync(file, 'utf8');
const documents = ['AGENTS.md', 'CLAUDE.md', 'docs/technical-spec.md', 'docs/implementation-plan.md', 'docs/task-breakdown.md', 'docs/research-basis.md', 'docs/validation/design-validation.md'];
const slug = heading => heading.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
const anchors = file => new Set([...read(file).matchAll(/^#{1,6} (.+)$/gm)].map(m => slug(m[1])));
const ids = (text, pattern) => [...text.matchAll(pattern)].map(m => m[0]);
const equalSet = (a, b, why) => assert.deepEqual([...a].sort(), [...b].sort(), why);
let links = 0;
function checkLink(from, target) {
	if (/^(https?:|mailto:)/.test(target)) return;
	const [part, fragment] = target.split('#');
	const file = path.normalize(path.join(path.dirname(from), decodeURIComponent(part || path.basename(from))));
	assert(!file.startsWith('..'), `${from}: link escapes project`);
	assert(fs.existsSync(file), `${from}: missing link ${target}`);
	if (fragment && file.endsWith('.md')) assert(anchors(file).has(fragment), `${from}: missing anchor ${target}`);
	links++;
}
for (const file of documents) {
	const text = read(file);
	assert(!/[\u2013\u2014]/u.test(text), `${file}: long dash`);
	assert(!/\b(TODO|TBD|FIXME|XXX)\b|<placeholder>|\[insert\b/iu.test(text), `${file}: unresolved placeholder`);
	assert(!/\/Users\/|\.treehouse\/|\.local\/share\/firstmate\/|FIRSTMATE_OP/.test(text), `${file}: private operational path`);
	if (file === 'CLAUDE.md') assert.equal(text, '<!-- Points Claude at AGENTS.md via import; edit AGENTS.md, not this file. -->\n@AGENTS.md\n');
	else assert.equal([...text.matchAll(/^# /gm)].length, 1, `${file}: one H1 required`);
	let previous = 0;
	let fence = false;
	for (const line of text.split('\n')) {
		if (line.startsWith('```')) fence = !fence;
		if (fence) continue;
		const match = line.match(/^(#{1,6}) /);
		if (match) {
			assert(match[1].length <= previous + 1, `${file}: skipped heading level`);
			previous = match[1].length;
		}
	}
	assert(!fence, `${file}: unclosed fence`);
	for (const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) checkLink(file, m[1]);
}
const duneAllowed = new Set(['docs/research-basis.md', 'docs/site/research.md']);
const duneFiles = [...documents, ...fs.readdirSync('docs/site').filter(f => f.endsWith('.md')).map(f => `docs/site/${f}`)];
for (const file of duneFiles) if (!duneAllowed.has(file)) assert(!/\bdune\b/iu.test(read(file)), `${file}: architecture must not be labeled Dune`);
// Design-check fixtures under scripts/test-design-checks.mjs copy only docs/, scripts/ and a few
// named root files, not the workspace tree; skip this block there rather than crash on ENOENT.
if (fs.existsSync('pnpm-workspace.yaml')) {
	const workspaceSection = read('pnpm-workspace.yaml').split(/^overrides:/m)[0];
	const workspacePackageDirs = ['.', ...[...workspaceSection.matchAll(/^\s*-\s*(\S+)\s*$/gm)].map(m => m[1]).flatMap(glob => {
		if (!glob.endsWith('/*')) return [glob];
		const base = glob.slice(0, -2);
		return fs.existsSync(base) ? fs.readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => `${base}/${e.name}`) : [];
	})];
	for (const dir of workspacePackageDirs) {
		const pkgPath = path.join(dir, 'package.json');
		if (!fs.existsSync(pkgPath)) continue;
		const name = JSON.parse(read(pkgPath)).name;
		assert(!/dune/iu.test(name), `${pkgPath}: package name must not reference Dune`);
	}
}
const spec = read('docs/technical-spec.md');
const plan = read('docs/implementation-plan.md');
const breakdown = read('docs/task-breakdown.md');
const requirements = new Set([...spec.matchAll(/^## (R\d{2})\./gm)].map(m => m[1]));
assert.equal(requirements.size, 26, 'requirement inventory');
const criteria = new Map([...spec.matchAll(/^\| (AC\d{2}) \| (.+)$/gm)].map(m => [m[1], m[2]]));
assert.equal(criteria.size, 29, 'acceptance inventory');
for (const [id, row] of criteria) assert(row.includes(`LV${id.slice(2)}.`), `${id}: no live scenario`);
const units = new Map();
const builds = new Map();
const proofOwners = new Map();
for (const m of plan.matchAll(/^## (.+) \((U\d{2}[a-d]?)\)\n([\s\S]*?)(?=^## )/gm)) {
	const [, title, id, body] = m;
	assert(!units.has(id), `${id}: duplicate unit`);
	const dependency = body.match(/\*\*Depends on\.\*\* (.+?)\. Stage (S[123])/);
	assert(dependency, `${id}: missing dependency/stage declaration`);
	const unit = { title, body, stage: dependency[2], deps: ids(dependency[1], /U\d{2}[a-d]?/g), tasks: [] };
	units.set(id, unit);
	const block = body.split('**Build.**')[1]?.split('**You see.**')[0];
	assert(block, `${id}: missing Build block`);
	for (const b of block.matchAll(/^- \[ \] `(U\d{2}[a-d]?\.B\d{2})` (.+)$/gm)) {
		assert(b[1].startsWith(`${id}.`), `${id}: foreign Build ID`);
		assert(!builds.has(b[1]), `${b[1]}: duplicate Build ID`);
		builds.set(b[1], { unit: id, outcome: b[2], owners: [] });
	}
	assert([...builds.values()].some(b => b.unit === id), `${id}: no owned Build boxes`);
	assert.equal([...block.matchAll(/^- \[ \]/gm)].length, [...builds.values()].filter(b => b.unit === id).length, `${id}: unlabelled Build box`);
	const live = body.split('**Verify, live.**')[1]?.split('**Verify, perf.**')[0];
	const lanes = [...(live || '').matchAll(/^- \[ \] Lane (\d+)\. (.+)$/gm)];
	equalSet(lanes.map(m => Number(m[1])), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `${id}: live coverage`);
	for (const lane of lanes) {
		assert(lane[2].includes(`Save \`evidence/${id}/lane-${lane[1]}/scenario.png\``), `${id}: missing scenario artifact`);
		assert(/Pass when .+\./.test(lane[2]), `${id}: missing pass predicate`);
	}
	for (const proof of ids(body.match(/^Foundation proofs\. (.+)$/m)?.[1] || '', /FG\d{2}/g)) {
		assert(!proofOwners.has(proof), `${proof}: duplicate foundation proof`);
		proofOwners.set(proof, id);
	}
}
assert.equal(units.size, 28, 'unit inventory');
const graph = new Map();
for (const [id, unit] of units) {
	for (const dependency of unit.deps) {
		assert(units.has(dependency), `${id}: unknown unit dependency`);
		assert(units.get(dependency).stage <= unit.stage, `${id}: dependency on later stage`);
	}
	graph.set(id, [...unit.deps]);
}
const specProofs = new Map([...spec.matchAll(/^\| (FG\d{2}) \| .+ \| (U\d{2}[a-d]?) \|$/gm)].map(m => [m[1], m[2]]));
assert.equal(specProofs.size, 8, 'foundation proof inventory');
equalSet(proofOwners.keys(), specProofs.keys(), 'missing foundation proof');
for (const [proof, owner] of specProofs) {
	assert(/^U01[a-d]$/.test(owner), `${proof}: foundation proof requires a foundation owner`);
	assert.equal(proofOwners.get(proof), owner, `${proof}: wrong foundation owner`);
}
const referenceGraph = new Map([...plan.matchAll(/^\| (U\d{2}[a-d]?) \| (.+) \| (S[123]) \|$/gm)].map(m => [m[1], { deps: ids(m[2], /U\d{2}[a-d]?/g), stage: m[3] }]));
equalSet(referenceGraph.keys(), units.keys(), 'dependency reference inventory');
for (const [id, reference] of referenceGraph) {
	equalSet(reference.deps, units.get(id).deps, `${id}: dependency reference drift`);
	assert.equal(reference.stage, units.get(id).stage);
}
const tasks = new Map();
const reqCoverage = new Set();
const acCoverage = new Set();
for (const m of breakdown.matchAll(/^### (agora-s[123]-[a-z0-9-]+)\n([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm)) {
	const name = m[1];
	const fields = Object.fromEntries([...m[2].matchAll(/^- ([^:]+): (.+)$/gm)].map(m => [m[1], m[2]]));
	for (const key of ['Title', 'Stage', 'Prerequisites', 'Unit gates', 'Close gate', 'Build box', 'Outcome', 'Acceptance', 'Verification evidence', 'Plan unit', 'Specification requirements']) assert(fields[key], `${name}: missing ${key}`);
	assert(!tasks.has(name), `${name}: duplicate task`);
	const unitId = fields['Plan unit'].match(/^U\d{2}[a-d]?/)[0];
	assert(units.has(unitId), `${name}: unknown unit`);
	const unit = units.get(unitId);
	const stage = name.match(/^agora-(s\d)/)[1].toUpperCase();
	assert.equal(unit.stage, stage, `${name}: unit stage mismatch`);
	assert(fields.Stage.startsWith(stage), `${name}: task stage mismatch`);
	if (stage !== 'S1') assert(fields.Stage.includes('later-stage'), `${name}: later stage not labelled`);
	assert.equal(fields['Close gate'], 'task.', `${name}: task must close on its own gate`);
	const gates = ids(fields['Unit gates'], /U\d{2}[a-d]?/g);
	assert(!gates.includes(unitId), `${name}: task waits for its own milestone`);
	equalSet(gates, unit.deps, `${name}: external unit gates drift`);
	const buildId = fields['Build box'].replace(/\.$/, '');
	const build = builds.get(buildId);
	assert(build && build.unit === unitId, `${name}: unknown or foreign Build box`);
	assert.equal(fields.Outcome, build.outcome, `${name}: Outcome-to-Build mismatch`);
	build.owners.push(name);
	for (const req of ids(fields['Specification requirements'], /R\d{2}/g)) {
		assert(requirements.has(req), `${name}: unknown requirement ${req}`);
		assert(unit.body.includes(req), `${name}: requirement not in unit`);
		reqCoverage.add(req);
	}
	for (const ac of ids(fields['Specification requirements'], /AC\d{2}/g)) {
		assert(criteria.has(ac), `${name}: unknown criterion`);
		assert(unit.body.includes(ac), `${name}: criterion not in unit`);
		assert(ids(criteria.get(ac), /U\d{2}[a-d]?/g).includes(unitId), `${name}: spec criterion omits unit`);
		acCoverage.add(ac);
	}
	const parents = [...fields.Prerequisites.matchAll(/`([^`]+)`/g)].map(m => m[1]);
	tasks.set(name, { unitId, stage, parents, fields });
	unit.tasks.push(name);
	graph.get(unitId).push(name);
	graph.set(name, [...parents, ...gates]);
}
assert.equal(tasks.size, 78, 'task inventory');
for (const [id, build] of builds) assert.equal(build.owners.length, 1, `${id}: Build must have exactly one task owner`);
for (const [id, unit] of units) assert(unit.tasks.length, `${id}: no tasks`);
for (const [name, task] of tasks) for (const parent of task.parents) {
	assert(tasks.has(parent), `${name}: unknown task prerequisite`);
	assert(tasks.get(parent).stage <= task.stage, `${name}: task depends on later stage`);
}
const ancestors = new Map();
function walk(id, pending = new Set()) {
	assert(!pending.has(id), `${id}: combined task/milestone cycle`);
	if (ancestors.has(id)) return ancestors.get(id);
	const result = new Set();
	for (const dependency of graph.get(id)) {
		result.add(dependency);
		for (const ancestor of walk(dependency, new Set(pending).add(id))) result.add(ancestor);
	}
	ancestors.set(id, result);
	return result;
}
for (const id of graph.keys()) walk(id);
for (const [id] of units) if (!/^U01[a-d]$/.test(id)) for (const foundation of ['U01a', 'U01b', 'U01c', 'U01d']) assert(ancestors.get(id).has(foundation), `${id}: feature bypasses foundation ${foundation}`);
for (const id of ['U13', 'U15', 'U18', 'U19']) for (const cloud of ['U10', 'U11', 'U12', 'U14']) assert(!ancestors.get(id).has(cloud), `${id}: unjustified cloud dependency`);
const writes = ancestors.get('agora-s1-execute-headless-task');
for (const prerequisite of ['agora-s1-validate-project-evidence', 'agora-s1-qualify-trusted-checks', 'agora-s1-qualify-scripted-worker']) assert(writes.has(prerequisite), `model writes precede ${prerequisite}`);
equalSet(reqCoverage, requirements, 'requirement coverage');
equalSet(acCoverage, criteria.keys(), 'acceptance coverage');
const entries = Object.values(JSON.parse(read('skills-lock.json')).skills);
assert.equal(entries.length, 47);
for (const entry of entries) {
	assert.equal(entry.source, 'cursor/plugins');
	assert(entry.skillPath.startsWith('pstack/skills/'));
	assert(/^[a-f0-9]{64}$/.test(entry.computedHash));
	assert(fs.existsSync(entry.skillPath.replace('pstack/', '.agents/')));
}
const trail = read('docs/decisions.tsv').trimEnd().split('\n');
assert.equal(trail[0], 'ts\tphase\tdecision\twhy\tevidence\tresult');
const baseline = trail.slice(0, 44).join('\n') + '\n';
assert.equal(createHash('sha256').update(baseline).digest('hex'), read('docs/validation/decision-baseline.sha256').trim(), 'append-only decision baseline changed');
for (const row of trail.slice(1)) {
	const cells = row.split('\t');
	assert.equal(cells.length, 6);
	assert(cells.every(cell => cell.length));
	assert(!/[\u2013\u2014]/u.test(row));
	assert(!Number.isNaN(Date.parse(cells[0])));
	for (const evidence of cells[4].split('; ')) checkLink('index.md', evidence);
}
console.log(`PASS authored structure: ${documents.length} documents; ${requirements.size} requirements; ${criteria.size} live-scenario mappings`);
console.log(`PASS semantic readiness: ${units.size} milestones; ${tasks.size} independently gated tasks; ${builds.size} exactly owned Build outcomes`);
console.log(`PASS combined dependency graph; ${specProofs.size} foundation proofs; evidence/canary before model writes; cloud-independent later tracks`);
console.log(`PASS ${entries.length} official skills; ${trail.length - 1} append-only decisions; ${links} local links; authored style/privacy checks`);
console.log('SCOPE static design readiness only; no runtime foundation or product acceptance has run; upstream format/model literals are not semantic authority');
