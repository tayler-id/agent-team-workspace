import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				// packages/verification/test/project.test.ts hashes every tracked+untracked file under apps/packages/scripts/contracts/agora
				// as its live freshness digest; a concurrent file (e.g. app-architecture.test.ts's owner-stub setup/cleanup) writing into
				// those same trees mid-run flips that digest and makes the instance it started against look stale. Serialize unit files.
				// apps/web/test is excluded here and run instead through its own project below: those tests need jsdom + the React
				// plugin (apps/web/vitest.config.ts), which this Node-environment project does not provide.
				test: { name: 'unit', include: ['apps/*/test/**/*.test.ts', 'packages/*/test/**/*.test.ts'], exclude: ['**/*.pg.test.ts', 'apps/web/test/**'], fileParallelism: false },
			},
			// Runs apps/web's own tests (including .test.tsx) under its own jsdom + React environment, so the root
			// gate exercises the same behavior pnpm web:test already proves passes instead of the wrong Node environment.
			'apps/web/vitest.config.ts',
			{
				// Contract tests drive SwiftPM; one build directory cannot serve two concurrent runs, so files run one at a time.
				test: { name: 'contracts', include: ['contracts/test/**/*.test.ts'], fileParallelism: false, testTimeout: 600_000 },
			},
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
