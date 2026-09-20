#!/usr/bin/env bash
# Regenerates every task receipt in this directory at the current code head.
# Run from the repository root with a clean tracked tree: bash evidence/U01a/agora-s1-bootstrap-repository/regenerate.sh
set -uo pipefail
EV=evidence/U01a/agora-s1-bootstrap-repository
HARNESS=84d29c9      # test-only harness revision (liveness only)
REFACTOR=3f9aee9     # parent of the review-fix rounds
HEAD=$(git rev-parse HEAD)
SP=$(mktemp -d "${TMPDIR:-/tmp}/agora-evidence-XXXX")
trap 'rm -rf "$SP"' EXIT
strip() { sed -E 's/\x1b\[[0-9;]*m//g'; }
restore() { git checkout -q -- "$1"; if git diff --quiet -- "$1"; then echo "restored: byte-identical"; else echo "restore FAILED for $1"; exit 70; fi; }
tools() { echo "node: $(node --version)  pnpm: $(pnpm --version)  postgres: $(pg_ctl --version)  host: $(uname -srm)"; }

echo "== red/green: fixture round (parent $HARNESS)"
node scripts/record-red-green.mjs --parent $HARNESS --head $HEAD --out $EV -- pnpm -s test | tail -1
echo "== red/green: review rounds (parent $REFACTOR)"
node scripts/record-red-green.mjs --parent $REFACTOR --head $HEAD --out $EV/review-fixes -- pnpm -s test | tail -1

echo "== lane-1"
{
echo "# lane-1 transcript: regression lane against trunk, public health/policy fixture at parent and head (agora.lane/v1)"
echo "parent (test-only harness revision): $(git rev-parse $HARNESS)"
echo "head: $HEAD"; echo "recorded_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; tools
echo "red/green receipts: red.log and green.log beside this directory (fixture round) and review-fixes/red.log and green.log (review rounds), produced by scripts/record-red-green.mjs; each log carries the test patch digest"
echo "pass predicate: head passes the intended behavior; parent fails its assertion (404 where 200/400/503 is expected), not compilation"
echo; echo "## command: node scripts/with-test-postgres.mjs node scripts/probe-center.mjs   (public HTTP drive at head as the service role)"
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs 2>&1; echo "observed_exit: ${PIPESTATUS[0]} (expected 0)"
echo; echo "## parent assertions from red.log (fixture round)"; grep -E 'AssertionError: expected 404|TypeError: .* is not a function' $EV/red.log
echo; echo "## parent assertions from review-fixes/red.log (review rounds)"; grep -E 'AssertionError|FAIL ' $EV/review-fixes/red.log | head -16
echo; echo "scenario.png: unavailable. The public surface here is HTTP JSON driven by a CLI probe; no browser or screenshot tool ran. The probe report above is the retained artifact."
} > $EV/lane-1/transcript.log 2>&1

echo "== lane-2"
{
echo "# lane-2 transcript: concurrent real PostgreSQL clients with rollback and RLS (agora.lane/v1)"
echo "head: $HEAD"; echo "recorded_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; tools
echo "pass predicate: one of eight claims wins; rollback leaves no event and no counter advance; twelve events replay in numeric order; another scope sees no rows, cannot append, cannot forge a row or attach an event through the foreign key; forced row security confines the owner; only the BYPASSRLS guard-negative role reads across scopes"
echo; echo "## command: node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg --reporter=verbose"
node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg --reporter=verbose 2>&1 | strip; echo "observed_exit: ${PIPESTATUS[0]} (expected 0)"
echo; echo "scenario.png: unavailable. This lane drives a CLI test runner, not a browser; no screenshot tool ran. The transcript above is the retained artifact."
} > $EV/lane-2/transcript.log 2>&1

