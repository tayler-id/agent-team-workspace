# Candidate CI workflow evidence

Task `agora-ci-bootstrap-slice`. Ordinary pull request CI only. Nothing here is a trusted evidence signature, an `agora/evidence` check or merge authority, and the credential-bearing reporter stays a separate, unqualified security task.

## Files

- `red.log`, `green.log`, `manifest.json`, `test-patch.diff` come from the real `bash scripts/ci-red-green.sh a62662e <head>` run, which calls `scripts/record-red-green.mjs` and `scripts/validate-evidence.mjs`. The recorded commit is `8b5120d`. Red exits 1 on the parent (no workflow, no scripts), green exits 0. Red has no `Failed Suites`, so the suite loaded and the assertions failed.
- `failing-test-negative.log` is `pnpm test packages/verification/test/negative.test.ts` run in a throwaway worktree with one test asserting `1 + 1` is `3`. It exits 1 and names the failing test. The worktree was removed afterwards.

## Guard negatives for `ci-workflow.test.ts`

Each mutation was applied to `.github/workflows/agora-ci.yml`, the test was run and watched fail, then the file was restored from a copy and the test passed again.

| Mutation | Result |
| --- | --- |
| `persist-credentials: true` | 1 failed |
| top-level `contents: write` | 1 failed |
| job-level `permissions` added | 1 failed |
| action pinned to `@v4` | 1 failed |
| `pull_request_target` trigger | 1 failed |
| `pnpm lint` replaced by `true` | 1 failed |
| `secrets.X` reference | 2 failed |

## Source choice

The workflow is the read-only test-driver design from `13e733c` (agora-trusted-checks) with the reporter, App, signing, enrollment, credential policy and protection scripts left out. The `guards` job runs `agora project lanes` for task `agora-s1-validate-project-evidence`, the lanes 1 to 7 this branch has. The web jsdom `testTimeout` of 30 s repeats the `13e733c` fix for a hosted macOS runner; no test changed.

## Red-green classifier correction

PR 5 run 37157184703 failed `red-green` at `a2e42e2`, a lint and typecheck repair that changed only the workflow test. Replaying it against its parent `86bea57` gave `red_exit=0, green_exit=0`, because the repair changes no behavior. The driver only skipped red for commits carrying an `Applicability: coverage` trailer, which that published commit lacks, and published history is not rewritten.

`scripts/ci-red-green.sh` now skips red for a commit that changes nothing outside tests, docs and evidence, using one pattern for both the per-commit skip and the final "source changed without a changed test" guard. A commit that changes source, scripts or configuration along with a test still goes through the recorder and needs a real red. Three new cases in `ci-workflow.test.ts` cover the skip and the denial for `packages/.../src`, `scripts/` and `apps/web/vitest.config.ts`. Controls watched fail and restored: the old trailer rule (skip case red), an unconditional skip (denial case red), and a final guard that ignores source (existing rejection case red).
