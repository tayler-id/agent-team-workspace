# Built room under its unchanged CSP, at the rebased head

Real Chrome, driven with `chrome-devtools-axi`, against the production bundle for fix head `1111c95` on base `15619b1`, with the unchanged `apps/web/vite.config.ts`. The before-fix run is in [../reproduction/README.md](../reproduction/README.md). The drive at the pre-rebase head `a9efaa6` is kept in [../history/a9efaa6/browser/README.md](../history/a9efaa6/browser/README.md).

Both runs below built in a checkout whose `apps`, `contracts`, `packages`, `scripts`, `package.json` and `pnpm-lock.yaml` are identical to `1111c95`. Both produced `assets/index-DGz5M5Nj.js` with sha256 `9d67a7e43c9fbf1b3020566d773f697e405b42e67b41d75a2dddda88490d5fa7`, the same content-hashed name the `a9efaa6` run built. Node was v24.16.0 and pnpm 10.34.1. `.node-version` pins 24.21.0, which this machine does not have.

## The verify-agora recipe

These files come from the built-room Doctor, Launch, Drive and Cleanup blocks in `.agents/skills/verify-agora/SKILL.md`, run as written with `OUT` set to this folder. Session `verify-built-room`, `pnpm web:build`, `vite preview` on 4394.

| File | Result |
| --- | --- |
| [csp.txt](csp.txt) | The exact policy, quotes escaped as `&#39;`, no `unsafe-eval` or `unsafe-inline` |
| [1440x900-probe.txt](1440x900-probe.txt) | `rootChildren: 2`, `fixture: true`, `rejected: false`, `fits: true` |
| [1440x900-loaded.txt](1440x900-loaded.txt) | `true` after clicking Load fixture snapshot |
| [390x844-probe.txt](390x844-probe.txt) | `rootChildren: 2`, `fixture: true`, `rejected: false`, `fits: true`, viewport `[390,844,3]` |
| `*-console-errors.txt`, `*-console.txt` | All four read `<no console messages found>` |
| [1440x900.png](1440x900.png), [390x844.png](390x844.png) | Room header, empty timeline with its Load fixture snapshot button, and the composer |
| [1440x900-loaded.png](1440x900-loaded.png) | Fixture messages with the code block, `Live Cursor 8 applied.` |

The same Drive block ran `pnpm web:test` (7 files, 72 tests passed) and the focused `built-room.test.ts` run (3 passed). Cleanup killed the recorded listener, stopped the session, found nothing listening on 4394 and no wrapper process, then deleted `.scratch/built-room-preview`.

## Rejection and send drive

The recipe points to [drive.sh.txt](drive.sh.txt) for the real-browser rejection path and the send-plus-receipt drive. The script is the one from the `a9efaa6` run, unchanged, in session `prodslice-browser`. `vite preview --strictPort --host 127.0.0.1` served the build from `../../.scratch/after-1111c95/dist` on 4396 and a copy on 4397. In the copy, the stream id `0f1c1e5e-0000-4000-8000-000000000001` became `0f1c1e5e-not-a-uuid` in every JS asset, and no copy of the original id remains. Preview sends no CSP header, and the served `index.html` hashes the same as the built one, so the meta tag is the only policy in force.

| Case | Viewport | Result |
| --- | --- | --- |
| valid | 1440 | Room shell renders with `No Room Loaded`. Enter shows `Sending…`. After the receipt the list reads `Messages, 9 total` with 9 rows and the 109-character code block, and the status reads `Live Cursor 9 applied.` The screenshot shows `Delivered.` |
| valid | 390 | Same as 1440, with `scrollWidth` equal to `clientWidth`. |
| invalid | 1440 and 390 | `#root` has no child elements, `role="alert"` and the text `Fixture rejected: snapshot failed FixtureSyncSnapshot validation`. |

[transcript.txt](transcript.txt) holds the raw output and [assertions.json](assertions.json) every value. Screenshots: [valid-1440.png](valid-1440.png), [valid-390.png](valid-390.png), [invalid-1440.png](invalid-1440.png), [invalid-390.png](invalid-390.png). The console had no CSP issue and no `EvalError`. It logged one `404 (Not Found)` on the first load of each origin, at 1440. The app ships no favicon, and `curl` of `/favicon.ico` returned 404 on both ports. Both previews and the session were stopped afterwards, and `lsof` found no listener on either port.

## What this does not show

- Code-block wrapping, performance, memory and comprehension are outside this slice and were not measured.
- The served L3/L4 room was not driven again. Its `a9efaa6` check is in the history README.
