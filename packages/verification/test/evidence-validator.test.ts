import { spawnSync } from 'node:child_process';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

interface Artifact { file: string; digest: string; byte_length: number }
interface Manifest { schema_version: string; target: string; outcome: string; artifacts: Artifact[]; producer: Record<string, unknown> }
interface ValidationReport { schema_version: string; dir: string; outcome: string; reason_code: string | null }

const sha256 = (bytes: Buffer) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const HEAD = 'h'.repeat(40);
const BASE = 'b'.repeat(40);
const configuration = { command: 'pnpm -s test', vitest_config: 'sha256:aaaa', tsconfig_base: 'sha256:bbbb', lockfile: 'sha256:cccc' };
const logText = (values: { head: string; parent: string; configuration: unknown; exit: number }) =>
	`head: ${values.head}\nparent: ${values.parent}\nconfiguration: ${JSON.stringify(values.configuration)}\nobserved_exit: ${values.exit}\n`;
const readManifest = (dir: string) => JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) as Manifest;
const runValidator = (validatorPath: string, dir: string) =>
	JSON.parse(spawnSync(process.execPath, [validatorPath, '--dir', dir, '--head', HEAD, '--base', BASE], { encoding: 'utf8' }).stdout) as ValidationReport;
const run = (dir: string) => runValidator('scripts/validate-evidence.mjs', dir);
const artifact = (dir: string, name: string): Artifact => { const bytes = fs.readFileSync(path.join(dir, name)); return { file: name, digest: sha256(bytes), byte_length: bytes.length }; };
const resignArtifact = (dir: string, name: string) => {
	const manifestFile = path.join(dir, 'manifest.json'), manifest = readManifest(dir);
	fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, artifacts: manifest.artifacts.map((row) => (row.file === name ? artifact(dir, name) : row)) }));
};

function buildFixture(id: string) {
	const dir = path.join('.scratch/evidence-validator-tests', id);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, 'red.log'), logText({ head: HEAD, parent: BASE, configuration, exit: 1 }));
	fs.writeFileSync(path.join(dir, 'green.log'), logText({ head: HEAD, parent: BASE, configuration, exit: 0 }));
	fs.writeFileSync(path.join(dir, 'test-patch.diff'), `diff for ${id}\n`);
	const keyFile = path.join(dir, 'producer.key');
	fs.writeFileSync(keyFile, randomBytes(32));
	const producerFields = { trust_class: 'owner_attested', boot_id: randomUUID(), head: HEAD, base: BASE, outcome: 'pass' };
	const signature = createHmac('sha256', fs.readFileSync(keyFile)).update(JSON.stringify(producerFields, Object.keys(producerFields).sort())).digest('hex');
	fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
		schema_version: 'agora.evidence-manifest/v1',
		target: 'local-foundation-fixture',
		outcome: 'pass',
		artifacts: ['red.log', 'green.log', 'test-patch.diff'].map((name) => artifact(dir, name)),
		producer: { ...producerFields, key_file: keyFile, signature },
	}));
	return { dir, keyFile };
}

test('project lane 5 rejects wrong head, wrong base and mismatched configuration', () => {
	const { dir } = buildFixture(randomUUID());
	expect(run(dir).outcome).toBe('pass');
	const red = path.join(dir, 'red.log'), original = fs.readFileSync(red, 'utf8');
	fs.writeFileSync(red, original.replace(`head: ${HEAD}`, `head: ${'a'.repeat(40)}`));
	resignArtifact(dir, 'red.log');
	const wrongHead = run(dir); expect(wrongHead.outcome).toBe('fail'); expect(wrongHead.reason_code).toBe('wrong_head');
	fs.writeFileSync(red, original.replace(`parent: ${BASE}`, `parent: ${'c'.repeat(40)}`));
	resignArtifact(dir, 'red.log');
	const wrongBase = run(dir); expect(wrongBase.outcome).toBe('fail'); expect(wrongBase.reason_code).toBe('wrong_base');
	fs.writeFileSync(red, original.replace('"vitest_config":"sha256:aaaa"', '"vitest_config":"sha256:dddd"'));
	resignArtifact(dir, 'red.log');
	const configMismatch = run(dir); expect(configMismatch.outcome).toBe('fail'); expect(configMismatch.reason_code).toBe('config_mismatch');
	fs.rmSync(dir, { recursive: true, force: true });
});

