---
name: verify-agora
description: Project-owned instructions that prove the Agora foundation fixture, its portable contracts, the persisted local-development room (local-room L1 through L3), the read-only deterministic local-answer core (L5 pure-core preparation) and the independent Agora/Python project verification controls from the public surface. Use before closing any task that touches apps/center, packages/domain, packages/storage, packages/client-core, packages/verification, contracts or agora/feature-map.json. Scope U01a.B01 through U01a.B04, U01b.B01 through U01b.B03, U01c.B01 slice 1 (encrypted backup artifact and same-cluster verified restore), U21.B01 (build-time Feature discovery), local-room L1 through L3, L5 pure-core preparation (no response posting or browser qualification), CI P0a design-negative sandbox closure, CI P0b toolchain/native doctor, and CI P0c A/B/C allocation, wrapper lifecycle and qualification.
---

# Verify Agora

Every step is a literal command run from the repository root. Record outputs under `evidence/U01a/<task>/` (local-room slices: `evidence/local-room/<slice>/`; U01b project-controls slices: `evidence/U01b/<task>/`; U01c backup slices: `evidence/U01c/<task>/`), or under a scratch path when the run must leave no project changes. A command that cannot run is a blocked prerequisite, not a pass. The feature map is `agora/feature-map.json`; a change to any path it lists invalidates that feature's scenarios until the Drive step passes again at the new head. Project-controls commands (`pnpm -s agora project ...`, `python3 packages/verification/fixture/project.py ...`) use ordinary Node 24 without inherited forge credentials and are local foundation-fixture proof, not product authority or U01b qualification beyond B01. Read [project controls](../../../docs/site/project-controls.md) for prerequisites and trust limits.

## Doctor

Toolchain and static checks only. P0b requires Node 24.21.0 and pnpm 10.34.1 exactly, plus the real Vitest/Vite Rolldown native import. Run the read-only doctor after the frozen install below; exit 2 is a blocked prerequisite, never behavioral red. Use `node scripts/ci-doctor.mjs --json` directly if pnpm cannot start. Remaining checks require PostgreSQL 18.x server binaries, Swift 6 and Python 3 with the locked independent validator; P0b does not qualify their exact pins. Project-controls installation is explicit; `project doctor` itself is read-only. Missing prerequisites block, never skip. Mandatory CI, PostgreSQL fixture hardening, React guardrails and hosted enforcement remain unimplemented.

```sh
unset GH_TOKEN GITHUB_TOKEN
node --version
pnpm --version
pg_ctl --version
swift --version
python3 -m venv .scratch/python
.scratch/python/bin/pip install -r packages/verification/fixture/requirements.txt
export PATH="$PWD/.scratch/python/bin:$PATH"
pnpm install --frozen-lockfile
node scripts/ci-doctor.mjs --json
node --test scripts/test/ci-doctor.test.ts
pnpm audit --json
pnpm typecheck
pnpm lint
pnpm docs:check
node scripts/verify-design.mjs
node scripts/test-design-checks.mjs
pnpm -s agora project doctor --json
python3 packages/verification/fixture/project.py doctor --json
pnpm -s agora project scenarios --json
python3 packages/verification/fixture/project.py scenarios --json
```

Design-negative P0a pass predicates: `verify-design` exits 0 on the real tree; `test-design-checks` prints `PASS accepts baseline`, `PASS rejects omitted-application-source`, every other named mutation rejection with its reason, and `PASS 24 behavioral design-check cases`. The disposable sandbox must copy `apps` and `agora`, and the root `eslint.config.js`, so legitimate decision evidence such as `apps/center/src/app.ts`, `agora/architecture-exceptions.json` and `eslint.config.js` resolve. This is fixture honesty only - it is not hosted CI, not full `pnpm check` coverage of every standalone negative, and not product acceptance. Receipts: `evidence/ci/P0a/`.

P0b alone launches no service. Drive `node --test scripts/test/ci-doctor.test.ts`: known-good actual native import passes, wrong Node/pnpm and unavailable native binding report blocked. Each omitted probe in a disposable copy makes its own denial assertion fail. Evidence: use the recorder below with `--parent f98a7b6b51465f6a6a47cb01c6163dac2d6c8eec --head <code-head> --out .scratch/P0b/replay -- node --test scripts/test/ci-doctor.test.ts`; retain P0b receipts under `evidence/ci/P0b/`. Cleanup removes only owned `.scratch/doctor-*` copies, never receipts. Full fixture verification still follows below and may be independently blocked.

### Trusted checks doctor (U01b.B03)

Read-only. `policy` must exit 0 and print the Agora project. Run the live read-back with an ordinary read-only `gh` login; it never writes to GitHub. Until a human enrolls the reporting App and key, every `evaluate` against the committed policy exits 2 with `reporting_app_unenrolled`, and the Python fixture exits 2 with `repository_unprovisioned`. That is a blocked prerequisite, not a pass.

```sh
node scripts/trusted-checks.mjs policy --json
gh api repos/tayler-id/agent-team-workspace --jq '{id,private,visibility,default_branch}'
gh api repos/tayler-id/agent-team-workspace/branches/main/protection > .scratch/protection.json
node scripts/trusted-checks.mjs evaluate --kind protection --input .scratch/protection.json --json
H=$(git rev-parse HEAD)
gh api repos/tayler-id/agent-team-workspace/commits/$H/check-runs --jq "{head_sha:\"$H\",check_runs:[.check_runs[]|{id,name,app_id:.app.id,head_sha,status,conclusion,output:{text:.output.text}}]}" > .scratch/check-runs.json
node scripts/trusted-checks.mjs evaluate --kind checks --input .scratch/check-runs.json --json
gh api repos/tayler-id/agent-team-workspace/actions/variables/AGORA_REPORTER_ENABLED
```

The `checks` read-back needs that reshape until slice F5 accepts GitHub's raw `app.id` rows and takes the head from the request. The variable read must return 404 until enrollment, so the reporter job stays skipped.

The protection read-back currently returns HTTP 403 "Upgrade to GitHub Pro or make this repository public to enable this feature." With the committed policy the evaluation exits 2 with `reporting_app_unenrolled` first; against an enrolled policy the same body exits 2 with `plan_upgrade_required`.

### Production build (built room)

The built fixture room needs only the Node and pnpm pins above, a Chrome that `chrome-devtools-axi` can start, and loopback port 4394 free. No database or Launch-step runtime is involved. A listener already on 4394 belongs to someone else, so report the step blocked and leave that process alone.

```sh
command -v chrome-devtools-axi
lsof -nP -iTCP:4394 -sTCP:LISTEN
```

`lsof` must print nothing.

## Launch

`scripts/with-test-postgres.mjs` uses the unchanged owned short-socket allocator and a 30-second startup deadline (`AGORA_PG_STARTUP_TIMEOUT_MS`, 1..300000 ms). It boots a throwaway socket-only PostgreSQL cluster (owner role `agora_owner`, non-owner role `agora_app`, guard-negative role `agora_bypass`, database `agora_test`) for the duration of one command and removes it afterwards. It exports `AGORA_DATABASE_URL` as the service role and `AGORA_MIGRATION_DATABASE_URL` as the owner. To reuse an existing PostgreSQL 18 server, export `AGORA_TEST_DATABASE_URL` (as `agora_app`), `AGORA_TEST_OWNER_DATABASE_URL` (as the schema owner), `AGORA_TEST_BYPASS_DATABASE_URL` (a `BYPASSRLS` member of `agora_app`) and `AGORA_TEST_SUPERUSER_DATABASE_URL` (used only to remove and restore cluster-level prerequisites in one test) and the wrapper passes the command through.

### Project verification controls launch (U01b.B01)

Each start creates a private, non-reusable UUID namespace. Agora uses a socket-only PostgreSQL cluster and non-owner service role. Python independently uses SQLite and JSON Schema. Both bind loopback HTTP port zero, use a private object directory and an authenticated control socket. No ambient database URL is reused. Keep the returned cleanup handle, process start identity and root ownership receipt.

