import { spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';

interface Report { outcome: string; diagnostics: { reason_code: string; message: string }[]; artifacts: { path: string }[] }
interface Receipt { parent_behavior: string; samples: { side: string; metrics: Record<string, number> }[]; p95: Record<string, Record<string, number>> }
interface Manifest { units: { id: string; perf?: unknown; lanes_unavailable?: string }[] }
const exits: Record<string, number> = { pass: 0, fail: 1, blocked: 2, unavailable: 3, usage_error: 64, infrastructure_failure: 70 };
const root = process.cwd();
const sandboxes: string[] = [];
const receiptOf = (dir: string, report: Report): Receipt => JSON.parse(readFileSync(path.join(dir, report.artifacts[0]?.path ?? ''), 'utf8')) as Receipt;
const manifestOf = (text: string): Manifest => JSON.parse(text) as Manifest;

function run(cwd: string, args: string[]): Report {
	const result = spawnSync(process.execPath, ['scripts/project.mjs', 'project', ...args, '--json'], { cwd, encoding: 'utf8', timeout: 900_000, maxBuffer: 16 * 1024 * 1024 });
	expect(result.error).toBeUndefined();
	expect(result.stdout, result.stderr).not.toBe('');
	const report = JSON.parse(result.stdout) as Report;
	expect(result.status, result.stdout + result.stderr).toBe(exits[report.outcome]);
	return report;
}

// A clone of this checkout plus its uncommitted files, so manifests and probes can change without touching the real tree.
function sandbox(): string {
	mkdirSync('.scratch', { recursive: true });
	const dir = path.join(mkdtempSync(path.resolve('.scratch/units-')), 'repo');
	sandboxes.push(path.dirname(dir));
	const git = (...argv: string[]) => spawnSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.test', ...argv], { encoding: 'utf8' });
	expect(spawnSync('git', ['clone', '--quiet', '--local', root, dir]).status).toBe(0);
	const changed = spawnSync('git', ['ls-files', '-m', '-o', '--exclude-standard'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
	for (const file of changed) if (existsSync(file)) { mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); copyFileSync(file, path.join(dir, file)); }
	appendFileSync(path.join(dir, '.git/info/exclude'), 'node_modules\n');
	git('add', '-A'); git('commit', '--quiet', '--allow-empty', '-m', 'working tree');
	for (const modules of ['.', 'contracts', ...['apps', 'packages'].flatMap((top) => readdirSync(top).map((name) => `${top}/${name}`))]) {
		if (existsSync(path.join(modules, 'node_modules'))) symlinkSync(path.resolve(modules, 'node_modules'), path.join(dir, modules, 'node_modules'));
	}
	return dir;
}

function withProbe(dir: string, probe: string[] | undefined, limits: object[] = [{ metric: 'generation_ms', max: 5000 }]): void {
	const file = path.join(dir, 'agora/project.json');
	const manifest = manifestOf(readFileSync(file, 'utf8'));
	expect(manifest.units, 'agora/project.json declares per-unit lanes and perf').toBeDefined();
	const unit = manifest.units.find((row) => row.id === 'U21');
	if (unit) unit.perf = { metric: 'generation', rule: 'test', compare: ['generation_ms'], limits, ...(probe ? { probe } : { unavailable: 'The probe was removed for this test.' }) };
	writeFileSync(file, JSON.stringify(manifest));
}
const flagged = ['node', '-e', "const fs=require('fs');const f='slow.flag';console.log(JSON.stringify({metrics:{generation_ms:fs.existsSync(f)?Number(fs.readFileSync(f,'utf8')):100}}))"];

afterAll(() => { for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true }); });

