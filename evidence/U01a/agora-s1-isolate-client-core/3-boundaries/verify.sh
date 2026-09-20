#!/usr/bin/env bash
set -euo pipefail
unset GH_TOKEN GITHUB_TOKEN FIRSTMATE_GH_TOKEN
export PATH=/Users/taylerramsay/.local/node/bin:$PATH
out=evidence/U01a/agora-s1-isolate-client-core/3-boundaries
{
  git rev-parse HEAD HEAD^{tree}
  node --version
  pnpm --version
  swift --version
  pg_ctl --version
  command -v node
} > "$out/subject.log"
node scripts/record-red-green.mjs --parent 24f271f --head HEAD --out "$out" -- pnpm exec vitest run --project unit packages/client-core/test/boundaries.test.ts > "$out/recorder.log" 2>&1
{
  pnpm install --frozen-lockfile
  pnpm check
  node scripts/verify-design.mjs
  node scripts/test-design-checks.mjs
  node .agents/skills/poteto-mode/scripts/check-plan.mjs docs/implementation-plan.md
} > "$out/gates.log" 2>&1
pnpm -s boundaries > "$out/lane-8.stdout.log" 2> "$out/lane-8.stderr.log"
cp .scratch/boundaries.json "$out/lane-8.json"
pnpm -s client:replay -- --json --swift > "$out/lane-7.json" 2> "$out/lane-7.stderr.log"
{
  echo 'Doctor: portable consumers, live PostgreSQL and public probes'
  pnpm contracts:conform -- --json
  node scripts/with-test-postgres.mjs node scripts/probe-center.mjs
  node scripts/with-test-postgres.mjs bash -c 'node packages/storage/src/migrate-cli.ts; node packages/storage/src/migrate-cli.ts'
} > "$out/skill-run.log" 2>&1
pnpm audit --prod --json > "$out/audit.json"
pnpm audit --json > "$out/audit-all.json"
node --input-type=module > "$out/perf.log" 2>&1 <<'NODEPERF'
// Five interleaved equivalent core batches, new boundary-gate cost, and a clean full build at this exact head.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'evidence/U01a/agora-s1-isolate-client-core/3-boundaries');
const parent=mkdtempSync(path.join(root,'.scratch/agora-perf-')),clean=mkdtempSync(path.join(root,'.scratch/agora-clean-'));
const run=(command,args,cwd=root)=>{const start=performance.now(),r=spawnSync(command,args,{cwd,encoding:'utf8'});if(r.status!==0)throw Error(`${command} ${args.join(' ')}: ${r.stdout}\n${r.stderr}`);return{ms:performance.now()-start,stdout:r.stdout,stderr:r.stderr};};
const probe=`import{initialState,synchronize}from './packages/client-core/src/index.ts';
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),streamId=uuid(100000),m=n=>({id:uuid(n),createdSeq:String(n),revision:'1',content:{tag:'visible',body:'hello'}});
let state=synchronize(initialState(),{type:'snapshot',streamId,cursor:'50000',lastSeen:'0',messages:Array.from({length:50000},(_,i)=>m(i+1)),runs:[]}).state;
const start=performance.now(),samples=[];for(let i=50001;i<=51000;i++){const at=performance.now();state=synchronize(state,{type:'event',streamId,seq:String(i),change:{type:'message',message:m(i)}}).state;samples.push(performance.now()-at);}
process.stdout.write(JSON.stringify({replay_ms:performance.now()-start,samples,cursor:state.rooms[0].cursor,unread:state.rooms[0].unread}));`;
const p95=v=>v.sort((a,b)=>a-b)[Math.ceil(v.length*.95)-1];
run('git',['worktree','add','--detach',parent,'24f271f']);
run('git',['worktree','add','--detach',clean,'HEAD']);
try{
  const batches=[];
  for(let i=0;i<5;i++)for(const[label,cwd]of[['parent',parent],['head',root]])batches.push({batch:i+1,label,...JSON.parse(run(process.execPath,['--input-type=module','-e',probe],cwd).stdout)});
  const times=Object.fromEntries(['parent','head'].map(label=>[label,p95(batches.filter(b=>b.label===label).flatMap(b=>b.samples))]));
  const gate=run('pnpm',['-s','boundaries']);
  const install=run('pnpm',['install','--frozen-lockfile'],clean),build=run('pnpm',['check'],clean);
  writeFileSync(path.join(out,'clean-install-build.log'),install.stdout+install.stderr+build.stdout+build.stderr);
  const source=sha=>createHash('sha256').update(run('git',['show',`${sha}:packages/client-core/src/index.ts`]).stdout).digest('hex');
  const result={parent:run('git',['rev-parse','HEAD'],parent).stdout.trim(),head:run('git',['rev-parse','HEAD']).stdout.trim(),node:process.version,host:process.platform+'-'+process.arch,fixture:'same 50000 positions plus 1000 events in five interleaved batches',core_source_sha256:{parent:source('24f271f'),head:source('HEAD')},input_p95_ms:times,ratio:times.head/times.parent,new_boundary_gate_ms:gate.ms,clean_install_ms:install.ms,clean_full_check_ms:build.ms,outcome:times.head/times.parent<=1.1&&batches.every(b=>b.replay_ms<=2000&&b.cursor==='51000'&&b.unread===51000)&&build.ms<300000?'pass':'fail',batches:batches.map(b=>({batch:b.batch,label:b.label,replay_ms:b.replay_ms,input_p95_ms:p95(b.samples)}))};
  writeFileSync(path.join(out,'performance.json'),JSON.stringify(result,null,2)+'\n');
  process.stdout.write(JSON.stringify(result)+'\n');
  process.exitCode=result.outcome==='pass'?0:1;
}finally{
  for(const dir of[parent,clean]){run('git',['worktree','remove','--force',dir]);rmSync(dir,{recursive:true,force:true});for(const file of readdirSync(os.tmpdir()))if(file.includes(path.basename(dir))&&file.endsWith('.lock'))rmSync(path.join(os.tmpdir(),file),{force:true});}
}
NODEPERF
cp agora/feature-map.json "$out/feature-map.json"
shasum -a 256 agora/feature-map.json contracts/generated/manifest.json > "$out/input-digests.log"
git diff --quiet 606cba2 HEAD -- skills skills-lock.json .agents/skills ':(exclude).agents/skills/verify-agora'
git diff --check
{
  echo 'Temporary worktrees:'
  git worktree list --porcelain | grep -E 'agora-red-green|agora-perf-|agora-clean-' || true
  echo 'Owned fixture processes:'
  ps -axo pid=,command= | grep -E '[p]ostgres.*agora-pg-|[n]ode.*apps/center/src/main.ts|[n]ode src/main.ts' || true
  echo 'Temporary directories/Swift locks:'
  find "${TMPDIR:-/tmp}" -maxdepth 1 \( -name 'agora-pg-*' -o -name 'agora-red-*' -o -name 'agora-green-*' -o -name '*agora-red-*.lock' -o -name '*agora-green-*.lock' \) -print
  echo 'Working tree:'
  git status --short
} > "$out/cleanup.log"
