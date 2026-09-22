import { ESLint } from 'eslint';
import path from 'node:path';
import { expect, test } from 'vitest';
import { TEXT_SIZING_ADAPTER, VIRTUALIZER_ADAPTER } from '../../../scripts/boundary-policy.ts';

const root = path.resolve(import.meta.dirname, '../../..');
const engine = new ESLint({ cwd: root, ignore: false });
const agora = async (code: string, file: string, lint = engine) => (await lint.lintText(code, { filePath: path.join(root, file) })).flatMap((r) => r.messages).filter((m) => m.ruleId === 'agora/import-boundary');
const pretext = "import { layout } from '@chenglou/pretext'; export const l = layout;";
const virtual = "import { useVirtualizer } from '@tanstack/react-virtual'; export const u = useVirtualizer;";
const below = ['packages/client-core/src/model.ts', 'packages/domain/src/index.ts', 'contracts/src/index.ts', 'packages/storage/src/index.ts', 'apps/center/src/app.ts'];
// Timeline.tsx is a renderer file that must go through useTimelineVirtualizer.ts (VIRTUALIZER_ADAPTER), not
// import Pretext or react-virtual directly — both adapters are single-file, matching the exact-path check in
// scripts/boundary-policy.ts, not a directory-wide allowance. apps/web/test/sizing.test.ts is denied too, but
// through the separate, stricter isWebTestOrConfig owner (scripts/boundary-policy.ts), whose message never names
// either adapter — it is checked for denial only, not for the adapter-specific message text below.
const renderer = ['apps/web/src/components/Timeline.tsx', 'apps/web/src/rows.ts', 'apps/web/src/host/index.ts', 'apps/web/src/host/geometry.ts'];
const testConfigOwned = ['apps/web/test/sizing.test.ts'];

test('Pretext is importable only from the renderer host adapter and never below the renderer boundary', async () => {
	expect(TEXT_SIZING_ADAPTER).toBe('apps/web/src/host/pretext.ts');
	expect(await agora(pretext, TEXT_SIZING_ADAPTER)).toEqual([]);
	for (const file of [...renderer, ...testConfigOwned, ...below]) expect((await agora(pretext, file)).length, file).toBeGreaterThan(0);
	for (const file of renderer) expect((await agora(pretext, file))[0]?.message, file).toContain(TEXT_SIZING_ADAPTER);
	expect(await agora(`import type { PreparedText } from '@chenglou/pretext'; export type P = PreparedText;`, 'apps/web/src/rows.ts')).not.toEqual([]);
	expect(await agora(`export async function lazy(): Promise<unknown> { return import('@chenglou/pretext'); }`, 'apps/web/src/components/Timeline.tsx')).not.toEqual([]);
}, 120_000);

test('the virtualizer is importable only from useTimelineVirtualizer.ts, rejected everywhere else including Timeline.tsx', async () => {
	expect(VIRTUALIZER_ADAPTER).toBe('apps/web/src/framework/useTimelineVirtualizer.ts');
	expect(await agora(virtual, VIRTUALIZER_ADAPTER)).toEqual([]);
	for (const file of [...renderer, ...testConfigOwned, ...below]) expect((await agora(virtual, file)).length, file).toBeGreaterThan(0);
	for (const file of renderer) expect((await agora(virtual, file))[0]?.message, file).toContain(VIRTUALIZER_ADAPTER);
}, 120_000);

test('removing the rule turns the denial assertions red', async () => {
	const off = new ESLint({ cwd: root, ignore: false, overrideConfig: [{ rules: { 'agora/import-boundary': 'off' } }] });
	const messages = await agora(pretext, 'packages/client-core/src/model.ts', off);
	expect(messages).toEqual([]);
	expect(() => { expect(messages.length).toBeGreaterThan(0); }).toThrow('expected 0 to be greater than 0');
}, 120_000);
