import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				test: { name: 'unit', include: ['apps/*/test/**/*.test.ts', 'packages/*/test/**/*.test.ts'], exclude: ['**/*.pg.test.ts'] },
			},
			{
				// Contract tests drive SwiftPM; one build directory cannot serve two concurrent runs, so files run one at a time.
				test: { name: 'contracts', include: ['contracts/test/**/*.test.ts'], fileParallelism: false, testTimeout: 600_000 },
			},
			'./apps/web/vitest.config.ts',
			{
				test: {
					name: 'pg',
					include: ['apps/*/test/**/*.pg.test.ts', 'packages/*/test/**/*.pg.test.ts'],
					globalSetup: ['./scripts/require-test-postgres.ts'],
					fileParallelism: false,
					testTimeout: 30_000,
				},
			},
		],
	},
});
