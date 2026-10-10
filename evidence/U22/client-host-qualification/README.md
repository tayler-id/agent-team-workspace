# U22.B01 Client and Host qualification, lanes 5, 7 and 8

Node 24.21.0, pnpm 10.34.1. Tests only, no product code changed. No defect was exposed in the existing hooks.

- `green.log` runs `apps/web/test/client-host-qualification.test.tsx` (lanes 5 and 8, four tests) and `packages/web-framework/test/host-calls.test.ts` (lane 7, two tests) at head.
- `counterfactuals.log` breaks the real source three ways and restores each with `git checkout`. Dropping the unsubscribe in `useTransportState` fails the 200-mount leak assertion. Widening `RoomTransport.submit` to `any` fails both lane 7 tests. Letting the live Host's `validate` accept any body fails the malformed receipt test. The final lines show both files green again after the restore.
- There is no parent red run, because the hooks already exist and the new tests pass at the parent. The counterfactuals are the red evidence.
- The receipt test checks the published local `RoomCommandReceipt` shape through the generated validator against a stub room. It is not evidence of production R07 atomic commit.
