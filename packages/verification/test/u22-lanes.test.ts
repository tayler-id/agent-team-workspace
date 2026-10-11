import { ESLint } from 'eslint';
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, expect, test } from 'vitest';
import { createRoomClient } from '../../web-framework/src/client.ts';
import { runReplay, type Core } from '../../client-core/test/replay-probe.ts';
import { synchronize, initialState } from '@agora/client-core';

// U22 Client/Host lane driver. Lanes 1, 3, 4, 6 and 9 have no native test of their own, so each records its verdict for
// scripts/project-lanes.mjs. Lanes 2, 5, 7, 8 and 10 are read from the existing tests the runner names. In-memory lint
// text is checked against existing owner files, so nothing is written to the tree.
const root = path.resolve(import.meta.dirname, '../../..');
const component = path.join(root, 'apps/web/src/components/App.tsx'), host = path.join(root, 'apps/web/src/host/live.ts');
const lint = async (code: string, file: string, off = false): Promise<string[]> => {
	const engine = new ESLint({ cwd: root, ignore: false, ...(off ? { overrideConfig: { rules: { 'agora/client-owner': 'off' } } } : {}) });
	return (await engine.lintText(code, { filePath: file })).flatMap((r) => r.messages).filter((m) => m.ruleId?.startsWith('agora/')).map((m) => m.message);
};
const verdicts: Record<number, { outcome: 'pass' | 'unavailable'; detail: string }> = {};
afterAll(() => {
	const file = process.env['AGORA_U22_VERDICTS'];
	if (file) appendFileSync(file, JSON.stringify(verdicts) + '\n');
});

test('lane 1: the Client single writer reproduces the replay result the pure core already proves', () => {
	const trunk = runReplay({ initialState, synchronize } satisfies Core);
	const client = createRoomClient();
	const named = runReplay({ initialState: client.getState, synchronize: (_state, input) => client.apply(input) });
	expect(trunk.failures).toEqual([]);
	expect({ ...named, elapsedMs: 0 }).toEqual({ ...trunk, elapsedMs: 0 });
	expect(named.counts).toMatchObject({ messages: 1300, unique: 1300, duplicates: 0 });
	verdicts[1] = { outcome: 'pass', detail: `${named.counts.delivered} deliveries, ${named.counts.duplicates} duplicates, last acknowledgement ${named.acknowledgements.last}, identical to the core` };
});

const bypass = {
	fetch: 'export async function f(): Promise<Response> { return fetch("/x"); }',
	WebSocket: 'export function w(): WebSocket { return new WebSocket("ws://x"); }',
	document: 'export function d(): Element | null { return document.getElementById("a"); }',
	window: 'export function q(): boolean { return window.matchMedia("(x)").matches; }',
};
test.each([['3', ['fetch', 'WebSocket']], ['4', ['document', 'window']]] as const)('lane %s: %j is rejected in a component and accepted in the Host', async (lane, names) => {
	for (const name of names) {
		expect((await lint(bypass[name], component)).some((m) => m.startsWith(`direct ${name} `)), name).toBe(true);
		expect(await lint(bypass[name], host), name).toEqual([]);
	}
	verdicts[Number(lane)] = { outcome: 'pass', detail: `${names.join(', ')} rejected at the component path, accepted at ${path.relative(root, host)}` };
});

test('lane 6: with the one-writer rule off, the lane 2 duplicate holder is no longer rejected', async () => {
	const code = "import { useState } from 'react';\nimport { useClientSelector } from '@agora/web-framework';\nexport function C(): null { const room = useClientSelector((s) => s.rooms[0]); const [copy] = useState(room); void copy; return null; }\n";
	expect((await lint(code, component)).some((m) => m.includes('useClientSelector'))).toBe(true);
	expect((await lint(code, component, true)).some((m) => m.includes('useClientSelector'))).toBe(false);
	verdicts[6] = { outcome: 'pass', detail: 'the same duplicate holder is rejected with agora/client-owner on and passes with it off' };
});

test('lane 9: a bypassed Client call names its hook, a bypassed Host call is checked for a named EnvironmentPort method', async () => {
	const client = await lint("import { useEnvironment } from '@agora/web-framework';\nexport function C(): null { const { transport } = useEnvironment(); transport.submit('c', 'd', 'x'); return null; }\n", component);
	expect(client.some((m) => m.includes('useRoomCommands'))).toBe(true);
	const environment = readFileSync(path.join(root, 'packages/web-framework/src/environment.ts'), 'utf8');
	const methods = [...(/interface EnvironmentPort \{(.*?)\n\}/s.exec(environment)?.[1] ?? '').matchAll(/readonly (\w+):/g)].flatMap((m) => m[1] ?? []);
	expect(methods).toContain('scheduleFocus');
	const messages = await Promise.all(Object.values(bypass).map((code) => lint(code, component)));
	const unnamed = Object.keys(bypass).filter((_name, i) => !messages[i]?.some((m) => methods.some((method) => new RegExp(`\\b${method}\\b`).test(m))));
	verdicts[9] = unnamed.length
		? { outcome: 'unavailable', detail: `the Client hook is named, but the diagnostic for ${unnamed.join(', ')} names the Host owner path and not a specific Host method` }
		: { outcome: 'pass', detail: 'every Client and Host bypass names its supported hook, command or Host method' };
});
