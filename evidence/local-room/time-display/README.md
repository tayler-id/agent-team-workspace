# Message time display

Reproduced on the served fixture shell at `http://localhost:4174/` before the change: each message time was the raw wire string, for example `2026-09-20T09:01:00Z`, both as visible text and as the article accessible name. `dateTime` was that same string and `title` was empty. Article `data-seq` was already 1 through 8.

After the change, the same shell showed `Sep 20, 5:01 AM` in America/New_York (`en-US`) for `2026-09-20T09:01:00Z`. The article name was `Ada, human, September 20, 2026 at 5:01:00 AM Eastern Daylight Time`. The title appended the original wire value. Sequence stayed 1 through 8.

Phone check: `emulate --viewport 390x844x3,mobile,touch` reported `innerWidth` 390, `innerHeight` 844, device pixel ratio 3, `data-viewport=phone`, and `scrollWidth` equal to `clientWidth`. The screenshot is 1170 by 2532 pixels, which is 390 by 844 CSS pixels at 3x. Desktop check: 1440 by 900, ratio 1, no horizontal overflow. The console had no error messages after a clean reload. The light shell, type and spacing were not restyled.

Limits: this drive used the fixture server, not a PostgreSQL-backed `local-room` process. Both routes render `Timeline` from the same stored time string. It is not a VoiceOver or full visual-acceptance pass. The host timezone was America/New_York; pinned timezone cases are in `apps/web/test/message-time.test.ts`.
