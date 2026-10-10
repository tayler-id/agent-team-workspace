// @vitest-environment node
// R18 caps initial compressed JavaScript at 350 KiB. The contract names no codec, so the built room must fit under
// the cap with both gzip and brotli; passing only the friendlier codec would silently weaken it.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { afterAll, beforeAll, expect, test } from 'vitest';

const app = resolve(import.meta.dirname, '..');
const out = resolve(app, `../../.scratch/initial-js-budget-${process.pid}`);
const BUDGET_BYTES = 350 * 1024;

interface Measurement { files: string[]; raw: number; gzip: number; brotli: number }

// Scripts and modulepreload links in the built index are the JavaScript the browser fetches before first render.
function measure(dist: string): Measurement {
	const html = readFileSync(`${dist}/index.html`, 'utf8');
	const refs = [...html.matchAll(/<(?:script\b[^>]*\bsrc|link\b[^>]*\bhref)="\/(assets\/[^"]+\.js)"/g)].map((match) => match[1] as string);
	const files = [...new Set(refs)];
	const bytes = files.map((file) => readFileSync(`${dist}/${file}`));
	const sum = (sizes: number[]): number => sizes.reduce((total, size) => total + size, 0);
	return {
		files,
		raw: sum(bytes.map((buffer) => buffer.length)),
		gzip: sum(bytes.map((buffer) => gzipSync(buffer, { level: 9 }).length)),
		brotli: sum(bytes.map((buffer) => brotliCompressSync(buffer, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length)),
	};
}

function overBudget(measured: Measurement, limit: number): string[] {
	return (['gzip', 'brotli'] as const).filter((codec) => measured[codec] > limit).map((codec) => `${codec} ${measured[codec]} > ${limit}`);
}

let measured: Measurement;

beforeAll(() => {
	mkdirSync(out, { recursive: true });
	const built = spawnSync(process.execPath, [resolve(app, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', `${out}/dist`, '--emptyOutDir', '--logLevel', 'error'], { cwd: app, encoding: 'utf8', timeout: 120_000, env: { ...process.env, NODE_ENV: 'production' } });
	expect(built.status, built.stderr.slice(0, 2000)).toBe(0);
	measured = measure(`${out}/dist`);
	if (process.env.AGORA_JS_BUDGET_RECORD) writeFileSync(process.env.AGORA_JS_BUDGET_RECORD, `${JSON.stringify({ budgetBytes: BUDGET_BYTES, ...measured }, null, '\t')}\n`);
}, 180_000);
afterAll(() => { rmSync(out, { recursive: true, force: true }); });

test('the built index references initial JavaScript, including the entry module', () => {
	expect(measured.files.length).toBeGreaterThan(0);
	expect(measured.raw).toBeGreaterThan(0);
	expect(measured.gzip).toBeLessThan(measured.raw);
});

test('initial JavaScript stays within 350 KiB under both gzip and brotli', () => {
	expect(overBudget(measured, BUDGET_BYTES)).toEqual([]);
});

test('the budget predicate names each codec over a below-measured limit', () => {
	const limit = Math.min(measured.gzip, measured.brotli) - 1;
	expect(overBudget(measured, limit)).toEqual([`gzip ${measured.gzip} > ${limit}`, `brotli ${measured.brotli} > ${limit}`]);
});