```sh
A=$(node -e 'console.log(crypto.randomUUID())')
B=$(node -e 'console.log(crypto.randomUUID())')
P=$(node -e 'console.log(crypto.randomUUID())')
OUT="evidence/U01b/agora-s1-isolate-development/live-$A"
mkdir -p "$OUT"
export TMPDIR=$(mktemp -d /tmp/agora-u01b-XXXXXX)
printf '%s\n' "$TMPDIR" > "$OUT/temp-owner.txt"
pnpm -s agora project start --profile verify --instance "$A" --json > "$OUT/a-start.json"
pnpm -s agora project start --profile verify --instance "$B" --json > "$OUT/b-start.json"
python3 packages/verification/fixture/project.py start --profile verify --instance "$P" --json > "$OUT/python-start.json"
```

### Owned local runtime launch (L3)

Use an official Node 24 binary; a host-signed launcher can prevent native toolchain bindings from loading. The local runtime ignores developer database URLs and creates its own private cluster. No migration owner serves product queries. Keep `INSTANCE` for Cleanup:

```sh
INSTANCE=verify-l3-$(date +%s)
node scripts/local-room.ts doctor
node scripts/local-room.ts start --instance "$INSTANCE"
```

Expected: JSON `outcome: pass`, fresh launch UUID, exact owned root/PIDs/PostgreSQL port and harness `url`. Open that URL with the approved browser driver. It serves the apps/web room shell over the live runtime (L4 first slice), not the finished room UI. No external accounts or production credentials are needed.

### Trusted checks launch (U01b.B03)

Nothing starts. The decision tool reads JSON files and the lane suite writes its namespaced fixtures (App 900001, repository 900002, fresh Ed25519 keys) under one `.scratch/trusted-checks-*` directory that it removes itself.

### Encrypted backup and restore launch (U01c.B01 slice 1)

There is no long-lived service. Each drive runs inside one `with-test-postgres.mjs` invocation, which owns the throwaway cluster and removes it on exit. The restore target is a second database in that same cluster, not a separate host. Create a private work directory for keys, objects and backups; it must never sit under `evidence/`, because it holds key files. Keep `W` for Cleanup:

```sh
W=$(mktemp -d "${TMPDIR:-/tmp}/agora-backup-verify-XXXXXX")
OUT=evidence/U01c/agora-s1-prove-backup-restore/drive
mkdir -p "$OUT"
cat > "$W/drive.sh" <<'EOF'
set -u
W=$1; OUT=$2; SU=$AGORA_TEST_SUPERUSER_DATABASE_URL
PSQL=${AGORA_PG_BIN:+$AGORA_PG_BIN/}psql
TARGET=$(printf '%s' "$SU" | sed 's#/agora_test?#/agora_restore_verify?#')
run() { name=$1; shift; node scripts/backup.ts "$@" > "$OUT/$name.json"; echo $? > "$OUT/$name.exit"; }
user_tables() { "$PSQL" "$TARGET" -Atc "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind in ('r','p') and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'"; }
node packages/storage/src/migrate-cli.ts > "$OUT/migrate.json"
mkdir "$W/keys" "$W/objects"
printf 'first artifact\n' > "$W/objects/a.txt"
printf '\377\376\000\001binary' > "$W/objects/b.bin"
printf 'third artifact\n' > "$W/objects/c.txt"
run keygen-good keygen --key "$W/keys/good"
run keygen-wrong keygen --key "$W/keys/wrong"
run create create --database-url "$SU" --objects "$W/objects" --key "$W/keys/good" --out "$W/backup"
"$PSQL" "$SU" -v ON_ERROR_STOP=1 -c 'create database agora_restore_verify owner agora_owner'
run wrong-key restore --backup "$W/backup" --key "$W/keys/wrong" --database-url "$TARGET" --objects "$W/restored"
cp -R "$W/backup" "$W/corrupt"
node -e 'const fs=require("fs"),f=process.argv[1],b=fs.readFileSync(f);b[b.length>>1]^=1;fs.writeFileSync(f,b)' "$W/corrupt/database.agb"
run corrupt restore --backup "$W/corrupt" --key "$W/keys/good" --database-url "$TARGET" --objects "$W/restored"
cp -R "$W/backup" "$W/missing"
rm "$W/missing/objects/0002.agb"
run missing restore --backup "$W/missing" --key "$W/keys/good" --database-url "$TARGET" --objects "$W/restored"
user_tables > "$OUT/target-tables-after-denials.txt"
test -e "$W/restored"; echo $? > "$OUT/restored-absent-after-denials.exit"
run restore restore --backup "$W/backup" --key "$W/keys/good" --database-url "$TARGET" --objects "$W/restored"
run restore-again restore --backup "$W/backup" --key "$W/keys/good" --database-url "$TARGET" --objects "$W/restored-again"
cmp "$W/objects/b.bin" "$W/restored/b.bin"; echo $? > "$OUT/binary-object-cmp.exit"
EOF
```

### Production build (built room)

Build the fixture room with its real `apps/web/vite.config.ts`, then serve the output on the owned port. `OUT` is `evidence/U01d/production-browser-csp/browser` for the retained run or a scratch path for a rerun. `RUN` is ignored scratch that holds the preview log and both PIDs, so no process handle lands in evidence. `$!` is the pnpm wrapper, and the `lsof` line records the vite listener that Cleanup stops.

```sh
OUT=evidence/U01d/production-browser-csp/browser
RUN=.scratch/built-room-preview
mkdir -p "$OUT" "$RUN"
pnpm web:build
grep -o 'http-equiv="Content-Security-Policy" content="[^"]*"' apps/web/dist/index.html > "$OUT/csp.txt"
pnpm --filter @agora/web exec vite preview --strictPort --port 4394 --host 127.0.0.1 > "$RUN/preview.log" 2>&1 &
echo $! > "$RUN/preview-wrapper.pid"
for i in $(seq 50); do curl -sf -o /dev/null http://127.0.0.1:4394/ && break; sleep 0.2; done
lsof -nP -t -iTCP:4394 -sTCP:LISTEN > "$RUN/preview.pid"
```

The `content` value in `csp.txt` must equal `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'`, with each single quote escaped as `&#39;` and no `unsafe-eval` or `unsafe-inline`. `preview.pid` must hold one PID. A build that exits 0 is not the proof; the Drive probe is.

## Drive

CI P0c A's allocation driver requires Node 24 and Vitest, not PostgreSQL or Swift. B's wrapper driver additionally requires PostgreSQL 18 binaries and proves deep-path non-owner access, success/failure cleanup, SIGINT/SIGTERM (also during startup), forced shutdown, initialization/readiness timeouts and foreign/neighborhood preservation. Retain outputs under `evidence/ci/P0c/C/`. C's drivers replay ten guard negatives in a disposable source copy and twenty-seven lifecycle scenarios against the committed wrapper with real PostgreSQL 18; both must exit 0 and leave `leftovers` empty in `no-leftovers.json`.

```sh
pnpm exec vitest run --project unit packages/storage/test/postgres-socket.test.ts packages/storage/test/postgres-wrapper.test.ts --disableConsoleIntercept
node evidence/ci/P0c/C/driver/guard.mjs --out .scratch/p0c-c
node evidence/ci/P0c/C/driver/scenarios.mjs --out .scratch/p0c-c
```

For U01b.B01's project verification controls, pass means literal public allow/deny results, exactly two additional persisted journal entries and matching object bytes. The task lane runner additionally proves two simultaneous instances of each application, foreign cleanup refusal, missing/altered/stale evidence rejection, missing runners, report/exit disagreement, instruction drift and deleted required coverage. Its isolated guard mutation must fail the original denial assertion. This is CLI/HTTP proof, not a screenshot or a browser application claim.

```sh
pnpm -s agora project verify --scenario policy --instance "$A" --artifacts "$OUT/a" --json
pnpm -s agora project verify --scenario policy --instance "$B" --artifacts "$OUT/b" --json
python3 packages/verification/fixture/project.py verify --scenario policy --instance "$P" --artifacts "$OUT/python" --json
pnpm -s agora project lanes --unit U01b --task agora-s1-isolate-development --artifacts "$OUT/lanes" --json
pnpm contracts:check
pnpm contracts:conform -- --json
pnpm client:replay -- --json --swift
pnpm boundaries
pnpm exec vitest run --project unit packages/domain/test/local-answer.test.ts packages/domain/test/local-answer-guards.test.ts --reporter=json
pnpm test
node scripts/probe-center.mjs --scenarios
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs
node scripts/with-test-postgres.mjs bash -c 'node packages/storage/src/migrate-cli.ts; node packages/storage/src/migrate-cli.ts'
```

