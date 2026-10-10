// R1 per-unit perf scenario: five interleaved parent/head batches of the unit's declared probe, measured as-is.
// A probe that is missing, fails or prints anything but its declared metrics is never turned into pass data.
import { appendFileSync, mkdirSync, existsSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
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
