import { ESLint } from 'eslint';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const engine = new ESLint({ cwd: root, ignore: false });
const lintMessages = async (code: string, file: string, lint = engine) => (await lint.lintText(code, { filePath: path.join(root, file) })).flatMap((r) => r.messages);
const boundary = async (code: string, file: string, lint = engine) => (await lintMessages(code, file, lint)).filter((m) => m.ruleId?.startsWith('agora/'));
const pure = 'export const identity = (value: string): string => value;';
const consumers = ['packages/client-core/src/model.ts', 'packages/domain/src/index.ts', 'contracts/src/index.ts'];
const forbidden = ['react', 'react-dom', '@tanstack/react-query', 'hono', 'drizzle-orm', 'pg', '@agora/storage', '@agora/center', 'ws', 'node:http', 'node:https', 'undici', 'axios', 'openai', '@anthropic-ai/sdk', '@ai-sdk/google', '@types/react', '@types/node'];
const forms = [
	(m: string) => `import { forbidden } from '${m}'; export const leak: unknown = forbidden;`,
	(m: string) => `import type { Forbidden } from '${m}'; export type Leak = Forbidden;`,
	(m: string) => `export async function leak(): Promise<unknown> { return import('${m}'); }`,
	(m: string) => `export * from '${m}';`,
	(m: string) => `export type * from '${m}';`,
	(m: string) => `export type Leak = import('${m}').Forbidden;`,
	(m: string) => `import { type Forbidden } from '${m}'; export type Leak = Forbidden;`,
	(m: string) => `export { type Forbidden as Leak } from '${m}';`,
];

test.each(consumers)('%s rejects framework, provider, storage and transport imports in every syntax', async (file) => {
	expect(await boundary(pure, file)).toEqual([]);
	for (const module of forbidden) for (const form of forms) {
		const messages = await boundary(form(module), file);
		expect(messages.some((m) => m.ruleId === 'agora/import-boundary'), `${file}: ${form(module)}`).toBe(true);
	}
}, 120_000);

test('private relative paths, unknown dynamic targets and facade values cannot enter core', async () => {
	const file = 'packages/client-core/src/model.ts';
	for (const module of ['../../storage/src/index.ts', '../../domain/src/index.ts', '../../../apps/center/src/app.ts', '@agora/domain', '@agora/contracts', '@agora/contracts/canonical']) {
		for (const form of forms) expect((await boundary(form(module), file)).some((m) => m.ruleId === 'agora/import-boundary'), module).toBe(true);
	}
	for (const code of ["export const leak: unknown = import('node:' + 'http');", "declare const target: string; export const leak: unknown = import(target);", "import leak = require('hono'); export { leak };", "export const leak: unknown = globalThis['fetch'];", 'export type Leak = Request;', 'export type Leak = HTMLCanvasElement;']) expect((await boundary(code, file)).some((m) => m.ruleId === 'agora/import-boundary'), code).toBe(true);
	expect(await boundary("import type { components } from '@agora/contracts/values'; export type Revision = components['schemas']['Revision'];", file)).toEqual([]);
	expect((await boundary("export * from '@agora/contracts/values';", file)).some((m) => m.ruleId === 'agora/import-boundary')).toBe(true);
	expect((await boundary("import type { ReactNode } from 'react'; export type Leak = ReactNode;", 'contracts/generated/typescript/openapi.d.ts')).some((m) => m.ruleId === 'agora/import-boundary')).toBe(true);
	expect((await boundary("import OpenAI from 'openai'; export const client = OpenAI;", 'contracts/tools/generate.mjs')).some((m) => m.ruleId === 'agora/import-boundary')).toBe(true);
}, 120_000);

test('a private storage adapter may import pg but cannot leak its types through the public port', async () => {
	const file = 'packages/storage/src/database.ts';
	const privateSdk = "import { Pool } from 'pg'; export function openDatabase(): Promise<boolean> { const pool = new Pool(); return pool.end().then(() => true); }";
	expect((await lintMessages(privateSdk, file)).filter((m) => m.severity === 2)).toEqual([]);
	for (const leak of [
		"import { Pool } from 'pg'; interface Hidden { nested: { client: Pool } } export function openDatabase(): Hidden { return { nested: { client: new Pool() } }; }",
		"import { Pool } from 'pg'; export function openDatabase(): Promise<ReadonlyArray<{ make: () => Pool }>> { throw new Error('fixture'); }",
		"import { Pool } from 'pg'; class Hidden extends Pool {} export function openDatabase(): Hidden { return new Hidden(); }",
		"/// <reference lib=\"dom\" />\nexport function openDatabase(): Document { throw new Error('fixture'); }",
		"/// <reference lib=\"dom\" />\nexport function openDatabase(): CSSStyleDeclaration { throw new Error('fixture'); }",
	]) expect((await boundary(leak, file)).some((m) => m.ruleId === 'agora/public-types'), leak).toBe(true);
}, 120_000);

