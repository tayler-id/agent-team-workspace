import { mkdirSync, mkdtempSync, realpathSync, rmSync, statSync } from 'node:fs';
import { afterAll, expect, test } from 'vitest';
import { allocatePostgresSocket } from '../../../scripts/postgres-socket.ts';

mkdirSync('.scratch', { recursive: true });
const artifacts = mkdtempSync(`${realpathSync('.scratch')}/socket-test-`);
afterAll(() => { rmSync(artifacts, { recursive: true }); });

test('allocation baseline: creates a private empty directory without touching artifacts', () => {
	const lease = allocatePostgresSocket(artifacts);
	try {
		lease.verify();
		expect(statSync(lease.identity.socketDir).mode & 0o777).toBe(0o700);
		expect(lease.identity.artifactDir).toBe(artifacts);
	} finally { lease.cleanup(); }
});
