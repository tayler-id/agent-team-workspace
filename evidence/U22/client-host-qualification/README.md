# U22.B01 Client and Host qualification, lanes 5, 7 and 8

Node 24.16.0, pnpm 10.34.1. The `.node-version` pin is 24.21.0, which this machine did not have. Tests only, no product code changed. No defect was exposed in the existing hooks.

- The lane tests live in files that `agora/feature-map.json` already lists as scenarios of `agora-web-shell-integrate`. Lanes 5 and 8 are three tests in `apps/web/test/app.test.tsx`, and lane 7 is two tests in `packages/web-framework/test/boundaries.test.ts`.
- `green.log` runs both files at head `04bd6a0`. The first reports 11 passed and the second 5 passed.
- `counterfactuals.log` is the full output of the qualification drive in `.agents/skills/verify-agora/SKILL.md`. It extracts the head into a disposable directory, applies each patch here, runs the owning test file and reverses the patch. `a-drop-unsubscribe.diff` makes `useTransportState` discard the transport's unsubscribe, and lane 8 ends with 201 open subscriptions instead of 0. `b-widen-submit.diff` widens `RoomTransport.submit` to `any`, and both lane 7 tests fail because a numeric command id compiles. `c-validate-anything.diff` makes the live Host's `validate` return an invalid body unchanged, and the lane 5 negative leaves the command `pending` instead of `denied`. The `== restored` section shows both files green on the unpatched copy.
- There is no parent red run, because the hooks already exist and the tests pass at the parent. The counterfactuals are the red evidence.
- The receipt test checks the published local `RoomCommandReceipt` shape through the generated validator against a stub room. It is not evidence of production R07 atomic commit.
