# U23.B01 center local-room Entrypoint receipts

Partial construction slice of U23.B01. It moves the existing adapter selection from `apps/center/src/main.ts` into `apps/center/src/features/local-room/entrypoint.ts`. U23 is not qualified and the web renderer has not moved.

`red.log` runs `packages/verification/test/feature-discovery.test.ts` against the parent. The new assertion fails because the committed inventory holds no `apps/center` Feature (`expected [] to deeply equal [ ... ]`). `green.log` passes at the head.

Live proof on instance `fb1`: two CLI sends and one browser send before a reload, one CLI send after. `live-browser-order.txt` (the reloaded browser) and `live-history.json` (CLI history) show the same order. The instance was stopped with `local-room.ts stop`, data retained.

Not claimed. `local-checks run` needs Node 24.21.0 and this machine has 24.16.0, so no local receipt exists from this lane. The full `pnpm test` passed 346 of 348 before the Python fixture venv was installed, and the two Python-lane tests passed after.
