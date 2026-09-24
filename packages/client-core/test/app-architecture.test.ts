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
// Only paths this run creates get deleted in afterAll: once real product code lands at one of
// these owner paths (e.g. the apps/web Host barrel), that file already exists on disk and must
// never be touched by setup or cleanup.
const syncOwnerStubs = (rootDir: string, stubs: readonly string[]): string[] => {
	const created: string[] = [];
	for (const rel of stubs) {
		const abs = path.join(rootDir, rel);
		mkdirSync(path.dirname(abs), { recursive: true });
		if (!existsSync(abs)) { writeFileSync(abs, 'export {};\n'); created.push(rel); }
	}
	return created;
};
const cleanupOwnerStubs = (rootDir: string, created: readonly string[]): void => {
	for (const rel of created) try { rmSync(path.join(rootDir, rel), { force: true }); } catch { /* gone */ }
};
const createdOwnerStubs = syncOwnerStubs(root, ownerStubs);
// The two tests below write the real agora/architecture-exceptions.json in place and restore it in
// a finally. `packages/client-core/test/fixture.test.ts` shells out `pnpm -s boundaries`, which
// re-runs this same file as a nested vitest subprocess; without a cross-process lock, that nested
// run and this one can both hold the file mutated at once and one process's restore loses the race,
// corrupting the committed registry on disk. mkdir is atomic on POSIX filesystems, so a lock
// directory next to the registry serializes both processes on the same absolute path.
const withRegistryLock = async <T>(registry: string, run: () => Promise<T> | T): Promise<T> => {
	const lockDir = `${registry}.lock`;
	const deadline = Date.now() + 60_000;
	for (;;) {
		try { mkdirSync(lockDir); break; }
		catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
			if (Date.now() > deadline) throw new Error(`timed out waiting for registry lock at ${lockDir}`, { cause: err });
			await new Promise((resolve) => setTimeout(resolve, 15));
		}
	}
	try { return await run(); } finally { rmSync(lockDir, { recursive: true, force: true }); }
};
const engine = new ESLint({ cwd: root, ignore: false });
const probes = new Set<string>();
const track = (rel: string): string => { probes.add(rel); return path.join(root, rel); };
afterAll(() => { cleanupOwnerStubs(root, createdOwnerStubs); });
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

