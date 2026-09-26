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
- `pnpm typecheck`, `pnpm lint`, `pnpm boundaries` (37/37) and `pnpm docs:check` (markdownlint, `verify-design.mjs`, `test-naming-guard.mjs`, `verify-design-handoff.mjs`, `docs:validate`, `docs:test`) all pass at the head; the markdownlint step's own pre-existing failures are all in `docs/design-handoff/results/design-system/components/*` and `evidence/local-room/connection-controls-browser/README.md`, files this correction and the parent slice never touch.
- Full relevant suite: `pnpm exec vitest run packages/client-core packages/web-framework apps/web/test/live.test.ts apps/web/test/app.test.tsx` — 98/98 passed.
- `pnpm contracts:check`: no drift; this correction adds no wire field.
- `pnpm test` (full suite, real Postgres 18 cluster): 267/269 passed; the 2 failures are `packages/verification/test/project.test.ts`'s pre-existing `blocked_prerequisite` Python-lane gap (missing local Python requirements install), unrelated to this change and present on the unmodified parent tree.

## Real-browser attempt

Tried to reproduce the exact two-offline-sends race against the real running server (`node scripts/local-room.ts start`) in Chrome via the claude-in-chrome MCP tools, forcing `navigator.onLine = false` and dispatching a synthetic `offline` event. This did not work: the tool's `javascript_tool` runs in an isolated content-script world, so the override was visible only there, not to the page's own React app running in the main world; an inline `<script>` injection to reach the main world was silently dropped, consistent with the room's strict CSP (no `unsafe-eval`, no inline-script allowance). No CDP-level network-condition control was available in this session to force a genuine offline state. The scenario is instead proven at the transport layer: `apps/web/test/live.test.ts`'s new test drives the real, unmocked `createLiveTransport` export with real `navigator.onLine` toggling and mocked `fetch`, which exercises the same code path a real offline browser would hit.

## Left open

While investigating, found (but did not fix, as out of this correction's scope) that a send submitted during a manual **Disconnect** — not a genuine offline browser — can be misclassified: the in-flight command's `AbortController` is already aborted by the time the new send's fetch rejects, which `classify()` may read as a permanent `denied` rather than `wait_connection`. This is a distinct, pre-existing corner case from the offline-multi-send bug this correction fixes (which is about genuine `navigator.onLine === false`, not the Disconnect button), not introduced by this change, and not exercised by any existing test. Worth its own reproduction and fix in a follow-up task.
