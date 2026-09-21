import { ESLint } from 'eslint';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const engine = new ESLint({ cwd: root, ignore: false });
const boundary = async (code: string, file: string) => (await engine.lintText(code, { filePath: path.join(root, file) })).flatMap((r) => r.messages).filter((m) => m.ruleId?.startsWith('agora/'));
const forms = [(m: string) => `import { x } from '${m}'; export const leak: unknown = x;`, (m: string) => `import type { X } from '${m}'; export type Leak = X;`, (m: string) => `export async function leak(): Promise<unknown> { return import('${m}'); }`];

test('web-framework rejects server/domain/storage/provider/apps imports and unrestricted browser globals', async () => {
	const file = 'packages/web-framework/src/client.ts';
	expect(await boundary('export const ok = 1;\n', file)).toEqual([]);
	for (const module of ['@agora/domain', '@agora/storage', '@agora/center', 'hono', 'pg', 'openai', 'apps/web/src/main.tsx']) {
		for (const form of forms) expect((await boundary(form(module), file)).some((m) => m.ruleId === 'agora/import-boundary'), module).toBe(true);
	}
	for (const code of ['export const leak: unknown = window;', 'export const leak: unknown = fetch;', 'export const leak: unknown = localStorage;']) {
		expect((await boundary(code, file)).some((m) => m.ruleId === 'agora/import-boundary'), code).toBe(true);
	}
}, 60_000);

test('framework cannot reverse-import the host; export map hides private paths; barrel keeps named commands only', async () => {
	const file = 'packages/web-framework/src/index.ts';
	for (const module of ['../../apps/web/src/host/environment.ts', '@agora/web']) {
		expect((await boundary(`import type { X } from '${module}'; export type Leak = X;`, file)).some((m) => m.ruleId === 'agora/import-boundary'), module).toBe(true);
	}
	const options: ts.CompilerOptions = { target: ts.ScriptTarget.ES2024, lib: ['lib.es2024.d.ts', 'lib.dom.d.ts'], types: [], module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, noEmit: true, skipLibCheck: true, allowImportingTsExtensions: true, jsx: ts.JsxEmit.ReactJSX };
	const host = ts.createCompilerHost(options), filename = path.join(root, 'packages/web-framework/negative.ts');
	const code = "export type Leak = typeof import('@agora/web-framework/src/client.ts');", read = host.getSourceFile.bind(host);
	host.getSourceFile = (name, version, ...args) => name === filename ? ts.createSourceFile(name, code, version, true) : read(name, version, ...args);
	expect([...ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host))].some((d) => d.code === 2307)).toBe(true);
	expect(existsSync(path.join(root, 'packages/web-framework/src/client.ts'))).toBe(true);
	const barrel = readFileSync(path.join(root, 'packages/web-framework/src/index.ts'), 'utf8');
	expect(barrel).toMatch(/createRoomClient/);
	expect(barrel).toMatch(/useSetDraft/);
	expect(barrel).toMatch(/EnvironmentPort/);
	expect(barrel.includes('dispatch')).toBe(false);
}, 60_000);
