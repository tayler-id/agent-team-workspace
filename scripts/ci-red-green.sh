#!/usr/bin/env bash
# R22 red/green for one pull request, per commit: each commit that changes a test is replayed with its tests
# applied to its own parent (red) and at itself (green), so a committed test-only harness can be the parent.
# A red that fails to load a suite is missing infrastructure, not behavior, and fails. Source changes with no
# changed test anywhere in the pull request fail; documentation-only changes pass. A commit that changes only tests,
# documentation or evidence skips red.
# Usage: bash scripts/ci-red-green.sh BASE_SHA HEAD_SHA
set -euo pipefail
base=$(git merge-base "$1" "$2")
recorded=0
behaviorless='^(apps|packages|contracts)/.*\.test\.tsx?$|^docs/.*\.md$|^evidence/'
for commit in $(git rev-list --reverse "$base..$2"); do
	parent=$(git rev-parse "$commit^")
	tests=""
	for file in $(git diff --name-only "$parent" "$commit" | grep -E '^(apps|packages|contracts)/.*\.test\.tsx?$' || true); do
		if git cat-file -e "$commit:$file" 2>/dev/null; then tests="$tests $file"; fi
	done
	[ -n "$tests" ] || continue
	# R22 applicability: a commit that touches only tests, docs or evidence cannot change behavior, so there is no
	# behavior to turn red (a lint repair or added coverage replays green on both sides). Any other changed file,
	# source or configuration, keeps the red-before-green requirement. Its tests still run at the head in the tests job.
	if ! git diff --name-only "$parent" "$commit" | grep -qvE "$behaviorless"; then
		echo "red-green: $commit changes only tests, docs or evidence, so it has no behavior to turn red"; continue
	fi
	out=.scratch/ci-red-green/$commit
	# shellcheck disable=SC2086
	node scripts/record-red-green.mjs --parent "$parent" --head "$commit" --out "$out" -- node scripts/with-test-postgres.mjs pnpm exec vitest run $tests
	if grep -q 'Failed Suites' "$out/red.log"; then echo "red_invalid: a suite failed to load at $parent" >&2; exit 1; fi
	node scripts/validate-evidence.mjs --dir "$out" --head "$commit" --base "$parent"
	recorded=$((recorded + 1))
done
if [ "$recorded" -eq 0 ]; then
	if git diff --name-only "$base" "$2" | grep -vE "$behaviorless" | grep -qE '^(apps|packages|contracts|scripts|agora)/'; then echo "red_green_missing: source changed without a changed test" >&2; exit 1; fi
	echo "red-green: documentation-only change, not applicable"
fi
