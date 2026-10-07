# Trusted checks (U01b.B03)

Task `agora-s1-qualify-trusted-checks`. These receipts close only this task's own gate. They do
not claim FG06, lanes 8-10 at the milestone level, or the U01b milestone.

## Bootstrap

- `main` at `a62662e8788a072289b14b82f80cc970e1bd6943` was clean, and
  `node scripts/local-checks.mjs verify` accepted its exact-head receipt before anything else.
- The repository had no remote. I added only `origin`
  (`https://github.com/tayler-id/agent-team-workspace.git`) and pushed `refs/heads/main` once,
  without force or tags. `live/bootstrap-readback.txt` shows the repository private, id
  `1402470808`, admin permission, and `main` at `a62662e`. `tayler-id/Agora` was not touched.
- `no-mistakes init` and `no-mistakes doctor` ran. No pipeline was started; this task ships
  direct-PR.

## What landed

| Commit | Slice |
| --- | --- |
| `d9c06b3` | Harness: `scripts/trusted-checks.mjs policy` works, `evaluate` is unavailable |
| `2859342` | Slice 1: run, checks and protection decisions; lanes 8-10 |
| `1ef6b03` | Slice 2: `agora-ci` and `agora-report` workflows and the `workflows` guard |
| `6c975c0` | Harness: `scripts/trusted-report.mjs` blocks unenrolled, otherwise unavailable |
| `d5c32d7` | Fix: CI red-green replays per commit; docs corpus count |
| `0aee796` | Slice 3: the reporter |
| `b943f93` | Fix: an `Applicability: coverage` record lets a test-only commit skip red |
| `6b71d63` | Coverage: four rules the first guard sweep found untested |
| `d5c32d7`..`13e733c` | CI fixes: per-commit red-green, `tests` on `macos-15`, web jsdom timeout |
| `db70b1a` | Slice 4, review F2/F3: exact reporter allowlist, sensitive-path policy, dormant reporter, docs correction |

`docs/site/trusted-checks.md` explains the design. Decision D113 records why the workflows are
canonical JSON-subset YAML and why the reporter reads job conclusions from GitHub's jobs API.

## Independent review and slice 4

