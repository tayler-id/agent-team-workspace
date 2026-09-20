import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { readPublicEntries } from '../../../scripts/public-types.ts';

test('the live export-map reader permits only the exact schema wildcard and closed, contained code entries', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'agora-export-map-'));
	try {
		for (const folder of ['contracts', 'packages', 'apps']) mkdirSync(path.join(root, folder));
		const file = path.join(root, 'contracts/package.json');
		writeFileSync(file, JSON.stringify({ exports: { '.': './src/index.ts', './schemas/*': './schemas/*' } }));
		expect(readPublicEntries(root)).toEqual({ entries: [path.join(root, 'contracts/src/index.ts')], errors: [] });
		for (const [manifest, error] of [
			[{}, 'contracts: an explicit export map is required'],
			[{ exports: { './*': './src/*' } }, 'contracts: wildcard private-code exports are forbidden'],
			[{ exports: { './schemas/*': './src/*' } }, 'contracts: wildcard private-code exports are forbidden'],
			[{ exports: { '.': '../outside.ts' } }, 'contracts: export target escapes package'],
		] as const) {
			writeFileSync(file, JSON.stringify(manifest));
			expect(readPublicEntries(root).errors).toEqual([error]);
		}
	} finally { rmSync(root, { recursive: true, force: true }); }
});
