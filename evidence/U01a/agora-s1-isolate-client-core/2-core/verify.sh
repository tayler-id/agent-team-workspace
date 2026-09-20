#!/usr/bin/env bash
set -euo pipefail
unset GH_TOKEN GITHUB_TOKEN FIRSTMATE_GH_TOKEN
export PATH=/Users/taylerramsay/.local/node/bin:$PATH
out=evidence/U01a/agora-s1-isolate-client-core/2-core
{
  git rev-parse HEAD HEAD^{tree}
  node --version; pnpm --version; pg_ctl --version; swift --version
  pnpm install --frozen-lockfile
  pnpm typecheck; pnpm lint; pnpm docs:check
  pnpm contracts:check
  pnpm contracts:conform -- --json
  pnpm client:replay -- --json --swift
  pnpm test
  node scripts/with-test-postgres.mjs node scripts/probe-center.mjs
  node scripts/with-test-postgres.mjs bash -c 'node packages/storage/src/migrate-cli.ts; node packages/storage/src/migrate-cli.ts'
  node scripts/verify-design.mjs; node scripts/test-design-checks.mjs
  node .agents/skills/poteto-mode/scripts/check-plan.mjs docs/implementation-plan.md
} > "$out/skill-run.log" 2>&1
pnpm -s client:replay --json --swift > "$out/lane-7.json"
pnpm exec vitest run --project unit packages/client-core/test/guards.test.ts --reporter verbose > "$out/guard-negatives.log" 2>&1
pnpm audit --prod --json > "$out/audit.json" 2>&1 || printf 'audit exit: %s\n' "$?" > "$out/audit-exit.txt"
{
  git diff --check a449e6a HEAD
  git worktree prune
  git worktree list | grep -c 'agora-red-\|agora-green-\|agora-clean-\|agora-sync-perf' || echo 'worktrees: clean'
  ls "${TMPDIR:-/tmp}" | grep agora- || echo 'tmp: clean'
  test -s "$out/red.log" && test -s "$out/green.log" && echo 'red/green evidence preserved'
} > "$out/cleanup.log"
