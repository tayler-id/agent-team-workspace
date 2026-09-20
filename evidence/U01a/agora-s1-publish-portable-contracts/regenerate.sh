#!/usr/bin/env bash
# Regenerates the receipts of one branch of agora-s1-publish-portable-contracts at the current code head.
# Run from the repository root with a clean tracked tree, checked out at that branch's code head:
#   BRANCH=2 PARENT=<branch-1 head> bash evidence/U01a/agora-s1-publish-portable-contracts/regenerate.sh
#   BRANCH=3 PARENT=<branch-2 head> bash evidence/U01a/agora-s1-publish-portable-contracts/regenerate.sh
# Branch 2 records red/green, the generation receipt, its guard negatives and the skill run. Branch 3 records
# red/green, the joint conformance report, lanes 4 to 6, its guard negatives, the skill run and performance.
set -uo pipefail
BRANCH=${BRANCH:?set BRANCH=2 or BRANCH=3}
PARENT=${PARENT:?set PARENT to the previous branch head}
ROOT=evidence/U01a/agora-s1-publish-portable-contracts
case "$BRANCH" in 2) EV=$ROOT/2-contracts ;; 3) EV=$ROOT/3-conformance ;; *) echo "BRANCH must be 2 or 3"; exit 64 ;; esac
mkdir -p "$EV"
HEAD=$(git rev-parse HEAD)
CONFORM=$(mktemp "${TMPDIR:-/tmp}/agora-evidence-conform-XXXX.json")
trap 'rm -f "$CONFORM" "$CONFORM.neg"' EXIT
strip() { sed -E 's/\x1b\[[0-9;]*m//g'; }
restore() { git checkout -q -- "$1"; if git diff --quiet -- "$1"; then echo "restored: byte-identical ($1)"; else echo "restore FAILED for $1"; exit 70; fi; }
tools() { echo "node: $(node --version)  pnpm: $(pnpm --version)  swift: $(swift --version 2>&1 | head -1)  postgres: $(pg_ctl --version)  host: $(uname -srm)"; }
neg() { echo; echo "## $1"; echo "command: $2"; echo "expectation: $3"; }
vectors() { node -e '
const r = require(process.argv[1]); const ids = process.argv.slice(2);
for (const x of r.results.filter((x) => !ids.length || ids.includes(x.id))) {
	const show = (c) => c.accepted ? `accepted canonical=${JSON.stringify(c.canonical)} digest=${c.digest}${c.signature ? ` signature=${c.signature}` : ""}` : `rejected (${c.rejection})${c.generated_decode ? ` generated_decode=${c.generated_decode.split(":")[0]}` : ""}`;
	console.log(`- ${x.id} [golden ${x.expect}] -> ${x.outcome}`); console.log(`    typescript: ${show(x.typescript)}`); console.log(`    swift:      ${show(x.swift)}`);
	if (x.disagreements.length) console.log(`    disagreements: ${x.disagreements.join(" | ")}`);
}' "$@"; }
drop_swift_guard() { python3 - <<'PY'
p='contracts/swift/Sources/AgoraContracts/Generated/Types+Components+Schemas.swift'; s=open(p).read()
i=s.index('public struct HealthReport'); j=s.index('try decoder.ensureNoAdditionalProperties(knownKeys: [', i); k=s.index('])', j)+2
open(p,'w').write(s[:j]+'// guard removed by hand'+s[k:])
PY
}

echo "== red/green (parent $PARENT)"
T0=$(date +%s)
node scripts/record-red-green.mjs --parent "$PARENT" --head "$HEAD" --out "$EV" -- pnpm -s test | tail -1
echo "red/green wall clock: $(( $(date +%s) - T0 )) s (two fresh worktrees, each with a clean pnpm install, a throwaway PostgreSQL cluster and its own SwiftPM build directory)"

if [ "$BRANCH" = 2 ]; then
echo "== generation receipt"
{
echo "# generation.log: generate and compile the TypeScript and Swift consumers from the schemas (agora.lane/v1, branch 2 share of lane 4)"
echo "head: $HEAD"; echo "recorded_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; tools
echo "pass predicate: a clean regeneration is byte-identical to the committed consumers; the TypeScript consumer typechecks with the center built on it; the Swift package compiles. Joint consumption of golden vectors is branch 3's lane 4."
echo; echo "## command: pnpm -s contracts:check"
T0=$(date +%s); pnpm -s contracts:check | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(JSON.stringify({outcome:r.outcome,exit:r.exit,drift:r.drift,outputs:r.outputs.map(o=>o.file)},null,2))'; echo "observed_exit: ${PIPESTATUS[0]} (expected 0); wall clock $(( $(date +%s) - T0 )) s"
echo; echo "## generation manifest"; node -e 'const m=require("./contracts/generated/manifest.json");console.log(JSON.stringify({tools:m.tools,components:m.components,sources:m.sources},null,2))'
echo; echo "## command: pnpm -s typecheck (center report types are Schema<...> from the generated consumer)"; pnpm -s typecheck; echo "observed_exit: $? (expected 0)"; grep -n "Schema<'" apps/center/src/app.ts
echo; echo "## command: swift build --package-path contracts/swift"; swift build --package-path contracts/swift 2>&1 | tail -2; echo "observed_exit: ${PIPESTATUS[0]} (expected 0)"
echo; echo "## generated Swift strictness"; echo "ensureNoAdditionalProperties call sites: $(grep -c ensureNoAdditionalProperties contracts/swift/Sources/AgoraContracts/Generated/Types+Components+Schemas.swift) (one per closed object schema, expected 13)"; grep -n -A1 'enum ExitCode' contracts/swift/Sources/AgoraContracts/Generated/Types+Components+Schemas.swift | head -2
} > "$EV/generation.log" 2>&1

echo "== gate negatives (branch 2)"
{
echo "# gate-negatives.log (agora.gate-negatives/v1)"; echo "head: $HEAD"; echo "recorded_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; tools
echo "method: break one thing, run the named gate, observe it fail, restore byte for byte (git checkout --), confirm green at the end. Guard-disabled cases follow R22: the normally denied input is repeated with precisely that guard removed and the assertion must turn red."
neg "subset negative: HealthReport opened with additionalProperties true" "pnpm -s contracts:check" "exit 1 naming the keyword"
python3 -c "
p='contracts/schemas/health.schema.json'; s=open(p).read(); i=s.index('\"HealthReport\"'); j=s.index('\"additionalProperties\": false', i); open(p,'w').write(s[:j]+'\"additionalProperties\": true'+s[j+len('\"additionalProperties\": false'):])"
pnpm -s contracts:check | cut -c1-220; echo "observed_exit: ${PIPESTATUS[0]}"; restore contracts/schemas/health.schema.json
neg "subset guard disabled: additionalProperties check deleted from generate.mjs, open-object weakening replayed" "pnpm -s test:unit" "nonzero, the open-object case in generation.test.ts turns red"
sed -i '' "s/if (schema.additionalProperties !== false) fail('objects must declare additionalProperties: false');//" contracts/tools/generate.mjs
git diff --stat -- contracts/tools/generate.mjs | tail -1
pnpm -s test:unit 2>&1 | strip | grep -E 'FAIL|open-object|Tests ' | head -4; echo "observed_exit: ${PIPESTATUS[0]}"; restore contracts/tools/generate.mjs
neg "drift negative: one line appended to the generated TypeScript consumer" "pnpm -s contracts:check" "exit 1 with generated_drift naming openapi.d.ts"
printf '\n// widened by hand\n' >> contracts/generated/typescript/openapi.d.ts
pnpm -s contracts:check | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(r.outcome, r.exit, r.reason_code, (r.drift||[]).map(d=>d.file).join(","))'; echo "observed_exit: ${PIPESTATUS[0]}"; restore contracts/generated/typescript/openapi.d.ts
neg "drift negative: HealthReport unknown-key guard removed from the generated Swift types" "pnpm -s contracts:check" "exit 1 with generated_drift naming the Swift schemas file"
drop_swift_guard
pnpm -s contracts:check | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(r.outcome, r.exit, r.reason_code, (r.drift||[]).map(d=>d.file).join(","))'; echo "observed_exit: ${PIPESTATUS[0]}"; restore "contracts/swift/Sources/AgoraContracts/Generated/Types+Components+Schemas.swift"
neg "manifest negative: a source digest altered in the committed manifest" "pnpm -s contracts:check" "exit 1 with generated_drift naming manifest.json"
python3 -c "p='contracts/generated/manifest.json'; s=open(p).read(); open(p,'w').write(s.replace('\"digest\": \"sha256:', '\"digest\": \"sha256:0', 1))"
pnpm -s contracts:check | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(r.outcome, r.exit, r.reason_code, (r.drift||[]).map(d=>d.file).join(","))'; echo "observed_exit: ${PIPESTATUS[0]}"; restore contracts/generated/manifest.json
neg "typecheck negative: center liveness status set outside the generated HealthReport type" "pnpm -s typecheck" "nonzero"
sed -i '' "s/status: 'ok', service: 'agora-center' })/status: 'broken', service: 'agora-center' })/" apps/center/src/app.ts
pnpm -s typecheck 2>&1 | grep -E 'error TS' | head -2; echo "observed_exit: ${PIPESTATUS[0]}"; restore apps/center/src/app.ts
neg "contract negative (center): ScopeReference opened, consumers regenerated, unknown-field request replayed" "pnpm -s contracts:generate && pnpm -s test:unit" "nonzero, the unknown-field 400 assertion in apps/center/test/policy.test.ts turns red"
python3 -c "
p='contracts/schemas/fixture-policy.schema.json'; s=open(p).read(); i=s.index('\"ScopeReference\"'); j=s.index('\"additionalProperties\": false', i); open(p,'w').write(s[:j]+'\"additionalProperties\": true'+s[j+len('\"additionalProperties\": false'):])"
echo "(the subset gate blocks generation first; the replay below shows the gate's verdict rather than a widened consumer)"
pnpm -s contracts:generate | cut -c1-200; echo "generate_exit: ${PIPESTATUS[0]} (expected 1)"; restore contracts/schemas/fixture-policy.schema.json; git status --short -- contracts | grep . || echo "generated tree: unchanged"
echo; echo "## restored: every code gate green again"; echo "command: pnpm -s typecheck && pnpm -s lint && pnpm -s contracts:check && pnpm -s test"
pnpm -s typecheck && pnpm -s lint && pnpm -s contracts:check | cut -c1-90 && pnpm -s test 2>&1 | strip | grep -E 'Tests |Test Files'; echo "observed_exit: ${PIPESTATUS[0]} (expected 0)"
git status --short -- apps packages contracts scripts | grep -v '^??' || echo "working tree: no tracked code modifications"
} > "$EV/gate-negatives.log" 2>&1
fi

if [ "$BRANCH" = 3 ]; then
echo "== conformance report at head"
node contracts/src/conform-cli.ts --json > "$CONFORM"; echo "conform_exit: $?"
echo "== lane-4"
{
echo "# lane-4 transcript: generate and compile TypeScript and Swift from the schemas; both consume the same golden requests and reports (agora.lane/v1)"
echo "head: $HEAD"; echo "recorded_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; tools
echo "pass predicate: a clean regeneration is byte-identical to the committed consumers (branch 2 receipt: ../2-contracts/generation.log); both consumers consume the same golden requests (FixturePolicyCommand, CliCommand) and reports (HealthReport, ReadinessReport, FixturePolicyDecisionReport, ErrorReport, CliReport) with identical verdicts"
echo "limit: no WebSocket event family exists on the foundation surface yet (U01a.B03 and U03 add it); event coverage here is the closed state enums that both consumers refuse to widen"
echo; echo "## command: pnpm -s contracts:check"; pnpm -s contracts:check | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(JSON.stringify({outcome:r.outcome,exit:r.exit,drift:r.drift}))'; echo "observed_exit: ${PIPESTATUS[0]} (expected 0)"
echo; echo "## command: swift build --package-path contracts/swift"; swift build --package-path contracts/swift 2>&1 | tail -1; echo "observed_exit: ${PIPESTATUS[0]} (expected 0)"
echo; echo "## command: pnpm -s contracts:conform -- --json (joint TypeScript and Swift run)"
node -e 'const r=require(process.argv[1]);const vs=require("./contracts/fixtures/vectors.json").vectors;const by={};for(const x of r.results){const c=(vs.find(v=>v.id===x.id)||{}).component;by[c]=by[c]||{pass:0,fail:0};by[c][x.outcome]++;}console.log(JSON.stringify({outcome:r.outcome,exit:r.exit,swift:r.swift,vectors:r.vectors,by_component:by},null,2))' "$CONFORM"
echo; echo "## request and report vectors"; vectors "$CONFORM" policy-command policy-command-uppercase-uuid cli-command-verify health-ok readiness-not-ready decision-deny error-unicode-details cli-report-full
echo; echo "scenario.png: unavailable. This lane drives generators, compilers and a CLI; no browser or screenshot tool ran. The transcript above is the retained artifact."
} > "$EV/lane-4/transcript.log" 2>&1
echo "== lane-5"
{
echo "# lane-5 transcript: Unicode, decimal, null/absent and canonical signature vectors (agora.lane/v1)"
echo "head: $HEAD"; echo "recorded_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; tools
echo "pass predicate: TypeScript and Swift agree with each other and with the golden values on literal canonical bytes, digests, acceptance and signature verdicts; composed and decomposed Unicode stay distinct bytes; 18446744073709551615 is accepted and 18446744073709551616 rejected as a decimal string; null is never absent; the detached Ed25519 signature verifies over canonical bytes and fails on a tampered payload"
echo; echo "## command: pnpm -s contracts:conform -- --json (filtered)"
vectors "$CONFORM" error-unicode-details revision-zero revision-max revision-over-max revision-negative revision-leading-zero revision-number-not-string revision-unicode-digits decision-allow-signed decision-allow-tampered-signature decision-allow-reason-null cli-report-cleanup-null cli-report-without-cleanup cli-report-byte-length-whole-float cli-report-byte-length-over-safe timestamp-utc timestamp-fractional timestamp-offset-not-utc timestamp-trailing-newline
echo; echo "## independent check: Python json.dumps(sort_keys, compact, ensure_ascii=False) over each accepted vector"
python3 - <<'PY'
import json, hashlib
f=json.load(open('contracts/fixtures/vectors.json')); agree=0; noted=[]
for v in f['vectors']:
    if v['expect']!='accept': continue
    py=json.dumps(json.loads(v['wire']), sort_keys=True, separators=(',',':'), ensure_ascii=False)
    if py==v['canonical'] and 'sha256:'+hashlib.sha256(py.encode()).hexdigest()==v['digest']: agree+=1
    else: noted.append(v['id'])
print(f"agree: {agree}; differ: {noted} (Python keeps the JSON literal 1.0 as a float; RFC 8785 and both consumers write 1)")
PY
echo; echo "scenario.png: unavailable. CLI-driven vectors; the transcript above is the retained artifact."
} > "$EV/lane-5/transcript.log" 2>&1
echo "== lane-6"
{
echo "# lane-6 transcript: alter generated output and send an unknown state-changing variant (agora.lane/v1)"
echo "head: $HEAD"; echo "recorded_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; tools
echo "pass predicate: a hand edit to a generated consumer fails the drift check naming the file; an unknown state variant is refused by both consumers, by the Swift generated type on its own and by the runtime validator, never acknowledged"
echo "limit: no state-changing event family exists on the foundation surface yet; the unknown-state vectors are the closed status, decision and outcome enums (U01a.B03 adds the client-core pause-and-resync behavior)"
echo; echo "## command: append one line to contracts/generated/typescript/openapi.d.ts, then pnpm -s contracts:check"
printf '\n// widened by hand\n' >> contracts/generated/typescript/openapi.d.ts
pnpm -s contracts:check | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(JSON.stringify({outcome:r.outcome,exit:r.exit,reason_code:r.reason_code,drift:r.drift},null,2))'; echo "observed_exit: ${PIPESTATUS[0]} (expected 1)"; restore contracts/generated/typescript/openapi.d.ts
echo; echo "## command: remove the HealthReport unknown-key guard from the generated Swift types, then pnpm -s contracts:check"
drop_swift_guard
pnpm -s contracts:check | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(JSON.stringify({outcome:r.outcome,exit:r.exit,drift:(r.drift||[]).map(d=>d.file)},null,2))'; echo "observed_exit: ${PIPESTATUS[0]} (expected 1)"; restore "contracts/swift/Sources/AgoraContracts/Generated/Types+Components+Schemas.swift"
echo; echo "## unknown state variants at head (from pnpm -s contracts:conform -- --json)"
vectors "$CONFORM" readiness-unknown-state-variant decision-unknown-variant cli-report-unknown-outcome health-unknown-status-variant cleanup-unknown-outcome outcome-uppercase
echo; echo "scenario.png: unavailable. CLI-driven; the transcript above is the retained artifact."
} > "$EV/lane-6/transcript.log" 2>&1

echo "== gate negatives (branch 3)"
{
echo "# gate-negatives.log (agora.gate-negatives/v1)"; echo "head: $HEAD"; echo "recorded_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; tools
echo "method: break one thing, run the named gate, observe it fail, restore byte for byte (git checkout --), confirm green at the end. Guard-disabled cases follow R22: the normally denied input is repeated with precisely that guard removed and the assertion must turn red. Branch 2's negatives (subset, drift, manifest, typecheck) are in ../2-contracts/gate-negatives.log."
neg "compatibility negative: ReadinessReport status widened with draining, consumers regenerated, golden vectors replayed" "pnpm -s contracts:generate && pnpm -s contracts:conform -- --json" "conform exit 1; readiness-unknown-state-variant accepted by both consumers against golden reject"
sed -i '' 's/"enum": \["ready", "not_ready"\]/"enum": ["ready", "not_ready", "draining"]/' contracts/schemas/health.schema.json
pnpm -s contracts:generate | cut -c1-120
pnpm -s contracts:conform -- --json > "$CONFORM.neg"; echo "observed_exit: $?"; vectors "$CONFORM.neg" readiness-unknown-state-variant
restore contracts/schemas/health.schema.json; pnpm -s contracts:generate | cut -c1-90; git status --short -- contracts | grep . || echo "generated tree: byte-identical after regeneration"
neg "golden negative: health-ok digest altered in vectors.json" "pnpm -s contracts:conform -- --json" "exit 1; both consumers disagree with the altered golden, not with each other"
python3 -c "
import json; p='contracts/fixtures/vectors.json'; f=json.load(open(p)); v=[v for v in f['vectors'] if v['id']=='health-ok'][0]; v['digest']=v['digest'][:-1]+('0' if v['digest'][-1]!='0' else '1'); open(p,'w').write(json.dumps(f,indent='\t')+'\n')"
pnpm -s contracts:conform -- --json > "$CONFORM.neg"; echo "observed_exit: $?"; vectors "$CONFORM.neg" health-ok; restore contracts/fixtures/vectors.json
neg "TypeScript guard disabled: Ajv removeAdditional set to true" "pnpm -s contracts:conform -- --json" "exit 1; TypeScript accepts health-unknown-field (unknown field silently removed) while Swift and the golden reject"
sed -i '' 's/removeAdditional: false/removeAdditional: true/' contracts/src/index.ts
pnpm -s contracts:conform -- --json > "$CONFORM.neg"; echo "observed_exit: $?"; vectors "$CONFORM.neg" health-unknown-field policy-command-unknown-field; restore contracts/src/index.ts
neg "Swift guard disabled: runtime pattern check deleted from SchemaValidator.swift" "pnpm -s contracts:conform -- --json" "exit 1; Swift accepts revision-over-max and timestamp-offset-not-utc (generated types carry no pattern) while TypeScript and the golden reject"
sed -i '' '/!matches(pattern, text)/d' contracts/swift/Sources/AgoraContractsConform/SchemaValidator.swift
git diff --stat -- contracts/swift/Sources/AgoraContractsConform/SchemaValidator.swift | tail -1
pnpm -s contracts:conform -- --json > "$CONFORM.neg"; echo "observed_exit: $?"; vectors "$CONFORM.neg" revision-over-max timestamp-offset-not-utc; restore contracts/swift/Sources/AgoraContractsConform/SchemaValidator.swift
neg "Swift canonical negative: control characters escaped with uppercase hex" "pnpm -s contracts:conform -- --json" "exit 1; error-unicode-details digest differs between Swift, TypeScript and the golden"
sed -i '' 's/String(format: "\\\\u%04x", scalar.value)/String(format: "\\\\u%04X", scalar.value)/' contracts/swift/Sources/AgoraContractsConform/Canonical.swift
git diff --stat -- contracts/swift/Sources/AgoraContractsConform/Canonical.swift | tail -1
pnpm -s contracts:conform -- --json > "$CONFORM.neg"; echo "observed_exit: $?"; vectors "$CONFORM.neg" error-unicode-details; restore contracts/swift/Sources/AgoraContractsConform/Canonical.swift
neg "comparison guard disabled: the unavailable-is-never-a-pass rule removed from compareConsumers" "pnpm -s test:unit" "nonzero, the unavailable-consumer assertion in conformance.test.ts turns red"
sed -i '' "s/startsWith('unavailable')/startsWith('never')/" contracts/src/conformance.ts
pnpm -s test:unit 2>&1 | strip | grep -E 'FAIL|unavailable|Tests ' | head -4; echo "observed_exit: ${PIPESTATUS[0]}"; restore contracts/src/conformance.ts
neg "generated-type negative: HealthReport unknown-key guard removed from the generated Swift types (drift accepted for the run)" "pnpm -s test:unit" "nonzero, the generated-decode-refuses assertion for health-unknown-field turns red while the runtime validator still rejects the vector"
drop_swift_guard
pnpm -s test:unit 2>&1 | strip | grep -E 'FAIL|health-unknown-field|Tests ' | head -5; echo "observed_exit: ${PIPESTATUS[0]}"; restore "contracts/swift/Sources/AgoraContracts/Generated/Types+Components+Schemas.swift"
echo; echo "## restored: every code gate green again"; echo "command: pnpm -s typecheck && pnpm -s lint && pnpm -s contracts:check && pnpm -s contracts:conform && pnpm -s test"
pnpm -s typecheck && pnpm -s lint && pnpm -s contracts:check | cut -c1-90 && pnpm -s contracts:conform -- --json | cut -c1-90 && pnpm -s test 2>&1 | strip | grep -E 'Tests |Test Files'; echo "observed_exit: ${PIPESTATUS[0]} (expected 0)"
git status --short -- apps packages contracts scripts | grep -v '^??' || echo "working tree: no tracked code modifications"
} > "$EV/gate-negatives.log" 2>&1
fi

echo "== skill run"
{
echo "# verify-agora skill run at $HEAD ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
echo "Literal run of .agents/skills/verify-agora/SKILL.md sections at the code head of branch $BRANCH."
echo; echo "## Doctor"; tools
pnpm install --frozen-lockfile 2>&1 | tail -1; echo "install_exit: ${PIPESTATUS[0]} (expected 0)"
pnpm typecheck >/dev/null 2>&1; echo "typecheck_exit: $? (expected 0)"
pnpm lint >/dev/null 2>&1; echo "lint_exit: $? (expected 0)"
pnpm docs:check >/dev/null 2>&1; echo "docs_check_exit: $? (expected 0)"
echo; echo "## Drive"
pnpm -s contracts:check | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log("contracts_check:", r.outcome, "drift:", JSON.stringify(r.drift))'
if [ "$BRANCH" = 3 ]; then pnpm -s contracts:conform -- --json | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log("contracts_conform:", r.outcome, "swift:", r.swift, "pass:", r.results.filter(x=>x.outcome==="pass").length, "/", r.results.length)'; fi
pnpm -s test 2>&1 | strip | grep -E 'Tests |Test Files'; echo "test_exit: ${PIPESTATUS[0]} (expected 0)"
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs --json 2>/dev/null | python3 -c 'import json,sys; r=json.loads(sys.stdin.read()); print("probe_outcome:", r["outcome"], "exit:", r["exit"], "ids:", [x["id"]+"="+x["outcome"] for x in r["results"]])'
node scripts/with-test-postgres.mjs bash -c 'node packages/storage/src/migrate-cli.ts; node packages/storage/src/migrate-cli.ts' 2>/dev/null | python3 -c 'import json,sys; rs=[json.loads(l) for l in sys.stdin if l.strip()]; print("migrate_applied:", [r["applied"] for r in rs], "same_digest:", rs[0]["schema_digest"]==rs[1]["schema_digest"])'
echo; echo "## Cleanup"
git worktree prune; git worktree list | grep -c 'agora-red-\|agora-green-\|agora-clean-' || echo "worktrees: clean"
ls "${TMPDIR:-/tmp}" | grep agora- | grep -v agora-evidence- || echo "tmp: clean"
echo "evidence retained after cleanup: $(ls "$EV" | wc -l | xargs) entries: $(ls "$EV" | tr '\n' ' ' | sed 's/ $//')"
} > "$EV/skill-run.log" 2>&1

if [ "$BRANCH" = 3 ]; then
echo "== performance"
MEASURE=contracts/src/.measure-validation.ts
cat > "$MEASURE" <<'PERF'
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createWireValidator } from './index.ts';
const wire = createWireValidator();
const vectors = (JSON.parse(readFileSync('contracts/fixtures/vectors.json', 'utf8')) as { vectors: { id: string; wire: string }[] }).vectors;
const full = vectors.find((v) => v.id === 'cli-report-full')?.wire ?? '{}';
const report = JSON.parse(full) as { diagnostics: unknown[] };
const padded = JSON.stringify({ ...report, diagnostics: Array.from({ length: 33 }, (_, i) => ({ reason_code: 'usage_error', message: `${i}:${'x'.repeat(3960)}` })) });
const rejected = JSON.stringify({ ...JSON.parse(padded) as object, extra: true });
for (const [label, text] of [['CliReport golden (' + Buffer.byteLength(full) + ' B)', full], ['valid CliReport (' + Buffer.byteLength(padded) + ' B)', padded], ['CliReport with an unknown field (' + Buffer.byteLength(rejected) + ' B, expected reject)', rejected]] as const) {
	const samples: number[] = [];
	for (let i = 0; i < 2000; i++) { const t = performance.now(); wire.validate('CliReport', JSON.parse(text)); samples.push(performance.now() - t); }
	samples.sort((x, y) => x - y);
	console.log(JSON.stringify({ label, samples: samples.length, p50_ms: +(samples[1000] ?? 0).toFixed(4), p95_ms: +(samples[1900] ?? 0).toFixed(4), max_ms: +(samples[1999] ?? 0).toFixed(4), budget_p95_ms: 5 }));
}
PERF
{
echo "# Performance notes for agora-s1-publish-portable-contracts at $HEAD"; echo
echo "Recorded $(date -u +%Y-%m-%dT%H:%M:%SZ). $(tools) No \`agora project verify --scenario perf\` runner exists yet (U01b); these are direct measurements on one host, not the five interleaved parent/head batches the milestone probe requires. Regenerate with \`BRANCH=3 PARENT=<branch-2 head> bash $ROOT/regenerate.sh\`."
echo; echo "## Parent baseline"; echo
echo "The bootstrap parent (aaedd8d) validates one 200-byte fixture command with the same Ajv 8.20.0 pin; its measured p95 is in evidence/U01a/agora-s1-bootstrap-repository/performance.md. Contract generation, drift checking and cross-language conformance are absent there, so their cost is reported as new absolute figures, not a regression."
echo; echo "## Head measurements"; echo; echo "| Metric | Observed | Budget |"; echo "| --- | --- | --- |"
T0=$(date +%s); pnpm -s contracts:check >/dev/null 2>&1; T1=$(date +%s); echo "| Drift check, warm SwiftPM cache (\`pnpm contracts:check\`) | $((T1-T0)) s | none set |"
T0=$(date +%s); pnpm -s contracts:conform -- --json >/dev/null 2>&1; T1=$(date +%s); echo "| Joint conformance run, warm build (\`pnpm contracts:conform\`) | $((T1-T0)) s | none set |"
T0=$(date +%s); pnpm -s test:unit >/dev/null 2>&1; T1=$(date +%s); echo "| Unit tests including drift and conformance (\`pnpm test:unit\`) | $((T1-T0)) s | none set |"
echo "| Clean install, fresh SwiftPM build directory and full suite per revision | red/green wall clock in the regenerate run log (two revisions) | clean fixture build under 5 min per revision |"
echo; echo "## Schema validation latency"; echo
echo "Ajv 8.20.0, 2020-12 mode, shared wire validator, 2000 warm samples each, JSON.parse included in the timed region:"; echo; echo '```text'
node "$MEASURE"
echo '```'; echo
echo "Both 128 KiB shapes must sit under the 5 ms p95 budget. These are single-host figures for the largest published envelope; the perf lane belongs to U01b."
} > "$EV/performance.md" 2>&1
rm -f "$MEASURE"
cp agora/feature-map.json "$EV/feature-map.json"
fi
echo "== done branch $BRANCH at $HEAD"
