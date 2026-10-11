// R2 foundation-ready aggregate. Fixture authority: it reports proof state and never grants readiness, enrollment or approval.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { artifact, command, environment, json, safe, versions, wire } from './project-checks.mjs';
import { exits, hash } from './project-primitives.mjs';

export const ids = ['FG01', 'FG02', 'FG03', 'FG04', 'FG05', 'FG06', 'FG07', 'FG08'];
const worst = ['fail', 'blocked', 'unavailable', 'pass'];
const retained = 'evidence/U01a/agora-s1-enforce-test-first';
// Paths whose change after the proven revision invalidates that proof. FG01 includes strict build/lint, so it spans all code.
const relevant = {
	FG01: ['scripts', 'packages', 'apps', 'contracts', 'agora', 'package.json', 'pnpm-lock.yaml'],
	FG02: ['contracts'],
	FG03: ['packages/client-core', 'scripts/boundary-policy.ts'],
};

// Pure and fail-closed. Every mandatory id must appear, bind to `head` and `config`, name an unchanged subject and, to pass, carry artifacts whose bytes match their digests.
export function aggregate({ head, config, mode = 'live', observations }) {
	const denials = [], proofs = [], artifacts = [];
	const count = id => observations.filter(row => row.id === id).length;
	if (observations.some(row => !ids.includes(row.id))) denials.push('proof_unknown');
	for (const id of ids) {
		const row = observations.find(candidate => candidate.id === id), found = [];
		if (count(id) > 1) found.push(`${id}_duplicate`);
		if (row) {
			if (!worst.includes(row.outcome)) found.push(`${id}_outcome`);
			if (row.revision !== head) found.push(`${id}_revision`);
			if (row.config !== config) found.push(`${id}_source_mutation`);
			if (!String(row.subject).startsWith(`${id}:`)) found.push(`${id}_subject`);
			if (row.changed?.length) found.push(`${id}_subject_drift`);
			if (row.outcome === 'pass' && !row.artifacts?.length) found.push(`${id}_artifact_missing`);
			for (const ref of row.outcome === 'pass' ? row.artifacts ?? [] : []) {
				try { const bytes = readFileSync(safe(ref.path)); if (bytes.length !== ref.byte_length || hash(bytes) !== ref.digest) found.push(`${id}_artifact_mismatch`); }
				catch { found.push(`${id}_artifact_missing`); }
			}
		} else found.push(`${id}_missing`);
		const outcome = !row ? 'blocked' : found.length ? 'fail' : row.outcome;
		proofs.push({ id, subject: row?.subject ?? `${id}:absent`, revision: head, outcome, denials: [...new Set(outcome === 'pass' ? [] : [...found, ...(row?.denials ?? [])])].sort() });
		if (outcome === 'pass') artifacts.push(...row.artifacts);
	}
	const rollup = list => worst.find(outcome => list.some(proof => proof.outcome === outcome)) ?? 'pass';
	const outcome = rollup(proofs), task = rollup(proofs.slice(0, 5));
	return {
		schema_version: 'agora.foundation/v1', authority: 'foundation_fixture', mode, task: 'agora-foundation-ready-aggregate', scope: 'foundation-ready', head,
		outcome, task_outcome: task === 'unavailable' ? 'blocked' : task, unit_outcome: 'blocked', foundation_outcome: outcome,
		proofs, denials: [...new Set([...denials, ...proofs.flatMap(proof => proof.denials)])].sort(), artifacts,
	};
}

const observe = (id, head, config, subject, outcome, denials = [], extra = {}) => ({ id, subject: `${id}:${subject}`, revision: head, config, outcome, denials, artifacts: [], changed: [], ...extra });
const changedSince = (proven, id) => command(['git', 'diff', '--name-only', proven, 'HEAD', '--', ...relevant[id]]).stdout.split('\n').filter(Boolean);

// FG01-FG03: the U01a driver replays the retained red/green pair in an owned copy at the proven revision.
async function u01a(head, config, out) {
	const { withCopy, run } = await import('./foundation-replay.mjs');
	const { parent, head: proven } = Object.fromEntries(readFileSync(`${retained}/red.log`, 'utf8').split('\n').slice(0, 6).map(line => line.split(': ')));
	const driver = withCopy(proven, copy => {
		const receipts = path.join(copy, '.scratch/receipts'); mkdirSync(receipts, { recursive: true });
		for (const file of ['red.log', 'green.log', 'test-patch.diff', 'guard.json']) copyFileSync(`${retained}/${file}`, path.join(receipts, file));
		return run(['node', 'scripts/foundation.mjs', '--scope', 'task', '--parent', parent, '--head', proven, '--evidence', receipts, '--json'], copy);
	});
	let report; try { report = JSON.parse(driver.output); } catch { report = null; }
	const file = path.join(out, 'u01a-task-report.json'); writeFileSync(file, driver.output);
	const groups = { FG01: ['red', 'green', 'guard', 'bootstrap', 'static'], FG02: ['contracts'], FG03: ['client'] };
	return ids.slice(0, 3).map(id => {
		const subject = `${retained.split('/').pop()}@${proven.slice(0, 12)}`, changed = changedSince(proven, id);
		if (!report) return observe(id, head, config, subject, 'blocked', ['driver_report_unreadable']);
		const failed = groups[id].filter(name => report.proofs.find(proof => proof.id === name)?.outcome !== 'pass');
		return observe(id, head, config, subject, failed.length ? 'fail' : 'pass', failed.map(name => `${name}_unverified`), { artifacts: [artifact(file)], changed });
	});
}

