#!/usr/bin/env bash
# U20 lane driver guard negatives. Each mutation is applied to a disposable clone, the driver must go red
# on the named lanes, and the file is then restored byte for byte and the driver must go green again.
set -uo pipefail
SRC=$(git rev-parse --show-toplevel); HEAD_SHA=$(git rev-parse HEAD)
WORK=$(mktemp -d "$SRC/.scratch/u20-guard-XXXX"); trap 'rm -rf "$WORK"' EXIT
git clone --quiet --local "$SRC" "$WORK/tree" && cd "$WORK/tree" && git checkout --quiet --detach "$HEAD_SHA" && pnpm install --frozen-lockfile --offline >/dev/null 2>&1
echo "head: $HEAD_SHA  node: $(node --version)  host: $(uname -srm)"
drive() { AGORA_LANE_OUT=.scratch/gn pnpm exec vitest run --project unit packages/verification/test/u20-lanes.test.ts -t 'lane [1-9] ' --reporter=verbose 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' | grep -E '^ +(✓|×|↓)|Tests ' | sed -E 's/ [0-9]+ms$//' | cut -c1-110; }
echo "== unmutated"; drive
mutate() { # file, python-expression-old, new, label
  python3 - "$1" "$2" "$3" <<'P'
import sys
f,old,new=sys.argv[1:4]; s=open(f).read(); assert s.count(old)==1,(f,old,s.count(old)); open(f,'w').write(s.replace(old,new))
P
  [ $? -eq 0 ] || { echo "mutation not applied: $4"; exit 70; }
  echo "== mutation: $4 ($1)"; drive; git checkout --quiet -- "$1"; git diff --quiet -- "$1" && echo "restored: byte-identical" || { echo "restore FAILED"; exit 70; }
}
mutate eslint.config.js "'agora/renderer-footgun': 'error'," "'agora/renderer-footgun': 'off'," "renderer-footgun off in the main block"
mutate eslint.config.js "'agora/import-boundary': 'error',
			'agora/public-types': 'error'," "'agora/import-boundary': 'off',
			'agora/public-types': 'error'," "import-boundary off in the main block"
mutate eslint.config.js "const exts = '{ts,tsx,mts,cts,js,jsx,mjs,cjs}';" "const exts = '{ts,mts,cts,js,jsx,mjs,cjs}';" "tsx removed from the guarded extensions"
mutate scripts/boundary-policy.ts "if (!declared.includes(targetLayer.name)) return" "if (false as boolean) return" "undeclared Feature check disabled"
mutate scripts/boundary-policy.ts "if (layer.kind !== 'feature' && targetLayer?.kind === 'feature') {" "if (false as boolean && targetLayer?.kind === 'feature') {" "framework-to-Feature check disabled"
echo "== restored"; drive
