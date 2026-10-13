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

test('the ask contract is closed and bounded, the operation pair is published, and Swift refuses what TypeScript refuses', () => {
	const ask = file.vectors.filter((v) => v.id.startsWith('local-ask-'));
	expect(ask.map((v) => v.id)).toEqual(['local-ask-selected', 'local-ask-tools-field', 'local-ask-answered']);
	for (const v of ask) expect({ id: v.id, accepted: validate(v.component, v.wire).ok }).toEqual({ id: v.id, accepted: v.expect === 'accept' });
	const command = JSON.parse(ask[0]?.wire ?? '{}') as Record<string, unknown>;
	const status = JSON.parse(ask[2]?.wire ?? '{}') as Record<string, unknown>;
	const wire = (base: Record<string, unknown>, change: Record<string, unknown>) => JSON.stringify({ ...base, ...change });
	const ids = (n: number) => Array.from({ length: n }, (_, i) => `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`);
	expect(details('LocalAskCommand', ask[1]?.wire ?? '')).toEqual(['$ must NOT have additional properties']);
	expect(details('LocalAskCommand', wire(command, { question: '' }))).toEqual(['/question must NOT have fewer than 1 characters']);
	expect(details('LocalAskCommand', wire(command, { question: 'x'.repeat(1001) }))).toEqual(['/question must NOT have more than 1000 characters']);
	expect(validate('LocalAskCommand', wire(command, { selected_ids: ids(10) })).ok).toBe(true);
	expect(details('LocalAskCommand', wire(command, { selected_ids: ids(11) }))).toEqual(['/selected_ids must NOT have more than 10 items']);
	expect(details('LocalAskCommand', wire(command, { selected_ids: ['44444444-4444-4444-8444-44444444444G'] }))[0]).toMatch(/^\/selected_ids\/0 must match pattern/);
	expect(details('LocalAskCommand', wire(command, { scope: { project_id: command['command_id'] } }))).toEqual(["/scope must have required property 'room_id'"]);
	expect(details('LocalAskStatus', wire(status, { state: 'cancelled' }))).toEqual(['/state must be equal to one of the allowed values']);
	expect(details('LocalAskStatus', wire(status, { failure: 'rate_limited' }))).toEqual(['/failure must be equal to one of the allowed values']);
	expect(details('LocalAskStatus', wire(status, { detail: 'x'.repeat(513) }))).toEqual(['/detail must NOT have more than 512 characters']);
	const operations = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8')) as { paths: Record<string, Record<string, { operationId: string }>> };
	expect(Object.entries(operations.paths['/api/v1/local-room/ask'] ?? {}).map(([method, op]) => `${method} ${op.operationId}`)).toEqual(['post postLocalAsk', 'get getLocalAskStatus']);
	const swift = runSwiftConsumer();
	if (!swift.report) throw new Error('Swift did not return a report');
	expect(swift.report.vectors.filter((v) => v.id.startsWith('local-ask-')).map((v) => `${v.id}: ${v.generated_decode?.split(':')[0]}`)).toEqual(['local-ask-selected: ok', 'local-ask-tools-field: refused', 'local-ask-answered: ok']);
});
