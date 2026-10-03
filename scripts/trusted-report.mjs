// U01b.B03 trusted reporter (R11), run only by .github/workflows/agora-report.yml from the default branch.
// It reads one completed driver run back from GitHub, lets scripts/trusted-checks.mjs decide it in a child
// process that receives no credential, signs the ci_verification receipt with the project's Ed25519 reporting
// key and publishes agora/evidence and agora/policy as the project's checks-only App. It never checks out,
// downloads or executes candidate code, and never prints a key or token.
// Usage: node scripts/trusted-report.mjs --run-id ID [--policy FILE] [--project ID] [--api URL] --json
// Environment: GITHUB_TOKEN (read-only), AGORA_REPORTER_APP_KEY (App RSA key), AGORA_REPORTING_SIGNING_KEY (Ed25519 key)
import { spawnSync } from 'node:child_process';
import { createPrivateKey, createSign, sign } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const exits = { pass: 0, fail: 1, blocked: 2, usage_error: 64, infrastructure_failure: 70 };
const stop = (reason, outcome) => Object.assign(new Error(reason), { outcome });
const args = process.argv.slice(2).filter(arg => arg !== '--json');
const options = {};
let usage = false;
for (let i = 0; i < args.length; i += 2) {
	if (!['--run-id', '--policy', '--project', '--api'].includes(args[i]) || !args[i + 1] || options[args[i]]) usage = true;
	options[args[i]] = args[i + 1];
}
const policyFile = options['--policy'] ?? 'agora/trusted-checks.json';
const api = options['--api'] ?? 'https://api.github.com';
const report = { schema_version: 'agora.trusted-report/v1', project: options['--project'] ?? 'agora', run_id: Number(options['--run-id']), outcome: 'pass', denials: [], checks: [] };
const canonical = value => Array.isArray(value)
	? `[${value.map(canonical).join(',')}]`
	: value !== null && typeof value === 'object'
		? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
		: JSON.stringify(value);
const base64url = value => Buffer.from(value).toString('base64url');

async function github(route, credential, init = {}) {
	const response = await fetch(api + route, { ...init, headers: { accept: 'application/vnd.github+json', authorization: credential, 'x-github-api-version': '2022-11-28', ...(init.body ? { 'content-type': 'application/json' } : {}) }, signal: globalThis.AbortSignal.timeout(30_000) });
	if (!response.ok) throw stop(`github_${String(response.status)}:${route.split('?')[0]}`, 'infrastructure_failure');
	return response.json();
}

// The decision tool runs with PATH only, so nothing it executes can read the reporter's credentials.
function decide(project, kind, input) {
	const dir = mkdtempSync(path.join(os.tmpdir(), 'agora-report-'));
	try {
		const file = path.join(dir, 'input.json');
		writeFileSync(file, JSON.stringify(input), { mode: 0o600 });
		const result = spawnSync(process.execPath, ['scripts/trusted-checks.mjs', 'evaluate', '--policy', policyFile, '--project', report.project, '--kind', kind, '--input', file, '--json'], { encoding: 'utf8', env: { PATH: process.env.PATH ?? '' } });
		const decision = JSON.parse(result.stdout);
		if (result.status !== exits[decision.outcome]) throw stop('decision_exit_mismatch', 'infrastructure_failure');
		if (decision.outcome === 'blocked') throw stop(decision.denials[0], 'blocked');
		return decision;
	} finally { rmSync(dir, { recursive: true, force: true }); }
}

