// U01b.B03 trusted-check decisions (R11): aggregate a driver run, read back published checks and branch
// protection, and check the driver and reporter workflows. Pure over GitHub read-back JSON; this file never
// holds or reads a credential.
// Self-contained on purpose: guard-negative tests run weakened copies of it from a scratch directory.
// Usage: node scripts/trusted-checks.mjs policy|evaluate [--policy FILE] [--project ID] [--kind run|checks|protection|workflows] [--input FILE]
import { createHash, createPublicKey, verify } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';

const exits = { pass: 0, fail: 1, blocked: 2, unavailable: 3, usage_error: 64 };
const stop = (reason, outcome) => Object.assign(new Error(reason), { outcome });
const canonical = value => Array.isArray(value)
	? `[${value.map(canonical).join(',')}]`
	: value !== null && typeof value === 'object'
		? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
		: JSON.stringify(value);
const policyDigest = project => `sha256:${createHash('sha256').update(canonical(project)).digest('hex')}`;

// The reporter's decision for one completed driver run. Job conclusions come from GitHub's jobs API, never
// from files the candidate's jobs uploaded; the driver workflow must be byte-identical to the default branch's.
function evaluateRun(project, run) {
	const denials = [];
	if (run.repository_id !== project.repository.id) denials.push('wrong_repository');
	if (run.head_repository_id !== run.repository_id) denials.push('fork_unsupported');
	if (run.event !== project.driver.event) denials.push('wrong_event');
	if (run.workflow_path !== project.driver.workflow) denials.push('wrong_workflow');
	else if (!run.workflow_blob || run.workflow_blob !== run.trusted_workflow_blob) denials.push('workflow_revision_mismatch');
	if (!run.pull_request) denials.push('pull_request_missing');
	else {
		if (run.pull_request.head_sha !== run.head_sha) denials.push('stale_head');
		if (run.pull_request.base_sha !== run.base_sha) denials.push('stale_base');
	}
	for (const name of project.driver.jobs) {
		const rows = (run.jobs ?? []).filter(job => job.name === name);
		const job = rows[0];
		if (!job) denials.push(`job_missing:${name}`);
		else if (rows.length > 1) denials.push(`job_duplicate:${name}`);
		else if (job.head_sha !== run.head_sha) denials.push(`job_wrong_head:${name}`);
		else if (job.status !== 'completed') denials.push(`job_incomplete:${name}`);
		else if (!(job.conclusion === 'success')) denials.push(`job_not_success:${name}:${String(job.conclusion)}`);
	}
	const outcome = denials.length ? 'fail' : 'pass';
	const receipt = {
		schema_version: 'agora.ci-receipt/v1', purpose: 'ci_verification', repository_id: run.repository_id, head_sha: run.head_sha, base_sha: run.base_sha,
		workflow_path: run.workflow_path, workflow_blob: run.workflow_blob, run_id: run.run_id, run_attempt: run.run_attempt,
		app_id: project.reporter.app_id, policy_digest: policyDigest(project), outcome,
		jobs: (run.jobs ?? []).map(job => ({ name: job.name, conclusion: job.conclusion ?? null })),
	};
	return { denials, receipt };
}

// Merge-side read-back of published check runs: the latest run of each required name from the exact App,
// on the exact head, successful, carrying a receipt signed by the enrolled reporting key for this head.
function evaluateChecks(project, input) {
	const denials = [];
	const key = createPublicKey(project.reporter.public_key);
	for (const name of project.reporter.checks) {
		const named = (input.check_runs ?? []).filter(row => row.name === name);
		const trusted = named.filter(row => row.app_id === project.reporter.app_id).sort((a, b) => b.id - a.id);
		const latest = trusted[0];
		if (!latest) { denials.push(named.length ? `wrong_producer:${name}` : `check_missing:${name}`); continue; }
		if (latest.head_sha !== input.head_sha) { denials.push(`check_wrong_head:${name}`); continue; }
		if (latest.status !== 'completed' || latest.conclusion !== 'success') { denials.push(`check_not_success:${name}:${String(latest.conclusion)}`); continue; }
		let signed;
		try { signed = JSON.parse(latest.output?.text); } catch { signed = undefined; }
		if (!signed?.receipt || typeof signed.signature !== 'string') { denials.push(`receipt_unsigned:${name}`); continue; }
		if (!verify(null, Buffer.from(canonical(signed.receipt)), key, Buffer.from(signed.signature, 'base64'))) { denials.push(`receipt_signature_invalid:${name}`); continue; }
		const body = signed.receipt;
		const expected = { schema_version: 'agora.ci-receipt/v1', purpose: 'ci_verification', repository_id: project.repository.id, head_sha: input.head_sha, workflow_path: project.driver.workflow, app_id: project.reporter.app_id, policy_digest: policyDigest(project), outcome: 'pass' };
		if (Object.entries(expected).some(([field, value]) => body[field] !== value)) denials.push(`receipt_mismatch:${name}`);
	}
	return { denials };
}

