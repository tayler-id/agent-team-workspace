# Boundary slice review

Task: `agora-s1-isolate-client-core`, U01a.B03 slice 3. This is author review and retained execution evidence, not independent review or U01a qualification.

## Exact subjects

- Parent: `24f271fb26d3b92ddf7fdb9e9f291b3a8fb492d4`.
- Verified code: `5d437329f089e956962d4238015de14d491a9348`.
- Verified tree: `53aa0dbdf15efc365a98b1a821430e6bd8e4ba2b`.
- Those original receipts precede the refresh onto advanced default `57b9db6`. They remain unchanged. The refreshed subjects and runs are recorded below.

## Behavior and verification

Typed lint rejects framework, provider, transport and storage edges in pure packages across eight import/re-export forms, relative escapes, unknown dynamic targets, generated declarations and browser ambient types. Public-port traversal follows nested records, callbacks, aliases, generic arguments and inheritance. The public storage adapter may still use `pg` internally. Its positive control passes all lint rules; disabling either boundary rule makes its own denial fixture incorrectly pass all lint rules.

Export maps close private paths, including the center's Hono composition. The only wildcard is the exact contract-schema mapping. A separate ES2024-only compile rejects DOM and Node globals. `pnpm boundaries` produces the native eight-test JSON report at `.scratch/boundaries.json`; it does not pretend a console path announcement is JSON.

- [red.log](red.log): seven intended assertion failures against the exact parent, not missing tooling. [green.log](green.log): all seven pass at the code head. [test-patch.diff](test-patch.diff) and headers identify the patch, toolchain and configuration.
- [lane-8.json](lane-8.json): eight boundary tests pass, including disabled-rule and widened-export-map controls. [lane-7.json](lane-7.json): six literal TypeScript/Swift projections agree.
- [gates.log](gates.log): 79 tests pass, including real PostgreSQL; lint, both TypeScript lanes, docs, drift, authoritative design checks and unchanged informational plan checker pass.
- [skill-run.log](skill-run.log): portable contract conformance, six public HTTP probes and idempotent migrations pass.
- [clean-install-build.log](clean-install-build.log): fresh exact-head worktree, frozen install and full `pnpm check` pass. [cleanup.log](cleanup.log): no owned server, PostgreSQL cluster, verification worktree or Swift lock remains.
- [performance.json](performance.json): five interleaved parent/head batches on identical core bytes. Head input p95 is 1.641 ms, ratio 0.979; all 50,000-position plus 1,000-event batches remain below 2 seconds. New boundary gate: 8.576 seconds. Clean full check: 53.811 seconds, below five minutes.
- [audit.json](audit.json) and [audit-all.json](audit-all.json): zero production and full-tree advisories after the repair below.

## Reproduced repairs and contrary evidence

`ambient-port-red.log` catches a `CSSStyleDeclaration` public leak. `export-map-red.log` catches abuse of the schema wildcard to publish private code. `report-path-red.log` catches Vitest's console announcement being mistaken for the JSON artifact. `decision-link-red.log` records a whitespace typo in this slice's newly appended decision link; historical decision rows remain unchanged.

The expanded full audit found pre-existing CVE-2026-85730 through the documentation tool's exact `smol-toml` 1.7.0 dependency. [audit-all-before.json](audit-all-before.json) retains the advisory. [toml-red.log](toml-red.log) reproduces the actual CLI hang in a bounded child process; [toml-green.log](toml-green.log) proves normal exit 2 with an invalid-TOML diagnostic after pinning only that transitive parser to 1.7.1. No production dependency or generated/installer byte changed for this repair.

## Scope and limits

The [feature page](../../../../docs/features/client-synchronization.md) explains the state machine, purpose and current implementation, with a Mermaid visual and exact verification links. Feature-map and project verification-skill updates are included. No UI, browser integration, production schema, service route, provider call, worker capability or generalized report machinery was added.

Observed host: macOS arm64, Node 24.16.0, pnpm 10.34.1, PostgreSQL 18.4 and Swift 6.3.3. This does not qualify other host/toolchain pins. Independent non-author review belongs to Firstmate. The U01a milestone and foundation gate remain unqualified.

`verify.sh` is the task-local reproduction recipe. Its performance probe is embedded to keep the final approved slice below the source-file limit. The recipe now writes to `refreshed/`, preserving the original metrics above.

