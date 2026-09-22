# P0b toolchain transplant onto main (reconcile)

Current-head receipts for transplanting the four preserved toolchain commits (`f98a7b6..83029a3`) onto main after PostgreSQL P0c qualification (`6730740`). Prior `evidence/ci/P0b/` receipts remain historical proof of native-launcher diagnosis; this directory only binds the reconciled head.

## Commands

- `node scripts/ci-doctor.mjs --json` (Node 24.21.0 unwrapped)
- `node --test scripts/test/ci-doctor.test.ts`
- `pnpm check` at the recorded head with GitHub tokens unset

## Limits

Does not redesign the doctor, install global tools, alter credentials, or re-research the Team-ID native failure. PostgreSQL P0c, local-room L2, and application-architecture B1/B2a content on main is preserved.
