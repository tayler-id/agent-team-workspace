import subprocess,sys
p='scripts/local-checks.mjs'
orig=open(p).read()
muts={
 'tree-commit-check':("receipt.commit !== commit || receipt.tree !== git('rev-parse', `${commit}^{tree}`)","false"),
 'base-drop':("if (!policy.checks.some(c => c.id === id)) return","if (false) return"),
 'guard-files':("=== undefined) return `candidate removes guard file","=== 1) return `candidate removes guard file"),
 'outcome':("if (receipt.outcome !== 'pass') return","if (false) return"),
 'required-ids':("if (!ran || ran.exit_code !== 0 || ran.command !== check.command) return","if (false) return"),
 'dirty':("if (dirty()) fail('worktree is not clean","if (false) fail('worktree is not clean"),
 'hook-noop':("const reason = refusal(next, old);","const reason = undefined;"),
 'protected':("includes(ref)) continue;","includes(ref) || true) continue;"),
 'old-install-in-tree':("copyFileSync('.githooks/reference-transaction', resolve(dir, 'reference-transaction'));","writeFileSync(resolve(dir,'reference-transaction'),'#!/bin/sh\\nexit 0\\n');"),
}
for k,(a,b) in muts.items():
    assert a in orig,k
    open(p,'w').write(orig.replace(a,b))
    r=subprocess.run(['node','--test','scripts/test/local-checks.test.ts'],capture_output=True,text=True)
    fails=[l for l in r.stdout.splitlines() if l.startswith('ℹ fail')]
    print(k,'RED' if r.returncode else 'STILL GREEN',fails[0] if fails else 'no summary')
open(p,'w').write(orig)
