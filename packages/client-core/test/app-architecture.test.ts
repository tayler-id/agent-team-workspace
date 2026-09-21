import { ESLint } from 'eslint';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const engine = new ESLint({ cwd: root, ignore: false });
const feature = 'apps/web/src/features/room/index.tsx';
const notes = 'apps/web/src/features/notes/index.ts';
const framework = 'apps/web/src/framework/index.ts';
const client = 'apps/web/src/client/index.ts';
const host = 'apps/web/src/host/index.ts';
const owners = {
	framework: 'apps/web/src/framework',
	client: 'apps/web/src/client',
	host: 'apps/web/src/host',
	features: 'apps/web/src/features',
} as const;
const probePaths = new Set<string>();
const track = (rel: string): string => {
	probePaths.add(rel);
	return path.join(root, rel);
};
afterEach(() => {
	for (const rel of probePaths) {
		try { rmSync(path.join(root, rel), { force: true }); } catch { /* already gone */ }
	}
	probePaths.clear();
	const exceptionsPath = path.join(root, 'agora/architecture-exceptions.json');
	if (existsSync(`${exceptionsPath}.bak-test`)) {
		writeFileSync(exceptionsPath, readFileSync(`${exceptionsPath}.bak-test`));
		rmSync(`${exceptionsPath}.bak-test`, { force: true });
	}
});

const agora = async (code: string, file: string, lint = engine) =>
	(await lint.lintText(code, { filePath: path.join(root, file) })).flatMap((r) => r.messages).filter((m) => m.ruleId?.startsWith('agora/'));
const has = async (code: string, file: string, rule: string, needle?: string) =>
	(await agora(code, file)).some((m) => m.ruleId === rule && (needle === undefined || m.message.includes(needle)));

const writeProbe = (rel: string, code: string): string => {
	const abs = track(rel);
	mkdirSync(path.dirname(abs), { recursive: true });
	writeFileSync(abs, code);
	return abs;
};

const publicEslint = (rel: string): { status: number; out: string } => {
	const result = spawnSync('pnpm', ['exec', 'eslint', rel, '-f', 'json'], {
		cwd: root,
		encoding: 'utf8',
		env: { ...process.env, GH_TOKEN: undefined, GITHUB_TOKEN: undefined, FIRSTMATE_GH_TOKEN: undefined },
	});
	return { status: result.status ?? 1, out: `${result.stdout}\n${result.stderr}` };
};