// Lane 8 read-back of GET /repos/{owner}/{repo}/branches/{branch}/protection, or the error GitHub returned.
// GitHub's own error body ({message, status}) is accepted as returned, so `gh api ... > FILE` feeds it directly.
function evaluateProtection(project, input) {
	const error = input.error ?? (typeof input.message === 'string' && !input.url ? { status: Number(input.status), message: input.message } : undefined);
	if (error) {
		if (error.status === 403 && /Upgrade to GitHub Pro/.test(error.message)) throw stop('plan_upgrade_required', 'blocked');
		if (error.status === 404) return { denials: ['protection_missing'] };
		throw stop('protection_unreadable', 'blocked');
	}
	const denials = [];
	const want = project.protection;
	const status = input.required_status_checks ?? {};
	if (want.strict && status.strict !== true) denials.push('not_strict');
	for (const name of project.reporter.checks) {
		const rows = (status.checks ?? []).filter(row => row.context === name);
		if (!rows.length) denials.push(`required_check_missing:${name}`);
		else if (rows.some(row => row.app_id !== project.reporter.app_id)) denials.push(`required_check_wrong_app:${name}`);
	}
	if (want.enforce_admins && input.enforce_admins?.enabled !== true) denials.push('admins_bypass');
	if (input.allow_force_pushes?.enabled !== false) denials.push('force_push_allowed');
	if (input.allow_deletions?.enabled !== false) denials.push('deletion_allowed');
	const reviews = input.required_pull_request_reviews;
	if (!reviews) denials.push('reviews_insufficient');
	else {
		if ((reviews.required_approving_review_count ?? 0) < want.required_approving_review_count) denials.push('reviews_insufficient');
		if (want.dismiss_stale_reviews && reviews.dismiss_stale_reviews !== true) denials.push('stale_reviews_kept');
		if (want.require_code_owner_reviews && reviews.require_code_owner_reviews !== true) denials.push('code_owners_not_required');
		const bypass = reviews.bypass_pull_request_allowances ?? {};
		if (['users', 'teams', 'apps'].some(kind => (bypass[kind] ?? []).length > 0)) denials.push('review_bypass_allowed');
	}
	return { denials };
}

