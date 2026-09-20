# U01b.B01 task receipt

## Subject and authority

The reviewed baseline is qualified local main `421f572`. The task's callable test-only red baseline is `ab6a1832da47782ddad69e2ca80512bb4d24ed24`. Current code subject is `2d93d40c911ec4f73cfc32705263ba31fc0c684b`. This is task-local, owner-attested fixture evidence, not U01b qualification, trusted CI, a general signed validator or permission for product/model work. Independent exact-head code and documentation review remains with Firstmate.

## Predeclared performance experiment

Before measurement: use five interleaved baseline/head batches, 20 samples per revision per batch. Compare the unchanged existing public health/policy fixture launch plus its six literal HTTP assertions using `node scripts/with-test-postgres.mjs node scripts/probe-center.mjs --json`. This measures existing host/fixture cost; the new project lifecycle does not exist on main, so no ratio between unlike capabilities is claimed. Fail the equivalent baseline/head p95 ratio above 1.10.

Separately, in every batch start 20 fresh instances of each new fixture through the public CLI, verify the literal effect, re-read evidence and stop by handle. This gives 100 startup/scenario/evidence/stop observations per application. Require every exit/report pass and every runtime root removed. New fixture startup must be below 60 seconds. The later 10-MiB general evidence-finalization budget belongs to U01b.B02 and is not claimed here. Record all samples, including any failures; do not retry away failures. Warm each equivalent command once before measurement. Use a uniquely owned temp root and baseline worktree; preserve their ownership and cleanup in the report. Timings use Python's monotonic `perf_counter_ns`, milliseconds and nearest-rank p95.

The following is the measurement driver, executed from the repository root with ordinary Node 24 and the locked Python environment on PATH. It is retained here rather than a second independently authored evidence script.

```python
from pathlib import Path
import json, math, os, shutil, subprocess, tempfile, time, uuid
root = Path.cwd()
output = root / 'evidence/U01b/agora-s1-isolate-development/performance.json'
assert not output.exists()
base = root / '.scratch/u01b-performance-parent'
tmp = Path(tempfile.mkdtemp(prefix='agora-u01b-perf-', dir='/tmp'))
env = {k:v for k,v in os.environ.items() if k not in ('GH_TOKEN','GITHUB_TOKEN')}
env['TMPDIR'] = str(tmp)
rows = []
report = {'baseline':'421f572','head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'temp_root':str(tmp),'baseline_worktree':str(base),'samples':rows,'outcome':'running'}
def flush(): output.write_text(json.dumps(report, indent=2))
def run(argv, cwd=root, label='setup', batch=-1):
    started = time.perf_counter_ns()
    r = subprocess.run(argv,cwd=cwd,env=env,capture_output=True,text=True,timeout=120)
    row = {'label':label,'batch':batch,'argv':argv,'cwd':str(cwd),'exit':r.returncode,'ms':(time.perf_counter_ns()-started)/1000000,'stdout':r.stdout,'stderr':r.stderr}
    rows.append(row)
    assert r.returncode == 0, row
    return r.stdout
probe = ['node','scripts/with-test-postgres.mjs','node','scripts/probe-center.mjs','--json']
def project(fixture, *args):
    return ['node','scripts/project.mjs','project',*args,'--fixture',fixture,'--json']
def percentile(values): return sorted(values)[math.ceil(len(values)*0.95)-1]
try:
    run(['git','worktree','add','--detach',str(base),'421f572'])
    run(['pnpm','install','--frozen-lockfile','--prefer-offline'],base)
    run(probe,base,'warm-parent'); run(probe,root,'warm-head')
    for batch in range(5):
        for name,cwd in [('parent',base),('head',root)]:
            for sample in range(20):
                observed = json.loads(run(probe,cwd,name,batch))
                assert observed['outcome']=='pass' and len(observed['results'])==6
        for fixture in ['agora','python']:
            for sample in range(20):
                identity = str(uuid.uuid4())
                s = json.loads(run(project(fixture,'start','--profile','verify','--instance',identity),label=fixture+'-start',batch=batch))
                try:
                    assert s['outcome']=='pass'
                    out = '.scratch/performance-artifacts/'+identity
                    for verb,extra in [('verify',['--scenario','policy','--artifacts',out]),('evidence',[])]:
                        v=json.loads(run(project(fixture,verb,'--instance',identity,*extra),label=fixture+'-'+verb,batch=batch)); assert v['outcome']=='pass'
                finally:
                    run(project(fixture,'stop','--instance',identity,'--handle',s['instance']['cleanup_handle']),label=fixture+'-stop',batch=batch)
                assert not Path(s['instance']['root']).exists()
        flush()
    metrics = {name:percentile([r['ms'] for r in rows if r['label']==name]) for name in ['parent','head','agora-start','python-start','agora-verify','python-verify','agora-evidence','python-evidence','agora-stop','python-stop']}
    metrics['equivalent_ratio']=metrics['head']/metrics['parent']; report['p95_ms']=metrics
    assert metrics['equivalent_ratio']<=1.10 and max(metrics['agora-start'],metrics['python-start'])<60000
    report['outcome']='pass'
finally:
    if base.exists(): run(['git','worktree','remove','--force',str(base)])
    report['remaining_owned_temp_entries']=[p.name for p in tmp.iterdir()]
    assert not report['remaining_owned_temp_entries'], report['remaining_owned_temp_entries']
    tmp.rmdir(); report['cleanup']='removed'; flush()
```

