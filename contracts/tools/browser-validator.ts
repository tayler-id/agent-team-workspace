// Compile the authoritative schemas before browser launch; CSP never needs unsafe-eval.
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standalone from 'ajv/dist/standalone/index.js';
import { wireSchemaFamilies } from '../src/index.ts';

export function browserValidatorSource(): string {
	const ajv = addFormats.default(new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false, code: { source: true } }));
	for (const family of wireSchemaFamilies) ajv.addSchema(family);
	const names = ['RoomSnapshot', 'RoomEventBatch', 'SendRoomMessageCommand', 'RoomCommandReceipt'];
	return standalone.default(ajv, Object.fromEntries(names.map((name) => [name, `https://agora.invalid/schemas/local-room.schema.json#/$defs/${name}`])));
}
export const browserValidatorWrapper = (compiled: string, canonical: string): string => `
import validators from ${JSON.stringify(compiled)};
export { canonicalJson } from ${JSON.stringify(canonical)};
export function createWireValidator() {
	return { validate(name, value) {
		const validate = validators[name];
		if (!validate) throw new Error('unknown component ' + name);
		return validate(value) ? {ok: true, value} : {ok: false, details: validate.errors.map(e => e.instancePath + ' ' + e.message)};
	} };
}
`;