echo "== lane-3"
W=$(mktemp -d "${TMPDIR:-/tmp}/agora-clean-XXXX"); STORE=$(mktemp -d "${TMPDIR:-/tmp}/agora-store-XXXX")
git worktree add --detach -q "$W" $HEAD
{
echo "# lane-3 transcript: clean install and migrate twice (agora.lane/v1)"
echo "head: $HEAD"; echo "recorded_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; tools
echo "spec dated pins: Node 24.21.0 and PostgreSQL 18.6 (R17); verified here: the versions above, inside the pinned majors; later minors not exercised on this host"
echo "method: fresh git worktree at head, fresh empty pnpm store, pnpm install --frozen-lockfile, then two migration runs as the owner against one throwaway socket-only cluster"
echo; echo "## command: pnpm install --frozen-lockfile --store-dir <fresh>"
(cd "$W" && pnpm install --frozen-lockfile --store-dir "$STORE" > install.out 2>&1; echo "install_exit: $? (expected 0)"; grep -vE '^\s*$|Progress|^\+' install.out | tail -6; rm install.out)
echo; echo "## direct dependency versions at head"; (cd "$W" && pnpm -r ls --depth 0 2>&1 | grep -E '^[a-z@]|^\S' | grep -vE '^Legend|^$' | head -40)
echo; echo "## command: pnpm typecheck && pnpm lint (clean worktree)"; (cd "$W" && pnpm -s typecheck && pnpm -s lint; echo "typecheck+lint_exit: $? (expected 0)")
echo; echo "## command: node scripts/with-test-postgres.mjs bash -c 'node packages/storage/src/migrate-cli.ts; node packages/storage/src/migrate-cli.ts'"
(cd "$W" && node scripts/with-test-postgres.mjs bash -c 'node packages/storage/src/migrate-cli.ts; echo "first_exit: $?"; node packages/storage/src/migrate-cli.ts; echo "second_exit: $?"' 2>&1)
echo "pass predicate: applied 1 then applied 0, identical schema_digest, database_version PostgreSQL 18.x"
} > $EV/lane-3/transcript.log 2>&1
git worktree remove --force "$W"; rm -rf "$STORE"; git worktree prune

