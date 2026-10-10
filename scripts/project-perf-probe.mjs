// R1 perf probes, run with the checkout under test as the working directory (parent clone or head).
// Prints {"metrics":{...}} in whole milliseconds. Usage: node scripts/project-perf-probe.mjs u01b|u20|u21
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const run = (argv, input) => spawnSync(argv[0], argv.slice(1), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...input });
const timed = (argv) => {
	const started = performance.now(), result = run(argv);
	if (result.status !== 0) { console.error(`${argv.join(' ')} exited ${result.status}\n${result.stdout}${result.stderr}`); process.exit(1); }
	return { ms: Math.max(1, Math.round(performance.now() - started)), result };
};
const cli = (...args) => {
	const step = timed(['node', 'scripts/project.mjs', 'project', ...args, '--json']), report = JSON.parse(step.result.stdout);
	if (report.outcome !== 'pass') { console.error(step.result.stdout); process.exit(1); }
	return { ms: step.ms, report };
};
const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const median = (values) => values.sort((a, b) => a - b)[values.length >> 1];

const probes = {
	u21: () => ({ generation_ms: median(Array.from({ length: 7 }, () => timed(['node', 'scripts/feature-inventory.ts', '--check']).ms)) }),
	u20: () => ({
		lint_ms: timed(['pnpm', 'exec', 'eslint', '.']).ms,
		lint_ts_only_ms: timed(['pnpm', 'exec', 'eslint', ...run(['git', 'ls-files', '*.ts']).stdout.split('\n').filter(Boolean)]).ms,
	}),
	async u01b() {
		const id = randomUUID(), work = path.resolve('.scratch/project-perf-probe', id), metrics = {};
		let handle;
		try {
			const start = cli('start', '--profile', 'verify', '--instance', id); handle = start.report.instance.cleanup_handle; metrics.startup_ms = start.ms;
			metrics.scenario_ms = cli('verify', '--scenario', 'policy', '--instance', id, '--artifacts', path.join('.scratch/project-perf-probe', id, 'artifacts')).ms;
			metrics.evidence_ms = cli('evidence', '--instance', id).ms;
			Object.assign(metrics, await bundle(work));
		} finally { if (handle) cli('stop', '--instance', id, '--handle', handle); rmSync(work, { recursive: true, force: true }); }
		return metrics;
	},
};

// A recorded evidence bundle whose test patch is 10 MiB, checked by the real general validator.
function bundle(work) {
	const dir = path.join(work, 'bundle'); mkdirSync(dir, { recursive: true });
	const head = run(['git', 'rev-parse', 'HEAD']).stdout.trim(), key = randomBytes(32), files = { 'test-patch.diff': Buffer.alloc(10 * 1024 * 1024, 'x') };
	for (const [name, exit] of [['red.log', 1], ['green.log', 0]]) files[name] = Buffer.from(`head: ${head}\nparent: ${head}\nconfiguration: {}\nobserved_exit: ${exit}\n`);
	for (const [name, bytes] of Object.entries(files)) writeFileSync(path.join(dir, name), bytes);
	return import(pathToFileURL(path.resolve('scripts/project-evidence.mjs'))).then(({ manifestSchema, sign }) => {
		const manifest = { schema_version: manifestSchema, target: 'local-foundation-fixture', outcome: 'pass', artifacts: Object.entries(files).map(([file, bytes]) => ({ file, digest: sha256(bytes), byte_length: bytes.length })), producer: { trust_class: 'owner_attested', head, base: head, outcome: 'pass' } };
		manifest.producer.signature = sign(key, manifest);
		writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest)); writeFileSync(path.join(work, 'key'), key);
		const step = timed(['node', 'scripts/validate-evidence.mjs', '--dir', dir, '--head', head, '--base', head, '--key', path.join(work, 'key')]);
		return { finalize_10mib_ms: step.ms };
	});
}

const probe = probes[process.argv[2]];
if (!probe) { console.error('usage: node scripts/project-perf-probe.mjs u01b|u20|u21'); process.exit(64); }
console.log(JSON.stringify({ metrics: await probe() }));
