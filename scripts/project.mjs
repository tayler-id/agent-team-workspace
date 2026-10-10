// R12 project-owned fixture control. Reports are owner-attested, never publication authority.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, realpathSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
const commands = ['doctor', 'scenarios', 'start', 'verify', 'evidence', 'stop', 'lanes'];
const args = process.argv.slice(2).filter(arg => arg !== '--' && arg !== '--json');
if (args[0] === 'project') args.shift();
const action = args.shift();
if ((['--help', '-h'].includes(action) && args.length === 0) || (commands.includes(action) && args.length === 1 && ['--help', '-h'].includes(args[0]))) {
	console.log(`Usage: pnpm -s agora project COMMAND [OPTIONS] --json

Implemented local fixture controls, not production authority.
Run operational commands from the repository root after installing locked prerequisites.
Help is plain text, needs no install or database, and starts nothing.

  doctor     Read-only Node 24/PostgreSQL 18 prerequisites (--fixture python for Python).
  scenarios  Inventory: policy, controls, guards.
  start      --profile verify --instance UUID; returns URL and cleanup handle.
  verify     --scenario policy --instance UUID --artifacts DIRECTORY; HTTP allow/deny effects.
  verify     --scenario controls|guards --artifacts DIRECTORY; native tests and guard negatives.
  evidence   --instance UUID; same-instance, fresh bytes and artifact digests required.
  stop       --instance UUID --handle CLEANUP_HANDLE; owned, idempotent cleanup only.
  lanes      --unit U01b --task TASK --artifacts DIRECTORY; task-specific qualification.

TASK: agora-s1-isolate-development (lanes 1-4), agora-s1-validate-project-evidence (1-7).
Whole-unit lanes 8-10 unavailable; a task pass never qualifies the whole unit.
Options: --fixture agora|python, --instance, --profile, --scenario, --artifacts,
         --handle, --unit, --task. Artifact directories must be under .scratch/ or evidence/.
Operational reports: agora.cli-report/v1 JSON; exits 0 pass, 1 fail, 2 blocked,
3 unavailable, 64 usage error, 70 infrastructure failure.
Recipe: .agents/skills/verify-agora/SKILL.md. Coverage: agora/feature-map.json.`);
	process.exit(0);
}
const { artifact, checkEvidence, command, environment, exits, json, mapped, requireThat, safe, validateReport, versions, wire, writeState } = await import('./project-checks.mjs');
const options = {}; let invalid = false;
for (let i = 0; i < args.length; i += 2) {
	if (!['--instance', '--scenario', '--profile', '--artifacts', '--fixture', '--handle', '--unit', '--task'].includes(args[i]) || !args[i + 1] || options[args[i]]) invalid = true;
	options[args[i]] = args[i + 1];
}
const report = { schema_version: 'agora.cli-report/v1', command: commands.includes(action) ? action : 'doctor', versions: versions(), outcome: 'pass', diagnostics: [], artifacts: [], started_at: new Date().toISOString(), finished_at: new Date().toISOString() };
const fixture = options['--fixture'] ?? 'agora', id = options['--instance'];
const save = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const instanceView = state => Object.fromEntries(['root', 'pid', 'process_start', 'url', 'database', 'object_namespace'].map(key => [key, state[key]]).concat([['cleanup_handle', state.handle]]));
function doctor() {
	requireThat(process.versions.node.startsWith('24.'), 'Node 24 required', 'blocked');
	const argv = fixture === 'python' ? ['python3', '-c', 'import jsonschema, sqlite3'] : [process.env.AGORA_PG_BIN ? path.join(process.env.AGORA_PG_BIN, 'pg_ctl') : 'pg_ctl', '--version'];
	const probe = command(argv); requireThat(probe.status === 0 && (fixture === 'python' || /PostgreSQL\) 18\./.test(probe.stdout)), fixture === 'python' ? 'Python/jsonschema prerequisite' : 'PostgreSQL 18 prerequisite', 'blocked');
}
async function control(state, operation) {
	requireThat(state.owner === realpathSync('.') && state.id === id && state.fixture === fixture, 'foreign_owner');
	return new Promise((resolve, reject) => {
		const req = request({ socketPath: path.join(state.root, 'control.sock'), path: '/' + operation, method: operation === 'stop' ? 'POST' : 'GET', headers: { 'x-agora-handle': state.handle }, timeout: 30_000 }, res => {
			let text = ''; res.on('data', bytes => { text += bytes; }); res.on('end', () => { try { requireThat(res.statusCode === 200, 'ownership_refused'); resolve(JSON.parse(text)); } catch (error) { reject(error); } });
		}); req.on('error', reject); req.on('timeout', () => req.destroy(new Error('control_timeout'))); req.end();
	});
}
try {
	requireThat(!invalid && commands.includes(action) && ['agora', 'python'].includes(fixture), 'usage_error', 'usage_error');
	if (id) { requireThat(wire.validate('Uuid', id).ok, 'invalid_instance', 'usage_error'); report.run_id = id; }
	if (options['--scenario']) report.scenario_id = options['--scenario'];
	if (action === 'doctor') doctor();
	else if (action === 'scenarios') report.scenarios = mapped().scenarios;
	else if (action === 'lanes' || (action === 'verify' && ['controls', 'guards'].includes(options['--scenario']))) {
		const manifest = mapped(); requireThat(!options['--unit'] || options['--unit'] === 'U01b', 'unit_unavailable', 'unavailable');
		const out = safe(options['--artifacts'] ?? `.scratch/project-lanes/${randomUUID()}`); mkdirSync(out, { recursive: true });
		const file = path.join(out, 'lanes.json'); requireThat(!existsSync(file), 'evidence_exists');
		const run = command([...manifest.driver, '--reporter=json', '--outputFile=' + file]);
		save(path.join(out, 'command.json'), { argv: manifest.driver, exit: run.status, stdout: run.stdout, stderr: run.stderr });
		const native = json(file); report.artifacts = [artifact(file), artifact(path.join(out, 'command.json'))];
		if (existsSync('.scratch/project-guards.json')) { save(path.join(out, 'guards.json'), json('.scratch/project-guards.json')); report.artifacts.push(artifact(path.join(out, 'guards.json'))); }
		const assertions = native.testResults.flatMap(suite => suite.assertionResults);
		requireThat(run.status === 0 && native.numFailedTests === 0 && native.numPendingTests === 0 && assertions.length === manifest.lanes.length + 1 && assertions.every(row => row.status === 'passed') && manifest.lanes.every(lane => assertions.some(row => row.fullName.startsWith(`project lane ${lane.id} `))), 'lane_failed');
		const unlockedThroughLane = { 'agora-s1-isolate-development': 4, 'agora-s1-validate-project-evidence': 7, 'agora-s1-qualify-trusted-checks': 10 };
		if (action === 'lanes') requireThat(unlockedThroughLane[options['--task']], 'unknown task; known tasks unlock lanes 1-4, 1-7 or 1-10', 'blocked');
	} else {
		requireThat(action !== 'verify' || options['--scenario'] === 'policy', 'unknown_scenario', 'usage_error');
		requireThat(id, 'instance_required', 'usage_error');
		const registry = safe(`.scratch/project/${fixture}/${id}`), stateFile = path.join(registry, 'state.json');
		if (action === 'start') {
			requireThat(options['--profile'] === 'verify', 'profile_required', 'usage_error'); doctor(); mapped();
			requireThat(!existsSync(registry), 'instance_exists'); mkdirSync(registry, { recursive: true, mode: 0o700 });
			const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'agora-b01-')));
			const state = { id, fixture, owner: realpathSync('.'), root, handle: randomUUID(), phase: 'starting', versions: report.versions };
			save(stateFile, state);
			const log = openSync(path.join(registry, 'host.log'), 'wx', 0o600);
			const host = spawn(process.execPath, ['scripts/project-host.mjs', registry], { detached: true, stdio: ['ignore', log, log], env: environment() }); closeSync(log); host.unref();
			let ready;
			for (let n = 0; n < 600; n++) { ready = json(stateFile); if (ready.phase !== 'starting') break; await sleep(100); }
			requireThat(ready.phase === 'ready', 'instance_start_failed', 'infrastructure_failure');
			assert.deepEqual(await control(ready, 'inspect'), ready);
			const health = await fetch(ready.url + '/api/v1/health/ready', { headers: { 'x-agora-handle': ready.handle }, signal: globalThis.AbortSignal.timeout(10_000) });
			assert.equal(health.status, 200); assert.equal((await health.json()).status, 'ready'); report.instance = instanceView(ready);
		} else {
			requireThat(existsSync(stateFile), 'instance_unknown'); const state = json(stateFile);
			requireThat(state.owner === realpathSync('.') && state.id === id && state.fixture === fixture, 'foreign_owner');
			if (action === 'stop') {
				requireThat(options['--handle'] === state.handle, 'foreign_cleanup');
				if (state.phase !== 'removed') {
					const live = await control(state, 'inspect'); requireThat(live.pid === state.pid && live.process_start === state.process_start && live.root === state.root, 'process_identity_mismatch');
					report.cleanup = await control(state, 'stop');
				} else report.cleanup = { outcome: 'removed', handle: state.handle };
				requireThat(!existsSync(state.root), 'cleanup_unconfirmed');
			} else if (action === 'evidence') {
				mapped(); requireThat(existsSync(path.join(registry, 'evidence.json')), 'verification_required', 'blocked');
				report.artifacts = checkEvidence(json(path.join(registry, 'evidence.json')), state);
				report.cleanup = { outcome: state.phase === 'removed' ? 'removed' : 'retained', handle: state.handle };
			} else {
				mapped(); requireThat(state.phase === 'ready' && JSON.stringify(state.versions) === JSON.stringify(report.versions), 'stale_instance');
				assert.deepEqual(await control(state, 'inspect'), state);
				const out = safe(options['--artifacts'] ?? `.scratch/project-artifacts/${id}`); mkdirSync(out, { recursive: true });
				const observed = [], fetchJSON = async (route, body) => {
					const response = await fetch(state.url + route, { headers: { 'x-agora-handle': state.handle, 'content-type': 'application/json' }, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}), signal: globalThis.AbortSignal.timeout(10_000) });
					return { status: response.status, body: await response.json() };
				};
				assert.deepEqual(await fetchJSON('/api/v1/health/ready'), { status: 200, body: { schema_version: 'agora.readiness/v1', status: 'ready', checks: { database: 'ok' } } });
				const before = await fetchJSON('/api/v1/fixture/effects'); assert.equal(before.status, 200);
				for (const subject of [id, randomUUID()]) {
					const result = await fetchJSON('/api/v1/fixture/policy/decisions', { schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: id }, subject: { scope_id: subject } });
					assert.equal(result.status, 200); requireThat(wire.validate('FixturePolicyDecisionReport', result.body).ok, 'response_invalid'); observed.push(result.body);
				}
				assert.equal(observed[0].decision, 'allow'); assert.equal(observed[1].decision, 'deny'); assert.equal(observed[1].reason_code, 'scope_mismatch');
				const persisted = (await fetchJSON('/api/v1/fixture/effects')).body; requireThat(wire.validate('FixtureEffects', persisted).ok, 'effects_invalid'); assert.equal(persisted.length, before.body.length + 2);
				assert.deepEqual(persisted.slice(-2), observed.map(row => ({ report: row, object: row })));
				assert.equal((await fetchJSON('/api/v1/fixture/policy/decisions', { unknown: true })).status, 400);
				requireThat(JSON.stringify(versions()) === JSON.stringify(report.versions), 'source_mutation');
				const file = path.join(out, randomUUID() + '.json'); save(file, { instance: instanceView(state), observed, persisted, versions: report.versions });
				report.instance = instanceView(state); report.artifacts = [artifact(file)]; report.cleanup = { outcome: 'retained', handle: state.handle };
				report.finished_at = new Date().toISOString(); validateReport(report, 0);
				writeState(path.join(registry, 'evidence.json'), report);
			}
		}
	}
} catch (error) {
	report.outcome = error.outcome ?? (error.code === 'ENOENT' ? 'blocked' : 'fail');
	report.diagnostics.push({ reason_code: report.outcome === 'usage_error' ? 'usage_error' : 'blocked_prerequisite', message: error.message.slice(0, 4096) });
}
report.finished_at = new Date().toISOString();
if (!wire.validate('CliReport', report).ok) { report.outcome = 'infrastructure_failure'; delete report.scenario_id; report.diagnostics = [{ reason_code: 'infrastructure_failure', message: 'report_invalid' }]; }
console.log(JSON.stringify(report, null, 2)); process.exitCode = exits[report.outcome];
