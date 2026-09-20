import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { importBoundaryRule } from './scripts/boundary-policy.ts';
import { publicTypesRule } from './scripts/public-types.ts';

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
		files: ['contracts/**/*.ts', 'packages/*/src/**/*.ts', 'apps/*/src/**/*.ts'],
		ignores: ['contracts/test/**'],
		plugins: { agora: { rules: { 'import-boundary': importBoundaryRule, 'public-types': publicTypesRule } } },
		rules: { 'agora/import-boundary': 'error', 'agora/public-types': 'error' },
	},
	{
		files: ['contracts/**/*.mjs'],
		plugins: { agora: { rules: { 'import-boundary': importBoundaryRule } } },
		rules: { 'agora/import-boundary': 'error' },
	},
	{
		files: ['contracts/generated/**/*.d.ts'],
		rules: { '@typescript-eslint/consistent-indexed-object-style': 'off' },
	},
	{
		files: ['**/*.mjs', '**/*.js', 'docs/site/test/*.test.ts'],
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
