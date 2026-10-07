import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { fixtureEvent, fixtureReceipt, fixtureSnapshot } from '../../../scripts/client-fixture.ts';
import { replay, type ReplayFile } from '../../../scripts/drive-client-core.ts';

const file = JSON.parse(readFileSync(new URL('../../../contracts/fixtures/replay.json', import.meta.url), 'utf8')) as ReplayFile;
test('the public fixture driver converges every literal replay and refuses unknown state without cursor acknowledgement', () => {
	const results = file.replays.map(replay);
	expect(results.map((r) => [r.id, r.outcome])).toEqual([['ordered', 'pass'], ['gap', 'pass'], ['duplicates', 'pass'], ['unknown-state', 'pass'], ['unfilled-gap', 'pass'], ['stale-run-revision', 'pass']]);
	for (const result of results) expect(result.state).toEqual(file.replays.find((v) => v.id === result.id)?.expected);
	const unknown = results[3];
	expect(unknown?.transcript[2]?.acknowledgements).toEqual([]);
	expect(unknown?.transcript[2]?.state.rooms[0]?.cursor).toBe('2');
});
test('the fixture adapter rejects malformed snapshots, cross-stream delivery and malformed receipts', () => {
	const first = file.replays[0];
	if (!first) throw new Error('missing fixture');
	expect(fixtureSnapshot(first.snapshot)?.cursor).toBe('1');
	expect(fixtureSnapshot({ ...first.snapshot as object, authority: true })).toBeUndefined();
	expect(fixtureEvent('other', first.events[0])).toEqual({ type: 'unsupported', streamId: 'other' });
	const id = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';
	const receipt = { command_id: id, aggregate_id: id, revision: '1', receipt_id: id, event_cursors: [{ stream_id: id, committed_seq: '2' }] };
	expect(fixtureReceipt(receipt)).toEqual({ ...receipt, command_id: id.toLowerCase(), aggregate_id: id.toLowerCase(), receipt_id: id.toLowerCase(), event_cursors: [{ stream_id: id.toLowerCase(), committed_seq: '2' }] });
	expect(fixtureReceipt({ ...receipt, actor_id: id })).toBeUndefined();
});
test('the public boundary command writes its machine report at the documented artifact path', () => {
	const root = path.resolve(import.meta.dirname, '../../..'), report = path.join(root, '.scratch/boundaries.json');
	rmSync(report, { force: true });
	const result = spawnSync('pnpm', ['-s', 'boundaries'], { cwd: root, encoding: 'utf8', timeout: 300_000 });
	expect(result.status, result.stdout + result.stderr).toBe(0);
	expect(existsSync(report), 'missing lane-8 JSON artifact').toBe(true);
	expect(JSON.parse(readFileSync(report, 'utf8'))).toMatchObject({ success: true, numFailedTests: 0, numPendingTests: 0 });
}, 330_000);
test('the documentation gate rejects a malformed TOML config rather than hanging', () => {
	const root = path.resolve(import.meta.dirname, '../../..'), dir = mkdtempSync(path.join(tmpdir(), 'agora-docs-config-'));
	try {
		const config = path.join(dir, 'invalid.toml');
		writeFileSync(config, 'a=[1 #');
		const result = spawnSync(process.execPath, ['node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs', '--config', config, 'docs/features/client-synchronization.md'], { cwd: root, encoding: 'utf8', timeout: 3_000, killSignal: 'SIGKILL' });
		expect(result.error, 'documentation config parser must terminate').toBeUndefined();
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('Invalid TOML');
	} finally { rmSync(dir, { recursive: true, force: true }); }
}, 10_000);
test('the CLI returns pass only for literal snapshots, and distinguishes assertion failure from usage error', () => {
	const invoke = (...args: string[]) => spawnSync(process.execPath, ['scripts/drive-client-core.ts', ...args], { cwd: path.resolve(import.meta.dirname, '../../..'), encoding: 'utf8' });
	const valid = invoke('--json');
	expect(valid.status, valid.stderr).toBe(0);
	expect(JSON.parse(valid.stdout)).toMatchObject({ outcome: 'pass' });
	expect(invoke('--unknown').status).toBe(64);
	expect(invoke('--', '--json').status).toBe(0);
	const dir = mkdtempSync(path.join(tmpdir(), 'agora-replay-cli-'));
	try {
		const target = path.join(dir, 'fixture.json');
		for (const malformed of ['{', 'null', '{}', '{"schema_version":"agora.contract-vectors/v1","replays":[null]}']) {
			writeFileSync(target, malformed);
			expect(invoke('--file', target).status).toBe(64);
		}
		const altered = structuredClone(file);
		for (const vector of altered.replays) vector.expected = { rooms: [], commands: [], drafts: [] };
		writeFileSync(target, JSON.stringify(altered));
		const wrong = invoke('--file', target);
		expect(wrong.status).toBe(1);
		expect(JSON.parse(wrong.stdout)).toMatchObject({ outcome: 'fail' });
	} finally { rmSync(dir, { recursive: true, force: true }); }
});
