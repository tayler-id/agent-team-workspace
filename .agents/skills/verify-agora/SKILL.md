---
name: verify-agora
description: Prove the Agora and independent Python foundation fixtures through owned project controls, portable contracts and guard negatives. Use for center, storage, client-core, contracts, verification and feature-map changes. Scope U01a and U01b.B01 only.
---

# Verify Agora

Run every shell block, in order, from the repository root in one shell at a committed candidate. Use ordinary Node 24 without inherited forge credentials. This is local foundation-fixture proof, not product authority or U01b qualification. The [feature map](../../../agora/feature-map.json) and these instructions are freshness inputs: changing either invalidates prior receipts until a live pass. Read [project controls](../../../docs/site/project-controls.md) for prerequisites and trust limits.

## Doctor

Expected: Node 24, pnpm 10, PostgreSQL 18 server tools, Swift 6 and Python 3 with the locked independent validator. Installation is explicit; `project doctor` itself is read-only. Missing prerequisites block, never skip.

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
pnpm audit --json
pnpm typecheck
pnpm lint
pnpm docs:check
pnpm -s agora project doctor --json
python3 packages/verification/fixture/project.py doctor --json
pnpm -s agora project scenarios --json
python3 packages/verification/fixture/project.py scenarios --json
```

## Launch

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

## Drive

Pass means literal public allow/deny results, exactly two additional persisted journal entries and matching object bytes. The task lane runner additionally proves two simultaneous instances of each application, foreign cleanup refusal, missing/altered/stale evidence rejection, missing runners, report/exit disagreement, instruction drift and deleted required coverage. Its isolated guard mutation must fail the original denial assertion. This is CLI/HTTP proof, not a screenshot or a browser application claim.

```sh
pnpm -s agora project verify --scenario policy --instance "$A" --artifacts "$OUT/a" --json
pnpm -s agora project verify --scenario policy --instance "$B" --artifacts "$OUT/b" --json
python3 packages/verification/fixture/project.py verify --scenario policy --instance "$P" --artifacts "$OUT/python" --json
pnpm -s agora project lanes --unit U01b --task agora-s1-isolate-development --artifacts "$OUT/lanes" --json
pnpm contracts:check
pnpm contracts:conform -- --json
pnpm client:replay -- --json --swift
pnpm boundaries
pnpm test
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs
node scripts/with-test-postgres.mjs bash -c 'node packages/storage/src/migrate-cli.ts; node packages/storage/src/migrate-cli.ts'
```

Every required command must exit zero. All native lane assertions must pass without skips. Conformance must name both consumers as passing. Boundaries produce `.scratch/boundaries.json`. The migration pair reports `applied: 1`, then `applied: 0` with the same schema digest. Whole-unit lanes remain blocked without U01b.B02/B03; the explicit task selector does not qualify that milestone. U01a's historical task-admission driver remains documented in [task proof](../../../docs/site/test-first.md), not a substitute for this task's controls.

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

The local receipt binds head and content digests, scenario and instance, plus artifact hashes and lengths. Missing artifacts and stale bytes refuse. This is not U01b.B02's general signed evidence validator, and a malicious owner can modify this local implementation. Exact-head independent review remains mandatory.

## Cleanup

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
rmdir "$TMPDIR"
unset TMPDIR
```

`rmdir` must succeed on this invocation's owned temp root. Never sweep the platform temp directory or prune somebody else's worktrees. The ignored `.scratch/project/` ownership journals and evidence directories remain deliberately; no database, object runtime namespace, HTTP listener or owned host process may remain.