test('removing either boundary rule makes its denial assertion turn red', async () => {
	for (const [rule, file, code] of [
		['agora/import-boundary', 'packages/client-core/src/model.ts', readFileSync(path.join(root, 'packages/client-core/src/model.ts'), 'utf8') + "\nimport type { Database } from '@agora/storage'; export type Leak = keyof Database;"],
		['agora/public-types', 'packages/storage/src/database.ts', readFileSync(path.join(root, 'packages/storage/src/database.ts'), 'utf8').replace('export interface Database {', 'export interface Database { readonly leakedPool?: Pool;')],
	] as const) {
		expect((await boundary(code, file)).some((m) => m.ruleId === rule)).toBe(true);
		const disabled = new ESLint({ cwd: root, ignore: false, overrideConfig: [{ rules: { [rule]: 'off' } }] });
		const messages = await lintMessages(code, file, disabled);
		expect(messages.filter((m) => m.severity === 2)).toEqual([]);
		expect(() => { expect(messages.some((m) => m.ruleId === rule)).toBe(true); }).toThrow('expected false to be true');
	}
}, 120_000);

function compile(code: string, file: string, widenExports = false): ts.Diagnostic[] {
	const filename = path.join(root, file);
	const options: ts.CompilerOptions = { target: ts.ScriptTarget.ES2024, lib: ['lib.es2024.d.ts'], types: [], module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, noEmit: true, skipLibCheck: true, allowImportingTsExtensions: true };
	const host = ts.createCompilerHost(options), read = host.getSourceFile.bind(host), readText = host.readFile.bind(host);
	if (widenExports) host.readFile = (name) => name === path.join(root, 'packages/client-core/package.json') ? JSON.stringify({ name: '@agora/client-core', type: 'module', exports: { '.': './src/index.ts', './src/*': './src/*' } }) : readText(name);
	host.getSourceFile = (name, version, ...args) => name === filename ? ts.createSourceFile(name, code, version, true) : read(name, version, ...args);
	return [...ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host))];
}
test('export maps reject existing private files and the portable compile lane has no DOM or Node globals', () => {
	const valid = compile("import type { ClientState } from '@agora/client-core'; export let state: ClientState;", 'packages/client-core/negative.ts');
	expect(valid.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
	for (const [module, source, context] of [
		['@agora/client-core/src/model.ts', 'packages/client-core/src/model.ts', 'packages/client-core/negative.ts'],
		['@agora/domain/src/index.ts', 'packages/domain/src/index.ts', 'packages/domain/negative.ts'],
		['@agora/contracts/src/index.ts', 'contracts/src/index.ts', 'contracts/negative.ts'],
		['@agora/storage/src/database.ts', 'packages/storage/src/database.ts', 'packages/storage/negative.ts'],
		['@agora/center', 'apps/center/src/app.ts', 'apps/center/negative.ts'],
	] as const) {
		expect(existsSync(path.join(root, source))).toBe(true);
		expect(compile(`export type Leak = typeof import('${module}');`, context).some((d) => d.code === 2307 && ts.flattenDiagnosticMessageText(d.messageText, '\n').includes(`'${module}'`)), module).toBe(true);
	}
	const widened = compile("export type Leak = typeof import('@agora/client-core/src/model.ts');", 'packages/client-core/negative.ts', true);
	expect(widened.map((d) => d.code)).toEqual([]);
	expect(() => { expect(widened.some((d) => d.code === 2307)).toBe(true); }).toThrow('expected false to be true');
	for (const name of ['Document', 'Window', 'HTMLCanvasElement', 'Request', 'WebSocket', 'Buffer']) expect(compile(`export type Leak = ${name};`, 'packages/client-core/negative.ts').some((d) => d.code === 2304 || d.code === 2591), name).toBe(true);
});
