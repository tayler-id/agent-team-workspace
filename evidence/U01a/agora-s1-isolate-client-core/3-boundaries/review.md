# Boundary slice review

Task: `agora-s1-isolate-client-core`, U01a.B03 slice 3. This is author review and retained execution evidence, not independent review or U01a qualification.

## Exact subjects

- Parent: `24f271fb26d3b92ddf7fdb9e9f291b3a8fb492d4`.
- Verified code: `5d437329f089e956962d4238015de14d491a9348`.
- Verified tree: `53aa0dbdf15efc365a98b1a821430e6bd8e4ba2b`.
- These receipts precede the required refresh onto advanced default `57b9db6`. The final refresh will be recorded here, without relabeling these original runs.

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

`verify.sh` is the task-local reproduction recipe. Its performance probe is embedded to keep the final approved slice below the source-file limit; retained metrics are unchanged.
