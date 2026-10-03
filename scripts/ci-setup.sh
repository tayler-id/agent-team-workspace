#!/usr/bin/env bash
# Setup for one .github/workflows/agora-ci.yml job: the locked pnpm install plus only the named prerequisites.
# Usage: bash scripts/ci-setup.sh [postgres] [python] [swift]
set -euo pipefail
corepack enable
pnpm install --frozen-lockfile
for need in "$@"; do
	case "$need" in
		postgres)
			if [ "$(uname)" = Darwin ]; then
				brew install postgresql@18
				echo "$(brew --prefix postgresql@18)/bin" >> "$GITHUB_PATH"
			else
				sudo apt-get install -y postgresql-common
				sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
				sudo apt-get install -y postgresql-18
				echo /usr/lib/postgresql/18/bin >> "$GITHUB_PATH"
			fi ;;
		python)
			python3 -m venv .scratch/python
			.scratch/python/bin/pip install -r packages/verification/fixture/requirements.txt
			echo "$PWD/.scratch/python/bin" >> "$GITHUB_PATH" ;;
		swift)
			swift --version ;;
		*)
			echo "ci-setup: unknown prerequisite $need" >&2
			exit 64 ;;
	esac
done
