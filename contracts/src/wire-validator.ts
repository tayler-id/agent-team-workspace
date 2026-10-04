import type { components } from '../generated/typescript/openapi.d.ts';

export type ComponentName = keyof components['schemas'];
export type Schema<Name extends ComponentName> = components['schemas'][Name];
export type Validation<Name extends ComponentName> = { ok: true; value: Schema<Name> } | { ok: false; details: string[] };

export interface WireValidator {
	readonly components: readonly ComponentName[];
	validate<Name extends ComponentName>(name: Name, value: unknown): Validation<Name>;
}

interface CompiledValidator {
	(value: unknown): boolean;
	errors?: readonly { instancePath: string; message?: string }[] | null;
}

// Shared by Node (validators compiled at runtime) and the browser bundle (standalone validators compiled at build time).
export function wireValidatorOf(validators: Readonly<Record<string, CompiledValidator>>): WireValidator {
	return {
		components: Object.keys(validators).sort() as ComponentName[],
		validate(name, value) {
			const validate = Object.hasOwn(validators, name) ? validators[name] : undefined;
			if (!validate) throw new Error(`unknown component ${name}`);
			if (validate(value)) return { ok: true, value: value as Schema<typeof name> };
			return { ok: false, details: (validate.errors ?? []).map((e) => `${e.instancePath || '$'} ${e.message ?? 'invalid'}`) };
		},
	};
}
