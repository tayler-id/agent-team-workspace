# One bounded performance diagnostic

Declared before execution, 2026-09-20. Authorized by firstmate inbox message 002. This diagnostic does not replace `performance.json`, change the 10% gate, or erase its standalone conformance p95 failure of 1.3372 times parent.

## Fixed comparison

Parent: `fb67e9ce2c6658d672ca6446f524714ec55cbac5`. Head: `cfd755a` resolved to its full Git SHA in the diagnostic artifact. Use two owned worktrees on this same host, the same sanitized local Node PATH, and identical parent golden-vector bytes. Each implementation reads its own exact committed schema bundle and binary.

Build both Swift consumers once before measurements. Do not change source, generated output, dependencies, process priority, performance gates, or fixtures. Preserve caches for the warm launch comparison. Remove both worktrees afterwards.

Run exactly five batches, ten repetitions per batch, with parent then head in every repetition. No retry of a slow or failing sample. In each repetition measure these stages separately:

1. Prebuilt Swift executable, with vector acceptance and canonical-result output checked against the public TypeScript comparison.
2. TypeScript consumer plus comparison against that Swift output, without any SwiftPM invocation.
3. Swift version query and warm `swift run` on the same binary and vector bytes. Retain elapsed time, stdout digest, and stderr build diagnostics.

Retain every raw sample. Report ordinary per-invocation p95 and batch-mean p95 separately. The product-work comparator is the paired prebuilt native plus TypeScript/comparison wall time. This separates actual consumer work from the launch/build orchestrator instead of relabeling their combined time.

## Disconfirming evidence

A product-work p95 above 1.10 times parent contradicts the launch-overhead explanation and fails the task. Check native-only and TypeScript-only distributions too. A repeated head-only SwiftPM increase would also argue against dismissing the original failure as unrelated launch noise. Record all command exits and require identical conformance verdicts. Do not infer a specific competing process from elapsed time alone; no such process was measured in the original run.
