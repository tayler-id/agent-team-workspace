// R1 per-unit perf scenario: five interleaved parent/head batches of the unit's declared probe, measured as-is.
// A probe that is missing, fails or prints anything but its declared metrics is never turned into pass data.
// Run as a script (node scripts/project-perf.mjs u01b|u20|u21) from the checkout under test, it is the probe itself:
// it prints {"metrics":{...}} in whole milliseconds, and the runner starts head's copy in the parent clone too.
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, existsSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { command, requireThat } from './project-checks.mjs';

const BATCHES = 5, REGRESSION = 1.1;
const p95 = values => [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];

function parentTree(sha, dir) {
	for (const argv of [['git', 'clone', '--quiet', '--local', '--no-checkout', process.cwd(), dir], ['git', 'checkout', '--quiet', '--detach', sha]]) requireThat(command(argv, argv[1] === 'checkout' ? dir : process.cwd()).status === 0, 'parent_checkout_failed', 'infrastructure_failure');
	appendFileSync(path.join(dir, '.git/info/exclude'), 'node_modules\n'); // the links are untracked files, not directories, to git
	for (const modules of ['.', 'contracts', ...['apps', 'packages'].flatMap(top => existsSync(top) ? readdirSync(top).map(name => `${top}/${name}`) : [])]) {
		if (existsSync(path.join(modules, 'node_modules'))) symlinkSync(path.resolve(modules, 'node_modules'), path.join(dir, modules, 'node_modules'));
	}
}

function sample(argv, cwd, wanted, side) {
	const run = command(argv.map(arg => arg.replace('{head}', process.cwd())), cwd);
	if (run.status !== 0) return { failed: `probe_failed ${side}`, detail: (run.stderr || run.stdout).slice(-400) };
	let metrics;
	try { metrics = JSON.parse(run.stdout).metrics; } catch { /* handled below */ }
	requireThat(wanted.every(name => Number.isFinite(metrics?.[name]) && metrics[name] > 0), 'probe_output_invalid');
	return { metrics: Object.fromEntries(wanted.map(name => [name, metrics[name]])) };
}

export function runPerf(entry, rev, out) {
	const { probe, compare = [], limits = [] } = entry.perf;
	requireThat(/^[\w@{}^~/.-]+$/.test(rev) && !rev.startsWith('-'), 'parent_unresolved', 'usage_error');
	const resolved = command(['git', 'rev-parse', '--verify', `${rev}^{commit}`]); requireThat(resolved.status === 0, 'parent_unresolved', 'blocked');
	const parent = resolved.stdout.trim(), wanted = [...new Set([...compare, ...limits.flatMap(limit => [limit.metric, limit.of].filter(Boolean))])];
	const dir = path.join(out, 'parent'); mkdirSync(out, { recursive: true }); requireThat(!existsSync(dir), 'evidence_exists');
	const receipt = { schema_version: 'agora.project-perf/v1', unit: entry.id, parent, head: command(['git', 'rev-parse', 'HEAD']).stdout.trim(), parent_behavior: 'present', rule: entry.perf.rule, samples: [], p95: {} };
	const failures = [];
	try {
		parentTree(parent, dir);
		for (let batch = 0; batch < BATCHES && !failures.length; batch++) {
			for (const side of batch % 2 ? ['head', 'parent'] : ['parent', 'head']) {
				if (side === 'parent' && receipt.parent_behavior === 'absent') continue;
				const row = sample(probe, side === 'head' ? process.cwd() : dir, wanted, side);
				if (row.failed && side === 'parent' && batch === 0) { receipt.parent_behavior = 'absent'; receipt.parent_failure = row.detail; }
				else if (row.failed) { failures.push(row.failed); break; }
				else receipt.samples.push({ batch, side, metrics: row.metrics });
			}
		}
	} finally { rmSync(dir, { recursive: true, force: true }); }
	for (const side of ['parent', 'head']) {
		const rows = receipt.samples.filter(row => row.side === side);
		if (rows.length) receipt.p95[side] = Object.fromEntries(wanted.map(name => [name, p95(rows.map(row => row.metrics[name]))]));
	}
	const { parent: before, head: after } = receipt.p95;
	if (!failures.length) {
		for (const name of compare) if (before && after[name] > before[name] * REGRESSION) failures.push(`perf_regression ${name}: head p95 ${after[name]} exceeds parent p95 ${before[name]} by more than 10%`);
		for (const { metric, max, ratio, of } of limits) {
			if (max && after[metric] > max) failures.push(`perf_budget ${metric}: head p95 ${after[metric]} exceeds ${max}`);
			if (ratio && after[metric] > ratio * after[of]) failures.push(`perf_budget ${metric}: head p95 ${after[metric]} exceeds ${ratio}x ${of} ${after[of]}`);
		}
	}
	const file = path.join(out, 'perf.json'); writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
	return { file, failures };
}

// Probes
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const probe = probes[process.argv[2] ?? ''];
	if (!probe) { console.error('usage: node scripts/project-perf.mjs u01b|u20|u21'); process.exit(64); }
	console.log(JSON.stringify({ metrics: await probe() }));
}