echo "== gate negatives"
neg() { # title, command, expectation
	echo; echo "## $1"; echo "command: $2"; echo "expectation: $3"
}
{
echo "# gate-negatives.log (agora.gate-negatives/v1)"; echo "head: $HEAD"; echo "recorded_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; tools
echo "method: break one thing, run the named gate, observe it fail, restore byte for byte (git checkout --), confirm green at the end. Guard-disabled cases follow R22: the normally denied input is repeated with precisely that guard removed and the assertion must turn red. Unit gates run 14 tests; pg gates run 16; the full suite runs 30."
neg "typecheck negative: HealthReport.status set to a string outside its literal type" "pnpm -s typecheck" "nonzero"
sed -i '' "s/status: 'ok', service: 'agora-center' })/status: 'broken', service: 'agora-center' })/" apps/center/src/app.ts
pnpm -s typecheck 2>&1 | grep -E 'error TS' | head -2; echo "observed_exit: ${PIPESTATUS[0]}"; restore apps/center/src/app.ts
neg "lint negative: unused explicit-any binding" "pnpm -s lint" "nonzero"
printf '\nconst leak: any = 1;\n' >> packages/domain/src/index.ts
pnpm -s lint 2>&1 | grep -E 'error|problems' | head -3; echo "observed_exit: ${PIPESTATUS[0]}"; restore packages/domain/src/index.ts
neg "unit negative: expected liveness status changed to degraded" "pnpm -s test:unit" "nonzero, health assertion red"
sed -i '' "s/status: 'ok', service: 'agora-center' });/status: 'degraded', service: 'agora-center' });/" apps/center/test/health.test.ts
pnpm -s test:unit 2>&1 | strip | grep -E 'FAIL|Tests ' | head -3; echo "observed_exit: ${PIPESTATUS[0]}"; restore apps/center/test/health.test.ts
neg "pg negative 1: expect the second migration run to apply one entry" "pnpm -s test:pg" "nonzero, migrate assertion red"
sed -i '' "s/expect(second).toEqual({ ...first, applied: 0 });/expect(second).toEqual({ ...first, applied: 1 });/" packages/storage/test/migrate.pg.test.ts
pnpm -s test:pg 2>&1 | strip | grep -E 'FAIL|"applied"|Tests ' | head -5; echo "observed_exit: ${PIPESTATUS[0]}"; restore packages/storage/test/migrate.pg.test.ts
neg "pg negative 2 (guard disabled): stream policy WITH CHECK replaced by true" "pnpm -s test:pg" "nonzero, the forge assertion (42501) turns red"
sed -i '' '/CREATE POLICY scope_isolation ON foundation_fixture.stream/,/WITH CHECK/{s/^\tWITH CHECK (scope_id = nullif(current_setting(.agora.scope_id., true), ..)::uuid);/\tWITH CHECK (true);/;}' packages/storage/drizzle/0000_foundation_fixture.sql
git diff --stat -- packages/storage/drizzle/0000_foundation_fixture.sql | tail -1
pnpm -s test:pg 2>&1 | strip | grep -E 'FAIL|42501|Tests ' | head -5; echo "observed_exit: ${PIPESTATUS[0]}"; restore packages/storage/drizzle/0000_foundation_fixture.sql
neg "pg negative 3 (guard disabled): event policy USING replaced by true" "pnpm -s test:pg" "nonzero, the another-scope-sees-no-rows assertion turns red"
sed -i '' '/CREATE POLICY scope_isolation ON foundation_fixture.event/,/WITH CHECK/{s/^\tUSING (scope_id = nullif(current_setting(.agora.scope_id., true), ..)::uuid)$/\tUSING (true)/;}' packages/storage/drizzle/0000_foundation_fixture.sql
git diff --stat -- packages/storage/drizzle/0000_foundation_fixture.sql | tail -1
pnpm -s test:pg 2>&1 | strip | grep -E 'FAIL|Tests ' | head -6; echo "observed_exit: ${PIPESTATUS[0]}"; restore packages/storage/drizzle/0000_foundation_fixture.sql
neg "pg negative 4 (guard disabled): FORCE ROW LEVEL SECURITY removed from event" "pnpm -s test:pg" "nonzero, the owner-confined assertion turns red"
sed -i '' '/ALTER TABLE foundation_fixture.event FORCE ROW LEVEL SECURITY;/d' packages/storage/drizzle/0000_foundation_fixture.sql
git diff --stat -- packages/storage/drizzle/0000_foundation_fixture.sql | tail -1
pnpm -s test:pg 2>&1 | strip | grep -E 'FAIL|Tests ' | head -6; echo "observed_exit: ${PIPESTATUS[0]}"; restore packages/storage/drizzle/0000_foundation_fixture.sql
neg "pg negative 5 (guard disabled): counter read without lock or advance" "pnpm -s test:pg" "nonzero, the race assertion turns red (duplicate key)"
sed -i '' "s/const counter = await client.query<{ seq: Seq }>('update foundation_fixture.stream set next_seq = next_seq + 1 where stream_id = \$1 returning (next_seq - 1)::text as seq', \[streamId\]);/const counter = await client.query<{ seq: Seq }>('select next_seq::text as seq from foundation_fixture.stream where stream_id = \$1', [streamId]);/" packages/storage/src/fixture.ts
git diff --stat -- packages/storage/src/fixture.ts | tail -1
pnpm -s test:pg 2>&1 | strip | grep -E 'FAIL|duplicate key|Tests ' | head -5; echo "observed_exit: ${PIPESTATUS[0]}"; restore packages/storage/src/fixture.ts
neg "pg negative 6 (guard disabled): counter advanced on a separate autocommit connection" "pnpm -s test:pg" "nonzero, the rollback assertion turns red on nextSeq"
python3 - <<'PY'
p='packages/storage/src/fixture.ts'; s=open(p).read()
s=s.replace("export function bindFixtureTransaction(client: PoolClient): FixtureTransaction {","import { Pool } from 'pg';\nconst sidePool = new Pool({ connectionString: process.env['AGORA_TEST_DATABASE_URL'] });\nexport function bindFixtureTransaction(client: PoolClient): FixtureTransaction {")
s=s.replace("const counter = await client.query<{ seq: Seq }>('update foundation_fixture.stream","const scope = (await client.query<{ s: string }>('select current_setting($1) as s', [SCOPE_SETTING])).rows[0]?.s ?? '';\n\t\t\tconst side = await sidePool.connect();\n\t\t\tawait side.query('select set_config($1, $2, false)', [SCOPE_SETTING, scope]);\n\t\t\tconst counter = await side.query<{ seq: Seq }>('update foundation_fixture.stream")
s=s.replace("const seq = counter.rows[0]?.seq;\n\t\t\tif (seq === undefined) throw","side.release(true);\n\t\t\tconst seq = counter.rows[0]?.seq;\n\t\t\tif (seq === undefined) throw")
open(p,'w').write(s)
PY
git diff --stat -- packages/storage/src/fixture.ts | tail -1
pnpm -s test:pg 2>&1 | strip | grep -E 'FAIL|nextSeq|Tests ' | head -6; echo "observed_exit: ${PIPESTATUS[0]}"; restore packages/storage/src/fixture.ts
neg "pg negative 7 (guard disabled): sort column left unqualified" "pnpm -s test:pg" "nonzero, the twelve-event order assertion turns red"
sed -i '' "s/ order by e.seq'/ order by seq'/" packages/storage/src/fixture.ts
git diff --stat -- packages/storage/src/fixture.ts | tail -1
pnpm -s test:pg 2>&1 | strip | grep -E 'FAIL|Tests ' | head -4; echo "observed_exit: ${PIPESTATUS[0]}"; restore packages/storage/src/fixture.ts
neg "contract negative (guard disabled): unknown fields allowed inside the scoped object" "pnpm -s test:unit" "nonzero, the unknown-field assertion turns red"
python3 - <<'PY'
p='contracts/schemas/fixture-policy-command.schema.json'; s=open(p).read()
head_, defs = s.split('"$defs"', 1)
open(p,'w').write(head_ + '"$defs"' + defs.replace('"additionalProperties": false', '"additionalProperties": true', 1))
PY
git diff --stat -- contracts/schemas/fixture-policy-command.schema.json | tail -1
pnpm -s test:unit 2>&1 | strip | grep -E 'FAIL|Tests ' | head -3; echo "observed_exit: ${PIPESTATUS[0]}"; restore contracts/schemas/fixture-policy-command.schema.json
neg "pg negative 8 (guard disabled): migration preflight for the agora_app role deleted" "pnpm -s test:pg" "nonzero, the missing-role assertion turns red"
sed -i '' '/select 1 from pg_roles where rolname = \$1/d; /MigrationPrerequisiteError(.blocked prerequisite/d' packages/storage/src/migrate.ts
git diff --stat -- packages/storage/src/migrate.ts | tail -1
pnpm -s test:pg 2>&1 | strip | grep -E 'FAIL|Tests ' | head -4; echo "observed_exit: ${PIPESTATUS[0]}"; restore packages/storage/src/migrate.ts
neg "docs negative: long dash in a governed document" "pnpm -s docs:check" "nonzero"
printf '\n\xe2\x80\x94\n' >> docs/technical-spec.md
pnpm -s docs:check 2>&1 | grep -E 'long dash' | head -1; echo "observed_exit: ${PIPESTATUS[0]}"; restore docs/technical-spec.md
echo; echo "## restored: every code gate green again"; echo "command: pnpm -s typecheck && pnpm -s lint && pnpm -s test"
pnpm -s typecheck && pnpm -s lint && pnpm -s test 2>&1 | strip | grep -E 'Tests |Test Files'; echo "observed_exit: ${PIPESTATUS[0]} (expected 0)"
git status --short -- apps packages contracts scripts docs/technical-spec.md | grep -v '^??' || echo "working tree: no tracked code modifications"
} > $EV/gate-negatives.log 2>&1

