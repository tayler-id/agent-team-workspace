import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import { afterAll, expect, test } from 'vitest';

// Namespaced non-production identities. 900001/900002 are not real GitHub App or repository IDs;
// 15368 is the public ID of the generic GitHub Actions App, which a candidate workflow can report as.
const APP = 900001;
const REPO = 900002;
const ACTIONS = 15368;
const HEAD = 'c'.repeat(40);
const BASE = 'b'.repeat(40);
const OLD = 'a'.repeat(40);
const BLOB = 'f'.repeat(40);
fs.mkdirSync('.scratch', { recursive: true });
const dir = fs.mkdtempSync('.scratch/trusted-checks-');
afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); });

interface Report { outcome: string; denials: string[]; receipt?: Record<string, unknown> }
const reporter = generateKeyPairSync('ed25519');
const candidate = generateKeyPairSync('ed25519');
const real = JSON.parse(fs.readFileSync('agora/trusted-checks.json', 'utf8')) as { projects: { agora: Record<string, Record<string, unknown>> } };
const project: Record<string, Record<string, unknown>> = { ...real.projects.agora, repository: { owner: 'agora-test', name: 'trusted-fixture', id: REPO, default_branch: 'main' }, reporter: { ...real.projects.agora['reporter'], app_id: APP, public_key: reporter.publicKey.export({ type: 'spki', format: 'pem' }) } };
const policyFile = path.join(dir, 'policy.json');
fs.writeFileSync(policyFile, JSON.stringify({ schema_version: 'agora.trusted-checks/v1', projects: { agora: project } }));
const jobs = (real.projects.agora as unknown as { driver: { jobs: string[] } }).driver.jobs;

let inputs = 0;
const evaluate = (kind: string, input: unknown, options: { policy?: string; script?: string; project?: string } = {}) => {
	const file = path.join(dir, `input-${String(inputs++)}.json`);
	fs.writeFileSync(file, JSON.stringify(input));
	const result = spawnSync(process.execPath, [options.script ?? 'scripts/trusted-checks.mjs', 'evaluate', '--policy', options.policy ?? policyFile, '--project', options.project ?? 'agora', '--kind', kind, '--input', file, '--json'], { encoding: 'utf8' });
	const report = JSON.parse(result.stdout) as Report;
	expect(result.status, result.stdout + result.stderr).toBe({ pass: 0, fail: 1, blocked: 2, unavailable: 3, usage_error: 64 }[report.outcome]);
	return report;
};
const denials = (kind: string, input: unknown, options = {}) => evaluate(kind, input, options).denials;
// Baseline operation through the same driver: the policy command reads the selected project.
const baseline = () => {
	const result = spawnSync(process.execPath, ['scripts/trusted-checks.mjs', 'policy', '--policy', policyFile, '--json'], { encoding: 'utf8' });
	expect(result.status, result.stdout + result.stderr).toBe(0);
	expect(JSON.parse(result.stdout)).toMatchObject({ outcome: 'pass', policy: { driver: { workflow: '.github/workflows/agora-ci.yml' }, reporter: { app_id: APP } } });
};

// The GitHub read-back the reporter assembles for one completed driver run.
const run = (change: Record<string, unknown> = {}) => ({
	repository_id: REPO, head_repository_id: REPO, event: 'pull_request', run_id: 77, run_attempt: 1,
	workflow_path: '.github/workflows/agora-ci.yml', workflow_blob: BLOB, trusted_workflow_blob: BLOB,
	head_sha: HEAD, base_sha: BASE, pull_request: { head_sha: HEAD, base_sha: BASE },
	jobs: jobs.map(name => ({ name, status: 'completed', conclusion: 'success', head_sha: HEAD })), ...change,
});
const withJob = (name: string, change: Record<string, unknown>) => run({ jobs: run().jobs.map(job => job.name === name ? { ...job, ...change } : job) });

// An independent statement of the signed bytes: keys sorted at every depth.
const canonical = (value: unknown): string => Array.isArray(value)
	? `[${value.map(canonical).join(',')}]`
	: value !== null && typeof value === 'object'
		? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
		: JSON.stringify(value);
const receipt = (change: Record<string, unknown> = {}) => ({ ...evaluate('run', run()).receipt, ...change });
const text = (key: KeyObject, body: Record<string, unknown>) => JSON.stringify({ receipt: body, signature: sign(null, Buffer.from(canonical(body)), key).toString('base64') });
const check = (name: string, change: Record<string, unknown> = {}) => ({ id: 10, name, app_id: APP, head_sha: HEAD, status: 'completed', conclusion: 'success', output: { text: text(reporter.privateKey, receipt()) }, ...change });
const checks = (runs: unknown[]) => ({ head_sha: HEAD, check_runs: runs });
const both = (change: Record<string, unknown> = {}) => ['agora/evidence', 'agora/policy'].map(name => check(name, change));

