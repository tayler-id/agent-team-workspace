import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

// Every module the real CLI resolves is recorded by a synchronous resolve hook, so the assertion reads what Node
// actually loaded rather than what the source mentions.
const recorder = `import { registerHooks } from 'node:module';
import { appendFileSync } from 'node:fs';
registerHooks({ resolve(specifier, context, next) { const result = next(specifier, context); appendFileSync(process.env.LOADED_LOG, result.url + '\\n'); return result; } });
`;

test('the evidence validator starts without compiling the wire validator', () => {
	const id = randomUUID();
	fs.mkdirSync('.scratch/validator-startup', { recursive: true });
	const hook = path.resolve(`.scratch/validator-startup/${id}.mjs`), log = path.resolve(`.scratch/validator-startup/${id}.log`);
	fs.writeFileSync(hook, recorder);
	try {
		const result = spawnSync(process.execPath, ['--import', hook, 'scripts/validate-evidence.mjs', '--dir', `.scratch/validator-startup/${id}-absent`, '--head', 'h'.repeat(40), '--base', 'b'.repeat(40), '--key', '/dev/null'], { encoding: 'utf8', env: { ...process.env, LOADED_LOG: log } });
		const report = JSON.parse(result.stdout) as { outcome: string; reason_code: string | null };
		// The validator still runs end to end: an absent bundle is refused with its own reason.
		expect(result.status).toBe(1);
		expect(report).toMatchObject({ outcome: 'fail', reason_code: 'missing_proof' });
		const loaded = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean);
		expect(loaded.some((url) => url.endsWith('/scripts/project-primitives.mjs'))).toBe(true);
		expect(loaded.filter((url) => /\/contracts\/|\/node_modules\/ajv|\/project-checks\.mjs$/.test(url))).toEqual([]);
	} finally {
		fs.rmSync(hook, { force: true }); fs.rmSync(log, { force: true });
	}
});