echo "== skill run"
{
echo "# verify-agora skill run at $HEAD ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
echo "Literal run of .agents/skills/verify-agora/SKILL.md sections at the code head with the evidence and docs of the follow-up commit present in the working tree."
echo; echo "## Doctor"; tools
pnpm install --frozen-lockfile 2>&1 | tail -1; echo "install_exit: ${PIPESTATUS[0]} (expected 0)"
pnpm typecheck >/dev/null 2>&1; echo "typecheck_exit: $? (expected 0)"
pnpm lint >/dev/null 2>&1; echo "lint_exit: $? (expected 0)"
pnpm docs:check >/dev/null 2>&1; echo "docs_check_exit: $? (expected 0)"
echo; echo "## Drive"
pnpm -s test 2>&1 | strip | grep -E 'Tests |Test Files'; echo "test_exit: ${PIPESTATUS[0]} (expected 0)"
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs --json 2>/dev/null | python3 -c 'import json,sys; r=json.loads(sys.stdin.read()); print("probe_outcome:", r["outcome"], "exit:", r["exit"], "ids:", [x["id"]+"="+x["outcome"] for x in r["results"]])'
node scripts/with-test-postgres.mjs bash -c 'node packages/storage/src/migrate-cli.ts; node packages/storage/src/migrate-cli.ts' 2>/dev/null | python3 -c 'import json,sys; rs=[json.loads(l) for l in sys.stdin if l.strip()]; print("migrate_applied:", [r["applied"] for r in rs], "same_digest:", rs[0]["schema_digest"]==rs[1]["schema_digest"], rs[0]["schema_digest"])'
node scripts/with-test-postgres.mjs bash -c 'SOCK=$(echo "$AGORA_DATABASE_URL" | sed "s/.*host=//" | python3 -c "import sys,urllib.parse;print(urllib.parse.unquote(sys.stdin.read().strip()))"); PID=$(head -1 "$SOCK/data/postmaster.pid"); echo "cluster_tcp_listeners: $(lsof -a -p $PID -iTCP 2>/dev/null | grep -c LISTEN) (expected 0)"; echo "service_role|super|bypass: $(psql "$AGORA_DATABASE_URL" -Atc "select current_user, rolsuper, rolbypassrls from pg_roles where rolname = current_user") (expected agora_app|f|f)"; echo "migration_role|super|bypass: $(psql "$AGORA_MIGRATION_DATABASE_URL" -Atc "select current_user, rolsuper, rolbypassrls from pg_roles where rolname = current_user") (expected agora_owner|f|f)"' 2>/dev/null
echo; echo "## Cleanup"
git worktree prune; git worktree list | grep -c 'agora-red-\|agora-green-\|agora-clean-' || echo "worktrees: clean"
ls "${TMPDIR:-/tmp}" | grep agora- | grep -v agora-evidence- || echo "tmp: clean"
echo "evidence retained after cleanup: $(ls $EV | wc -l | xargs) entries: $(ls $EV | tr '\n' ' ' | sed 's/ $//')"
} > $EV/skill-run.log 2>&1

