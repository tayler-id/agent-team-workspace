# Connection-controls copy fix: unambiguous browser-network suffix

Task `agora-live-room-connection-controls`, inbox `003`: the served phone screenshot in
`evidence/local-room/connection-controls-browser/phone-disconnected.png` showed `Disconnected: press Reconnect to
resume. Online.` — a member reads "Online" as "the server connection is fine" right after being told it is
disconnected, when the trailing word in fact only reports `navigator.onLine` (the browser's own network
interface), unrelated to `connection.link`.

## What changed

`apps/web/src/components/App.tsx`'s status line: the bare `Online.`/`Offline.` suffix is now `Browser network
available.`/`Browser network unavailable.`, so it never collides with the server-link vocabulary already used
in the same line (`Live`, `Disconnected: press Reconnect to resume.`, `Retrying the connection.`, `Offline: sends
wait for a connection.`).

## Proof

- `red.log`: `apps/web/test/app.test.tsx` applied at head against the pre-fix `App.tsx` (`git apply` of the
  isolated `App.tsx` diff reverted, test diff kept). 2 failed — the existing phone-viewport test's `Offline.`
  assertion and the new focused regression's `Browser network available.`/`unavailable.` assertions, both
  expecting the corrected copy the old source did not produce.
- `green.log`: the same test file against the fixed `App.tsx`. 6 passed.
- The new test, "manual disconnect while the browser stays online reads unambiguous, distinguishing server link
  from network status", reproduces the exact reported state (manual Disconnect, `navigator.onLine` true) and
  asserts the literal string `' Online.'` is absent.
- `evidence/local-room/connection-controls-browser/phone-disconnected-003.png` and that directory's README
  "Correction" section: the same state reproduced in the browser against the served room
  (`node scripts/local-room.ts start`), 570x763 phone viewport (`data-viewport=phone`), reading `Live Cursor 1
  applied. Disconnected: press Reconnect to resume. Browser network available. Reconnect`.