For the U01c.B01 encrypted backup slice, run the end-to-end test and then the CLI drive written at Launch. Each runs in its own owned cluster:

```sh
node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg packages/storage/test/backup.pg.test.ts
node scripts/with-test-postgres.mjs bash "$W/drive.sh" "$W" "$OUT" 2> "$OUT/wrapper.ndjson"
node --input-type=module -e '
import fs from "node:fs"; import path from "node:path"; import assert from "node:assert/strict";
const [w, out] = process.argv.slice(1); const j = (n) => JSON.parse(fs.readFileSync(`${out}/${n}.json`, "utf8")); const x = (n) => fs.readFileSync(`${out}/${n}.exit`, "utf8").trim();
const create = j("create"), good = j("keygen-good");
assert.equal(x("keygen-good"), "0"); assert.equal(good.outcome, "created"); assert.match(good.key_id, /^sha256:[0-9a-f]{64}$/);
assert.equal(x("create"), "0"); assert.equal(create.outcome, "created"); assert.equal(create.key_id, good.key_id); assert.equal(create.objects, 3);
for (const [n, reason, subject] of [["wrong-key", "wrong_key", "backup.json"], ["corrupt", "corrupt", "database.agb"], ["missing", "missing_artifact", "objects/0002.agb"]]) {
	assert.equal(x(n), "1", n); assert.deepEqual([j(n).outcome, j(n).reason_code, j(n).subject], ["denied", reason, subject]);
}
assert.equal(fs.readFileSync(`${out}/target-tables-after-denials.txt`, "utf8").trim(), "0"); assert.equal(x("restored-absent-after-denials"), "1");
const r = j("restore"); assert.equal(x("restore"), "0"); assert.equal(r.outcome, "restored");
assert.deepEqual([r.backup_id, r.inventory_digest, r.tables, r.objects], [create.backup_id, create.inventory_digest, create.tables, 3]);
assert.equal(x("restore-again"), "1"); assert.equal(j("restore-again").reason_code, "target_not_empty"); assert.equal(x("binary-object-cmp"), "0");
const key = fs.readFileSync(`${w}/keys/good`, "utf8").slice(0, 64), raw = Buffer.from(key, "hex");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of [...walk(`${w}/backup`), ...walk(out)]) { const b = fs.readFileSync(f); assert.ok(!b.includes(key) && !b.includes(raw), f); }
console.log(JSON.stringify({ outcome: "pass", backup_id: create.backup_id, inventory_digest: create.inventory_digest, tables: create.tables, objects: create.objects }));
' "$W" "$OUT"
```

Backup predicates: the pg test file exits 0 with every test passing; its key-absence, wrong-key, corruption and missing-file tests run before the successful restore. `wrapper.ndjson` holds a `cleaned` record for the identity it `allocated`. The assertion command prints `outcome: pass`, which requires: both keygens exit 0 with a `sha256:` `key_id`; `create` exits 0 with `outcome: created` and `objects: 3`; `wrong-key`, `corrupt` and `missing` each exit 1 with `outcome: denied` and reason/subject `wrong_key`/`backup.json`, `corrupt`/`database.agb` and `missing_artifact`/`objects/0002.agb`; the target still has 0 user tables and no `restored` directory after those three; `restore` exits 0 with `outcome: restored` and the create receipt's `backup_id`, `inventory_digest`, `tables` and `objects`; `restore-again` exits 1 with `target_not_empty`; the restored non-UTF-8 object is byte-equal; and neither the key hex nor its 32 raw bytes appear in any backup file or retained output. The CLI drive's database is the migrated schema only (its two migration rows and the seeded local room); the app-role seeded events and claims are covered by the pg test. No predicate compares `schemaDigest()`, because `pg_restore` re-deparses the `local_room.message_body_check` constraint text; the pg test checks the migration journal instead (`migrate()` on the target applies 0). This proves one throwaway cluster, not separate-host restore, WAL, key recovery, epoch fencing or RPO/RTO.

For L3, also run these against the launched instance, retaining stdout outside its root:

```sh
node scripts/local-room.ts status --instance "$INSTANCE"
node scripts/local-room.ts send --instance "$INSTANCE" --body 'Verification message'
node scripts/local-room.ts history --instance "$INSTANCE"
node scripts/local-room.ts replay --instance "$INSTANCE" --after 0
node scripts/local-room.ts evidence --instance "$INSTANCE"
pnpm exec vitest run --project unit apps/center/test/runtime.test.ts
node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg apps/center/test/runtime.pg.test.ts
```

L3 predicates: every CLI report is `agora.local-runtime/v1`, `outcome: pass` with exit 0; the history contains the sent body; replay carries that same message ID and sequence. The pg tests prove snapshot/replay interleaving, accepted send without receipt, receipt-only cursor immobility, duplicate/gap repair, numeric multi-page replay, two same-port restarts, reset, parallel start, cancelled startup, 403 Host/Origin/stop negatives, 413 body bound, 429 rate bound, foreign record/listener/symlink refusal and cleanup. Unit negatives run a normally denied input and an isolated one-guard-disabled copy; the latter must fail its assertion. Core replay/guard tests remain mandatory. Drive the browser with the L4 two-tab recipe below.

For the L4 live room, drive two tabs of the launched `url` with `chrome-devtools-axi` in its own session. If the npx copy of `chrome-devtools-mcp` fails with `ERR_MODULE_NOT_FOUND: pkce-challenge`, install `chrome-devtools-mcp@1.10.0` and `pkce-challenge` into a scratch directory and point `CHROME_DEVTOOLS_AXI_MCP_PATH` at its `build/src/bin/chrome-devtools-mcp.js`. `URL` is the start report's `url`:

```sh
export CHROME_DEVTOOLS_AXI_SESSION=verify-l4
PROBE='JSON.stringify({rows:[...document.querySelectorAll("article")].map(a=>a.lastElementChild.textContent),b:document.querySelectorAll("b").length,mains:document.querySelectorAll("main").length,status:document.querySelector("[role=status]").textContent,composer:document.getElementById("composer-state").textContent})'
chrome-devtools-axi open "$URL"                      # tab A
chrome-devtools-axi press Tab; chrome-devtools-axi press Tab
chrome-devtools-axi eval 'document.activeElement.id'  # composer-text
chrome-devtools-axi type 'hello from tab A <b>x</b>'; chrome-devtools-axi press Enter
chrome-devtools-axi newpage "$URL"                   # tab B
node scripts/local-room.ts send --instance "$INSTANCE" --body 'from the CLI'
chrome-devtools-axi pages                            # then selectpage each tab and eval "$PROBE"
node scripts/local-room.ts stop --instance "$INSTANCE"
chrome-devtools-axi eval 'document.getElementById("composer-text").focus()'
chrome-devtools-axi type 'sent while down'; chrome-devtools-axi press Enter; chrome-devtools-axi press Enter
chrome-devtools-axi eval "$PROBE"
node scripts/local-room.ts start --instance "$INSTANCE"
node scripts/local-room.ts history --instance "$INSTANCE"
chrome-devtools-axi eval '(()=>{const t=document.getElementById("composer-text");t.focus();Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(t,"x".repeat(4097));t.dispatchEvent(new Event("input",{bubbles:true}));return t.maxLength})()'
chrome-devtools-axi press Enter
chrome-devtools-axi eval 'JSON.stringify(performance.getEntriesByType("resource").filter(e=>e.name.endsWith("/messages")).map(e=>e.responseStatus))'
chrome-devtools-axi open "$URL"                      # reload; eval "$PROBE"
chrome-devtools-axi emulate --viewport "390x844x3,mobile,touch"; chrome-devtools-axi screenshot "$OUT/390x844.png"
chrome-devtools-axi emulate --viewport "1440x900x1"; chrome-devtools-axi screenshot "$OUT/1440x900.png"
chrome-devtools-axi console
chrome-devtools-axi stop
CHROME_DEVTOOLS_AXI_SESSION=verify-l4-rm CHROME_DEVTOOLS_AXI_CHROME_ARGS=--force-prefers-reduced-motion chrome-devtools-axi open "$URL"
CHROME_DEVTOOLS_AXI_SESSION=verify-l4-rm chrome-devtools-axi eval 'JSON.stringify({reduce:matchMedia("(prefers-reduced-motion: reduce)").matches,animations:document.getAnimations().length})'
CHROME_DEVTOOLS_AXI_SESSION=verify-l4-rm chrome-devtools-axi stop
```

