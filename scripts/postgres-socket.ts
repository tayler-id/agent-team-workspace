// R22 test-only allocation baseline. Not wired into the PostgreSQL wrapper.
import { mkdirSync, realpathSync, rmdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export interface SocketLease {
	readonly identity: Readonly<{ runId: string; artifactDir: string; socketDir: string }>;
	verify: () => void;
	cleanup: () => void;
}

export function allocatePostgresSocket(artifacts: string, runId = randomUUID()): SocketLease {
	const artifactDir = realpathSync(artifacts);
	const socketDir = path.join(artifactDir, `agora-p0c-${runId}`);
	mkdirSync(socketDir, { mode: 0o700 });
	return { identity: Object.freeze({ runId, artifactDir, socketDir }), verify: () => { realpathSync(socketDir); }, cleanup: () => { rmdirSync(socketDir); } };
}
