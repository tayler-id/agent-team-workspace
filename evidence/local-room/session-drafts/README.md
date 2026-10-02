# Session drafts (unsent live-room text across reload)

Task `agora-live-room-session-drafts`. `apps/web/src/host/live.ts` mirrors the composer's draft
and an in-flight send's command id to `sessionStorage`, gated on `GET /_runtime/identity` so a
reset or a different disposable instance can never surface another instance's text. Full design
in `docs/site/local-room.md#unsent-drafts-across-reload`.

## Proof

- `red.log`, `green.log`, `test-patch.diff`: `record-red-green.mjs` for
  `apps/web/test/live.test.ts` at the reload/pending-identity fix
  (`41f6d9b`, parent `14b111a`). Red: the pre-fix instance-agnostic guard; green: the
  verified-nonempty-instance requirement on both save and restore.
- `browser-transcript.txt`: a served-room drive with `chrome-devtools-axi` against
  `node scripts/local-room.ts start` (real PostgreSQL-backed L1-L3 runtime, not mocked fetch).
  Covers reload restoring a draft, a reused-origin reset (same port, cursor still 0) discarding a
  stale draft by process identity, an offline send's pending record surviving a reload and being
  reused on retry with no duplicate committed message, and two independent tabs never sharing a
  draft. Verified `/_runtime/identity` directly with `curl` before driving the browser. Lists what
  this drive did not exercise (duplicated-tab sessionStorage copy, a literal in-flight-request
  race) and why.
- `browser/after-retry-send.png`: the room after the offline pending-send resend committed, one
  message, empty composer.

## Left open

Same limitations `docs/site/local-room.md` already names: a duplicated tab (not a fresh tab) can
briefly inherit its opener's `sessionStorage` per the WHATWG spec, and an identity-route outage
fails the draft/pending mechanism closed rather than open. Neither is new to this task.