// The committed workflow files, optionally with one file replaced by an edited copy.
const DRIVER = '.github/workflows/agora-ci.yml';
const REPORTER = '.github/workflows/agora-report.yml';
const workflows = (change: Record<string, string> = {}) => ({ files: { [DRIVER]: fs.readFileSync(DRIVER, 'utf8'), [REPORTER]: fs.readFileSync(REPORTER, 'utf8'), ...change } });
interface Step { uses?: string; with?: Record<string, unknown>; env?: Record<string, string>; 'continue-on-error'?: boolean }
interface Job { steps: Step[]; needs?: string[]; if?: string; environment?: string; permissions?: unknown; 'continue-on-error'?: boolean }
interface Workflow { on: unknown; permissions: unknown; jobs: Record<string, Job> }
const at = <T>(value: T | undefined): T => { if (value === undefined) throw new Error('workflow fixture shape changed'); return value; };
const job = (w: Workflow, name: string) => at(w.jobs[name]);
const step = (w: Workflow, name: string, index: number) => at(job(w, name).steps[index]);
const edit = (file: string, change: (workflow: Workflow) => void) => { const value = JSON.parse(fs.readFileSync(file, 'utf8')) as Workflow; change(value); return { [file]: JSON.stringify(value, null, '\t') + '\n' }; };

const protection = (change: Record<string, unknown> = {}, reviews: Record<string, unknown> = {}) => ({
	required_status_checks: { strict: true, checks: [{ context: 'agora/evidence', app_id: APP }, { context: 'agora/policy', app_id: APP }] },
	enforce_admins: { enabled: true },
	required_pull_request_reviews: { dismiss_stale_reviews: true, require_code_owner_reviews: true, required_approving_review_count: 1, bypass_pull_request_allowances: { users: [], teams: [], apps: [] }, ...reviews },
	allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false }, ...change,
});

test('project lane 8 reads protection back against exact App IDs, review and no bypass', () => {
	baseline();
	expect(evaluate('protection', protection())).toMatchObject({ outcome: 'pass', denials: [] });
	expect(denials('protection', protection({ required_status_checks: { strict: false, checks: [{ context: 'agora/evidence', app_id: ACTIONS }] } }))).toEqual(['not_strict', 'required_check_missing:agora/policy', 'required_check_wrong_app:agora/evidence']);
	expect(denials('protection', protection({ enforce_admins: { enabled: false }, allow_force_pushes: { enabled: true }, allow_deletions: { enabled: true } }))).toEqual(['admins_bypass', 'deletion_allowed', 'force_push_allowed']);
	expect(denials('protection', protection({}, { dismiss_stale_reviews: false, require_code_owner_reviews: false, required_approving_review_count: 0, bypass_pull_request_allowances: { users: [{ login: 'someone' }], teams: [], apps: [] } }))).toEqual(['code_owners_not_required', 'review_bypass_allowed', 'reviews_insufficient', 'stale_reviews_kept']);
	expect(denials('protection', protection({ required_pull_request_reviews: undefined }))).toEqual(['reviews_insufficient']);
	expect(evaluate('protection', { error: { status: 403, message: 'Upgrade to GitHub Pro or make this repository public to enable this feature.' } })).toMatchObject({ outcome: 'blocked', denials: ['plan_upgrade_required'] });
	expect(evaluate('protection', { error: { status: 404, message: 'Branch not protected' } })).toMatchObject({ outcome: 'fail', denials: ['protection_missing'] });
	expect(evaluate('protection', { message: 'Upgrade to GitHub Pro or make this repository public to enable this feature.', documentation_url: 'https://docs.github.com/rest/branches/branch-protection#get-branch-protection', status: '403' })).toMatchObject({ outcome: 'blocked', denials: ['plan_upgrade_required'] });
	// The committed policy names no App or key yet, and the fixture repository does not exist: both block, never pass.
	expect(evaluate('protection', protection(), { policy: 'agora/trusted-checks.json' })).toMatchObject({ outcome: 'blocked', denials: ['reporting_app_unenrolled'] });
	expect(evaluate('protection', protection(), { policy: 'agora/trusted-checks.json', project: 'python-fixture' })).toMatchObject({ outcome: 'blocked', denials: ['repository_unprovisioned'] });
}, 60_000);

