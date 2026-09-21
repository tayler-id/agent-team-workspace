import { lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export interface SocketLease {
	readonly identity: Readonly<{ runId: string; artifactDir: string; socketDir: string }>;
	verify: () => void;
	cleanup: () => void;
}

// Allocation only. A caller must stop PostgreSQL before releasing its socket lease.
export function allocatePostgresSocket(artifacts: string, runId: string = randomUUID()): SocketLease {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(runId)) throw new Error('invalid run identity');
	const artifactDir = realpathSync(artifacts);
	const temporaryRoot = realpathSync('/tmp');
	if (temporaryRoot !== (process.platform === 'darwin' ? '/private/tmp' : '/tmp')) throw new Error('unsafe temporary root');
	const socketDir = path.join(temporaryRoot, `agora-p0c-${runId}`);
	mkdirSync(socketDir, { mode: 0o700 }); // Exclusive: never adopt an existing location, even for this run ID.
	const allocated = lstatSync(socketDir);
	const identity = Object.freeze({ runId, artifactDir, socketDir });
	const record = path.join(socketDir, 'owner.json');
	const bytes = JSON.stringify(identity);
	try { writeFileSync(record, bytes, { mode: 0o600, flag: 'wx' }); }
	catch (error) { rmdirSync(socketDir); throw error; }
	const owned = (): boolean => {
		try {
			const directory = lstatSync(socketDir);
			const marker = lstatSync(record);
			return directory.isDirectory() && directory.ino === allocated.ino && directory.dev === allocated.dev
				&& directory.uid === process.getuid?.() && (directory.mode & 0o777) === 0o700
				&& marker.isFile() && marker.nlink === 1 && marker.uid === directory.uid && (marker.mode & 0o777) === 0o600
				&& readFileSync(record, 'utf8') === bytes;
		} catch { return false; } // Missing or ambiguous resources are never ours to remove.
	};
	const verify = (): void => {
		if (!owned()) throw new Error('socket ownership mismatch');
	};
	let removed = false;
	const cleanup = (): void => {
		if (removed) return;
		verify();
		if (readdirSync(socketDir).some(name => name !== 'owner.json')) throw new Error('socket not empty');
		unlinkSync(record);
		rmdirSync(socketDir); // Never recursively delete unknown children or follow a substituted symlink.
		removed = true;
	};
	return { identity, verify, cleanup };
}
