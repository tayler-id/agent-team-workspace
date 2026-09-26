# Live room per-command delivery feedback

Task `agora-live-room-delivery-feedback`. Parent `179349b`, code head `f3df126`. Input: the captain's brief calling out that the living documentation promises per-message and per-command delivery states, and that the independent browser review found a denied send has no clear retry or discard path. Reproduced against the real served room before any UI code changed.

## What changed

- `packages/client-core/src/model.ts`, `packages/client-core/src/index.ts`: a `Command` can now settle `denied` with the failure's reason, a terminal outcome distinct from `pending`. A new `discard` input removes a `denied` command from `state.commands`; it is a no-op on any other tag, so it can never cancel an in-flight send or erase a delivered one.
- `packages/web-framework/src/environment.ts`, `src/projection.ts`, `src/client.ts`: `TransportConnection.sendPhase` names a still-pending command's own live attempt (`sending`/`retrying`/`waiting_connection`); `composer()` now returns one `ComposerCommand` per command with a truthful `state` (adding `delivered`/`failed` from client-core's own settled tag) and, for `failed`, the reason. `useDiscardCommand` exposes the new input.
- `apps/web/src/host/live.ts`, `src/host/fixture.ts`: both transports set and clear `sendPhase` at the same points client-core already models (`send`, `resend_same_command`, `wait_retry_after`, `wait_connection`, `stop`, receipt), and `classify()` now carries the real HTTP/error text into the `denied` failure's `reason`.
- `apps/web/src/components/App.tsx`: the composer renders one line per command (`Sending…` / `Retrying…` / `Waiting for a connection…` / `Delivered.` / `Failed: <reason>.`) in place of the old aggregate "N pending commands awaiting a receipt" text; a failed line carries a **Discard, edit and send again** button.

## Reproduced against the real server first

Before any UI code changed, `node scripts/local-room.ts start` plus `curl` against `/api/v1/local-room/messages` proved, on the real L1-L3 runtime:

- A 4097-character body returns one `HTTP 400 malformed_command` (the permanent-rejection case).
- Resending the same `command_id` and body returns the identical receipt with `replayed: true` (the uncertain-receipt case: a client that never saw the first response converges safely on retry).
- Resending the same `command_id` with a different body returns `HTTP 409 command_conflict`.

## Browser drive

`node scripts/local-room.ts start` served the live room; `chrome-devtools-axi` drove it:

- A normal send shows `Sending…` then `Delivered.` once the event applies.
- Setting the draft to 4097 `x` characters and sending gets the real `HTTP 400 malformed_command` from the live server, rendered as `Failed: HTTP 400 malformed_command.` with **Discard, edit and send again**; the draft is not cleared.
- Discard removes the failed line; the still-oversized draft survives untouched, `Send` is enabled again, and no automatic retry fires on its own.
- Editing the draft down to a valid body and sending again produces a new, distinct message (visible as a second timeline entry after the first), never a resurrection of the discarded command.

## Proof

- `red.log`, `green.log`: `record-red-green.mjs` for `packages/client-core/test/sync.test.ts`, `packages/web-framework/test/client.test.ts` and (from `apps/web`) `test/live.test.ts`. Red exit 1 (the new denial/discard/resend-identity assertions fail at the parent with the old `tag: 'pending'`, no `reason`); green exit 0, 36 tests.
- `web-red.log`, `web-green.log`, `app-test.diff`: the recorder only carries `.ts` test paths, so `apps/web/test/app.test.tsx` (a `.tsx` file) was applied by hand to a worktree at the parent commit. Red: 2 failed (the updated "Sending…"/"Retrying…" labels and the new discard test), 5 unrelated tests still pass. Green (at head): 7 passed.
- `pnpm typecheck`, `pnpm lint`, `pnpm boundaries` (37/37) and `pnpm test` (262/264; the 2 failures are the pre-existing Python-lane `blocked_prerequisite` gap, unrelated to this change and present on the unmodified tree) all pass at the head commit.
- `pnpm contracts:check`: no drift. This slice adds no wire field; the denial reason is a client-side string built from the transport's own error text, never a new schema property.

## Left open

- Delivered commands are never pruned from `state.commands`; they were never pruned before this change either (only `pending`/`received` existed), so this is not a regression, but a long-lived room's composer list would grow without bound. Left for a follow-up, since bounding it safely needs to track how far the room's own cursor has advanced past a receipt's committed sequence (`packages/client-core/src/index.ts`'s `seenOwn`), which this bounded slice did not touch.
- No auto-retry on `waiting_connection` beyond what `live.ts` already resumes on Reconnect; a command still waiting when the tab is closed is lost, matching the room's existing no-persisted-drafts behavior.
- Session draft persistence across reload is out of this task's scope; it is being built on the separate `fm/agora-live-room-session-drafts` branch, not merged into this one.
