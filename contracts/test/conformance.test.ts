import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createWireValidator } from '@agora/contracts';
import { runSwiftConsumer } from '../src/conform-cli.ts';
import { compareConsumers, type ConsumerReport, runTypeScriptConsumer, type VectorFile } from '../src/conformance.ts';

const file = JSON.parse(readFileSync(new URL('../fixtures/vectors.json', import.meta.url), 'utf8')) as VectorFile;
const typescript = runTypeScriptConsumer(file);
const ts = (id: string) => {
	const result = typescript.vectors.find((v) => v.id === id);
	if (!result) throw new Error(`no result for ${id}`);
	return result;
};
const golden = (id: string) => {
	const vector = file.vectors.find((v) => v.id === id);
	if (!vector) throw new Error(`no vector ${id}`);
	return vector;
};

test('TypeScript reproduces the golden canonical bytes and digests for accepted vectors', () => {
	expect(ts('health-ok')).toEqual({ id: 'health-ok', accepted: true, canonical: '{"schema_version":"agora.health/v1","service":"agora-center","status":"ok"}', digest: 'sha256:a5581901fd5f5f6d8a3ce3bbc91927ad71d2a4cee0151f2b45c47eb27dffcea8' });
	const unicode = ts('error-unicode-details');
	expect(unicode.accepted).toBe(true);
	expect(unicode.canonical).toContain('"café","café","\u{1F600} emoji","tab\\tand\\u0000nul"," line sep","\u007f del","\\"quoted\\" \\\\ slash /"');
	expect(unicode.digest).toBe(golden('error-unicode-details').digest);
	expect(ts('cli-report-byte-length-whole-float').canonical).toContain('"byte_length":1,');
	expect(ts('revision-max')).toMatchObject({ accepted: true, canonical: '"18446744073709551615"' });
});

test('TypeScript rejects each malformed vector at its offending path without coercion, defaults or removal', () => {
	expect(ts('health-unknown-field')).toEqual({ id: 'health-unknown-field', accepted: false, rejection: '$ must NOT have additional properties' });
	expect(ts('decision-allow-reason-null').rejection).toBe('/reason_code must be string; /reason_code must be equal to one of the allowed values');
	expect(ts('cli-report-byte-length-over-safe').rejection).toBe('/artifacts/0/byte_length must be <= 9007199254740991');
	expect(ts('cli-report-byte-length-string').rejection).toBe('/artifacts/0/byte_length must be integer');
	expect(ts('revision-over-max').rejection).toMatch(/^\$ must match pattern/);
	expect(ts('timestamp-trailing-newline').accepted).toBe(false);
	expect(ts('readiness-unknown-state-variant').rejection).toBe('/status must be equal to one of the allowed values');
});

test('detached Ed25519 signatures verify over the canonical bytes, and a tampered payload fails', () => {
	expect(ts('decision-allow-signed').signature).toBe('valid');
	expect(ts('decision-allow-tampered-signature').signature).toBe('invalid');
});

test('every vector meets its golden expectation in TypeScript and every published component has a direct vector', () => {
	const misses = file.vectors.filter((v) => ts(v.id).accepted !== (v.expect === 'accept')).map((v) => v.id);
	expect(misses).toEqual([]);
	const covered = new Set(file.vectors.map((v) => v.component));
	expect(createWireValidator().components.filter((c) => !covered.has(c))).toEqual([]);
	expect(file.vectors.length).toBeGreaterThanOrEqual(60);
});

test('an unavailable consumer result is a failure, never a silent pass on a reject vector', () => {
	const swift: ConsumerReport = { schema_version: 'agora.contract-conformance/v1', consumer: 'swift', vectors: file.vectors.map((v) => ({ id: v.id, accepted: false, rejection: 'unavailable: no generated type registered' })) };
	const joint = compareConsumers(file, typescript, swift);
	expect(joint.every((r) => r.outcome === 'fail')).toBe(true);
	expect(joint[0]?.disagreements[0]).toContain('an unavailable consumer is never a pass');
});

test('the Swift consumer reaches the same acceptance, canonical bytes, digests and signature verdicts', () => {
	const swift = runSwiftConsumer();
	expect(swift.message ?? swift.outcome).toBe('pass');
	if (!swift.report) throw new Error('unreachable');
	expect(swift.report.consumer).toBe('swift');
	const joint = compareConsumers(file, typescript, swift.report);
	expect(joint.filter((r) => r.outcome !== 'pass').map((r) => `${r.id}: ${r.disagreements.join(' | ')}`)).toEqual([]);
	const swiftResult = (id: string) => swift.report?.vectors.find((v) => v.id === id) ?? { id, accepted: false };
	expect(swiftResult('health-ok').canonical).toBe(ts('health-ok').canonical);
	expect(swiftResult('decision-allow-tampered-signature').signature).toBe('invalid');
	// Generated types refuse unknown fields, unknown variants, missing members and wrong types on their own.
	for (const id of ['health-unknown-status-variant', 'health-unknown-field', 'health-missing-service', 'readiness-unknown-state-variant', 'readiness-unknown-check', 'policy-command-unknown-field', 'decision-unknown-variant', 'cli-report-unknown-outcome', 'cli-command-shell-text', 'exit-code-unregistered', 'revision-number-not-string']) {
		expect(`${id}: ${swiftResult(id).generated_decode ?? 'missing'}`).toMatch(new RegExp(`^${id}: refused`));
	}
	// Generated types alone collapse null into absent and ignore pattern and bounds; runtime validation is what rejects these.
	for (const id of ['decision-allow-reason-null', 'cli-report-cleanup-null', 'cli-report-byte-length-over-safe', 'revision-over-max', 'timestamp-offset-not-utc']) {
		expect(swiftResult(id)).toMatchObject({ accepted: false, generated_decode: 'ok' });
	}
});