test('owner stub sync preserves pre-existing bytes on setup and cleanup, and only removes what it created', () => {
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'agora-owner-stub-'));
	try {
		const existingRel = 'apps/web/src/host/index.ts';
		const missingRel = 'apps/web/src/client/index.ts';
		const existingAbs = path.join(tempRoot, existingRel);
		const missingAbs = path.join(tempRoot, missingRel);
		mkdirSync(path.dirname(existingAbs), { recursive: true });
		const realBytes = "export const real = 'not a stub';\n";
		writeFileSync(existingAbs, realBytes);
		const created = syncOwnerStubs(tempRoot, [existingRel, missingRel]);
		expect(created).toEqual([missingRel]);
		expect(readFileSync(existingAbs, 'utf8')).toBe(realBytes);
		expect(existsSync(missingAbs)).toBe(true);
		cleanupOwnerStubs(tempRoot, created);
		expect(readFileSync(existingAbs, 'utf8')).toBe(realBytes);
		expect(existsSync(missingAbs)).toBe(false);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test('owner tables are explicit and test-visible architecture policy', () => {
	const b = readFileSync(path.join(root, 'scripts/boundary-policy.ts'), 'utf8');
	const x = readFileSync(path.join(root, 'scripts/architecture-exceptions.ts'), 'utf8');
	const e = readFileSync(path.join(root, 'eslint.config.js'), 'utf8');
	expect(b).toContain("export const PACKAGE_OWNERS = ['contracts', 'packages/client-core', 'packages/web-framework', 'packages/domain', 'packages/storage', 'apps/center', 'apps/web', 'apps/worker']");
	for (const s of ["framework: 'apps/web/src/framework'", "client: 'apps/web/src/client'", "host: 'apps/web/src/host'", "features: 'apps/web/src/features'", 'export const domGlobals', 'apps/web/src']) expect(b).toContain(s);
	expect(x).toContain("'agora/import-boundary', 'agora/renderer-footgun'");
	expect(b.match(/exceptionAllows\(file, /g)).toHaveLength(3);
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

test('apps/web test/config owner allows dev-tooling imports; production src cannot import them, including a relay', async () => {
	const testFile = 'apps/web/test/fixture.test.ts';
	const devImport = "import { test } from 'vitest'; test('x', () => undefined);\n";
	expect(await has(devImport, testFile, 'agora/import-boundary')).toBe(false);
	expect(await has(devImport, feature, 'agora/import-boundary', 'vitest')).toBe(true);
	expect(await has(`export { test } from '${testFile}';`, feature, 'agora/import-boundary')).toBe(true);
	// The owner is file-name-scoped (*.test.ts(x)), not directory-scoped: a non-test file placed
	// under apps/web/test/ (the same relocation trick the adversarial test above covers for
	// renderer-footgun) still gets the strict apps/web import-boundary allow-list.
	const relocated = `apps/web/test/${Date.now().toString(36)}-leak.ts`;
	writeProbe(relocated, devImport);
	expect(await has(devImport, relocated, 'agora/import-boundary', 'vitest')).toBe(true);
}, 60_000);

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

test('DOM property assignment and setAttribute-family mutation is receiver-aware; ordinary property writers stay allowed', async () => {
	const allow = async (code: string): Promise<void> => { expect(await has(code, feature, 'agora/renderer-footgun')).toBe(false); };
	const deny = async (code: string, needle: string): Promise<void> => { expect(await has(code, feature, 'agora/renderer-footgun', needle)).toBe(true); };
	await deny('export const set = (n: HTMLElement, s: string): void => { n.innerHTML = s; };', 'innerHTML assignment');
	await deny('export const set = (n: HTMLElement, s: string): void => { n.outerHTML = s; };', 'outerHTML assignment');
	await deny('export const set = (n: HTMLElement, s: string): void => { n.textContent = s; };', 'textContent assignment');
	await deny('export const set = (n: HTMLElement, s: string): void => { n.style = s; };', 'style assignment');
	await deny('export const set = (n: HTMLElement, s: string): void => { n.style.color = s; };', 'color assignment');
	await deny("export const set = (n: Element, s: string): void => { n.setAttribute('data-x', s); };", 'setAttribute');
	await deny("export const set = (n: Element): void => { n.removeAttribute('data-x'); };", 'removeAttribute');
	// Cast-evasion: wrapping a real DOM receiver in an unrelated type must not hide the mutation.
	await deny('export const set = (n: HTMLElement, s: string): void => { (n as unknown as { innerHTML: string }).innerHTML = s; };', 'innerHTML assignment');
	await deny('export const mount = (n: Element, c: Node): void => { (n as unknown as { append(x: Node): void }).append(c); };', 'append');
	// Ordinary objects that merely happen to have these property/method names stay allowed.
	await allow('interface Config { style: string; innerHTML: string } export const set = (c: Config, v: string): void => { c.style = v; c.innerHTML = v; };');
	await allow("export const set = (c: { setAttribute: (k: string, v: string) => void }, v: string): void => { c.setAttribute('k', v); };");
	const rel = `apps/web/src/features/room/prop${Date.now().toString(36)}.tsx`;
	writeProbe(rel, "export const set = (n: HTMLElement, s: string): void => { n.innerHTML = s; };\n");
	const { status, out } = publicEslint(rel);
	expect(status).toBe(1);
	expect(out).toContain('innerHTML assignment');
}, 120_000);

test('untyped mjs/cjs ambiguous DOM mutators are denied by name via the public CLI, closing the disableTypeChecked gap', () => {
	const stamp = `mutuntyped${Date.now().toString(36)}`;
	const rows = [
		{ rel: `apps/web/src/features/room/${stamp}.mjs`, body: 'export const mutate = (node, child) => { node.append(child); };\n' },
		{ rel: `apps/web/src/features/room/${stamp}.cjs`, body: "module.exports.mutate = (node, child) => { node.prepend(child); };\n" },
	];
	for (const row of rows) {
		writeProbe(row.rel, row.body);
		const { status, out } = publicEslint(row.rel);
		expect(status, row.rel).toBe(1);
		expect(out, row.rel).toContain('DOM mutation');
	}
}, 60_000);

test('JSDoc import() type edges in guarded JavaScript cannot smuggle a forbidden module past import-boundary', () => {
	const stamp = `jsdoc${Date.now().toString(36)}`;
	const leakRel = `apps/web/src/features/room/${stamp}.mjs`;
	writeProbe(leakRel, "/** @type {import('@agora/storage').Database} */\nexport const leak = undefined;\n");
	const leaked = publicEslint(leakRel);
	expect(leaked.status).toBe(1);
	expect(leaked.out).toContain('agora/import-boundary');
	expect(leaked.out).toContain('renderer code cannot import @agora/storage');
	// Near miss: prose mentioning "import(...)" without a quoted specifier, and a JSDoc import() of an
	// already-allowed module, must not be flagged.
	const okRel = `apps/web/src/features/room/${stamp}-ok.mjs`;
	writeProbe(okRel, "// see the dynamic import() syntax docs\n/** @type {import('react').ReactNode} */\nexport const ok = undefined;\n");
	const ok = publicEslint(okRel);
	expect(ok.out).not.toContain('agora/import-boundary');
}, 60_000);

test('react/jsx-runtime namespace and default imports are allowed everywhere; real React namespace effects stay denied', async () => {
	expect(await has("import * as jsxRuntime from 'react/jsx-runtime'; export const j = jsxRuntime;", feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has("import jsxRuntime from 'react/jsx-dev-runtime'; export const j = jsxRuntime;", feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has("export async function boot(): Promise<unknown> { return import('react/jsx-runtime'); }", feature, 'agora/renderer-footgun')).toBe(false);
	expect(await has("import * as React from 'react'; export const r = React;", feature, 'agora/renderer-footgun', owners.framework)).toBe(true);
	const rel = `apps/web/src/features/room/jsxrt${Date.now().toString(36)}.tsx`;
	writeProbe(rel, "import * as jsxRuntime from 'react/jsx-runtime';\nexport const j = jsxRuntime;\n");
	expect(publicEslint(rel).out).not.toContain('agora/renderer-footgun');
}, 60_000);

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

test('a committed exception row lets exactly one renderer-footgun violation through the live rule', async () => {
	const registry = path.join(root, 'agora/architecture-exceptions.json');
	const windowUse = 'export const read = (): string => window.name;';
	// The whole test, including the pristine-state checks before and after the mutation, holds the
	// lock: a bare read of the registry (via `has`, which lints against whatever is on disk right
	// now) between two lock-protected sections would still observe another process's in-flight
	// mutation if it weren't inside the same critical section.
	await withRegistryLock(registry, async () => {
		const original = readFileSync(registry);
		expect(await has(windowUse, feature, 'agora/renderer-footgun', 'window')).toBe(true);
		try {
			writeFileSync(registry, JSON.stringify({
				schema_version: schema,
				exceptions: [{ ...exceptionRow, symbol: 'window', guard: 'agora/renderer-footgun' as const }],
			}, null, '\t'));
			expect(await has(windowUse, feature, 'agora/renderer-footgun')).toBe(false);
			expect(await has(windowUse, notes, 'agora/renderer-footgun', 'window')).toBe(true);
			expect(await has('export const read = (): string => document.title;', feature, 'agora/renderer-footgun', 'document')).toBe(true);
		} finally {
			writeFileSync(registry, original);
		}
		expect(readFileSync(registry).equals(original)).toBe(true);
		expect(await has(windowUse, feature, 'agora/renderer-footgun', 'window')).toBe(true);
	});
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
	expect(errors({ ...exceptionRow, guard: 'agora/not-a-rule' as typeof exceptionRow.guard })).toEqual(['exceptions[0].guard: unknown guard agora/not-a-rule']);
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
	const leak = "import type { Database } from '@agora/storage'; export type Leak = keyof Database;";
	await withRegistryLock(registry, async () => {
		const original = readFileSync(registry);
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
	});
}, 120_000);

test('concurrent registry writers serialize under the lock and leave committed bytes on disk', async () => {
	const registry = path.join(root, 'agora/architecture-exceptions.json');
	const original = readFileSync(registry);
	const lockDir = `${registry}.lock`;
	const stateFor = (label: string) => JSON.stringify({ schema_version: schema, exceptions: [{ ...exceptionRow, symbol: label }] });
	let holders = 0;
	const sawOverlap: boolean[] = [];
	const contender = (label: string) => withRegistryLock(registry, async () => {
		holders += 1;
		sawOverlap.push(holders > 1);
		writeFileSync(registry, stateFor(label));
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(readFileSync(registry, 'utf8')).toBe(stateFor(label));
		writeFileSync(registry, original);
		holders -= 1;
	});
	// Two invocations racing the same critical section this file's real-registry tests use;
	// the lock must serialize them so neither observes the other's write mid-flight.
	await Promise.all([contender('a'), contender('b')]);
	expect(sawOverlap).toEqual([false, false]);
	expect(readFileSync(registry).equals(original)).toBe(true);
	expect(existsSync(lockDir)).toBe(false);
});

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
		['agora/renderer-footgun', feature, 'export const set = (n: HTMLElement, s: string): void => { n.innerHTML = s; };'],
		['agora/renderer-footgun', feature, "export const set = (n: Element, s: string): void => { n.setAttribute('data-x', s); };"],
		['agora/renderer-footgun', feature, 'export const mount = (n: Element, c: Node): void => { (n as unknown as { append(x: Node): void }).append(c); };'],
		['agora/import-boundary', feature, "/** @type {import('@agora/storage').Database} */\nexport const leak = undefined;"],
	] as const) {
		expect((await agora(code, file)).some((m) => m.ruleId === rule)).toBe(true);
		const messages = await agora(code, file, new ESLint({ cwd: root, ignore: false, overrideConfig: [{ rules: { [rule]: 'off' } }] }));
		expect(messages.filter((m) => m.ruleId === rule)).toEqual([]);
		expect(() => { expect(messages.some((m) => m.ruleId === rule)).toBe(true); }).toThrow('expected false to be true');
	}
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
