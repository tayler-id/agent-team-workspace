import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['node_modules/', '.scratch/', '.agents/', 'agent/', 'data/', 'skills/', '.*/', 'evidence/', 'scripts/verify-design.mjs', 'scripts/test-design-checks.mjs', 'contracts/generated/', 'contracts/swift/'] },
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
		files: ['**/*.mjs', '**/*.js'],
		extends: [tseslint.configs.disableTypeChecked],
		languageOptions: { globals: { console: 'readonly', fetch: 'readonly', process: 'readonly' } },
		rules: { 'no-console': 'off' },
	},
);