test('project lane 9 denies candidate-authored reports and wrong-workflow receipts', () => {
	baseline();
	expect(evaluate('checks', checks(both()))).toMatchObject({ outcome: 'pass', denials: [] });
	expect(denials('checks', checks(both({ app_id: ACTIONS, output: { text: text(candidate.privateKey, receipt()) } })))).toEqual(['wrong_producer:agora/evidence', 'wrong_producer:agora/policy']);
	expect(denials('checks', checks(both({ output: { text: text(candidate.privateKey, receipt()) } })))).toEqual(['receipt_signature_invalid:agora/evidence', 'receipt_signature_invalid:agora/policy']);
	expect(denials('checks', checks(both({ output: { text: null } })))).toEqual(['receipt_unsigned:agora/evidence', 'receipt_unsigned:agora/policy']);
	expect(denials('checks', checks(both({ output: { text: text(reporter.privateKey, receipt({ workflow_path: '.github/workflows/candidate.yml' })) } })))).toEqual(['receipt_mismatch:agora/evidence', 'receipt_mismatch:agora/policy']);
	expect(denials('run', run({ workflow_path: '.github/workflows/candidate.yml' }))).toEqual(['wrong_workflow']);
	expect(denials('run', run({ workflow_blob: 'e'.repeat(40) }))).toEqual(['workflow_revision_mismatch']);
	expect(denials('run', run({ event: 'pull_request_target' }))).toEqual(['wrong_event']);
	expect(denials('run', run({ head_repository_id: 31337 }))).toEqual(['fork_unsupported']);
	expect(denials('run', run({ repository_id: 31337 }))).toEqual(['fork_unsupported', 'wrong_repository']);
	// Credential isolation: the driver never names a secret, and the reporter never touches candidate code or artifacts.
	expect(evaluate('workflows', workflows(), { policy: 'agora/trusted-checks.json' })).toMatchObject({ outcome: 'pass', denials: [] });
	expect(denials('workflows', workflows(edit(DRIVER, w => { step(w, 'tests', 3).env = { KEY: '${{ secrets.AGORA_REPORTER_APP_KEY }}' }; })))).toEqual(['driver_secret_reference']);
	expect(denials('workflows', workflows(edit(DRIVER, w => { w.on = { pull_request_target: {} }; w.permissions = { contents: 'write', checks: 'write' }; })))).toEqual(['driver_permissions', 'driver_trigger']);
	expect(denials('workflows', workflows(edit(REPORTER, w => { at(step(w, 'report', 0).with)['ref'] = '${{ github.event.workflow_run.head_sha }}'; })))).toEqual(['reporter_candidate_reference']);
	expect(denials('workflows', workflows(edit(REPORTER, w => { at(step(w, 'report', 0).with)['ref'] = 'refs/pull/1/merge'; })))).toEqual(['reporter_candidate_reference']);
	expect(denials('workflows', workflows(edit(REPORTER, w => { job(w, 'report').steps.splice(2, 0, { uses: `actions/download-artifact@${BLOB}` }); delete job(w, 'report').environment; at(step(w, 'report', 3).env)['EXTRA'] = '${{ secrets.OTHER }}'; })))).toEqual(['reporter_environment', 'reporter_reads_candidate_artifact', 'reporter_unexpected_secret']);
	expect(denials('workflows', workflows(edit(DRIVER, w => { job(w, 'docs').steps[0] = { uses: 'actions/checkout@v7' }; })))).toEqual([`checkout_persists_credentials:${DRIVER}`, `unpinned_action:${DRIVER}:actions/checkout@v7`]);
	expect(denials('workflows', workflows({ [DRIVER]: 'name: agora-ci\non: pull_request\n' }))).toEqual([`workflow_not_canonical_json:${DRIVER}`]);
	expect(denials('workflows', workflows(edit(DRIVER, w => { job(w, 'tests').permissions = { checks: 'write' }; })))).toEqual(['driver_permissions']);
	expect(denials('workflows', workflows(edit(REPORTER, w => { w.on = { workflow_run: { workflows: ['agora-ci', 'candidate'], types: ['completed', 'requested'] } }; })))).toEqual(['reporter_trigger']);
	expect(denials('workflows', workflows(edit(REPORTER, w => { w.permissions = { actions: 'read', contents: 'read', 'pull-requests': 'read', checks: 'write' }; })))).toEqual(['reporter_permissions']);
	expect(denials('workflows', workflows(edit(REPORTER, w => { job(w, 'report').permissions = { contents: 'write' }; })))).toEqual(['reporter_permissions']);
	// Guard negative: in an isolated copy that trusts any App, the forged producer is no longer named.
	const source = fs.readFileSync('scripts/trusted-checks.mjs', 'utf8');
	const needle = 'row.app_id === project.reporter.app_id';
	expect(source.split(needle)).toHaveLength(2);
	const copy = path.join(dir, 'weakened-producer.mjs');
	fs.writeFileSync(copy, source.replace(needle, 'true'));
	expect(denials('checks', checks(both({ app_id: ACTIONS, output: { text: text(candidate.privateKey, receipt()) } })), { script: copy })).not.toContain('wrong_producer:agora/evidence');
}, 60_000);

