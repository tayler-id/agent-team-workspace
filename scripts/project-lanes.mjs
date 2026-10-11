// R1 unit lane driver for units whose lanes run as named native tests. Each lane passes only when every test it names
// ran and passed, or when the unit's own driver test recorded a pass verdict for it. A lane that cannot pass says why.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { environment, requireThat } from './project-checks.mjs';

const U22 = {
	files: ['packages/client-core/test/client-state-owner.test.ts', 'packages/client-core/test/replay.test.ts', 'packages/web-framework/test', 'packages/verification/test/u22-lanes.test.ts', 'apps/web/test/app.test.tsx'],
	tests: {
		2: ['a component holding durable Client state in React state is rejected and names the Client hooks'],
		5: ['lane 5: a command sent through useRoomCommands settles on a receipt', 'lane 5 negative: a receipt missing required R07 fields'],
		7: ['lane 7: malformed RoomTransport and EnvironmentPort calls fail to compile', 'lane 7 counterfactual: widening submit'],
		8: ['lane 8: 200 mounts and unmounts of a hook consumer'],
		10: ['the real client core converges in order', 'one writer keeps immutable identity', 'command routing, gap/duplicate agreement', 'pure projection covers rows'],
	},
	verdicts: [1, 3, 4, 6, 9],
	capture: 'no scenario.png: the runner has no screenshot route, and these lanes are lint, compile, receipt and listener proofs with no rendered pixels',
};
export const drivers = { U22 };

export function runUnitLanes(unit, out) {
	const driver = drivers[unit.id], results = path.join(out, 'vitest.json'), verdicts = path.join(out, 'verdicts.jsonl');
	rmSync(verdicts, { force: true });
	const argv = ['pnpm', 'exec', 'vitest', 'run', '--project', 'unit', '--project', 'web', ...driver.files, '--reporter=json', '--outputFile=' + results];
	const run = spawnSync(argv[0], argv.slice(1), { encoding: 'utf8', timeout: 600_000, maxBuffer: 16 * 1024 * 1024, env: { ...environment(), AGORA_U22_VERDICTS: path.resolve(verdicts) } });
	writeFileSync(path.join(out, 'command.json'), JSON.stringify({ argv, exit: run.status, stderr: run.stderr.slice(-4000) }, null, 2), { flag: 'wx' });
	requireThat(existsSync(results), 'lane_driver_no_output', 'blocked');
	const assertions = JSON.parse(readFileSync(results, 'utf8')).testResults.flatMap(suite => suite.assertionResults);
	const recorded = existsSync(verdicts) ? Object.assign({}, ...readFileSync(verdicts, 'utf8').trim().split('\n').map(line => JSON.parse(line))) : {};
	const lanes = unit.lanes.map(({ id }) => {
		if (driver.verdicts.includes(id)) return { id, ...(recorded[id] ?? { outcome: 'fail', detail: 'the driver recorded no verdict for this lane' }) };
		const named = driver.tests[id].map(name => ({ name, found: assertions.filter(row => row.fullName.includes(name)) }));
		const bad = named.find(row => !row.found.length || row.found.some(test => test.status !== 'passed'));
		return { id, outcome: bad ? 'fail' : 'pass', detail: bad ? `${bad.found.length ? 'failed' : 'missing'}: ${bad.name}` : `${named.length} named test${named.length > 1 ? 's' : ''} passed` };
	});
	const file = path.join(out, 'lanes.json');
	writeFileSync(file, JSON.stringify({ schema_version: 'agora.project-lanes/v1', unit: unit.id, lanes: lanes.map(lane => ({ ...lane, scenario_png: `unavailable: ${driver.capture}` })), failed_tests: assertions.filter(row => row.status !== 'passed').map(row => row.fullName) }, null, 2) + '\n', { flag: 'wx' });
	return { files: [results, file, path.join(out, 'command.json')], lanes };
}
