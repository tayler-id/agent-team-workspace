import { spawn, spawnSync } from 'node:child_process';
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import * as fs from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { type AddressInfo } from 'node:net';
import path from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';

// Namespaced non-production identities: App 900001, repository 900002, installation 4242, generated keys.
const APP = 900001;
const REPO = 900002;
const HEAD = 'c'.repeat(40);
const BASE = 'b'.repeat(40);
const READ_TOKEN = 'fixture-read-token-not-a-credential';
const INSTALLATION_TOKEN = 'fixture-installation-token-not-a-credential';
const DRIVER = '.github/workflows/agora-ci.yml';
const REPORTER = '.github/workflows/agora-report.yml';
const appKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
const signingKey = generateKeyPairSync('ed25519');
const appPem = appKey.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const signingPem = signingKey.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
fs.mkdirSync('.scratch', { recursive: true });
const dir = fs.mkdtempSync('.scratch/trusted-report-');
const real = JSON.parse(fs.readFileSync('agora/trusted-checks.json', 'utf8')) as { projects: { agora: { driver: { jobs: string[] }; reporter: Record<string, unknown> } } };
const project = { ...real.projects.agora, repository: { owner: 'agora-test', name: 'trusted-fixture', id: REPO, default_branch: 'main' }, reporter: { ...real.projects.agora.reporter, app_id: APP, public_key: signingKey.publicKey.export({ type: 'spki', format: 'pem' }).toString() } };
const policyFile = path.join(dir, 'policy.json');
fs.writeFileSync(policyFile, JSON.stringify({ schema_version: 'agora.trusted-checks/v1', projects: { agora: project } }));