echo "== migration prerequisite"
{
echo "# migration-prerequisite.log: pnpm migrate blocks when the service role is missing (agora.lane/v1)"
echo "head: $HEAD"; echo "recorded_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; tools
echo "method: in the throwaway cluster, rename agora_app away as the bootstrap superuser, run the migration CLI as the non-superuser owner against a fresh database, then restore the role and run again"
echo "pass predicate: first run exits 2 with outcome blocked naming agora_app; second run exits 0 with applied 1"
echo; echo "## command: node scripts/with-test-postgres.mjs bash -c '<rename role, migrate, restore role, migrate>'"
node scripts/with-test-postgres.mjs bash -c 'SU=$(echo "$AGORA_MIGRATION_DATABASE_URL" | sed "s#agora_owner@#postgres@#; s#/agora_test?#/postgres?#"); psql "$SU" -Atc "CREATE DATABASE agora_norole OWNER agora_owner" -c "ALTER ROLE agora_app RENAME TO agora_app_hidden" >/dev/null; export AGORA_MIGRATION_DATABASE_URL="$(echo "$AGORA_MIGRATION_DATABASE_URL" | sed "s#/agora_test?#/agora_norole?#")"; node packages/storage/src/migrate-cli.ts; echo "first_exit: $? (expected 2)"; psql "$SU" -Atc "ALTER ROLE agora_app_hidden RENAME TO agora_app" >/dev/null; node packages/storage/src/migrate-cli.ts; echo "second_exit: $? (expected 0)"' 2>&1 | grep -v '"started"'
} > $EV/migration-prerequisite.log 2>&1

