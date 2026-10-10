// Generates agora/feature-inventory.json from the Feature directories on disk, or with --check fails on any difference.
// Usage: node scripts/feature-inventory.ts [--check]
// Exit codes follow R12: 0 pass, 1 drift or rejected Feature layout.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DiscoveryError, discoverFeatures, renderInventory } from './feature-discovery.ts';

const argv = process.argv.slice(2);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'agora/feature-inventory.json');
const SKIP = new Set(['node_modules', 'dist', 'coverage', '.scratch']);

const walk = (dir: string): string[] =>
	readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (SKIP.has(e.name) ? [] : e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
const files = ['apps', 'packages'].filter((d) => existsSync(path.join(root, d))).flatMap(walk);

try {
	const text = renderInventory(discoverFeatures(files, (f) => readFileSync(path.join(root, f), 'utf8')));
	const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
	if (argv.includes('--check')) {
		if (current !== text) throw new DiscoveryError(['agora/feature-inventory.json differs from the Feature directories on disk; run `pnpm features:generate`, never edit it by hand']);
		process.stdout.write('feature inventory matches\n');
	} else {
		if (current !== text) writeFileSync(target, text);
		process.stdout.write(current === text ? 'feature inventory unchanged\n' : 'feature inventory written\n');
	}
} catch (error) {
	if (!(error instanceof DiscoveryError)) throw error;
	console.error(error.problems.join('\n'));
	process.exit(1);
}
