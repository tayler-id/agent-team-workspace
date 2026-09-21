import { ESLint } from 'eslint';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const feature = 'apps/web/src/features/room/index.tsx';
const notes = 'apps/web/src/features/notes/index.ts';
const framework = 'apps/web/src/framework/index.ts';
const client = 'apps/web/src/client/index.ts';
const host = 'apps/web/src/host/index.ts';
const owners = { framework: 'apps/web/src/framework', client: 'apps/web/src/client', host: 'apps/web/src/host', features: 'apps/web/src/features' } as const;
const ownerStubs = [feature, notes, framework, client, host];
for (const rel of ownerStubs) {
	const abs = path.join(root, rel);
	mkdirSync(path.dirname(abs), { recursive: true });
	if (!existsSync(abs)) writeFileSync(abs, 'export {};\n');
}
const engine = new ESLint({ cwd: root, ignore: false });
const probes = new Set<string>();
const track = (rel: string): string => { probes.add(rel); return path.join(root, rel); };
afterAll(() => { for (const rel of ownerStubs) try { rmSync(path.join(root, rel), { force: true }); } catch { /* gone */ } });
afterEach(() => { for (const rel of probes) try { rmSync(path.join(root, rel), { force: true }); } catch { /* gone */ } probes.clear(); });
const agora = async (code: string, file: string, lint = engine) =>
	(await lint.lintText(code, { filePath: path.join(root, file) })).flatMap((r) => r.messages).filter((m) => m.ruleId?.startsWith('agora/'));
const has = async (code: string, file: string, rule: string, needle?: string) =>
	(await agora(code, file)).some((m) => m.ruleId === rule && (needle === undefined || m.message.includes(needle)));
const writeProbe = (rel: string, code: string): string => {
	const abs = track(rel); mkdirSync(path.dirname(abs), { recursive: true }); writeFileSync(abs, code); return abs;
};
const publicEslint = (rel: string): { status: number; out: string } => {
	const r = spawnSync('pnpm', ['exec', 'eslint', rel, '-f', 'json'], {
		cwd: root, encoding: 'utf8', env: { ...process.env, GH_TOKEN: undefined, GITHUB_TOKEN: undefined, FIRSTMATE_GH_TOKEN: undefined },
	});
	return { status: r.status ?? 1, out: `${r.stdout}\n${r.stderr}` };
};
const storageLeak = "import type { Database } from '@agora/storage';\nexport type Leak = keyof Database;\n";
const cjsLeak = "const storage = require('@agora/storage');\nmodule.exports = { storage };\n";

