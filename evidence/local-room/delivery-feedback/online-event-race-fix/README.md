# Fix: browser online event must not resume a queued send during manual Disconnect

Follow-up review on the Disconnect-send fix (`4f3b421`) found one more instance of the same hazard: `createLiveTransport`'s `window.addEventListener('online', ...)` handler called `resumeWaitingSend(generation)` unconditionally, even while the room was still manually **Disconnected**. Disconnect and Reconnect don't touch `navigator.onLine`; the browser's own network can come back (a real `online` event) before the user presses Reconnect. That event would have resumed a command queued by the Disconnect-send fix on the same `AbortController` Disconnect already aborted, reproducing the aborted-signal-read-as-permanent-denial bug through a different trigger.

## Reproduction

`apps/web/test/live.test.ts`, "a browser online event while still manually Disconnected must not resume a queued send...": drives the real `createLiveTransport`. `transport.disconnect()`, then `transport.submit(...)` (queued per the prior fix), then `window.dispatchEvent(new Event('online'))`. At the parent commit this resumed the send immediately (`sendPhase` read `retrying` instead of staying `waiting_connection`, red exit 1 in `red.log`).

## Fix

`apps/web/src/host/live.ts`'s `online` listener now checks `connection.link === 'disconnected'` before calling `resumeWaitingSend`; while disconnected it updates `online`/`link` state as before but leaves the queued command alone. Only Reconnect (`beginPolling` → `resumeWaitingSend`, through the fresh `AbortController` it creates) resumes it, exactly once, with its original identity — proven by the same test continuing past the stray `online` event to call `transport.reconnect()` and asserting exactly one `/messages` POST.

## Proof

- `red.log`/`green.log`: `record-red-green.mjs --parent 710ea6a --head 6b0fcbb -- bash -c "cd apps/web && pnpm exec vitest run test/live.test.ts"`. Red exit 1 at the parent; green exit 0 at the head, 23/23 passed.
- `pnpm exec vitest run packages/client-core packages/web-framework apps/web/test/live.test.ts apps/web/test/app.test.tsx` — 100/100 passed. `pnpm typecheck`, `pnpm lint`, `pnpm boundaries` (37/37) and `pnpm contracts:check` (no drift) all pass at the head.
- `pnpm docs:validate`, `pnpm docs:build` and `npx markdownlint-cli2 docs/site/local-room.md` pass; this commit also corrects that file's opening-paragraph example (it still quoted the old aggregate `stop: not sent (HTTP 400 malformed_command); the draft is kept` decision text for a permanent 400, instead of the per-command `Failed: HTTP 400 malformed_command.` line with Discard that `App.tsx` actually renders) and tightens one nearby baseline-gap bullet ("a text summary of pending commands" → "one text line per command naming its own delivery state") to match.
- File count: this fix touches `apps/web/src/host/live.ts` and `apps/web/test/live.test.ts`, both already within the task's 12-file slice; no new source file added.
