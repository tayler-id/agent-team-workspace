# Local room doctor native-load check (FB-6)

Task `agora-local-room-doctor-native-check`. Parent `f69619f`, code head `5c52345`. `red.log` and `green.log` come from `node scripts/record-red-green.mjs` running `apps/center/test/local-room-doctor.test.ts`; the red run fails all four tests on the parent.

## Cause

| Part | Finding |
| --- | --- |
| Trigger | The host `node` (`/usr/local/bin/node`, v24.16.0, ad-hoc signed, no Team ID) cannot dlopen Rolldown's `rolldown-binding.darwin-arm64.node`. macOS reports `mapping process and mapped file (non-platform) have different Team IDs`. `local-room-service.ts` imports Vite for the harness build, so `start` dies there. |
| Mask | `doctor` only checked `v24.` and `pg_ctl`, so it printed `pass`. Rolldown wraps the dlopen failure as `Cannot find native binding` and keeps the Team ID text on `cause`. The service logs `String(e)`, so `runtime.log` never holds the cause. |
| Operator output | `start` said `startup failed; inspect retained runtime.log`, and the log held only the wrapper message. |

Counterfactual, same worktree and install, each runtime importing `vitest/node`:

| Node | Signature | Result |
| --- | --- | --- |
| host `/usr/local/bin/node` v24.16.0 | ad-hoc, no Team ID | fails |
| host launcher payload v24.16.0 | ad-hoc, no Team ID | fails |
| official nodejs.org v24.16.0 (SHA-256 checked) | Team ID HX7739G8FX | loads |
| official nodejs.org v24.21.0 (SHA-256 checked) | Team ID HX7739G8FX | loads |

An official 24.16.0 loads the addon, so the Node patch version is not the cause. The signature is.

## After the change

- Host launcher: `doctor` returns `blocked` naming the Team ID cause and the official Node 24.21.0 remedy. `start` returns `blocked` with the same selected cause instead of `inspect retained runtime.log`, and names the retained log path.
- Official Node 24.21.0: `doctor` passes with `Rolldown native addon loads`. `start`, `send`, `history`, `replay`, `evidence`, `stop` and `reset --confirm-disposable` were driven on an independent instance and the owned data was removed.
- Guard negative: deleting the probe call in `scripts/local-room.ts` turned the blocked-doctor test and the embedded guard test red; restoring it byte for byte turned all four green.
- `scripts/native-probe.ts` is the one probe. `scripts/ci-doctor.mjs` and `scripts/local-room.ts` both call it; `scripts/test/ci-doctor.test.ts` still passes five of five.
