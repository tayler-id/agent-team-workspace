import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { expect, test } from 'vitest';
import { createWireValidator, wireSchemaFamilies } from '@agora/contracts';
import { runSwiftConsumer } from '../src/conform-cli.ts';
import { compareConsumers, runTypeScriptConsumer, type VectorFile } from '../src/conformance.ts';

const file = JSON.parse(readFileSync(new URL('../fixtures/vectors.json', import.meta.url), 'utf8')) as VectorFile;
const vectors = file.vectors.filter((v) => v.id.startsWith('sync-'));
const validator = createWireValidator();
const accepted = (component: (typeof vectors)[number]['component'], wire: string) => validator.components.includes(component) && validator.validate(component, JSON.parse(wire)).ok;

test('the live wire driver accepts baseline health and the literal synchronization values', () => {
	expect(validator.validate('HealthReport', { schema_version: 'agora.health/v1', status: 'ok', service: 'agora-center' }).ok).toBe(true);
	for (const vector of vectors) expect({ id: vector.id, accepted: accepted(vector.component, vector.wire) }).toEqual({ id: vector.id, accepted: vector.expect === 'accept' });
	expect(vectors.length).toBeGreaterThanOrEqual(20);
});

test('Swift and TypeScript agree on closed synchronization values and decimal precision', () => {
	const swift = runSwiftConsumer();
	expect(swift.message ?? swift.outcome).toBe('pass');
	if (!swift.report) throw new Error('Swift did not return a report');
	// Missing new components are a behavioral refusal by the existing driver, never a missing runner red.
	const available = { ...file, vectors: file.vectors.filter((v) => validator.components.includes(v.component)) };
	const joint = compareConsumers({ ...file, vectors }, runTypeScriptConsumer(available), swift.report);
	expect(joint.filter((r) => r.outcome !== 'pass').map((r) => r.id)).toEqual([]);
	const result = swift.report.vectors.find((v) => v.id === 'sync-cursor-large');
	expect(result?.canonical).toBe('{"committed_seq":"9007199254740993","stream_id":"11111111-1111-4111-8111-111111111111"}');
});

test('fixture synchronization is not reachable from any production HTTP operation', () => {
	const document = readFileSync(new URL('../openapi.json', import.meta.url), 'utf8');
	expect(document).toContain('/api/v1/health');
	expect(document).not.toContain('FixtureSync');
});

test('removing the event-kind and unknown-field guards makes the denial assertions turn red', () => {
	const family = wireSchemaFamilies.find((f) => f.$id.endsWith('/fixture-sync.schema.json'));
	expect(family?.$id).toBe('https://agora.invalid/schemas/fixture-sync.schema.json');
	if (!family) return;
	interface MutableFamily { $id: string; $defs: Record<string, { additionalProperties: boolean; properties: Record<string, { enum?: string[] }> }> }
	for (const [id, disable] of [
		['sync-event-unknown-kind', (schema: MutableFamily['$defs'][string]) => { const kind = schema.properties['kind']; if (kind) delete kind.enum; }],
		['sync-event-unknown-field', (schema: MutableFamily['$defs'][string]) => { schema.additionalProperties = true; }],
	] as const) {
		const vector = vectors.find((v) => v.id === id);
		if (!vector) throw new Error(`missing ${id}`);
		const payload: unknown = JSON.parse(vector.wire);
		expect(accepted(vector.component, vector.wire)).toBe(false);
		const weakened = structuredClone(family) as unknown as MutableFamily;
		const schema = weakened.$defs['FixtureSyncMessageEvent'];
		if (!schema) throw new Error('missing event schema');
		disable(schema);
		const ajv = new Ajv2020({ strict: true });
		for (const source of wireSchemaFamilies) ajv.addSchema(source.$id === family.$id ? weakened : source);
		const validate = ajv.compile({ $ref: `${family.$id}#/$defs/FixtureSyncMessageEvent` });
		expect(() => { expect(validate(payload)).toBe(false); }).toThrow('expected true to be false');
	}
});
