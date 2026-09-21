import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const projectRoot = path.resolve(import.meta.dirname, '..');
/** Test-visible guard list: only rules that consult exceptionAllows belong here. Widening it is an architecture-policy change. */
export const ARCHITECTURE_EXCEPTION_GUARDS = ['agora/import-boundary'] as const;
export type ArchitectureExceptionGuard = (typeof ARCHITECTURE_EXCEPTION_GUARDS)[number];
export interface ArchitectureException {
	path: string; symbol: string; guard: ArchitectureExceptionGuard; rationale: string;
	owner: string; approver: string; expires: string; compensatingTest: string;
}
export interface ArchitectureExceptionFile { schema_version: 'agora.architecture-exceptions/v1'; exceptions: ArchitectureException[] }

const keys = ['path', 'symbol', 'guard', 'rationale', 'owner', 'approver', 'expires', 'compensatingTest'] as const;
const filePath = /^(?:apps|packages|contracts|scripts)\/[A-Za-z0-9._/-]+\.[A-Za-z0-9]+$/;
const exactSymbol = (s: string): boolean => {
	if (s === 'dynamic-import') return true;
	if (!s || /[*?\s]/.test(s)) return false;
	if (s.startsWith('@')) return /^@[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(s);
	if (s.startsWith('.')) return /^\.(?:\.?\/[A-Za-z0-9_./-]+)+$/.test(s);
	return /^[A-Za-z0-9_@$][A-Za-z0-9_$./@-]*$/.test(s);
};

export const architectureExceptionsPath = (root = projectRoot): string => path.join(root, 'agora/architecture-exceptions.json');
export function parseArchitectureExceptions(raw: string): ArchitectureExceptionFile {
	const p = JSON.parse(raw) as { schema_version?: string; exceptions?: unknown };
	if (p.schema_version !== 'agora.architecture-exceptions/v1' || !Array.isArray(p.exceptions)) throw new Error('architecture exceptions require schema agora.architecture-exceptions/v1');
	return p as ArchitectureExceptionFile;
}
export function validateArchitectureExceptions(doc: ArchitectureExceptionFile, opts: { today?: string; root?: string } = {}): string[] {
	const today = opts.today ?? new Date().toISOString().slice(0, 10), root = opts.root ?? projectRoot, errors: string[] = [];
	for (const [i, raw] of doc.exceptions.entries()) {
		const at = `exceptions[${String(i)}]`, e = raw as Partial<ArchitectureException> | null;
		if (e === null || typeof e !== 'object' || Array.isArray(e)) { errors.push(`${at}: must be an object`); continue; }
		for (const k of keys) if (typeof e[k] !== 'string' || e[k].trim() === '') errors.push(`${at}.${k}: required non-empty string`);
		if (typeof e.path === 'string' && (/[*?[]/.test(e.path) || e.path.endsWith('/') || !filePath.test(e.path))) errors.push(`${at}.path: exact file path required (no wildcards or directories)`);
		if (typeof e.symbol === 'string' && !exactSymbol(e.symbol)) errors.push(`${at}.symbol: exact symbol required`);
		if (typeof e.guard === 'string' && !(ARCHITECTURE_EXCEPTION_GUARDS as readonly string[]).includes(e.guard)) errors.push(`${at}.guard: unknown guard ${e.guard}`);
		if (typeof e.owner === 'string' && e.owner === e.approver) errors.push(`${at}: self-approved exceptions are rejected`);
		if (typeof e.expires === 'string') {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(e.expires)) errors.push(`${at}.expires: use YYYY-MM-DD`);
			else if (e.expires < today) errors.push(`${at}.expires: expired on ${e.expires}`);
		}
		if (typeof e.compensatingTest === 'string' && e.compensatingTest) {
			if (/[*?]/.test(e.compensatingTest) || !filePath.test(e.compensatingTest)) errors.push(`${at}.compensatingTest: exact test path required`);
			else if (!existsSync(path.join(root, e.compensatingTest))) errors.push(`${at}.compensatingTest: missing ${e.compensatingTest}`);
		}
	}
	return errors;
}

const cache = new Map<string, { mtime: number; exceptions: ArchitectureException[] }>();
export function loadArchitectureExceptions(root = projectRoot): ArchitectureException[] {
	const key = architectureExceptionsPath(root), mtime = statSync(key).mtimeMs, hit = cache.get(key);
	if (hit?.mtime === mtime) return hit.exceptions;
	const doc = parseArchitectureExceptions(readFileSync(key, 'utf8'));
	const errors = validateArchitectureExceptions(doc, { root });
	if (errors.length) throw new Error(errors.join('; '));
	cache.set(key, { mtime, exceptions: doc.exceptions });
	return doc.exceptions;
}
export function clearArchitectureExceptionCache(): void { cache.clear(); }
export function assertArchitectureExceptionsValid(root = projectRoot): void {
	clearArchitectureExceptionCache();
	loadArchitectureExceptions(root);
}
export function exceptionAllows(file: string, symbol: string, guard: string, root = projectRoot): boolean {
	const rel = path.relative(root, file).replaceAll('\\', '/');
	return loadArchitectureExceptions(root).some((e) => e.path === rel && e.symbol === symbol && e.guard === guard);
}
