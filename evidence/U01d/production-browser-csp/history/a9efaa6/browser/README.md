# Built room under its unchanged CSP, after the fix

Real Chrome, driven with `chrome-devtools-axi` in its own session (`prodslice-browser`), against the production bundle built at head `a9efaa6` with the unchanged `apps/web/vite.config.ts`. The before-fix run is in [../../../reproduction/README.md](../../../reproduction/README.md).

## Setup

- Node 24.21.0 (official build, checksum verified), pnpm 10.34.1.
- `NODE_ENV=production node node_modules/vite/bin/vite.js build --outDir .scratch/after/dist` from `apps/web`. This is the same build `pnpm web:build` runs, written outside the tree.
- The invalid case is a copy of that bundle with one fixture value changed. The stream id `0f1c1e5e-0000-4000-8000-000000000001` becomes `0f1c1e5e-not-a-uuid` in every JS asset. Nothing else differs.
- `vite preview --strictPort --host 127.0.0.1` served the valid build on 4396 and the invalid copy on 4397. Both previews were stopped afterwards, and `lsof` found no listener on either port.
- The CSP comes only from the built `index.html` meta tag. Preview adds no header.

## What was driven

Each case ran at 1440x900x1 and then at 390x844x3 with mobile and touch emulation. The valid case loads the page, clicks "Load fixture snapshot", focuses the composer, types, presses Enter, clicks "Deliver fixture receipt" (the fixture holds every send at `Sending…` until a receipt arrives) and scrolls the timeline. The invalid case only loads the page. [drive.sh.txt](drive.sh.txt) holds the script, and [transcript.txt](transcript.txt) holds its raw output.

## Results

| Case | Viewport | Result |
| --- | --- | --- |
| valid | 1440 | Room shell renders. Snapshot load gives `Messages, 8 total` with the 109-character code block. Enter shows `Sending…`. The receipt gives `Messages, 9 total`, `Live Cursor 9 applied.` and `Delivered.` |
| valid | 390 | Same as 1440, with `scrollWidth` equal to `clientWidth`. |
| invalid | 1440 and 390 | `#root` has `role="alert"` and the text `Fixture rejected: snapshot failed FixtureSyncSnapshot validation`. |

[assertions.json](assertions.json) lists every value. Screenshots: [valid-1440.png](valid-1440.png), [valid-390.png](valid-390.png), [invalid-1440.png](invalid-1440.png), [invalid-390.png](invalid-390.png).

The console had no CSP issue in any case. Its only entries were a `favicon.ico` 404 on the first load of each origin. The app ships no favicon, and that 404 predates this change.

## What this does not show

- Code-block wrapping, performance, memory and comprehension are outside this slice and were not measured.
- The served L3/L4 room was checked separately at head: a message was sent through `scripts/local-room.ts start`, and the instance was stopped and reset. That room's existing `data:` font CSP block is still present and unrelated.
