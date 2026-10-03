# U21.B01 receipt index

Task `agora-s1-discover-features`, Build box U21.B01. [The task breakdown](repo:docs/task-breakdown.md) names this directory as the task's evidence path. The parallel candidate slice `agora-feature-discovery-slice` built U21.B01 and recorded its receipts in [`evidence/U21/agora-feature-discovery-slice/`](repo:evidence/U21/agora-feature-discovery-slice/README.md). They stay at the path where they were recorded and signed, and this file points at them instead of copying them.

## Receipts

- [README.md](repo:evidence/U21/agora-feature-discovery-slice/README.md) states what the red and green runs prove and what they leave open.
- [red.log](repo:evidence/U21/agora-feature-discovery-slice/red.log) runs `scripts/test/feature-discovery.test.ts` at the parent and exits 1.
- [green.log](repo:evidence/U21/agora-feature-discovery-slice/green.log) runs it at the recorded head and exits 0.
- [test-patch.diff](repo:evidence/U21/agora-feature-discovery-slice/test-patch.diff) is the test patch the recorder applied to the parent.
- [manifest.json](repo:evidence/U21/agora-feature-discovery-slice/manifest.json) binds those three files to head `fde2daa` and base `a62662e` with an owner-attested signature. To re-check it, run `node scripts/validate-evidence.mjs --dir evidence/U21/agora-feature-discovery-slice --head fde2daa8c131fc3ef6425c1ebde72f0c66cbeecb --base a62662e8788a072289b14b82f80cc970e1bd6943` from a checkout that holds the producer key. Without the key it reports `stale_producer`.

## Owner

`agora-feature-discovery-slice`, from branch `fm/agora-feature-discovery-slice`. The `feature-discovery` row in [the feature map](repo:agora/feature-map.json) names the same owner, and [the feature discovery page](repo:docs/site/feature-discovery.md) documents the behavior.

## Pending

U21.B01 is unchecked in [the implementation plan](repo:docs/implementation-plan.md) and U21 is not qualified. No receipt here or in the slice directory covers U21 lanes 1 to 10, the perf probe, security and performance findings, an independent exact-head review, or the unit-level `outcome.json`, `unit.log` and `feature-map.json`.
