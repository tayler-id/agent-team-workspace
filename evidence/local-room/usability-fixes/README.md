# Live room usability fixes

Task `agora-live-room-usability-fixes`. Parent `2b10c09`, code head `38ce559`. Input: the live-room browser review report, read as a claim to test, not a proved cause. Every finding below was reproduced through the served room at `node scripts/local-room.ts start` with `chrome-devtools-axi` before any code changed.

## Verdicts

| Report finding | Verdict | Trigger and cause |
| --- | --- | --- |
| 1. Own message shows as unread with a New boundary | Confirmed, fixed | Client core counted unread strictly by `lastSeen`, which only an explicit `seen` input moved. A receipt settled the command but never touched `lastSeen`, so the sender's own polled event landed above it. |
| 2. Header `0 unread` beside status `4 new messages` | Confirmed, fixed | The status announcement counted row growth. The first render has no room (0 rows), so loading the snapshot counted as 4 arrivals, and the text never cleared. |
| 3. Earlier messages unreachable by keyboard | Not reproduced | The timeline already had arrow-key roving focus (`onKeyDown={move}` on the list) since `077f4bf`, present at the reviewed `6bb1551`. ArrowUp, Home and End reached every message in the browser. `apps/web/test/app.test.tsx` already covered it. No code change. |
| 4. No live region, so arrivals are silent | Not reproduced as stated | The `role=status` region is `aria-live=polite` and atomic, and its `Cursor N applied` text changes on every event, so each arrival re-reads the region. What was wrong was the content: own sends announced as new, the snapshot announced as arrivals, and a stale count. Fixed with defect 2. |
| 5. Send touch target 47.1 x 21.5 CSS px | Confirmed, fixed | No minimum size on buttons. Measured 47.1 x 21.0 at 390x844 before the fix. |

## What changed

- `packages/client-core/src/index.ts`: once the cursor has applied an event named by one of this client's own receipts, `lastSeen` rises to that sequence. The receipt and the event can arrive in either order. Earlier unread messages are marked read with it, because unread is one last-seen sequence (spec line 50). Sending in a Matrix room moves the read marker the same way.
- `packages/web-framework/src/client.ts`, `apps/web/src/components/App.tsx`: the announcement follows the room's `unread` count, takes its baseline from the first loaded snapshot, reads `N new messages, M unread.` so it repeats the header total, and clears as soon as unread drops or the next arrival lands.
- `apps/web/src/fixture.css`: every button is at least 44 x 44 CSS px in the phone shell or under a coarse pointer. Desktop sizes are unchanged.

## Proof

- `red-green/red.log`, `red-green/green.log`: `record-red-green.mjs` for `packages/client-core/test/sync.test.ts`. Red exit 1, green exit 0.
- `red-green/web-red.log`, `red-green/web-green.log`: the recorder only carries `.ts` test paths, so the head's `apps/web/test/app.test.tsx` was applied by hand to a parent worktree. Red: 3 failed (live own send and announcements, touch target, fixture announcement wording). Green: 34 passed.
- Break-and-restore at the pre-rebase head `3121b5e`, whose source and tests match `38ce559` byte for byte: removing each guard (the own-receipt step, the unread source of the announcement, its clear-on-drop and clear-on-arrival, the CSS rule) turned its test red. Byte-for-byte restores turned them green again.
- `browser-transcript.txt`: the served room at `38ce559`. Fresh load `0 unread` with no announcement. Own send stays `0 unread` with no New boundary. The first CLI arrival shows `1 unread`, then `1 new message, 1 unread.` after the 2 s delay. The second arrival clears the old notice at once, then shows `1 new message, 2 unread.` Mark room as read clears it. Arrow keys reach every message. At 390x844 the buttons measure 44.0 tall. At 1440x900 they keep 21.0. No console messages.
- `desktop-1440x900-unread.png`, `desktop-1440x900.png`, `phone-390x844.png`.

## Left open

- Unread state is per page session. A second tab still counts the first tab's message as unread, because it holds no receipt for it and read state is not persisted.
- The roving tab stop stays on the message that was newest at load, so Tab lands there after new arrivals rather than on the current newest. Arrow keys and End still reach everything.
- Other buttons, Quote locally among them, keep 21 px height on a fine-pointer desktop. The approved design baseline sets control sizes when that slice lands.