test('project lane 10 fails a failed dependency and stale, neutral or skipped checks', () => {
	baseline();
	const pass = evaluate('run', run());
	expect(pass).toMatchObject({ outcome: 'pass', denials: [] });
	expect(pass.receipt).toMatchObject({ purpose: 'ci_verification', repository_id: REPO, head_sha: HEAD, base_sha: BASE, app_id: APP, run_id: 77, run_attempt: 1, workflow_blob: BLOB, outcome: 'pass' });
	expect(denials('run', run({ jobs: run().jobs.map(job => job.name === 'tests' ? { ...job, conclusion: 'failure' } : job.name === 'red-green' ? { ...job, conclusion: 'skipped' } : job) }))).toEqual(['job_not_success:red-green:skipped', 'job_not_success:tests:failure']);
	expect(evaluate('run', withJob('guards', { conclusion: 'neutral' })).receipt).toMatchObject({ outcome: 'fail' });
	expect(denials('run', withJob('docs', { head_sha: OLD }))).toEqual(['job_wrong_head:docs']);
	expect(denials('run', withJob('static', { status: 'in_progress', conclusion: null }))).toEqual(['job_incomplete:static']);
	expect(denials('run', run({ jobs: run().jobs.filter(job => job.name !== 'doctor') }))).toEqual(['job_missing:doctor']);
	expect(denials('run', run({ jobs: [...run().jobs, { name: 'tests', status: 'completed', conclusion: 'success', head_sha: HEAD }] }))).toEqual(['job_duplicate:tests']);
	expect(denials('run', run({ pull_request: { head_sha: 'd'.repeat(40), base_sha: BASE } }))).toEqual(['stale_head']);
	expect(denials('run', run({ pull_request: { head_sha: HEAD, base_sha: OLD } }))).toEqual(['stale_base']);
	expect(denials('run', run({ pull_request: null }))).toEqual(['pull_request_missing']);
	expect(denials('checks', checks([...both(), check('agora/evidence', { id: 11, conclusion: 'failure' })]))).toEqual(['check_not_success:agora/evidence:failure']);
	expect(denials('checks', checks([check('agora/evidence', { conclusion: 'neutral' }), check('agora/policy', { conclusion: 'skipped' })]))).toEqual(['check_not_success:agora/evidence:neutral', 'check_not_success:agora/policy:skipped']);
	expect(denials('checks', checks([check('agora/evidence', { head_sha: OLD }), check('agora/policy')]))).toEqual(['check_wrong_head:agora/evidence']);
	expect(denials('checks', checks([check('agora/evidence')]))).toEqual(['check_missing:agora/policy']);
	expect(denials('checks', checks(both({ output: { text: text(reporter.privateKey, receipt({ outcome: 'fail' })) } })))).toEqual(['receipt_mismatch:agora/evidence', 'receipt_mismatch:agora/policy']);
	// Required jobs run independently and cannot be made conditional, dependent or allowed to fail.
	expect(denials('workflows', workflows(edit(DRIVER, w => { job(w, 'red-green').needs = ['tests']; job(w, 'guards').if = 'success()'; job(w, 'docs')['continue-on-error'] = true; step(w, 'static', 3)['continue-on-error'] = true; })))).toEqual(['driver_continue_on_error:docs', 'driver_continue_on_error:static', 'driver_job_condition:guards', 'driver_job_needs:red-green']);
	expect(denials('workflows', workflows(edit(DRIVER, w => { w.jobs = Object.fromEntries(Object.entries(w.jobs).filter(([name]) => name !== 'doctor')); })))).toEqual(['driver_job_missing:doctor']);
	// Guard negative: in an isolated copy that accepts any conclusion, a skipped dependent job passes.
	const source = fs.readFileSync('scripts/trusted-checks.mjs', 'utf8');
	const needle = "job.conclusion === 'success'";
	expect(source.split(needle)).toHaveLength(2);
	const copy = path.join(dir, 'weakened-conclusion.mjs');
	fs.writeFileSync(copy, source.replace(needle, 'true'));
	expect(evaluate('run', withJob('red-green', { conclusion: 'skipped' }), { script: copy }).outcome).toBe('pass');
}, 60_000);
