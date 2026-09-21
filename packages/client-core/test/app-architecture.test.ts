import { ESLint } from 'eslint';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const engine = new ESLint({ cwd: root, ignore: false });
const feature = 'apps/web/src/features/room/index.tsx';
const featureMts = 'apps/web/src/features/room/boundary-fixture.mts';
const featureJs = 'apps/web/src/features/room/boundary-fixture.js';
const featureMjs = 'apps/web/src/features/room/boundary-fixture.mjs';
const featureCjs = 'apps/web/src/features/room/boundary-fixture.cjs';
const featureCts = 'apps/web/src/features/room/boundary-fixture.cts';
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
const agora = async (code: string, file: string, lint = engine) =>
	(await lint.lintText(code, { filePath: path.join(root, file) })).flatMap((r) => r.messages).filter((m) => m.ruleId?.startsWith('agora/'));
const has = async (code: string, file: string, rule: string, needle?: string) =>
	(await agora(code, file)).some((m) => m.ruleId === rule && (needle === undefined || m.message.includes(needle)));

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
	expect(eslintConfig).toContain('assertArchitectureExceptionsValid');
	expect(eslintConfig).toContain('ts,tsx,mts,cts,js,mjs,cjs');
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

test('every guarded source extension keeps import-boundary diagnostics', async () => {
	const code = "import type { Database } from '@agora/storage'; export type Leak = keyof Database;";
	for (const file of [feature, featureMts, featureCts, featureJs, featureMjs, featureCjs]) {
		expect(existsSync(path.join(root, file)), file).toBe(true);
		expect(await has(code, file, 'agora/import-boundary', 'renderer'), file).toBe(true);
	}
	expect(await has(code, 'packages/client-core/src/boundary-fixture.mts', 'agora/import-boundary', 'portable client-core')).toBe(true);
	expect(await has(code, 'packages/client-core/src/boundary-fixture.js', 'agora/import-boundary', 'portable client-core')).toBe(true);
}, 120_000);

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
	expect(await has(barrel, 'apps/web/src/features/room/hooks.ts', 'agora/renderer-footgun', owners.framework)).toBe(true);
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

test('DOM mutation is receiver-aware; URLSearchParams Headers and ordinary writers stay allowed', async () => {
	expect(await has('export const q = (p: URLSearchParams, v: string): void => { p.append("q", v); };', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export const h = (x: Headers): void => { x.append("a", "b"); };', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export const drop = (store: { remove: (id: string) => void }, id: string): void => { store.remove(id); };', feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has("export const writeOut = (out: { write: (s: string) => void }): void => { out.write('x'); };", feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has('export const detach = (node: Element): void => { node.remove(); };', feature, 'agora/renderer-footgun', 'DOM mutation')).toBe(true);
	expect(await has('export const mount = (node: Element, child: Node): Node => node.appendChild(child);', feature, 'agora/renderer-footgun', 'DOM mutation')).toBe(true);
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
	// Disposable root so parallel unit files never rewrite the committed exceptions file.
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

test('removing app-architecture protections makes denial assertions turn red', async () => {
	for (const [rule, file, code] of [
		['agora/import-boundary', feature, "import type { Database } from '@agora/storage'; export type Leak = keyof Database;"],
		['agora/renderer-footgun', feature, "import { useEffect } from 'react'; export function Card(): null { useEffect(() => undefined, []); return null; }"],
		['agora/renderer-footgun', feature, "import { useEffect as sideEffect } from 'react'; export function Card(): null { sideEffect(() => undefined, []); return null; }"],
		['agora/renderer-footgun', feature, "import * as React from 'react'; export function Card(): null { React.useEffect(() => undefined, []); return null; }"],
		['agora/renderer-footgun', feature, 'export const read = (): string => window.name;'],
		['agora/renderer-footgun', feature, 'export const detach = (node: Element): void => { node.remove(); };'],
	] as const) {
		expect((await agora(code, file)).some((m) => m.ruleId === rule)).toBe(true);
		const messages = await agora(code, file, new ESLint({ cwd: root, ignore: false, overrideConfig: [{ rules: { [rule]: 'off' } }] }));
		expect(messages.filter((m) => m.ruleId === rule)).toEqual([]);
		expect(() => {
			expect(messages.some((m) => m.ruleId === rule)).toBe(true);
		}).toThrow('expected false to be true');
	}
}, 120_000);
