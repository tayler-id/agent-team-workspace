import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { assertArchitectureExceptionsValid } from './scripts/architecture-exceptions.ts';
import { importBoundaryRule } from './scripts/boundary-policy.ts';
import { publicTypesRule } from './scripts/public-types.ts';
import { rendererFootgunRule } from './scripts/renderer-policy.ts';

// Fail closed at config load: an invalid exceptions file must stop every lint run, not only runs that hit a violation.
assertArchitectureExceptionsValid();

const exts = '{ts,tsx,mts,cts,js,jsx,mjs,cjs}';
const agoraPlugin = {
	agora: {
		rules: {
			'import-boundary': importBoundaryRule,
			'public-types': publicTypesRule,
			'renderer-footgun': rendererFootgunRule,
		},
	},
};
const noInline = { noInlineConfig: true };

export default tseslint.config(
	{ ignores: ['node_modules/', '.docs-dist/', '.scratch/', '.agents/', 'agent/', 'data/', 'skills/', '.*/', 'evidence/', 'scripts/verify-design.mjs', 'scripts/test-design-checks.mjs', 'contracts/swift/'] },
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
		rules: {
			'@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
			'@typescript-eslint/explicit-module-boundary-types': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': ['error', { considerDefaultExhaustiveForUnions: true }],
			'@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
			'no-console': ['error', { allow: ['error'] }],
		},
	},
	{
		files: [`contracts/**/*.${exts}`, `packages/*/src/**/*.${exts}`, `apps/*/src/**/*.${exts}`, `apps/web/**/*.${exts}`],
		ignores: ['contracts/test/**', '**/*.{mjs,cjs}'],
		linterOptions: noInline,
		plugins: agoraPlugin,
		rules: {
			'agora/import-boundary': 'error',
			'agora/public-types': 'error',
			'agora/renderer-footgun': 'error',
		},
	},
	{
		files: [`apps/*/src/**/*.{mjs,cjs}`, `packages/*/src/**/*.{mjs,cjs}`, `apps/web/**/*.{mjs,cjs}`],
		extends: [tseslint.configs.disableTypeChecked],
		linterOptions: noInline,
		plugins: { agora: { rules: { 'import-boundary': importBoundaryRule, 'renderer-footgun': rendererFootgunRule } } },
		rules: { 'agora/import-boundary': 'error', 'agora/renderer-footgun': 'error' },
	},
	{
		files: ['contracts/**/*.js'],
		rules: { 'agora/public-types': 'off', 'agora/renderer-footgun': 'off' },
	},
	{
		files: ['contracts/**/*.{mjs,cjs}'],
		linterOptions: noInline,
		plugins: { agora: { rules: { 'import-boundary': importBoundaryRule } } },
		rules: { 'agora/import-boundary': 'error' },
	},
	{
		files: ['contracts/generated/**/*.d.ts'],
		rules: { '@typescript-eslint/consistent-indexed-object-style': 'off' },
	},
	{
		files: ['**/*.mjs', '**/*.js', 'docs/site/test/*.test.ts'],
		ignores: ['apps/*/src/**', 'packages/*/src/**', 'apps/web/**'],
		extends: [tseslint.configs.disableTypeChecked],
		languageOptions: { globals: { console: 'readonly', fetch: 'readonly', process: 'readonly' } },
		rules: { 'no-console': 'off' },
	},
	{
		files: ['docs/site/*.mjs', 'scripts/foundation*.mjs'],
		rules: { '@typescript-eslint/explicit-module-boundary-types': 'off' },
	},
);