## Observed performance and cleanup correction

[The raw 1,004 setup/warm/measurement observations](performance.json) are unchanged. All 1,000 measured commands exited zero, including 100 complete owned lifecycles per fixture. The driver then found a `node-compile-cache` directory in its invocation-owned temp root, so its overly broad empty-directory assertion failed. [The original failure](performance-run.log) remains. No measurement was repeated. [Separate finalization](performance-finalization.json) hashes the original samples, computes nearest-rank p95 from them and proves removal of only that owned cache and the baseline worktree.

Equivalent legacy fixture p95: parent 1,004.75 ms, head 1,038.53 ms, ratio 1.0336, within 10%. New Agora startup p95: 1,145.29 ms; Python: 486.84 ms, both below 60 seconds. Scenario p95: 304.66 / 301.31 ms. Local receipt re-read p95: 272.42 / 269.71 ms. These last values are not the later general 10-MiB evidence validator. Host: macOS arm64, Node 24.16.0, PostgreSQL 18.4, Swift 6.3.3, Python 3.14.5. No other target is qualified.

## Test-first and public proof

[red.log](red.log) and [green.log](green.log) are the existing recorder's exact-parent/head receipts, with the same test patch and meaningful assertion causes. The baseline doctor succeeds before the scenario inventory fails on `unavailable` versus `pass`. Five native tests pass at the head. [Guard negatives](guard-negatives.json) retain the normal exit 0 and isolated weakened exit 1 with `Missing expected exception`. [The feature map](feature-map.json) and [boundary results](boundaries.json) accompany them.

`skill-attempt-3.log` drives every shell block of the committed skill literally at `2d93d40c911ec4f73cfc32705263ba31fc0c684b`. Its public commands and artifacts are in `live-c5e5b56b-78e2-4759-a199-0e908c690935/`. Lanes contain all five native assertions, not model claims. Doctor, contracts, independent Swift conformance, replay, boundaries, all unit/real PostgreSQL tests, public HTTP probes and repeated migration pass. Cleanup stops A, proves B still usable, stops B/Python, re-reads retained evidence and removes only the owned tool scratch. `skill-attempt-2.log` is the preceding successful subject, not a substitute for the current head.

## Failed attempts and repairs

`initial-red.log` includes a probe syntax mistake and is not accepted as red; `assertion-red.log` fixes the test before implementation. Generation first refused an unbounded integer, typed compilation caught missing JSDoc in the fixture composition, and the docs corpus required its new 26-page expectation. All failed logs remain beside their corrected runs.

`skill-attempt-1.log` exposed a real partial-JSON publication race during a clean recorder run. Its failed green and startup response remain under `live-af160f15-db9d-47d9-8093-bb3ac9c85c03/`. The failed start was not in the test's returned-handle list, leaving one owned host/database after its recorder worktree disappeared. The retained recovery receipt binds that exact process command and failed instance. SIGTERM closed the host but its deleted working directory prevented the database child command; `orphan-database-cleanup.log` records exact-owned-directory cleanup, not a global kill.

The fix publishes registry/receipt bytes by atomic rename, retains `owner.json` inside each live root and runs database cleanup from that still-existing root. A deterministic partial-write observer now proves readers see the complete previous JSON before publication. The skill also distinguishes leftover Swift tool scratch from runtime leaks. `registered-argv-red.log` proves the concrete lifecycle argv registration gap before its correction; the final manifest and start additionally bind concrete commands and observed HTTP readiness.

## Security and retained ownership

Risk floor is R2: verification policy, wire contracts and a pinned independent Python validator change. This is a trusted-owner development fixture, not a hostile-code container, production auth, an S3 compatibility claim or trusted reporting. No model, forge, publication, worker or backup capability was enabled. The pnpm audit in the skill reports zero advisories; no Python vulnerability-audit result is claimed.

[Live security probes](security-live.json) show both servers reject a request without the fixture handle with 403, do not inherit synthetic secret/database environment sentinels, refuse a symlink-escaping artifact directory and remove their original process/root on owned stop. Native lanes additionally refuse a foreign cleanup handle, stale head/instance receipt, changed bytes, missing artifacts, invalid report/exit pairs, malformed inventory, missing runner, changed skill and deleted coverage. These are actual non-pass paths. Local owners can still modify the checker; independent review is necessary, and B02/B03 remain separate.

## Living documentation and review boundary

Both audience tracks have six-section pages and meaningful ordered-flow visuals. The atlas remains In progress and no milestone changed status; only progress data changed, with replacement visual-system ownership left to the design team. The real browser inspection retained desktop and exact CDP-emulated 390x844 screenshots, readable flows, no horizontal overflow, zero animations and a keyboard skip-link-to-main check. The earlier 500-pixel window-floor capture remains labelled `docs-narrow-window.png`, not silently passed as 390. This is an accessibility-tree/keyboard inspection, not an OS screen-reader or product-browser qualification. The task-owned browser and documentation server were stopped.

R11: the 23 authored repository files total 743 added/deleted lines including blanks; this receipt adds one authored file, remaining below 1,000 lines and 25 files. Generated consumers and the generated atlas mirror are counted separately in `size-counts.json`. The target 200/eight threshold is exceeded because the single B01 contract necessarily couples both fixture implementations, lifecycle ownership, shared schemas/consumers, guards, feature map and both documentation tracks. No hard-limit exception is needed or claimed. Independent exact-head review is pending; this author cannot supply it or claim task completion.
