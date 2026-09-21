# Verification and evidence

Agora must prove both the platform and each managed project's actual behavior. One cannot substitute for the other. These docs add a documentation gate; they do not qualify the full Agora foundation.

## Run the existing foundation contract

The project-owned [verify-agora skill](repo:.agents/skills/verify-agora/SKILL.md) supplies literal Doctor, Launch, Drive, Evidence and Cleanup instructions. Its current scope is U01a.B01 through U01a.B04, including cross-language replay, mechanical boundaries and [task proof admission](test-first.md).

```flow
Doctor | Check runtimes, install locked tools and pass static gates.
Launch and drive | Use owned isolated resources; assert public response values and actual database effects.
Evidence | Retain exact parent/head, test patch, toolchain, config and fixture identities.
Independent review | Inspect the committed implementation and proof, not the implementer's summary.
Cleanup | Remove only owned resources and prove evidence survives.
```

Use [the current commands](cli.md) and [getting started](getting-started.md). The future `agora project` runner is not yet available; `node scripts/probe-center.mjs --scenarios` is the current structured scenario inventory for the center probe.

## Red before green

A behavior test must fail for its intended assertion at a working parent harness, then pass at the implementation head. Missing tools, syntax errors or an unreachable baseline are invalid red. The recorder carries the head test patch to the parent and retains both results; the reviewer inspects their cause.

Every guard also needs a negative fixture. Disable that exact guard in an isolated test copy: its assertion must turn red. Merely obtaining a nonzero process exit does not prove the check is useful.

## Three distinct gates

| Gate | What it proves | What it does not prove |
| --- | --- | --- |
| Design semantics | Plan/task ownership, dependency graph and required foundation coverage | Runtime readiness |
| Documentation consistency | Links, required explanations/visuals, statuses, inventory and 22 milestone coverage | Whether a model's prose accurately describes code |
| Runtime foundation | Mandatory FG01-FG08 with real fixtures, evidence, recovery and selected-client qualification | Not implemented completely yet |

Run the authoritative design tools:

```sh
node scripts/verify-design.mjs
node scripts/test-design-checks.mjs
```

```flow
Baseline sandbox | Copy docs, scripts, evidence, packages, contracts and apps into a disposable tree so legitimate decision links resolve.
Unchanged accept | verify-design exits 0 on the intact copy.
Isolated mutation | Change one document or omit one cited application source; assert the mutation actually applied.
Named rejection | Require the intended diagnostic text, not merely any nonzero exit.
```

The design-negative fixture is repaired at P0a: its baseline passes because cited application sources are present, and `omitted-application-source` fails with `missing link apps/center/src/app.ts` when that file is removed from a disposable copy. Mandatory CI aggregation, hosted enforcement and the broader guard catalog are not yet present; do not treat a green design-negative suite as landing protection. Receipts live under [evidence/ci/p0a](repo:evidence/ci/p0a/outcome.json).

`node scripts/verify-design-handoff.mjs` validates the independently owned design packet's sections, source links, diagrams, privacy and vocabularies. `node scripts/test-design-handoff-checks.mjs` runs its rejection fixtures. The site ingests those same committed Markdown files without becoming their content owner.

The unchanged upstream format checker is informational only:

```sh
node .agents/skills/poteto-mode/scripts/check-plan.mjs docs/implementation-plan.md
```

## Documentation proof

`pnpm docs:build` refuses invalid site content. `pnpm docs:test` checks the guard fixtures. Browser review must inspect navigation, links, keyboard focus, readable diagrams and both 390x844 and 1440x900 layouts. Reduced motion needs no special runtime because the site has no animation or client scripts.

The [authoring contract](authoring.md) requires a separate documentation reviewer to inspect the committed feature code, tests and receipts before agreeing with any Built claim. The generator checks proof existence at the snapshot revision; it cannot establish semantic adequacy or reviewer independence.

## Milestone qualification stays separate

FG01-FG03 cover repository/contracts/core and guard foundations. FG04-FG06 cover real project controls, evidence validation and trusted reporting. FG07 covers recoverable backups. FG08 covers the React production fixture. All are required before substantive product features. Consult [R22](repo:docs/technical-spec.md) and [the plan](repo:docs/implementation-plan.md), not an inferred percentage from task count.
