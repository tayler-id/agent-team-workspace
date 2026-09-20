// Task-local probe: five interleaved equal-input batches, JSON.parse plus pinned Ajv validation.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd(), parent = path.join(root, '.scratch/sync-perf-parent');
const out = path.join(root, 'evidence/U01a/agora-s1-isolate-client-core/1-contracts');
const run = (command, args, cwd = root) => {
  const start = performance.now();
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command}: ${result.stdout}\n${result.stderr}`);
  return { output: result.stdout, ms: performance.now() - start };
};
const probe = `
import { readFileSync } from 'node:fs';
import { createWireValidator } from './contracts/src/index.ts';
const values = JSON.parse(readFileSync('contracts/fixtures/vectors.json')).vectors;
const report = JSON.parse(values.find(v => v.component === 'CliReport' && v.expect === 'accept').wire);
report.diagnostics = Array.from({length:32}, () => ({reason_code:'blocked_prerequisite',message:'x'.repeat(4096)}));
const wire = JSON.stringify(report), validator = createWireValidator();
if (!validator.validate('CliReport', report).ok) throw Error('invalid performance fixture');
const samples=[];
for(let i=0;i<22000;i++) { const start=performance.now(); if(!validator.validate('CliReport',JSON.parse(wire)).ok) throw Error('rejected'); if(i>=2000) samples.push(performance.now()-start); }
process.stdout.write(JSON.stringify({bytes:Buffer.byteLength(wire),samples}));`;
mkdirSync(out, { recursive: true });
run('git', ['worktree', 'add', '--detach', parent, '606cba2']);
try {
  const install = run('pnpm', ['install', '--frozen-lockfile'], parent);
  const batches = [];
  for (let i = 0; i < 5; i++) for (const [label, cwd] of [['parent', parent], ['head', root]]) {
    const result = JSON.parse(run(process.execPath, ['--input-type=module', '-e', probe], cwd).output);
    batches.push({ batch: i + 1, label, ...result });
  }
  const p95 = values => values.sort((a,b) => a-b)[Math.ceil(values.length*0.95)-1];
  const summary = Object.fromEntries(['parent','head'].map(label => [label, p95(batches.filter(b => b.label === label).flatMap(b => b.samples))]));
  const result = { parent: run('git',['rev-parse','HEAD'],parent).output.trim(), head: run('git',['rev-parse','HEAD']).output.trim(), node: process.version, host: `${process.platform}-${process.arch}`, fixture: 'CliReport, 32 equal diagnostics; not a production command', bytes: batches[0].bytes, samples_per_revision:100000, warmup_per_batch:2000, parent_clean_install_ms:install.ms, p95_ms:summary, ratio:summary.head/summary.parent, outcome:summary.head<=5 && summary.head/summary.parent<=1.1?'pass':'fail', batches:batches.map(b => ({batch:b.batch,label:b.label,p95_ms:p95(b.samples)})) };
  writeFileSync(path.join(out,'performance.json'), JSON.stringify(result,null,2)+'\n');
  process.stdout.write(JSON.stringify(result)+'\n');
} finally { run('git',['worktree','remove','--force',parent]); }
