import { createPublicKey, verify } from 'node:crypto';
import { canonicalJson, digestCanonical } from './canonical.ts';
import { type ComponentName, createWireValidator } from './index.ts';

// Golden vectors carry wire bytes as text so each consumer parses exactly what would arrive on the wire.
export interface Vector {
	id: string;
	component: ComponentName;
	wire: string;
	expect: 'accept' | 'reject';
	reason?: string;
	canonical?: string;
	digest?: string;
	signature?: { algorithm: 'ed25519'; public_key: string; signature: string; valid: boolean };
}

export interface VectorFile {
	schema_version: 'agora.contract-vectors/v1';
	vectors: Vector[];
}

export interface VectorResult {
	id: string;
	accepted: boolean;
	rejection?: string;
	generated_decode?: string;
	canonical?: string;
	digest?: string;
	signature?: 'valid' | 'invalid';
}

export interface ConsumerReport {
	schema_version: 'agora.contract-conformance/v1';
	consumer: 'typescript' | 'swift';
	vectors: VectorResult[];
}

export function runTypeScriptConsumer(file: VectorFile): ConsumerReport {
	const validator = createWireValidator();
	return {
		schema_version: 'agora.contract-conformance/v1',
		consumer: 'typescript',
		vectors: file.vectors.map((vector) => {
			let parsed: unknown;
			try {
				parsed = JSON.parse(vector.wire);
			} catch (error) {
				return { id: vector.id, accepted: false, rejection: `not json: ${error instanceof Error ? error.message : String(error)}` };
			}
			const validation = validator.validate(vector.component, parsed);
			if (!validation.ok) return { id: vector.id, accepted: false, rejection: validation.details.join('; ') };
			const canonical = canonicalJson(validation.value);
			const result: VectorResult = { id: vector.id, accepted: true, canonical, digest: digestCanonical(validation.value) };
			if (vector.signature) result.signature = verifyDetached(canonical, vector.signature.public_key, vector.signature.signature) ? 'valid' : 'invalid';
			return result;
		}),
	};
}

// R05: signatures cover the canonical bytes of the payload, never a typed object that may have dropped fields.
export function verifyDetached(canonical: string, publicKeyHex: string, signatureHex: string): boolean {
	const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(publicKeyHex, 'hex').toString('base64url') }, format: 'jwk' });
	return verify(null, Buffer.from(canonical, 'utf8'), key, Buffer.from(signatureHex, 'hex'));
}

export type Consumer = 'typescript' | 'swift';

export interface JointVectorResult {
	id: string;
	expect: 'accept' | 'reject';
	outcome: 'pass' | 'fail';
	typescript: VectorResult;
	swift: VectorResult;
	disagreements: string[];
}

// Both consumers must reach the golden acceptance, canonical bytes, digest and signature verdict, and each other.
export function compareConsumers(file: VectorFile, typescript: ConsumerReport, swift: ConsumerReport): JointVectorResult[] {
	const byId = (report: ConsumerReport) => new Map(report.vectors.map((v) => [v.id, v]));
	const ts = byId(typescript);
	const sw = byId(swift);
	return file.vectors.map((vector) => {
		const a = ts.get(vector.id) ?? { id: vector.id, accepted: false, rejection: 'typescript: no result' };
		const b = sw.get(vector.id) ?? { id: vector.id, accepted: false, rejection: 'swift: no result' };
		const disagreements: string[] = [];
		const wanted = vector.expect === 'accept';
		for (const [consumer, result] of [['typescript', a], ['swift', b]] as const) {
			if (result.rejection?.startsWith('unavailable')) disagreements.push(`${consumer}: ${result.rejection}; an unavailable consumer is never a pass`);
			else if (result.accepted !== wanted) disagreements.push(`${consumer}: ${result.accepted ? 'accepted' : `rejected (${result.rejection ?? 'no reason'})`}, golden ${vector.expect}`);
			if (wanted && vector.canonical !== undefined && result.canonical !== vector.canonical) disagreements.push(`${consumer}: canonical bytes differ from golden`);
			if (wanted && vector.digest !== undefined && result.digest !== vector.digest) disagreements.push(`${consumer}: digest ${result.digest ?? 'absent'}, golden ${vector.digest}`);
			if (vector.signature && result.signature !== (vector.signature.valid ? 'valid' : 'invalid')) disagreements.push(`${consumer}: signature ${result.signature ?? 'unverified'}, golden ${vector.signature.valid ? 'valid' : 'invalid'}`);
		}
		if (a.accepted && b.accepted && (a.canonical !== b.canonical || a.digest !== b.digest)) disagreements.push('typescript and swift disagree on canonical bytes or digest');
		return { id: vector.id, expect: vector.expect, outcome: disagreements.length ? 'fail' : 'pass', typescript: a, swift: b, disagreements };
	});
}
