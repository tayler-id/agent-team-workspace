# Evidence validator lean import

Follow-up to the CI timeout of https://github.com/tayler-id/agent-team-workspace/pull/12. The evidence-validator
lane 7 test starts `scripts/validate-evidence.mjs` twelve times, and each start compiled the wire validator through
`project-checks.mjs` even though the validator never reads it. `exits`, `hash` and `requireThat` now live in
`scripts/project-primitives.mjs`, which imports only `node:crypto`. `project-checks.mjs` re-exports them.

## Proof

- `red.log` is the new `validator-startup.test.ts` run in an unmodified copy of parent `0f0a11f` (a `git archive`
  extract with the test file added). It fails on the loaded-module assertion. The list it received starts with
  `scripts/project-checks.mjs`, `contracts/src/index.ts` and `ajv/dist/2020.js`.
- `green.log` is the same test at the head. Exit 0.
- `interleaved-lane7.csv` holds six parent/head pairs of the unchanged `evidence-validator.test.ts`, alternating
  parent then head, under background QoS (`taskpolicy -b`) with twelve background `yes` burners kept up for the whole
  run. The parent timed out on lane 7 in 6 of 6 pairs (10220 to 11936 ms, `Test timed out in 5000ms`). The head passed
  in 6 of 6 (2225 to 3360 ms). Every other test in that file passed on both trees.
- The existing lane 5 to 7 assertions are unchanged. `project.test.ts`, `evidence-validator.test.ts` and the new test
  pass together (9 tests).

## Limits

- Not a macos-15 runner. Slowdown is emulated on an Apple M5 Pro shared with other lanes (load average 12 to 14 at
  the start of each trial). The pairs control for drift between variants, not for absolute time.
- The recorder `scripts/record-red-green.mjs` creates its worktree with `git worktree add`, which this task may not
  run. The red and green here are hand-run in a `git archive` copy, so there is no signed `manifest.json` and
  `validate-evidence.mjs` cannot check this directory. CI replays the commit against its own parent through the
  recorder, which is the receipt that counts.
- Twelve process spawns remain in lane 7, so extreme contention can still approach the 5000 ms budget. The budget is
  unchanged.
- Other at-risk default-budget tests and the PR 14 failures are outside this correction.
