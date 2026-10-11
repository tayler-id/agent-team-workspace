# Client and Host lane evidence

## What it is

The ten U22 lanes from the implementation plan, run through the project runner. `pnpm -s agora project lanes --unit U22 --task agora-s1-qualify-trusted-checks --json` starts one vitest run over named tests and writes `lanes.json` with a verdict and a reason for every lane. It is evidence machinery for the Client and Host boundary that already exists. It adds no hook, Host method, wire shape or transport.

## What it does

Five lanes read the verdict of tests that already existed. Lane 2 is the durable-state-holder rule, lane 5 the command receipt, lane 7 the compile-time rejection of malformed Host calls, lane 8 the subscription and media-query listener counts after 200 mounts, and lane 10 the core replay suite together with the named-hook suite. A lane passes only when every test it names ran and passed, so a renamed or deleted test fails the lane as `missing`.

Five lanes are decided by the [driver test](repo:packages/verification/test/u22-lanes.test.ts), which records a verdict for the runner.

- Lane 1 replays the 1219-delivery corpus through the pure core and through `createRoomClient().apply`, and requires the same report. The core is the trunk reference, so this is not a second checkout.
- Lanes 3 and 4 lint a `fetch`, `WebSocket`, `document` and `window` call against a component path, which the renderer rule rejects, and against `apps/web/src/host/live.ts`, which accepts it.
- Lane 6 lints the lane 2 duplicate holder with `agora/client-owner` on, then off through an in-memory ESLint override. The rejection disappears, so the rule is what blocks it. This is an override, not a file copy.
- Lane 9 checks that a bypassed Client call names `useRoomCommands`, then looks for an `EnvironmentPort` method name in the diagnostic for each bypassed Host call.

## Why it exists

The plan asks for ten lanes before U22 can close, and the runner reported all of them unavailable. Most of the work already had tests. What was missing was a single command that shows, lane by lane, which predicate passed, which did not and why.

Lane 9 shows the value of that. The renderer rule rejects a direct `fetch` or `window` and says `Features and Client use Host ports`, with the Host owner path. It never says `matchesMediaQuery` or `scheduleFocus`. The predicate asks for a Host method, so lane 9 reports `unavailable` with that reason. Fixing it means changing the diagnostic in `scripts/renderer-policy.ts`, which is a separate delivery and not part of this one.

## How it works

```flow
Name the tests | scripts/project-lanes.mjs maps lanes 2, 5, 7, 8 and 10 to test names and passes the driver test and its verdict file path to one vitest run.
Run once | The root unit project and the apps/web project run together, so the replay suite and the named-hook suite share a run for lane 10.
Read verdicts | Each named test must be present and passed. Lanes 1, 3, 4, 6 and 9 read the verdict their driver test recorded, or fail as unrecorded.
Report | Any failed lane fails the run with exit 1. Otherwise any unavailable lane gives exit 3 with its reason. Ten passes would give exit 0.
Keep artifacts | vitest.json, command.json and lanes.json are hashed in the CLI report. Each lane carries scenario_png as unavailable, because the runner has no screenshot route.
```

The runner does not capture pixels. Lanes 2 to 9 are lint, compile, receipt and listener proofs, so there is no screen to photograph. The plan's `scenario.png` file stays unavailable for all ten lanes and nothing stands in for it.

## Implementation status

**Built for the lane runner, not for the unit.** Nine lanes pass, lane 9 is unavailable and the performance probe is unavailable. No hook re-render counter and no Host call timer exist, and the memoized `MessageRow` exposes no render count, so the 10% p95 rule and the zero unrelated-row re-render rule have nothing real to measure. Lane 8 counts transport subscriptions on a counting test double and does not exercise `createLiveTransport`'s own cleanup. Lane 5 checks the local `RoomCommandReceipt` shape against a stub room, not production atomic commit. U22, U20 and the foundation stay open.

## Verification and proof

The CLI behavior is covered by [the unit lane tests](repo:packages/verification/test/project-units.test.ts). They run the real command, require lane 9 as the only open lane, and then rename a mapped test and change the renderer rule's message in a sandbox. Each change turns the matching lane red, so the runner reads real results. Receipts are under [evidence/U22/lane-evidence](repo:evidence/U22/lane-evidence/README.md). The [project controls](project-controls.md) page covers the runner itself and the [client state boundary](client-state-boundary.md) page covers the lane 2 rule.
