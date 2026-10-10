import { ESLint } from 'eslint';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const engine = new ESLint({ cwd: root, ignore: false });
const boundary = async (code: string, file: string) => (await engine.lintText(code, { filePath: path.join(root, file) })).flatMap((r) => r.messages).filter((m) => m.ruleId?.startsWith('agora/'));
const forms = [(m: string) => `import { x } from '${m}'; export const leak: unknown = x;`, (m: string) => `import type { X } from '${m}'; export type Leak = X;`, (m: string) => `export async function leak(): Promise<unknown> { return import('${m}'); }`];
const options: ts.CompilerOptions = { target: ts.ScriptTarget.ES2024, lib: ['lib.es2024.d.ts', 'lib.dom.d.ts'], types: [], module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, noEmit: true, skipLibCheck: true, allowImportingTsExtensions: true, jsx: ts.JsxEmit.ReactJSX };
function diagnose(code: string, override?: { readonly file: string; readonly text: string }): string[] {
	const host = ts.createCompilerHost(options), filename = path.join(root, 'packages/web-framework/negative.ts'), read = host.getSourceFile.bind(host);
	host.getSourceFile = (name, version, ...args) => {
		if (name === filename) return ts.createSourceFile(name, code, version, true);
		return override && name.endsWith(override.file) ? ts.createSourceFile(name, override.text, version, true) : read(name, version, ...args);
	};
	return ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host)).map((d) => `${d.code}`);
}

test('web-framework rejects server/domain/storage/provider/apps imports and unrestricted browser globals', async () => {
	const file = 'packages/web-framework/src/client.ts';
	expect(await boundary('export const ok = 1;\n', file)).toEqual([]);
	for (const module of ['@agora/domain', '@agora/storage', '@agora/center', 'hono', 'pg', 'openai', 'apps/web/src/main.tsx']) {
		for (const form of forms) expect((await boundary(form(module), file)).some((m) => m.ruleId === 'agora/import-boundary'), module).toBe(true);
	}
	for (const code of ['export const leak: unknown = window;', 'export const leak: unknown = fetch;', 'export const leak: unknown = localStorage;']) {
		expect((await boundary(code, file)).some((m) => m.ruleId === 'agora/renderer-footgun'), code).toBe(true);
	}
}, 60_000);

test('web-framework may implement named hooks with raw React effects, unlike a plain renderer owner', async () => {
	const file = 'packages/web-framework/src/client.ts';
	expect(await boundary("import { useEffect } from 'react'; export function useOk(): void { useEffect(() => undefined, []); }\n", file)).toEqual([]);
	const other = 'apps/web/src/reserved-owners.ts';
	expect((await boundary("import { useEffect } from 'react'; export function useOk(): void { useEffect(() => undefined, []); }\n", other)).some((m) => m.ruleId === 'agora/renderer-footgun')).toBe(true);
}, 60_000);

test('framework cannot reverse-import the host; export map hides private paths; barrel keeps named commands only', async () => {
	const file = 'packages/web-framework/src/index.ts';
	for (const module of ['../../apps/web/src/host/environment.ts', '@agora/web']) {
		expect((await boundary(`import type { X } from '${module}'; export type Leak = X;`, file)).some((m) => m.ruleId === 'agora/import-boundary'), module).toBe(true);
	}
	expect(diagnose("export type Leak = typeof import('@agora/web-framework/src/client.ts');")).toContain('2307');
	expect(existsSync(path.join(root, 'packages/web-framework/src/client.ts'))).toBe(true);
	const barrel = readFileSync(path.join(root, 'packages/web-framework/src/index.ts'), 'utf8');
	expect(barrel).toMatch(/createRoomClient/);
	expect(barrel).toMatch(/useSetDraft/);
	expect(barrel).toMatch(/EnvironmentPort/);
	expect(barrel.includes('dispatch')).toBe(false);
}, 60_000);

// U22.B01 lane 7: a malformed RoomTransport or EnvironmentPort call is rejected by the compiler, not at runtime.
const call = (statement: string): string => `import type { EnvironmentPort, RoomTransport } from './src/index.ts';\ndeclare const t: RoomTransport;\ndeclare const e: EnvironmentPort;\n${statement}\n`;
const malformed = ['t.submit(1, "d", "x");', 't.submit("c", "d");', 't.markSeen(7);', 't.saveDraft("s");', 'e.digestText(42);', 'e.defer(() => undefined);', 'e.subscribeMediaQuery("q", 5);'];

test('lane 7: malformed RoomTransport and EnvironmentPort calls fail to compile while the well-formed calls do not', () => {
	expect(diagnose(call('t.submit("c", "d", "x"); t.markSeen("1"); t.saveDraft("s", "x"); void e.digestText("x"); e.defer(() => undefined, 0);'))).toEqual([]);
	for (const statement of malformed) expect(diagnose(call(statement)), statement).not.toEqual([]);
}, 60_000);

test('lane 7 counterfactual: widening submit to accept anything makes its compile negative stop rejecting', () => {
	expect(diagnose(call('t.submit(1, "d", "x");'))).not.toEqual([]);
	const source = readFileSync(path.join(root, 'packages/web-framework/src/environment.ts'), 'utf8');
	const text = source.replace(/readonly submit: \([^)]*\) => void;/, 'readonly submit: (commandId: any, requestDigest: any, text?: any) => void;');
	expect(text, 'the widening mutant left environment.ts unchanged').not.toBe(source);
	expect(diagnose(call('t.submit(1, "d", "x");'), { file: 'web-framework/src/environment.ts', text })).toEqual([]);
}, 60_000);