test('owner tables are explicit and test-visible architecture policy', () => {
	const b = readFileSync(path.join(root, 'scripts/boundary-policy.ts'), 'utf8');
	const x = readFileSync(path.join(root, 'scripts/architecture-exceptions.ts'), 'utf8');
	const e = readFileSync(path.join(root, 'eslint.config.js'), 'utf8');
	expect(b).toContain("export const PACKAGE_OWNERS = ['contracts', 'packages/client-core', 'packages/domain', 'packages/storage', 'apps/center', 'apps/web', 'apps/worker']");
	for (const s of ["framework: 'apps/web/src/framework'", "client: 'apps/web/src/client'", "host: 'apps/web/src/host'", "features: 'apps/web/src/features'", 'apps/web/src']) expect(b).toContain(s);
	expect(x).toContain("export const ARCHITECTURE_EXCEPTION_GUARDS = ['agora/import-boundary'] as const");
	expect(b.match(/exceptionAllows\(file, /g)).toHaveLength(2);
	expect(e).toMatch(/^assertArchitectureExceptionsValid\s*\(\s*\)\s*;/m);
	expect(e).toContain('noInlineConfig: true');
	expect(e).toContain('ts,tsx,mts,cts,js,jsx,mjs,cjs');
	expect(e).toContain('apps/web/**');
	expect(e).toContain('contracts/**/*.js');
	expect(e).toContain('contracts/**/*.{mjs,cjs}');
	expect(e).not.toContain('renderer-footgun');
	expect(readFileSync(path.join(root, 'package.json'), 'utf8')).toContain('tsc -p apps/web/tsconfig.json');
	expect(readFileSync(path.join(root, 'tsconfig.json'), 'utf8')).toContain('"apps/web/**"');
});

test('tsx renderer rejects server imports with owner-named diagnostics across import forms', async () => {
	const forms = [
		(m: string) => `import type { X } from '${m}'; export type Leak = X;`,
		(m: string) => `export async function leak(): Promise<unknown> { return import('${m}'); }`,
		(m: string) => `export type * from '${m}';`,
		(m: string) => `export { type X as Leak } from '${m}';`,
	];
	for (const module of ['@agora/storage', '@agora/domain', '@agora/center', 'pg', 'hono', 'drizzle-orm']) {
		for (const form of forms) {
			expect(await has(form(module), feature, 'agora/import-boundary', 'renderer')).toBe(true);
			expect(await has(form(module), feature, 'agora/import-boundary', owners.client)).toBe(true);
		}
	}
	expect(await agora('export const ok = (value: string): string => value;', feature)).toEqual([]);
}, 120_000);

test('every guarded source extension keeps import-boundary diagnostics via public CLI', () => {
	const stamp = `ext${Date.now().toString(36)}`;
	const rows: { rel: string; body: string; needle: string }[] = [
		...(['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs'] as const).map((ext) => ({ rel: `apps/web/src/features/room/${stamp}-${ext}.${ext}`, body: storageLeak, needle: 'renderer' })),
		{ rel: `apps/web/src/features/room/${stamp}-cjs.cjs`, body: cjsLeak, needle: 'renderer' },
		...(['js', 'mts', 'tsx', 'mjs'] as const).map((ext) => ({ rel: `packages/client-core/src/${stamp}-${ext}.${ext}`, body: storageLeak, needle: 'portable client-core' })),
		{ rel: `packages/client-core/src/${stamp}-cjs.cjs`, body: cjsLeak, needle: 'portable client-core' },
		...(['mts', 'mjs', 'js'] as const).map((ext) => ({ rel: `contracts/src/${stamp}-${ext}.${ext}`, body: "import { readFileSync } from 'node:fs';\nexport const r = readFileSync;\n", needle: 'package owner contracts' })),
		{ rel: `contracts/src/${stamp}-cjs.cjs`, body: "import { readFileSync } from 'node:fs';\nexport const r = readFileSync;\n", needle: 'package owner contracts' },
	];
	for (const row of rows) {
		writeProbe(row.rel, row.body);
		const { status, out } = publicEslint(row.rel);
		expect(status, row.rel).toBe(1);
		expect(out, row.rel).toContain('agora/import-boundary');
		expect(out, row.rel).toContain(row.needle);
		expect(out, row.rel).not.toContain('Error while loading rule');
		expect(out, row.rel).not.toContain('File ignored because no matching configuration');
	}
}, 180_000);

test('framework client and host never import features; features use public entrypoints only', async () => {
	for (const file of [framework, client, host]) {
		expect(await has("import { x } from '../features/room/private'; export const y = x;", file, 'agora/import-boundary', 'must not import product Features')).toBe(true);
	}
	expect(await has("import { x } from '../notes/secret'; export const y = x;", feature, 'agora/import-boundary', 'private files')).toBe(true);
	expect(await has("import { x } from '../../framework/internal'; export const y = x;", feature, 'agora/import-boundary', 'public entrypoint')).toBe(true);
	expect(await has("import { x } from '../../framework/index.ts'; export const y = x;", feature, 'agora/import-boundary')).toBe(false);
	expect(await has("import { x } from '../room/index.tsx'; export const y = x;", notes, 'agora/import-boundary')).toBe(false);
	// Two-hop relay through un-owned apps/web/src folders must fail at the intermediate file (public CLI).
	const stamp = `relay${Date.now().toString(36)}`;
	writeProbe(`apps/web/src/features/room/${stamp}-private.ts`, 'export const secret = 1;\n');
	writeProbe(`apps/web/src/framework/${stamp}-internal.ts`, 'export const x = 1;\n');
	writeProbe(`apps/web/src/util/${stamp}-leak.ts`, `export { secret } from '../features/room/${stamp}-private.ts';\n`);
	writeProbe(`apps/web/src/util/${stamp}-leak2.ts`, `export { x } from '../framework/${stamp}-internal.ts';\n`);
	writeProbe(`apps/web/src/util/${stamp}-ok.ts`, "export * from '../framework/index.ts';\n");
	for (const [rel, needle] of [[`apps/web/src/util/${stamp}-leak.ts`, 'other must not import product Features'], [`apps/web/src/util/${stamp}-leak2.ts`, 'other must import framework only through']] as const) {
		const { status, out } = publicEslint(rel);
		expect(status, rel).toBe(1);
		expect(out, rel).toContain('agora/import-boundary');
		expect(out, rel).toContain(needle);
	}
	expect(publicEslint(`apps/web/src/util/${stamp}-ok.ts`).out).not.toContain('agora/import-boundary');
	// Positive: Feature may import react / react-dom published prefixes.
	expect(await has("import { jsx } from 'react/jsx-runtime'; export const j = jsx;", feature, 'agora/import-boundary')).toBe(false);
	expect(await has("import { createRoot } from 'react-dom/client'; export const r = createRoot;", feature, 'agora/import-boundary')).toBe(false);
}, 120_000);

test('apps/web non-src relocation cannot bypass import boundaries', () => {
	const stamp = `reloc${Date.now().toString(36)}`;
	writeProbe(`apps/web/test/${stamp}-leak.ts`, storageLeak);
	writeProbe(`apps/web/lib/${stamp}-leak.ts`, storageLeak);
	const featureRel = `apps/web/src/features/room/${stamp}-reloc.tsx`;
	writeProbe(featureRel, [
		`import type { Leak as A } from '../../../test/${stamp}-leak.ts';`,
		`import type { Leak as B } from '../../../lib/${stamp}-leak.ts';`,
		'export type Hold = A | B;',
	].join('\n'));
	const ctrl = `apps/web/src/features/room/${stamp}-ctrl.tsx`;
	writeProbe(ctrl, storageLeak);
	for (const rel of [`apps/web/test/${stamp}-leak.ts`, `apps/web/lib/${stamp}-leak.ts`, ctrl]) {
		const { status, out } = publicEslint(rel);
		expect(status, rel).toBe(1);
		expect(out, rel).toContain('agora/import-boundary');
	}
	const { status, out } = publicEslint(featureRel);
	expect(status).toBe(1);
	expect(out).toContain('agora/import-boundary');
	expect(out).toMatch(/apps\/web\/src|relative import escapes/);
}, 120_000);

test('portable client-core rejects application and storage edges', async () => {
	const file = 'packages/client-core/src/model.ts';
	expect(await has("import type { X } from '../../../apps/web/src/client/index.ts'; export type Leak = X;", file, 'agora/import-boundary', 'application code')).toBe(true);
	expect(await has("import type { Database } from '@agora/storage'; export type Leak = keyof Database;", file, 'agora/import-boundary')).toBe(true);
}, 120_000);

test('inline eslint disables cannot suppress import-boundary under noInlineConfig', async () => {
	const leak = "import type { Database } from '@agora/storage'; export type Leak = keyof Database;";
	expect(await has(`/* eslint-disable */\n${leak}`, feature, 'agora/import-boundary', 'renderer')).toBe(true);
	expect(await has(`/* eslint-disable agora/import-boundary */\n${leak}`, feature, 'agora/import-boundary', 'renderer')).toBe(true);
	expect(await has(`${leak} // eslint-disable-line agora/import-boundary`, feature, 'agora/import-boundary', 'renderer')).toBe(true);
}, 120_000);

const schema = 'agora.architecture-exceptions/v1' as const;
const exceptionRow = {
	path: feature, symbol: '@agora/storage', guard: 'agora/import-boundary' as const, rationale: 'temporary bridge',
	owner: 'web-team', approver: 'architecture', expires: '2099-01-01', compensatingTest: 'packages/client-core/test/app-architecture.test.ts',
};
const exceptionsModule = () => import('../../../scripts/architecture-exceptions.ts');
// A throwaway root with only the compensating test on disk; validation never reads the real repo through it.
const exceptionRoot = (rows: object[]): string => {
	const dir = mkdtempSync(path.join(tmpdir(), 'agora-arch-ex-'));
	mkdirSync(path.join(dir, 'agora'), { recursive: true });
	mkdirSync(path.join(dir, 'packages/client-core/test'), { recursive: true });
	writeFileSync(path.join(dir, 'packages/client-core/test/app-architecture.test.ts'), '// compensating fixture\n');
	writeFileSync(path.join(dir, 'agora/architecture-exceptions.json'), JSON.stringify({ schema_version: schema, exceptions: rows }));
	return dir;
};
const runNode = (script: string): { status: number; out: string } => {
	const r = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', env: { ...process.env, GH_TOKEN: undefined, GITHUB_TOKEN: undefined, FIRSTMATE_GH_TOKEN: undefined } });
	return { status: r.status ?? 1, out: `${r.stdout}\n${r.stderr}` };
};

test('architecture exceptions reject wildcard expired unknown broadened and self-approved rows and accept the committed file', async () => {
	const mod = await exceptionsModule();
	mod.clearArchitectureExceptionCache();
	expect(() => { mod.assertArchitectureExceptionsValid(root); }).not.toThrow();
	expect(mod.loadArchitectureExceptions(root)).toEqual([]);
	const errors = (row: unknown, today?: string) => mod.validateArchitectureExceptions({ schema_version: schema, exceptions: [row as typeof exceptionRow] }, today === undefined ? {} : { today });
	expect(mod.validateArchitectureExceptions({ schema_version: schema, exceptions: [] })).toEqual([]);
	expect(mod.validateArchitectureExceptions(mod.parseArchitectureExceptions(JSON.stringify({ schema_version: schema, exceptions: [exceptionRow] })))).toEqual([]);
	expect(() => mod.parseArchitectureExceptions(JSON.stringify({ schema_version: 'agora.architecture-exceptions/v0', exceptions: [] }))).toThrow('schema');
	expect(errors({ ...exceptionRow, path: 'apps/web/src/features/**/*.tsx' })).toEqual(['exceptions[0].path: exact file path required (no wildcards or directories)']);
	expect(errors({ ...exceptionRow, path: 'apps/web/src/features/' })).toEqual(['exceptions[0].path: exact file path required (no wildcards or directories)']);
	expect(errors({ ...exceptionRow, expires: '2020-01-01' }, '2026-09-21')).toEqual(['exceptions[0].expires: expired on 2020-01-01']);
	expect(errors({ ...exceptionRow, expires: 'never' })).toEqual(['exceptions[0].expires: use YYYY-MM-DD']);
	expect(errors({ ...exceptionRow, guard: 'agora/renderer-footgun' })).toEqual(['exceptions[0].guard: unknown guard agora/renderer-footgun']);
	expect(errors({ ...exceptionRow, owner: 'same', approver: 'same' })).toEqual(['exceptions[0]: self-approved exceptions are rejected']);
	expect(errors({ ...exceptionRow, symbol: '*' })).toEqual(['exceptions[0].symbol: exact symbol required']);
	expect(errors({ ...exceptionRow, symbol: '@agora/*' })).toEqual(['exceptions[0].symbol: exact symbol required']);
	expect(errors({ ...exceptionRow, rationale: ' ' })).toEqual(['exceptions[0].rationale: required non-empty string']);
	expect(errors({ ...exceptionRow, compensatingTest: 'packages/client-core/test/*.test.ts' })).toEqual(['exceptions[0].compensatingTest: exact test path required']);
	expect(errors({ ...exceptionRow, compensatingTest: 'packages/client-core/test/missing.test.ts' })).toEqual(['exceptions[0].compensatingTest: missing packages/client-core/test/missing.test.ts']);
	expect(errors('not a row')).toEqual(['exceptions[0]: must be an object']);
	for (const symbol of ['@agora/storage', '../notes/secret.ts', './private', 'dynamic-import', 'react-dom/client', 'pg', 'window']) expect(errors({ ...exceptionRow, symbol })).toEqual([]);
});

test('exact architecture exceptions allow one path symbol and guard without broadening', async () => {
	const mod = await exceptionsModule();
	const tempRoot = exceptionRoot([exceptionRow]);
	try {
		mod.clearArchitectureExceptionCache();
		expect(mod.exceptionAllows(path.join(tempRoot, feature), '@agora/storage', 'agora/import-boundary', tempRoot)).toBe(true);
		expect(mod.exceptionAllows(path.join(tempRoot, notes), '@agora/storage', 'agora/import-boundary', tempRoot)).toBe(false);
		expect(mod.exceptionAllows(path.join(tempRoot, feature), '@agora/domain', 'agora/import-boundary', tempRoot)).toBe(false);
		expect(mod.exceptionAllows(path.join(tempRoot, feature), '@agora/storage', 'agora/public-types', tempRoot)).toBe(false);
		writeFileSync(path.join(tempRoot, 'agora/architecture-exceptions.json'), JSON.stringify({ schema_version: schema, exceptions: [{ ...exceptionRow, symbol: 'dynamic-import' }, { ...exceptionRow, symbol: 'window' }] }));
		mod.clearArchitectureExceptionCache();
		expect(mod.exceptionAllows(path.join(tempRoot, feature), 'dynamic-import', 'agora/import-boundary', tempRoot)).toBe(true);
		expect(mod.exceptionAllows(path.join(tempRoot, feature), 'window', 'agora/import-boundary', tempRoot)).toBe(true);
		expect(mod.exceptionAllows(path.join(tempRoot, feature), '@agora/storage', 'agora/import-boundary', tempRoot)).toBe(false);
		writeFileSync(path.join(tempRoot, 'agora/architecture-exceptions.json'), JSON.stringify({ schema_version: schema, exceptions: [{ ...exceptionRow, owner: 'same', approver: 'same' }] }));
		mod.clearArchitectureExceptionCache();
		expect(() => mod.exceptionAllows(path.join(tempRoot, feature), '@agora/storage', 'agora/import-boundary', tempRoot)).toThrow('self-approved');
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
		mod.clearArchitectureExceptionCache();
	}
});

test('a committed exception row lets exactly one import through the live import-boundary rule', async () => {
	const registry = path.join(root, 'agora/architecture-exceptions.json');
	const original = readFileSync(registry);
	const leak = "import type { Database } from '@agora/storage'; export type Leak = keyof Database;";
	expect(await has(leak, feature, 'agora/import-boundary', 'renderer')).toBe(true);
	try {
		const portable = 'packages/client-core/src/model.ts';
		writeFileSync(registry, JSON.stringify({ schema_version: schema, exceptions: [exceptionRow, { ...exceptionRow, path: portable, symbol: 'window' }] }, null, '\t'));
		expect(await has(leak, feature, 'agora/import-boundary')).toBe(false);
		expect(await has('export const w = (): string => window.name;', portable, 'agora/import-boundary')).toBe(false);
		expect(await has('export const w = (): string => window.name;', 'packages/client-core/src/index.ts', 'agora/import-boundary', 'ambient window')).toBe(true);
		expect(await has('export const d = (): string => document.title;', portable, 'agora/import-boundary', 'ambient document')).toBe(true);
		expect(await has(leak, notes, 'agora/import-boundary', 'renderer')).toBe(true);
		expect(await has("import type { X } from '@agora/domain'; export type Leak = X;", feature, 'agora/import-boundary', 'renderer')).toBe(true);
		// A module symbol covers every literal import form of that module; an unprovable target needs its own dynamic-import row.
		expect(await has("export async function leak(): Promise<unknown> { return import('@agora/storage'); }", feature, 'agora/import-boundary')).toBe(false);
		expect(await has('export const load = (m: string): Promise<unknown> => import(m);', feature, 'agora/import-boundary')).toBe(true);
	} finally {
		writeFileSync(registry, original);
	}
	expect(readFileSync(registry).equals(original)).toBe(true);
	expect(await has(leak, feature, 'agora/import-boundary', 'renderer')).toBe(true);
}, 120_000);

test('eslint config load path fails closed on invalid architecture exceptions', () => {
	const tempRoot = exceptionRoot([{ ...exceptionRow, owner: 'same', approver: 'same' }]);
	const loader = path.join(tempRoot, 'load-assert.mjs');
	writeFileSync(loader, `import { assertArchitectureExceptionsValid } from ${JSON.stringify(path.join(root, 'scripts/architecture-exceptions.ts'))};\nassertArchitectureExceptionsValid(${JSON.stringify(tempRoot)});\n`);
	try {
		const { status, out } = runNode(loader);
		expect(status).not.toBe(0);
		expect(out).toContain('self-approved');
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
	// The committed file loads through the public CLI with no violation on a clean file.
	const clean = writeProbe(`apps/web/src/features/room/clean${Date.now().toString(36)}.tsx`, 'export const ok = 1;\n');
	const { status, out } = publicEslint(path.relative(root, clean));
	expect(status).toBe(0);
	expect(out).not.toContain('architecture exceptions');
}, 120_000);

test('weakening the exception validator lets a self-approved row load', () => {
	const source = readFileSync(path.join(root, 'scripts/architecture-exceptions.ts'), 'utf8');
	const guard = "if (typeof e.owner === 'string' && e.owner === e.approver) errors.push(`${at}: self-approved exceptions are rejected`);";
	expect(source).toContain(guard);
	const tempRoot = exceptionRoot([{ ...exceptionRow, owner: 'same', approver: 'same' }]);
	mkdirSync(path.join(tempRoot, 'scripts'), { recursive: true });
	writeFileSync(path.join(tempRoot, 'scripts/architecture-exceptions.ts'), source.replace(guard, ''));
	const loader = path.join(tempRoot, 'load-weakened.mjs');
	writeFileSync(loader, `import { assertArchitectureExceptionsValid } from './scripts/architecture-exceptions.ts';\nassertArchitectureExceptionsValid();\nconsole.log('weakened validator accepted self-approved row');\n`);
	try {
		const { status, out } = runNode(loader);
		expect(status).toBe(0);
		expect(out).toContain('weakened validator accepted self-approved row');
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
}, 120_000);

test('removing import-boundary protection makes denial assertions turn red', async () => {
	const code = "import type { Database } from '@agora/storage'; export type Leak = keyof Database;";
	expect((await agora(code, feature)).some((m) => m.ruleId === 'agora/import-boundary')).toBe(true);
	const messages = await agora(code, feature, new ESLint({ cwd: root, ignore: false, overrideConfig: [{ rules: { 'agora/import-boundary': 'off' } }] }));
	expect(messages.filter((m) => m.ruleId === 'agora/import-boundary')).toEqual([]);
	expect(() => { expect(messages.some((m) => m.ruleId === 'agora/import-boundary')).toBe(true); }).toThrow('expected false to be true');
	// Guard-weakening: narrowing the non-feature→Feature check back to framework/client/host only lets the util relay pass.
	const policy = readFileSync(path.join(root, 'scripts/boundary-policy.ts'), 'utf8');
	expect(policy).toContain("layer.kind !== 'feature' && targetLayer?.kind === 'feature'");
	expect(policy).toContain("(layer.kind === 'feature' || layer.kind === 'other')");
	const weakened = policy
		.replace("layer.kind !== 'feature' && targetLayer?.kind === 'feature'", "(layer.kind === 'framework' || layer.kind === 'client' || layer.kind === 'host') && targetLayer?.kind === 'feature'")
		.replace("(layer.kind === 'feature' || layer.kind === 'other')", "layer.kind === 'feature'");
	expect(weakened).not.toContain("layer.kind !== 'feature' && targetLayer?.kind === 'feature'");
	expect(() => {
		expect(weakened).toContain("layer.kind !== 'feature' && targetLayer?.kind === 'feature'");
	}).toThrow();
}, 120_000);
