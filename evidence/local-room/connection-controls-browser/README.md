# Connection controls: real served-room browser drive

Unit red/green (`evidence/local-room/connection-controls/`, `evidence/local-room/connection-controls-race-fix/`)
proves the transport logic against mocked `fetch`. This receipt proves the same behavior against the actual
served room (`node scripts/local-room.ts start`) driven with `chrome-devtools-axi`, desktop and phone
viewports, matching `.agents/skills/verify-agora/SKILL.md`'s L4 drive recipe.

## Setup

```
node scripts/local-room.ts doctor
node scripts/local-room.ts start --instance verify-conn-1790219552
```

Launch `0c28b6bf-64f0-4015-b1d1-ef0026ac9ad0` (later `68754c28-972f-4f51-b6a7-05225d7047c9` after the
stop/start below), served at `http://127.0.0.1:58802`. `local-room-evidence.json` is the final `evidence`
report before `reset --confirm-disposable` removed the disposable instance.

## Desktop (1440x900)

1. Sent "hello before disconnect" from the composer; status read `Cursor 1 applied. Online.` (`desktop-online.png`).
2. Clicked **Disconnect**. Status flipped to `Disconnected: press Reconnect to resume.` and the button
   became **Reconnect** (`desktop-disconnected.png`).
3. While disconnected, sent a second message with `node scripts/local-room.ts send --body 'sent while
   browser disconnected'`. The browser stayed at cursor 1 and did not show it, proving the poll loop is
   actually stopped, not just visually greyed out.
4. Clicked **Reconnect**. The room advanced straight to cursor 2 with exactly one new row
   ("sent while browser disconnected"), no duplicate and no resync flash, confirming resume-from-cursor
   replay.
5. Typed "sent during stop" into the composer and pressed Enter, then ran
   `node scripts/local-room.ts stop --instance ...` while the send was in flight. The status showed
   `Connection error TypeError: Failed to fetch` and the composer read `1 pending command awaiting a
   receipt. Last core decision: resend_same_command.` — the same frozen command retrying, not a new one.
6. Ran `node scripts/local-room.ts start --instance ...` (a real end-user stop/restart of the service, not
   just a network flap). Within the next poll/retry tick the room reached cursor 3 with "sent during stop"
   appearing exactly once and the composer clearing to "No draft.", proving the retried command kept its
   original identity through a full server restart instead of double-sending.

## Phone (390x844, mobile+touch emulation)

7. Switched viewport to phone; `document.documentElement.{clientWidth,scrollWidth}` both read 390 (no
   horizontal overflow) at cursor 3, status `Online.` (`phone-online.png`).
8. Clicked **Disconnect** on the phone viewport; status and button flipped the same way as desktop
   (`phone-disconnected.png`). The Reconnect button's bounding rect measured 94.7x44 CSS px — the 44px
   touch-target floor holds at phone width.
9. Clicked **Reconnect**; status returned to `Online.` before closing the session.

## What this does not cover

- `chrome-devtools-axi`'s `network`/`console` commands surfaced one pre-existing, unrelated Content
  Security Policy warning (a data-URI woff2 font blocked under the harness's strict `default-src 'none'`)
  from the pretext text-sizing module; it predates this slice and is not a connection-control defect, so it
  is reported here and left alone rather than fixed as scope creep.
- Exact wire-level `command_id` identity across the stop/restart in step 6 is proved at the unit level
  (`apps/web/test/live.test.ts`, "disconnect cancels an in-flight command retry..." and "...queued retry
  backoff; reconnect resumes the exact same command identity"); the browser drive here proves the
  observable, user-facing outcome (one message, not two) rather than re-inspecting the POST body.
- No VoiceOver/screen-reader pass; the shell's existing focus-order and ARIA-live assertions are unit-level
  (`apps/web/test/app.test.tsx`).
