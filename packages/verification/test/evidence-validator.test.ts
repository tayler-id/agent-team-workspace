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
const logText = (values: { head: string; parent: string; configuration: unknown; exit: number | string }) =>
	`head: ${values.head}\nparent: ${values.parent}\nconfiguration: ${JSON.stringify(values.configuration)}\nobserved_exit: ${values.exit}\n`;
const readManifest = (dir: string) => JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) as Manifest;
const writeManifest = (dir: string, manifest: unknown) => { fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest)); };
// The verifier, not the bundle, names the key: every run passes the fixture's own key with --key.
const runValidator = (validatorPath: string, dir: string, keyFile: string) =>
	JSON.parse(spawnSync(process.execPath, [validatorPath, '--dir', dir, '--head', HEAD, '--base', BASE, '--key', keyFile], { encoding: 'utf8' }).stdout) as ValidationReport;
const run = (dir: string, keyFile: string) => runValidator('scripts/validate-evidence.mjs', dir, keyFile);
const artifact = (dir: string, name: string): Artifact => { const bytes = fs.readFileSync(path.join(dir, name)); return { file: name, digest: sha256(bytes), byte_length: bytes.length }; };
// An independent statement of the signed bytes: every manifest field except the signature, keys sorted at every depth.
const canonical = (value: unknown): string => Array.isArray(value)
	? `[${value.map(canonical).join(',')}]`
	: value !== null && typeof value === 'object'
		? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
		: JSON.stringify(value);
const signed = (key: Buffer, manifest: Manifest): Manifest => {
	const producer = { ...manifest.producer };
	delete producer['signature'];
	return { ...manifest, producer: { ...producer, signature: createHmac('sha256', key).update(canonical({ ...manifest, producer })).digest('hex') } };
};
// What the owner does after an honest edit: recompute every digest and re-sign with the owner's key.
const reseal = (dir: string, keyFile: string) => { writeManifest(dir, signed(fs.readFileSync(keyFile), { ...readManifest(dir), artifacts: ['red.log', 'green.log', 'test-patch.diff'].map((name) => artifact(dir, name)) })); };
// What someone without the key can do: replace an artifact and update only its digest; the signature is untouched.
const swapUnsigned = (dir: string, name: string, text: string) => {
	fs.writeFileSync(path.join(dir, name), text);
	const manifest = readManifest(dir);
	writeManifest(dir, { ...manifest, artifacts: manifest.artifacts.map((row) => (row.file === name ? artifact(dir, name) : row)) });
};
// The v1 forgery from the 2026-10-02 security review, verbatim in shape: the manifest names its own HMAC key file,
// so any file with known bytes (package.json, /dev/null) signs a bundle no recorder ever produced.
function forgeNamedKey(id: string, namedKey: string) {
	const dir = path.join('.scratch/evidence-validator-tests', id);
	fs.mkdirSync(dir, { recursive: true });
	const forged = { command: 'true', vitest_config: 'sha256:fake', tsconfig_base: 'sha256:fake', lockfile: 'sha256:fake' };
	fs.writeFileSync(path.join(dir, 'red.log'), logText({ head: HEAD, parent: BASE, configuration: forged, exit: 1 }));
	fs.writeFileSync(path.join(dir, 'green.log'), logText({ head: HEAD, parent: BASE, configuration: forged, exit: 0 }));
	fs.writeFileSync(path.join(dir, 'test-patch.diff'), '');
	const fields = { trust_class: 'owner_attested', boot_id: 'forged', head: HEAD, base: BASE, outcome: 'pass' };
	const signature = createHmac('sha256', fs.readFileSync(namedKey)).update(JSON.stringify(fields, Object.keys(fields).sort())).digest('hex');
	writeManifest(dir, { schema_version: 'agora.evidence-manifest/v1', target: 'local-foundation-fixture', outcome: 'pass', artifacts: ['red.log', 'green.log', 'test-patch.diff'].map((name) => artifact(dir, name)), producer: { ...fields, key_file: namedKey, signature } });
	return dir;
}

