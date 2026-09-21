# Local-room L3 runtime evidence

This is a local-only stacked candidate, not merge authority. Required stack base: `55269a5103656a63cc6f246c00ebb1efa6785866`. Test-only public baseline: `661b4c5`, a direct descendant. The implementation and evidence commits remain linear descendants of that exact L2 candidate. No preservation/browser-shell/P0a/U01b branch was copied or made an ancestor. Nothing was pushed, merged or submitted to a remote pipeline.

## Scope and proof

The runtime owns a private PostgreSQL 18 cluster, center, minimal browser harness and CLI. Snapshot and event reads use the non-owner application role. Acceptance drives public CLI/HTTP/browser surfaces, not SQL inspection. Initial executable red is retained in `initial-red.log`; it fails `expected 'unavailable' to be 'pass'` after the test-only doctor succeeds. Recorder-generated `red.log`, `green.log` and `test-patch.diff` bind the final implementation separately. The broader suites and native CLI receipts are additional head-only proof, not substituted for that behavioral red.

A 51-message public replay exposed text-alias SQL sorting; `numeric-order.red.log` retains cursor 8 instead of 50. A real browser exposed runtime Ajv compilation blocked by strict CSP; `browser-csp.red.log` retains that failure. The fixes order by the numeric table column and compile standalone validators before browser launch. Neither fix weakens a guard. Isolated copy/mutation negatives and restored-source receipts distinguish tested guards from asserted safety.

## Ownership and limits

Evidence output contains public launch IDs and owned inventory, never the 256-bit launch key or database password. Exact paths, filesystem identities, challenge binding and supervisor-owned child handles authorize cleanup, not PID alone. Stop retains data; explicit reset removes only stopped disposable data. A supervisor crash that leaves ambiguous ownership is a refusal requiring operator investigation, not automatic adoption.

HTTP polling is the narrow development transport over the existing command/event contracts. Production WebSocket protocol, identity, multi-room provisioning, final room UI, external models, agent responses, tasks, repository authority, hosted deployment and FG04-FG08 qualification remain absent. Browser observations cover the harness only. Independent documentation/security review and mandatory CI are separate landing prerequisites; local pass cannot stand in for them.

## Size and review boundary

The approved logical slice joins owned lifecycle to resumable committed delivery. It necessarily exceeds the normal 200-line/eight-file target; the final inventory reports meaningful authored additions and source files against L2, with fixtures, generated consumers, documentation, evidence and lockfiles separately visible. No blanket exception is requested. The hard limits remain 1000 meaningful lines and 25 source files; the L3 target is 650-900 and at most 20.

Risk is R3 for destructive local reset and process ownership, limited to disposable local data. The same-change documentation explains user operation, developer boundaries, operator refusal/recovery, CLI controls and the lifecycle/snapshot/replay visual. Final bindings, coverage, toolchain and cleanup are recorded in the outcome and native logs alongside this file. This candidate must be rebased or reapplied and fully revalidated after L2 and CI land before any merge.
