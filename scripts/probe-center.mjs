// Drives the public health/policy fixture and the persisted local room over real HTTP and asserts literal values.
// Usage: node scripts/with-test-postgres.mjs node scripts/probe-center.mjs [--json]
//        node scripts/probe-center.mjs --scenarios   (structured inventory only; starts nothing, needs no database)
// Exit codes follow R12: 0 pass, 1 observed failure, 2 blocked prerequisite, 70 infrastructure failure.
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { digestCanonical } from '@agora/contracts/canonical';

const inventoryOnly = process.argv.includes('--scenarios');
if (!inventoryOnly && !(process.env.AGORA_DATABASE_URL && process.env.AGORA_MIGRATION_DATABASE_URL)) {
	console.error(JSON.stringify({ schema_version: 'agora.probe/v1', outcome: 'blocked', message: 'AGORA_DATABASE_URL or AGORA_MIGRATION_DATABASE_URL is unset' }));
	process.exit(2);
}
const port = 3000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${port}`;
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
// The fixed local-development room seeded by migration 0001 (packages/domain LOCAL_ROOM).
const ROOM = { project_id: 'a0000000-0000-4000-8000-000000000001', room_id: 'a0000000-0000-4000-8000-000000000002' };
const command = (actor, subject) => ({ schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: actor }, subject: { scope_id: subject } });
const post = (body) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const send = (body, scope = ROOM, citations = []) => ({ schema_version: 'agora.local-room.send-message/v1', command_id: A, scope, body, citations });
const ROOM_PATH = '/api/v1/local-room/messages';
const SNAPSHOT_PATH = '/api/v1/local-room/snapshot';
// `body` is the literal subset every run must equal; `check` compares against values learned earlier in the same run (`state`).
const scenarios = [
	{ id: 'health-liveness', path: '/api/v1/health', status: 200, body: { schema_version: 'agora.health/v1', status: 'ok', service: 'agora-center' } },
	{ id: 'health-readiness', path: '/api/v1/health/ready', status: 200, body: { schema_version: 'agora.readiness/v1', status: 'ready', checks: { database: 'ok' } } },
	{ id: 'policy-allow', path: '/api/v1/fixture/policy/decisions', init: post(command(A, A)), status: 200, body: { schema_version: 'agora.fixture-policy-decision/v1', decision: 'allow', policy_version: 'agora.fixture-policy/v1', policy_digest: 'sha256:6bb3839045a8266e1ae93d4e7a2483a73225943fd9360b6c3c11e4e69b8b4fa4' } },
	{ id: 'policy-deny', path: '/api/v1/fixture/policy/decisions', init: post(command(A, B)), status: 200, body: { schema_version: 'agora.fixture-policy-decision/v1', decision: 'deny', reason_code: 'scope_mismatch', policy_version: 'agora.fixture-policy/v1', policy_digest: 'sha256:6bb3839045a8266e1ae93d4e7a2483a73225943fd9360b6c3c11e4e69b8b4fa4' } },
	{ id: 'policy-unknown-field', path: '/api/v1/fixture/policy/decisions', init: post({ ...command(A, A), role: 'owner' }), status: 400, body: { reason_code: 'malformed_command', details: ['$ must NOT have additional properties'] } },
	{ id: 'unknown-route', path: '/api/v1/nothing', status: 404, body: { reason_code: 'not_found' } },
	{ id: 'local-room-snapshot-before', path: SNAPSHOT_PATH, status: 200, body: { schema_version: 'agora.local-room.snapshot/v1', scope: ROOM }, keep: (body, state) => { state.before = Number(body.cursor.committed_seq); } },
	{ id: 'local-room-send-committed', path: ROOM_PATH, init: post(send('hello')), status: 201, body: { schema_version: 'agora.local-room.receipt/v1', identity: { command_id: A, request_digest: digestCanonical(send('hello')) }, replayed: false }, check: (body, state) => body.receipt.aggregate_id === ROOM.room_id && body.receipt.revision === String(state.before + 1), keep: (body, state) => { state.receipt = body; } },
	{ id: 'local-room-send-replayed', path: ROOM_PATH, init: post(send('hello')), status: 201, body: { replayed: true }, check: (body, state) => JSON.stringify(body) === JSON.stringify({ ...state.receipt, replayed: true }) },
	{ id: 'local-room-send-changed-body', path: ROOM_PATH, init: post(send('hello again')), status: 409, body: { reason_code: 'command_conflict' } },
	{ id: 'local-room-send-other-scope', path: ROOM_PATH, init: post(send('hello', { project_id: A, room_id: B })), status: 404, body: { reason_code: 'scope_mismatch' } },
	{ id: 'local-room-send-unknown-citation', path: ROOM_PATH, init: post({ ...send('cites nothing', ROOM, [{ record_kind: 'message', record_id: B, room_seq: '1' }]), command_id: B }), status: 404, body: { reason_code: 'not_found' } },
	{ id: 'local-room-send-empty-body', path: ROOM_PATH, init: post({ ...send(''), command_id: B }), status: 400, body: { reason_code: 'malformed_command', details: ['/body must NOT have fewer than 1 characters'] } },
	{ id: 'local-room-send-unknown-field', path: ROOM_PATH, init: post({ ...send('hello'), author: 'root' }), status: 400, body: { reason_code: 'malformed_command', details: ['$ must NOT have additional properties'] } },
	{ id: 'local-room-snapshot-after-restart', path: SNAPSHOT_PATH, restart: true, status: 200, body: { schema_version: 'agora.local-room.snapshot/v1', scope: ROOM }, check: (body, state) => body.cursor.committed_seq === String(state.before + 1) && body.messages.at(-1)?.message_id === state.receipt.message_id && body.messages.at(-1)?.body === 'hello' },
	{ id: 'local-room-replay-after-restart', path: ROOM_PATH, init: post(send('hello')), status: 201, body: { replayed: true }, check: (body, state) => body.message_id === state.receipt.message_id },
];
if (inventoryOnly) {
	console.log(JSON.stringify({ schema_version: 'agora.probe-scenarios/v1', target: 'apps/center/src/main.ts', scenarios: scenarios.map((s) => ({ id: s.id, method: s.init?.method ?? 'GET', path: s.path, expected_status: s.status, expected_reason_code: s.body.reason_code, restarts_center: s.restart === true })) }, null, process.argv.includes('--json') ? undefined : '\t'));
	process.exit(0);
}

let server;
async function start() {
	server = spawn(process.execPath, ['apps/center/src/main.ts'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
	const started = await Promise.race([once(server.stdout, 'data'), sleep(10_000).then(() => null)]);
	if (!started) throw new Error('center did not print its start line within 10 s');
}
async function stop() {
	server.kill();
	await once(server, 'exit');
}

const results = [];
const state = {};
let exitCode = 0;
try {
	// The room lives in migration 0001; the probe applies it as the owner before starting the service as the non-owner role.
	const migration = spawnSync(process.execPath, ['packages/storage/src/migrate-cli.ts'], { encoding: 'utf8', env: process.env });
	if (migration.status !== 0) throw new Error(`migration failed: ${migration.stderr}`);
	await start();
	for (const scenario of scenarios) {
		if (scenario.restart) {
			await stop();
			await start();
		}
		const response = await fetch(base + scenario.path, scenario.init);
		const body = await response.json();
		const observed = Object.fromEntries(Object.keys(scenario.body).map((key) => [key, body[key]]));
		const pass = response.status === scenario.status && JSON.stringify(observed) === JSON.stringify(scenario.body) && (scenario.check?.(body, state) ?? true);
		if (pass) scenario.keep?.(body, state);
		else exitCode = 1;
		results.push({ id: scenario.id, outcome: pass ? 'pass' : 'fail', expected: { status: scenario.status, body: scenario.body }, observed: { status: response.status, body } });
	}
} catch (error) {
	exitCode = 70;
	results.push({ id: 'infrastructure', outcome: 'fail', message: String(error) });
} finally {
	if (server) await stop();
}
const report = { schema_version: 'agora.probe/v1', target: 'apps/center/src/main.ts', base, outcome: exitCode === 0 ? 'pass' : 'fail', exit: exitCode, results };
console.log(process.argv.includes('--json') ? JSON.stringify(report) : JSON.stringify(report, null, '\t'));
process.exit(exitCode);
