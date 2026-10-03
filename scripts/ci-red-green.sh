#!/usr/bin/env bash
# R22 red/green for one pull request: replay the changed tests on the merge base (red) and the head (green),
# then validate the bundle. Source changes with no changed test fail; documentation-only changes pass.
# Usage: bash scripts/ci-red-green.sh BASE_SHA HEAD_SHA
set -euo pipefail
base=$(git merge-base "$1" "$2")
head=$2
tests=$(git diff --name-only "$base" "$head" | grep -E '^(apps|packages|contracts)/.*\.test\.tsx?$' || true)
sources=$(git diff --name-only "$base" "$head" | grep -E '^(apps|packages|contracts|scripts|agora)/' || true)
if [ -z "$tests" ]; then
	if [ -n "$sources" ]; then echo "red_green_missing: source changed without a changed test" >&2; exit 1; fi
	echo "red-green: documentation-only change, not applicable"; exit 0
fi
out=.scratch/ci-red-green
# shellcheck disable=SC2086
node scripts/record-red-green.mjs --parent "$base" --head "$head" --out "$out" -- node scripts/with-test-postgres.mjs pnpm exec vitest run $tests
if grep -q 'Failed Suites' "$out/red.log"; then echo "red_invalid: a suite failed to load at the merge base" >&2; exit 1; fi
node scripts/validate-evidence.mjs --dir "$out" --head "$head" --base "$base"
