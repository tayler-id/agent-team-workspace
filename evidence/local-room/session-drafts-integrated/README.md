# Session drafts after integration (served-room browser drive)

Task `agora-handoff-consolidation`. This drive re-checks the session-drafts slice after it was
merged with the connection-control and delivery-feedback work already on `main`. The earlier
drive in `evidence/local-room/session-drafts/` predates the final identity-race fix: it describes
a separate `/_runtime/identity` request, which the browser no longer makes.

Subject: `62a1eaae1f6653548736288d98e0ea35beec3c0a`. Later commits on the branch change only
documentation and evidence, so the served code is the same at the final head. Driver:
`chrome-devtools-axi` against `node scripts/local-room.ts start` on Node 24.21.0, which runs the
real PostgreSQL-backed runtime, not mocked fetch. All text is placeholder copy.

## Steps and observations

1. `doctor` and `start --instance handoff-drafts` both returned `outcome: pass`, launch
   `4af4cd12-...`. `curl -D -` on `/api/v1/local-room/snapshot` showed
   `x-agora-instance: 4af4cd12-...` and the unchanged strict CSP
   (`default-src 'none'; script-src 'self'; ...`).
2. At 1440x900, typed `handoff desktop draft one` and reloaded. The composer came back with that
   text and `Unsent draft (25 characters).` The stored entry carried cursor `0` and the launch id.
3. Stopped, ran `reset --confirm-disposable` and started again with `--port` set to the same port,
   so the origin was reused and the cursor was still `0`. The new launch was `2c628a7c-...`.
   Reloaded the same tab. Result: `No draft.` and empty `sessionStorage`. The instance check
   discarded the old text.
4. Pressed Disconnect, typed `handoff held send` and pressed Enter. The composer reported
   `Disconnected: a send waits for Reconnect`, and `sessionStorage` held a pending record for
   command `caa7aff4-...`. This is the fix from commit `649f8c3`. Before that commit, a held send
   wrote no pending record.
5. Stood in for a lost receipt: a page `fetch` POSTed that exact command id and body to
   `/messages` and got `201`, `replayed: false`. The tab never applied that receipt.
6. Reloaded. The draft and the pending record came back, and the timeline showed the committed
   message at cursor 1. Pressed Enter on the unchanged text. The page made one `/messages` request
   (`201`), and both storage entries and the composer cleared. `local-room history` lists exactly
   one message, `handoff held send`, under command `caa7aff4-...` at `room_seq` 1. The
   server's idempotency replayed the first command and committed no duplicate.
7. At 390x844 (mobile, touch), typed `handoff phone draft two` and reloaded. The draft came back
   with no horizontal overflow. See `browser/390x844-draft-restored.png` and
   `browser/1440x900-draft-restored.png`.
8. Console: one error, the CSP block on the `data:` font that `docs/site/local-room.md` already
   records. No other errors.
9. Cleanup: `chrome-devtools-axi stop`, `local-room stop`, `status` (stopped),
   `reset --confirm-disposable`. After cleanup the port refused connections.

## Not covered

- A duplicated tab inheriting `sessionStorage`. This is the documented WHATWG limitation, and the
  driver opens fresh tabs, not duplicates.
- A POST still in flight against the same live instance at the moment of reload. Step 5
  substitutes an out-of-band commit, because the driver cannot pause a live request.
- An identity outage. The fail-closed path is covered only by the mocked tests in
  `apps/web/test/live.test.ts`.
