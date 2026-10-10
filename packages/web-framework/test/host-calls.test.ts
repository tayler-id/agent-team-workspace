// U22.B01 lane 7: a malformed RoomTransport or EnvironmentPort call is rejected by the compiler, not at runtime.
import path from 'node:path';
import ts from 'typescript';
import { expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const options: ts.CompilerOptions = { target: ts.ScriptTarget.ES2024, lib: ['lib.es2024.d.ts', 'lib.dom.d.ts'], types: [], module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, noEmit: true, skipLibCheck: true, allowImportingTsExtensions: true, jsx: ts.JsxEmit.ReactJSX };
function diagnose(code: string, override?: { readonly file: string; readonly replace: (text: string) => string }): string[] {
	const host = ts.createCompilerHost(options), filename = path.join(root, 'packages/web-framework/negative.ts'), read = host.getSourceFile.bind(host);
	host.getSourceFile = (name, version, ...args) => {
		if (name === filename) return ts.createSourceFile(name, code, version, true);
		const file = read(name, version, ...args);
		return override && name.endsWith(override.file) && file ? ts.createSourceFile(name, override.replace(file.text), version, true) : file;
	};
	return ts.getPreEmitDiagnostics(ts.createProgram([filename], options, host)).map((d) => `${d.code}`);
}
const call = (statement: string): string => `import type { EnvironmentPort, RoomTransport } from './src/index.ts';\ndeclare const t: RoomTransport;\ndeclare const e: EnvironmentPort;\n${statement}\n`;
const malformed = ['t.submit(1, "d", "x");', 't.submit("c", "d");', 't.markSeen(7);', 't.saveDraft("s");', 'e.digestText(42);', 'e.defer(() => undefined);', 'e.subscribeMediaQuery("q", 5);'];

test('lane 7: malformed RoomTransport and EnvironmentPort calls fail to compile while the well-formed calls do not', () => {
	expect(diagnose(call('t.submit("c", "d", "x"); t.markSeen("1"); t.saveDraft("s", "x"); void e.digestText("x"); e.defer(() => undefined, 0);'))).toEqual([]);
	for (const statement of malformed) expect(diagnose(call(statement)), statement).not.toEqual([]);
}, 60_000);

test('lane 7 counterfactual: widening submit to accept anything makes its compile negative stop rejecting', () => {
	const widened = { file: 'web-framework/src/environment.ts', replace: (text: string) => text.replace('readonly submit: (commandId: string, requestDigest: string, text: string) => void;', 'readonly submit: (commandId: any, requestDigest: any, text?: any) => void;') };
	expect(diagnose(call('t.submit(1, "d", "x");'))).not.toEqual([]);
	expect(diagnose(call('t.submit(1, "d", "x");'), widened)).toEqual([]);
}, 60_000);

