import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { expect, test } from 'vitest';
import { createWireValidator, wireSchemaFamilies } from '@agora/contracts';
import { runSwiftConsumer } from '../src/conform-cli.ts';
import { compareConsumers, runTypeScriptConsumer, type VectorFile } from '../src/conformance.ts';

const file = JSON.parse(readFileSync(new URL('../fixtures/vectors.json', import.meta.url), 'utf8')) as VectorFile;
const vectors = file.vectors.filter((v) => v.id.startsWith('local-room-'));
const validator = createWireValidator();
const vector = (id: string) => {
	const found = vectors.find((v) => v.id === id);
	if (!found) throw new Error(`missing vector ${id}`);
	return found;
};
// A component the driver does not publish is a behavioral refusal at the parent, never a missing runner.
const validate = (component: (typeof vectors)[number]['component'], wire: string) => (validator.components.includes(component) ? validator.validate(component, JSON.parse(wire)) : { ok: false as const, details: [`unknown component ${component}`] });
const details = (component: (typeof vectors)[number]['component'], wire: string): string[] => { const result = validate(component, wire); return result.ok ? [] : result.details; };

test('the wire driver accepts every literal local-room value and refuses each unknown field, variant and bound', () => {
	expect(vectors.length).toBeGreaterThanOrEqual(29);
	for (const v of vectors) expect({ id: v.id, accepted: validate(v.component, v.wire).ok }).toEqual({ id: v.id, accepted: v.expect === 'accept' });
	expect(details('SendRoomMessageCommand', vector('local-room-command-unknown-field').wire)).toEqual(['$ must NOT have additional properties']);
	expect(details('RoomAuthor', vector('local-room-author-unknown-kind').wire)).toEqual(['/kind must be equal to one of the allowed values']);
	expect(details('RoomMessageCreatedEvent', vector('local-room-event-unknown-kind').wire)).toEqual(['/kind must be equal to one of the allowed values']);
	expect(details('RecordCitation', vector('local-room-citation-seq-number').wire)[0]).toBe('/room_seq must be string');
	expect(details('RoomMessageBody', vector('local-room-body-over-max').wire)).toEqual(['$ must NOT have more than 4096 characters']);
});

test('the command identity digest is the canonical digest of the command bytes and the operation is published', () => {
	expect(validator.components).toContain('SendRoomMessageCommand');
	const typescript = runTypeScriptConsumer({ ...file, vectors });
	const command = typescript.vectors.find((v) => v.id === 'local-room-command-ok');
	const identity = JSON.parse(vector('local-room-identity-ok').wire) as { request_digest: string };
	expect(command?.digest).toBe(identity.request_digest);
	expect(command?.canonical).toBe(vector('local-room-command-ok').canonical);
	const operations = readFileSync(new URL('../openapi.json', import.meta.url), 'utf8');
	expect(operations).toContain('"/api/v1/local-room/messages"');
	expect(operations).toContain('#/components/schemas/SendRoomMessageCommand');
	expect(operations).toContain('#/components/schemas/RoomCommandReceipt');
});

test('Swift and TypeScript agree on every local-room acceptance, canonical byte sequence and digest', () => {
	expect(validator.components).toContain('RoomCommandReceipt');
	const swift = runSwiftConsumer();
	expect(swift.message ?? swift.outcome).toBe('pass');
	if (!swift.report) throw new Error('Swift did not return a report');
	const joint = compareConsumers({ ...file, vectors }, runTypeScriptConsumer({ ...file, vectors }), swift.report);
	expect(joint.filter((r) => r.outcome !== 'pass').map((r) => `${r.id}: ${r.disagreements.join(' | ')}`)).toEqual([]);
	for (const id of ['local-room-command-unknown-field', 'local-room-author-unknown-kind', 'local-room-event-unknown-kind', 'local-room-citation-seq-number', 'local-room-receipt-replayed-null']) {
		expect(`${id}: ${swift.report.vectors.find((v) => v.id === id)?.generated_decode ?? 'missing'}`).toMatch(new RegExp(`^${id}: refused`));
	}
});

test('removing the authorship, event-kind or unknown-field guard makes its denial assertion turn red', () => {
	const family = wireSchemaFamilies.find((f) => f.$id.endsWith('/local-room.schema.json'));
	expect(family?.$id).toBe('https://agora.invalid/schemas/local-room.schema.json');
	if (!family) return;
	interface Mutable { $id: string; $defs: Record<string, { additionalProperties: boolean; properties: Record<string, { enum?: string[] }> }> }
	for (const [id, component, disable] of [
		['local-room-author-unknown-kind', 'RoomAuthor', (schema: Mutable['$defs'][string]) => { delete schema.properties['kind']?.enum; }],
		['local-room-event-unknown-kind', 'RoomMessageCreatedEvent', (schema: Mutable['$defs'][string]) => { delete schema.properties['kind']?.enum; }],
		['local-room-command-unknown-field', 'SendRoomMessageCommand', (schema: Mutable['$defs'][string]) => { schema.additionalProperties = true; }],
	] as const) {
		const payload: unknown = JSON.parse(vector(id).wire);
		expect(validate(component, vector(id).wire).ok).toBe(false);
		const weakened = structuredClone(family) as unknown as Mutable;
		const schema = weakened.$defs[component];
		if (!schema) throw new Error(`missing ${component}`);
		disable(schema);
		const ajv = new Ajv2020({ strict: true });
		for (const source of wireSchemaFamilies) ajv.addSchema(source.$id === family.$id ? weakened : source);
		const check = ajv.compile({ $ref: `${family.$id}#/$defs/${component}` });
		expect(() => { expect(check(payload)).toBe(false); }).toThrow('expected true to be false');
	}
});