test('project lane 6 rejects missing proof, mutated artifact bytes and an unsupported target', () => {
	const { dir } = buildFixture(randomUUID());
	const diff = path.join(dir, 'test-patch.diff');
	fs.rmSync(diff);
	const missing = run(dir); expect(missing.outcome).toBe('fail'); expect(missing.reason_code).toBe('missing_proof');
	fs.writeFileSync(diff, 'mutated bytes that do not match the recorded digest\n');
	const mutated = run(dir); expect(mutated.outcome).toBe('fail'); expect(mutated.reason_code).toBe('artifact_mismatch');
	resignArtifact(dir, 'test-patch.diff');
	expect(run(dir).outcome).toBe('pass');
	const manifestFile = path.join(dir, 'manifest.json'), manifestBefore = readManifest(dir);
	fs.writeFileSync(manifestFile, JSON.stringify({ ...manifestBefore, target: 'unsupported-target' }));
	const target = run(dir); expect(target.outcome).toBe('fail'); expect(target.reason_code).toBe('unsupported_target');
	fs.rmSync(dir, { recursive: true, force: true });
});

test('project lane 7 rejects exit/outcome mismatch and a stale or forged producer signature; weakening turns its own assertion red', () => {
	const id = randomUUID();
	const { dir, keyFile } = buildFixture(id);
	const red = path.join(dir, 'red.log'), redOriginal = fs.readFileSync(red, 'utf8');
	fs.writeFileSync(red, redOriginal.replace('observed_exit: 1', 'observed_exit: 0'));
	resignArtifact(dir, 'red.log');
	const exitMismatch = run(dir); expect(exitMismatch.outcome).toBe('fail'); expect(exitMismatch.reason_code).toBe('exit_mismatch');
	fs.writeFileSync(red, redOriginal);
	resignArtifact(dir, 'red.log');
	expect(run(dir).outcome).toBe('pass');

	const manifestFile = path.join(dir, 'manifest.json'), manifest = readManifest(dir), original = JSON.stringify(manifest);
	fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, outcome: 'fail' }));
	const outcomeMismatch = run(dir); expect(outcomeMismatch.outcome).toBe('fail'); expect(outcomeMismatch.reason_code).toBe('outcome_mismatch');
	fs.writeFileSync(manifestFile, original);

	fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, producer: { ...manifest.producer, signature: 'a'.repeat(64) } }));
	const forged = run(dir); expect(forged.outcome).toBe('fail'); expect(forged.reason_code).toBe('producer_signature_invalid');
	fs.writeFileSync(manifestFile, original);
	fs.rmSync(keyFile);
	const stale = run(dir); expect(stale.outcome).toBe('fail'); expect(stale.reason_code).toBe('stale_producer');
	fs.writeFileSync(keyFile, randomBytes(32));

	const validatorSource = fs.readFileSync('scripts/validate-evidence.mjs', 'utf8');
	const needle = "requireThat(signature === expectedSignature, 'producer_signature_invalid');";
	expect(validatorSource.split(needle).length).toBe(2);
	fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, producer: { ...manifest.producer, signature: 'a'.repeat(64) } }));
	const copy = `.scratch/validate-evidence-guard-${id}.mjs`;
	try {
		for (const weakened of [false, true]) {
			const source = (weakened ? validatorSource.replace(needle, 'true;') : validatorSource).replace("from './project-checks.mjs'", "from '../scripts/project-checks.mjs'");
			fs.writeFileSync(copy, source);
			expect(runValidator(copy, dir).outcome).toBe(weakened ? 'pass' : 'fail');
		}
	} finally {
		fs.rmSync(copy, { force: true });
	}
	fs.rmSync(dir, { recursive: true, force: true });
});
