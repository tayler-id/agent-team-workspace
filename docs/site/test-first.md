# Task proof admission

## What it is

A local verification tool for `agora-s1-enforce-test-first`, Build box U01a.B04. Its authority is `foundation_fixture`. It reports whether this task has reproducible behavioral proof. A passing task does not qualify U01a, enable an application feature, authorize an agent write, or replace independent human review.

## What it does

`pnpm verify:foundation` emits the schema-authored `agora.foundation/v1` report. It replays retained red and green receipts at their declared Git revisions, mutates one real guard in an isolated copy, and reruns the existing bootstrap, PostgreSQL, contract, client-core, boundary and documentation owners. Missing evidence fails closed with named denials. The default foundation scope remains blocked because later proofs do not exist.

## Why it exists

A file called `red.log` does not prove a missing behavior. Neither does a failing process that could not load its runner. Admission requires the named assertion `FG01.red-required` to fail while the baseline admission operation succeeds. The same test must pass at the head. This makes fabricated exits, unrelated failures and always-red guards insufficient.

## How it works

```flow
Declared subject | Resolve exact parent and head commits. Reject a stale driver or a non-ancestor parent before execution.
Behavioral replay | Apply the head test patch at the parent. Compare native assertion identities and causes with the retained receipts, then require those assertions to pass at the head.
Guard counterexample | Run the unchanged assertions, disable only the red-required check in an isolated copy, and require exactly its named assertion to fail.
Admission or denial | Require preserved feature mappings and fresh prerequisite behavior. Return stable missing-proof IDs instead of accepting files or a claimed status.
Separate authority | Task success stays local; this driver cannot grant milestone qualification by itself. FG01 through FG03 were qualified separately, at the operator level, by rerunning all ten plan-defined lanes fresh at the milestone head. FG04 through FG08 are not implemented here. Human review remains required.
```

The recorder checks tracked source integrity before and after execution. The guard driver restores the mutated file before removing its owned worktree. Receipts bind the command, test patch, configuration, toolchain and revisions. Timestamps describe runs but do not prove chronology. Fresh replay establishes reproducibility; independent review still judges test adequacy and chronology.

Applicability is explicitly behavioral for this one task. There is no self-declared prose exemption. The driver rejects deleted required scenarios, duplicate feature IDs, unmapped changed source, and new product feature entries. Its internal policy rejects unknown proof IDs, duplicate subjects, stale revisions and unverified observations. It accepts no caller-supplied command or claimed prerequisite pass.

## Implementation status

In progress at this task snapshot. The bounded driver and tests implement U01a.B04 only. The full `agora project doctor|scenarios|start|verify|evidence|stop` runner, general evidence storage, trusted CI, reviewer authentication and production authorization belong to later tasks. Local candidate code runs with the developer's permissions, not in a security sandbox. Do not use this tool on an untrusted repository with secrets present.

The U01a milestone that this task's proof feeds into is separately **qualified**, at revision `b9c65c4`; see the [milestone qualification receipt](repo:evidence/U01a/outcome.json). This one task's own admission is still local and does not, by itself, grant that qualification.

## Verification and proof

The [policy](repo:scripts/foundation-policy.mjs), [replay engine](repo:scripts/foundation-replay.mjs), [public driver](repo:scripts/foundation.mjs) and [report schema](repo:contracts/schemas/foundation.schema.json) define the implementation. The [admission tests](repo:packages/verification/test/admission.test.ts) and [protocol negatives](repo:packages/verification/test/protocol.test.ts) check behavior. The [retained task proof](repo:evidence/U01a/agora-s1-enforce-test-first/README.md) includes red/green receipts, both lane reports, security limits and the original performance anomaly. The baseline stub is an intentional test-only parent, not a product capability. The [verification instructions](repo:.agents/skills/verify-agora/SKILL.md) retain the literal commands.

### Public command reference

All commands run at the committed candidate head. `PARENT` and `HEAD` are full 40-character Git SHAs. `DIR` is a real directory beneath `evidence/` or `.scratch/`, without symlink redirection.

```sh
node scripts/foundation.mjs --scope record --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope task --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope lane-9 --parent PARENT --head HEAD --evidence DIR --json
node scripts/foundation.mjs --scope lane-10 --parent PARENT --head HEAD --evidence DIR --json
pnpm verify:foundation -- --parent PARENT --head HEAD --evidence DIR --json
```

`record` captures red, green and guard receipts; it does not admit the task. `task` reruns the mandatory owners. `lane-9` tests disabled, stale, malformed, unrelated and always-red guard proof. `lane-10` supplies missing and forged red evidence and tries premature feature admission. `feature` requests product admission and remains denied. The default scope is `foundation`, not `task`.

Exit meanings follow R12: 0 is the selected scope's pass, 1 is an observed denial, 2 is a blocked prerequisite, 3 is unavailable, 64 is usage error, and 70 is infrastructure failure. Reports sort denials and retain exact proof subjects. Timing and native assertion results are in referenced artifacts. Error reports may omit unresolved revisions. No success can use an unresolved revision. Cleanup removes only owned copies and preserves evidence. The report cannot certify its author or grant merge authority.
