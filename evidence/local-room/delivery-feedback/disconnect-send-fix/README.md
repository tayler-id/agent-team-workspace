# Fix: a send typed after Disconnect waits for Reconnect

Follow-up review on the offline-identity correction (`002b342`) flagged a related, user-visible false failure: click **Disconnect**, then type and submit a message. Because `disconnect()` aborts the transport's `AbortController` and `reconnect()` only replaces it later, `submit()` in between still computed `online` from `navigator.onLine` alone (true, since the browser's network is fine) and attempted the send on that already-aborted signal. A real `fetch()` rejects immediately for an already-aborted signal, and `classify()` had no way to tell that apart from a genuine permanent HTTP rejection, so the command settled `denied` even though nothing was ever sent and the user only needed to press Reconnect.

## Reproduction

`apps/web/test/live.test.ts`, "a send typed after a manual Disconnect waits for Reconnect...": drives the real, unmocked `createLiveTransport`. The `/messages` fetch mock reproduces real `fetch()` behavior for an already-aborted signal (`if (init?.signal?.aborted) return Promise.reject(...AbortError...)`), which the prior mocks in this file did not model. `transport.disconnect()`, then `transport.submit(...)`: at the parent commit this immediately set `sendPhase` to `sending` and attempted the request (the assertion failing at `expect(...).toBe('waiting_connection')` proves the command did not wait, red exit 1 in `red.log`).

## Fix

`apps/web/src/host/live.ts`'s `submit()`: computes `disconnected = connection.link === 'disconnected'` and treats a submit while disconnected the same as offline (`online = networkOnline && !disconnected`), so it takes the existing `wait_connection` path — no fetch attempt, no aborted-signal race, no false denial. `connection.online` (the browser reachability flag shown elsewhere in the UI) still reflects the real `navigator.onLine` value, and the link state is left untouched (`'disconnected'`, not flipped to `'offline'`) so the status text stays accurate. Reconnect resends the queued command through the fresh `AbortController` it creates, using the same per-identity `waitingForConnection` map from the offline-identity fix, so it settles exactly once with no duplicate.

## Proof

- `red.log`/`green.log`: `record-red-green.mjs --parent 002b342 --head 4f3b421 -- bash -c "cd apps/web && pnpm exec vitest run test/live.test.ts"`. Red exit 1 at the parent (the new test's first assertion, `waiting_connection`, fails; the old code observably attempted the send instead); green exit 0 at the head, 21/21 passed.
- `pnpm typecheck` and `pnpm lint` pass at the head (lint required one follow-up: `String(url)` on an already-`string`-typed test parameter tripped `@typescript-eslint/no-unnecessary-type-conversion`, fixed by dropping the redundant `String(...)` call).
- `pnpm exec vitest run packages/client-core packages/web-framework apps/web/test/live.test.ts apps/web/test/app.test.tsx` — 99/99 passed. `pnpm boundaries` — 37/37 passed.
- `pnpm docs:build` passes; `docs/site/local-room.md` documents the Disconnect-then-submit case in both the live-room-UI paragraph and the per-command state-matrix's "Waiting for a connection" row.
- File count: this fix touches `apps/web/src/host/live.ts` and `apps/web/test/live.test.ts`, both already within the task's 12-file slice; no new source file added.
