// Drives the public health/policy fixture over real HTTP and asserts literal values.
// Usage: node scripts/with-test-postgres.mjs node scripts/probe-center.mjs [--json]
//        node scripts/probe-center.mjs --scenarios   (structured inventory only; starts nothing, needs no database)
// Exit codes follow R12: 0 pass, 1 observed failure, 2 blocked prerequisite, 70 infrastructure failure.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';

if (!process.argv.includes('--scenarios') && !process.env.AGORA_DATABASE_URL) {
	console.error(JSON.stringify({ schema_version: 'agora.probe/v1', outcome: 'blocked', message: 'AGORA_DATABASE_URL is unset' }));
	process.exit(2);
}
const port = 3000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${port}`;
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const command = (actor, subject) => ({ schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: actor }, subject: { scope_id: subject } });
const post = (body) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const scenarios = [
	{ id: 'health-liveness', path: '/api/v1/health', status: 200, body: { schema_version: 'agora.health/v1', status: 'ok', service: 'agora-center' } },
	{ id: 'health-readiness', path: '/api/v1/health/ready', status: 200, body: { schema_version: 'agora.readiness/v1', status: 'ready', checks: { database: 'ok' } } },
	{ id: 'policy-allow', path: '/api/v1/fixture/policy/decisions', init: post(command(A, A)), status: 200, body: { schema_version: 'agora.fixture-policy-decision/v1', decision: 'allow', policy_version: 'agora.fixture-policy/v1', policy_digest: 'sha256:6bb3839045a8266e1ae93d4e7a2483a73225943fd9360b6c3c11e4e69b8b4fa4' } },
	{ id: 'policy-deny', path: '/api/v1/fixture/policy/decisions', init: post(command(A, B)), status: 200, body: { schema_version: 'agora.fixture-policy-decision/v1', decision: 'deny', reason_code: 'scope_mismatch', policy_version: 'agora.fixture-policy/v1', policy_digest: 'sha256:6bb3839045a8266e1ae93d4e7a2483a73225943fd9360b6c3c11e4e69b8b4fa4' } },
	{ id: 'policy-unknown-field', path: '/api/v1/fixture/policy/decisions', init: post({ ...command(A, A), role: 'owner' }), status: 400, body: { reason_code: 'malformed_command', details: ['$ must NOT have additional properties'] } },
	{ id: 'unknown-route', path: '/api/v1/nothing', status: 404, body: { reason_code: 'not_found' } },
	{ id: 'local-room-send-unsupported', path: '/api/v1/local-room/messages', init: post({ schema_version: 'agora.local-room.send-message/v1', command_id: A, scope: { project_id: A, room_id: B }, body: 'hello', citations: [] }), status: 404, body: { reason_code: 'unavailable_capability' } },
	{ id: 'local-room-send-unknown-field', path: '/api/v1/local-room/messages', init: post({ schema_version: 'agora.local-room.send-message/v1', command_id: A, scope: { project_id: A, room_id: B }, body: 'hello', citations: [], author: 'root' }), status: 400, body: { reason_code: 'malformed_command', details: ['$ must NOT have additional properties'] } },
];
if (process.argv.includes('--scenarios')) {
	console.log(JSON.stringify({ schema_version: 'agora.probe-scenarios/v1', target: 'apps/center/src/main.ts', scenarios: scenarios.map((s) => ({ id: s.id, method: s.init?.method ?? 'GET', path: s.path, expected_status: s.status, expected_reason_code: s.body.reason_code })) }, null, process.argv.includes('--json') ? undefined : '\t'));
	process.exit(0);
}
const server = spawn(process.execPath, ['apps/center/src/main.ts'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });

const results = [];
let exitCode = 0;
try {
	const started = await Promise.race([once(server.stdout, 'data'), sleep(10_000).then(() => null)]);
	if (!started) throw new Error('center did not print its start line within 10 s');
	for (const scenario of scenarios) {
		const response = await fetch(base + scenario.path, scenario.init);
		const body = await response.json();
		const observed = Object.fromEntries(Object.keys(scenario.body).map((key) => [key, body[key]]));
		const pass = response.status === scenario.status && JSON.stringify(observed) === JSON.stringify(scenario.body);
		if (!pass) exitCode = 1;
		results.push({ id: scenario.id, outcome: pass ? 'pass' : 'fail', expected: { status: scenario.status, body: scenario.body }, observed: { status: response.status, body } });
	}
} catch (error) {
	exitCode = 70;
	results.push({ id: 'infrastructure', outcome: 'fail', message: String(error) });
} finally {
	server.kill();
}
const report = { schema_version: 'agora.probe/v1', target: 'apps/center/src/main.ts', base, outcome: exitCode === 0 ? 'pass' : 'fail', exit: exitCode, results };
console.log(process.argv.includes('--json') ? JSON.stringify(report) : JSON.stringify(report, null, '\t'));
process.exit(exitCode);
