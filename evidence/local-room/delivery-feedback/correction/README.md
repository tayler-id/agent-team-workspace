# Correction: offline sends by identity, not a single slot

Review feedback on the delivery-feedback slice (parent `842a944`, code head `f8b2b85`) found two issues in the first pass, `93dbdf4`..`6bfb8d0`:

1. The slice touched 13 code/test files against the task's 12-file cap.
2. `createLiveTransport`'s `waitingForConnection` held one command at a time. A submit while offline never entered client-core's `state.commands` at all (the model's `submit` handler returned `wait_connection` without adding a pending command), so the transport's single scalar was the *only* record that a send was waiting. A second offline send overwrote that scalar; reconnect then resent only the second command and the first was never sent, tracked, or surfaced anywhere in the UI.

## Reproduction

Before fixing, added a failing test (`apps/web/test/live.test.ts`, "two commands submitted while genuinely offline each keep their own identity") driving the real `createLiveTransport` with `navigator.onLine = false`: submit command A, then command B, then go back online. At the parent behavior this left only B in `client.getState().commands`; A was silently lost.

## Fix

- `packages/client-core/src/index.ts`: `submit` now adds the pending command to `state.commands` whether or not `online` is true, differing only in which request it returns (`send` vs `wait_connection`). Offline commands are now real, visible, per-identity state instead of existing only in a transport-local variable.
- `apps/web/src/host/live.ts`: `waitingForConnection` is a `Map<commandId, {requestDigest, text}>` instead of one optional value; every entry point that used to overwrite the scalar now sets a map entry, and `resumeWaitingSend` drains and resends every entry, each keyed by its own frozen identity. `submit()` also adds the offline text to `unsettled` so a repeated click on the same unchanged draft cannot mint a second waiting command for the same text.
- `apps/web/src/host/fixture.ts`: the dev fixture's `submit` sets `sendPhase` to `waiting_connection` on the same request, so an offline-submitted command reads "Waiting for a connection…" there too, instead of falling through to the default "Sending…" label now that it appears in `state.commands`.

## File-count fix

`composer()`'s `sendPhase` parameter moved from the third positional argument to an optional trailing one (`composer(state, streamId, decision, sendPhase = {})`). The only caller whose diff was pure argument reordering, `packages/web-framework/test/client.test.ts`, now compiles unchanged against its original three-argument call, so that file drops out of the diff entirely: 12 files changed against the 842a944 parent, not 13.

## Proof

- `red.log`/`green.log`: `record-red-green.mjs` for `packages/client-core/test/sync.test.ts` and (from `apps/web`) `test/live.test.ts`, the two files carrying new/changed assertions in this correction. Red exit 1 at the parent (14 assertions in `sync.test.ts`, 20 in `live.test.ts`, including the new two-offline-sends regression, fail against the old single-command/no-tracking behavior); green exit 0 at the head, 14 and 20 passed respectively.
- `pnpm typecheck`, `pnpm lint` and `pnpm boundaries` (37/37) pass at the head.
- Full relevant suite: `pnpm exec vitest run packages/client-core packages/web-framework apps/web/test/live.test.ts apps/web/test/app.test.tsx` — 98/98 passed.
- `pnpm contracts:check`: no drift; this correction adds no wire field.
