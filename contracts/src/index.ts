import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import cli from '../schemas/cli.schema.json' with { type: 'json' };
import errors from '../schemas/errors.schema.json' with { type: 'json' };
import fixturePolicy from '../schemas/fixture-policy.schema.json' with { type: 'json' };
import fixtureSync from '../schemas/fixture-sync.schema.json' with { type: 'json' };
import health from '../schemas/health.schema.json' with { type: 'json' };
import localRoom from '../schemas/local-room.schema.json' with { type: 'json' };
import foundation from '../schemas/foundation.schema.json' with { type: 'json' };
import primitives from '../schemas/primitives.schema.json' with { type: 'json' };
import sync from '../schemas/sync.schema.json' with { type: 'json' };
import { wireValidatorOf, type WireValidator } from './wire-validator.ts';

export type { components, operations, paths } from '../generated/typescript/openapi.d.ts';

export { type ComponentName, type Schema, type Validation, type WireValidator } from './wire-validator.ts';

// The authoritative JSON Schema 2020-12 families. Generated consumers derive from these same bytes.
export const wireSchemaFamilies = [primitives, health, fixturePolicy, errors, cli, sync, fixtureSync, foundation, localRoom] as const;

// R07/R21: 2020-12 mode, no coercion, no defaults, no property removal, formats asserted, no network resolution.
export function createWireValidator(): WireValidator {
	const ajv = addFormats.default(new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false, validateFormats: true, loadSchema: () => Promise.reject(new Error('remote schema resolution is disabled')) }));
	const validators: Record<string, ValidateFunction> = {};
	for (const family of wireSchemaFamilies) {
		ajv.addSchema(family);
		for (const name of Object.keys(family.$defs)) validators[name] = ajv.compile({ $ref: `${family.$id}#/$defs/${name}` });
	}
	return wireValidatorOf(validators);
}