test('owner tables are explicit and test-visible architecture policy', () => {
	const boundary = readFileSync(path.join(root, 'scripts/boundary-policy.ts'), 'utf8');
	const exceptions = readFileSync(path.join(root, 'scripts/architecture-exceptions.ts'), 'utf8');
	const eslintConfig = readFileSync(path.join(root, 'eslint.config.js'), 'utf8');
	expect(boundary).toContain("export const PACKAGE_OWNERS = ['contracts', 'packages/client-core', 'packages/domain', 'packages/storage', 'apps/center', 'apps/web', 'apps/worker']");
	expect(boundary).toContain("framework: 'apps/web/src/framework'");
	expect(boundary).toContain("client: 'apps/web/src/client'");
	expect(boundary).toContain("host: 'apps/web/src/host'");
	expect(boundary).toContain("features: 'apps/web/src/features'");
	expect(boundary).toContain('export const domGlobals');
	expect(exceptions).toContain("'agora/import-boundary', 'agora/public-types', 'agora/renderer-footgun'");
	expect(eslintConfig).toContain('noInlineConfig: true');
	expect(eslintConfig).toMatch(/assertArchitectureExceptionsValid\s*\(/);
	expect(eslintConfig).toContain('ts,tsx,mts,cts,js,jsx,mjs,cjs');
	expect(eslintConfig).toContain("contracts/**/*.js");
	expect(eslintConfig).toContain('contracts/**/*.{mjs,cjs}');
	expect(readFileSync(path.join(root, 'package.json'), 'utf8')).toContain('tsc -p apps/web/tsconfig.json');
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
	const code = "import type { Database } from '@agora/storage';\nexport type Leak = keyof Database;\n";
	const cjsCode = "const storage = require('@agora/storage');\nmodule.exports = { storage };\n";
	const matrix: { rel: string; body: string; needle: string }[] = [
		{ rel: `apps/web/src/features/room/${stamp}-ts.ts`, body: code, needle: 'renderer' },
		{ rel: `apps/web/src/features/room/${stamp}-tsx.tsx`, body: code, needle: 'renderer' },
		{ rel: `apps/web/src/features/room/${stamp}-mts.mts`, body: code, needle: 'renderer' },
		{ rel: `apps/web/src/features/room/${stamp}-cts.cts`, body: code, needle: 'renderer' },
		{ rel: `apps/web/src/features/room/${stamp}-js.js`, body: code, needle: 'renderer' },
		{ rel: `apps/web/src/features/room/${stamp}-jsx.jsx`, body: code, needle: 'renderer' },
		{ rel: `apps/web/src/features/room/${stamp}-mjs.mjs`, body: code, needle: 'renderer' },
		{ rel: `apps/web/src/features/room/${stamp}-cjs.cjs`, body: cjsCode, needle: 'renderer' },
		{ rel: `packages/client-core/src/${stamp}-js.js`, body: code, needle: 'portable client-core' },
		{ rel: `packages/client-core/src/${stamp}-mts.mts`, body: code, needle: 'portable client-core' },
		{ rel: `packages/client-core/src/${stamp}-tsx.tsx`, body: code, needle: 'portable client-core' },
		{ rel: `packages/client-core/src/${stamp}-mjs.mjs`, body: code, needle: 'portable client-core' },
		{ rel: `packages/client-core/src/${stamp}-cjs.cjs`, body: cjsCode, needle: 'portable client-core' },
		{ rel: `contracts/src/${stamp}-mts.mts`, body: "import { readFileSync } from 'node:fs';\nexport const r = readFileSync;\n", needle: 'package owner contracts' },
		{ rel: `contracts/src/${stamp}-mjs.mjs`, body: "import { readFileSync } from 'node:fs';\nexport const r = readFileSync;\n", needle: 'package owner contracts' },
		{ rel: `contracts/src/${stamp}-js.js`, body: "import { readFileSync } from 'node:fs';\nexport const r = readFileSync;\n", needle: 'package owner contracts' },
		{ rel: `contracts/src/${stamp}-cjs.cjs`, body: "import { readFileSync } from 'node:fs';\nexport const r = readFileSync;\n", needle: 'package owner contracts' },
	];
	for (const row of matrix) {
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
}, 120_000);

test('renderer footguns: effects only in framework; browser APIs only in host or framework', async () => {
	const effect = "import { useEffect } from 'react'; export function Card(): null { useEffect(() => undefined, []); return null; }";
	expect(await has(effect, feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	expect(await has(effect, framework, 'agora/renderer-footgun')).toBe(false);
	const aliased = "import { useEffect as sideEffect } from 'react'; export function Card(): null { sideEffect(() => undefined, []); return null; }";
	expect(await has(aliased, feature, 'agora/renderer-footgun', 'useEffect')).toBe(true);
	expect(await has(aliased, framework, 'agora/renderer-footgun')).toBe(false);
	const namespaced = "import * as React from 'react'; export function Card(): null { React.useLayoutEffect(() => undefined, []); return null; }";
	expect(await has(namespaced, feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	expect(await has(namespaced, framework, 'agora/renderer-footgun')).toBe(false);
	const defaultNs = "import React from 'react'; export function Card(): null { React.useInsertionEffect(() => undefined, []); return null; }";
	expect(await has(defaultNs, feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	const localSameName = 'export function useEffect(run: () => void): void { run(); } export function Card(): null { useEffect(() => undefined); return null; }';
	expect(await has(localSameName, feature, 'agora/renderer-footgun')).toBe(false);
	const browser = 'export function read(): string { return window.localStorage.getItem("k") ?? ""; }';
	expect(await has(browser, feature, 'agora/renderer-footgun', owners.host)).toBe(true);
	expect(await has(browser, client, 'agora/renderer-footgun', 'Host/framework')).toBe(true);
	expect(await has(browser, host, 'agora/renderer-footgun')).toBe(false);
	expect(await has(browser, framework, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export async function load(url: string): Promise<Response> { return fetch(url); }', feature, 'agora/renderer-footgun', 'fetch')).toBe(true);
	expect(await has('export function mount(node: Element, child: Node): Node { return node.appendChild(child); }', feature, 'agora/renderer-footgun', 'DOM mutation')).toBe(true);
	expect(await has('export function Bad(): JSX.Element { return <div dangerouslySetInnerHTML={{ __html: "x" }} />; }', feature, 'agora/renderer-footgun', 'dangerouslySetInnerHTML')).toBe(true);
	expect(await agora("import { useState } from 'react'; export function Ok(): null { const [v] = useState(0); return null; }", feature)).toEqual([]);
}, 120_000);

test('effect ownership closes aliases barrels dynamic imports and re-exports without rejecting locals', async () => {
	const destructure = "import React from 'react'; const { useEffect } = React; export function Card(): null { useEffect(() => undefined, []); return null; }";
	expect(await has(destructure, feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	const nsDestructure = "import * as R from 'react'; const { useLayoutEffect } = R; export function Card(): null { useLayoutEffect(() => undefined, []); return null; }";
	expect(await has(nsDestructure, feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	const constAlias = "import { useEffect } from 'react'; const eff = useEffect; export function Card(): null { eff(() => undefined, []); return null; }";
	expect(await has(constAlias, feature, 'agora/renderer-footgun', 'useEffect')).toBe(true);
	const computed = "import React from 'react'; export function Card(): null { React['useEffect'](() => undefined, []); return null; }";
	expect(await has(computed, feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	const dynamic = "export async function boot(): Promise<void> { const R = await import('react'); R.useEffect(() => undefined, []); }";
	expect(await has(dynamic, feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	const reexport = "export { useEffect } from 'react';";
	expect(await has(reexport, feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	const barrel = "export * from 'react';";
	expect(await has(barrel, feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	const localFn = 'export function useEffect(run: () => void): void { run(); } export const run = (): void => { useEffect(() => undefined); };';
	expect(await has(localFn, feature, 'agora/renderer-footgun')).toBe(false);
	const localObject = 'const api = { useEffect(run: () => void): void { run(); } }; export const run = (): void => { api.useEffect(() => undefined); };';
	expect(await has(localObject, feature, 'agora/renderer-footgun')).toBe(false);
	const frameworkHook = "import { useEffect } from '../../framework/index.ts'; export function Card(): null { useEffect(() => undefined); return null; }";
	expect(await has(frameworkHook, feature, 'agora/renderer-footgun')).toBe(false);
}, 120_000);

test('browser globals require unresolved references; Host ports and ordinary names stay allowed', async () => {
	expect(await has('export const read = (props: { location: string }): string => props.location;', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export const read = (props: { location: string }): string => { const { location } = props; return location; };', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export const ports = { fetch: (u: string): string => u };', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export type Ports = { document: string; window: number };', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export class Nav { history: string[] = []; }', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export function label(window: { name: string }): string { return window.name; }', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has("import { fetch } from '../../host/index.ts'; export async function load(u: string): Promise<string> { return fetch(u); }", feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export const read = (): string => window.name;', feature, 'agora/renderer-footgun', 'window')).toBe(true);
	expect(await has('export const read = (): string => document.title;', feature, 'agora/renderer-footgun', 'document')).toBe(true);
	expect(await has('export const openSocket = (): WebSocket => new WebSocket("wss://x");', feature, 'agora/renderer-footgun', 'WebSocket')).toBe(true);
}, 120_000);

test('ambient declare shadows cannot hide browser globals', async () => {
	const code = [
		'declare const window: Window;',
		'declare const document: Document;',
		'declare function fetch(u: string): Promise<Response>;',
		'export const t = (): string => document.title;',
		'export const n = (): string => window.name;',
		'export const f = (u: string): Promise<Response> => fetch(u);',
	].join('\n');
	expect(await has(code, feature, 'agora/renderer-footgun', 'window')).toBe(true);
	expect(await has(code, feature, 'agora/renderer-footgun', 'document')).toBe(true);
	expect(await has(code, feature, 'agora/renderer-footgun', 'fetch')).toBe(true);
	const stamp = `decl${Date.now().toString(36)}`;
	const rel = `apps/web/src/features/room/${stamp}.tsx`;
	writeProbe(rel, code);
	const { status, out } = publicEslint(rel);
	expect(status).toBe(1);
	expect(out).toContain('agora/renderer-footgun');
	expect(out).toContain('window');
}, 120_000);

test('DOM mutation is receiver-aware including computed keys; ordinary writers stay allowed', async () => {
	expect(await has('export const q = (p: URLSearchParams, v: string): void => { p.append("q", v); };', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export const h = (x: Headers): void => { x.append("a", "b"); };', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export const drop = (store: { remove: (id: string) => void }, id: string): void => { store.remove(id); };', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has("export const writeOut = (out: { write: (s: string) => void }): void => { out.write('x'); };", feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export const detach = (node: Element): void => { node.remove(); };', feature, 'agora/renderer-footgun', 'DOM mutation')).toBe(true);
	expect(await has('export const mount = (node: Element, child: Node): Node => node.appendChild(child);', feature, 'agora/renderer-footgun', 'DOM mutation')).toBe(true);
	expect(await has("export const mount = (node: Element, child: Node): Node => node['appendChild'](child);", feature, 'agora/renderer-footgun', 'DOM mutation')).toBe(true);
	expect(await has("const k = 'appendChild' as const; export const mount = (node: Element, child: Node): Node => node[k](child);", feature, 'agora/renderer-footgun', 'DOM mutation')).toBe(true);
	const stamp = `mut${Date.now().toString(36)}`;
	const rel = `apps/web/src/features/room/${stamp}.tsx`;
	writeProbe(rel, "const k = 'appendChild' as const;\nexport const m = (n: Element, c: Node): Node => n[k](c);\n");
	const { status, out } = publicEslint(rel);
	expect(status).toBe(1);
	expect(out).toContain('DOM mutation');
}, 120_000);

test('inline eslint disables cannot suppress Agora rules including bare and line forms', async () => {
	const windowUse = 'export const read = (): string => window.name;';
	expect(await has(`/* eslint-disable */\n${windowUse}`, feature, 'agora/renderer-footgun', 'window')).toBe(true);
	expect(await has(`/* eslint-disable agora/renderer-footgun */\n${windowUse}`, feature, 'agora/renderer-footgun', 'window')).toBe(true);
	expect(await has(`${windowUse} // eslint-disable-line agora/renderer-footgun`, feature, 'agora/renderer-footgun', 'window')).toBe(true);
	expect(await has(`/* eslint-disable agora/renderer-footgun, agora/import-boundary */\nimport type { Database } from '@agora/storage';\nexport type Leak = keyof Database;\n${windowUse}`, feature, 'agora/import-boundary', 'renderer')).toBe(true);
	expect(await has(`/* eslint-disable agora/renderer-footgun, agora/import-boundary */\nimport type { Database } from '@agora/storage';\nexport type Leak = keyof Database;\n${windowUse}`, feature, 'agora/renderer-footgun', 'window')).toBe(true);
	expect(await has('export const value = 1;\n// eslint-disable-next-line agora/import-boundary\nexport type Leak = string;', feature, 'agora/renderer-footgun', 'architecture-exceptions.json')).toBe(true);
	expect(await has('// @ts-ignore\nexport const value = 1;', feature, 'agora/renderer-footgun', '@ts-ignore')).toBe(true);
	expect(await has('// @ts-expect-error\nexport const value: string = 1;', feature, 'agora/renderer-footgun', 'description')).toBe(true);
	expect(await has('// @ts-expect-error test contract fixture\nexport const value: string = 1;', feature, 'agora/renderer-footgun')).toBe(false);
}, 120_000);

test('portable client-core rejects application and storage edges', async () => {
	const file = 'packages/client-core/src/model.ts';
	expect(await has("import type { X } from '../../../apps/web/src/client/index.ts'; export type Leak = X;", file, 'agora/import-boundary', 'application code')).toBe(true);
	expect(await has("import type { Database } from '@agora/storage'; export type Leak = keyof Database;", file, 'agora/import-boundary')).toBe(true);
}, 120_000);

test('architecture exceptions reject wildcard expired unknown broadened and self-approved records and load committed file', async () => {
	expect(existsSync(path.join(root, 'scripts/architecture-exceptions.ts'))).toBe(true);
	const mod = await import('../../../scripts/architecture-exceptions.ts');
	mod.clearArchitectureExceptionCache();
	expect(() => { mod.assertArchitectureExceptionsValid(root); }).not.toThrow();
	const base = {
		path: feature,
		symbol: 'useEffect',
		guard: 'agora/renderer-footgun' as const,
		rationale: 'temporary bridge',
		owner: 'web-team',
		approver: 'architecture',
		expires: '2099-01-01',
		compensatingTest: 'packages/client-core/test/app-architecture.test.ts',
	};
	expect(mod.validateArchitectureExceptions({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [] })).toEqual([]);
	expect(mod.validateArchitectureExceptions(mod.parseArchitectureExceptions(JSON.stringify({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [base] })))).toEqual([]);
	expect(mod.validateArchitectureExceptions({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [{ ...base, path: 'apps/web/src/features/**/*.tsx' }] }).some((e) => e.includes('exact file path'))).toBe(true);
	expect(mod.validateArchitectureExceptions({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [{ ...base, path: 'apps/web/src/features/' }] }).some((e) => e.includes('exact file path'))).toBe(true);
	expect(mod.validateArchitectureExceptions({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [{ ...base, expires: '2020-01-01' }] }, { today: '2026-09-21' }).some((e) => e.includes('expired'))).toBe(true);
	expect(mod.validateArchitectureExceptions({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [{ ...base, guard: 'agora/not-a-rule' as typeof base.guard }] }).some((e) => e.includes('unknown guard'))).toBe(true);
	expect(mod.validateArchitectureExceptions({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [{ ...base, owner: 'same', approver: 'same' }] }).some((e) => e.includes('self-approved'))).toBe(true);
	expect(mod.validateArchitectureExceptions({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [{ ...base, symbol: '*' }] }).some((e) => e.includes('symbol'))).toBe(true);
	expect(mod.validateArchitectureExceptions({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [{ ...base, symbol: '@agora/storage' }] })).toEqual([]);
	expect(mod.validateArchitectureExceptions({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [{ ...base, symbol: '../notes/secret.ts' }] })).toEqual([]);
	expect(mod.validateArchitectureExceptions({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [{ ...base, symbol: 'dynamic-import' }] })).toEqual([]);
	expect(mod.validateArchitectureExceptions({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [{ ...base, symbol: 'react-dom/client' }] })).toEqual([]);
});

test('exact architecture exceptions cover scoped relative and dynamic symbols without broadening', async () => {
	const mod = await import('../../../scripts/architecture-exceptions.ts');
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'agora-arch-ex-'));
	mkdirSync(path.join(tempRoot, 'agora'), { recursive: true });
	mkdirSync(path.join(tempRoot, 'packages/client-core/test'), { recursive: true });
	writeFileSync(path.join(tempRoot, 'packages/client-core/test/app-architecture.test.ts'), '// compensating fixture\n');
	const row = {
		path: feature,
		symbol: 'window',
		guard: 'agora/renderer-footgun' as const,
		rationale: 'fixture bridge for exact-path exception proof',
		owner: 'web-team',
		approver: 'architecture',
		expires: '2099-01-01',
		compensatingTest: 'packages/client-core/test/app-architecture.test.ts',
	};
	try {
		writeFileSync(path.join(tempRoot, 'agora/architecture-exceptions.json'), JSON.stringify({ schema_version: 'agora.architecture-exceptions/v1', exceptions: [row] }));
		mod.clearArchitectureExceptionCache();
		expect(mod.exceptionAllows(path.join(tempRoot, feature), 'window', 'agora/renderer-footgun', tempRoot)).toBe(true);
		expect(mod.exceptionAllows(path.join(tempRoot, notes), 'window', 'agora/renderer-footgun', tempRoot)).toBe(false);
		writeFileSync(path.join(tempRoot, 'agora/architecture-exceptions.json'), JSON.stringify({
			schema_version: 'agora.architecture-exceptions/v1',
			exceptions: [{ ...row, symbol: '@agora/storage', guard: 'agora/import-boundary' }],
		}));
		mod.clearArchitectureExceptionCache();
		expect(mod.exceptionAllows(path.join(tempRoot, feature), '@agora/storage', 'agora/import-boundary', tempRoot)).toBe(true);
		expect(mod.exceptionAllows(path.join(tempRoot, feature), '@agora/domain', 'agora/import-boundary', tempRoot)).toBe(false);
		expect(mod.validateArchitectureExceptions({
			schema_version: 'agora.architecture-exceptions/v1',
			exceptions: [{ ...row, symbol: '../notes/secret.ts' }, { ...row, symbol: 'dynamic-import' }, { ...row, symbol: 'react-dom/client' }],
		}, { root: tempRoot })).toEqual([]);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
		mod.clearArchitectureExceptionCache();
	}
}, 120_000);

test('public CLI fails closed when architecture exceptions are invalid at config load', () => {
	const exceptionsPath = path.join(root, 'agora/architecture-exceptions.json');
	const original = readFileSync(exceptionsPath);
	writeFileSync(`${exceptionsPath}.bak-test`, original);
	try {
		writeFileSync(exceptionsPath, JSON.stringify({
			schema_version: 'agora.architecture-exceptions/v1',
			exceptions: [{
				path: feature,
				symbol: 'window',
				guard: 'agora/renderer-footgun',
				rationale: 'invalid self-approved fixture',
				owner: 'same',
				approver: 'same',
				expires: '2099-01-01',
				compensatingTest: 'packages/client-core/test/app-architecture.test.ts',
			}],
		}));
		// File outside guarded roots: only config-load validation should fail.
		const result = spawnSync('pnpm', ['exec', 'eslint', 'docs/site/build.mjs'], {
			cwd: root,
			encoding: 'utf8',
			env: { ...process.env, GH_TOKEN: undefined, GITHUB_TOKEN: undefined, FIRSTMATE_GH_TOKEN: undefined },
		});
		expect(result.status ?? 1).not.toBe(0);
		expect(`${result.stdout}\n${result.stderr}`).toMatch(/self-approved|architecture exceptions|Error/i);
	} finally {
		writeFileSync(exceptionsPath, original);
		rmSync(`${exceptionsPath}.bak-test`, { force: true });
	}
}, 120_000);

test('removing app-architecture protections makes denial assertions turn red', async () => {
	for (const [rule, file, code] of [
		['agora/import-boundary', feature, "import type { Database } from '@agora/storage'; export type Leak = keyof Database;"],
		['agora/renderer-footgun', feature, "import { useEffect } from 'react'; export function Card(): null { useEffect(() => undefined, []); return null; }"],
		['agora/renderer-footgun', feature, "import { useEffect as sideEffect } from 'react'; export function Card(): null { sideEffect(() => undefined, []); return null; }"],
		['agora/renderer-footgun', feature, "import * as React from 'react'; export function Card(): null { React.useEffect(() => undefined, []); return null; }"],
		['agora/renderer-footgun', feature, 'export const read = (): string => window.name;'],
		['agora/renderer-footgun', feature, 'export const detach = (node: Element): void => { node.remove(); };'],
		['agora/renderer-footgun', feature, "const k = 'appendChild' as const; export const m = (n: Element, c: Node): Node => n[k](c);"],
		['agora/renderer-footgun', feature, 'declare const window: Window; export const read = (): string => window.name;'],
	] as const) {
		expect((await agora(code, file)).some((m) => m.ruleId === rule)).toBe(true);
		const messages = await agora(code, file, new ESLint({ cwd: root, ignore: false, overrideConfig: [{ rules: { [rule]: 'off' } }] }));
		expect(messages.filter((m) => m.ruleId === rule)).toEqual([]);
		expect(() => {
			expect(messages.some((m) => m.ruleId === rule)).toBe(true);
		}).toThrow('expected false to be true');
	}
}, 120_000);