// A ten-minute App JWT exchanged for an installation token narrowed to this repository and checks: write.
async function installationToken(project, appKey) {
	const now = Math.floor(Date.now() / 1000);
	const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: project.reporter.app_id }))}`;
	const jwt = `Bearer ${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(appKey, 'base64url')}`;
	const { owner, name, id } = project.repository;
	const installation = await github(`/repos/${owner}/${name}/installation`, jwt);
	const token = await github(`/app/installations/${String(installation.id)}/access_tokens`, jwt, { method: 'POST', body: JSON.stringify({ repository_ids: [id], permissions: { checks: 'write' } }) });
	return `token ${token.token}`;
}

try {
	if (usage || !Number.isInteger(report.run_id) || report.run_id < 1) throw stop('usage_error', 'usage_error');
	const project = JSON.parse(readFileSync(policyFile, 'utf8')).projects?.[report.project];
	if (!project?.repository) throw stop('repository_unprovisioned', 'blocked');
	if (!Number.isInteger(project.reporter.app_id) || typeof project.reporter.public_key !== 'string') throw stop('reporting_app_unenrolled', 'blocked');
	const { GITHUB_TOKEN: readToken, AGORA_REPORTER_APP_KEY: appPem, AGORA_REPORTING_SIGNING_KEY: signingPem } = process.env;
	if (!readToken || !appPem || !signingPem) throw stop('reporting_credentials_missing', 'blocked');
	const read = `Bearer ${readToken}`;
	const repo = `/repos/${project.repository.owner}/${project.repository.name}`;
	const run = await github(`${repo}/actions/runs/${String(report.run_id)}`, read);
	const jobs = await github(`${repo}/actions/runs/${String(report.run_id)}/attempts/${String(run.run_attempt)}/jobs?per_page=100`, read);
	const opened = run.pull_requests?.[0];
	const current = opened ? await github(`${repo}/pulls/${String(opened.number)}`, read) : undefined;
	const file = async (filePath, ref) => github(`${repo}/contents/${filePath}?ref=${encodeURIComponent(ref)}`, read);
	const driverAtHead = await file(project.driver.workflow, run.head_sha);
	const trusted = Object.fromEntries(await Promise.all([project.driver.workflow, project.reporter.workflow].map(async filePath => [filePath, await file(filePath, project.repository.default_branch)])));
	const runDecision = decide(project, 'run', {
		repository_id: run.repository?.id, head_repository_id: run.head_repository?.id, event: run.event, run_id: run.id, run_attempt: run.run_attempt,
		workflow_path: run.path, workflow_blob: driverAtHead.sha, trusted_workflow_blob: trusted[project.driver.workflow].sha,
		head_sha: run.head_sha, base_sha: opened?.base?.sha, pull_request: current ? { head_sha: current.head.sha, base_sha: current.base.sha } : null,
		jobs: (jobs.jobs ?? []).map(job => ({ name: job.name, status: job.status, conclusion: job.conclusion, head_sha: job.head_sha })),
	});
	const policyDecision = decide(project, 'workflows', { files: Object.fromEntries(Object.entries(trusted).map(([filePath, body]) => [filePath, Buffer.from(body.content, body.encoding).toString('utf8')])) });
	const receipt = runDecision.receipt;
	const signed = JSON.stringify({ receipt, signature: sign(null, Buffer.from(canonical(receipt)), createPrivateKey(signingPem)).toString('base64') });
	const publish = await installationToken(project, createPrivateKey(appPem));
	for (const [name, decision] of [['agora/evidence', runDecision], ['agora/policy', policyDecision]]) {
		const conclusion = decision.outcome === 'pass' ? 'success' : 'failure';
		const summary = decision.denials.length ? `Denied: ${decision.denials.join(', ')}` : 'All required results passed on the exact head.';
		const created = await github(`${repo}/check-runs`, publish, { method: 'POST', body: JSON.stringify({ name, head_sha: run.head_sha, status: 'completed', conclusion, output: { title: name, summary, text: signed } }) });
		report.checks.push({ name, id: created.id, conclusion, denials: decision.denials });
	}
	report.head_sha = run.head_sha;
	report.denials = [...new Set([...runDecision.denials, ...policyDecision.denials])].sort();
	report.outcome = report.denials.length ? 'fail' : 'pass';
} catch (error) {
	report.outcome = error.outcome ?? 'infrastructure_failure';
	report.denials = [error.outcome ? error.message : 'reporter_error'];
}
console.log(JSON.stringify(report, null, 2));
process.exitCode = exits[report.outcome];
