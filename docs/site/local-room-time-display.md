# Message times

## What it is

A display reading of the timestamp already stored for each timeline row. The live room copies the wire `created_at` into presentation and leaves that string unchanged. The fixture stores the same kind of Zulu timestamp. Neither path is a new clock, a draft, or an identity.

## What it does

A valid wire timestamp shows as a short, locale-aware time: time of day on the viewer's current calendar day, and month and day when the viewer's day differs. A different year includes the year. The message's accessible name and the time element's title carry the full date, time and timezone name. The `dateTime` attribute and the title keep the original wire value for inspection. An empty time stays "no time". A value that is not a Zulu wire timestamp, or whose calendar fields do not survive parsing, shows "Unreadable time" and does not receive a `dateTime`. Overflow dates such as February 31 and leap seconds are not rolled into another instant.

## Why it exists

Served desktop and phone views were printing raw ISO strings such as `2026-09-20T09:01:00Z` in the meta row and in the accessible name. Those strings are hard to scan, especially at phone width. A readable label must not invent a time, must not hide the authoritative wire value, and must not reorder history. Committed sequence remains the order.

## How it works

```flow
Wire created_at | Live transport copies RoomMessage.created_at into presentation.times. The fixture loader keeps its stored time string. Neither writer formats it.
Projection | rows() copies that string onto the row and keeps message order. Client-core still sorts by created sequence, then id.
Display | formatMessageTime accepts only a Zulu wire timestamp whose UTC fields round-trip. It formats with the viewer locale and timezone.
Inspection | The visible text is short. The article label and title name the full local instant. dateTime remains the original wire value.
Malformed | Empty stays "no time". Anything else that fails the wire or calendar check is "Unreadable time", with no invented instant.
```

Same-day comparison uses the viewer's timezone, so a UTC instant just after midnight can still be the previous local evening. Tests pin locale, timezone and `now` across that boundary and across a year boundary. The shell does not sort rows by the displayed clock.

## Implementation status

**In progress: readable message times are in the local room shell; the rest of the room is not qualified.** The formatter and timeline rendering are in this slice. Identity, authored message text, draft storage and security policy are unchanged. There is no VoiceOver pass, and this does not finish the remaining live-room delivery or connection work. The approved light shell, type and spacing are unchanged; only the time text and a no-wrap rule on the time element changed.

## Verification and proof

The formatter lives in [message-time.ts](repo:apps/web/src/host/message-time.ts) and is re-exported from the [host barrel](repo:apps/web/src/host/index.ts). [Timeline.tsx](repo:apps/web/src/components/Timeline.tsx) is the only renderer. The live mapping that must stay a raw `created_at` is [live.ts](repo:apps/web/src/host/live.ts). Behavior is in [message-time.test.ts](repo:apps/web/test/message-time.test.ts): pinned locales and timezones, a UTC-versus-local day boundary, a year boundary, offset and overflow rejection, sequence order when clocks would sort the other way, and a shell render that keeps the wire value on `dateTime`.

Browser proof used the served fixture shell, which mounts the same timeline as the live route. At 390 CSS pixels (`innerWidth` 390, device pixel ratio 3) and at 1440x900, loaded messages showed readable local times, sequence stayed 1 through 8, and the document did not overflow horizontally. Screenshots: [phone](repo:evidence/local-room/time-display/phone-390x844.png) and [desktop](repo:evidence/local-room/time-display/desktop-1440x900.png). Notes are in [the receipt](repo:evidence/local-room/time-display/README.md). This is not an operating-system screen-reader pass.

See [the local room](local-room.md#live-room-ui) and [the web shell](local-room-web-shell.md).