interface Seen { method: string; url: string; authorization: string; body: Record<string, unknown> }
interface Report { outcome: string; denials: string[]; checks: { name: string; conclusion: string }[] }
interface Published { name: string; head_sha: string; conclusion: string; output: { text: string } }
let seen: Seen[] = [];
let jobs: Record<string, unknown>[] = [];
let runPath = DRIVER;
const content = (file: string) => ({ sha: 'f'.repeat(40), encoding: 'base64', content: fs.readFileSync(file).toString('base64') });
const routes: Record<string, () => unknown> = {
	'GET /repos/agora-test/trusted-fixture/actions/runs/77': () => ({ id: 77, run_attempt: 1, event: 'pull_request', path: runPath, head_sha: HEAD, repository: { id: REPO }, head_repository: { id: REPO }, pull_requests: [{ number: 5, base: { sha: BASE } }] }),
	'GET /repos/agora-test/trusted-fixture/actions/runs/77/attempts/1/jobs?per_page=100': () => ({ jobs }),
	'GET /repos/agora-test/trusted-fixture/pulls/5': () => ({ head: { sha: HEAD }, base: { sha: BASE } }),
	[`GET /repos/agora-test/trusted-fixture/contents/${DRIVER}?ref=${HEAD}`]: () => content(DRIVER),
	[`GET /repos/agora-test/trusted-fixture/contents/${DRIVER}?ref=main`]: () => content(DRIVER),
	[`GET /repos/agora-test/trusted-fixture/contents/${REPORTER}?ref=main`]: () => content(REPORTER),
	'GET /repos/agora-test/trusted-fixture/installation': () => ({ id: 4242 }),
	'POST /app/installations/4242/access_tokens': () => ({ token: INSTALLATION_TOKEN }),
	'POST /repos/agora-test/trusted-fixture/check-runs': () => ({ id: seen.length }),
};
const server = createServer((request: IncomingMessage, response: ServerResponse) => {
	let text = '';
	request.on('data', (chunk: Buffer) => { text += chunk.toString(); });
	request.on('end', () => {
		const key = `${request.method ?? ''} ${request.url ?? ''}`;
		seen.push({ method: request.method ?? '', url: request.url ?? '', authorization: request.headers.authorization ?? '', body: text ? JSON.parse(text) as Record<string, unknown> : {} });
		const route = routes[key];
		response.writeHead(route ? 200 : 404, { 'content-type': 'application/json' }).end(JSON.stringify(route ? route() : { message: 'Not Found' }));
	});
});
let api = '';
beforeAll(async () => { await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); api = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`; });
afterAll(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(dir, { recursive: true, force: true }); });

const reporter = (env: Record<string, string>, policy = policyFile, script = 'scripts/trusted-report.mjs') => new Promise<{ status: number | null; output: string; report: Report }>(resolve => {
	seen = [];
	const child = spawn(process.execPath, [script, '--run-id', '77', '--policy', policy, '--api', api, '--json'], { env: { PATH: process.env['PATH'] ?? '', ...env } });
	let stdout = '', stderr = '';
	child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
	child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
	child.on('close', status => { resolve({ status, output: stdout + stderr, report: JSON.parse(stdout) as Report }); });
});
const credentials = { GITHUB_TOKEN: READ_TOKEN, AGORA_REPORTER_APP_KEY: appPem, AGORA_REPORTING_SIGNING_KEY: signingPem };
const success = () => project.driver.jobs.map(name => ({ name, status: 'completed', conclusion: 'success', head_sha: HEAD }));
const published = () => seen.filter(row => row.url.endsWith('/check-runs')).map(row => row.body as unknown as Published);
const exposed = (output: string) => [appPem, signingPem, READ_TOKEN, INSTALLATION_TOKEN].some(secret => output.includes(secret) || output.includes(secret.split('\n')[1] ?? secret));
// The merge-side decision over what the reporter published, through the same public CLI.
const mergeSide = (runs: Published[]) => {
	const file = path.join(dir, `checks-${String(Date.now())}.json`);
	fs.writeFileSync(file, JSON.stringify({ head_sha: HEAD, check_runs: runs.map((run, index) => ({ id: index + 1, app_id: APP, status: 'completed', ...run })) }));
	return JSON.parse(spawnSync(process.execPath, ['scripts/trusted-checks.mjs', 'evaluate', '--policy', policyFile, '--kind', 'checks', '--input', file, '--json'], { encoding: 'utf8' }).stdout) as { outcome: string; denials: string[] };
};

test('reporter publishes signed exact-head checks as the App and they satisfy the merge-side read-back', async () => {
	jobs = success(); runPath = DRIVER;
	const result = await reporter(credentials);
	expect(result.report).toMatchObject({ outcome: 'pass', denials: [], checks: [{ name: 'agora/evidence', conclusion: 'success' }, { name: 'agora/policy', conclusion: 'success' }] });
	expect(result.status).toBe(0);
	expect(exposed(result.output)).toBe(false);
	// Reads use the read-only token; the App JWT only mints a token narrowed to this repository and checks: write.
	expect(seen.filter(row => row.method === 'GET' && !row.url.endsWith('/installation')).every(row => row.authorization === `Bearer ${READ_TOKEN}`)).toBe(true);
	const mint = seen.find(row => row.url === '/app/installations/4242/access_tokens');
	expect(mint?.body).toEqual({ repository_ids: [REPO], permissions: { checks: 'write' } });
	const [header, claims, signature] = (mint?.authorization ?? '').replace('Bearer ', '').split('.');
	expect(verify('RSA-SHA256', Buffer.from(`${header ?? ''}.${claims ?? ''}`), appKey.publicKey, Buffer.from(signature ?? '', 'base64url'))).toBe(true);
	expect(JSON.parse(Buffer.from(claims ?? '', 'base64url').toString())).toMatchObject({ iss: APP });
	expect(seen.filter(row => row.method === 'POST' && row.url.endsWith('/check-runs')).map(row => row.authorization)).toEqual([`token ${INSTALLATION_TOKEN}`, `token ${INSTALLATION_TOKEN}`]);
	const runs = published();
	expect(runs.map(run => [run.name, run.head_sha, run.conclusion])).toEqual([['agora/evidence', HEAD, 'success'], ['agora/policy', HEAD, 'success']]);
	const signed = JSON.parse(at(runs[0]).output.text) as { receipt: Record<string, unknown>; signature: string };
	expect(signed.receipt).toMatchObject({ purpose: 'ci_verification', repository_id: REPO, head_sha: HEAD, base_sha: BASE, app_id: APP, run_id: 77, outcome: 'pass' });
	expect(verify(null, Buffer.from(canonicalJson(signed.receipt)), createPublicKey(project.reporter.public_key), Buffer.from(signed.signature, 'base64'))).toBe(true);
	expect(mergeSide(runs)).toEqual(expect.objectContaining({ outcome: 'pass', denials: [] }));
}, 60_000);

test('the decision process cannot read the reporter credentials', async () => {
	jobs = success(); runPath = DRIVER;
	// Every Node process that inherits NODE_OPTIONS records whether it can see the signing key.
	const canary = path.resolve(dir, 'canary.cjs'), log = path.resolve(dir, 'canary.log');
	fs.writeFileSync(canary, `require('node:fs').appendFileSync(${JSON.stringify(log)}, String(Boolean(process.env.AGORA_REPORTING_SIGNING_KEY)) + '\\n');`);
	const watched = { ...credentials, NODE_OPTIONS: `--require=${canary}` };
	expect((await reporter(watched)).report.outcome).toBe('pass');
	expect(fs.readFileSync(log, 'utf8')).toBe('true\n');
	// Guard negative: a copy that hands the decision process the whole environment is caught.
	const source = fs.readFileSync('scripts/trusted-report.mjs', 'utf8'), needle = "env: { PATH: process.env.PATH ?? '' }";
	expect(source.split(needle)).toHaveLength(2);
	const copy = path.join(dir, 'weakened-env.mjs');
	fs.writeFileSync(copy, source.replace(needle, 'env: process.env'));
	fs.rmSync(log);
	expect((await reporter(watched, policyFile, copy)).report.outcome).toBe('pass');
	expect(fs.readFileSync(log, 'utf8')).toBe('true\ntrue\ntrue\n');
}, 60_000);

test('reporter publishes failing checks for a failed dependency or a candidate workflow, and merge refuses them', async () => {
	jobs = success().map(job => job.name === 'tests' ? { ...job, conclusion: 'failure' } : job.name === 'red-green' ? { ...job, conclusion: 'skipped' } : job);
	const failed = await reporter(credentials);
	expect(failed.report).toMatchObject({ outcome: 'fail', denials: ['job_not_success:red-green:skipped', 'job_not_success:tests:failure'] });
	expect(failed.status).toBe(1);
	expect(published().map(run => run.conclusion)).toEqual(['failure', 'success']);
	expect(mergeSide(published()).denials).toEqual(['check_not_success:agora/evidence:failure', 'receipt_mismatch:agora/policy']);
	jobs = success(); runPath = '.github/workflows/candidate.yml';
	const foreign = await reporter(credentials);
	expect(foreign.report).toMatchObject({ outcome: 'fail', denials: ['wrong_workflow'] });
	expect(exposed(failed.output + foreign.output)).toBe(false);
	runPath = DRIVER;
}, 60_000);

test('reporter without its credentials or enrollment blocks and publishes nothing', async () => {
	jobs = success();
	const missing = await reporter({ GITHUB_TOKEN: READ_TOKEN, AGORA_REPORTING_SIGNING_KEY: signingPem });
	expect(missing.report).toMatchObject({ outcome: 'blocked', denials: ['reporting_credentials_missing'] });
	expect(missing.status).toBe(2);
	expect(seen).toEqual([]);
	const unenrolled = await reporter(credentials, 'agora/trusted-checks.json');
	expect(unenrolled.report).toMatchObject({ outcome: 'blocked', denials: ['reporting_app_unenrolled'] });
	expect(seen).toEqual([]);
	expect(exposed(missing.output + unenrolled.output)).toBe(false);
}, 60_000);

function at<T>(value: T | undefined): T { if (value === undefined) throw new Error('missing fixture value'); return value; }
function canonicalJson(value: unknown): string {
	return Array.isArray(value)
		? `[${value.map(canonicalJson).join(',')}]`
		: value !== null && typeof value === 'object'
			? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`
			: JSON.stringify(value);
}
