import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { components } from '../generated/typescript/openapi.d.ts';
import cli from '../schemas/cli.schema.json' with { type: 'json' };
import errors from '../schemas/errors.schema.json' with { type: 'json' };
import fixturePolicy from '../schemas/fixture-policy.schema.json' with { type: 'json' };
import health from '../schemas/health.schema.json' with { type: 'json' };
import primitives from '../schemas/primitives.schema.json' with { type: 'json' };

export { canonicalJson, digestCanonical, type Digest } from './canonical.ts';
export type { components, operations, paths } from '../generated/typescript/openapi.d.ts';

export type ComponentName = keyof components['schemas'];
export type Schema<Name extends ComponentName> = components['schemas'][Name];

// The authoritative JSON Schema 2020-12 families. Generated consumers derive from these same bytes.
export const wireSchemaFamilies = [primitives, health, fixturePolicy, errors, cli] as const;

export type Validation<Name extends ComponentName> = { ok: true; value: Schema<Name> } | { ok: false; details: string[] };

export interface WireValidator {
	readonly components: readonly ComponentName[];
	validate<Name extends ComponentName>(name: Name, value: unknown): Validation<Name>;
}

// R07/R21: 2020-12 mode, no coercion, no defaults, no property removal, formats asserted, no network resolution.
export function createWireValidator(): WireValidator {
	const ajv = addFormats.default(new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false, validateFormats: true, loadSchema: () => Promise.reject(new Error('remote schema resolution is disabled')) }));
	const validators = new Map<string, ValidateFunction>();
	for (const family of wireSchemaFamilies) {
		ajv.addSchema(family);
		for (const name of Object.keys(family.$defs)) validators.set(name, ajv.compile({ $ref: `${family.$id}#/$defs/${name}` }));
	}
	const components = [...validators.keys()].sort() as ComponentName[];
	return {
		components,
		validate(name, value) {
			const validate = validators.get(name);
			if (!validate) throw new Error(`unknown component ${name}`);
			if (validate(value)) return { ok: true, value: value as Schema<typeof name> };
			return { ok: false, details: (validate.errors ?? []).map((e) => `${e.instancePath || '$'} ${e.message ?? 'invalid'}`) };
		},
	};
}
