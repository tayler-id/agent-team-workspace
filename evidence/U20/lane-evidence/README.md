# U20 lane and performance evidence

This slice builds the driver for U20's ten live lanes and its performance rule, and records one run of each. It adds no lint rule and changes no product code. It does not qualify U20 or open a foundation gate, and `outcome.json` says `qualification: not_claimed`.

## What is here

| Path | What it is |
| --- | --- |
| `../lane-N/assertions.json`, `transcript.log` | The exact subjects, rule ids and messages each lane observed. |
| `../lane-N/scenario.html`, `scenario.png` | A page of that lane's assertions and its screenshot from `chrome-devtools-axi` at 1440x900. It is a rendering of retained output, not a product screen and not an independent check. |
| `../outcome.json`, `../lanes.json`, `../command.json` | The runner's outcome, the vitest JSON report (ten passed, none pending) and the exact driver command. |
| `../unit.log` | Verbose vitest run of the driver and of the runner tests it added or touched. |
| `../feature-map.json` | The feature map at this head. |
| `red-green/` | Red and green runs of the new runner test from `scripts/record-red-green.mjs`. Red fails at the parent on `lanes_unavailable`, not on a build error. |
| `guard-negatives.sh`, `guard-negatives.log` | Five mutations of the real lint config and policy in a disposable clone, the lanes each turns red, and byte-identical restores. |
| `perf/perf.json`, `load-*.txt` | Ten timed samples, their p95 and the host load before and after. |

## Results at the recorded head

All ten lanes passed. Lane 1 lints the same `.ts` and `.tsx` fixtures at head, at `e74ba9a` (the parent) and at `9bb7462^`, the last commit before `.tsx` joined the guarded files. At the parent, `.tsx` is guarded and rejected the same way as `.ts`. At `9bb7462^`, the storage-import `.tsx` fixture produced no message at all, so the absence of `.tsx` coverage on old trunk is recorded as observed, while its `.ts` storage rejection matches head. Lane 8 lints the ten `apps/web/src` files of `99aa4f7` at a throwaway Feature path with their folder layout kept, and the lint reproduces 21 rejections across five files (raw `useEffect`, direct `window`, `document`, `setTimeout`, `crypto`, and Client-owned state). Five files draw none, among them `Cards.tsx` and `FixtureControls.tsx`. Lane 10 runs the six `pnpm boundaries` test files in one vitest run (56 passed, none failed or pending).

The guard negatives turned these lanes red, and each restore left the file byte-identical and the driver green again.

| Mutation | Lanes red |
| --- | --- |
| `agora/renderer-footgun` off in the main config block | 1, 3, 4, 6, 7, 8 |
| `agora/import-boundary` off in the main config block | 1, 2, 5, 7, 9 |
| `tsx` removed from the guarded extensions | 1 to 8 |
| Undeclared Feature check disabled in `boundary-policy.ts` | 7, 9 |
| Framework-to-Feature check disabled in `boundary-policy.ts` | 7, 9 |

Performance, five interleaved parent and head batches of `eslint .` and of `eslint` on tracked `.ts` files. The p95 of five samples is the slowest sample, so it is a maximum.

| Metric | Parent p95 (ms) | Head p95 (ms) | Rule | Result |
| --- | --- | --- | --- | --- |
| `lint_ms` | 6206 | 5231 | Head within 110% of parent | pass |
| `lint_ms` against `lint_ts_only_ms` | n/a | 5231 against 4758 | At most 2x the `.ts`-only time | pass, ratio 1.10 |

## Limits

- The measurement ran on a 18-core Apple Silicon host shared with other task workers. Load averages were 8.0 to 9.6 across the run and 11 earlier in the session. I did not control or pause other workers. The parent's first sample (6206 ms) is the slowest in the set and probably includes a cold cache, and it sets the parent p95.
- Five samples per side cannot support a tight regression claim. A 10% rule on this data separates noise from change only roughly.
- The `.ts`-only baseline is measured at head, where `.tsx` is already guarded. The plan's "existing `.ts`-only baseline" on the pre-U20 trunk was not measured separately.
- The parent tree is a fresh clone with its own install, so it never sees untracked files, while head runs in the working checkout.
- `scenario.png` is a screenshot of a page that prints each lane's assertions. It shows what the driver recorded, not an independent observation of the lint.
- Lane 5's record holds the literal strings `green` and `red`. They are written only after the head assertion passed and the weakened-copy assertion threw, so they follow from the test, but they are not a separate measurement.
- Lane 1 needs the pnpm store to hold the locked packages of `9bb7462^` and the parent, because it installs offline.
