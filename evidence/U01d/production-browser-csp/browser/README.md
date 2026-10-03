# Built room under its unchanged CSP, at the rebased head

Real Chrome, driven with `chrome-devtools-axi` in its own session (`prodslice-browser`), against the production bundle for fix head `1111c95` on base `15619b1`, with the unchanged `apps/web/vite.config.ts`. The before-fix run is in [../reproduction/README.md](../reproduction/README.md). The same drive at the pre-rebase head `a9efaa6` is kept in [../history/a9efaa6/browser/README.md](../history/a9efaa6/browser/README.md).

## Setup

- The build ran in a checkout at `99dde84`. `git diff 1111c95 99dde84` is empty under `apps`, `contracts`, `packages`, `scripts`, `package.json` and `pnpm-lock.yaml`, so the build inputs are those of `1111c95`.
- Node v24.16.0 and pnpm 10.34.1. `.node-version` pins 24.21.0, which this machine does not have. The bundle came out as `assets/index-DGz5M5Nj.js`, the same content-hashed name the `a9efaa6` run built under 24.21.0. Its digest is in [assertions.json](assertions.json).
- `NODE_ENV=production node node_modules/vite/bin/vite.js build --outDir ../../.scratch/after-1111c95/dist --emptyOutDir` from `apps/web`. This is the build `pnpm web:build` runs, written outside the tree.
- The invalid case is a copy of that bundle with one fixture value changed. The stream id `0f1c1e5e-0000-4000-8000-000000000001` becomes `0f1c1e5e-not-a-uuid` in every JS asset, and no copy of the original id remains.
- `vite preview --strictPort --host 127.0.0.1` served the valid build on 4396 and the invalid copy on 4397. Preview sends no CSP header, and the served `index.html` hashes the same as the built one, so the meta tag is the only policy in force. Both previews and the browser session were stopped afterwards, and `lsof` found no listener on either port.

## What was driven

[drive.sh.txt](drive.sh.txt) is the script from the `a9efaa6` run, unchanged, and [transcript.txt](transcript.txt) holds its raw output. Each case ran at 1440x900x1 and then at 390x844x3 with mobile and touch emulation. The valid case loads the page, clicks "Load fixture snapshot", focuses the composer, types, presses Enter, clicks "Deliver fixture receipt" (the fixture holds every send at `Sending…` until a receipt arrives) and scrolls the timeline. The invalid case only loads the page.

## Results

| Case | Viewport | Result |
| --- | --- | --- |
| valid | 1440 | Room shell renders with `No Room Loaded`. Enter shows `Sending…`. After the receipt the list reads `Messages, 9 total` with 9 rows and the 109-character code block, and the status reads `Live Cursor 9 applied.` The screenshot shows `Delivered.` |
| valid | 390 | Same as 1440, with `scrollWidth` equal to `clientWidth`. |
| invalid | 1440 and 390 | `#root` has no child elements, `role="alert"` and the text `Fixture rejected: snapshot failed FixtureSyncSnapshot validation`. |

[assertions.json](assertions.json) lists every value. Screenshots: [valid-1440.png](valid-1440.png), [valid-390.png](valid-390.png), [invalid-1440.png](invalid-1440.png), [invalid-390.png](invalid-390.png).

The console had no CSP issue and no `EvalError` in any case. It logged one `404 (Not Found)` on the first load of each origin, at 1440. The app ships no favicon, and `curl` of `/favicon.ico` returned 404 on both ports.

## What this does not show

- This is not the signed red/green receipt. That needs the owner's `.scratch/producer.key`, which this checkout does not have. [guard-negatives.log](../guard-negatives.log) was rerun at the same source.
- Code-block wrapping, performance, memory and comprehension are outside this slice and were not measured.
- The served L3/L4 room was not driven again. Its `a9efaa6` check is in the history README.
