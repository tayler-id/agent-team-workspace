# P0b: exact toolchain and native readiness

Scope: local read-only doctor, not mandatory CI or product readiness. Original parent `95f35277fbfc821be148029521222f0de617d7de`; test-only callable parent `f98a7b6` returns blocked until probes exist. Exact replay head, test patch, configuration and tool identities are retained in `red.log` and `green.log` after replay. No other branch was imported.

## Controlled diagnosis

`install-before.log` records a fresh archive of the original parent, no node_modules and an empty task-local store: `env CI=true TMPDIR="$PWD/../tmp" pnpm install --frozen-lockfile --store-dir "$PWD/../store"`. Installation passed (261 downloads). `pnpm exec vitest run --project unit apps/center/test/local-room.test.ts` then failed before running tests. `native-before.log` is **blocked prerequisite evidence, not behavioral red**.

`native-diagnosis.log` proves the arm64 optional package and its 16,372,640-byte Mach-O addon were present. Direct loading reports `ERR_DLOPEN_FAILED`: macOS library validation rejected different Team IDs under the host's signed Node launcher. No optional-package omission, wrong architecture or stale store caused this reproduction. Install-affecting optional, ignore-scripts, supportedArchitectures, ignoredOptionalDependencies and onlyBuiltDependencies settings were unset; registry was npmjs. No NAPI/Rolldown override or NODE_OPTIONS was set.

`runtime-counterfactual.log` changes only the executable over that same installed tree. Official arm64 Node **24.16.0** passes, disproving patch-version drift as the native failure's cause. Official **24.21.0**, the unchanged specification pin, also passes. Archives came from their exact nodejs.org version directories and matched published SHA-256 sums, retained in `runtime-archives.log`. This identifies a host launcher incompatibility, not a project lockfile defect. No dependency, lockfile, approved pin, lifecycle-script policy, signing entitlement or global tool was changed. The project repair is actionable prerequisite diagnosis plus `.node-version` documenting the existing exact contract; the remedy is operator runtime selection, not forced installation.

## Test-first and guards

The callable parent passes public help and returns blocked, never fictitious readiness. `red-before.log` preserves the first assertion failures before implementation; `test-first.patch` preserves that initial patch. The final recorder's `test-patch.diff` is authoritative for replay, including additional missing-prerequisite coverage. Positive runs use the actual locked Vitest/Vite/native chain, not a fake bundler. Invalid runtime, wrong/missing pnpm and unavailable native addon have explicit blocked diagnostics. Each probe is omitted only in a disposable copy; its same denial assertion must then fail with `G01.<probe>-denial`. Logs retain normal/weakened/input digests and child assertions. No production bypass switch exists.

## Validation and limits

See command receipts and the final subject record for exits, platform, source counts and cleanup. Doctor positives require Node 24.21.0/pnpm 10.34.1. Tests use Node's own runner so a missing Vitest native prerequisite cannot prevent diagnosis. The doctor is not yet wired into `pnpm check`; P1 owns aggregation. `engines` still expresses compatibility ranges, not exact qualification. PostgreSQL short sockets/cancellation belong to P0c; exact PostgreSQL/Swift qualification remains separate. P0a design-negative sandbox repair is unlanded and not imported. Browser, React, persistence and hosted enforcement are outside this slice. Independent committed-code/evidence review remains firstmate's landing gate.
