# U23.B01 center local-room Entrypoint receipts

Partial construction slice of U23.B01. It moves the existing adapter selection from `apps/center/src/main.ts` into `apps/center/src/features/local-room/entrypoint.ts`. U23 is not qualified and the web renderer has not moved.

`red.log` runs `packages/verification/test/feature-discovery.test.ts` against the parent. The new assertion fails because the committed inventory holds no `apps/center` Feature (`expected [] to deeply equal [ ... ]`). `green.log` passes at the head.

`apps/center/test/local-room.pg.test.ts` is the proof that runs `selectLocalRoom`. It spawns `apps/center/src/main.ts` against a throwaway PostgreSQL cluster and drives sends, snapshots and a restart. At `2e153d4` it passed 6 of 6 with `node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg apps/center/test/local-room.pg.test.ts`. With `selectLocalRoom` temporarily pointed at another `roomId` it failed 6 of 6, and passed again once the file was restored byte for byte.

The `fb1` live drive is a regression check of the unchanged live runtime, not proof of this slice. `node scripts/local-room.ts start` launches `scripts/local-room-service.ts`, which composes its own adapter and never imports `entrypoint.ts`. `live-history.json` (CLI history) holds three CLI sends at room_seq 1 to 3 (`fb1 CLI first` 18:59:57, `fb1 CLI third` 19:00:05, `fb1 CLI fourth` 19:00:20 UTC) and the browser send `fb1 browser second` at seq 4 (19:00:27). The body names give the intended order; the browser message committed last. `live-browser-order.txt` (the browser timeline) shows the same committed order. The instance was stopped with `local-room.ts stop`, data retained.

Not claimed. `local-checks run` needs Node 24.21.0 and this machine has 24.16.0, so no local receipt exists from this lane. The full `pnpm test` passed 346 of 348 before the Python fixture venv was installed, and the two Python-lane tests passed after.
