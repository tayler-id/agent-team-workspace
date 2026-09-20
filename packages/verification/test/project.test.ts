import { spawnSync } from 'node:child_process';
import { expect, test } from 'vitest';

function probe(body: string): void {
	const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
import assert from 'node:assert/strict'; import * as fs from 'node:fs'; import path from 'node:path';
import {randomUUID} from 'node:crypto'; import {spawnSync} from 'node:child_process';
const cli=(...args)=>{const r=spawnSync(process.execPath,['scripts/project.mjs','project',...args,'--json'],{encoding:'utf8',timeout:90000}); assert.equal(r.error,undefined); const v=JSON.parse(r.stdout); assert.equal(r.status,{pass:0,fail:1,blocked:2,unavailable:3,usage_error:64,infrastructure_failure:70}[v.outcome]); return v;};
const pass=(...args)=>{const v=cli(...args); assert.equal(v.outcome,'pass',JSON.stringify(v));return v;};
assert.equal(pass('doctor').command,'doctor');
const inventory=pass('scenarios'); assert.ok(inventory.scenarios.includes('policy'));
${body}`], { encoding: 'utf8', timeout: 300_000 });
	expect(result.status, result.stdout + result.stderr).toBe(0);
}

test('project lane 1 persists literal public effects in Agora and Python', () => {
	probe(`for(const fixture of ['agora','python']) { const id=randomUUID(), dir='.scratch/project-tests/'+id;
const s=pass('start','--profile','verify','--fixture',fixture,'--instance',id);
try {const v=pass('verify','--fixture',fixture,'--scenario','policy','--instance',id,'--artifacts',dir);
assert.ok(v.artifacts.length>0); const e=pass('evidence','--fixture',fixture,'--instance',id); assert.deepEqual(e.artifacts,v.artifacts);
const artifact=JSON.parse(fs.readFileSync(e.artifacts[0].path,'utf8')); assert.equal(artifact.observed[0].decision,'allow'); assert.equal(artifact.observed[1].reason_code,'scope_mismatch'); assert.equal(artifact.persisted.length,2);
} finally {pass('stop','--fixture',fixture,'--instance',id,'--handle',s.instance.cleanup_handle);}
assert.ok(fs.existsSync(dir));pass('evidence','--fixture',fixture,'--instance',id); fs.rmSync(dir,{recursive:true}); }`);
}, 300_000);

test('project lane 2 isolates resources and refuses foreign cleanup', () => {
	probe(`for(const fixture of ['agora','python']) {const ids=[randomUUID(),randomUUID()];const live=[];
try {for(const id of ids) live.push(pass('start','--profile','verify','--fixture',fixture,'--instance',id));
for(const key of ['url','database','object_namespace','pid','cleanup_handle','root']) assert.notEqual(live[0].instance[key],live[1].instance[key],key);
assert.equal(cli('stop','--fixture',fixture,'--instance',ids[0],'--handle',live[1].instance.cleanup_handle).outcome,'fail');
pass('stop','--fixture',fixture,'--instance',ids[0],'--handle',live[0].instance.cleanup_handle);
assert.equal(fs.existsSync(live[0].instance.root),false);assert.equal(fs.existsSync(live[1].instance.root),true);
pass('verify','--fixture',fixture,'--scenario','policy','--instance',ids[1],'--artifacts','.scratch/project-tests/'+ids[1]);
} finally {for(const s of live) {const v=cli('stop','--fixture',fixture,'--instance',s.run_id,'--handle',s.instance.cleanup_handle);assert.equal(v.outcome,'pass');} }
}`);
}, 300_000);

test('project lane 3 rejects unknown scenarios and missing or mismatched artifacts', () => {
	probe(`assert.equal(cli('verify','--scenario','imaginary').outcome,'usage_error');assert.equal(cli('doctor','--wat').outcome,'usage_error');
const id=randomUUID(),dir='.scratch/project-tests/'+id,s=pass('start','--profile','verify','--instance',id);
try {assert.equal(cli('evidence','--instance',id).outcome,'blocked');assert.equal(cli('start','--profile','verify','--instance',id).outcome,'fail');
const v=pass('verify','--scenario','policy','--instance',id,'--artifacts',dir); const file=v.artifacts[0].path, bytes=fs.readFileSync(file);
fs.writeFileSync(file,'{}'); assert.equal(cli('evidence','--instance',id).outcome,'fail');fs.unlinkSync(file);assert.equal(cli('evidence','--instance',id).outcome,'fail');fs.writeFileSync(file,bytes);
const receipt=path.join('.scratch/project/agora',id,'evidence.json'), saved=fs.readFileSync(receipt);const report=JSON.parse(saved);report.versions.code='a'.repeat(40);fs.writeFileSync(receipt,JSON.stringify(report));assert.equal(cli('evidence','--instance',id).outcome,'fail');fs.writeFileSync(receipt,saved);
}finally{pass('stop','--instance',id,'--handle',s.instance.cleanup_handle);}}`);
}, 300_000);

test('project lane 4 invalidates changed instructions and deleted feature coverage', () => {
	probe(`const id=randomUUID(),s=pass('start','--profile','verify','--instance',id),file='agora/feature-map.json',original=fs.readFileSync(file),skill='.agents/skills/verify-agora/SKILL.md',instructions=fs.readFileSync(skill);
try {pass('verify','--scenario','policy','--instance',id,'--artifacts','.scratch/project-tests/'+id);
fs.appendFileSync(skill,'\\nChanged route instructions.\\n');assert.equal(cli('evidence','--instance',id).outcome,'fail');fs.writeFileSync(skill,instructions);
const map=JSON.parse(original);map.features=map.features.filter(x=>x.id!=='project-controls');fs.writeFileSync(file,JSON.stringify(map));assert.equal(cli('verify','--scenario','policy','--instance',id,'--artifacts','.scratch/project-tests/'+id+'-drift').outcome,'fail');
}finally{fs.writeFileSync(file,original);fs.writeFileSync(skill,instructions);pass('stop','--instance',id,'--handle',s.instance.cleanup_handle);}}`);
}, 300_000);
