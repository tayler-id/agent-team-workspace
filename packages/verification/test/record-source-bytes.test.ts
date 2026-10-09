import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
// Carry the actual pre-refactor reader onto older subjects, not a missing-module red.
const sourceBytes = existsSync('scripts/record-source-bytes.ts')
	? (await import('../../../scripts/record-source-bytes.ts')).sourceBytes
	: readFileSync;

function fixture(drive: (root: string) => void): void {
	mkdirSync('.scratch', { recursive: true });
	const root = mkdtempSync(path.resolve('.scratch/record-source-'));
	try { drive(root); } finally { rmSync(root, { recursive: true }); }
}
function observed(file: string): unknown {
	try { return sourceBytes(file); }
	catch (error) { if (error instanceof Error && 'code' in error) return error.code; throw error; }
}

test('recorded source keeps the existing regular-file byte identity', () => {
	fixture(root => {
		const file = path.join(root, 'binary');
		const bytes = Buffer.from([0, 255, 123, 10]);
		writeFileSync(file, bytes);
		expect(observed(file)).toEqual(bytes);
	});
});

test('recorded source uses Git link bytes instead of dereferencing directories', () => {
	fixture(root => {
		mkdirSync(path.join(root, 'canonical'));
		const link = path.join(root, 'compatibility');
		symlinkSync('canonical', link);
		expect(observed(link)).toEqual(Buffer.from('canonical'));
	});
});

test('recorded source does not read an untracked or missing symlink target', () => {
	fixture(root => {
		const link = path.join(root, 'compatibility');
		symlinkSync('not-a-tracked-target', link);
		expect(observed(link)).toEqual(Buffer.from('not-a-tracked-target'));
	});
});