function buildFixture(id: string) {
	const dir = path.join('.scratch/evidence-validator-tests', id);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, 'red.log'), logText({ head: HEAD, parent: BASE, configuration, exit: 1 }));
	fs.writeFileSync(path.join(dir, 'green.log'), logText({ head: HEAD, parent: BASE, configuration, exit: 0 }));
	fs.writeFileSync(path.join(dir, 'test-patch.diff'), `diff for ${id}\n`);
	const keyFile = path.join('.scratch/evidence-validator-tests', `${id}.key`);
	fs.writeFileSync(keyFile, randomBytes(32));
	writeManifest(dir, signed(fs.readFileSync(keyFile), {
		schema_version: 'agora.evidence-manifest/v2',
		target: 'local-foundation-fixture',
		outcome: 'pass',
		artifacts: ['red.log', 'green.log', 'test-patch.diff'].map((name) => artifact(dir, name)),
		producer: { trust_class: 'owner_attested', boot_id: randomUUID(), head: HEAD, base: BASE, outcome: 'pass' },
	}));
	return { dir, keyFile };
}
const cleanup = (dir: string, keyFile: string) => { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(keyFile, { force: true }); };

test('project lane 5 rejects wrong head, wrong base and mismatched configuration', () => {
	const { dir, keyFile } = buildFixture(randomUUID());
	expect(run(dir, keyFile).outcome).toBe('pass');
	const red = path.join(dir, 'red.log'), original = fs.readFileSync(red, 'utf8');
	fs.writeFileSync(red, original.replace(`head: ${HEAD}`, `head: ${'a'.repeat(40)}`));
	reseal(dir, keyFile);
	const wrongHead = run(dir, keyFile); expect(wrongHead.outcome).toBe('fail'); expect(wrongHead.reason_code).toBe('wrong_head');
	fs.writeFileSync(red, original.replace(`parent: ${BASE}`, `parent: ${'c'.repeat(40)}`));
	reseal(dir, keyFile);
	const wrongBase = run(dir, keyFile); expect(wrongBase.outcome).toBe('fail'); expect(wrongBase.reason_code).toBe('wrong_base');
	fs.writeFileSync(red, original.replace('"vitest_config":"sha256:aaaa"', '"vitest_config":"sha256:dddd"'));
	reseal(dir, keyFile);
	const configMismatch = run(dir, keyFile); expect(configMismatch.outcome).toBe('fail'); expect(configMismatch.reason_code).toBe('config_mismatch');
	cleanup(dir, keyFile);
});

test('project lane 6 rejects missing proof, mutated artifact bytes and an unsupported target', () => {
	// A v1 bundle signed with the owner's real key, then a log replaced by someone without it: v1 never signed the artifacts.
	const ownerKey = path.join('.scratch/evidence-validator-tests', `${randomUUID()}.key`);
	fs.writeFileSync(ownerKey, randomBytes(32));
	const v1 = forgeNamedKey(randomUUID(), ownerKey);
	swapUnsigned(v1, 'green.log', logText({ head: HEAD, parent: BASE, configuration: { command: 'true', vitest_config: 'sha256:fake', tsconfig_base: 'sha256:fake', lockfile: 'sha256:fake' }, exit: 0 }) + 'replaced, no test ran\n');
	expect(run(v1, ownerKey).outcome).toBe('fail');
	cleanup(v1, ownerKey);

	const { dir, keyFile } = buildFixture(randomUUID());
	const diff = path.join(dir, 'test-patch.diff');
	fs.rmSync(diff);
	const missing = run(dir, keyFile); expect(missing.outcome).toBe('fail'); expect(missing.reason_code).toBe('missing_proof');
	fs.writeFileSync(diff, 'mutated bytes that do not match the recorded digest\n');
	const mutated = run(dir, keyFile); expect(mutated.outcome).toBe('fail'); expect(mutated.reason_code).toBe('artifact_mismatch');
	reseal(dir, keyFile);
	expect(run(dir, keyFile).outcome).toBe('pass');
	// The same swap on a v2 bundle: the digest now matches the bytes, but the signature covers the digest.
	swapUnsigned(dir, 'green.log', logText({ head: HEAD, parent: BASE, configuration, exit: 0 }) + 'replaced, no test ran\n');
	const unsigned = run(dir, keyFile); expect(unsigned.outcome).toBe('fail'); expect(unsigned.reason_code).toBe('producer_signature_invalid');
	reseal(dir, keyFile);
	const manifestBefore = readManifest(dir);
	writeManifest(dir, { ...manifestBefore, target: 'unsupported-target' });
	const target = run(dir, keyFile); expect(target.outcome).toBe('fail'); expect(target.reason_code).toBe('unsupported_target');
	cleanup(dir, keyFile);
});