The independent security review (firstmate's `agora-trusted-checks-security-review` report) passed
`13e733c` as dormant machinery only and blocked enrollment on four findings. Slice 4 closes two:

- **F3.** The reporter workflow must now equal `reporter.allowlist` in the policy exactly. Lane 9
  asserts fourteen bypass forms, each passing the old text patterns, as
  `reporter_workflow_not_allowlisted`, including a `display_title` step, `toJSON(secrets)`,
  `secrets['OTHER']`, a fork checkout, a job-level secret, a third-party action and a dropped `if`.
- **F2.** `agora/policy` now fails with `sensitive_path_changed:PATH` when the pull request changes
  `.github/`, the policy, either trusted script or the CI scripts. The reporter lists changed paths
  through `pulls/{n}/files` and never fetches or runs candidate copies. The reporter suite
  reproduces the review's S1 (a pull request editing the reporter) and now gets a failing
  `agora/policy` that merge refuses.
- **Docs.** `docs/site/trusted-checks.md` no longer says a candidate cannot produce a passing
  result for itself. It says what `agora/evidence` proves today: the candidate's own scripts passed
  under the reviewed workflow.
- **Dormant operation.** `agora-report` runs only when the repository variable
  `AGORA_REPORTER_ENABLED` is `true`. Until enrollment, GitHub skips it on every pull request, so it
  is no longer red on every pull request. It publishes no check and holds no credential, and the
  decision tool still refuses an unenrolled policy. The variable reads back 404 today. This
  workflow change needs the same independent review as the rest.

Open before enrollment, as following slices:

- **F1.** The driver's commands still come from the candidate's tree (`package.json` scripts,
  `scripts/`, configuration). Run them from a default-branch checkout with the candidate as data.
- **F4.** Add `environment` and `app` read-back kinds that prove `agora-reporter` is limited to
  `main` with exactly the two secrets and that the App is checks-only on one repository.
- **F5.** `checks` still needs reshaped input (`app_id`, a top-level `head_sha`). Accept GitHub's
  raw rows before the first live merge read-back.
- F6 to F8 (red-green granularity, 40-hex SHA and Ed25519-only key checks, driver `branches` and
  protection extras) stay backlog, each test-first.

## Red and green

Each slice was recorded with `scripts/record-red-green.mjs` against the commit right before it,
and each bundle passes `scripts/validate-evidence.mjs` with its exact head and parent.

- `slice-1/` (parent `d9c06b3`): red is `3 failed`. Each lane's `policy` baseline passes, then
  its first assertion receives `outcome: "unavailable"` where it expects `"pass"`. Green 3/3.
- `slice-2/` (parent `e93285e`): red is `2 failed | 1 passed`. `--kind workflows` is a usage
  error there. Green 3/3.
- `slice-3/` (parent `d5c32d7`): red is `5 failed | 2 passed`. The four reporter tests fail on
  the harness outcome, and lane 8 fails on GitHub's raw 403 body. Green 7/7.
- `slice-4/` (parent `13e733c`): red is `2 failed | 6 passed`. Lane 9 fails on the bypass forms
  the old pattern rules passed, and the new reporter case fails because the old reporter published
  `agora/policy` as `success`. Green 8/8.
- `attempts/` holds two rejected recordings of slice 1. One failed to load because a fresh
  worktree had no `.scratch`, which is infrastructure, not red. The other went red on the
  exit-code map instead of behavior. Both were fixed before the kept recording.

## Guard negatives

`guards/sweep.mjs` weakens one rule at a time, runs the owning tests, restores the file bytes
and checks the SHA-256 before the next mutation. It covers every `denials.push` in
`scripts/trusted-checks.mjs`, the signature check and two blocking prerequisites, plus five
reporter rules: the decision-process environment, the token scope, the credential check, the
publishing credential and the conclusion mapping.

- `guards/sweep-first.log` at `0aee796`: 55 mutations, 4 survived (`pull_request_missing`,
  job-level driver permissions, `reporter_trigger`, `reporter_permissions`).
- `guards/sweep.log` at `6b71d63`: 55 mutations, 0 survived, restored tree green.
- `guards/sweep-slice4.log` at `db70b1a`: 52 mutations (six pattern rules removed, three rules
  added), 0 survived, restored tree green.

The suites also carry their own in-test guard negatives. Lane 9 runs a copy that trusts any
App, lane 10 a copy that accepts any job conclusion, and the reporter tests a copy that passes
its whole environment to the decision process.

## Live read-back

`live/readback.log`, taken at `561b0d8`:

- Branch protection and rulesets return HTTP 403 "Upgrade to GitHub Pro or make this repository
  public to enable this feature." Under a namespaced enrolled policy
  (`live/namespaced-policy.json`, public key only) that body evaluates to `blocked`,
  `plan_upgrade_required`.
- Environments read back empty.
- Under the committed policy every protection and checks evaluation is `blocked`,
  `reporting_app_unenrolled`, and the Python fixture is `repository_unprovisioned`.
- The PR head's real check runs all come from `github-actions` (App 15368) and none is named
  `agora/evidence` or `agora/policy`. Under the namespaced policy that is `fail` with
  `check_missing` for both.
- The committed workflows pass `--kind workflows` under the committed policy.

## Plan versus token scope

`live/plan-vs-scope.log` is read-only. The same Vault-issued token (scopes `gist, read:org, repo,
workflow`) has admin permission on both this private repository and the public
`tayler-id/agent-platform`. On the public repository, `GET .../branches/main/protection` answers
404 "Branch not protected", so the endpoint and token work. On this private repository it answers
403 "Upgrade to GitHub Pro or make this repository public to enable this feature." The only
difference is visibility. Established: authentication and scope are not the cause, and GitHub's
own message names the plan. Unknown: the account's billing plan (`/user` returns no `plan` field
without the `user` scope) and any entitlement GitHub might grant another way. This is not proof of
what the account pays for.

## Live prerequisites (human, not done here)

Nothing was purchased, no account security changed, no App registered or installed, and no
credential created or copied. This is the smallest setup that unblocks lane 8 live and the first
real reporter run:

