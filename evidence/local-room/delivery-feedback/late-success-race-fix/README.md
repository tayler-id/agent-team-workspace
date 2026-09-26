# Fix: a late-succeeding send after instant Disconnect-then-Reconnect must still settle

Follow-up review on the instant-reconnect strand fix (`ebc75d7`) found the symmetric case: that fix covers an in-flight attempt that eventually *rejects* late; the same interleaving with an attempt that eventually *resolves successfully* late was still broken. `attemptSend`'s success branch returned before applying the receipt whenever `myGeneration !== generation`, so a command the server had already committed (a valid receipt exists) stayed `pending` client-side forever, with no error surfaced anywhere.

## Reproduction

`apps/web/test/live.test.ts`, "an in-flight send that resolves successfully only after an instant Disconnect-then-Reconnect still settles...": mirrors the late-rejection test's structure, but the `/messages` fetch mock holds a manually-controlled `resolve` callback instead of `reject`. `transport.submit(...)`, flush enough for the attempt to start, `transport.disconnect(); transport.reconnect();` back to back, then only afterward call the captured `resolve(receiptFor(commandId))`. At the parent commit the command's tag stayed `pending` (red exit 1 in `red.log`) even though a fully valid receipt had just been supplied.

## Fix

`apps/web/src/host/live.ts`'s success branch in `attemptSend` no longer gates on `myGeneration === generation`. A receipt is local bookkeeping (applying it to client-core touches no network), so it is safe to apply unconditionally regardless of which generation initiated the request that produced it — the command's identity is what the receipt is keyed to, not the transport's connection lifecycle. Also defensively removes the commandId from `waitingForConnection` on success, so a late receipt can never leave a redundant queued entry that a future Reconnect would attempt to resend for an already-settled command.

Checked and preserved by the existing, still-passing tests: a permanent denial (`classify()` returning `denied`) is untouched, since that is the `catch` branch, not the success branch; the plain manual-Disconnect-then-submit case (`4f3b421`) and the browser-online-event case (`6b0fcbb`) are unaffected, since neither reaches the success branch during their reproductions.

## Proof

- `red.log`/`green.log`: `record-red-green.mjs --parent 7711f3b --head 6b61256 -- bash -c "cd apps/web && pnpm exec vitest run test/live.test.ts"`. Red exit 1 at the parent (command stranded `pending` despite a valid receipt); green exit 0 at the head, 25/25 passed.
- `pnpm exec vitest run packages/client-core packages/web-framework apps/web/test/live.test.ts apps/web/test/app.test.tsx` — 102/102 passed. `pnpm typecheck`, `pnpm lint`, `pnpm boundaries` (37/37) and `pnpm contracts:check` (no drift) all pass at the head.
- File count: this fix touches only `apps/web/src/host/live.ts` and `apps/web/test/live.test.ts`, both already within the task's 12-file slice; no new source file added.