describe('per-unit lanes through the public CLI', () => {
	test.each(['U20', 'U21', 'U23', 'U01c', 'U01d'])('%s lanes are unavailable with a reason, never a pass', (unit) => {
		const report = run(root, ['lanes', '--unit', unit, '--task', 'agora-s1-qualify-trusted-checks']);
		expect(report.outcome).toBe('unavailable');
		expect(report.artifacts).toEqual([]);
		expect(report.diagnostics[0]?.reason_code).toBe('unavailable_capability');
		expect(report.diagnostics[0]?.message).toMatch(new RegExp(`^${unit} lanes 1-10 unavailable: .{20,}`));
	});

	test('an unknown unit is unavailable by name', () => {
		const report = run(root, ['lanes', '--unit', 'U99', '--task', 'agora-s1-qualify-trusted-checks']);
		expect(report).toMatchObject({ outcome: 'unavailable', diagnostics: [{ reason_code: 'unavailable_capability', message: 'unknown unit U99' }] });
	});
});

describe('U22 lanes through the public CLI', () => {
	interface Lanes { lanes: { id: number; outcome: string; detail: string; scenario_png: string }[] }
	const lanesOf = (dir: string, report: Report): Lanes => JSON.parse(readFileSync(path.join(dir, report.artifacts.find((row) => row.path.endsWith('lanes.json'))?.path ?? ''), 'utf8')) as Lanes;
	const edit = (dir: string, file: string, from: string, to: string): void => {
		const text = readFileSync(path.join(dir, file), 'utf8');
		expect(text, `${file} no longer contains ${from}`).toContain(from);
		writeFileSync(path.join(dir, file), text.replace(from, to));
	};

	test('runs the ten lanes, passes nine and reports lane 9 unavailable with the Host method it lacks', () => {
		const report = run(root, ['lanes', '--unit', 'U22', '--task', 'agora-s1-qualify-trusted-checks', '--artifacts', `.scratch/u22-lanes-${process.pid}`]);
		expect(report.outcome).toBe('unavailable');
		expect(report.diagnostics).toEqual([{ reason_code: 'unavailable_capability', message: expect.stringMatching(/^U22 lane 9 unavailable: .*names the Host owner path and not a specific Host method$/) as string }]);
		const lanes = lanesOf(root, report).lanes;
		expect(lanes.map((lane) => [lane.id, lane.outcome])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => [id, id === 9 ? 'unavailable' : 'pass']));
		expect(lanes.every((lane) => lane.scenario_png.startsWith('unavailable: no scenario.png'))).toBe(true);
		rmSync(`.scratch/u22-lanes-${process.pid}`, { recursive: true, force: true });
	}, 600_000);

	test('a renamed lane test and a rule that stops rejecting a bypass each fail the run', () => {
		const dir = sandbox();
		edit(dir, 'packages/web-framework/test/boundaries.test.ts', "test('lane 7: malformed", "test('malformed");
		const missing = run(dir, ['lanes', '--unit', 'U22', '--task', 'agora-s1-qualify-trusted-checks']);
		expect(missing.outcome).toBe('fail');
		expect(missing.diagnostics.map((row) => row.message).filter((message) => message.startsWith('U22 lane 7 '))).toEqual(['U22 lane 7 fail: missing: lane 7: malformed RoomTransport and EnvironmentPort calls fail to compile']);
		edit(dir, 'packages/web-framework/test/boundaries.test.ts', "test('malformed", "test('lane 7: malformed");
		edit(dir, 'scripts/renderer-policy.ts', '`direct ${node.name} is allowed', '`raw ${node.name} is allowed');
		const loose = run(dir, ['lanes', '--unit', 'U22', '--task', 'agora-s1-qualify-trusted-checks']);
		expect(loose.outcome).toBe('fail');
		expect(loose.diagnostics.map((row) => row.message).filter((message) => /lane [34] /.test(message))).toHaveLength(2);
	}, 900_000);
});

