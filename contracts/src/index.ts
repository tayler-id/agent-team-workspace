export { canonicalJson, digestCanonical, type Digest } from './canonical.ts';

// Harness revision: no contract is published yet. The validator knows no component and reports every value unavailable.
export type ComponentName = string;

export interface WireValidator {
	readonly components: readonly ComponentName[];
	validate(name: ComponentName, value: unknown): { ok: false; details: string[] };
}

export function createWireValidator(): WireValidator {
	return { components: [], validate: (name) => ({ ok: false, details: [`unavailable: no published component ${name}`] }) };
}
