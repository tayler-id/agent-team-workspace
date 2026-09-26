# Lost, transient and permanent send failures against the real served room

Task `agora-live-room-receipt-failure-browser`. The transport retry logic (`apps/web/src/host/live.ts`) and
its command-identity guarantees already have exhaustive unit coverage against a mocked `fetch`
(`apps/web/test/live.test.ts`). This receipt instead drives the real served room
(`node scripts/local-room.ts start`) with the real PostgreSQL-backed runtime, over
`chrome-in-browser` automation, for three failure shapes the captain's brief named: a lost receipt, a
transient 429/503, and a permanent rejection. No source code changed; this is a verification-only slice.

Every step below says explicitly whether the failure was **real** (the server actually produced it under
genuine load or genuine validation) or **simulated** (the page's own `window.fetch` was temporarily wrapped
to inject one failure response, with the real request still reaching the server underneath so the server's
own outcome is what settles the retry). No step claims a simulated failure was organically observed, and no
step claims the local agent is a live or multi-person participant; it remains the same
"Local agent (local runtime, no model provider)" fixture label the served room already shows.

## Setup

```sh
node scripts/local-room.ts doctor
node scripts/local-room.ts start --instance receipt-failure-browser
```

Launch `409c6ba1-2031-4b8a-818f-bf0da115cc1b`, served at `http://127.0.0.1:54147`.

## 1. Real transient 429 under genuine concurrent load

The service's own rate limiter (`scripts/local-room-service.ts`) is a real token bucket (60 tokens, refilling
at 60/s). From the page's own JavaScript console, 90 concurrent real `POST /messages` requests were fired at
once, each a distinct `command_id`, deliberately bypassing the composer: 39 landed `201`, 51 came back genuine
`429 rate limit` with a real `retry-after` header, all captured in the browser's own Network panel
(`mcp__claude-in-chrome__read_network_requests`). This is the same real mechanism
`apps/center/test/runtime.pg.test.ts`'s `"rate denial stores nothing"` test exercises server-side; here it is
observed end to end through the browser's real network stack, not asserted against a mock.

This step proves only that the real server genuinely returns `429` under real concurrency; it does not drive
the composer's own send through a real `429`, and it does not show one command ID being retried, because
each of the 90 requests used its own distinct ID. `classify()` in `apps/web/src/host/live.ts` maps a real
`429` to `rate_limited`, and the exact-identity retry across that mapping is what
`apps/web/test/live.test.ts` (`"a rejected send retries the frozen command..."`) proves, against a mocked
server. Steps 2 and 3 below are what prove that retry mapping against the real server instead.

## 2. Simulated transient failure through the real server (503, then a real receipt)

To reliably observe the composer's own `Retrying…` → `Delivered.` transition (a real 429 storm is inherently
racy against a single command's timing), `window.fetch` was wrapped for exactly one outgoing `POST /messages`:
the wrapped call **returns a simulated `503`** to the page without ever touching the network, while the
composer's own message ("simulated-503-then-real-success") was sent through the real UI. `live.ts`'s
`classify()` treats any `5xx` as transient and resends the identical frozen command; that resend was **not**
intercepted, so it is a real request against the live server, real receipt included. Result: `Delivered.` and
exactly one persisted message (`node scripts/local-room.ts history`, `room_seq 173`), never two.

## 3. Simulated lost receipt (the request commits for real, only the response is dropped)

A "lost receipt" is stronger than a plain transient error: the command already committed server-side, and only
the response never reached the browser. `window.fetch` was wrapped so the first `POST /messages` for
"simulated-lost-receipt-then-replay" was still forwarded to the real server in the background (so it really
commits) while the caller instead saw a simulated network rejection (`TypeError`), exactly mimicking a dropped
response. The captured real receipt from that background call carries `command_id
7759648e-8cae-46ac-a3ef-ace43f64a5b5` and `replayed: false`. `live.ts` retried with the same frozen command
identity; the real server recognized the identical `(command_id, request_digest)` pair and returned the
original receipt as a safe replay. `node scripts/local-room.ts history` shows exactly one message at
`room_seq 174` with that same `command_id` — the retry never produced a second committed message
(`lost-receipt-delivered.jpg`).

## 4. Real permanent rejection (400) and its recovery UI

A 4097-character body (one over the wire limit) was submitted through the real composer. The real server
returned a genuine `400 malformed_command`; the composer rendered `Failed: HTTP 400 malformed_command.` with
a **Discard, edit and send again** button, and the oversized draft stayed untouched in the textbox
(`permanent-rejection-400.jpg`). Clicking Discard removed only that failed line, left the draft intact, and
re-enabled Send, with no automatic resend of the rejected command.

## Accessible feedback

`mcp__claude-in-chrome__read_page` (accessibility tree) over the composer shows the per-command list
(`<ul class="composer-commands" aria-live="polite" aria-label="Send status">`) exposing each status line to
assistive tech as it changes, and the recovery control is a plainly labeled
`button "Discard, edit and send again"`, not an icon-only or color-only affordance.

## No duplicate committed messages

`node scripts/local-room.ts history --instance receipt-failure-browser` after all four scenarios shows one
row per attempted send body, each keyed to a single `command_id`. The two commands that retried committed
exactly once each: `simulated-lost-receipt-then-replay`'s real server-side request genuinely landed twice
(the dropped-response attempt and the retry, both real, §3 above); `simulated-503-then-real-success`'s first
attempt never reached the server at all (the `503` was returned entirely by the page's own interceptor), so
only its retry is a real server-side request. The oversized-body command (§4) committed zero messages, by
design: a permanent rejection stops retries and persists nothing.

## Cleanup

```sh
node scripts/local-room.ts stop --instance receipt-failure-browser
node scripts/local-room.ts reset --instance receipt-failure-browser --confirm-disposable
```
