# Per-unit lane and perf runner (R1)

This slice extends the existing `agora project` CLI so `lanes --unit` and `verify --scenario perf --unit` accept every unit in the manifest. It qualifies no unit and no foundation gate. It is the clean-history republication of pull request 17's branch, applied to current main.

## Receipts

- `red.log`, `green.log`, `test-patch.diff` and `manifest.json` come from `scripts/record-red-green.mjs`. Parent `7881d61`, head `6b9186f`. Red fails 19 of 21 assertions on the parent (new help text, `unavailable_capability`, `unknown unit U99`, per-unit perf, the missing `units` manifest). Green passes 21 of 21.
- `live/` holds real CLI runs against parent `7881d61`. Each `perf-UNIT/perf.json` has ten samples in run order and the p95 per metric.

| Unit | Outcome | Head p95 | Parent p95 |
| --- | --- | --- | --- |
| U21 | pass | generation 55 ms | 56 ms |
| U20 | pass | lint 5035 ms, `.ts`-only 4771 ms | lint 5516 ms |
| U01b | pass | startup 1252, scenario 246, evidence 226, 10-MiB validation 134 ms | 1226, 262, 217, 124 ms |
| U22, U23, U01c, U01d | unavailable, exit 3 | no probe, reason in the report | none |

`lanes --unit` for U20, U21, U22, U23, U01c and U01d exits 3 with the reason for all six.

## Guard negatives

Each mutation was applied to the committed file, the named test run, and the file restored with `git checkout`. All nine went red on the intended assertion.

| Mutation | Test that turned red |
| --- | --- |
| regression factor 1.1 to 1.5 | 111 versus 100 must fail |
| absolute budget check removed | 5001 must name `perf_budget` |
| multiple-of-another-metric budget removed | 49 versus 100 must fail |
| probe output check removed | non-JSON and wrong-metric output must fail |
| unit lane guard removed | six units must be unavailable |
| batch order not alternated | sample order must be P H H P P H H P P H |
| manifest requires no lane reason | a unit without one must refuse |
| parent absence never recognised | absent parent must be reported and budgeted |
| any parent failure counts as absent | exit 5 at the parent must fail |

## Limits

- Five batches make the p95 the maximum sample. A 10% rule on a 55 ms probe can fail on noise, so read `perf.json` before blaming a change. U21 uses the median of seven runs per sample to damp this.
- U01b "evidence finalization" is the general evidence validator run over a signed bundle with a 10-MiB patch, not a new finalizer.
- U22, U23, U01c and U01d have no executable probe. U22 has native Client and Host lane tests that are not wired to this runner. U23 needs the move to exist, U01c needs a separate-host restore, U01d needs the browser qualification that is not installed.
- Node 24.21.0 was checked against the published SHA-256 only; no GPG tool was available.
- `.scratch/producer.key` from a previous use of this checkout slot was moved aside; receipts are signed by a key generated for this task.
- `local-checks run` needs the Firstmate `GIT_CONFIG_*` hooksPath override unset for that child, because it defeats the gate's own throwaway-repo tests.