## Refreshed stack on current main

All three approved slices are rebased onto `57b9db6892861b98e5d1edede90ef8621a807dec`. There was no synchronization, schema, generated-output or boundary-policy change during refresh. The rebased stack retains the design-handoff documentation gate from main. Original receipts are historical, not relabeled as these subjects.

| Slice | Exact parent | Refreshed subject | Behavioral receipt |
| --- | --- | --- | --- |
| Contracts | `57b9db6892861b98e5d1edede90ef8621a807dec` | `66013ee2d15a346d716339d3b7717e1734b74e83` | [red](refreshed/contracts/red.log), [green](refreshed/contracts/green.log): three intended assertion failures, then four passes |
| Core | `66013ee2d15a346d716339d3b7717e1734b74e83` | `6151f40f8378cc16fc90684dbf74a3f82ae0b9fb` | [red](refreshed/core/red.log), [green](refreshed/core/green.log): thirteen literal projection/decision failures, then thirteen passes |
| Boundaries | `6151f40f8378cc16fc90684dbf74a3f82ae0b9fb` | `7136c4b0c667838dc9293ae7982b488dda4e3806` | [red](refreshed/red.log), [green](refreshed/green.log): seven missing-denial assertions, then seven passes |

`verify.sh` produced the combined refreshed receipts at the boundary subject; [subject.log](refreshed/subject.log) records its tree and toolchain. The earlier two subjects were re-proved with these commands, from the final worktree:

```sh
out=evidence/U01a/agora-s1-isolate-client-core/3-boundaries/refreshed
node scripts/record-red-green.mjs --parent 57b9db6 --head 66013ee --out "$out/contracts" -- pnpm exec vitest run --project contracts contracts/test/sync.test.ts
node scripts/record-red-green.mjs --parent 66013ee --head 6151f40 --out "$out/core" -- pnpm exec vitest run --project unit packages/client-core/test/sync.test.ts --project contracts contracts/test/replay.test.ts
```

- [gates.log](refreshed/gates.log): frozen install, lint, both compile lanes, docs, drift and all 79 tests including real PostgreSQL pass. Both authoritative design validators, 23 design negatives, 20 handoff negatives and the unchanged informational plan checker pass.
- [lane-7.json](refreshed/lane-7.json) and [lane-8.json](refreshed/lane-8.json): six independent TS/Swift literal projections agree, and all eight mechanical boundary tests pass. These are headless transcripts, not screenshots or UI qualification.
- [skill-run.log](refreshed/skill-run.log): portable conformance, all six HTTP probes, and migration repeatability pass. No verification-skill or feature-map drift was found in this refresh. Source and live coverage were performed serially, without delegated agents.
- [performance.json](refreshed/performance.json): five interleaved parent/head batches, identical core source digest, pooled input p95 2.226 ms, ratio 0.990. Every large replay remains below two seconds. Boundary gate 9.299 seconds; clean full check 56.354 seconds. [clean-install-build.log](refreshed/clean-install-build.log) is the clean exact-subject build.
- [audit.json](refreshed/audit.json) and [audit-all.json](refreshed/audit-all.json): zero production or development advisories. [cleanup.log](refreshed/cleanup.log) records no owned fixture process, temporary verification worktree, cluster or Swift lock. All receipts remain after cleanup.

R11 counts include executable evidence recipes as authored source. Slice 1: 344 additions/5 deletions across 15 authored files, plus 198 fixture lines, 1,176 generated additions/3 deletions and two lockfile lines. Slice 2: 621 additions/25 deletions across 18 authored files, plus 729 fixture lines and 11 lockfile additions/1 deletion. Slice 3: 515 additions/20 deletions across 23 authored files, plus 10 lockfile additions/4 deletions; no generated or golden-fixture change. These conservative counts include blank lines; execution receipts and their review notes are counted separately in [size-counts.json](refreshed/size-counts.json). Each slice exceeds the target for the already-approved coupled contract/core/guard scope but remains below both blocking thresholds. The final receipt commit changes evidence only.

Limitations remain the same: tested host/toolchains only, no browser or screenshot claim, no independent author review, and no U01a/foundation readiness verdict. Firstmate owns independent review and landing of the three slices. No remote publication or merge was performed.
