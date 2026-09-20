import { spawnSync } from 'node:child_process';
import { expect, test } from 'vitest';

function probe(body: string): void {
	const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import assert from 'node:assert/strict'; import * as r from './scripts/foundation-replay.mjs'; ${body}`], { encoding: 'utf8', timeout: 120_000 });
	expect(result.status, result.stderr).toBe(0);
}
test('lane 9 disables a real guard, detects always-red and stale negatives, and preserves source', () => {
	probe(`const source=r.git('hash-object','scripts/foundation-policy.mjs'); const g=r.guard(r.git('rev-parse','HEAD'));
	assert.deepEqual(r.compareGuard(JSON.stringify(g),g),[]);
	assert.deepEqual(r.compareGuard(JSON.stringify({...g,normal:g.weakened}),g),['guard_invalid']);
	assert.deepEqual(r.compareGuard(JSON.stringify({...g,head:'a'.repeat(40)}),g),['guard_replay_mismatch']);
	assert.deepEqual(r.compareGuard('missing',g),['guard_missing_or_malformed']);
	assert.equal(r.git('hash-object','scripts/foundation-policy.mjs'),source);`);
}, 120_000);
test('receipts reject infrastructure reds, duplicate subjects, skipped green and arbitrary exit prose', () => {
	probe(`assert.throws(()=>r.receipt('observed_exit: 1\\n\\n{"success":false}','red'));
	assert.throws(()=>r.assertions({numTotalTests:2,testResults:[{assertionResults:[{fullName:'x'},{fullName:'x'}]}]}));
	assert.equal(r.behavior([{subject:'FG01.red-required',status:'failed',cause:'SyntaxError: missing module'}],true),false);
	assert.equal(r.behavior([{subject:'baseline admission driver accepts a complete task',status:'passed',cause:''},{subject:'FG01.red-required',status:'pending',cause:''}],false),false);`);
});
test('owned SwiftPM locks are removed without deleting adjacent files', () => {
	probe(`const fs=await import('node:fs');const os=await import('node:os');const path=await import('node:path');let lock,other;
	try { r.withCopy(r.git('rev-parse','HEAD'),copy=>{lock=path.join(os.tmpdir(),copy.replaceAll('/','_')+'_contracts_swift_.build.lock');other=lock+'.unrelated';fs.writeFileSync(lock,'owned');fs.writeFileSync(other,'preserve');});
	assert.equal(fs.existsSync(lock),false,'owned SwiftPM lock removed');assert.equal(fs.readFileSync(other,'utf8'),'preserve'); }
	finally {if(lock)fs.rmSync(lock,{force:true});if(other)fs.rmSync(other,{force:true});}`);
}, 120_000);
test('public usage failures have structured output and exit 64', () => {
	const result = spawnSync(process.execPath, ['scripts/foundation.mjs', '--scope', 'unknown'], { encoding: 'utf8' });
	expect(result.status).toBe(64);
	expect(JSON.parse(result.stdout)).toMatchObject({ outcome: 'usage_error', denials: ['usage_error'] });
});
