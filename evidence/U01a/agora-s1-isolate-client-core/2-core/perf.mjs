// Task-local absolute replay budget: the parent harness has no equivalent synchronization behavior.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const root=process.cwd(), parent=path.join(root,'.scratch/agora-sync-perf-parent');
const run=(command,args,cwd=root)=>{const result=spawnSync(command,args,{cwd,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);return result.stdout;};
const probe=`
import {initialState,synchronize} from './packages/client-core/src/index.ts';
const message=n=>({id:String(n),createdSeq:String(n),revision:'1',content:{tag:'visible',body:'hello'}});
const started=performance.now();
let state=synchronize(initialState(),{type:'snapshot',streamId:'room',cursor:'50000',lastSeen:'0',messages:Array.from({length:50000},(_,i)=>message(i+1)),runs:[]}).state;
const snapshot_ms=performance.now()-started;
const begin=performance.now(),latencies=[];
for(let i=50001;i<=51000;i++){const at=performance.now();state=synchronize(state,{type:'event',streamId:'room',seq:String(i),change:{type:'message',message:message(i)}}).state;latencies.push(performance.now()-at);}
const replay_ms=performance.now()-begin;
global.gc();latencies.sort((a,b)=>a-b);
process.stdout.write(JSON.stringify({snapshot_ms,replay_ms,input_p95_ms:latencies[949],heap_bytes:process.memoryUsage().heapUsed,cursor:state.rooms[0]?.cursor??null,unread:state.rooms[0]?.unread??null}));`;
run('git',['worktree','add','--detach',parent,'a449e6a']);
try{
  const batches=[];
  for(let i=0;i<5;i++)for(const [label,cwd]of [['parent',parent],['head',root]])batches.push({batch:i+1,label,...JSON.parse(run(process.execPath,['--expose-gc','--input-type=module','-e',probe],cwd))});
  const heads=batches.filter(b=>b.label==='head');
  const report={parent:run('git',['rev-parse','HEAD'],parent).trim(),head:run('git',['rev-parse','HEAD']).trim(),node:process.version,host:process.platform+'-'+process.arch,fixture:'50000 positions plus 1000 new-message events; only current state retained; explicit GC before heap sample',budget_replay_ms:2000,baseline:'parent empty harness does not implement snapshots or replay; no performance ratio claimed',outcome:heads.every(b=>b.replay_ms<=2000&&b.cursor==='51000'&&b.unread===51000)?'pass':'fail',batches};
  writeFileSync('evidence/U01a/agora-s1-isolate-client-core/2-core/performance.json',JSON.stringify(report,null,2)+'\n');
  process.stdout.write(JSON.stringify(report)+'\n');
}finally{run('git',['worktree','remove','--force',parent]);}
