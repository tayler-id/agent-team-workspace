// U01b.B02 general evidence validator: checks a recorded evidence/<unit>/<task>/ bundle
// (red.log, green.log, test-patch.diff, manifest.json from record-red-green.mjs) against the
// exact expected head/base, configuration, producer signature, artifact bytes and exit outcome.
// Usage: node scripts/validate-evidence.mjs --dir DIR [--head SHA] [--base SHA] [--target NAME]
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { exits, hash, requireThat } from './project-checks.mjs';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const dir = option('--dir');
if (!dir) {
	console.error('usage: node scripts/validate-evidence.mjs --dir DIR [--head SHA] [--base SHA] [--target NAME]');
	process.exit(64);
}

function git(...argv) {
	const result = spawnSync('git', argv, { encoding: 'utf8' });
	requireThat(result.status === 0, 'git_failed', 'infrastructure_failure');
	return result.stdout.trim();
}
function header(text, name) {
	const line = text.match(new RegExp(`^${name}: (.*)$`, 'm'));
	requireThat(line, `missing_header_${name}`);
	return line[1];
}
function log(text) {
	return {
		head: header(text, 'head'),
		parent: header(text, 'parent'),
		configuration: JSON.parse(header(text, 'configuration')),
		observedExit: Number(text.match(/observed_exit: (-?\d+)/)?.[1]),
	};
}

const report = { schema_version: 'agora.evidence-validation/v1', dir, outcome: 'pass', reason_code: null };
try {
	const file = (name) => path.join(dir, name);
	requireThat(['manifest.json', 'red.log', 'green.log', 'test-patch.diff'].every((name) => existsSync(file(name))), 'missing_proof');
	const manifest = JSON.parse(readFileSync(file('manifest.json'), 'utf8'));
	const red = log(readFileSync(file('red.log'), 'utf8'));
	const green = log(readFileSync(file('green.log'), 'utf8'));

	const expectedHead = option('--head') ?? git('rev-parse', 'HEAD');
	const expectedBase = option('--base') ?? git('merge-base', expectedHead, 'main');
	const expectedTarget = option('--target') ?? 'local-foundation-fixture';

	requireThat(red.head === expectedHead && green.head === expectedHead, 'wrong_head');
	requireThat(red.parent === expectedBase && green.parent === expectedBase, 'wrong_base');
	requireThat(JSON.stringify(red.configuration) === JSON.stringify(green.configuration), 'config_mismatch');
	requireThat(manifest.target === expectedTarget, 'unsupported_target');

	for (const name of ['red.log', 'green.log', 'test-patch.diff']) {
		const bytes = readFileSync(file(name));
		const entry = manifest.artifacts?.find((row) => row.file === name);
		requireThat(entry && entry.digest === hash(bytes) && entry.byte_length === bytes.length, 'artifact_mismatch');
	}

	requireThat(red.observedExit !== 0 && green.observedExit === 0, 'exit_mismatch');
	requireThat(manifest.outcome === 'pass', 'outcome_mismatch');

	const producer = manifest.producer ?? {};
	requireThat(producer.trust_class === 'owner_attested' && producer.key_file && existsSync(producer.key_file), 'stale_producer');
	const { signature, key_file: keyFile, ...signed } = producer;
	const canonical = JSON.stringify(signed, Object.keys(signed).sort());
	const expectedSignature = createHmac('sha256', readFileSync(keyFile)).update(canonical).digest('hex');
	requireThat(signature === expectedSignature, 'producer_signature_invalid');
} catch (error) {
	report.outcome = error.outcome ?? 'fail';
	report.reason_code = error.message;
}
console.log(JSON.stringify(report));
process.exit(exits[report.outcome]);
