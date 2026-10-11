# U21 lane and performance evidence

Task `agora-u21-lane-evidence`. The unit manifest in [agora/project.json](repo:agora/project.json) now gives U21 its own `driver`, so `pnpm -s agora project lanes --unit U21 --task agora-u21-lane-evidence` runs the ten lane tests in [feature-discovery-lanes.test.ts](repo:packages/verification/test/feature-discovery-lanes.test.ts) against the committed inventory generator. [The feature discovery page](repo:docs/site/feature-discovery.md#lane-evidence) explains the lanes.

## What each receipt shows

- `red.log`, `green.log`, `test-patch.diff` and `manifest.json` replay the driver change (commit 0e52ddf) against its parent 7756dc3. The one new test, `U21 runs its own ten-lane driver`, fails at the parent because U21 reports unavailable, and passes at the head. The lane tests themselves already pass at the parent because discovery exists, so they are maintenance and not red proof.
- [guard-negatives.log](repo:evidence/U21/guard-negatives.log) shows five breakages going red and the restore going green: the runner's lane count, the manifest check, duplicate-name rejection, missing-entrypoint rejection and the no-op regenerate.
- [lanes/](repo:evidence/U21/lanes/process-capture.json) holds the REA process capture of the lanes run, and `lane-N/` holds each lane's commands, outputs and assertion. [perf-vs-main](repo:evidence/U21/perf-vs-main/perf.json) and [perf-vs-pre-discovery](repo:evidence/U21/perf-vs-pre-discovery/perf.json) hold five interleaved batches each.

## Findings

- Lane 8 cannot use real `Room` and `room` directories on this Mac, whose volume is case-insensitive. The test falls back to the generator's file-list entry and says so in its transcript. A throwaway case-sensitive APFS image ran the real-directory branch and passed: `lane-8/transcript-case-sensitive-volume.json`.
- Duplicate checking is per package. `apps/web` and `apps/center` may both own `room`. That matches the documented ownership, so I left it and did not change the generator.
- Lane 1 shows trunk's absence by asking git for the parent of the discovery commit 650b850, which has no `scripts/feature-discovery.ts`. The pre-discovery perf run records the same absence as `parent_behavior: absent`.
- The lane 9 message for a missing entrypoint names the owner as the conventional path (`apps/web/src/features/<name>/`), not as a package.

## Unavailable and not claimed

No `scenario.png` exists for any lane. REA process capture records a terminal text session and no installed, qualified screenshot route applies to a terminal-only scenario. Nothing was installed or fabricated. The 30-60 second video, independent review, operator verdict, U21 qualification, the U20 prerequisite and foundation completion are all outside this slice. Samples are small (five batches of seven runs on one Apple-silicon Mac under normal load).
