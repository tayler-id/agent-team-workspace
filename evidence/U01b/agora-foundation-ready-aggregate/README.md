# Foundation-ready aggregate evidence

Subject: `node scripts/project.mjs project verify --scenario foundation-ready --json` and the `pnpm verify:foundation -- --json` alias. Internal verification tool with fixture authority. Nothing here qualifies a unit, milestone or the foundation.

## Red and green

`red.log` and `green.log` come from `node scripts/record-red-green.mjs --parent e74ba9a --head 5547126` running `packages/verification/test/foundation-ready.test.ts`. At the parent 11 of 12 assertions fail (the aggregate module and the help text do not exist) and the option-refusal test passes. At the head all 12 pass. Parent e74ba9a is the default branch before this change. Head 5547126 holds the code, tests, schema, feature map and recipe; the later docs and evidence commits change no file the tests or the aggregate read.

Guard negatives, each watched going red and restored byte for byte. Dropping the revision check, the subject drift check, the artifact digest check, or the pass roll-up each failed the matching test.

## Live result at efe15f2

`live/foundation-ready.json`, exit 1. FG04 and FG05 pass from the real U01b lanes 1 to 4 and 5 to 7 (`live/lanes.json`, `live/command.json`). FG06 is unavailable because the reporting App is unenrolled. FG07 is unavailable because no separate-host recovery is approved. FG08 is unavailable because no qualified browser and accessibility evidence or two-human review exists.

FG01 to FG03 fail. The U01a driver ran in an owned copy at e0c480c with the retained receipts (`live/u01a-task-report.json`). Its guard, bootstrap, contracts, client, documentation and static proofs passed, but red and green did not reproduce. The retained receipts record Node 24.16.0, and this run used the pinned official Node 24.21.0, so the toolchain-bound replay compares unequal. Separately, files each proof depends on changed after e0c480c, so all three report `_subject_drift`. Both are real limits. Clearing them needs reviewed U01a evidence recorded at a newer revision, which is outside this slice.

## Toolchain

Official Node 24.21.0 darwin-arm64, SHA-256 `bed7eea5325e1108f32ce5228ddd6a5f0f08a499ee42aa7442aea583702f6057` checked against nodejs.org SHASUMS256.txt. Python venv from the locked `requirements.txt`. The injected `GIT_CONFIG_*` hooksPath variables were unset for the child command only.
