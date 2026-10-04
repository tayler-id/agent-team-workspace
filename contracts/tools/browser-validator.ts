// Compile the authoritative schemas at build time so browser bundles never evaluate strings; CSP never needs unsafe-eval.
import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standalone from 'ajv/dist/standalone/index.js';
import { wireSchemaFamilies } from '../src/index.ts';

// Every component createWireValidator compiles, under the same options.
export function browserValidatorSource(): string {
	const ajv = addFormats.default(new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false, validateFormats: true, code: { source: true } }));
	const refs: Record<string, string> = {};
	for (const family of wireSchemaFamilies) {
		ajv.addSchema(family);
		for (const name of Object.keys(family.$defs)) refs[name] = `${family.$id}#/$defs/${name}`;
	}
	return standalone.default(ajv, refs);
}

const entry = '\0agora-contracts-browser.js';
const compiled = '\0agora-contracts-standalone.cjs';
const here = fileURLToPath(import.meta.url);
const shared = fileURLToPath(new URL('../src/wire-validator.ts', import.meta.url));

interface ResolveContext { resolve(id: string, importer: string, options: { skipSelf: boolean }): Promise<unknown> }
interface BrowserValidatorPlugin {
	readonly name: string;
	readonly enforce: 'pre';
	resolveId(this: ResolveContext, id: string, importer?: string): string | Promise<unknown> | undefined;
	load(id: string): string | undefined;
}

// Vite plugin: `@agora/contracts` becomes createWireValidator over the standalone validators. Type-only and other subpath imports are unaffected.
export function browserValidatorPlugin(): BrowserValidatorPlugin {
	return {
		name: 'agora-browser-validator',
		enforce: 'pre',
		resolveId(id, importer) {
			if (id === '@agora/contracts') return entry;
			if (id === compiled) return compiled;
			// The standalone code requires Ajv runtime helpers, which only the contracts package depends on.
			if (importer === compiled) return this.resolve(id, here, { skipSelf: true });
			return undefined;
		},
		load(id) {
			if (id === entry) return `import validators from ${JSON.stringify(compiled)};\nimport { wireValidatorOf } from ${JSON.stringify(shared)};\nexport const createWireValidator = () => wireValidatorOf(validators);\n`;
			if (id === compiled) return browserValidatorSource();
			return undefined;
		},
	};
}
