# Fix: an instant Disconnect-then-Reconnect must never strand an in-flight send

Follow-up review asked to reproduce one more interleaving before landing: begin an in-flight `/messages` POST, click **Disconnect** then immediately **Reconnect** before the old fetch's abort rejection has had a turn to run. Confirmed: this is a real, distinct bug from the two already fixed (`4f3b421`, `6b0fcbb`), and it strands the command forever rather than misreading it as denied.

## Why it happens

`disconnect()` bumps `generation` and aborts the transport's `AbortController`, but does not itself touch `waitingForConnection`. `reconnect()` creates a fresh controller and calls `beginPolling()`, which calls `resumeWaitingSend(myGeneration)` synchronously, right there in the same call. If the user calls `reconnect()` immediately after `disconnect()` — before the in-flight fetch's promise has settled, which happens asynchronously even though `abort()` fires synchronously — `resumeWaitingSend` finds `waitingForConnection` empty and does nothing. Only afterward does the aborted fetch's rejection arrive at `attemptSend`'s `catch`, see its `myGeneration` is stale, and write the command into `waitingForConnection` — a map nothing will ever drain again unless some unrelated future disconnect/reconnect cycle happens to sweep it up incidentally. The command's tag stays `pending` forever.

## Reproduction

`apps/web/test/live.test.ts`, "an in-flight send survives an instant Disconnect-then-Reconnect...": the `/messages` fetch mock defers its first response via a manually-held `reject` callback instead of tying it to the abort signal, letting the test control exactly when that rejection arrives relative to `disconnect()`/`reconnect()`. `transport.submit(...)`, flush enough for the fetch to start (capturing the deferred reject), `transport.disconnect(); transport.reconnect();` back to back, confirm the link left `'disconnected'`, then only afterward call the captured `reject(...)`. At the parent commit the command's tag stayed `pending` (red exit 1 in `red.log`).

## Fix

`apps/web/src/host/live.ts` adds one shared `becomeStale(commandId, requestDigest, text)` helper used at all three sites that previously wrote unconditionally into `waitingForConnection` on a stale generation (the initial `catch`'s stale check, and the two post-sleep continuations for `resend_same_command`/`wait_retry_after`). It checks the live `connection.link`: if still `'disconnected'`, queue as before, for a future Reconnect to drain; otherwise — reconnect() already ran before this stale rejection arrived — resume the exact same frozen command right away, in the current generation, through the fresh controller reconnect() already installed. Never a new command identity, never a duplicate send, never queued in a map with nothing left to drain it.

## Proof

- `red.log`/`green.log`: `record-red-green.mjs --parent f3bff32 --head ebc75d7 -- bash -c "cd apps/web && pnpm exec vitest run test/live.test.ts"`. Red exit 1 at the parent (command stranded `pending`); green exit 0 at the head, 24/24 passed.
- `pnpm exec vitest run packages/client-core packages/web-framework apps/web/test/live.test.ts apps/web/test/app.test.tsx` — 101/101 passed. `pnpm typecheck`, `pnpm lint`, `pnpm boundaries` (37/37) and `pnpm contracts:check` (no drift) all pass at the head.
- File count: this fix touches only `apps/web/src/host/live.ts` and `apps/web/test/live.test.ts`, both already within the task's 12-file slice; no new source file added.

## Left open

This makes the third fix to the same `disconnect`/`reconnect`/`waitingForConnection` interaction (offline-identity tracking, the direct-submit-while-disconnected case, the browser-online-event case, and now this instant-cycle case). All four are now covered by dedicated regression tests in `apps/web/test/live.test.ts`, and no further interleaving of `disconnect()`, `reconnect()`, a genuine offline/online browser event, and an in-flight or offline-queued send was found to be unhandled while writing these. A further, deeper design (for example: making `waitingForConnection` entries carry the generation they were queued under, so draining is generation-aware rather than relying on the live `connection.link` check this fix adds) was considered but not pursued, since the current fix is verified correct for every reproduced interleaving and a larger restructuring would exceed this task's bounded scope.
