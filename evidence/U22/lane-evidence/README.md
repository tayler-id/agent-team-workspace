# U22 lane evidence

Node 24.21.0 (the official `node-v24.21.0-darwin-arm64.tar.gz`, SHA-256 `bed7eea5325e1108f32ce5228ddd6a5f0f08a499ee42aa7442aea583702f6057`, checked against the published `SHASUMS256.txt`) and pnpm 10.34.1 on an Apple arm64 laptop. Parent `e74ba9a`, behavior commit `073469d`. This is the runner slice for the ten U22 lanes. It does not close U22, U20 or the foundation.

## What changed in behavior

`pnpm -s agora project lanes --unit U22` used to answer exit 3 for all ten lanes with a fixed sentence. It now runs one vitest over the named tests and `packages/verification/test/u22-lanes.test.ts` and reports each lane.

- `red.log` applies the head's two new CLI tests to the parent. Both fail there (`expected 'unavailable' to be 'fail'`, and the lane list mismatch). `green.log` runs the same command at `073469d`, 2 passed. `manifest.json` is the recorder's signed v2 manifest, `test-patch.diff` the applied patch.
- `maintenance-u22-lanes-at-parent.log` runs the new `u22-lanes.test.ts` against the parent. All 5 pass there, because it only drives hooks, lint rules and a replay corpus that already existed. It is a maintenance test over existing behavior and has no red run. Its guard negative is the second CLI test, which renames lane 7's test and changes the renderer rule's `direct` wording in a sandbox, and watches lanes 7, 3 and 4 fail with `missing` and `no verdict`.

## What the lanes show

Lanes 1 to 8 and 10 pass. Lane 9 is `unavailable`, and that is the finding. The renderer rule rejects `fetch`, `WebSocket`, `document` and `window` in a component with `Features and Client use Host ports` and the Host owner path. None of the four names an `EnvironmentPort` method such as `matchesMediaQuery` or `scheduleFocus`. The Client half of lane 9 passes, since `transport.submit` names `useRoomCommands`.

That is a bounded defect in `scripts/renderer-policy.ts` (the message at the `Identifier` visitor). It needs a separate product-tooling change, which this slice does not make.

## Limits

- No `scenario.png` exists for any lane. The runner has no screenshot route, and lanes 2 to 9 produce lint, compile, receipt and listener assertions, not pixels. `lanes.json` carries `scenario_png: unavailable` per lane.
- Perf is unavailable. No U22 probe exists, nothing counts unrelated-row re-renders or times Host calls, and adding one changes product code. No R23 batch was run because there is no real probe to run, and no number here stands in for one.
- Lane 1 compares the Client's `apply` against the pure core in one tree. It does not check out the parent, because `packages/client-core/src` is unchanged and the core is the trunk reference.
- Lane 8 counts subscriptions on a counting double and `createBrowserEnvironment` media-query listeners. It does not exercise `createLiveTransport` cleanup.
- Lane 5 checks the local `RoomCommandReceipt` shape against a stub room, not production atomic commit.
- Lane 6 turns `agora/client-owner` off with an in-memory ESLint override, not a file copy.
- The signed manifest is owner-attested by this checkout's key. It is not independent attestation.

## Live run

`live/outcome.json` is the CLI report of `pnpm -s agora project lanes --unit U22 --task agora-s1-qualify-trusted-checks` at code head `64cd0b7`, exit 3. `live/lanes.json` lists lanes 1 to 8 and 10 as `pass` and lane 9 as `unavailable`. `live/vitest.json` and `live/command.json` are the native run behind it. `node scripts/local-checks.mjs run` passed at `64cd0b7` (full `pnpm check`, web build, gate tests). `verify --scenario perf --unit U22` exits 3 with the missing-probe reason.
