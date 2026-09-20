import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				test: { name: 'unit', include: ['apps/*/test/**/*.test.ts', 'packages/*/test/**/*.test.ts'], exclude: ['**/*.pg.test.ts'] },
			},
			{
				test: {
					name: 'pg',
					include: ['packages/*/test/**/*.pg.test.ts'],
					globalSetup: ['./scripts/require-test-postgres.ts'],
					fileParallelism: false,
					testTimeout: 30_000,
				},
			},
		],
	},
});
