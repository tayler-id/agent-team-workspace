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
// Project-service typed lint needs the reserved owner paths on disk for the apps/web tsconfig.
for (const rel of ownerStubs) {
	const abs = path.join(root, rel);
	mkdirSync(path.dirname(abs), { recursive: true });
	if (!existsSync(abs)) writeFileSync(abs, 'export {};\n');
}
const engine = new ESLint({ cwd: root, ignore: false });
const probes = new Set<string>();
const track = (rel: string): string => { probes.add(rel); return path.join(root, rel); };
afterAll(() => {
	for (const rel of ownerStubs) try { rmSync(path.join(root, rel), { force: true }); } catch { /* gone */ }
});
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
const effectCard = (imp: string, call: string): string => `${imp} export function Card(): null { ${call}(() => undefined, []); return null; }`;
const storageLeak = "import type { Database } from '@agora/storage';\nexport type Leak = keyof Database;\n";
const cjsLeak = "const storage = require('@agora/storage');\nmodule.exports = { storage };\n";

test('owner tables are explicit and test-visible architecture policy', () => {
	const b = readFileSync(path.join(root, 'scripts/boundary-policy.ts'), 'utf8');
	const x = readFileSync(path.join(root, 'scripts/architecture-exceptions.ts'), 'utf8');
	const e = readFileSync(path.join(root, 'eslint.config.js'), 'utf8');
	expect(b).toContain("export const PACKAGE_OWNERS = ['contracts', 'packages/client-core', 'packages/domain', 'packages/storage', 'apps/center', 'apps/web', 'apps/worker']");
	for (const s of ["framework: 'apps/web/src/framework'", "client: 'apps/web/src/client'", "host: 'apps/web/src/host'", "features: 'apps/web/src/features'", 'export const domGlobals', 'apps/web/src']) expect(b).toContain(s);
	expect(x).toContain("'agora/import-boundary', 'agora/public-types', 'agora/renderer-footgun'");
	expect(e).toContain('noInlineConfig: true');
	expect(e).toMatch(/assertArchitectureExceptionsValid\s*\(/);
	expect(e).toContain('ts,tsx,mts,cts,js,jsx,mjs,cjs');
	expect(e).toContain('apps/web/**');
	expect(e).toContain('contracts/**/*.js');
	expect(e).toContain('contracts/**/*.{mjs,cjs}');
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
}, 120_000);

test('apps/web non-src relocation cannot bypass renderer footguns or import boundaries', () => {
	const stamp = `reloc${Date.now().toString(36)}`;
	const leak = ['export const load = (u: string): Promise<Response> => fetch(u);', 'export const agent = (): string => navigator.userAgent;', 'export const sock = (u: string): WebSocket => new WebSocket(u);'].join('\n');
	writeProbe(`apps/web/test/${stamp}-leak.ts`, leak);
	writeProbe(`apps/web/lib/${stamp}-leak.ts`, leak);
	const featureRel = `apps/web/src/features/room/${stamp}-reloc.tsx`;
	writeProbe(featureRel, [`import { load, agent } from '../../../test/${stamp}-leak.ts';`, `import { sock } from '../../../lib/${stamp}-leak.ts';`, 'export const run = async (u: string): Promise<string> => { await load(u); sock(u); return agent(); };'].join('\n'));
	const ctrl = `apps/web/src/features/room/${stamp}-ctrl.tsx`;
	writeProbe(ctrl, leak);
	for (const rel of [`apps/web/test/${stamp}-leak.ts`, `apps/web/lib/${stamp}-leak.ts`, ctrl]) {
		const { status, out } = publicEslint(rel);
		expect(status, rel).toBe(1);
		expect(out, rel).toContain('agora/renderer-footgun');
	}
	const { status, out } = publicEslint(featureRel);
	expect(status).toBe(1);
	expect(out).toMatch(/agora\/(import-boundary|renderer-footgun)/);
	expect(out).toMatch(/apps\/web\/src|fetch|navigator|WebSocket|relative import escapes/);
}, 120_000);

test('renderer footguns: effects only in framework; browser APIs only in host or framework', async () => {
	const effect = effectCard("import { useEffect } from 'react';", 'useEffect');
	expect(await has(effect, feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	expect(await has(effect, framework, 'agora/renderer-footgun')).toBe(false);
	const aliased = effectCard("import { useEffect as sideEffect } from 'react';", 'sideEffect');
	expect(await has(aliased, feature, 'agora/renderer-footgun', 'useEffect')).toBe(true);
	expect(await has(aliased, framework, 'agora/renderer-footgun')).toBe(false);
	expect(await has(effectCard("import { 'useEffect' as ue } from 'react';", 'ue'), feature, 'agora/renderer-footgun', 'useEffect')).toBe(true);
	const namespaced = effectCard("import * as React from 'react';", 'React.useLayoutEffect');
	expect(await has(namespaced, feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	expect(await has(namespaced, framework, 'agora/renderer-footgun')).toBe(false);
	expect(await has(effectCard("import React from 'react';", 'React.useInsertionEffect'), feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	expect(await has('export function useEffect(run: () => void): void { run(); } export function Card(): null { useEffect(() => undefined); return null; }', feature, 'agora/renderer-footgun')).toBe(false);
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
	const deny = async (code: string, needle: string = owners.framework): Promise<void> => { expect(await has(code, feature, 'agora/renderer-footgun', needle)).toBe(true); };
	await deny("import React from 'react'; const { useEffect } = React; export function Card(): null { useEffect(() => undefined, []); return null; }");
	await deny("import * as R from 'react'; const { useLayoutEffect } = R; export function Card(): null { useLayoutEffect(() => undefined, []); return null; }");
	await deny(effectCard("import { useEffect } from 'react'; const eff = useEffect;", 'eff'), 'useEffect');
	await deny("import React from 'react'; export function Card(): null { React['useEffect'](() => undefined, []); return null; }");
	await deny("export async function boot(): Promise<void> { const R = await import('react'); R.useEffect(() => undefined, []); }");
	await deny("export { useEffect } from 'react';");
	await deny("export { 'useEffect' as ue } from 'react';", 'useEffect');
	await deny("export * from 'react';");
	expect(await has('export function useEffect(run: () => void): void { run(); } export const run = (): void => { useEffect(() => undefined); };', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('const api = { useEffect(run: () => void): void { run(); } }; export const run = (): void => { api.useEffect(() => undefined); };', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has("import { useEffect } from '../../framework/index.ts'; export function Card(): null { useEffect(() => undefined); return null; }", feature, 'agora/renderer-footgun')).toBe(false);
}, 120_000);

test('browser globals require unresolved references; Host ports and ordinary names stay allowed', async () => {
	const allow = async (code: string): Promise<void> => { expect(await has(code, feature, 'agora/renderer-footgun')).toBe(false); };
	await allow('export const read = (props: { location: string }): string => props.location;');
	await allow('export const read = (props: { location: string }): string => { const { location } = props; return location; };');
	await allow('export const ports = { fetch: (u: string): string => u };');
	await allow('export type Ports = { document: string; window: number };');
	await allow('export class Nav { history: string[] = []; }');
	await allow('export function label(window: { name: string }): string { return window.name; }');
	await allow("import { fetch } from '../../host/index.ts'; export async function load(u: string): Promise<string> { return fetch(u); }");
	expect(await has('export const read = (): string => window.name;', feature, 'agora/renderer-footgun', 'window')).toBe(true);
	expect(await has('export const read = (): string => document.title;', feature, 'agora/renderer-footgun', 'document')).toBe(true);
	expect(await has('export const openSocket = (): WebSocket => new WebSocket("wss://x");', feature, 'agora/renderer-footgun', 'WebSocket')).toBe(true);
}, 120_000);

test('ambient declare shadows cannot hide browser globals', async () => {
	const code = ['declare const window: Window;', 'declare const document: Document;', 'declare function fetch(u: string): Promise<Response>;', 'export const t = (): string => document.title;', 'export const n = (): string => window.name;', 'export const f = (u: string): Promise<Response> => fetch(u);'].join('\n');
	expect(await has(code, feature, 'agora/renderer-footgun', 'window')).toBe(true);
	expect(await has(code, feature, 'agora/renderer-footgun', 'document')).toBe(true);
	expect(await has(code, feature, 'agora/renderer-footgun', 'fetch')).toBe(true);
	const rel = `apps/web/src/features/room/decl${Date.now().toString(36)}.tsx`;
	writeProbe(rel, code);
	const { status, out } = publicEslint(rel);
	expect(status).toBe(1);
	expect(out).toContain('agora/renderer-footgun');
	expect(out).toContain('window');
}, 120_000);

test('DOM mutation is receiver-aware including computed and union keys; ordinary writers stay allowed', async () => {
	const allow = async (code: string): Promise<void> => { expect(await has(code, feature, 'agora/renderer-footgun')).toBe(false); };
	const deny = async (code: string): Promise<void> => { expect(await has(code, feature, 'agora/renderer-footgun', 'DOM mutation')).toBe(true); };
	await allow('export const q = (p: URLSearchParams, v: string): void => { p.append("q", v); };');
	await allow('export const h = (x: Headers): void => { x.append("a", "b"); };');
	await allow('export const drop = (store: { remove: (id: string) => void }, id: string): void => { store.remove(id); };');
	await allow("export const writeOut = (out: { write: (s: string) => void }): void => { out.write('x'); };");
	await deny('export const detach = (node: Element): void => { node.remove(); };');
	await deny('export const mount = (node: Element, child: Node): Node => node.appendChild(child);');
	await deny("export const mount = (node: Element, child: Node): Node => node['appendChild'](child);");
	await deny("const k = 'appendChild' as const; export const mount = (node: Element, child: Node): Node => node[k](child);");
	await deny("export const a = (n: Element, c: Node, k: 'append' | 'prepend'): void => { n[k](c); };");
	await deny("export const b = (n: Element, c: Node, flag: boolean): void => { const k = flag ? 'append' : 'prepend'; n[k](c); };");
	await deny("export const r = (n: Element, k: 'remove' | 'normalize'): void => { n[k](); };");
	await deny("export const s = (n: Element, flag: boolean): void => { const k = flag ? 'remove' : 'normalize'; n[k](); };");
	await deny("export const t = (n: Element, k: 'append' | 'getAttribute'): unknown => n[k]('x');");
	const rel = `apps/web/src/features/room/mut${Date.now().toString(36)}.tsx`;
	writeProbe(rel, "export const r = (n: Element, k: 'remove' | 'normalize'): void => { n[k](); };\n");
	const { status, out } = publicEslint(rel);
	expect(status).toBe(1);
	expect(out).toContain('DOM mutation');
}, 120_000);

test('inline eslint disables cannot suppress Agora rules including bare and line forms', async () => {
	const windowUse = 'export const read = (): string => window.name;';
	expect(await has(`/* eslint-disable */\n${windowUse}`, feature, 'agora/renderer-footgun', 'window')).toBe(true);
	expect(await has(`/* eslint-disable agora/renderer-footgun */\n${windowUse}`, feature, 'agora/renderer-footgun', 'window')).toBe(true);
	expect(await has(`${windowUse} // eslint-disable-line agora/renderer-footgun`, feature, 'agora/renderer-footgun', 'window')).toBe(true);
	const mixed = `/* eslint-disable agora/renderer-footgun, agora/import-boundary */\nimport type { Database } from '@agora/storage';\nexport type Leak = keyof Database;\n${windowUse}`;
	expect(await has(mixed, feature, 'agora/import-boundary', 'renderer')).toBe(true);
	expect(await has(mixed, feature, 'agora/renderer-footgun', 'window')).toBe(true);
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
		path: feature, symbol: 'useEffect', guard: 'agora/renderer-footgun' as const, rationale: 'temporary bridge',
		owner: 'web-team', approver: 'architecture', expires: '2099-01-01', compensatingTest: 'packages/client-core/test/app-architecture.test.ts',
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
		path: feature, symbol: 'window', guard: 'agora/renderer-footgun' as const,
		rationale: 'fixture bridge for exact-path exception proof', owner: 'web-team', approver: 'architecture',
		expires: '2099-01-01', compensatingTest: 'packages/client-core/test/app-architecture.test.ts',
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

test('eslint config load path fails closed on invalid architecture exceptions', () => {
	const eslintConfig = readFileSync(path.join(root, 'eslint.config.js'), 'utf8');
	expect(eslintConfig).toMatch(/^assertArchitectureExceptionsValid\s*\(\s*\)\s*;/m);
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'agora-arch-load-'));
	mkdirSync(path.join(tempRoot, 'agora'), { recursive: true });
	mkdirSync(path.join(tempRoot, 'packages/client-core/test'), { recursive: true });
	writeFileSync(path.join(tempRoot, 'packages/client-core/test/app-architecture.test.ts'), '// compensating fixture\n');
	writeFileSync(path.join(tempRoot, 'agora/architecture-exceptions.json'), JSON.stringify({
		schema_version: 'agora.architecture-exceptions/v1',
		exceptions: [{
			path: feature, symbol: 'window', guard: 'agora/renderer-footgun', rationale: 'invalid self-approved fixture',
			owner: 'same', approver: 'same', expires: '2099-01-01', compensatingTest: 'packages/client-core/test/app-architecture.test.ts',
		}],
	}));
	const loader = path.join(tempRoot, 'load-assert.mjs');
	writeFileSync(loader, `import { assertArchitectureExceptionsValid } from ${JSON.stringify(path.join(root, 'scripts/architecture-exceptions.ts'))};\nassertArchitectureExceptionsValid(${JSON.stringify(tempRoot)});\n`);
	try {
		const result = spawnSync(process.execPath, [loader], {
			cwd: root, encoding: 'utf8', env: { ...process.env, GH_TOKEN: undefined, GITHUB_TOKEN: undefined, FIRSTMATE_GH_TOKEN: undefined },
		});
		expect(result.status ?? 1).not.toBe(0);
		expect(`${result.stdout}\n${result.stderr}`).toMatch(/self-approved/);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
}, 120_000);

test('removing app-architecture protections makes denial assertions turn red', async () => {
	for (const [rule, file, code] of [
		['agora/import-boundary', feature, "import type { Database } from '@agora/storage'; export type Leak = keyof Database;"],
		['agora/renderer-footgun', feature, effectCard("import { useEffect } from 'react';", 'useEffect')],
		['agora/renderer-footgun', feature, effectCard("import { 'useEffect' as ue } from 'react';", 'ue')],
		['agora/renderer-footgun', feature, effectCard("import * as React from 'react';", 'React.useEffect')],
		['agora/renderer-footgun', feature, 'export const read = (): string => window.name;'],
		['agora/renderer-footgun', feature, 'export const detach = (node: Element): void => { node.remove(); };'],
		['agora/renderer-footgun', feature, "export const a = (n: Element, c: Node, k: 'append' | 'prepend'): void => { n[k](c); };"],
		['agora/renderer-footgun', feature, "export const r = (n: Element, k: 'remove' | 'normalize'): void => { n[k](); };"],
		['agora/renderer-footgun', feature, 'declare const window: Window; export const read = (): string => window.name;'],
	] as const) {
		expect((await agora(code, file)).some((m) => m.ruleId === rule)).toBe(true);
		const messages = await agora(code, file, new ESLint({ cwd: root, ignore: false, overrideConfig: [{ rules: { [rule]: 'off' } }] }));
		expect(messages.filter((m) => m.ruleId === rule)).toEqual([]);
		expect(() => { expect(messages.some((m) => m.ruleId === rule)).toBe(true); }).toThrow('expected false to be true');
	}
}, 120_000);