// Static policy over the driver and reporter workflow texts (agora/policy). Workflows are authored in the JSON
// subset of YAML and must equal their canonical serialization, so this parses exactly what GitHub parses.
function evaluateWorkflows(project, input) {
	const denials = [];
	const parsed = {};
	for (const file of [project.driver.workflow, project.reporter.workflow]) {
		const text = input.files?.[file];
		try { parsed[file] = JSON.parse(text); } catch { parsed[file] = undefined; }
		if (!parsed[file] || JSON.stringify(parsed[file], null, '\t') + '\n' !== text) { denials.push(`workflow_not_canonical_json:${file}`); continue; }
		for (const job of Object.values(parsed[file].jobs ?? {})) {
			for (const uses of [job.uses, ...(job.steps ?? []).map(step => step.uses)].filter(Boolean)) {
				if (!/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/.test(uses)) denials.push(`unpinned_action:${file}:${uses}`);
			}
			if ((job.steps ?? []).some(step => step.uses?.startsWith('actions/checkout@') && step.with?.['persist-credentials'] !== false)) denials.push(`checkout_persists_credentials:${file}`);
		}
	}
	const driver = parsed[project.driver.workflow];
	if (driver) {
		const text = input.files[project.driver.workflow];
		if (canonical(Object.keys(driver.on ?? {})) !== canonical([project.driver.event])) denials.push('driver_trigger');
		if (canonical(driver.permissions) !== canonical({ contents: 'read' })) denials.push('driver_permissions');
		if (/\bsecrets\b|github\.token/.test(text)) denials.push('driver_secret_reference');
		for (const [name, job] of Object.entries(driver.jobs ?? {})) {
			if (job.permissions !== undefined) denials.push('driver_permissions');
			if (!project.driver.jobs.includes(name)) continue;
			if (job.needs !== undefined) denials.push(`driver_job_needs:${name}`);
			if (job.if !== undefined) denials.push(`driver_job_condition:${name}`);
			if (job['continue-on-error'] !== undefined || (job.steps ?? []).some(step => step['continue-on-error'] !== undefined)) denials.push(`driver_continue_on_error:${name}`);
		}
		for (const name of project.driver.jobs) if (!driver.jobs?.[name]) denials.push(`driver_job_missing:${name}`);
	}
	const reporter = parsed[project.reporter.workflow];
	if (reporter) {
		const text = input.files[project.reporter.workflow];
		const jobs = Object.values(reporter.jobs ?? {});
		const steps = jobs.flatMap(job => job.steps ?? []);
		if (canonical(reporter.on) !== canonical({ workflow_run: { workflows: [project.driver.name], types: ['completed'] } })) denials.push('reporter_trigger');
		if (canonical(reporter.permissions) !== canonical({ actions: 'read', contents: 'read', 'pull-requests': 'read' }) || jobs.some(job => job.permissions !== undefined)) denials.push('reporter_permissions');
		if (jobs.length !== 1 || jobs[0].environment !== project.reporter.environment) denials.push('reporter_environment');
		const candidateCheckout = steps.some(step => step.uses?.startsWith('actions/checkout@') && step.with?.ref !== '${{ github.event.repository.default_branch }}');
		if (candidateCheckout || /workflow_run\.(head_|pull_requests)|head_repository|pull_request\.head|github\.head_ref/.test(text)) denials.push('reporter_candidate_reference');
		if (/download-artifact|\/artifacts\b/.test(text)) denials.push('reporter_reads_candidate_artifact');
		if ([...text.matchAll(/secrets\.(\w+)/g)].some(([, name]) => !project.reporter.secrets.includes(name))) denials.push('reporter_unexpected_secret');
	}
	return { denials };
}

function loadProject(file, id) {
	const policy = JSON.parse(readFileSync(file, 'utf8'));
	const project = policy.projects?.[id];
	if (policy.schema_version !== 'agora.trusted-checks/v1' || !project) throw stop('policy_invalid', 'blocked');
	return project;
}

// A project without its repository, App ID or reporting key is a blocked prerequisite, never a pass.
function requireEnrolled(project) {
	if (!project.repository) throw stop('repository_unprovisioned', 'blocked');
	if (!Number.isInteger(project.reporter.app_id) || typeof project.reporter.public_key !== 'string') throw stop('reporting_app_unenrolled', 'blocked');
}

const evaluators = { run: evaluateRun, checks: evaluateChecks, protection: evaluateProtection, workflows: evaluateWorkflows };
const [command, ...rest] = process.argv.slice(2).filter(arg => arg !== '--json');
const options = {};
let usage = false;
for (let i = 0; i < rest.length; i += 2) {
	if (!['--policy', '--project', '--kind', '--input'].includes(rest[i]) || !rest[i + 1] || options[rest[i]]) usage = true;
	options[rest[i]] = rest[i + 1];
}
const report = { schema_version: 'agora.trusted-checks-report/v1', command: command ?? null, project: options['--project'] ?? 'agora', outcome: 'pass', denials: [] };
try {
	if (usage || !['policy', 'evaluate'].includes(command) || (command === 'evaluate' && !(Object.hasOwn(evaluators, options['--kind'] ?? '') && options['--input']))) throw stop('usage_error', 'usage_error');
	const project = loadProject(options['--policy'] ?? 'agora/trusted-checks.json', report.project);
	if (command === 'policy') report.policy = project;
	else {
		if (options['--kind'] !== 'workflows') requireEnrolled(project);
		report.kind = options['--kind'];
		const result = evaluators[report.kind](project, JSON.parse(readFileSync(options['--input'], 'utf8')));
		report.denials = [...new Set(result.denials)].sort();
		report.outcome = report.denials.length ? 'fail' : 'pass';
		if (result.receipt) report.receipt = result.receipt;
	}
} catch (error) {
	report.outcome = error.outcome ?? 'blocked';
	report.denials = [error.outcome ? error.message : 'input_invalid'];
}
console.log(JSON.stringify(report, null, 2));
process.exitCode = exits[report.outcome];
