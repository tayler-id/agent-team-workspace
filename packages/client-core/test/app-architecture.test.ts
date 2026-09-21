import { ESLint } from 'eslint';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

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
const agora = async (code: string, file: string, lint = engine) =>
	(await lint.lintText(code, { filePath: path.join(root, file) })).flatMap((r) => r.messages).filter((m) => m.ruleId?.startsWith('agora/'));
const has = async (code: string, file: string, rule: string, needle?: string) =>
	(await agora(code, file)).some((m) => m.ruleId === rule && (needle === undefined || m.message.includes(needle)));

test('owner tables are explicit and test-visible architecture policy', () => {
	const boundary = readFileSync(path.join(root, 'scripts/boundary-policy.ts'), 'utf8');
	const exceptions = readFileSync(path.join(root, 'scripts/architecture-exceptions.ts'), 'utf8');
	expect(boundary).toContain("export const PACKAGE_OWNERS = ['contracts', 'packages/client-core', 'packages/domain', 'packages/storage', 'apps/center', 'apps/web', 'apps/worker']");
	expect(boundary).toContain("framework: 'apps/web/src/framework'");
	expect(boundary).toContain("client: 'apps/web/src/client'");
	expect(boundary).toContain("host: 'apps/web/src/host'");
	expect(boundary).toContain("features: 'apps/web/src/features'");
	expect(exceptions).toContain("'agora/import-boundary', 'agora/public-types', 'agora/renderer-footgun'");
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

test('inline agora disables and bare ts-ignore rejected; described ts-expect-error allowed', async () => {
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

test('architecture exceptions reject wildcard expired unknown broadened and self-approved records', async () => {
	expect(existsSync(path.join(root, 'scripts/architecture-exceptions.ts'))).toBe(true);
	const mod = await import('../../../scripts/architecture-exceptions.ts');
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
});

test('removing app-architecture protections makes denial assertions turn red', async () => {
	for (const [rule, file, code] of [
		['agora/import-boundary', feature, "import type { Database } from '@agora/storage'; export type Leak = keyof Database;"],
		['agora/renderer-footgun', feature, "import { useEffect } from 'react'; export function Card(): null { useEffect(() => undefined, []); return null; }"],
		['agora/renderer-footgun', feature, 'export const read = (): string => window.name;'],
	] as const) {
		expect((await agora(code, file)).some((m) => m.ruleId === rule)).toBe(true);
		const messages = await agora(code, file, new ESLint({ cwd: root, ignore: false, overrideConfig: [{ rules: { [rule]: 'off' } }] }));
		expect(messages.filter((m) => m.ruleId === rule)).toEqual([]);
		expect(() => {
			expect(messages.some((m) => m.ruleId === rule)).toBe(true);
		}).toThrow('expected false to be true');
	}
}, 120_000);
