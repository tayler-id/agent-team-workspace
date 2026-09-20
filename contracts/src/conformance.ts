import { type ComponentName } from './index.ts';

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

// Harness revision: the TypeScript consumer starts and reports every vector unavailable until a contract is published.
export function runTypeScriptConsumer(file: VectorFile): ConsumerReport {
	return { schema_version: 'agora.contract-conformance/v1', consumer: 'typescript', vectors: file.vectors.map((vector) => ({ id: vector.id, accepted: false, rejection: 'unavailable: no published contract' })) };
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