L4 predicates: focus lands on `composer-text` after two Tabs and stays there after Enter; both tabs and the CLI message show in both tabs without a reload, in the same order; markup renders as text (`b` count 0) and the page has one `main`. With the service stopped, the double Enter leaves `1 pending command`, and after `start` history holds exactly one `sent while down`. Background tabs are throttled, so select a tab before expecting it to catch up. The 4097-character body produces exactly one `/messages` 400 with no retry, and the composer shows `stop: not sent (HTTP 400 malformed_command); the draft is kept`. Reload shows the same persisted order. At 390x844, `scrollWidth` equals `clientWidth` and the shell reports `phone`. The console has no messages. The reduced-motion probe reports `reduce: true` and zero running animations. This proves the first L4 slice only. Manual Disconnect/Reconnect, per-command delivery states and session drafts have since landed. Since then the composer shows per-command lines (`Failed: HTTP 400 malformed_command.`) instead of the aggregate pending count and the `stop:` text above, and the console shows one known CSP block on a `data:` font. Those two predicates were not re-run at the handoff head; see `evidence/handoff/README.md`. Browser receipt-failure proof lives in `evidence/local-room/delivery-feedback/receipt-failure-browser/README.md`.

For L4 session drafts, drive one tab of a fresh instance. Use placeholder text only. `PORT` is the port in the start report's `url`:

```sh
export CHROME_DEVTOOLS_AXI_SESSION=verify-drafts
curl -s -D - -o /dev/null "$URL/api/v1/local-room/snapshot"   # x-agora-instance equals the start report's launch
DRAFTS='JSON.stringify({w:innerWidth,composer:document.getElementById("composer-text").value,state:document.getElementById("composer-state").textContent,keys:Object.keys(sessionStorage).map(k=>k.split(":")[0]),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth})'
chrome-devtools-axi open "$URL"; chrome-devtools-axi emulate --viewport "1440x900x1"
chrome-devtools-axi eval 'document.getElementById("composer-text").focus()'; chrome-devtools-axi type 'placeholder draft one'
chrome-devtools-axi open "$URL"; chrome-devtools-axi eval "$DRAFTS"               # draft restored
node scripts/local-room.ts stop --instance "$INSTANCE"
node scripts/local-room.ts reset --instance "$INSTANCE" --confirm-disposable
node scripts/local-room.ts start --instance "$INSTANCE" --port "$PORT"
chrome-devtools-axi open "$URL"; chrome-devtools-axi eval "$DRAFTS"               # No draft., keys []
chrome-devtools-axi eval '[...document.querySelectorAll("button")].find(b=>b.textContent==="Disconnect").click()'
chrome-devtools-axi eval 'document.getElementById("composer-text").focus()'; chrome-devtools-axi type 'placeholder held send'; chrome-devtools-axi press Enter
chrome-devtools-axi eval "$DRAFTS"                                                 # keys include agora.local-room.pending
chrome-devtools-axi eval '(async()=>{const p=JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find(k=>k.startsWith("agora.local-room.pending:"))));const s=await (await fetch("/api/v1/local-room/snapshot")).json();const r=await fetch("/api/v1/local-room/messages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({schema_version:"agora.local-room.send-message/v1",command_id:p.commandId,scope:s.scope,body:p.text,citations:[]})});return r.status})()'
chrome-devtools-axi open "$URL"; chrome-devtools-axi eval 'document.getElementById("composer-text").focus()'; chrome-devtools-axi press Enter
node scripts/local-room.ts history --instance "$INSTANCE"                          # one 'placeholder held send'
chrome-devtools-axi emulate --viewport "390x844x3,mobile,touch"
chrome-devtools-axi eval 'document.getElementById("composer-text").focus()'; chrome-devtools-axi type 'placeholder phone draft'
chrome-devtools-axi open "$URL"; chrome-devtools-axi eval "$DRAFTS"; chrome-devtools-axi screenshot "$OUT/390x844-drafts.png"
chrome-devtools-axi console --type error; chrome-devtools-axi stop
```

Session-draft predicates: the reload restores the draft at both viewports with `overflow` 0. After the same-port reset the composer reads `No draft.` and `sessionStorage` is empty. A send held by Disconnect writes an `agora.local-room.pending` key. After the out-of-band commit, reload and Send, the page makes one `/messages` request, the composer and storage clear, and `history` holds exactly one `placeholder held send` under the pending record's command id. The only console error is the known `data:` font CSP block. A duplicated tab, a live in-flight POST at reload and an identity outage are not driven here; `apps/web/test/live.test.ts` covers the last two with mocked fetch. The integrated run is in `evidence/local-room/session-drafts-integrated/README.md`.

Pass predicates:

- `pnpm contracts:check` prints `"outcome": "pass"` with an empty `drift` list; `"outcome": "unavailable"` (exit 3) means the Swift generator could not run and the step is blocked, not passed.
- `pnpm contracts:conform` prints `"outcome": "pass"` with `"swift": "pass"` and every result `pass`; a `fail` result names the vector and each consumer's disagreement. This includes the `sync-*` fixture snapshot, event and reusable cursor/receipt vectors. Fixture payloads are not production HTTP operations.
- `contracts/test/sync.test.ts` rejects unsupported event kinds/fields and proves each denial assertion turns red with its guard removed from an isolated schema copy. This is wire rejection, not yet core replay or acknowledgement proof.
- `pnpm client:replay` reports `outcome: pass` only if all six TypeScript snapshots equal their literal golden states; `--swift` additionally requires the independent Swift projections to equal those same states. The transcript includes each contiguous-prefix acknowledgement and replay/upgrade request. No DOM or browser runs in lane 7.
- `packages/client-core/test/sync.test.ts` covers snapshot races, large decimal ordering, receipts, retry, unread, drafts and clearing. `guards.test.ts` repeats the public assertions with one guard disabled per disposable copy; every disabled-guard run must exit 1 for its named assertion. Lane 8 runs through `pnpm boundaries`, writing native JSON to `.scratch/boundaries.json`: all import-form, public-type, private-path, export-map, no-platform and application-architecture fixtures must pass, including guarded-extension renderer/server denials (`.ts`/`.tsx`/`.mts`/`.cts`/`.js`/`.jsx`/`.mjs`/`.cjs`, contracts plain JS/CJS), `apps/web` non-src relocation denials, ambient-declare and computed/mixed-union DOM-mutator denials, string-literal React effect import denials, per-Feature `dependencies.json` denials (declared Feature import allowed; undeclared, malformed and framework-to-Feature rejected, in throwaway Features removed after the run), framework/host foot-guns, `noInlineConfig` disable adversarial cases, architecture-exception validation (including load-time denial on invalid rows), guard-weakening copies, JSDoc `import()` comment edges, DOM property-assignment and `setAttribute`-family mutation denials, untyped `.mjs`/`.cjs` ambiguous-mutator name-trust denials, type-cast receiver-evasion denials, and the `react/jsx-runtime` namespace/default allowance. `packages/client-core/test/client-state-owner.test.ts` (also in `pnpm boundaries`) must show `agora/client-owner` rejecting durable Client state copied into `useState`/`useRef`/`useReducer`, runtime `@agora/client-core` and `createRoomClient` imports, and direct transport commands in a component, each naming the Client hook or Host owner, while ephemeral UI state and the Client/Host/framework owners pass; with the rule set to `off` in an isolated config copy, four of its six tests must go red. `pnpm typecheck` must include `apps/web/tsconfig.json` and exclude `apps/web` from the root program. The negative-rule configurations are isolated test instances, never runtime guard switches.
- `pnpm test` exits 0 with every unit and pg test passing. The pg project refuses to run without a database; the contract tests fail, never skip, without Swift.
- `pnpm web:test` (`pnpm --filter @agora/web exec vitest run --config vitest.config.ts`) exits 0 for `apps/web`'s own Vitest project, separate from the root `pnpm test`/`pnpm boundaries` static coverage of that package. `pnpm web:build` (`pnpm --filter @agora/web build`) exits 0 and produces `apps/web/dist`; an exit 0 alone does not prove the bundle runs under its CSP, so drive the built-room recipe below. `pnpm web:dev` (`pnpm --filter @agora/web dev`, `vite --strictPort --port 4174`) is a foreground dev server, not a one-shot check: launch it in the background, confirm `http://localhost:4174/` returns 200, then stop the owned process (for example `pkill -f "vite --strictPort --port 4174"`) before continuing. Do not leave it running past the check.
- `node scripts/probe-center.mjs --scenarios` prints `agora.probe-scenarios/v1` with exactly sixteen scenario ids and starts no process; it needs no database. Exactly one scenario has `restarts_center: true`.
- The live probe applies migration 0001 as the owner first, then starts the center as the service role. Its report has `"outcome": "pass"` for `health-liveness` (200), `health-readiness` (200), `policy-allow` (200, `decision: allow`), `policy-deny` (200, `reason_code: scope_mismatch`), `policy-unknown-field` (400, `malformed_command`), `unknown-route` (404, `not_found`), `local-room-snapshot-before` (200), `local-room-send-committed` (201, `replayed: false`, revision one above the snapshot's `committed_seq`, `request_digest` equal to the canonical digest of the command), `local-room-send-replayed` (201, byte-equal to the first receipt except `replayed: true`), `local-room-send-changed-body` (409, `command_conflict`), `local-room-send-other-scope` (404, `scope_mismatch`), `local-room-send-unknown-citation` (404, `not_found`), `local-room-send-empty-body` (400), `local-room-send-unknown-field` (400), `local-room-snapshot-after-restart` (200, same cursor and last message after the process was stopped and started) and `local-room-replay-after-restart` (201, the original `message_id`).
- `contracts/test/local-room.test.ts` accepts every `local-room-*` vector that the golden file accepts, refuses each unknown field, variant and bound at its path in TypeScript and Swift, and proves the authorship, event-kind and unknown-field guards turn red with the guard removed from an isolated schema copy. `apps/center/test/local-room.test.ts` proves the health baseline on the same app, the 400 paths, and the typed 404 `unavailable_capability` of a process composed without a persistence adapter.
- `apps/center/test/local-room.pg.test.ts` spawns the real center process as the service role and proves over HTTP: 201 receipt with the canonical request digest and the next room revision, replay with the original receipt, 409 `command_conflict`, 404 `scope_mismatch` and `not_found`, a committed citation, 400 before storage, and an identical snapshot plus a working replay and continued sequence after the process is stopped and started. `packages/storage/test/local-room.pg.test.ts` proves the seeded fixed room, durability across a closed and reopened pool, eight concurrent sends with contiguous sequences and equal event sequences, one message under eight concurrent copies of one command, rollback that consumes no sequence, replay and conflict, citation checks, the 4096-scalar and ten-citation table bounds, project isolation with the `BYPASSRLS` guard negative, and immutability for `agora_app` and the owner.
- The local-answer public package driver reports 14 passing tests. It requires no Launch step or database: supplied fixtures represent validated persisted messages, not storage provenance proof. The behavioral suite proves bounds, numerical chronology, source-specific citations, empty/foreign/missing/unknown denial, deterministic digests/replay, requester/scope/request identity and inert injection-shaped text. The three isolated mutations each require normal exit 0 and weakened exit 1 for the named assertion (`unbounded-selector`, `outside-citation`, `injected-command`). The authority test checks the exact runtime export surface and twelve forbidden import/global probes. No core function accepts a posting handle; the posting port is type-only. This does not qualify final L5 or AC04, and the driver is not a product trigger.
- The first migration report has `applied: 2`; the second has `applied: 0` and the same `schema_digest`.

For U01b.B01's project verification controls: every required command must exit zero, all native lane assertions must pass without skips, and conformance must name both consumers as passing. Whole-unit lanes remain blocked without U01b.B02/B03; the explicit task selector does not qualify that milestone. U01a's historical task-admission driver remains documented in [task proof](../../../docs/site/test-first.md), not a substitute for this task's controls.

### Trusted checks drive (U01b.B03)

Lanes 8-10 drive `node scripts/trusted-checks.mjs evaluate` through the public CLI. Pass means all three lanes pass and the project runner reports `outcome: pass` for the task. Lane 8 passes only a protection read-back with strict exact-App checks, review, stale dismissal, code-owner review, enforced admins and no bypass. Lane 9 must name `wrong_producer` for a check from the GitHub Actions App, `receipt_signature_invalid` for a candidate-signed receipt and `workflow_revision_mismatch` for a modified driver. The committed workflows must pass `--kind workflows` against the committed policy, and edited copies must name `driver_secret_reference`, and each of the fourteen reporter edits (a `display_title` or `toJSON(secrets)` step, a fork checkout, a job-level secret, a dropped `if` and others) must name only `reporter_workflow_not_allowlisted`. A changed `.github/` file, policy or trusted script must name `sensitive_path_changed:PATH`, and ordinary paths must pass. Lane 9's isolated copy that trusts any App must lose `wrong_producer`. Lane 10 must fail a failed dependency with its skipped dependent and a required job given `needs`, `if` or `continue-on-error`, and its copy that accepts any conclusion must pass a skipped job. The reporter tests must report 5 passed against their loopback fake API, including the credential canary reading `true` once for the real reporter and three times for the weakened copy, and a pull request that edits the reporter publishing `agora/policy` as `failure` with no head copy fetched.

```sh
pnpm exec vitest run --project unit packages/verification/test/trusted-checks.test.ts packages/verification/test/trusted-report.test.ts
node -e 'const f=p=>[p,require("fs").readFileSync(p,"utf8")];require("fs").writeFileSync(".scratch/workflows.json",JSON.stringify({changed_paths:[],files:Object.fromEntries([f(".github/workflows/agora-ci.yml"),f(".github/workflows/agora-report.yml")])}))'
node scripts/trusted-checks.mjs evaluate --kind workflows --input .scratch/workflows.json --json
pnpm -s agora project lanes --unit U01b --task agora-s1-qualify-trusted-checks --artifacts ".scratch/trusted-lanes-$(date +%s)" --json
```

### Production build (built room)

Drive the preview from Launch in its own session, at desktop and phone viewports, reloading after each viewport change so the probe reads a fresh module evaluation:

```sh
export CHROME_DEVTOOLS_AXI_SESSION=verify-built-room
URL=http://127.0.0.1:4394/
PROBE='JSON.stringify({rootChildren:document.getElementById("root").childElementCount,fixture:document.body.textContent.includes("Agora local room fixture"),rejected:document.body.textContent.includes("Fixture rejected"),fits:document.documentElement.scrollWidth===document.documentElement.clientWidth,viewport:[innerWidth,innerHeight,devicePixelRatio]})'
chrome-devtools-axi open "$URL"
chrome-devtools-axi emulate --viewport "1440x900x1"; chrome-devtools-axi open "$URL"
chrome-devtools-axi eval "$PROBE" > "$OUT/1440x900-probe.txt"
chrome-devtools-axi screenshot "$OUT/1440x900.png"
chrome-devtools-axi eval '[...document.querySelectorAll("button")].find(b=>b.textContent==="Load fixture snapshot").click()'
chrome-devtools-axi eval 'document.body.textContent.includes("Kicking off the fixture.")' > "$OUT/1440x900-loaded.txt"
chrome-devtools-axi screenshot "$OUT/1440x900-loaded.png"
chrome-devtools-axi console --type error > "$OUT/1440x900-console-errors.txt"
chrome-devtools-axi console > "$OUT/1440x900-console.txt"
chrome-devtools-axi emulate --viewport "390x844x3,mobile,touch"; chrome-devtools-axi open "$URL"
chrome-devtools-axi eval "$PROBE" > "$OUT/390x844-probe.txt"
chrome-devtools-axi screenshot "$OUT/390x844.png"
chrome-devtools-axi console --type error > "$OUT/390x844-console-errors.txt"
chrome-devtools-axi console > "$OUT/390x844-console.txt"
pnpm web:test
pnpm --filter @agora/web exec vitest run --config vitest.config.ts test/built-room.test.ts
```

Built-room predicates: both probes report `rootChildren` above 0, `fixture: true` and `rejected: false`; the 390x844 probe reports `fits: true`. `chrome-devtools-axi console` reports the page loaded by the latest `open`, so each viewport gets its own capture. The only expected console error is a `favicon.ico` 404 on the first load, because the app ships no favicon; any CSP issue fails the run. The rejection path in a real browser (a bundle copy with a non-UUID stream id renders `Fixture rejected: snapshot failed FixtureSyncSnapshot validation`) and the send-plus-receipt drive are in `evidence/U01d/production-browser-csp/browser/drive.sh.txt`. Both `*-console-errors.txt` files read `<no console messages found>`, and neither `*-console.txt` file has an `EvalError`, an `unsafe-eval` mention or a Content Security Policy issue. `1440x900-loaded.txt` reports `true`. The first two screenshots show the room header, the empty timeline with its Load fixture snapshot button and the composer, not a blank page; `1440x900-loaded.png` shows the fixture messages. `pnpm web:test` exits 0, and the focused run reports `Tests 3 passed (3)`. `apps/web/test/built-room.test.ts` builds into its own `.scratch/built-room-<pid>` directory, checks the unchanged policy, renders the bundle under `node --disallow-code-generation-from-strings`, and expects a bundle copy with one corrupted fixture value to render `Fixture rejected: snapshot failed FixtureSyncSnapshot validation`. The before-fix reproduction at the parent shows `rootChildren: 0` and an `EvalError` naming `script-src 'self'`; it lives in `evidence/U01d/production-browser-csp/reproduction/`.

## Candidate CI

The ordinary pull request workflow is `.github/workflows/agora-ci.yml`. It runs the same commands as this skill and is not trusted evidence. Reproduce each of its seven jobs from the repository root with the prerequisites above:

```sh
node scripts/ci-doctor.mjs --json
pnpm lint && pnpm typecheck
pnpm contracts:check && pnpm boundaries
pnpm docs:check
pnpm test
bash scripts/ci-red-green.sh "$(git merge-base origin/main HEAD)" "$(git rev-parse HEAD)"
pnpm -s agora project lanes --unit U01b --task agora-s1-validate-project-evidence --artifacts .scratch/ci-lanes --json
pnpm exec vitest run --project unit packages/verification/test/ci-workflow.test.ts
```

Read the live checks with `gh-axi pr view PR` and `gh-axi run list`. A pull request opened before the workflow reached `main` has none until it is pushed again or reopened.

## Evidence

The callable test-only baseline below has a passing doctor. Its scenario inventory is unavailable, so the new inventory assertion is red on a value, not a missing executable. The recorder applies the current test patch at that baseline. Retain both exits and causes; an infrastructure or syntax failure is not red proof.

```sh
BASE=$(git rev-parse ab6a1832da47782ddad69e2ca80512bb4d24ed24)
HEAD=$(git rev-parse HEAD)
node scripts/record-red-green.mjs --parent "$BASE" --head "$HEAD" --out "$OUT/red-green" -- pnpm exec vitest run --project unit packages/verification/test/project.test.ts
pnpm -s agora project evidence --instance "$A" --json > "$OUT/a-evidence.json"
pnpm -s agora project evidence --instance "$B" --json > "$OUT/b-evidence.json"
python3 packages/verification/fixture/project.py evidence --instance "$P" --json > "$OUT/python-evidence.json"
```

The local U01b.B01 receipt binds head and content digests, scenario and instance, plus artifact hashes and lengths. Missing artifacts and stale bytes refuse. This is not U01b.B02's general signed evidence validator, and a malicious owner can modify this local implementation. Exact-head independent review remains mandatory.

For the U01a.B03 core slice, use the existing empty public harness and Swift consumer at its parent, with the focused command below and the committed pair the repository's refreshed receipts use. The fixture CLI is additional head-only integration proof, not a missing-driver red:

```sh
node scripts/record-red-green.mjs --parent 66013ee2d15a346d716339d3b7717e1734b74e83 --head 6151f40f8378cc16fc90684dbf74a3f82ae0b9fb --out .scratch/replay/core -- pnpm exec vitest run --project unit packages/client-core/test/sync.test.ts --project contracts contracts/test/replay.test.ts
```

Red shows thirteen literal projection and decision assertion failures (`Tests 13 failed (13)`); green shows `Tests 13 passed (13)` and `outcome: pass`.

For the U01a.B03 boundary slice, run the same recorder with the committed pair below. The parent already has ESLint, TypeScript and a valid core public import. Red is a missing forbidden-edge/public-port diagnostic, not a missing SDK or runner. The dedicated no-platform compiler is also part of `pnpm typecheck`; it includes only ES2024, with neither DOM nor Node globals.

```sh
node scripts/record-red-green.mjs --parent 6151f40f8378cc16fc90684dbf74a3f82ae0b9fb --head 7136c4b0c667838dc9293ae7982b488dda4e3806 --out evidence/U01a/agora-s1-isolate-client-core/3-boundaries/refreshed -- pnpm exec vitest run --project unit packages/client-core/test/boundaries.test.ts
```

Red shows `Tests 7 failed (7)`, each an `expected false to be true` for a forbidden import or private path; green shows `Tests 7 passed (7)`.

`red.log` must show the intended assertions failing (for example `expected 404 to be 200`), not a missing runner, syntax error or dependency failure. `green.log` must exit 0. Copy probe and migration outputs beside them. A verifier with no change of its own replays the three pairs tabulated in `evidence/U01a/agora-s1-isolate-client-core/3-boundaries/review.md` (Refreshed stack on current main: contracts `57b9db6892861b98e5d1edede90ef8621a807dec`→`66013ee2d15a346d716339d3b7717e1734b74e83`, three failures then four passes; core and boundaries as above) and writes its receipts to a scratch `--out` path that it removes; it does not select other revisions.

For local-room L1, the behavioral parent is qualified main and the head is the L1 code commit:

```sh
node scripts/record-red-green.mjs --parent 421f572b02aa5bcf9fd235afe28de92004b59f96 --head 4af669a8799137d58a743c3f104384586f3e496f --out evidence/local-room/contracts -- pnpm exec vitest run --project unit apps/center/test/local-room.test.ts --project contracts contracts/test/local-room.test.ts
```

Red shows `Tests 6 failed | 1 passed | 1 expected fail (8)`: the health baseline passes on the same app, the typed 404 and 400-path assertions fail as `not_found`/404, and the four contract assertions fail because the parent publishes no local-room component. Green shows `Tests 7 passed | 1 expected fail (8)`. The expected fail is the retained L2 receipt assertion; `evidence/local-room/contracts/future-send.red.log` records it failing as a plain test (`expected 404 to be 201`). `evidence/local-room/contracts/outcome.json` binds the revisions, sizes and receipts.

For local-room L2, the behavioral parent is the L1 head on main and the head is the L2 code commit:

```sh
node scripts/record-red-green.mjs --parent c04f5606df49eb7976ad5cf244911c73f77dd1fb --head bc27cff7731082982245fa54944fd4ddea6f49cb --out evidence/local-room/persistence -- pnpm exec node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg apps/center/test/local-room.pg.test.ts
```

Red shows `Tests 6 failed (6)`: every HTTP assertion fails against the parent's running process for a behavioral reason (`expected 404 to be 201`, `expected 404 to be 200` for the snapshot, `expected 404 to be 409` for the changed body). Green shows `Tests 6 passed (6)`. The storage-level test cannot load at the parent, which exports no adapter, so it is retained head-only in `evidence/local-room/persistence/storage-pg.green.log`; its reds are the guard negatives in `gate-negatives.log`. `evidence/local-room/persistence/outcome.json` binds the revisions, sizes and receipts.

For local-room L5 pure-core preparation, use its committed test-only harness on exact L2 `55269a5103656a63cc6f246c00ebb1efa6785866` as the behavioral parent. The harness loads the public package and denies capability; the baseline denial test stays green. Use the code head recorded in `evidence/local-room/agent-core/outcome.json`:

```sh
node scripts/record-red-green.mjs --parent c221c808e6841c57d016b3d22e8c55f5335ed811 --head 4aaf74802507af3e14d33113a2e9d9696a8af2e7 --out evidence/local-room/agent-core -- pnpm exec vitest run --project unit packages/domain/test/local-answer.test.ts
```

Red must be `9 failed | 1 passed`, with value assertions against `unavailable_capability`, not module errors. Green must be `10 passed`. Guard mutations and cross-boundary negatives run separately at the head through the Drive command. The candidate remains stacked, not landable before L2 and applicable CI protections, a rebase, fresh exact-head validation and independent review. No pipeline or remote action belongs to this local-only preparation.

For U01a.B04, use full committed parent/head SHAs and the task evidence directory. The public driver invokes the same recorder with the fixed native-assertion command, then captures the isolated guard mutation. Run both lanes and task admission. The final foundation command must exit 2 with FG04-FG08 missing and U01a integration unqualified; that expected denial is not task failure.

```sh
node scripts/foundation.mjs --scope record --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope lane-9 --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope lane-10 --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope task --parent PARENT --head HEAD --evidence DIR --json
pnpm verify:foundation -- --parent PARENT --head HEAD --evidence DIR --json
```

The first four commands require exit 0. `task_outcome: pass` never qualifies the unit or authorizes features. Inspect exact `FG01.red-required` red cause, baseline pass, same-subject green, guard normal/disabled assertions, and retained artifact hashes. No receipt is accepted without fresh replay. The [driver reference](../../../docs/site/test-first.md) documents scope and trust limits.

### Local-room L3 evidence

L3's executable test-only parent is `661b4c5`, directly on exact L2 `55269a5`. Its doctor works and start returns typed `unavailable`. Use the committed implementation head, never a moving branch name:

```sh
node scripts/record-red-green.mjs --parent 661b4c5e012be8b851d271f063d3d53738c15ebf --head b2cecdf7d4ce518574972158d64719f3b20eae7e --out evidence/local-room/runtime -- pnpm exec node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg apps/center/test/runtime.pg.test.ts -t 'public runtime owns'
```

The selected red must be `expected 'unavailable' to be 'pass'` after doctor passes, not a missing runner or import. Run the complete runtime suites separately at head, without selection. Record the test-patch digest, stack bindings, source/line categories, native outputs, PostgreSQL/replay evidence, guard negatives and owned inventory before/after cleanup. CI and independent review remain distinct prerequisites; local green does not authorize landing the unlanded L3 stack.

### Encrypted backup and restore evidence (U01c.B01 slice 1)

The test drives the CLI as a child process and imports only symbols present at its parent. A parent with no `scripts/backup.ts` is not valid R22 red, because the driver has no baseline operation there. Record red against the test-only parent revision `1eea48b` (`a62662e` on `main` plus a three-line `scripts/backup.ts` that only prints the usage route). There the first test, the driver reaching the usage route, passes and every backup assertion fails on the absent behavior. The one-snapshot fix gets its own pair, whose parent is the commit that added the race test:

```sh
node scripts/record-red-green.mjs --parent 1eea48b --head HEAD --out evidence/U01c/agora-s1-prove-backup-restore -- node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg packages/storage/test/backup.pg.test.ts
node scripts/record-red-green.mjs --parent RACE_TEST_COMMIT --head HEAD --out evidence/U01c/agora-s1-prove-backup-restore/snapshot-race -- node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg packages/storage/test/backup.pg.test.ts
node scripts/validate-evidence.mjs --dir evidence/U01c/agora-s1-prove-backup-restore --base "$(git rev-parse 1eea48b)" --head "$(git rev-parse HEAD)"
node scripts/validate-evidence.mjs --dir evidence/U01c/agora-s1-prove-backup-restore/snapshot-race --base "$(git rev-parse RACE_TEST_COMMIT)" --head "$(git rev-parse HEAD)"
```

Red must show the usage-route test passing and the backup tests failing on values such as the CLI exit status or `outcome`, never a missing runner, a syntax error or an unresolved import. The snapshot-race red must show only the concurrent-writer test failing, with `reason_code: integrity_mismatch`. Green must show every test passing with exit 0. The validator must report pass with the local owner-attested key. Pass full SHAs, because its default base is the merge-base with `main`, not the test-only baseline, and its default head is the checkout's `HEAD`; once the receipts are committed, use the recorded head instead. Keep the Drive outputs in `evidence/U01c/agora-s1-prove-backup-restore/drive/`; they hold `key_id` values and receipts, never key files. These receipts prove the slice only, not the U01c milestone or FG07.

### Production build (built room) evidence

Record red/green with the parent that lacks the plugin and the committed fix head, never a moving branch name:

```sh
node scripts/record-red-green.mjs --parent PARENT --head HEAD --out evidence/U01d/production-browser-csp -- pnpm --filter @agora/web exec vitest run --config vitest.config.ts test/built-room.test.ts
```

Red must fail the render and rejection assertions on an `EvalError` from string code generation while the unchanged-policy assertion passes; a build failure, missing runner or import error is not red proof. Green must report `Tests 3 passed (3)`. Retain `csp.txt`, both probe files, `1440x900-loaded.txt`, the three screenshots and the four console captures from Drive under `evidence/U01d/production-browser-csp/browser/`.

### Project verification controls cleanup handles (U01b.B01)

Stop only owned handles. Stopping A must leave B usable. Evidence remains readable after every stop. Repeated matching stop is idempotent; a foreign handle fails even after removal. On an earlier failed step, use these same recorded handles to clean up and preserve that failure before a fresh attempt.

```sh
AH=$(node -p "JSON.parse(require('fs').readFileSync('$OUT/a-start.json')).instance.cleanup_handle")
BH=$(node -p "JSON.parse(require('fs').readFileSync('$OUT/b-start.json')).instance.cleanup_handle")
PH=$(node -p "JSON.parse(require('fs').readFileSync('$OUT/python-start.json')).instance.cleanup_handle")
pnpm -s agora project stop --instance "$A" --handle "$AH" --json
pnpm -s agora project verify --scenario policy --instance "$B" --artifacts "$OUT/b-after-a-stop" --json
pnpm -s agora project stop --instance "$B" --handle "$BH" --json
python3 packages/verification/fixture/project.py stop --instance "$P" --handle "$PH" --json
pnpm -s agora project evidence --instance "$A" --json
pnpm -s agora project evidence --instance "$B" --json
python3 packages/verification/fixture/project.py evidence --instance "$P" --json
node --input-type=module -e 'import fs from "node:fs"; import assert from "node:assert/strict"; const root=process.env.TMPDIR; assert.ok(root.startsWith("/tmp/agora-u01b-")); const entries=fs.readdirSync(root); assert.ok(!entries.some(name=>/^agora-(b01|pg|red|green|clean)-/.test(name)), "owned runtime leak"); console.log(JSON.stringify({owned_root:root,remaining_tool_scratch:entries})); fs.rmSync(root,{recursive:true});'
unset TMPDIR
```

### Trusted checks evidence (U01b.B03)

The behavioral parent is the committed harness `d9c06b3`, where `policy` works and `evaluate` returns `unavailable`. Red must show the lane assertions failing on `unavailable`, never a missing module. Retain receipts under `evidence/U01b/agora-s1-qualify-trusted-checks/`, with one directory per slice.

```sh
node scripts/record-red-green.mjs --parent d9c06b3 --head HEAD --out evidence/U01b/agora-s1-qualify-trusted-checks/slice-1 -- pnpm exec vitest run --project unit packages/verification/test/trusted-checks.test.ts
```

## Feature discovery (U21.B01)

Build-time discovery of Features under `src/features/<name>/` (or `features/<name>/` for a package without `src/`). It generates `agora/feature-inventory.json`. It does not migrate product Features, enforce Feature-to-Feature imports or qualify U21.

Setup and drive run from the repository root. The second `generate` must leave the file and its digest unchanged.

```sh
node scripts/feature-inventory.ts
git diff --stat -- agora/feature-inventory.json
node scripts/feature-inventory.ts
node scripts/feature-inventory.ts --check
```

Disposable negative. Copy the tree into a namespaced temp directory, break it there, and expect `--check` to exit 1 with a message naming the owner and conventional path.

```sh
D="$(mktemp -d "${TMPDIR:-/tmp}/agora-u21-XXXXXX")"
mkdir -p "$D/scripts" "$D/agora" "$D/apps"
cp scripts/feature-discovery.ts scripts/feature-inventory.ts "$D/scripts/"
cp agora/feature-inventory.json "$D/agora/"
cp -R apps/web "$D/apps/web"
rm "$D/apps/web/src/features/room/entrypoint.ts"
(cd "$D" && node scripts/feature-inventory.ts --check; echo "exit $?")
```

Other negatives to repeat the same way are a `timeline-card.tsx` outside a Feature path, an uppercase folder name (`mv room Room`), and a hand edit to the copied inventory. Each must exit 1 on any filesystem.

The case-colliding negative puts a populated `Room/` next to `room/` (`mkdir Room && cp room/entrypoint.ts Room/`), and it needs a case-sensitive filesystem such as Linux CI or a case-sensitive APFS volume. There it must exit 1 with `duplicate Feature name`. An empty `Room/` holds no file, so discovery never sees it and `--check` exits 0. On the default case-insensitive macOS volume, `mkdir Room` fails with `File exists` and `--check` exits 0, because only one folder exists on disk. Record that run as untested on this host, not as a guard failure. The unit test `rejects invalid and colliding names` covers the collision on every platform.

Cleanup removes only the directory this run created.

```sh
rm -rf "$D"
git status --short agora/feature-inventory.json
```

## Cleanup (local-room L3 instance)

For the L3 instance created at Launch, save evidence first, then:

```sh
node scripts/local-room.ts stop --instance "$INSTANCE"
node scripts/local-room.ts status --instance "$INSTANCE"
node scripts/local-room.ts reset --instance "$INSTANCE" --confirm-disposable
```

Stop/status must prove both recorded listeners absent and say data retained. Reset separately proves owned disposable data removed; it must refuse a running/foreign instance. The automated pg scenarios cover repeated restart and foreign cleanup refusals. If an ownership or cleanup proof is uncertain, retain the instance and report blocked rather than killing a stored PID. Browser proof belongs outside the instance and must survive reset.

For P0c A, replay the test-only allocation parent with the focused baseline and short-location assertion; other scenarios run unfiltered in Drive. Native guard receipts include source/input digests and expected assertion failures.

```sh
node scripts/record-red-green.mjs --parent c9e6fe16c1f107da95d77f35d092e0a923781783 --head HEAD --out .scratch/p0c-replay -- pnpm exec vitest run --project unit packages/storage/test/postgres-socket.test.ts -t 'allocation baseline|short socket denial'
```

For P0c B, replay qualified parent `17fbf24609fb3cbcb25c052ae7ecee124bc0bc87` against the committed implementation head with the recorder and focused command `pnpm exec vitest run --project unit packages/storage/test/postgres-wrapper.test.ts -t deep-success`. Red is PostgreSQL's native long-socket failure (exit 70 versus expected 0); green connects as `agora_app` and verifies removal. Set `TMPDIR` to a private directory inside the task worktree for recorder worktrees, data and logs; only allocator-owned short sockets live outside it.

For P0c C, replay parent `9fadcc55858cfab7da316dd67773371082a16bc7` (main at reconciliation) against the head recorded in `evidence/ci/P0c/C/validated-head.txt` with the focused command `pnpm exec vitest run --project unit packages/storage/test/postgres-wrapper.test.ts -t 'abort-stop-throw|initdb-stderr|psql-stderr|missing-pg-isready'`. Red shows the abort-path crash (`expected 1 to be 70`), empty tool diagnostics (`initdb failed (1)` without the tool's words) and the probe flood (63 `blocked` receipts against 2); green shows `Tests 4 passed`. The reconciled pair lives under `evidence/ci/P0c/C/exact-head/`; the original recording at parent `c04f5606df49eb7976ad5cf244911c73f77dd1fb` and code head `8d4d42c94dbe71bc3fc45a048ac8b32372bbbd53` stays in `evidence/ci/P0c/C/` and on the preserved branch `fm/agora-ci-postgres-fixture-proof`.

## Cleanup

P0c A's driver allocates and releases only its recorded socket directories; its native assertions verify removal while retaining artifact neighbors. Replacement inodes, simulated device changes and hard-linked records must deny verify and cleanup with `socket ownership mismatch`; unrelated children must deny cleanup with `socket not empty`. It never starts a process. For this slice, do not globally sweep temporary directories or prune other tasks' worktrees. B's driver asserts each recorded postmaster and command descendant has exited, its socket/data/log root is gone, and neighbors remain. Ownership substitution must report `cleanup-failed`, not success; the test restores and removes only its own substituted fixture. C's drivers remove only identities their own receipts recorded, including the System V segment a SIGKILLed postmaster leaves behind on macOS once that postmaster is proven dead and the segment unattached, and write every identity they checked to `no-leftovers.json`. The `forced-cancel-repeat` scenario proves five consecutive forced stops each leave exactly one run-owned segment and end with none, with unrelated segments untouched; the wrapper test asserts the same zero-segment end state on every run.

`with-test-postgres.mjs` stops and deletes its owned cluster on success, command failure, startup failure, timeout, SIGINT and SIGTERM. Check NDJSON `cleaned` against the allocated identity; SIGKILL of the wrapper and deliberate process-group escape are not supported cleanup paths. `record-red-green.mjs` removes its worktrees. `generate.mjs --check` and the contract tests remove their temporary trees. `contracts/swift/.build/` is an ignored build cache and may stay. Confirm nothing else is left behind:

```sh
# Inspect only this task's recorded identities; never prune or sweep other runs.
git worktree list
pnpm exec vitest run --project unit packages/storage/test/postgres-wrapper.test.ts --disableConsoleIntercept
```

The driver must pass its exact-owned PID/path removal assertions. Recorder-created worktrees must be absent from the listing; unrelated worktrees and resources remain untouched.

For the local-answer pure-core driver, also confirm `git worktree list | grep -c 'agora-red-\|agora-green-\|agora-clean-'` and `ls "${TMPDIR:-/tmp}" | grep agora-` both find nothing, then run `find .scratch -maxdepth 1 -name 'answer-guard-*' -print`; no matching directory may remain. Remove its disposable reporter cache with `rm -f .vitest/json/output.json; rmdir .vitest/json .vitest` after retaining the report under evidence. In parallel development, a shared temp/worktree match may belong to another lane: report it without deleting or inspecting its contents; prove this task's exact owned paths were removed.

For the project verification controls (U01b.B01), the final cleanup command above must find no owned runtime resource before deleting only this invocation's remaining Swift tool scratch. SwiftPM leaves `.keep-directory` and lock files even after its build exits; the first literal run exposed that distinction. Never sweep the platform temp directory or prune somebody else's worktrees. The ignored `.scratch/project/` ownership journals and evidence directories remain deliberately; no database, object runtime namespace, HTTP listener or owned host process may remain.

For the encrypted backup slice (U01c.B01), `with-test-postgres.mjs` already stopped and deleted the cluster, with both target databases inside it; `wrapper.ndjson` records that. The pg test drops its own `agora_restore_*` databases and removes its own `agora-backup-test-*` directories in `afterAll`. Remove only the work directory this recipe created, after checking it is the one Launch made:

```sh
case "$W" in "${TMPDIR:-/tmp}"/agora-backup-verify-*) rm -rf "$W" ;; *) echo "refusing to remove $W" >&2 ;; esac
test ! -e "$W" && echo removed
grep -rlE '^[0-9a-f]{64}$' "$OUT" || echo 'no key file in evidence'
unset W
```

Pass means `removed` and `no key file in evidence`. Do not sweep other `agora-backup-*` directories; a parallel run may own them.

### Production build (built room)

Stop only the recorded preview listener and the named browser session, then prove the port is free:

```sh
kill "$(cat "$RUN/preview.pid")"
CHROME_DEVTOOLS_AXI_SESSION=verify-built-room chrome-devtools-axi stop
for i in $(seq 25); do kill -0 "$(cat "$RUN/preview-wrapper.pid")" 2>/dev/null || break; sleep 0.2; done
lsof -nP -iTCP:4394 -sTCP:LISTEN
kill -0 "$(cat "$RUN/preview-wrapper.pid")" 2>/dev/null && echo wrapper-still-running
```

`lsof` and the wrapper check must print nothing. If either does, the recorded process did not exit; report it, keep `$RUN` for diagnosis and do not kill other vite or Chrome processes by name. Otherwise delete `$RUN`, which held only this run's log and PIDs. `apps/web/dist` is ignored build output and may stay; the regression test removes its own `.scratch/built-room-<pid>` directory.

Evidence files under `evidence/` must survive cleanup; the cluster and worktrees must not.

### Trusted checks cleanup (U01b.B03)

The lane suite and the reporter tests delete their own `.scratch/trusted-checks-*` and `.scratch/trusted-report-*` directories in `afterAll`, and the reporter removes its `agora-report-*` temporary input. Confirm none remain with `find .scratch -maxdepth 1 \( -name 'trusted-checks-*' -o -name 'trusted-report-*' \)` and `ls "${TMPDIR:-/tmp}" | grep agora-report-`. Lane runner output under `.scratch/trusted-lanes-*` and receipts under `evidence/` stay.