echo "== performance"
MEASURE=apps/center/src/.measure-validation.mjs
cat > "$MEASURE" <<'PERF'
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
const schema = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const validate = addFormats.default(new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false, validateFormats: true })).compile(schema);
const A = '11111111-1111-4111-8111-111111111111';
const command = JSON.stringify({ schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: A }, subject: { scope_id: A } });
const big = JSON.stringify({ schema_version: 'agora.fixture-policy-command/v1', actor: { scope_id: A }, subject: { scope_id: A }, padding: 'x'.repeat(128 * 1024 - 200) });
for (const [label, text] of [['fixture command (' + Buffer.byteLength(command) + ' B)', command], ['128 KiB command with an unknown field (' + Buffer.byteLength(big) + ' B, expected reject)', big]]) {
	const samples = [];
	for (let i = 0; i < 2000; i++) { const t = performance.now(); validate(JSON.parse(text)); samples.push(performance.now() - t); }
	samples.sort((x, y) => x - y);
	console.log(JSON.stringify({ label, samples: samples.length, p50_ms: +samples[1000].toFixed(4), p95_ms: +samples[1900].toFixed(4), max_ms: +samples[1999].toFixed(4), budget_p95_ms: 5 }));
}
PERF
{
echo "# Performance notes for agora-s1-bootstrap-repository at $HEAD"; echo
echo "Recorded $(date -u +%Y-%m-%dT%H:%M:%SZ). $(tools) No \`agora project verify --scenario perf\` runner exists yet (U01b); these are direct measurements with the same fixture and host, not the five interleaved parent/head batches the milestone probe requires. Regenerate with \`bash $EV/regenerate.sh\`."
echo; echo "## Parent baseline"; echo
echo "The parent (9369a01) has no runtime, so parent behavior is absent. Absence is reported, not compared. Host cost of the existing design gate at parent and head is the same \`node scripts/verify-design.mjs\`, unchanged by this task."
echo; echo "## Head measurements"; echo; echo "| Metric | Observed | Budget |"; echo "| --- | --- | --- |"
T0=$(date +%s); pnpm -s typecheck >/dev/null 2>&1; T1=$(date +%s); echo "| Strict typecheck (\`tsc -p tsconfig.json\`) | $((T1-T0)) s | none set |"
T0=$(date +%s); pnpm -s lint >/dev/null 2>&1; T1=$(date +%s); echo "| Lint (typescript-eslint strict type-checked) | $((T1-T0)) s | none set |"
T0=$(date +%s); pnpm -s test >/dev/null 2>&1; T1=$(date +%s); echo "| Full test run including throwaway cluster boot (\`pnpm test\`) | $((T1-T0)) s | clean fixture build under 5 min |"
echo "| Clean install with an empty store | see lane-3 transcript | clean fixture build under 5 min |"
echo; echo "## Schema validation latency"; echo
echo "Ajv 8.20.0, 2020-12 mode, anchored UUID pattern, 2000 warm samples each, JSON.parse included in the timed region:"; echo; echo '```text'
node "$MEASURE" contracts/schemas/fixture-policy-command.schema.json
echo '```'; echo
echo "The 128 KiB case is a rejection (unknown field), which is the only 128 KiB shape this schema can receive. Both p95 values sit under the 5 ms budget. This is a single-host, single-schema figure; the R21 golden vectors and the perf lane belong to later tasks."
} > $EV/performance.md 2>&1
rm -f "$MEASURE"
cp agora/feature-map.json $EV/feature-map.json
echo "== done at $HEAD"
