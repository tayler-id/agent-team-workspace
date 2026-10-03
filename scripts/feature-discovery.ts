import { createHash } from 'node:crypto';

/** Reserved filenames inside a Feature directory (R25). Only the entrypoint is required. */
export const RESERVED = { entrypoint: 'entrypoint.ts', timelineCard: 'timeline-card.tsx', dependencies: 'dependencies.json' } as const;
const RESERVED_NAMES: ReadonlySet<string> = new Set(Object.values(RESERVED));
const NAME = /^[a-z][a-z0-9-]*$/;

export interface FeatureRow {
	package: string;
	name: string;
	root: string;
	entrypoint: string;
	timelineCard: string | null;
	dependencies: string[];
}

export class DiscoveryError extends Error {
	problems: string[];
	constructor(problems: string[]) {
		super(problems.join('\n'));
		this.problems = problems;
	}
}

/** Package-relative Feature root: `src/features` for a package with a src layout, `features` otherwise. */
const featuresRoot = (hasSrc: boolean): string => (hasSrc ? 'src/features' : 'features');

/**
 * Finds every Feature among repository-relative POSIX file paths (apps/<p>/... or packages/<p>/...).
 * A Feature is a filesystem fact: its directory under the package's conventional root. Collects all problems before throwing.
 */
export function discoverFeatures(files: readonly string[], readText: (file: string) => string): FeatureRow[] {
	const problems: string[] = [];
	const byPackage = new Map<string, string[]>();
	for (const file of files) {
		const [group, pkg, ...rest] = file.split('/');
		if ((group !== 'apps' && group !== 'packages') || !pkg || rest.length === 0) continue;
		const key = `${group}/${pkg}`;
		byPackage.set(key, [...(byPackage.get(key) ?? []), rest.join('/')]);
	}
	const rows: FeatureRow[] = [];
	for (const [pkg, tails] of [...byPackage].sort(([a], [b]) => a.localeCompare(b))) {
		const base = featuresRoot(tails.some((t) => t.startsWith('src/')));
		const owner = `${pkg}/${base}/<name>/`;
		const dirs = new Map<string, Set<string>>();
		for (const tail of tails) {
			const parts = tail.split('/');
			const basename = parts.at(-1) ?? '';
			const inRoot = tail.startsWith(`${base}/`);
			const [name, ...below] = inRoot ? tail.slice(base.length + 1).split('/') : [];
			if (inRoot && name && below.length === 1) {
				dirs.set(name, (dirs.get(name) ?? new Set()).add(basename));
			} else if (inRoot && name && below.length > 1 && RESERVED_NAMES.has(basename)) {
				problems.push(`${pkg}/${tail}: reserved file ${basename} is nested inside Feature ${name}; supported owner is ${owner}`);
			} else if (!inRoot && (parts.slice(0, -1).includes('features') || RESERVED_NAMES.has(basename))) {
				problems.push(`${pkg}/${tail}: Feature file outside the conventional path; supported owner is ${pkg}, conventional path is ${owner}`);
			}
		}
		const seen = new Map<string, string>();
		for (const name of [...dirs.keys()].sort()) {
			const where = `${pkg}/${base}/${name}`;
			const present = dirs.get(name) ?? new Set<string>();
			if (!NAME.test(name)) problems.push(`${where}: Feature name must be lowercase kebab-case; supported owner is ${owner}`);
			const clash = seen.get(name.toLowerCase());
			if (clash) problems.push(`${where}: duplicate Feature name, also declared by ${clash}`);
			seen.set(name.toLowerCase(), where);
			if (!present.has(RESERVED.entrypoint)) {
				problems.push(`${where}: missing reserved ${RESERVED.entrypoint}; supported owner is ${owner}`);
				continue;
			}
			let dependencies: string[] = [];
			if (present.has(RESERVED.dependencies)) {
				const file = `${where}/${RESERVED.dependencies}`;
				try {
					const parsed: unknown = JSON.parse(readText(file));
					if (!Array.isArray(parsed) || parsed.some((d) => typeof d !== 'string')) throw new Error('expected a JSON array of Feature names');
					dependencies = [...new Set(parsed as string[])].sort();
				} catch (error) {
					problems.push(`${file}: ${(error as Error).message}; supported owner is ${owner}`);
				}
			}
			rows.push({
				package: pkg,
				name,
				root: where,
				entrypoint: `${where}/${RESERVED.entrypoint}`,
				timelineCard: present.has(RESERVED.timelineCard) ? `${where}/${RESERVED.timelineCard}` : null,
				dependencies,
			});
		}
	}
	if (problems.length > 0) throw new DiscoveryError(problems);
	return rows;
}

/** Deterministic inventory text; the digest covers the rows so a hand edit of either part disagrees. */
export function renderInventory(rows: readonly FeatureRow[]): string {
	const digest = `sha256:${createHash('sha256').update(JSON.stringify(rows)).digest('hex')}`;
	return `${JSON.stringify({ schema_version: 'agora.feature-inventory/v1', digest, features: rows }, null, '\t')}\n`;
}
