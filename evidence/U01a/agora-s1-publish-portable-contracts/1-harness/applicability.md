# Applicability record for the harness branch

Branch `fm/agora-s1-publish-portable-contracts-1-harness`, code head `bc7fc034f8d70c6d20a8b0613c9702bce143fc37`, parent `aaedd8d`. Recorded 2026-09-20T11:45:20Z.

This revision is the test-only harness that R22 permits before the behavioral change: "An empty repository may first create a test-only harness/stub revision that starts correctly; its subsequent red must be a literal behavior assertion, not missing infrastructure." It adds no product behavior. It wires the contracts package, pins the Swift generator and runtime, moves the existing RFC 8785 canonicaliser from domain to contracts without changing it (its test moved with it and still passes), extends the red/green recorder to carry golden fixtures, skip files deleted at head and remove the SwiftPM lock files a worktree leaves under the temp root, and adds stub drivers that start and report every vector or mode unavailable.

A literal red against `aaedd8d` is not available for this revision on its own terms: the only new assertions are the harness smoke test, and at the parent the modules it imports do not exist, which R22 classifies as missing infrastructure rather than behavioral red. The red for this work is recorded by the next branch, whose contract tests fail with value-level assertions against this head (see `../2-contracts/red.log`).

Retained here: `green.log` (the full suite passing at this head, 32 tests including the PostgreSQL project) and `gates.log` (install, typecheck, lint, docs gate, the stub generator reporting unavailable with exit 3, whitespace check, clean temp root).

Size: 245 meaningful added lines in 22 files; excluded and visible: `pnpm-lock.yaml` +217, `contracts/swift/Package.resolved` +78. No generated consumer exists yet.
