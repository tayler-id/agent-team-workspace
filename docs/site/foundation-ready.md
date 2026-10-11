# Foundation-ready aggregate

## What it is

One command that asks whether Agora's executable foundation is ready for product work. `node scripts/project.mjs project verify --scenario foundation-ready --json` runs the proofs the repository can run today, reports the rest as unavailable, and exits nonzero unless all eight mandatory proofs (FG01 to FG08 in [R22](repo:docs/technical-spec.md)) pass. `pnpm verify:foundation -- --json` is the same command. [The aggregate](repo:scripts/foundation-ready.mjs) is an internal verification tool with fixture authority. It qualifies no unit, milestone or foundation and grants no enrollment, approval or write capability.

## What it does

It prints an `agora.foundation/v1` report. Each of the eight proofs carries its exact subject, the head it was bound to, an outcome of pass, fail, blocked or unavailable, and named denials. A pass lists artifacts with byte lengths and digests. The report is labeled `live`, or `fixture` when tests drive the pure aggregate with literal observations.

- FG01 to FG03 replay the retained U01a task proof. The [U01a driver](repo:scripts/foundation.mjs) runs in an owned copy at the proven revision with the retained red and green receipts. FG01 needs red, green, guard, bootstrap and static checks. FG02 needs the contracts check. FG03 needs the client-core check. Each also fails if a file it depends on changed after the proven revision.
- FG04 and FG05 run the real [U01b lane suite](repo:packages/verification/test/project.test.ts) once. FG04 passes only when lanes 1 to 4 passed and FG05 only when lanes 5 to 7 passed.
- FG06 stays unavailable while [trusted reporting](trusted-checks.md) has no enrolled App. FG07 stays unavailable without an approved separate-host recovery. FG08 stays unavailable without qualified browser and accessibility evidence and two-human review. A record that merely exists never turns any of them into a pass, so a later outcome file reports blocked until a validator reads it.

## Why it exists

The specification makes this command the runtime authority before any feature or write-enabled agent starts. A task passing its own checks does not show the whole foundation is ready, and a lane that exists does not prove a plan predicate nobody ran. The aggregate keeps those claims apart. Today three proofs cannot pass for reasons only a human or an account owner can remove, so the honest result is a nonzero exit that names them.

## How it works

```flow
Resolve the head | Read the committed head and refuse a dirty tree. Every proof binds to this one revision and a digest of the code, contract and configuration files.
Run the probes | Replay the U01a proof for FG01 to FG03, run the U01b lanes for FG04 and FG05, and inspect enrollment and recovery inputs for FG06 to FG08.
Validate each proof | Reject a missing, duplicate or unknown proof, another revision, a changed subject file, a source change during the run, and artifacts whose bytes differ from their digests.
Roll up | Any fail gives exit 1, then blocked 2, then unavailable 3. Only eight passes give exit 0.
```

The aggregate reads only repository files and its own probe output. It starts no service outside the lane suite's owned fixtures and accepts no caller-supplied proof. The `--artifacts` directory must sit under `.scratch/` or `evidence/`. Options other than `--scenario` and `--artifacts` are a usage error. The old `pnpm verify:foundation -- --parent PARENT --head HEAD --evidence DIR` form still reaches the [U01a driver](test-first.md) unchanged.

## Implementation status

**In progress.** The aggregate and its report contract are implemented. A live run at this head exits nonzero. FG06 needs the trusted-reporting enrollment decision, FG07 a separate recovery host, and FG08 browser tooling and two human reviewers. Replaying the retained U01a pair also fails FG01 to FG03 whenever relevant files changed after that pair, which stays true until reviewed U01a evidence is recorded at a newer revision. None of this is a defect to route around.

## Verification and proof

[The behavioral tests](repo:packages/verification/test/foundation-ready.test.ts) drive the public surface. They cover a labeled all-pass fixture with exit 0, each non-pass outcome and its exit code, missing, duplicate and unknown proofs, revision and subject drift, a mutated tree, absent or altered artifacts, help text, option refusal and the legacy alias. The recorded red and green logs and the live run are under [the task evidence](repo:evidence/U01b/agora-foundation-ready-aggregate/README.md). The literal commands are in [the verify-agora recipe](repo:.agents/skills/verify-agora/SKILL.md).