1. **Plan.** Branch protection, rulesets and environment secrets on a private repository need
   GitHub Pro (or a Team organization). Without environment secrets the reporter keys could only
   be repository secrets. A same-repository pull request can read those by editing its own copy
   of a workflow, so they must not be stored that way.
2. **Reporting App.** Register one GitHub App for this repository only, with Checks read and
   write, Metadata read, no webhook and no other permission. Install it on
   `tayler-id/agent-team-workspace` alone. Put its numeric App ID in
   `agora/trusted-checks.json` `projects.agora.reporter.app_id` in a reviewed pull request.
3. **Reporting key.** Generate an Ed25519 key offline (`openssl genpkey -algorithm ed25519`).
   Put the public key PEM in `reporter.public_key` in the same reviewed change.
4. **Environment.** Create the `agora-reporter` environment with deployment branches limited to
   `main` before adding any secret, then set the repository variable `AGORA_REPORTER_ENABLED` to
   `true` last. Add the App private key as `AGORA_REPORTER_APP_KEY` and the Ed25519 private key as
   `AGORA_REPORTING_SIGNING_KEY`.
5. **Protection on `main`.** Require a pull request with one approval from someone other than
   the author, dismiss stale approvals, require code-owner review, and require strict status
   checks `agora/evidence` and `agora/policy` from that App. Enforce for admins, allow no bypass,
   and allow no force push or deletion. A one-person account cannot satisfy "another human
   review".
6. **Python fixture.** Create a disposable private repository for the fixture with its own App
   and key, and fill in `projects.python-fixture`.

Then run the Doctor read-back in `.agents/skills/verify-agora/SKILL.md`. After this branch
merges, the first `agora-report` run on a later pull request is the first real reporter
evidence. `workflow_run` workflows run only from the default branch, so `agora-report` cannot run
on this pull request.

## Required independent review

This task changes security-sensitive check reporting, so it needs an independent exact-head
security review by someone other than the implementer. My own tests, sweeps and CI runs cannot
supply that verdict. Scope: `scripts/trusted-checks.mjs`, `scripts/trusted-report.mjs`,
`agora/trusted-checks.json`, `.github/workflows/agora-ci.yml`,
`.github/workflows/agora-report.yml`, `.github/CODEOWNERS`, `scripts/ci-red-green.sh`,
`scripts/ci-setup.sh`, and the two test files. Points worth attacking:

- The `Applicability: coverage` skip in `ci-red-green.sh` is a new allowance. It is limited to
  commits touching only tests, docs Markdown and evidence.
- The text checks behind `driver_secret_reference` and `reporter_candidate_reference` are
  pattern matches over the canonical JSON.
- The reporter publishes `agora/policy` with the same signed receipt as `agora/evidence`, and
  merge-side read-back requires a passing receipt on both.
- `agora-ci` runs the candidate's own copy of the workflow. The reporter refuses a run whose
  driver differs from the default branch, but any secret available to pull-request workflows is
  exposed regardless. That is why prerequisite 1 matters.

## Coverage limits

- No live App, key, protection or reporter run exists, so lanes 8-10 are proven against
  namespaced fixtures and a loopback fake GitHub API only.
- The `agora-ci` jobs on GitHub run on Ubuntu with PostgreSQL 18, except `tests`, which runs on
  `macos-15` (arm64), the platform the project qualifies. On Ubuntu, run `37082981929` showed ten
  failures in suites that predate this task: four Swift conformance tests (the Swift package does
  not build on Linux), two PostgreSQL wrapper stderr tests (GNU and BSD `getopt` quote differently)
  and four `apps/web` jsdom tests. Porting the first six is outside this task. On `macos-15`,
  run `37152910078` passed 295 of 299; the remaining four were the same `apps/web` timeline tests.
  The reconnect test takes about 3.9 s of vitest's 5 s default locally and timed out on the
  runner, and its still-running render emptied the DOM for the next three. The web project's
  `testTimeout` is now 30 s; no test changed. The job conclusions come from the generic Actions
  App and gate nothing.
- The plan's perf probe (`agora project verify --scenario perf`) does not exist. I ran no
  performance comparison. The lane and reporter suites take a few seconds locally.
- The policy has no JSON Schema under `contracts/`. Like `agora/local-checks.json`, its shape is
  checked in code.