test('project lane 7 rejects exit/outcome mismatch and a stale or forged producer signature; weakening turns its own assertion red', () => {
	const id = randomUUID();
	// The review's forgery: the bundle names a key anyone has. The verifier's own key must decide, so both are refused.
	const { dir, keyFile } = buildFixture(id);
	for (const namedKey of ['package.json', '/dev/null']) {
		const forgedDir = forgeNamedKey(randomUUID(), namedKey);
		expect(run(forgedDir, keyFile).outcome).toBe('fail');
		fs.rmSync(forgedDir, { recursive: true, force: true });
	}
	// The same attack in v2 shape: naming a key in the manifest changes nothing, the signature is checked with --key.
	const honest = readManifest(dir);
	writeManifest(dir, signed(fs.readFileSync('package.json'), { ...honest, producer: { ...honest.producer, key_file: 'package.json' } }));
	const namedKey = run(dir, keyFile); expect(namedKey.outcome).toBe('fail'); expect(namedKey.reason_code).toBe('producer_signature_invalid');
	writeManifest(dir, honest);
	expect(run(dir, keyFile).outcome).toBe('pass');

	const red = path.join(dir, 'red.log'), redOriginal = fs.readFileSync(red, 'utf8');
	fs.writeFileSync(red, redOriginal.replace('observed_exit: 1', 'observed_exit: 0'));
	reseal(dir, keyFile);
	const exitMismatch = run(dir, keyFile); expect(exitMismatch.outcome).toBe('fail'); expect(exitMismatch.reason_code).toBe('exit_mismatch');
	// A red killed by a signal never exited, even when its owner signs it.
	fs.writeFileSync(red, redOriginal.replace('observed_exit: 1', 'observed_exit: null (SIGKILL after timeout)'));
	reseal(dir, keyFile);
	const malformed = run(dir, keyFile); expect(malformed.outcome).toBe('fail'); expect(malformed.reason_code).toBe('malformed_exit');
	fs.writeFileSync(red, redOriginal);
	reseal(dir, keyFile);
	expect(run(dir, keyFile).outcome).toBe('pass');

	const manifest = readManifest(dir), original = JSON.stringify(manifest);
	writeManifest(dir, { ...manifest, outcome: 'fail' });
	const outcomeMismatch = run(dir, keyFile); expect(outcomeMismatch.outcome).toBe('fail'); expect(outcomeMismatch.reason_code).toBe('outcome_mismatch');
	fs.writeFileSync(path.join(dir, 'manifest.json'), original);

	writeManifest(dir, { ...manifest, producer: { ...manifest.producer, signature: 'a'.repeat(64) } });
	const forged = run(dir, keyFile); expect(forged.outcome).toBe('fail'); expect(forged.reason_code).toBe('producer_signature_invalid');
	fs.writeFileSync(path.join(dir, 'manifest.json'), original);
	fs.rmSync(keyFile);
	const stale = run(dir, keyFile); expect(stale.outcome).toBe('fail'); expect(stale.reason_code).toBe('stale_producer');
	fs.writeFileSync(keyFile, randomBytes(32));

	const validatorSource = fs.readFileSync('scripts/validate-evidence.mjs', 'utf8');
	const needle = "requireThat(signature === expectedSignature, 'producer_signature_invalid');";
	expect(validatorSource.split(needle).length).toBe(2);
	writeManifest(dir, { ...manifest, producer: { ...manifest.producer, signature: 'a'.repeat(64) } });
	const copy = `.scratch/validate-evidence-guard-${id}.mjs`;
	try {
		for (const weakened of [false, true]) {
			const source = (weakened ? validatorSource.replace(needle, 'true;') : validatorSource).replaceAll("from './", "from '../scripts/");
			fs.writeFileSync(copy, source);
			expect(runValidator(copy, dir, keyFile).outcome).toBe(weakened ? 'pass' : 'fail');
		}
	} finally {
		fs.rmSync(copy, { force: true });
	}
	cleanup(dir, keyFile);
});
