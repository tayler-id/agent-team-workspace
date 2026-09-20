// Bounded local U01a driver, not the U01b project lifecycle or a trusted evidence service.
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createWireValidator } from '../contracts/src/index.ts';
import { assess, deferred, required } from './foundation-policy.mjs';
import { assertions, compareGuard, compareReceipts, git, guard, hash, replay, run, scratch, task, withCopy } from './foundation-replay.mjs';

const argv = process.argv.slice(2).filter(arg => arg !== '--json' && arg !== '--');
const options = {};
let usage = false;
for (let i = 0; i < argv.length; i += 2) {
	if (!['--scope', '--parent', '--head', '--evidence'].includes(argv[i]) || !argv[i + 1] || options[argv[i]]) usage = true;
	options[argv[i]] = argv[i + 1];
}
const scope = options['--scope'] ?? 'foundation';
const parent = options['--parent'] ?? '';
const head = options['--head'] ?? git('rev-parse', 'HEAD');
const evidence = path.resolve(options['--evidence'] ?? `evidence/U01a/${task}`);
const report = { schema_version: 'agora.foundation/v1', authority: 'foundation_fixture', task, scope, parent, head, outcome: 'blocked', task_outcome: 'blocked', unit_outcome: 'blocked', foundation_outcome: 'blocked', proofs: [], denials: [], artifacts: [] };
const proof = (id, outcome, denials = []) => ({ id, subject: `${task}:${id}`, revision: id === 'red' ? parent : head, outcome, denials });
const save = (file, value) => writeFileSync(path.join(evidence, file), JSON.stringify(value, null, 2) + '\n');
function mapped() {
	const before = JSON.parse(git('show', `${parent}:agora/feature-map.json`));
	const after = JSON.parse(git('show', `${head}:agora/feature-map.json`));
	const features = after.features;
	const current = features.find(feature => feature.id === 'foundation-admission');
	if (!current || !['lane-9', 'lane-10', 'packages/verification/test/admission.test.ts'].every(id => current.scenarios.includes(id))) return false;
	if (new Set(features.map(feature => feature.id)).size !== features.length) return false;
	if (!before.features.every(old => features.some(feature => feature.id === old.id && old.scenarios.every(id => feature.scenarios.includes(id))))) return false;
	if (features.some(feature => feature.id !== 'foundation-admission' && !before.features.some(old => old.id === feature.id))) return false;
	if (features.flatMap(feature => feature.scenarios).filter(file => file.endsWith('.test.ts')).some(file => run(['git', 'cat-file', '-e', `${head}:${file}`]).exit !== 0)) return false;
	return git('diff', '--name-only', parent, head).split('\n').filter(file => /^(scripts|packages|apps|contracts)\//.test(file)).every(file => features.some(feature => [...feature.paths, ...feature.scenarios].some(entry => file === entry || file.startsWith(`${entry}/`))));
}
function owners() {
	return withCopy(head, copy => {
		const checks = [];
		const jsonPass = output => { try { return JSON.parse(output).outcome === 'pass'; } catch { return false; } };
		const probe = (command, predicate = () => true) => {
			const started = new Date().toISOString();
			const result = run(command, copy);
			checks.push({ command, started, finished: new Date().toISOString(), ...result });
			return result.exit === 0 && predicate(result.output);
		};
		const tests = probe(['node', 'scripts/with-test-postgres.mjs', 'pnpm', 'exec', 'vitest', 'run', '--reporter=json', '--outputFile=.scratch/owners.json']);
		const native = JSON.parse(readFileSync(path.join(copy, '.scratch/owners.json'), 'utf8'));
		const expected = JSON.parse(git('show', `${head}:agora/feature-map.json`)).features.flatMap(feature => feature.scenarios).filter(file => /^(apps|packages|contracts)\//.test(file) && file.endsWith('.test.ts'));
		const passed = tests && assertions(native).every(row => row.status === 'passed') && expected.every(file => native.testResults.some(suite => suite.name.endsWith(file) && suite.assertionResults.length > 0));
		const suites = names => passed && names.every(name => native.testResults.some(suite => suite.name.endsWith(name) && suite.assertionResults.length > 0));
		const bootstrap = suites(['apps/center/test/policy.test.ts', 'packages/storage/test/fixture.pg.test.ts', 'packages/storage/test/migrate.pg.test.ts']);
		const contracts = probe(['node', 'contracts/tools/generate.mjs', '--check'], jsonPass) && suites(['contracts/test/generation.test.ts', 'contracts/test/conformance.test.ts']);
		const client = probe(['node', 'scripts/drive-client-core.ts', '--json', '--swift'], jsonPass) && suites(['packages/client-core/test/sync.test.ts', 'packages/client-core/test/guards.test.ts', 'packages/client-core/test/boundaries.test.ts']);
		const documentation = probe(['pnpm', 'docs:check'], output => output.includes('the same public build driver') && /(?:ℹ tests|# tests) [1-9][0-9]*/.test(output) && /(?:ℹ fail|# fail) 0/.test(output)) && probe(['node', 'docs/site/build.mjs'], jsonPass);
		const staticChecks = probe(['pnpm', 'lint']) && probe(['pnpm', 'typecheck']);
		save(`${scope}-checks.json`, { head, tree: git('rev-parse', `${head}^{tree}`), checks, assertions: assertions(native), cleanup: 'removed' });
		return { bootstrap, contracts, client, documentation, static: staticChecks };
	});
}
let temporary;
let safeEvidence = false;
try {
	if (usage || !['record', 'task', 'foundation', 'feature', 'lane-9', 'lane-10'].includes(scope) || !/^[a-f0-9]{40}$/.test(parent) || !/^[a-f0-9]{40}$/.test(head)) throw new Error('usage_error');
	if (parent === head || run(['git', 'merge-base', '--is-ancestor', parent, head]).exit !== 0) throw new Error('revision_invalid');
	if (head !== git('rev-parse', 'HEAD')) throw new Error('head_mismatch');
	if (run(['git', 'diff', '--quiet', head, '--', '.', ':(exclude)evidence']).exit !== 0 || git('ls-files', '--others', '--exclude-standard').split('\n').some(file => file && !file.startsWith('evidence/'))) throw new Error('source_dirty');
	if (!['evidence', '.scratch'].some(dir => evidence.startsWith(path.resolve(dir) + path.sep))) throw new Error('evidence_path_invalid');
	let ancestor = evidence;
	while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
	if (realpathSync(ancestor) !== ancestor) throw new Error('evidence_path_invalid');
	mkdirSync(evidence, { recursive: true });
	safeEvidence = true;
	for (const file of ['scripts/foundation.mjs', 'scripts/foundation-policy.mjs', 'scripts/foundation-replay.mjs', 'scripts/record-red-green.mjs']) {
		if (readFileSync(file, 'utf8').trim() !== git('show', `${head}:${file}`)) throw new Error('driver_dirty');
	}
	temporary = scratch();
	if (scope === 'record') {
		replay(parent, head, evidence); save('guard.json', guard(head));
		report.proofs.push(proof('red', 'pass'), proof('green', 'pass'), proof('guard', 'pass'));
		report.outcome = 'pass';
	} else {
		replay(parent, head, temporary);
		const freshGuard = guard(head);
		const receiptDenials = compareReceipts(evidence, temporary, parent, head);
		let guardDenial = [];
		try { guardDenial = compareGuard(readFileSync(path.join(evidence, 'guard.json'), 'utf8'), freshGuard); }
		catch { guardDenial = ['guard_missing_or_malformed']; }
		if (scope === 'lane-9' || scope === 'lane-10') {
			const trials = [];
			if (scope === 'lane-9') {
				for (const value of [null, { ...freshGuard, head: parent }, { ...freshGuard, normal: freshGuard.weakened }, { ...freshGuard, id: 'unrelated' }]) trials.push({ input: value, denials: compareGuard(JSON.stringify(value), freshGuard) });
			} else {
				const forged = path.join(temporary, 'forged'); mkdirSync(forged);
				for (const file of ['green.log', 'test-patch.diff']) writeFileSync(path.join(forged, file), readFileSync(path.join(temporary, file)));
				trials.push({ input: 'missing red', denials: compareReceipts(forged, temporary, parent, head) });
				writeFileSync(path.join(forged, 'red.log'), 'observed_exit: 1\n\n{"success":false}');
				trials.push({ input: 'forged red', denials: compareReceipts(forged, temporary, parent, head) });
				trials.push({ input: 'premature feature', denials: assess({ parent, head, scope: 'feature', applicability: 'behavior', records: [], mapped: mapped(), prerequisites: false }) });
			}
			save(`${scope}.json`, { head, assertions: trials, guard: freshGuard, cleanup: 'removed', primary_source: hash(readFileSync('scripts/foundation-policy.mjs')) });
			const valid = scope === 'lane-9' ? trials.every(trial => trial.denials.length > 0) : JSON.stringify(trials[0].denials) === '["red_missing"]' && JSON.stringify(trials[1].denials) === '["red_malformed"]' && trials[2].denials.includes('FG04_missing') && trials[2].denials.includes('feature_premature');
			report.denials = [...receiptDenials, ...guardDenial, ...(valid ? [] : ['lane_assertion_failed'])];
			report.outcome = report.denials.length ? 'fail' : 'pass';
			report.proofs.push(proof(scope, report.outcome, report.denials));
		} else {
			const observed = owners();
			const records = required.map(id => ({ id, subject: `${task}:${id}`, revision: id === 'red' ? parent : head, verified: id === 'red' || id === 'green' ? receiptDenials.length === 0 : id === 'guard' ? guardDenial.length === 0 : observed[id] }));
			const facts = { parent, head, scope, applicability: 'behavior', records, mapped: mapped(), prerequisites: observed.client && observed.contracts && observed.bootstrap };
			const taskDenials = [...assess({ ...facts, scope: 'task' }), ...receiptDenials, ...guardDenial];
			report.task_outcome = taskDenials.length ? 'fail' : 'pass';
			report.denials = [...new Set([...assess(facts), ...taskDenials])].sort();
			report.outcome = report.denials.length ? (taskDenials.length ? 'fail' : 'blocked') : 'pass';
			report.proofs = records.map(record => proof(record.id, record.verified ? 'pass' : 'fail', record.verified ? [] : [`${record.id}_unverified`]));
		}
	}
} catch (error) {
	const known = ['usage_error', 'revision_invalid', 'revision_unavailable', 'head_mismatch', 'evidence_path_invalid', 'driver_dirty', 'source_dirty', 'source_mutation', 'install_blocked', 'red_green_replay_failed', 'guard_mutation_invalid', 'guard_ineffective'];
	const reason = known.includes(error.message) ? error.message : 'probe_infrastructure';
	report.denials = [reason];
	report.outcome = reason === 'usage_error' ? 'usage_error' : reason === 'probe_infrastructure' ? 'infrastructure_failure' : 'blocked';
} finally { if (temporary) rmSync(temporary, { recursive: true, force: true }); }
if (!/^[a-f0-9]{40}$/.test(parent)) delete report.parent;
if (!/^[a-f0-9]{40}$/.test(head)) delete report.head;
if (!['record', 'task', 'foundation', 'feature', 'lane-9', 'lane-10'].includes(scope)) report.scope = 'invalid';
if (report.parent && report.head) for (const id of ['FG01', 'FG02', 'FG03', ...deferred]) report.proofs.push(proof(id, 'blocked', [id <= 'FG03' ? 'U01a_integration_unqualified' : `${id}_missing`]));
for (const file of ['red.log', 'green.log', 'test-patch.diff', 'guard.json', `${scope}-checks.json`, `${scope}.json`]) {
	const target = path.join(evidence, file);
	if (safeEvidence && existsSync(target)) { const bytes = readFileSync(target); report.artifacts.push({ path: path.relative(process.cwd(), target), digest: hash(bytes), media_type: file.endsWith('.json') ? 'application/json' : 'text/plain', byte_length: bytes.length }); }
}
if (!createWireValidator().validate('FoundationReport', report).ok) { report.outcome = 'infrastructure_failure'; report.denials = ['report_invalid']; }
console.log(JSON.stringify(report, null, 2));
process.exit({ pass: 0, fail: 1, blocked: 2, unavailable: 3, usage_error: 64, infrastructure_failure: 70 }[report.outcome]);