describe('perf scenario without an executable probe', () => {
	test.each(['U22', 'U23', 'U01c', 'U01d'])('%s reports the missing probe and no artifacts', (unit) => {
		const report = run(root, ['verify', '--scenario', 'perf', '--unit', unit]);
		expect(report.outcome).toBe('unavailable');
		expect(report.artifacts).toEqual([]);
		expect(report.diagnostics[0]?.message).toMatch(new RegExp(`^${unit} perf unavailable: .{20,}`));
	});

	test('perf needs a unit, and an unknown unit is unavailable', () => {
		expect(run(root, ['verify', '--scenario', 'perf']).outcome).toBe('usage_error');
		expect(run(root, ['verify', '--scenario', 'perf', '--unit', 'U99']).diagnostics[0]?.message).toBe('unknown unit U99');
	});
});

describe('perf scenario in a sandbox clone', () => {
	test('five interleaved parent and head batches pass on equal metrics and fail only past 10% or a budget', () => {
		const dir = sandbox();
		withProbe(dir, flagged);
		const perf = (...extra: string[]) => run(dir, ['verify', '--scenario', 'perf', '--unit', 'U21', '--parent', 'HEAD', ...extra]);
		const equal = perf();
		expect(equal.outcome, JSON.stringify(equal)).toBe('pass');
		const receipt = receiptOf(dir, equal);
		expect(receipt.samples.map((row) => row.side)).toEqual(['parent', 'head', 'head', 'parent', 'parent', 'head', 'head', 'parent', 'parent', 'head']);
		expect(receipt.samples.map((row) => row.metrics['generation_ms'])).toEqual(Array(10).fill(100));
		expect(receipt.p95).toEqual({ parent: { generation_ms: 100 }, head: { generation_ms: 100 } });
		writeFileSync(path.join(dir, 'slow.flag'), '110');
		expect(perf().outcome).toBe('pass');
		writeFileSync(path.join(dir, 'slow.flag'), '111');
		const regressed = perf();
		expect(regressed.outcome).toBe('fail');
		expect(regressed.diagnostics[0]?.message).toBe('perf_regression generation_ms: head p95 111 exceeds parent p95 100 by more than 10%');
		writeFileSync(path.join(dir, 'slow.flag'), '5001');
		expect(perf().diagnostics.map((row) => row.message)).toContain('perf_budget generation_ms: head p95 5001 exceeds 5000');
	}, 300_000);

	test('a limit set as a multiple of another metric fails only past that multiple', () => {
		const dir = sandbox();
		withProbe(dir, ['node', '-e', "const fs=require('fs');console.log(JSON.stringify({metrics:{generation_ms:100,base_ms:fs.existsSync('base.flag')?Number(fs.readFileSync('base.flag','utf8')):100}}))"], [{ metric: 'generation_ms', ratio: 2, of: 'base_ms' }]);
		const perf = () => run(dir, ['verify', '--scenario', 'perf', '--unit', 'U21', '--parent', 'HEAD']);
		writeFileSync(path.join(dir, 'base.flag'), '50');
		expect(perf().outcome).toBe('pass');
		writeFileSync(path.join(dir, 'base.flag'), '49');
		expect(perf().diagnostics.map((row) => row.message)).toEqual(['perf_budget generation_ms: head p95 100 exceeds 2x base_ms 49']);
	}, 300_000);

	test('output that is not a metric report or a failing head probe is never a pass', () => {
		const dir = sandbox();
		const perf = () => run(dir, ['verify', '--scenario', 'perf', '--unit', 'U21', '--parent', 'HEAD']);
		withProbe(dir, ['node', '-e', "console.log('fast')"]);
		expect(perf()).toMatchObject({ outcome: 'fail', diagnostics: [{ message: 'probe_output_invalid' }] });
		withProbe(dir, ['node', '-e', "console.log(JSON.stringify({metrics:{other_ms:1}}))"]);
		expect(perf()).toMatchObject({ outcome: 'fail', diagnostics: [{ message: 'probe_output_invalid' }] });
		withProbe(dir, ['node', '-e', "if(require('fs').existsSync('boom.flag'))process.exit(3);console.log(JSON.stringify({metrics:{generation_ms:1}}))"]);
		writeFileSync(path.join(dir, 'boom.flag'), '');
		expect(perf()).toMatchObject({ outcome: 'fail', diagnostics: [{ message: 'probe_failed head' }] });
		withProbe(dir, ['node', '-e', "if(!require('fs').existsSync('present.flag'))process.exit(5);console.log(JSON.stringify({metrics:{generation_ms:1}}))"]);
		writeFileSync(path.join(dir, 'present.flag'), '');
		expect(perf()).toMatchObject({ outcome: 'fail', diagnostics: [{ message: 'probe_failed parent' }] });
		withProbe(dir, undefined);
		expect(perf().outcome).toBe('unavailable');
		const file = path.join(dir, 'agora/project.json'), saved = readFileSync(file, 'utf8'), manifest = manifestOf(saved);
		delete manifest.units.find((row) => row.id === 'U23')?.lanes_unavailable;
		writeFileSync(file, JSON.stringify(manifest));
		expect(run(dir, ['lanes', '--unit', 'U23', '--task', 'agora-s1-qualify-trusted-checks']).outcome).toBe('fail');
		writeFileSync(file, saved);
		withProbe(dir, flagged);
		expect(run(dir, ['verify', '--scenario', 'perf', '--unit', 'U21', '--parent', 'no-such-revision']).outcome).toBe('blocked');
	}, 300_000);

	test('behavior absent at the parent is reported and only absolute budgets apply', () => {
		const dir = sandbox();
		withProbe(dir, ['node', '-e', "const fs=require('fs');if(!fs.existsSync('present.flag'))process.exit(4);console.log(JSON.stringify({metrics:{generation_ms:Number(fs.readFileSync('present.flag','utf8'))}}))"]);
		writeFileSync(path.join(dir, 'present.flag'), '90');
		const perf = () => run(dir, ['verify', '--scenario', 'perf', '--unit', 'U21', '--parent', 'HEAD']);
		const absent = perf();
		expect(absent.outcome, JSON.stringify(absent)).toBe('pass');
		const receipt = receiptOf(dir, absent);
		expect(receipt.parent_behavior).toBe('absent');
		expect(receipt.samples.filter((row) => row.side === 'head')).toHaveLength(5);
		expect(receipt.p95).toEqual({ head: { generation_ms: 90 } });
		writeFileSync(path.join(dir, 'present.flag'), '5001');
		expect(perf().outcome).toBe('fail');
	}, 300_000);

	test('the real U21 generation probe records ten genuine timings', () => {
		const dir = sandbox();
		const report = run(dir, ['verify', '--scenario', 'perf', '--unit', 'U21', '--parent', 'HEAD']);
		expect(['pass', 'fail']).toContain(report.outcome);
		const receipt = receiptOf(dir, report);
		expect(receipt.samples).toHaveLength(10);
		for (const row of receipt.samples) expect(row.metrics['generation_ms']).toBeGreaterThan(0);
		if (report.outcome === 'fail') expect(report.diagnostics[0]?.message).toMatch(/^perf_regression generation_ms/);
	}, 300_000);

	test('the real U01b probe times startup, scenario, evidence and 10-MiB validation', () => {
		const dir = sandbox();
		const report = run(dir, ['verify', '--scenario', 'perf', '--unit', 'U01b', '--parent', 'HEAD']);
		expect(['pass', 'fail']).toContain(report.outcome);
		const receipt = receiptOf(dir, report);
		expect(receipt.samples).toHaveLength(10);
		for (const row of receipt.samples) for (const metric of ['startup_ms', 'scenario_ms', 'evidence_ms', 'finalize_10mib_ms']) expect(row.metrics[metric]).toBeGreaterThan(0);
	}, 900_000);
});