// FG04-FG05: the real U01b lanes, one run, each proof reading only the lane assertions its predicate names.
function u01b(head, config, out) {
	const run = spawnSync('node', ['scripts/project.mjs', 'project', 'lanes', '--unit', 'U01b', '--task', 'agora-s1-validate-project-evidence', '--artifacts', path.join(out, 'lanes')], { encoding: 'utf8', timeout: 900_000, maxBuffer: 8 * 1024 * 1024, env: environment() });
	let cli, rows = [];
	try { cli = JSON.parse(run.stdout); rows = json(path.join(out, 'lanes/lanes.json')).testResults.flatMap(suite => suite.assertionResults); } catch { cli = null; }
	return [['FG04', [1, 2, 3, 4]], ['FG05', [5, 6, 7]]].map(([id, lanes]) => {
		const subject = `project-lanes-${lanes[0]}-${lanes.at(-1)}`;
		if (!cli) return observe(id, head, config, subject, 'blocked', ['lane_report_unreadable']);
		const missing = lanes.filter(lane => !rows.some(row => row.fullName.startsWith(`project lane ${lane} `) && row.status === 'passed'));
		const ok = cli.outcome === 'pass' && !missing.length;
		return observe(id, head, config, subject, ok ? 'pass' : 'fail', ok ? [] : [cli.outcome === 'pass' ? `lane_${missing[0]}_unproven` : 'lanes_not_pass'], { artifacts: ok ? cli.artifacts : [] });
	});
}

// FG06-FG08 need enrollment, a separate host and humans. Presence of a record is never a pass.
function external(head, config) {
	const enrolled = json('agora/trusted-checks.json').projects.agora.reporter.app_id !== null;
	const unit = (id, file, subject, reason) => existsSync(file) ? observe(id, head, config, subject, 'blocked', [`${id}_unvalidated`]) : observe(id, head, config, subject, 'unavailable', [reason]);
	return [
		enrolled ? observe('FG06', head, config, 'trusted-reporting', 'blocked', ['FG06_unvalidated']) : observe('FG06', head, config, 'trusted-reporting', 'unavailable', ['FG06_reporting_unenrolled']),
		unit('FG07', 'evidence/U01c/outcome.json', 'separate-host-recovery', 'FG07_recovery_host_unapproved'),
		unit('FG08', 'evidence/U01d/outcome.json', 'browser-and-human-proof', 'FG08_browser_human_proof_absent'),
	];
}

export async function main(artifacts) {
	const head = command(['git', 'rev-parse', 'HEAD']).stdout.trim(), out = safe(artifacts ?? `.scratch/foundation-ready/${randomUUID()}`);
	mkdirSync(out, { recursive: true });
	const dirty = command(['git', 'status', '--porcelain', '--', '.', ':(exclude)evidence']).stdout.trim() !== '';
	let report;
	if (dirty) report = { ...aggregate({ head, config: '', observations: [] }), outcome: 'blocked', foundation_outcome: 'blocked', denials: ['source_dirty'] };
	else {
		try {
			const config = versions().config, observations = [...await u01a(head, config, out), ...u01b(head, config, out), ...external(head, config)];
			report = aggregate({ head, config: versions().config, observations });
		} catch (error) { report = { ...aggregate({ head, config: '', observations: [] }), outcome: 'infrastructure_failure', foundation_outcome: 'blocked', denials: [`probe_${String(error.message).slice(0, 100)}`] }; }
	}
	if (!wire.validate('FoundationReport', report).ok) report = { ...report, outcome: 'infrastructure_failure', denials: ['report_invalid'] };
	writeFileSync(path.join(out, 'foundation-ready.json'), JSON.stringify(report, null, 2) + '\n');
	console.log(JSON.stringify(report, null, 2));
	return exits[report.outcome];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const args = process.argv.slice(2);
	if (args.some(arg => ['--scope', '--parent', '--head', '--evidence'].includes(arg))) process.exit(spawnSync('node', ['scripts/foundation.mjs', ...args], { stdio: 'inherit' }).status ?? 70);
	process.exit(await main());
}
