import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { assertArchitectureExceptionsValid } from './scripts/architecture-exceptions.ts';
import { importBoundaryRule } from './scripts/boundary-policy.ts';
import { publicTypesRule } from './scripts/public-types.ts';
import { rendererFootgunRule } from './scripts/renderer-policy.ts';

assertArchitectureExceptionsValid();

const guarded = [
	'contracts/**/*.{ts,tsx,mts,cts,js,mjs,cjs}',
	'packages/*/src/**/*.{ts,tsx,mts,cts,js,mjs,cjs}',
	'apps/*/src/**/*.{ts,tsx,mts,cts,js,mjs,cjs}',
];

export default tseslint.config(
	{ ignores: ['node_modules/', '.docs-dist/', '.scratch/', '.agents/', 'agent/', 'data/', 'skills/', '.*/', 'evidence/', 'scripts/verify-design.mjs', 'scripts/test-design-checks.mjs', 'contracts/swift/'] },
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
		},
		rules: {
			'@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
			'@typescript-eslint/explicit-module-boundary-types': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': ['error', { considerDefaultExhaustiveForUnions: true }],
			'@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
			'no-console': ['error', { allow: ['error'] }],
		},
	},
	{
		files: guarded,
		ignores: ['contracts/test/**', '**/*.{mjs,cjs}'],
		linterOptions: {
			// Configuration-level owner: inline eslint-disable cannot suppress Agora architecture rules.
			noInlineConfig: true,
		},
		plugins: {
			agora: {
				rules: {
					'import-boundary': importBoundaryRule,
					'public-types': publicTypesRule,
					'renderer-footgun': rendererFootgunRule,
				},
			},
		},
		rules: {
			'agora/import-boundary': 'error',
			'agora/public-types': 'error',
			'agora/renderer-footgun': 'error',
		},
	},
	// .mjs/.cjs under apps/packages: same Agora owners without type-aware project service.
	{
		files: ['apps/*/src/**/*.{mjs,cjs}', 'packages/*/src/**/*.{mjs,cjs}'],
		extends: [tseslint.configs.disableTypeChecked],
		linterOptions: { noInlineConfig: true },
		plugins: {
			agora: {
				rules: {
					'import-boundary': importBoundaryRule,
					'renderer-footgun': rendererFootgunRule,
				},
			},
		},
		rules: {
			'agora/import-boundary': 'error',
			'agora/renderer-footgun': 'error',
		},
	},
	{
		files: ['contracts/**/*.mjs'],
		linterOptions: { noInlineConfig: true },
		plugins: { agora: { rules: { 'import-boundary': importBoundaryRule } } },
		rules: { 'agora/import-boundary': 'error' },
	},
	{
		files: ['contracts/generated/**/*.d.ts'],
		rules: { '@typescript-eslint/consistent-indexed-object-style': 'off' },
	},
	{
		files: ['**/*.mjs', '**/*.js', 'docs/site/test/*.test.ts'],
		// Keep type-aware lint for JS under apps/packages src; tooling JS and contracts scripts stay untyped.
		ignores: ['apps/*/src/**', 'packages/*/src/**'],
		extends: [tseslint.configs.disableTypeChecked],
		languageOptions: { globals: { console: 'readonly', fetch: 'readonly', process: 'readonly' } },
		rules: { 'no-console': 'off' },
	},
	{
		files: ['docs/site/*.mjs', 'scripts/foundation*.mjs'],
		// JavaScript build tools have no TypeScript annotation syntax.
		rules: { '@typescript-eslint/explicit-module-boundary-types': 'off' },
	},
);
