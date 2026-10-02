# usage: bash .scratch/forge/repro.sh  (from repo root; validator under test is scripts/validate-evidence.mjs at HEAD)
H=$(git rev-parse HEAD); B=$(git merge-base HEAD main); R=.scratch/forge/run; rm -rf $R
v(){ node scripts/validate-evidence.mjs --dir "$1" --head $H --base $B "${@:2}"; echo "exit=$?"; }
echo "subject: $H"
echo "### F1 attacker-chosen key /dev/null"; node .scratch/forge/forge.mjs $R/k-null $H $B /dev/null; v $R/k-null
echo "### F1 attacker-chosen key package.json (tracked, known to everyone)"; node .scratch/forge/forge.mjs $R/k-pkg $H $B package.json; v $R/k-pkg
echo "### F2 artifact replaced after signing, only the unsigned digest updated"; node .scratch/forge/forge.mjs $R/swap $H $B package.json; node .scratch/forge/swap.mjs $R/swap green.log "head: $H
parent: $B
configuration: {\"command\":\"true\",\"vitest_config\":\"sha256:fake\",\"tsconfig_base\":\"sha256:fake\",\"lockfile\":\"sha256:fake\"}
observed_exit: 0
arbitrary replaced green output
"; v $R/swap
echo "### F3 non-numeric red exit (killed by signal)"; node .scratch/forge/forge.mjs $R/nan $H $B package.json 'null (SIGKILL after timeout)'; v $R/nan
echo "### F2 on a real recorder-signed bundle: green.log replaced by someone without the key, digest updated"
mkdir -p $R; cp -R evidence/local-room/session-drafts-held-send $R/real; RH=$(sed -n 's/^head: //p' $R/real/green.log); RB=$(sed -n 's/^parent: //p' $R/real/green.log)
node scripts/validate-evidence.mjs --dir $R/real --head $RH --base $RB; echo "exit=$? (unmodified copy)"
node .scratch/forge/swap.mjs $R/real green.log "head: $RH
parent: $RB
configuration: $(sed -n 's/^configuration: //p' $R/real/red.log)
observed_exit: 0
replaced output, no test ran
"
node scripts/validate-evidence.mjs --dir $R/real --head $RH --base $RB; echo "exit=$?"
rm -rf $R
V2=evidence/U01b/agora-s1-validate-project-evidence-forgery-fix
if [ -f $V2/manifest.json ] && grep -q 'manifest/v2' $V2/manifest.json; then
R=.scratch/forge/run; mkdir -p $R; RH=$(sed -n 's/^head: //p' $V2/green.log); RB=$(sed -n 's/^parent: //p' $V2/green.log)
echo "### v2: unmodified copy of the real recorder-signed bundle"; cp -R $V2 $R/v2; node scripts/validate-evidence.mjs --dir $R/v2 --head $RH --base $RB; echo "exit=$?"
echo "### v2 F2: green.log replaced without the key, digest updated"
node .scratch/forge/swap.mjs $R/v2 green.log "head: $RH
parent: $RB
configuration: $(sed -n 's/^configuration: //p' $R/v2/red.log)
observed_exit: 0
replaced output, no test ran
"; node scripts/validate-evidence.mjs --dir $R/v2 --head $RH --base $RB; echo "exit=$?"
echo "### v2 F1: whole manifest re-signed with package.json and key_file: package.json"
rm -rf $R/v2; cp -R $V2 $R/v2; node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs'; import { sign } from './scripts/project-evidence.mjs';
const p='$R/v2/manifest.json'; const m=JSON.parse(readFileSync(p,'utf8')); m.producer.key_file='package.json'; m.producer.signature=sign(readFileSync('package.json'), m); writeFileSync(p, JSON.stringify(m));"
node scripts/validate-evidence.mjs --dir $R/v2 --head $RH --base $RB; echo "exit=$?"
echo "### v2 F3: red observed_exit null, re-signed with the owner's own key (only the strict parser can refuse it)"
rm -rf $R/v2; cp -R $V2 $R/v2; sed -i '' 's/^observed_exit: 1$/observed_exit: null (SIGKILL after timeout)/' $R/v2/red.log; node --input-type=module -e "
import { createHash } from 'node:crypto'; import { readFileSync, writeFileSync } from 'node:fs'; import { sign } from './scripts/project-evidence.mjs';
const p='$R/v2/manifest.json'; const m=JSON.parse(readFileSync(p,'utf8')); const b=readFileSync('$R/v2/red.log');
m.artifacts=m.artifacts.map(a=>a.file==='red.log'?{file:a.file,digest:'sha256:'+createHash('sha256').update(b).digest('hex'),byte_length:b.length}:a); m.producer.signature=sign(readFileSync('.scratch/producer.key'), m); writeFileSync(p, JSON.stringify(m));"
node scripts/validate-evidence.mjs --dir $R/v2 --head $RH --base $RB; echo "exit=$?"
rm -rf $R
fi
