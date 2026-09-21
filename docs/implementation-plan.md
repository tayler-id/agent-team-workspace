# Agora implementation plan

Build the verification foundation before product features, then deliver the local-first S1 workflow.
U01a-U01d replace the former oversized U01. S2 cloud, memory, external-agent and native-client tracks follow explicit dependencies rather than one serial chain.
A unit is a milestone, not a single review-sized change. A task is an independently gated change, normally one pull request under R11.
No application code or runtime proof exists in this specification delivery. Execution needs separate authorization.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. Check a box only when its evidence exists, as a file, log, screenshot, video, receipt or exact SHA. The body is a how-to. The appendices explain and record.

Use `.agents/skills/poteto-mode/playbooks/autopilot-stack.md` for a separately authorized implementation program, with project R22 overriding optional tests, model-specific verification and milestone-as-change assumptions. Only the operator lands changes. Every task has its own exact-head review. A unit closes only after its tasks and integration lanes pass; tasks never wait for their own unit to close.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

The unchanged upstream checker is informational. Its legacy phrase "Ten lanes on `grok-4.6-fast-xhigh` at the PR head" is retained below only as a format annotation. It is not an execution instruction or dependency. The project-owned semantic design gate and future foundation runner are authoritative. Ten scenarios mean coverage, not ten model sessions.

### Planned repository shape

These are future ownership roots, defined before any unit uses them. They do not exist yet.

| Module | Planned root | Responsibility |
| --- | --- | --- |
| Contracts | `contracts`, `packages/wire-ts`, `packages/wire-swift` | Authoritative OpenAPI/JSON Schema, generated consumers, golden fixtures |
| Domain | `packages/domain` | Identity, Policy, Collaboration, Control, Agents, Projects, Knowledge, Integrations and Evidence ports/rules; no SDK/framework imports |
| Client core | `packages/client-core` | Framework-free snapshots, replay, receipts and projection |
| Web | `apps/web` | Selected React rendering and narrow transport/cache adapters |
| API | `apps/center` | Hono auth/HTTP/socket composition and domain-to-wire conversion |
| Storage | `packages/storage` | Private Drizzle tables and reviewed explicit SQL/migrations |
| Adapters | `packages/adapters` | Private provider, artifact, email and GitHub implementations |
| Worker, Execution | `apps/worker` | Standalone generated-protocol client and worker-owned local/cloud runtime, brokers and adapters |
| Native client | `apps/macos` | Later SwiftUI client and Swift synchronization implementation |
| Verification | `packages/verification`, `tests`, `agora/project.json` | Agora CLI, Python fixture, lane runner, guards, red-green, feature map and evidence validation |
| Operations | `infra`, `docs/runbooks` | Compose/Caddy, protected checks, packaging, backups and recovery |
| Project control skill | `.agents/skills/verify-agora` | Project-owned proven instructions and feature map; not a modified upstream skill |

## Program checklist

### Arm the program

- [ ] Obtain explicit implementation authorization and record scope, provider/resource approvals and budget. This delivery arms no execution.
- [ ] Record the `/goal` as independently reviewed task changes, complete milestone integration proof, operator-only landing and all S1 acceptance rows before release.
- [ ] Read current rules using `git show origin/main:.agents/skills/poteto-mode/playbooks/autopilot-stack.md` and the authoritative project specification. Use local main if no remote exists. Record the chosen revision.
- [ ] In an explicitly authorized active session, use a 30-minute human audit checkpoint and post a status message with exact heads, receipts, missing proofs and gates. No unattended schedule is implied.
- [ ] Run the combined task/milestone dependency check. No substantive feature or write-enabled agent starts before foundation-ready passes FG01-FG08.

### Spawn owners

- [ ] Assign one accountable owner per task without creating a fleet merely to satisfy coverage. Independent review may use approved people or tools.
- [ ] Follow the task prerequisites and external unit gates. A task uses its declared task-scoped checks, never its incomplete milestone gate.
- [ ] Preserve module import boundaries and schema/consumer compatibility. Keep each task within R11 size/risk rules; split further if needed.
- [ ] Review affected interaction screenshots/video independently. A green command is not human consent.

### PR mechanics, for every task

- [ ] After separate authorization, use the project forge wrapper for GitHub pull requests and retain the exact returned URL. There are no forge identifiers in this plan.
- [ ] Write the behavior test and feature-map entry first. Capture intended-assertion red at parent and green at head with test/config/fixture digests.
- [ ] Run strict build/lint/type/docs, contract drift, forbidden imports, guard negatives, evidence negatives and affected live/performance checks. Prose-only exceptions need independent applicability review.
- [ ] Run affected verification-skill instructions literally after every route/command/selector/permission/fixture/environment change. Reject unmapped or stale coverage.
- [ ] Record selected choices append-only. Triage every finding; no flaky retry-until-green and no optional-test fallback from vendored skills.

### Verdict and merge, for every task and milestone

- [ ] Close each task using its own accepted Build outcome, declared lanes and exact-head independent review. Integration lanes that need later tasks belong to the milestone, not early task completion.
- [ ] Close a milestone only after all its tasks and ten integration scenarios pass with performance, security and operator review. Unavailable remains non-pass.
- [ ] Obtain fresh relevant proof after rebase or changed code/config. Patch ID alone cannot preserve base-sensitive proof.
- [ ] Deliver verified changes to the operator in dependency order. Workers never merge, bypass checks or infer approval.

### Boot recipe, for every live scenario

- [ ] Use isolated instances at the exact task or milestone head. Record host/target, toolchain, config, fixture and contract digests.
- [ ] Run the registered `agora project doctor`, `start`, `verify`, `evidence` and `stop` commands with `--json`; package wrappers only forward to that R12 contract.
- [ ] Use `agora project lanes --unit UNIT --json` for milestone coverage. Before that runner exists, foundation tasks drive their literal public test/CLI commands directly and record evidence; no dependent feature can use this bootstrap path.
- [ ] Save screenshot, transcript, literal assertions, red/green receipts, target-specific artifacts and cleanup under `evidence/UNIT/`. A screenshot's existence alone is not proof.
- [ ] Stop only owned process/resource handles and prove artifact preservation. Real email/model/GitHub/cloud checks require approved disposable resources; fakes remain labelled fakes.

## Establish repository contracts and test-first gates (U01a)

**Depends on.** None. Stage S1. Requirements R03, R05, R07, R12, R21, R22. Acceptance AC00, AC14.

**Files.**

- [ ] Own Contracts, Domain, Client core, Verification, Storage, Operations under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Create schema/version and migration journal plus fixture health/command contracts. Publish authoritative OpenAPI 3.1.1 and JSON Schema 2020-12 for all wire families; generate TypeScript and Swift consumers.

Migration and compatibility. Lock R17/R21 candidate versions after dated compatibility checks. Verify Node 24 and PostgreSQL 18 directly; an incompatibility requires a reproduced decision, not a silent older default.

Foundation proofs. FG01, FG02, FG03.

**Build.**

- [ ] `U01a.B01` Create the repository/package boundaries, strict compiler, lint/type/docs gates, and minimal public health/policy fixture with a behavioral red-before-green test.
- [ ] `U01a.B02` Author OpenAPI and JSON Schema sources, generate TypeScript/Swift consumers and canonical fixtures, and enforce regeneration drift and protocol compatibility.
- [ ] `U01a.B03` Implement framework-free client snapshots, dedupe/replay/receipts and mechanical import/export boundaries with forbidden-import compile negatives.
- [ ] `U01a.B04` Create task-level red-green, guard-negative, applicability and semantic prerequisite checks plus the foundation report protocol.

**You see.**

- [ ] An engineer can build a small contract fixture, observe a real red/green test, reject a forbidden import, and compile the same wire values in TypeScript and Swift. Save `evidence/U01a/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test canonical vectors, all unknown-field/variant cases, guard mutation, invalid red causes, forbidden imports and real non-owner PostgreSQL isolation. Save `evidence/U01a/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U01a/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Build the public health/policy fixture at parent and head. Save `evidence/U01a/lane-1/scenario.png` and its transcript/assertions. Pass when head passes the intended behavior and parent fails its assertion, not compilation.
- [ ] Lane 2. Run concurrent real PostgreSQL clients with rollback and RLS. Save `evidence/U01a/lane-2/scenario.png` and its transcript/assertions. Pass when one claim wins, rollback leaves no event, and non-owner scope denial holds.
- [ ] Lane 3. Install clean and migrate twice on Node 24/PostgreSQL 18. Save `evidence/U01a/lane-3/scenario.png` and its transcript/assertions. Pass when versions and schema digest agree; second migration is a no-op.
- [ ] Lane 4. Generate and compile TypeScript and Swift from schemas. Save `evidence/U01a/lane-4/scenario.png` and its transcript/assertions. Pass when both consume the same golden requests, events and CLI reports.
- [ ] Lane 5. Run Unicode, decimal, null/absent and canonical signature vectors. Save `evidence/U01a/lane-5/scenario.png` and its transcript/assertions. Pass when both languages agree on literal values and digests.
- [ ] Lane 6. Alter generated output and send an unknown state-changing event. Save `evidence/U01a/lane-6/scenario.png` and its transcript/assertions. Pass when drift fails and neither consumer acknowledges the unknown state.
- [ ] Lane 7. Drive replay/gap/duplicate vectors without DOM. Save `evidence/U01a/lane-7/scenario.png` and its transcript/assertions. Pass when the framework-free core reaches the literal expected snapshot.
- [ ] Lane 8. Inject forbidden type-only, dynamic and re-export imports. Save `evidence/U01a/lane-8/scenario.png` and its transcript/assertions. Pass when mechanical boundaries reject each attempted crossing.
- [ ] Lane 9. Disable one guard in an isolated test copy. Save `evidence/U01a/lane-9/scenario.png` and its transcript/assertions. Pass when the guard assertion turns red and the foundation proof rejects it.
- [ ] Lane 10. Supply missing red evidence and try premature feature admission. Save `evidence/U01a/lane-10/scenario.png` and its transcript/assertions. Pass when task/foundation readiness denies with specific unmet proof IDs.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Clean build and conformance time, schema validation latency.
- [ ] Probe. Run `agora project verify --scenario perf --unit U01a --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail schema validation p95 above 5 ms per 128-KiB command or clean fixture build above five minutes.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Qualify isolated verification and trusted evidence (U01b)

**Depends on.** U01a. Stage S1. Requirements R03, R11, R12, R16, R21, R22. Acceptance AC00, AC08.

**Files.**

- [ ] Own Verification, Evidence, Operations, API, Web, Storage under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Implement agora.foundation/v1, project CLI reports, feature-map/scenario manifests and evidence validation from public schemas. Add isolated instance/cleanup identity and object metadata.

Migration and compatibility. Use a small Python managed fixture and the same CLI for Agora. Human setup supplies protected Agora and disposable fixture repositories and dedicated reporting Apps; no publication broker is required.

Foundation proofs. FG04, FG05, FG06.

**Build.**

- [ ] `U01b.B01` Implement Agora and Python fixture doctor/scenarios/start/verify/evidence/stop, isolated instances, project-owned lane runner and a live-validated verify-agora skill with feature-map drift enforcement.
- [ ] `U01b.B02` Implement the general evidence validator and deterministic scripted recorder with exact-head/config/signature/artifact checks and deliberate validator-weakening negatives.
- [ ] `U01b.B03` Install and read back trusted CI and project-dedicated checks-only reporting identities for Agora and the fixture, including red-green, guards, contract/import drift and evidence gates.

**You see.**

- [ ] An engineer drives both real applications through their CLIs and cannot obtain a passing trusted result from forged or missing proof. Save `evidence/U01b/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test CLI exit/outcome mappings, actual persisted effects, two-instance cleanup, feature-map deletion, validator weakening and credential isolation. Save `evidence/U01b/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U01b/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Drive Agora and the Python fixture through the public CLI at parent and head. Save `evidence/U01b/lane-1/scenario.png` and its transcript/assertions. Pass when head persists the literal expected effect and retains its proof.
- [ ] Lane 2. Start two instances and stop one by its cleanup handle. Save `evidence/U01b/lane-2/scenario.png` and its transcript/assertions. Pass when the other remains healthy and proof files remain.
- [ ] Lane 3. Use unknown scenario, missing runner, invalid JSON and mismatched exit. Save `evidence/U01b/lane-3/scenario.png` and its transcript/assertions. Pass when all produce non-pass and none authorize a dependent task.
- [ ] Lane 4. Follow verify-agora then change a route/selector/feature map. Save `evidence/U01b/lane-4/scenario.png` and its transcript/assertions. Pass when the old instructions fail drift until a real refreshed pass.
- [ ] Lane 5. Feed wrong head/base/config and altered artifact bytes. Save `evidence/U01b/lane-5/scenario.png` and its transcript/assertions. Pass when the general evidence validator rejects each fixture.
- [ ] Lane 6. Replay a stale producer/fence and mutate source during a scenario. Save `evidence/U01b/lane-6/scenario.png` and its transcript/assertions. Pass when completion rejects both even with a zero command exit.
- [ ] Lane 7. Disable evidence validation or drop a required scenario. Save `evidence/U01b/lane-7/scenario.png` and its transcript/assertions. Pass when the negative fixture turns red and foundation readiness fails.
- [ ] Lane 8. Read back Agora and disposable repository protection. Save `evidence/U01b/lane-8/scenario.png` and its transcript/assertions. Pass when required checks, independent review, exact App IDs and no bypass match policy.
- [ ] Lane 9. Send candidate-authored fake reports and wrong-workflow receipts. Save `evidence/U01b/lane-9/scenario.png` and its transcript/assertions. Pass when trusted reporting denies them without exposing its credential.
- [ ] Lane 10. Fail a dependency then submit stale/neutral/skipped checks. Save `evidence/U01b/lane-10/scenario.png` and its transcript/assertions. Pass when aggregate fails while real successful exact-head checks can pass.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Startup, scenario runtime and bounded evidence validation.
- [ ] Probe. Run `agora project verify --scenario perf --unit U01b --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail fixture startup above 60 seconds or 10-MiB evidence finalization above five seconds.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Prove independently recoverable backup and restore (U01c)

**Depends on.** U01b. Stage S1. Requirements R12, R15, R17, R22. Acceptance AC00, AC11.

**Files.**

- [ ] Own Operations, Storage, Verification under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add backup/restore receipts, deployment epoch and integrity inventory; no product workflow schema.

Migration and compatibility. Pin PostgreSQL 18 image and WAL tooling, test restored migration history and independently recoverable encryption keys.

Foundation proofs. FG07.

**Build.**

- [ ] `U01c.B01` Implement encrypted base/WAL backup, separate-host restore, independent key recovery, epoch rotation, integrity proof and an operator runbook.

**You see.**

- [ ] An operator restores the foundation on a separate host, proves its data and fences the old instance. Save `evidence/U01c/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test key/backup absence, restore corruption, WAL gaps, migration locking, retained evidence and stale epoch denial. Save `evidence/U01c/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U01c/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Restore the foundation fixture at parent and head. Save `evidence/U01c/lane-1/scenario.png` and its transcript/assertions. Pass when head restores actual rows/artifacts and records parent capability honestly.
- [ ] Lane 2. Destroy access to the original host and its local keys. Save `evidence/U01c/lane-2/scenario.png` and its transcript/assertions. Pass when off-host recovery material suffices.
- [ ] Lane 3. Interrupt WAL upload then recover. Save `evidence/U01c/lane-3/scenario.png` and its transcript/assertions. Pass when alert fires and measured loss stays within RPO.
- [ ] Lane 4. Supply a wrong key or damaged backup. Save `evidence/U01c/lane-4/scenario.png` and its transcript/assertions. Pass when restore fails rather than serving partial state.
- [ ] Lane 5. Present a capability from the old epoch. Save `evidence/U01c/lane-5/scenario.png` and its transcript/assertions. Pass when new service denies it.
- [ ] Lane 6. Compare row/object inventory and sample hashes. Save `evidence/U01c/lane-6/scenario.png` and its transcript/assertions. Pass when every required object and row matches.
- [ ] Lane 7. Run migrations against the restored database twice. Save `evidence/U01c/lane-7/scenario.png` and its transcript/assertions. Pass when schema remains valid and only one migration owner runs.
- [ ] Lane 8. Resume outbox fixture after crash before receipt. Save `evidence/U01c/lane-8/scenario.png` and its transcript/assertions. Pass when one observed effect reconciles without a duplicate.
- [ ] Lane 9. Time operator recovery with the written runbook. Save `evidence/U01c/lane-9/scenario.png` and its transcript/assertions. Pass when RPO/RTO pass and all commands are reproducible.
- [ ] Lane 10. Stop the restored fixture and inspect evidence. Save `evidence/U01c/lane-10/scenario.png` and its transcript/assertions. Pass when only its owned resources stop and proof remains.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Backup lag, restore RPO/RTO and artifact integrity.
- [ ] Probe. Run `agora project verify --scenario perf --unit U01c --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail RPO above 15 minutes, RTO above four hours or any integrity mismatch.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Qualify the selected React production client (U01d)

**Depends on.** U01b. Stage S1. Requirements R02, R18, R22, R23. Acceptance AC00, AC13.

**Files.**

- [ ] Own Web, Client core, Verification under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. No new product domain schema. Add versioned R23 fixture input, render/performance reports and defect records.

Migration and compatibility. Use selected React 19/Vite pins and framework-free core. No Vue or other competing renderer is implemented; live fitness is ordinary selected-client qualification.

Foundation proofs. FG08.

**Build.**

- [ ] `U01d.B01` Build the selected React production fixture over Client core and prove virtualization, reconnect, accessibility, update isolation, bundle, memory, latency and user comprehension.

**You see.**

- [ ] A user navigates a large room and failure/recovery cards in a responsive accessible client without authority confusion. Save `evidence/U01d/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test immutable subscriptions, revision ordering, focus/scroll retention, safe rendering and no second Query timeline. Save `evidence/U01d/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U01d/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Run the production React fixture at parent and head. Save `evidence/U01d/lane-1/scenario.png` and its transcript/assertions. Pass when head meets absolute budgets and baseline absence is not a fake comparison.
- [ ] Lane 2. Virtualize 50000 messages with long code and thread edits. Save `evidence/U01d/lane-2/scenario.png` and its transcript/assertions. Pass when older content, focus and scroll anchor remain correct.
- [ ] Lane 3. Replay 1000 missed events during four run updates. Save `evidence/U01d/lane-3/scenario.png` and its transcript/assertions. Pass when convergence has no duplicates and completes within two seconds.
- [ ] Lane 4. Drive every action keyboard-only at both viewports. Save `evidence/U01d/lane-4/scenario.png` and its transcript/assertions. Pass when focus order/return and visible state are correct.
- [ ] Lane 5. Inspect with VoiceOver and automated accessibility checks. Save `evidence/U01d/lane-5/scenario.png` and its transcript/assertions. Pass when scripts pass and no critical/serious finding remains.
- [ ] Lane 6. Send 200 run-only updates and inspect unrelated message rows. Save `evidence/U01d/lane-6/scenario.png` and its transcript/assertions. Pass when unrelated rows have zero DOM mutations and commit counts are recorded.
- [ ] Lane 7. Measure initial JavaScript, room and interaction latency. Save `evidence/U01d/lane-7/scenario.png` and its transcript/assertions. Pass when 350 KiB, 2.5 seconds and 100-ms p95 limits pass.
- [ ] Lane 8. Repeat ten-minute reconnect/update cycles. Save `evidence/U01d/lane-8/scenario.png` and its transcript/assertions. Pass when heap stays within 200 MiB and final-cycle growth within 10%.
- [ ] Lane 9. Probe scroll frames on Chrome and Safari. Save `evidence/U01d/lane-9/scenario.png` and its transcript/assertions. Pass when p95 frame interval stays within 20 ms using declared instrumentation.
- [ ] Lane 10. Have two humans interpret proposed/failed/stale/recovery cards. Save `evidence/U01d/lane-10/scenario.png` and its transcript/assertions. Pass when all five authority questions are answered without coaching.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Bundle bytes, usable-room and input latency, frame time, heap trend and unrelated-row mutations.
- [ ] Probe. Run `agora project verify --scenario perf --unit U01d --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail any R23 threshold or required accessibility/comprehension scenario.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Invite developers into scoped project rooms (U02)

**Depends on.** U01c, U01d, U20, U21, U22. Stage S1. Requirements R01, R02, R04, R05, R14, R21, R22, R24. Acceptance AC01, AC02, AC15.

**Files.**

- [ ] Own Identity, Policy, Projects, Collaboration, Web under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add principal, workspace, invitation, membership, project registration, room, and role revision tables. Add invitation, acceptance, membership, and existing-project registration APIs. Add client-device token/challenge records and registered-project lifecycle commands.

Migration and compatibility. Keep auth-library migrations separate from domain migrations. Bootstrap exactly one owner by a one-use console operation. Add composite project foreign keys and row-level policies before content.

Foundation proofs. None.

**Build.**

- [ ] `U02.B01` Configure Better Auth magic links, strict verified-email invitation acceptance, custom closed roles, SMTP delivery, secure cookies, CSRF/Origin checks, and rate limits.
- [ ] `U02.B02` Build project registration and explicit project grants. Create one room and inactive main-agent identity per project. Gate coding readiness on repository/environment checks rather than creating a repository.
- [ ] `U02.B03` Build navigation, invitation acceptance, room access, and revocation behavior. Disable direct organization-management bypass routes.
- [ ] `U02.B04` Implement native client-device OAuth authorization, scoped token rotation/revocation and exact-action browser step-up, separate from worker enrollment.
- [ ] `U02.B05` Implement registered-project pause/resume/archive before execution, with membership/policy revalidation and readable retained history.

**You see.**

- [ ] Two invited humans sign in and see only rooms they may read; an owner can revoke a member and see active access end. Save `evidence/U02/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test invitation replay/expiry, matching verified email, last-owner protection, role intersection, cross-project references, and direct auth-route bypass denial. Save `evidence/U02/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U02/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Invite and accept a real second email on trunk and head. Save `evidence/U02/lane-1/scenario.png` and its transcript/assertions. Pass when head creates one membership and trunk absence is recorded.
- [ ] Lane 2. Replay the invitation from a second session. Save `evidence/U02/lane-2/scenario.png` and its transcript/assertions. Pass when no second membership or role escalation occurs.
- [ ] Lane 3. Use an expired or revoked invitation. Save `evidence/U02/lane-3/scenario.png` and its transcript/assertions. Pass when acceptance fails with the correct reason.
- [ ] Lane 4. Accept with a different verified email. Save `evidence/U02/lane-4/scenario.png` and its transcript/assertions. Pass when no membership is created.
- [ ] Lane 5. Drive native OAuth polling/slow-down, replay and approval step-up with Swift fixture. Save `evidence/U02/lane-5/scenario.png` and its transcript/assertions. Pass when wrong audience/worker token denies and refresh does not renew auth age.
- [ ] Lane 6. Grant observer at workspace and contributor at project. Save `evidence/U02/lane-6/scenario.png` and its transcript/assertions. Pass when writes remain denied.
- [ ] Lane 7. Register two existing repositories for different member sets. Save `evidence/U02/lane-7/scenario.png` and its transcript/assertions. Pass when room IDs and inactive main agents are unique and scoped.
- [ ] Lane 8. Access another project by deep link and API ID. Save `evidence/U02/lane-8/scenario.png` and its transcript/assertions. Pass when content and existence-sensitive metadata stay hidden.
- [ ] Lane 9. Revoke native/browser grants and pause/resume/archive a registered project. Save `evidence/U02/lane-9/scenario.png` and its transcript/assertions. Pass when subscriptions close, claims deny and resume revalidates without deleting history.
- [ ] Lane 10. Use invitation and room navigation by keyboard and screen reader. Save `evidence/U02/lane-10/scenario.png` and its transcript/assertions. Pass when labels, errors, and focus expose the full flow.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Invitation command latency and revocation-to-socket-close delay.
- [ ] Probe. Run `agora project verify --scenario perf --unit U02 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail command receipt above one second or connected-session revocation above one second after commit.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Deliver durable conversation and ordered reconnection (U03)

**Depends on.** U02, U23. Stage S1. Requirements R02, R05, R07, R18, R13, R21. Acceptance AC02, AC03.

**Files.**

- [ ] Own Collaboration, Storage, API, Web, Evidence under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add message revisions, room stream counters/events, client-message dedupe, thread roots, mentions, inbox cursors, and scoped FTS indexes. Add snapshot, message, edit, search, and WebSocket resume contracts. Add decision provenance/supersession records and POST /decisions.

Migration and compatibility. Backfill stream counters transactionally; all message revisions remain immutable. Add FTS indexes without widening read scope. Old client protocol gets an explicit unsupported-version response.

Foundation proofs. None.

**Build.**

- [ ] `U03.B01` Persist messages, thread replies, edits/tombstones, mentions, and unread cursors with one transaction per mutation and optimistic pending UI.
- [ ] `U03.B02` Implement snapshot plus ordered committed event pump, replay/gap handling, 1-MiB socket bounds, receipt dedupe, and membership filtering on every delivery.
- [ ] `U03.B03` Implement scoped search and bounded attachment quarantine/upload. Add safe Markdown, no external image autoload, and accessible thread panels.
- [ ] `U03.B04` Implement human decision creation from an immutable message revision, exact attributed text, supersession and cited read-back.

**You see.**

- [ ] Two developers converse and search the same ordered history after reconnecting without duplicate messages or lost edits. Save `evidence/U03/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test transaction rollback, concurrent counter allocation, edit window, root scope, duplicate body mismatch, cursor expiry, ACL-before-ranking, and artifact bounds. Save `evidence/U03/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U03/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Send and reply from two browsers on trunk and head. Save `evidence/U03/lane-1/scenario.png` and its transcript/assertions. Pass when head has one matching ordered conversation and regression behavior remains intact.
- [ ] Lane 2. Send 100 simultaneous messages from both accounts. Save `evidence/U03/lane-2/scenario.png` and its transcript/assertions. Pass when both timelines have identical unique sequence order.
- [ ] Lane 3. Drop the HTTP response then resend the same client-message ID. Save `evidence/U03/lane-3/scenario.png` and its transcript/assertions. Pass when one message remains and original receipt returns.
- [ ] Lane 4. Create/supersede a human decision and reconnect during message edits. Save `evidence/U03/lane-4/scenario.png` and its transcript/assertions. Pass when citations retain exact human text and replay applies each revision once.
- [ ] Lane 5. Reconnect below the retained cursor floor. Save `evidence/U03/lane-5/scenario.png` and its transcript/assertions. Pass when snapshot refresh preserves current messages and unread state.
- [ ] Lane 6. Restart the service after database commit before broadcast. Save `evidence/U03/lane-6/scenario.png` and its transcript/assertions. Pass when the event pump delivers the committed message.
- [ ] Lane 7. Run a deliberately slow socket consumer. Save `evidence/U03/lane-7/scenario.png` and its transcript/assertions. Pass when bounded queue closes with a resumable cursor and other clients remain responsive.
- [ ] Lane 8. Search a private project term as an outsider. Save `evidence/U03/lane-8/scenario.png` and its transcript/assertions. Pass when no text, title, count, or snippet leaks.
- [ ] Lane 9. Upload an oversized file and active HTML attachment. Save `evidence/U03/lane-9/scenario.png` and its transcript/assertions. Pass when limits enforce and no active preview executes.
- [ ] Lane 10. Inspect keyboard navigation, both viewports, reduced motion, and screen reader. Save `evidence/U03/lane-10/scenario.png` and its transcript/assertions. Pass when timeline, thread panel, empty states, and errors remain readable.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Message acknowledgment/fan-out, search p95, resume time, and initial JavaScript bytes.
- [ ] Probe. Run `agora project verify --scenario perf --unit U03 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail server acknowledgment above 300 ms, fan-out above one second, search above 500 ms, 1000-event resume above two seconds, or compressed initial JavaScript above 350 KiB.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Answer questions with visible read-only agent sessions (U04)

**Depends on.** U03. Stage S1. Requirements R02, R04, R05, R06, R16, R21, R22, R24. Acceptance AC04, AC10.

**Files.**

- [ ] Own Agents, Policy, Collaboration, Web, Control under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add profile/version, context bundle, answer session, provider-call journal, typed activity, and question-budget reservation. Add question, activity snapshot, and cancellation APIs.

Migration and compatibility. Append activity types under protocol v1 with capability negotiation. Existing message records remain unchanged; reference immutable message revisions.

Foundation proofs. None.

**Build.**

- [ ] `U04.B01` Compile explicit thread and selected-record context with audience intersection, trust labels, source revisions, token limits, and visible omissions.
- [ ] `U04.B02` Implement provider-neutral ModelAdapter with two approved real provider conformance targets, fake external-process events, exact routes, data approval, cost reservations and read-only tools.
- [ ] `U04.B03` Render agent status/action/question/result/error cards with citations, initial acknowledgment deadline, stop, stale liveness, and plain-text external links.

**You see.**

- [ ] A developer asks the center about a recorded decision and receives a cited answer without giving the agent execution or private-room authority. Save `evidence/U04/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test audience intersection, context truncation, citation IDs, provider failure, token/cost caps, activity schemas, timers, and injection deny fixtures. Save `evidence/U04/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U04/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Ask through each of two approved provider adapters at parent and head. Save `evidence/U04/lane-1/scenario.png` and its transcript/assertions. Pass when both return attributed exact-revision answers through the neutral contract.
- [ ] Lane 2. Ask from general room for a project-only fact. Save `evidence/U04/lane-2/scenario.png` and its transcript/assertions. Pass when the answer refuses that disclosure and offers the correct project context.
- [ ] Lane 3. Exceed context bounds with a long thread. Save `evidence/U04/lane-3/scenario.png` and its transcript/assertions. Pass when omissions are named and task launch remains blocked until narrowed.
- [ ] Lane 4. Edit a source after the answer. Save `evidence/U04/lane-4/scenario.png` and its transcript/assertions. Pass when the citation still resolves its pinned revision and shows current-source change.
- [ ] Lane 5. Inject a request to launch shell or change roles. Save `evidence/U04/lane-5/scenario.png` and its transcript/assertions. Pass when no consequential tool runs and denial evidence exists.
- [ ] Lane 6. Render a model-generated exfiltration URL and HTML. Save `evidence/U04/lane-6/scenario.png` and its transcript/assertions. Pass when neither becomes active content or auto-loaded network traffic.
- [ ] Lane 7. Delay the provider and send no initial activity. Save `evidence/U04/lane-7/scenario.png` and its transcript/assertions. Pass when unresponsive/stale presentation follows specified timers without fake progress.
- [ ] Lane 8. Cancel during a real streamed answer. Save `evidence/U04/lane-8/scenario.png` and its transcript/assertions. Pass when new provider output is discarded and the session becomes cancelled.
- [ ] Lane 9. Force malformed tools, duplicate events, unsupported capability and uncertain billing on real adapters. Save `evidence/U04/lane-9/scenario.png` and its transcript/assertions. Pass when neutral outcomes deny unsupported work and never blindly repeat billing.
- [ ] Lane 10. Inspect cards and citations with keyboard/screen reader. Save `evidence/U04/lane-10/scenario.png` and its transcript/assertions. Pass when live regions do not narrate every token and stop remains reachable.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Question receipt, first state visibility, and unaffected chat p95 under model streaming.
- [ ] Probe. Run `agora project verify --scenario perf --unit U04 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail receipt above one second, initial state above 10 seconds, or chat above R18 limits. Provider generation time is recorded separately, never hidden in the server metric.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Create owned tasks with fenced runs and approvals (U05)

**Depends on.** U04. Stage S1. Requirements R05, R06, R07, R14, R17, R21, R22. Acceptance AC05, AC06, AC11.

**Files.**

- [ ] Own Control, Policy, Storage, Web under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add task DAG, immutable RunSpec, run attempts, leases/fences, approvals, command receipts, effect outbox, and budget ledger. Add task, launch, claim, prompt, cancel, retry, and decision contracts.

Migration and compatibility. Create partial unique indexes for one nonterminal run per task and unique effect keys. Reject cyclic/cross-project task edges at write time.

Foundation proofs. None.

**Build.**

- [ ] `U05.B01` Implement task ownership/state and proposal/launch UI with frozen intent, acceptance, target, placement, payer, scope and limits; chat text cannot launch.
- [ ] `U05.B02` Implement atomic claim, leases/fences, scanner expiry, cancellation and fresh retry with deterministic workers and real PostgreSQL races.
- [ ] `U05.B03` Implement exact-action approvals, one-use effect receipts, transactional budget reservations and deadline/current-state projections.

**You see.**

- [ ] A human confirms one bounded task; fake competing workers cannot both own it, and expired authority stays unusable. Save `evidence/U05/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test every legal/illegal transition, fake-clock deadlines, claim races, late fences, stale approval invalidation, duplicate commands, DAG cycles, and concurrent budget reservations. Save `evidence/U05/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U05/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Launch a confirmed task on trunk and head. Save `evidence/U05/lane-1/scenario.png` and its transcript/assertions. Pass when head creates one task/run and the prior read-only flow stays intact.
- [ ] Lane 2. Post an imperative agent mention. Save `evidence/U05/lane-2/scenario.png` and its transcript/assertions. Pass when only a proposal appears and no lease or provider call starts.
- [ ] Lane 3. Race two eligible fake workers for one task. Save `evidence/U05/lane-3/scenario.png` and its transcript/assertions. Pass when one claim wins and one fence can write.
- [ ] Lane 4. Expire a lease and submit its completion. Save `evidence/U05/lane-4/scenario.png` and its transcript/assertions. Pass when completion is rejected and the task is blocked for human recovery.
- [ ] Lane 5. Change role or head while an approval is pending. Save `evidence/U05/lane-5/scenario.png` and its transcript/assertions. Pass when old approval cannot be consumed.
- [ ] Lane 6. Replay an already consumed approval with a new effect. Save `evidence/U05/lane-6/scenario.png` and its transcript/assertions. Pass when the second effect is denied.
- [ ] Lane 7. Cancel during a leased run. Save `evidence/U05/lane-7/scenario.png` and its transcript/assertions. Pass when capability revokes before cleanup and late events deny.
- [ ] Lane 8. Retry a lost run. Save `evidence/U05/lane-8/scenario.png` and its transcript/assertions. Pass when new run/session/environment identity and fence preserve old history.
- [ ] Lane 9. Launch simultaneous runs near the project budget. Save `evidence/U05/lane-9/scenario.png` and its transcript/assertions. Pass when reservation totals never exceed the approved cap.
- [ ] Lane 10. Read task history and current snapshot after restart. Save `evidence/U05/lane-10/scenario.png` and its transcript/assertions. Pass when current state agrees with committed transitions rather than the last prose activity.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Command/claim latency, scanner lag, and cancellation revocation.
- [ ] Probe. Run `agora project verify --scenario perf --unit U05 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail commands above one second, expiry detection above five seconds after deadline, or cancellation revocation above one second.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Connect owner-bound workers and prepare clean worktrees (U06)

**Depends on.** U05. Stage S1. Requirements R04, R06, R07, R08, R15, R21, R24. Acceptance AC05, AC06, AC07, AC14.

**Files.**

- [ ] Own Worker, Identity, Execution, Control under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add enrollment/device grant, machine registration, repository registration, worker spool cursor, cleanup handles, and publication-capability wire types. Add worker handshake and claim endpoints.

Migration and compatibility. Version worker protocol and reject incompatible capabilities before claim. Existing queued runs keep explicit placement and never migrate automatically.

Foundation proofs. None.

**Build.**

- [ ] `U06.B01` Ship a standalone signed worker with embedded runtime and generated protocol client, then implement owner-bound enrollment, rotating tokens, outbound transport and doctor without center-internal imports.
- [ ] `U06.B02` Create private bare mirrors and clean task worktrees at the requested remote SHA, validate paths/remotes, sanitize Git environment/hooks, allocate process/fixture/port namespaces, and maintain run owner locks.
- [ ] `U06.B03` Implement heartbeat/spool replay, disconnect stop deadlines, owner-only manual prepare, and non-destructive retained-work recovery.

**You see.**

- [ ] The launching developer connects a worker without inbound ports and receives an isolated task worktree while their normal checkout stays unchanged. Save `evidence/U06/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test challenge replay, refresh reuse, wrong owner/repository, unsafe remote forms, branch collisions, symlink paths, lock ownership, spool dedupe, and process-start identity. Save `evidence/U06/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U06/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Install the signed worker without Node on clean Linux/macOS hosts and prepare a task. Save `evidence/U06/lane-1/scenario.png` and its transcript/assertions. Pass when embedded-runtime worker connects and leaves normal checkout unchanged.
- [ ] Lane 2. Request another person's named machine. Save `evidence/U06/lane-2/scenario.png` and its transcript/assertions. Pass when claim denies with no local process.
- [ ] Lane 3. Request a machine registered for the wrong repository. Save `evidence/U06/lane-3/scenario.png` and its transcript/assertions. Pass when the request fails instead of using another checkout.
- [ ] Lane 4. Launch against a registered but offline machine. Save `evidence/U06/lane-4/scenario.png` and its transcript/assertions. Pass when waiting reason remains visible and expiry never falls back.
- [ ] Lane 5. Replay enrollment and a rotated refresh credential. Save `evidence/U06/lane-5/scenario.png` and its transcript/assertions. Pass when both fail without a new usable device grant.
- [ ] Lane 6. Keep the developer checkout dirty before launch. Save `evidence/U06/lane-6/scenario.png` and its transcript/assertions. Pass when its files and refs remain byte-identical after task preparation.
- [ ] Lane 7. Prepare two tasks and inspect namespaces. Save `evidence/U06/lane-7/scenario.png` and its transcript/assertions. Pass when branches, writable directories, ports, and fixtures do not overlap.
- [ ] Lane 8. Request native macOS/Xcode verification from a Docker-backed Mac worker and test forbidden imports. Save `evidence/U06/lane-8/scenario.png` and its transcript/assertions. Pass when capability mismatch denies before claim and center-internal imports fail.
- [ ] Lane 9. Drop connectivity during a command and reconnect after expiry. Save `evidence/U06/lane-9/scenario.png` and its transcript/assertions. Pass when worker stops by deadline and late data is historical only.
- [ ] Lane 10. Leave uncommitted work then request cleanup. Save `evidence/U06/lane-10/scenario.png` and its transcript/assertions. Pass when no force deletion occurs and only the owner can export/resolve it.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Enrollment exchange and warm-mirror worktree preparation, plus disconnect stop time.
- [ ] Probe. Run `agora project verify --scenario perf --unit U06 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail exchange above one second, warm fixture preparation above 10 seconds, or process shutdown beyond 60 seconds after lost renewal.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Execute bounded local work and collect behavior evidence (U07)

**Depends on.** U06. Stage S1. Requirements R08, R09, R11, R12, R16, R21, R22, R24. Acceptance AC07, AC08, AC10.

**Files.**

- [ ] Own Execution, Worker, Agents, Evidence, Verification under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Bind existing foundation evidence schemas/validator to actual environment/run/fence records, upload/finalize and completion APIs. Do not introduce a second evidence format.

Migration and compatibility. Activate a project only after environment and verification conformance. Manifests use agora.evidence/v1 and unknown required fields reject.

Foundation proofs. None.

**Build.**

- [ ] `U07.B01` Implement the restricted Dev Container profile and rootless Linux execution adapter for Linux/macOS hosts, with no host hooks, home/socket/Git mounts, unsafe labels, or default egress.
- [ ] `U07.B02` Run a deterministic scripted canary through the real worker, Git broker, project CLI and existing evidence validator before enabling the model tool loop.
- [ ] `U07.B03` Enable the bounded headless tool loop only after the scripted-worker gate, using the qualified neutral provider adapters and external credential brokers.

**You see.**

- [ ] One real provider-backed task changes the fixture application, proves its user flow, and returns digest-verified evidence without host credential access. Save `evidence/U07/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test effective image metadata policy, tool/path schemas, output caps, exit/outcome consistency, manifest head/digest mismatches, quarantine, and cleanup ownership. Save `evidence/U07/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U07/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Fix a bounded fixture-app behavior on trunk and head. Save `evidence/U07/lane-1/scenario.png` and its transcript/assertions. Pass when head produces the literal requested user result and records exact evidence.
- [ ] Lane 2. Try host home, SSH agent, Docker socket, and shared Git reads. Save `evidence/U07/lane-2/scenario.png` and its transcript/assertions. Pass when all deny and developer checkout stays unchanged.
- [ ] Lane 3. Use initializeCommand or unsafe image-label metadata. Save `evidence/U07/lane-3/scenario.png` and its transcript/assertions. Pass when environment activation fails before host execution.
- [ ] Lane 4. Attempt metadata/private-range and unapproved internet access. Save `evidence/U07/lane-4/scenario.png` and its transcript/assertions. Pass when no application response or destination-side request reaches denied targets.
- [ ] Lane 5. Run a project check on an unavailable platform. Save `evidence/U07/lane-5/scenario.png` and its transcript/assertions. Pass when manifest says unavailable and the run cannot succeed.
- [ ] Lane 6. Mutate the candidate after verification. Save `evidence/U07/lane-6/scenario.png` and its transcript/assertions. Pass when old exact-head evidence cannot satisfy completion.
- [ ] Lane 7. Upload an altered digest, unsafe archive, or active SVG. Save `evidence/U07/lane-7/scenario.png` and its transcript/assertions. Pass when quarantine prevents evidence promotion and active rendering.
- [ ] Lane 8. Cancel the agent during a long child process. Save `evidence/U07/lane-8/scenario.png` and its transcript/assertions. Pass when owned process group exits and cleanup receipt is accurate.
- [ ] Lane 9. Replay signed evidence from another project/fence. Save `evidence/U07/lane-9/scenario.png` and its transcript/assertions. Pass when scope/signature validation denies it.
- [ ] Lane 10. Drive project verification skill end to end and clean up. Save `evidence/U07/lane-10/scenario.png` and its transcript/assertions. Pass when visible result and persisted side effect match while proof files survive.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Tool dispatch overhead, artifact finalization, and chat responsiveness during a run.
- [ ] Probe. Run `agora project verify --scenario perf --unit U07 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail local dispatch overhead above 100 ms, 10-MiB fixture artifact finalization above five seconds, or chat above R18 limits.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Publish approved drafts and enforce independent review (U08)

**Depends on.** U07. Stage S1. Requirements R07, R11, R12, R14, R15. Acceptance AC09.

**Files.**

- [ ] Own Control, Policy, Integrations, Worker, Evidence, Web under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add publication state/effect receipts, overlap reviews, remote read-back facts, and post-merge scenario references. Add publication request/claim/receipt APIs.

Migration and compatibility. Store immutable repository identity and protection observations at onboarding. Existing evidence remains owner-attested until trusted CI reports exact-head checks.

Foundation proofs. None.

**Build.**

- [ ] `U08.B01` Implement changed-path overlap detection, current-base checks, size rationale/exception, risk floors, and stale-evidence invalidation.
- [ ] `U08.B02` Add non-author exact-head publication approval and distinct local credential-owner confirmation. Host Git broker pushes only the task branch and opens only a draft.
- [ ] `U08.B03` Integrate the already qualified trusted checker with publication reconciliation, review UI, human-merge observation and post-merge smoke, separating prepublication proof from postpublication CI and fresh publication capabilities from released leases.

**You see.**

- [ ] The second developer approves an exact result, the owner publishes a draft, and GitHub blocks merge until independent review and trusted current-head checks pass. Save `evidence/U08/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test self-approval, changed-head/policy races, consumed capability replay, overlap clearance, human takeover, uncertain push/PR creation, and skipped-check failure mapping. Save `evidence/U08/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U08/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Publish an approved fixture draft on trunk and head. Save `evidence/U08/lane-1/scenario.png` and its transcript/assertions. Pass when head records exact remote branch/head/draft and trunk absence is disclosed.
- [ ] Lane 2. Attempt publication without approval and by self-approval. Save `evidence/U08/lane-2/scenario.png` and its transcript/assertions. Pass when no GitHub write occurs.
- [ ] Lane 3. Decline local credential use after maintainer approval. Save `evidence/U08/lane-3/scenario.png` and its transcript/assertions. Pass when no credential is used and no branch is pushed.
- [ ] Lane 4. Change head/base/policy after approval. Save `evidence/U08/lane-4/scenario.png` and its transcript/assertions. Pass when publication blocks until new evidence and approval.
- [ ] Lane 5. Publish overlapping changes from two tasks. Save `evidence/U08/lane-5/scenario.png` and its transcript/assertions. Pass when later publication waits for overlap review and fresh-base verification.
- [ ] Lane 6. Add human commits to the remote branch. Save `evidence/U08/lane-6/scenario.png` and its transcript/assertions. Pass when broker refuses to overwrite or force-push them.
- [ ] Lane 7. Lose response after push and after draft creation. Save `evidence/U08/lane-7/scenario.png` and its transcript/assertions. Pass when reconciliation finds exactly one matching effect without duplicate draft.
- [ ] Lane 8. Make a required check skipped, neutral, unavailable, or wrong-head. Save `evidence/U08/lane-8/scenario.png` and its transcript/assertions. Pass when aggregate fails and protected merge remains blocked.
- [ ] Lane 9. Try to merge as the author or without latest review. Save `evidence/U08/lane-9/scenario.png` and its transcript/assertions. Pass when GitHub requires the independent human and current checks.
- [ ] Lane 10. Perform human merge then run post-merge scenario. Save `evidence/U08/lane-10/scenario.png` and its transcript/assertions. Pass when task completes only after observed merge SHA and passing user behavior.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Publication preflight latency excluding forge calls and reconciliation convergence.
- [ ] Probe. Run `agora project verify --scenario perf --unit U08 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail preflight above one second or observed-effect reconciliation above 30 seconds after GitHub becomes available.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Prove the first release across two accounts and machines (U09)

**Depends on.** U08. Stage S1. Requirements R01, R12, R15, R16, R17, R18, R19, R22, R23. Acceptance AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10, AC11, AC12, AC13.

**Files.**

- [ ] Own Verification, Operations, Web, Worker, all release owners under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. No new product schema. Add versioned acceptance scenario inventory, fixture identities, release evidence index, and signed gate results.

Migration and compatibility. Rehearse fresh install and upgrade from the prior unit head; test restore and client/worker compatibility. No production data migration during test.

Foundation proofs. None.

**Build.**

- [ ] `U09.B01` Complete the platform feature map and all S1 live acceptance criteria with two real verified accounts on two machines, including uncoached authority comprehension and absent-reviewer waiting states.
- [ ] `U09.B02` Run denial, crash, injection, exact-head, restore, cost, accessibility, and reference-load suites. Repair product gaps rather than documenting false passes.
- [ ] `U09.B03` Create the S1 release runbook and evidence index with tested versions, residual trust limits, operator rollback, and explicit stage-two disabled controls.

**You see.**

- [ ] Two developers complete the entire conversation-to-local-task-to-human-reviewed-result workflow and an operator can restore the center. Save `evidence/U09/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Run every unit/integration/contract suite plus documentation and scenario-map drift checks; no flaky retry-until-green allowance. Save `evidence/U09/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U09/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Run LV12 complete two-person story on trunk and head. Save `evidence/U09/lane-1/scenario.png` and its transcript/assertions. Pass when all user-visible end states pass and stage-two controls remain disabled.
- [ ] Lane 2. Run LV01 and LV02 with live email/accounts. Save `evidence/U09/lane-2/scenario.png` and its transcript/assertions. Pass when invitation, scope, revocation, room/search and observer denials pass.
- [ ] Lane 3. Run LV03 under concurrent posting and service restart. Save `evidence/U09/lane-3/scenario.png` and its transcript/assertions. Pass when both machines converge without loss or duplicates.
- [ ] Lane 4. Run LV04 and LV10 using real model output and hostile fixtures. Save `evidence/U09/lane-4/scenario.png` and its transcript/assertions. Pass when citations and scope are honest and no authority or active exfiltration link appears.
- [ ] Lane 5. Run LV05 wrong-owner/repository and offline placement. Save `evidence/U09/lane-5/scenario.png` and its transcript/assertions. Pass when no machine or cloud fallback occurs.
- [ ] Lane 6. Run LV06 lease race/loss/cancel/retry on real workers. Save `evidence/U09/lane-6/scenario.png` and its transcript/assertions. Pass when one current fence owns the task and old publication fails.
- [ ] Lane 7. Run LV07 and LV08 against the actual fixture application. Save `evidence/U09/lane-7/scenario.png` and its transcript/assertions. Pass when isolation holds and wrong/unavailable/missing evidence blocks.
- [ ] Lane 8. Run LV09 using approved disposable GitHub resources. Save `evidence/U09/lane-8/scenario.png` and its transcript/assertions. Pass when non-author publication/review and human merge gates hold.
- [ ] Lane 9. Run LV11 with backup restore and concurrent budget exhaustion. Save `evidence/U09/lane-9/scenario.png` and its transcript/assertions. Pass when RPO/RTO pass, old epoch denies, and reservations never exceed caps.
- [ ] Lane 10. Run LV13 plus uncoached LV12 authority comprehension, absent reviewer and budget calibration. Save `evidence/U09/lane-10/scenario.png` and its transcript/assertions. Pass when all selected-client budgets pass and both people understand safe next actions without bypasses.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. All R18 S1 budgets, restore RPO/RTO, and reference-load error rate.
- [ ] Probe. Run `agora project verify --scenario perf --unit U09 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail any R18 S1 budget, any authorization error, any lost/duplicate durable record, or any missing live acceptance scenario.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Provision a private project from a conversation (U10)

**Depends on.** U09. Stage S2 later-stage. Requirements R02, R04, R07, R10, R14, R15. Acceptance AC20.

**Files.**

- [ ] Own Projects, Integrations, Policy, Control, Web under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add project proposals, immutable authorization digests, provisioning steps, integration installations, external IDs/markers, webhook inbox, and repair states. Add propose/authorize/reconcile APIs.

Migration and compatibility. Existing registered projects retain repository IDs and room/main-agent identities. Adopt the App only through an explicit installation/link command; no inferred migration.

Foundation proofs. None.

**Build.**

- [ ] `U10.B01` Build the proposal/authorization UI and separately scoped GitHub admin and normal-operation grants with immutable account linking.
- [ ] `U10.B02` Implement journaled repository creation, approved template seeding, ruleset/check read-back, named membership, and repair behavior after each external step.
- [ ] `U10.B03` Implement signed webhook ingestion, dedupe and asynchronous provisioning reconciliation; extend the existing S1 lifecycle to provisioned resources while activation waits for environment/main-agent prerequisites.

**You see.**

- [ ] An owner sees one repository and room with a truthful onboarding checkpoint; this milestone does not wait for future image/cloud units to activate the complete project. Save `evidence/U10/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test every provisioning crash boundary, foreign name collision, expired consent, wrong installation, duplicate delivery, signature rejection, and archive write denial. Save `evidence/U10/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U10/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Create a disposable project from chat on trunk and head. Save `evidence/U10/lane-1/scenario.png` and its transcript/assertions. Pass when head produces one proposed/authorized project with linked room and inactive main identity.
- [ ] Lane 2. Send proposal text without clicking authorize. Save `evidence/U10/lane-2/scenario.png` and its transcript/assertions. Pass when no repository or integration write occurs.
- [ ] Lane 3. Crash after GitHub creates repository before receipt storage. Save `evidence/U10/lane-3/scenario.png` and its transcript/assertions. Pass when retry adopts only the matching marker/ID and creates no duplicate.
- [ ] Lane 4. Occupy the requested name with an unrelated repository. Save `evidence/U10/lane-4/scenario.png` and its transcript/assertions. Pass when repair_required appears and no foreign resource changes.
- [ ] Lane 5. Use a wrong GitHub installation or identity link. Save `evidence/U10/lane-5/scenario.png` and its transcript/assertions. Pass when the exact-resource action denies.
- [ ] Lane 6. Expire authorization before an unfinished new effect. Save `evidence/U10/lane-6/scenario.png` and its transcript/assertions. Pass when existing facts reconcile but no new write starts.
- [ ] Lane 7. Replay signed webhook then forge signature. Save `evidence/U10/lane-7/scenario.png` and its transcript/assertions. Pass when one authentic record persists and forgery denies.
- [ ] Lane 8. Remove private ruleset entitlement or required-check support. Save `evidence/U10/lane-8/scenario.png` and its transcript/assertions. Pass when project remains onboarding-blocked.
- [ ] Lane 9. Pause/archive while work is queued. Save `evidence/U10/lane-9/scenario.png` and its transcript/assertions. Pass when new leases stop and record remains readable without repository deletion.
- [ ] Lane 10. Inspect proposal/repair UI with keyboard and both viewports. Save `evidence/U10/lane-10/scenario.png` and its transcript/assertions. Pass when exact names, scopes, costs, errors, and repair actions are understandable.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Proposal/authorization receipt and provisioning reconciliation excluding remote outages.
- [ ] Probe. Run `agora project verify --scenario perf --unit U10 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail receipt above one second or reconciliation above 60 seconds after the external resource is observable.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Build and qualify declarative project images (U11)

**Depends on.** U10. Stage S2 later-stage. Requirements R09, R10, R12, R16. Acceptance AC21.

**Files.**

- [ ] Own Projects, Execution, Evidence, Operations under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add image build operation, environment version, OCI/template mapping, provenance/SBOM and activation approval. Add build/status/activate contracts.

Migration and compatibility. S1 owner-approved images remain pinned; never mutate an active environment version. New images activate after a cold conformance run.

Foundation proofs. None.

**Build.**

- [ ] `U11.B01` Implement safe Dev Container effective-config resolution, reviewed Feature/base-image pinning, separate builder VM, and exact build approval.
- [ ] `U11.B02` Export immutable OCI images with SBOM, scans, provenance, command receipts, and bounded logs; key caches by all declared inputs.
- [ ] `U11.B03` Run lifecycle readiness plus project doctor/scenario against the cold image. Block activation on failed setup rather than continuing degraded.

**You see.**

- [ ] A maintainer builds an approved project environment and can reproduce it after deleting its cache. Save `evidence/U11/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test forbidden host options including labels, unresolved image/Feature digests, build-context escape, cache keys, approval expiry, scan failures, and readiness outcomes. Save `evidence/U11/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U11/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Build fixture OCI from approved definition on trunk and head. Save `evidence/U11/lane-1/scenario.png` and its transcript/assertions. Pass when head emits digest/provenance and trunk missing capability is disclosed.
- [ ] Lane 2. Delete caches and rebuild the same approved inputs. Save `evidence/U11/lane-2/scenario.png` and its transcript/assertions. Pass when required commands and application assertions match.
- [ ] Lane 3. Inject initializeCommand and privileged options through image labels. Save `evidence/U11/lane-3/scenario.png` and its transcript/assertions. Pass when build/activation rejects before host execution.
- [ ] Lane 4. Use unpinned Feature or base image. Save `evidence/U11/lane-4/scenario.png` and its transcript/assertions. Pass when activation fails with a precise validation reason.
- [ ] Lane 5. Escape the repository build context with a symlink. Save `evidence/U11/lane-5/scenario.png` and its transcript/assertions. Pass when builder exports no outside file.
- [ ] Lane 6. Place a secret in the build output. Save `evidence/U11/lane-6/scenario.png` and its transcript/assertions. Pass when scan quarantines the image and no runtime activation occurs.
- [ ] Lane 7. Fail post-create readiness. Save `evidence/U11/lane-7/scenario.png` and its transcript/assertions. Pass when later lifecycle commands and agent start do not run.
- [ ] Lane 8. Change policy or lockfile while build is pending. Save `evidence/U11/lane-8/scenario.png` and its transcript/assertions. Pass when old output cannot activate under the new digest.
- [ ] Lane 9. Crash builder during upload then reconcile. Save `evidence/U11/lane-9/scenario.png` and its transcript/assertions. Pass when one build identity and immutable image mapping survive.
- [ ] Lane 10. Run the project skill on the resulting cold image. Save `evidence/U11/lane-10/scenario.png` and its transcript/assertions. Pass when behavior passes and cleanup preserves evidence.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Fixture cold build duration and warm-cache benefit reported without a required speedup.
- [ ] Probe. Run `agora project verify --scenario perf --unit U11 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail cold fixture build above 20 minutes or any cached/cold behavior mismatch. Both revisions report builder host cost and image size.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Execute and recover one isolated cloud attempt (U12)

**Depends on.** U11. Stage S2 later-stage. Requirements R06, R07, R09, R15, R16, R17. Acceptance AC21, AC24.

**Files.**

- [ ] Own Execution, Worker cloud mode, Control, Integrations, Operations under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add cloud pool registration, provider resource IDs, allocation operation IDs, desired/observed lifecycle, TTL/cost reservations, and cloud cleanup receipts. Placement union already exists.

Migration and compatibility. Add the e2b capability without changing local RunSpec semantics. Old workers reject unsupported cloud placement rather than guessing.

Foundation proofs. None.

**Build.**

- [ ] `U12.B01` Implement E2B OCI-to-template mapping and create/inspect/exec/export/destroy adapter with host-owned loop, outside-guest credentials, and account/region conformance.
- [ ] `U12.B02` Enforce per-attempt microVM, default-deny external egress, forbidden-range allow-rule rejection, resource/TTL limits, and no public preview ports.
- [ ] `U12.B03` Implement allocation timeout reconciliation, provider TTL, cost reconciliation, quarantined exports, and exact-ID reaping with unknown cleanup visible.

**You see.**

- [ ] A human launches a cloud task in a fresh microVM and sees evidence and confirmed destruction, or a precise unresolved cleanup state. Save `evidence/U12/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test allocation effect keys, ambiguous provider response, capability isolation, TTL/reservation logic, egress policy compilation, and repeated destroy semantics. Save `evidence/U12/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U12/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Launch one approved cloud run on trunk and head. Save `evidence/U12/lane-1/scenario.png` and its transcript/assertions. Pass when head shows one fresh microVM and does not change local placement behavior.
- [ ] Lane 2. Import the pinned OCI image into the selected E2B account/region. Save `evidence/U12/lane-2/scenario.png` and its transcript/assertions. Pass when reported mapping and cold runtime fixture agree with the approved image.
- [ ] Lane 3. Attempt forbidden destinations with application-level probes. Save `evidence/U12/lane-3/scenario.png` and its transcript/assertions. Pass when no HTTP/TLS/protocol response or destination request succeeds.
- [ ] Lane 4. Add an allow rule overlapping a forbidden range or wildcard escape. Save `evidence/U12/lane-4/scenario.png` and its transcript/assertions. Pass when policy rejects despite provider allow-over-deny precedence.
- [ ] Lane 5. Read provider/GitHub/center credentials inside guest. Save `evidence/U12/lane-5/scenario.png` and its transcript/assertions. Pass when no raw credential or administrative capability is available.
- [ ] Lane 6. Allocate two project attempts and write sentinel files. Save `evidence/U12/lane-6/scenario.png` and its transcript/assertions. Pass when neither sees the other's files, processes, or fixtures.
- [ ] Lane 7. Lose allocation response then restart runner. Save `evidence/U12/lane-7/scenario.png` and its transcript/assertions. Pass when reconciler finds one owned external resource or blocks without duplicate allocation.
- [ ] Lane 8. Lose runner while guest runs past lease expiry. Save `evidence/U12/lane-8/scenario.png` and its transcript/assertions. Pass when capability stops and provider hard TTL bounds compute.
- [ ] Lane 9. Make destroy unavailable then restore access. Save `evidence/U12/lane-9/scenario.png` and its transcript/assertions. Pass when UI says unconfirmed and later exact-ID read-back proves destruction.
- [ ] Lane 10. Export malicious paths, oversized logs, and secret-bearing artifacts. Save `evidence/U12/lane-10/scenario.png` and its transcript/assertions. Pass when quarantine blocks release and resource limits preserve center responsiveness.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Built-template sandbox readiness, cancel/reaper latency, and observed cloud cost.
- [ ] Probe. Run `agora project verify --scenario perf --unit U12 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail ready p95 above 120 seconds, capability revocation above one second, or live resource beyond hard TTL plus two-minute cleanup grace without an explicit incident.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Activate persistent project agents and reviewed knowledge (U13)

**Depends on.** U09. Stage S2 later-stage. Requirements R04, R05, R10, R13, R14, R24. Acceptance AC22.

**Files.**

- [ ] Own Agents, Knowledge, Projects, Policy, Web under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Activate project-main profile/session context and add knowledge versions, evidence edges, validity, review dates, conflict/supersession links. Add propose/activate/dispute/revoke APIs.

Migration and compatibility. Reuse inactive S1 main-agent identities and existing decision records. Imported repository docs begin proposed, never active automatically. Run all scenarios on an existing registered project with cloud credentials absent.

Foundation proofs. None.

**Build.**

- [ ] `U13.B01` Implement human knowledge activation with provenance, applicability, regression or non-executable rationale, and 90-day review deadline.
- [ ] `U13.B02` Implement deterministic invalidation, conflict exclusion, ACL-before-FTS context compilation, and versioned repository import/export through ordinary contribution workflow.
- [ ] `U13.B03` Activate project-main sessions that reconstruct approved context and propose task dependencies without launching or approving.

**You see.**

- [ ] A project main agent answers after restart with cited approved decisions, and stale/disputed knowledge no longer enters operational context. Save `evidence/U13/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test activation roles, immutable versions, applicability filters, conflict precedence, source redaction/deletion, deadline expiry, and prohibited task auto-launch. Save `evidence/U13/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U13/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Ask project main after service restart on trunk and head. Save `evidence/U13/lane-1/scenario.png` and its transcript/assertions. Pass when same stable identity cites approved durable records rather than private process memory.
- [ ] Lane 2. Propose a lesson with no evidence. Save `evidence/U13/lane-2/scenario.png` and its transcript/assertions. Pass when it remains inactive and absent from operational context.
- [ ] Lane 3. Activate with a maintainer and regression receipt. Save `evidence/U13/lane-3/scenario.png` and its transcript/assertions. Pass when the new version appears with its evidence and scope.
- [ ] Lane 4. Change a declared dependency/path/fixture. Save `evidence/U13/lane-4/scenario.png` and its transcript/assertions. Pass when matching knowledge becomes stale before the next context bundle.
- [ ] Lane 5. Expire review date. Save `evidence/U13/lane-5/scenario.png` and its transcript/assertions. Pass when ordinary retrieval excludes the record but history remains.
- [ ] Lane 6. Propose equal-scope contradictory claims. Save `evidence/U13/lane-6/scenario.png` and its transcript/assertions. Pass when both remain visible as disputed and neither silently wins by recency.
- [ ] Lane 7. Redact a source message or evidence artifact. Save `evidence/U13/lane-7/scenario.png` and its transcript/assertions. Pass when dependent records invalidate and new contexts cannot cite removed content.
- [ ] Lane 8. Ask project main to launch on another member's machine. Save `evidence/U13/lane-8/scenario.png` and its transcript/assertions. Pass when it creates at most a proposal and cannot acquire authority.
- [ ] Lane 9. Import repository docs then export an approved change. Save `evidence/U13/lane-9/scenario.png` and its transcript/assertions. Pass when import is proposed and export follows the normal evidence/approval workflow.
- [ ] Lane 10. Search across two project contexts with different memberships. Save `evidence/U13/lane-10/scenario.png` and its transcript/assertions. Pass when no record, snippet, or model answer crosses the audience boundary.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Authorized knowledge retrieval p95 and main-agent context compilation.
- [ ] Probe. Run `agora project verify --scenario perf --unit U13 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail retrieval above 500 ms or context compilation above one second on a 10000-record fixture; no cross-scope result is tolerable.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Prove local and cloud execution parity (U14)

**Depends on.** U12, U13. Stage S2 later-stage. Requirements R08, R09, R11, R12, R15, R19. Acceptance AC23, AC24.

**Files.**

- [ ] Own Verification, Execution, Worker, Evidence, Integrations under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. No new authority model. Add placement conformance scenario records and equivalent assertion/manifest comparison reports.

Migration and compatibility. Validate protocol and manifest compatibility with S1 workers. Any changed contract requires an explicit version, not placement-specific hidden fields.

Foundation proofs. None.

**Build.**

- [ ] `U14.B01` Run the same fixture goal/base/policy/context on both placements and compare required assertions, manifest subjects, deny behavior, and approval gates.
- [ ] `U14.B02` Complete cloud patch-to-candidate broker, fresh independent verification, approved App publication, current-head read-back, and human review/merge.
- [ ] `U14.B03` Exercise cancel/loss/retry, overlapping changes, stale approvals, unavailable checks, and cold recovery without snapshots on both placements.

**You see.**

- [ ] A developer chooses local or cloud explicitly and receives the same trustworthy review contract, while placement-specific trust and cost remain visible. Save `evidence/U14/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test canonical RunSpec compatibility, artifact normalization, broker patch validation, exact candidate verification, and placement-independent policy decisions. Save `evidence/U14/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U14/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Run matching local/cloud fixture tasks on trunk and head. Save `evidence/U14/lane-1/scenario.png` and its transcript/assertions. Pass when required outcomes and manifest subjects agree without claiming identical generated patches.
- [ ] Lane 2. Publish a cloud result through the external broker. Save `evidence/U14/lane-2/scenario.png` and its transcript/assertions. Pass when guest never receives write credential and exact candidate is independently checked.
- [ ] Lane 3. Try local-to-cloud fallback during a disconnect. Save `evidence/U14/lane-3/scenario.png` and its transcript/assertions. Pass when no new placement starts without fresh human launch.
- [ ] Lane 4. Cancel the same long command on each placement. Save `evidence/U14/lane-4/scenario.png` and its transcript/assertions. Pass when revocation and cleanup outcomes follow one contract.
- [ ] Lane 5. Expire lease then retry each placement. Save `evidence/U14/lane-5/scenario.png` and its transcript/assertions. Pass when new environment/fence owns work and old output stays historical.
- [ ] Lane 6. Inject bad prepublication evidence then failing postpublication CI on both placements. Save `evidence/U14/lane-6/scenario.png` and its transcript/assertions. Pass when bad evidence blocks draft while failing CI blocks review-ready/merge after an allowed draft.
- [ ] Lane 7. Produce overlapping changes from local and cloud. Save `evidence/U14/lane-7/scenario.png` and its transcript/assertions. Pass when overlap and rebase gates treat them equally.
- [ ] Lane 8. Apply a malicious cloud patch with escaping paths. Save `evidence/U14/lane-8/scenario.png` and its transcript/assertions. Pass when broker rejects it without modifying the host checkout.
- [ ] Lane 9. Delete all snapshot caches and recover a task fresh. Save `evidence/U14/lane-9/scenario.png` and its transcript/assertions. Pass when declarative environment plus durable records suffice.
- [ ] Lane 10. Inspect both review screens and cost records. Save `evidence/U14/lane-10/scenario.png` and its transcript/assertions. Pass when trust class, location, evidence, payer, and human gates are explicit.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Shared control-path overhead and per-placement preparation/verification times.
- [ ] Probe. Run `agora project verify --scenario perf --unit U14 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail common control path above R18 limits or cloud readiness above 120 seconds. Do not compare unlike local/cloud startup ratios.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Qualify a real external coding-agent adapter (U18)

**Depends on.** U09. Stage S2 later-stage. Requirements R08, R11, R12, R16, R21, R24. Acceptance AC25.

**Files.**

- [ ] Own Worker, Execution, Adapters, Verification under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add versioned AgentAdapter capability/event mapping and pinned external-distribution identity. Existing RunSpec/evidence remain authoritative.

Migration and compatibility. Use the S1 fake process conformance vectors first. Select the pinned Codex CLI structured noninteractive distribution only after data/credential/isolation qualification; never silently broaden tools.

Foundation proofs. None.

**Build.**

- [ ] `U18.B01` Implement the external process adapter with pinned distribution, capability negotiation and closed event mappings against deterministic contract fixtures.
- [ ] `U18.B02` Qualify the real CLI inside the execution boundary with outside-guest credential brokerage, bounded tools/network, cancellation and process cleanup.
- [ ] `U18.B03` Run a real bounded fixture change through the qualified CLI and the unchanged exact-head evidence/publication review path.

**You see.**

- [ ] A developer can use one qualified existing coding agent without granting it new authority. Save `evidence/U18/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test all event/finish variants, cancellation escalation, capability mismatch, credential withholding and forged evidence. Save `evidence/U18/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U18/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Drive fake external events at parent and head. Save `evidence/U18/lane-1/scenario.png` and its transcript/assertions. Pass when head maps exact typed outcomes without vendor leakage.
- [ ] Lane 2. Send unknown/malformed stream variants. Save `evidence/U18/lane-2/scenario.png` and its transcript/assertions. Pass when adapter stops with non-pass.
- [ ] Lane 3. Repeat action IDs and omit terminal event. Save `evidence/U18/lane-3/scenario.png` and its transcript/assertions. Pass when no duplicate tool execution or inferred success.
- [ ] Lane 4. Attempt host shell and undeclared delegation. Save `evidence/U18/lane-4/scenario.png` and its transcript/assertions. Pass when boundary denies both.
- [ ] Lane 5. Inspect guest and artifacts for broker credentials. Save `evidence/U18/lane-5/scenario.png` and its transcript/assertions. Pass when no raw key is present.
- [ ] Lane 6. Deny the CLI required authentication/tool control. Save `evidence/U18/lane-6/scenario.png` and its transcript/assertions. Pass when adapter stays unavailable rather than loosening policy.
- [ ] Lane 7. Cancel during a long child process. Save `evidence/U18/lane-7/scenario.png` and its transcript/assertions. Pass when owned process tree stops by deadline.
- [ ] Lane 8. Perform the real bounded fixture edit. Save `evidence/U18/lane-8/scenario.png` and its transcript/assertions. Pass when public user behavior and exact-head manifest pass.
- [ ] Lane 9. Forge result text with unavailable/wrong-head checks. Save `evidence/U18/lane-9/scenario.png` and its transcript/assertions. Pass when evidence validator refuses success.
- [ ] Lane 10. Publish only after the normal two-person approvals. Save `evidence/U18/lane-10/scenario.png` and its transcript/assertions. Pass when the external agent has no forge authority and proof survives cleanup.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Adapter overhead, cancellation and retained resource count.
- [ ] Probe. Run `agora project verify --scenario perf --unit U18 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail adapter event overhead above 100 ms or process shutdown beyond 60 seconds; no orphan or credential leak is acceptable.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Deliver the native Swift client without worker authority (U19)

**Depends on.** U09. Stage S2 later-stage. Requirements R02, R04, R07, R12, R18, R21, R24. Acceptance AC26.

**Files.**

- [ ] Own Native client, Contracts, Client core fixtures, Verification, Operations under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. No new authority model. Add native capability/version, cache/revocation policy and native interaction evidence schema fields as compatible metadata.

Migration and compatibility. Generate Swift HTTP consumers from current schemas and implement Swift replay against common vectors. Qualify a pinned Apple CI target for client tests, not a general native coding worker.

Foundation proofs. None.

**Build.**

- [ ] `U19.B01` Implement SwiftUI navigation, system-browser device authorization, Keychain storage and a Swift replay/core using shared conformance vectors.
- [ ] `U19.B02` Implement native conversation, evidence and subject-bound approval flows with keyboard/VoiceOver behavior and no host-execution bridge.
- [ ] `U19.B03` Run actual native UI/build/packaging scenarios on pinned Apple CI, measure performance and isolate human signing/notarization from candidate processes.

**You see.**

- [ ] Two developers use a real native Mac client for the same human-governed workflow without acquiring local execution authority. Save `evidence/U19/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test Swift wire evolution, raw signature verification, cache clearing, recent-auth challenges, native accessibility and bridge denial. Save `evidence/U19/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U19/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Sign in through the native client at parent and head. Save `evidence/U19/lane-1/scenario.png` and its transcript/assertions. Pass when head opens the system browser and receives scoped native tokens.
- [ ] Lane 2. Use a worker token for a human action. Save `evidence/U19/lane-2/scenario.png` and its transcript/assertions. Pass when approval rejects.
- [ ] Lane 3. Refresh then attempt stale-auth approval. Save `evidence/U19/lane-3/scenario.png` and its transcript/assertions. Pass when new subject-bound step-up is still required.
- [ ] Lane 4. Reconnect with gaps/duplicates and new optional metadata. Save `evidence/U19/lane-4/scenario.png` and its transcript/assertions. Pass when Swift matches golden snapshots without acknowledging unknown state.
- [ ] Lane 5. Drive conversation and evidence with keyboard and VoiceOver. Save `evidence/U19/lane-5/scenario.png` and its transcript/assertions. Pass when native focus, labels and proof are usable.
- [ ] Lane 6. Attempt remote-text host/bridge execution. Save `evidence/U19/lane-6/scenario.png` and its transcript/assertions. Pass when no worker or shell authority is acquired.
- [ ] Lane 7. Revoke while private content is cached. Save `evidence/U19/lane-7/scenario.png` and its transcript/assertions. Pass when subscriptions stop and caches clear.
- [ ] Lane 8. Run native UI and packaging on pinned Apple hardware. Save `evidence/U19/lane-8/scenario.png` and its transcript/assertions. Pass when actual native behavior passes with target-specific evidence.
- [ ] Lane 9. Offer a Linux-container result as native proof. Save `evidence/U19/lane-9/scenario.png` and its transcript/assertions. Pass when gate rejects the target mismatch.
- [ ] Lane 10. Install a signed test build on two Macs and measure flows. Save `evidence/U19/lane-10/scenario.png` and its transcript/assertions. Pass when two-account parity and native performance pass without candidate access to signing keys.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Native startup, input latency, replay time and memory.
- [ ] Probe. Run `agora project verify --scenario perf --unit U19 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail startup above 2.5 seconds, p95 input above 100 ms, replay above two seconds or retained memory above 250 MiB on the R23 laptop.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Capture observer proposals and promote reviewed knowledge (U15)

**Depends on.** U13. Stage S3 later-stage. Requirements R05, R13, R14, R16. Acceptance AC30.

**Files.**

- [ ] Own Knowledge, Agents, Control, Web under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add observer opt-in, batch cursor/range, claim/proposal dedupe, source invalidation edges, and promotion approvals. Add enable/disable/review/promote APIs.

Migration and compatibility. Observer defaults disabled for every existing project. Existing active knowledge stays unchanged; promotion creates a new scope/version.

Foundation proofs. None.

**Build.**

- [ ] `U15.B01` Implement opt-in visible observer batches bounded by 20 messages/five minutes and approved budget, with transactional range receipts and cursor advancement.
- [ ] `U15.B02` Propose attributed claims, questions, contradictions, and decision/knowledge candidates. Keep human exact words separate from model interpretation.
- [ ] `U15.B03` Implement source-edit invalidation, explicit project activation, redacted cross-project promotion with two scope approvals, and recurrence/retrieval metrics.

**You see.**

- [ ] A project conversation produces reviewable, attributed knowledge proposals without automatic truth or cross-project disclosure. Save `evidence/U15/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test batch replay, partial model output, unchanged cursor after failure, disable race, false decision promotion, conflicting sources, and promotion ACLs. Save `evidence/U15/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U15/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Enable observer and discuss a decision on trunk and head. Save `evidence/U15/lane-1/scenario.png` and its transcript/assertions. Pass when head shows attributed proposals and a visible opt-in notice.
- [ ] Lane 2. Replay the same processed message range. Save `evidence/U15/lane-2/scenario.png` and its transcript/assertions. Pass when no duplicate candidate is created.
- [ ] Lane 3. Crash after proposal transaction before notification. Save `evidence/U15/lane-3/scenario.png` and its transcript/assertions. Pass when cursor/proposals agree and UI catches up.
- [ ] Lane 4. Fail the provider midway through a batch. Save `evidence/U15/lane-4/scenario.png` and its transcript/assertions. Pass when cursor stays unchanged and no partial claim activates.
- [ ] Lane 5. Edit or redact source after capture. Save `evidence/U15/lane-5/scenario.png` and its transcript/assertions. Pass when dependent proposals invalidate with visible provenance.
- [ ] Lane 6. Have two people disagree in a thread. Save `evidence/U15/lane-6/scenario.png` and its transcript/assertions. Pass when contradiction remains rather than being summarized away.
- [ ] Lane 7. Ask observer to activate policy or launch work. Save `evidence/U15/lane-7/scenario.png` and its transcript/assertions. Pass when the agent cannot acquire either authority.
- [ ] Lane 8. Promote a redacted lesson with source maintainer and workspace owner. Save `evidence/U15/lane-8/scenario.png` and its transcript/assertions. Pass when a new workspace record cites provenance without widening source ACL.
- [ ] Lane 9. Revoke a promoted record and query another project. Save `evidence/U15/lane-9/scenario.png` and its transcript/assertions. Pass when new context excludes it and audit preserves the history.
- [ ] Lane 10. Disable observer and leave project idle. Save `evidence/U15/lane-10/scenario.png` and its transcript/assertions. Pass when no further batches/spend occur and existing proposals remain reviewable.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Batch eligibility-to-proposal time excluding model latency and idle cost.
- [ ] Probe. Run `agora project verify --scenario perf --unit U15 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail scheduler lag above five seconds after batch eligibility or any provider call on an inactive/disabled project.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Harden operations and prove governed deletion (U16)

**Depends on.** U09, U10, U12. Stage S3 later-stage. Requirements R10, R14, R15, R16, R17, R18. Acceptance AC31.

**Files.**

- [ ] Own Operations, Projects, Identity, Integrations, Evidence under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add audit export manifests, deletion previews/approvals/tombstones, legal holds, retention execution receipts, and restore-drill records. Preserve effect dedupe minimal identities.

Migration and compatibility. Apply retention classes to existing artifacts without deleting them until dry-run inventory and owner approval. Test expand/contract on a restored production-shaped fixture.

Foundation proofs. None.

**Build.**

- [ ] `U16.B01` Add scoped signed audit exports, budget/reconciliation dashboards, backup age/restore alerts, and operator remediation runbooks.
- [ ] `U16.B02` Implement archive/deletion impact preview, export, separate external-repository authority, two-human confirmation, credential revocation, retention/hold handling, and tombstones.
- [ ] `U16.B03` Run VM-loss restore, compatible rollback/forward repair, provider outage, disk pressure, key rotation, and abandoned-resource drills.

**You see.**

- [ ] An operator can recover the center and explain every retained, deleted, or unresolved resource without hidden authority. Save `evidence/U16/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test deletion approval scope, last owner, legal holds, retention pinning, redaction, audit isolation, replay against tombstones, and old-epoch grants. Save `evidence/U16/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U16/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Export audit and restore the center on trunk and head. Save `evidence/U16/lane-1/scenario.png` and its transcript/assertions. Pass when head yields verifiable scoped export and the restored user journey passes.
- [ ] Lane 2. Simulate total VM loss. Save `evidence/U16/lane-2/scenario.png` and its transcript/assertions. Pass when off-host keys/backups suffice within RPO/RTO and old host cannot act.
- [ ] Lane 3. Deploy additive migration then roll back compatible image. Save `evidence/U16/lane-3/scenario.png` and its transcript/assertions. Pass when data remains readable and no automatic destructive downgrade occurs.
- [ ] Lane 4. Request deletion without second human or fresh auth. Save `evidence/U16/lane-4/scenario.png` and its transcript/assertions. Pass when nothing destructive occurs.
- [ ] Lane 5. Place a legal hold on evidence then run retention. Save `evidence/U16/lane-5/scenario.png` and its transcript/assertions. Pass when held/pinned artifacts remain and blocked deletion is explicit.
- [ ] Lane 6. Approve local project deletion without remote-repository deletion. Save `evidence/U16/lane-6/scenario.png` and its transcript/assertions. Pass when remote repository remains untouched.
- [ ] Lane 7. Approve exact external deletion separately on a disposable fixture. Save `evidence/U16/lane-7/scenario.png` and its transcript/assertions. Pass when only named resources change and read-back receipts match.
- [ ] Lane 8. Replay old webhook/command after tombstone. Save `evidence/U16/lane-8/scenario.png` and its transcript/assertions. Pass when deleted project is not recreated.
- [ ] Lane 9. Fill disk and strand a cloud environment under provider outage. Save `evidence/U16/lane-9/scenario.png` and its transcript/assertions. Pass when alerts, hard TTL, unconfirmed cleanup, and recovery remain truthful.
- [ ] Lane 10. Rotate keys and revoke a member during export. Save `evidence/U16/lane-10/scenario.png` and its transcript/assertions. Pass when new access denies and no cross-project/private payload reaches telemetry.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Restore RPO/RTO, export throughput, retention/reaper completion, and reference-load p95.
- [ ] Probe. Run `agora project verify --scenario perf --unit U16 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail RPO above 15 minutes, RTO above four hours, export of 100000 metadata events above two minutes, or R18 regressions.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Add an opt-in notification-only Slack bridge (U17)

**Depends on.** U09. Stage S3 later-stage. Requirements R01, R07, R14, R16, R20. Acceptance AC32.

**Files.**

- [ ] Own Integrations, Policy, Collaboration, Operations under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add notification subscription, approved room/channel mapping, outbox target, and installation revocation receipt. No Slack-to-command schema exists.

Migration and compatibility. Disabled by default. Existing workspace/project audiences do not widen. Reauthorization is required for any scope increase.

Foundation proofs. None.

**Build.**

- [ ] `U17.B01` Add explicit owner-approved Slack bot installation and one-way selected card/notification delivery with links back to Agora.
- [ ] `U17.B02` Deduplicate sends, store remote receipts, restrict payload to mapped room audience, and reconcile uninstall/revocation.
- [ ] `U17.B03` Document that Slack text, reactions, and buttons carry no launch/approval/merge authority; keep direct messages and inbound conversation sync unsupported.

**You see.**

- [ ] A requested Slack channel receives one approved notification linking to the authoritative Agora record, without becoming another control plane. Save `evidence/U17/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test mapping authorization, duplicate outbox receipt, wrong workspace, revocation, no inbound command route, and payload redaction. Save `evidence/U17/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U17/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Enable a mapped notification on trunk and head. Save `evidence/U17/lane-1/scenario.png` and its transcript/assertions. Pass when head sends one scoped card/link and Agora remains authoritative.
- [ ] Lane 2. Replay the same outbox effect. Save `evidence/U17/lane-2/scenario.png` and its transcript/assertions. Pass when no duplicate authoritative outcome or extra work occurs.
- [ ] Lane 3. Map the wrong Slack workspace or channel. Save `evidence/U17/lane-3/scenario.png` and its transcript/assertions. Pass when installation/mapping denies.
- [ ] Lane 4. Attempt a private-project notification without audience approval. Save `evidence/U17/lane-4/scenario.png` and its transcript/assertions. Pass when no project content leaves Agora.
- [ ] Lane 5. Reply with a launch or approval instruction in Slack. Save `evidence/U17/lane-5/scenario.png` and its transcript/assertions. Pass when no task/approval state changes.
- [ ] Lane 6. Click an approval-looking link while unauthenticated. Save `evidence/U17/lane-6/scenario.png` and its transcript/assertions. Pass when Agora requires authentication and exact-action review.
- [ ] Lane 7. Uninstall the bot during pending sends. Save `evidence/U17/lane-7/scenario.png` and its transcript/assertions. Pass when grants revoke and pending delivery cannot revive installation.
- [ ] Lane 8. Increase requested Slack scopes. Save `evidence/U17/lane-8/scenario.png` and its transcript/assertions. Pass when new explicit authorization is required.
- [ ] Lane 9. Take Slack offline during a task. Save `evidence/U17/lane-9/scenario.png` and its transcript/assertions. Pass when task/evidence proceeds and notification failure is separate.
- [ ] Lane 10. Inspect the notification on narrow/wide clients and audit export. Save `evidence/U17/lane-10/scenario.png` and its transcript/assertions. Pass when readable status has a valid authoritative link and no secret/raw logs.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Outbox-to-notification latency and unaffected room delivery.
- [ ] Probe. Run `agora project verify --scenario perf --unit U17 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail delivery above 30 seconds when Slack is available or any regression beyond R18 message budgets; no unavailable notification may change task state.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Establish application-architecture boundary lint (U20)

**Depends on.** U01c, U01d. Stage S1. Requirements R21, R22, R25. Acceptance AC16.

**Files.**

- [ ] Own the Web and Client core boundary tooling under the planned roots. Record actual created paths and lint-configuration receipts.

Schema and API. No new wire schema. Extend the existing import-boundary lint and its compile negatives to `.tsx` files and to named renderer foot-gun rules.

Migration and compatibility. Existing `.ts` boundary rules and their guard-negative tests are unchanged; this unit only widens their file coverage and adds new named rules.

Foundation proofs. None.

**Build.**

- [ ] `U20.B01` Extend the import-boundary lint to `.tsx` files, add named renderer rules banning direct browser-global and unmediated effect access outside the framework layer, and give every rejection an error naming its supported owner and sanctioned alternative.

**You see.**

- [ ] A renderer file that imports a storage or domain type, calls a browser global directly, or uses an unmediated effect fails lint with an error naming its supported owner. Save `evidence/U20/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test each new rule against an accepted and a rejected fixture, and against a disabled-guard copy that must turn red. Save `evidence/U20/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U20/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Lint the existing `.ts` fixtures at parent and head. Save `evidence/U20/lane-1/scenario.png` and its transcript/assertions. Pass when head keeps every existing `.ts` rejection and trunk's absence of `.tsx` coverage is recorded honestly.
- [ ] Lane 2. Add a `.tsx` fixture importing a storage type. Save `evidence/U20/lane-2/scenario.png` and its transcript/assertions. Pass when lint rejects it with the same rule id `.ts` files already use.
- [ ] Lane 3. Add a `.tsx` fixture calling a browser global outside the framework folder. Save `evidence/U20/lane-3/scenario.png` and its transcript/assertions. Pass when lint rejects it and accepts the same call moved inside the framework folder.
- [ ] Lane 4. Add a fixture using an unmediated effect outside the framework folder. Save `evidence/U20/lane-4/scenario.png` and its transcript/assertions. Pass when lint rejects it and accepts the equivalent framework-owned hook.
- [ ] Lane 5. Disable the `.tsx` glob in an isolated copy. Save `evidence/U20/lane-5/scenario.png` and its transcript/assertions. Pass when the lane-2 assertion turns red, proving the guard is real.
- [ ] Lane 6. Add an `eslint-disable` comment naming the new rule. Save `evidence/U20/lane-6/scenario.png` and its transcript/assertions. Pass when the disable comment itself is rejected under the R25 exception contract.
- [ ] Lane 7. Read the rejection message for each new rule. Save `evidence/U20/lane-7/scenario.png` and its transcript/assertions. Pass when each names the supported owner and the sanctioned alternative path.
- [ ] Lane 8. Run the widened lint against the paused renderer fixture branch content. Save `evidence/U20/lane-8/scenario.png` and its transcript/assertions. Pass when its known drift is reproduced as rejections, not silently accepted.
- [ ] Lane 9. Move a rejected pattern inside the framework folder. Save `evidence/U20/lane-9/scenario.png` and its transcript/assertions. Pass when the same pattern is now accepted only there.
- [ ] Lane 10. Run the full existing `.ts` boundary suite alongside the new `.tsx` suite. Save `evidence/U20/lane-10/scenario.png` and its transcript/assertions. Pass when both pass together with no rule regression.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Lint wall time across the widened file set.
- [ ] Probe. Run `agora project verify --scenario perf --unit U20 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail lint wall time above twice the existing `.ts`-only baseline.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Establish Feature and Entrypoint discovery (U21)

**Depends on.** U20. Stage S1. Requirements R21, R22, R25. Acceptance AC16.

**Files.**

- [ ] Own the Web feature-discovery tooling under the planned roots. Record actual created paths and generated-inventory receipts.

Schema and API. No new wire schema. Define the reserved Entrypoint and Timeline Card filenames and the generated inventory format they produce.

Migration and compatibility. The generated inventory replaces hand-edited per-feature rows in the site inventory and feature map; existing entries migrate in U23, not here.

Foundation proofs. None.

**Build.**

- [ ] `U21.B01` Implement build-time discovery of Feature directories and their reserved Entrypoint/Timeline Card files, generate a drift-checked inventory from them, and reject a Feature outside the conventional path or a hand-edited inventory row that disagrees with the generated one.

**You see.**

- [ ] Adding a Feature with its reserved files makes it appear in the generated inventory automatically, and hand-editing that inventory instead of adding the reserved file fails the same way schema drift already fails. Save `evidence/U21/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test discovery of a well-formed Feature, rejection of a misplaced one, and drift rejection of a hand-edited inventory row. Save `evidence/U21/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U21/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Generate the inventory from the current fixture Feature set at parent and head. Save `evidence/U21/lane-1/scenario.png` and its transcript/assertions. Pass when head's generated inventory matches the fixture and trunk's absence of discovery is recorded honestly.
- [ ] Lane 2. Add a Feature with both reserved files. Save `evidence/U21/lane-2/scenario.png` and its transcript/assertions. Pass when it appears in the generated inventory with no manual registration.
- [ ] Lane 3. Add a Feature missing its Entrypoint file. Save `evidence/U21/lane-3/scenario.png` and its transcript/assertions. Pass when discovery fails naming the missing reserved file.
- [ ] Lane 4. Place feature files outside the conventional `features/<name>/` path. Save `evidence/U21/lane-4/scenario.png` and its transcript/assertions. Pass when the build rejects the location.
- [ ] Lane 5. Hand-edit a generated inventory row. Save `evidence/U21/lane-5/scenario.png` and its transcript/assertions. Pass when drift detection rejects the edit.
- [ ] Lane 6. Disable drift detection in an isolated copy. Save `evidence/U21/lane-6/scenario.png` and its transcript/assertions. Pass when the lane-5 assertion turns red.
- [ ] Lane 7. Remove a Feature directory entirely. Save `evidence/U21/lane-7/scenario.png` and its transcript/assertions. Pass when the generated inventory drops it and no stale reference remains.
- [ ] Lane 8. Add two Features with the same declared name. Save `evidence/U21/lane-8/scenario.png` and its transcript/assertions. Pass when discovery rejects the collision.
- [ ] Lane 9. Read the rejection message for a misplaced or missing reserved file. Save `evidence/U21/lane-9/scenario.png` and its transcript/assertions. Pass when it names the supported owner and the conventional path.
- [ ] Lane 10. Regenerate the inventory twice with no source change. Save `evidence/U21/lane-10/scenario.png` and its transcript/assertions. Pass when the second run is a no-op with an identical digest.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Discovery and generation wall time.
- [ ] Probe. Run `agora project verify --scenario perf --unit U21 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail generation above five seconds for the fixture Feature set.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Establish the Client and Host boundary (U22)

**Depends on.** U20. Stage S1. Requirements R21, R22, R25. Acceptance AC16.

**Files.**

- [ ] Own the Web and Client core boundary tooling under the planned roots. Record actual created paths and interface receipts.

Schema and API. No new wire schema. Define the Client's named hooks/commands surface and the Host's one typed interface over browser globals and transport.

Migration and compatibility. Existing Client core replay/dedupe/receipt behavior under R21 is unchanged; this unit adds the renderer-facing named surface and the Host wrapper around it.

Foundation proofs. None.

**Build.**

- [ ] `U22.B01` Implement the Client's named hooks and commands as the sole durable-state write/read surface, implement the one typed Host interface wrapping every browser global and transport call, and reject component code that bypasses either.

**You see.**

- [ ] A component that holds durable timeline state in local state, or calls a browser global or transport directly, fails to build with an error naming the Client hook or Host method to use instead. Save `evidence/U22/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test that the Client's hooks return immutable projections, that its commands are the only write path, and that Host calls are exhaustively typed. Save `evidence/U22/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U22/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Read and write fixture room state through the existing Client core at parent and head. Save `evidence/U22/lane-1/scenario.png` and its transcript/assertions. Pass when head's named-hook surface reproduces the same replay/dedupe result trunk already proves.
- [ ] Lane 2. Duplicate a durable value in component state. Save `evidence/U22/lane-2/scenario.png` and its transcript/assertions. Pass when the build rejects the duplicate holder.
- [ ] Lane 3. Call `fetch` or a WebSocket directly from a component. Save `evidence/U22/lane-3/scenario.png` and its transcript/assertions. Pass when the build rejects it and accepts the same call through the Host.
- [ ] Lane 4. Call `document` or `window` directly from a component. Save `evidence/U22/lane-4/scenario.png` and its transcript/assertions. Pass when the build rejects it and accepts the same call through the Host.
- [ ] Lane 5. Send a command through the Client and inspect the resulting receipt. Save `evidence/U22/lane-5/scenario.png` and its transcript/assertions. Pass when the receipt matches R07's command-receipt shape.
- [ ] Lane 6. Disable the one-writer guard in an isolated copy. Save `evidence/U22/lane-6/scenario.png` and its transcript/assertions. Pass when the lane-2 assertion turns red.
- [ ] Lane 7. Call a Host method with a malformed request. Save `evidence/U22/lane-7/scenario.png` and its transcript/assertions. Pass when the typed interface rejects it at compile time, not at runtime.
- [ ] Lane 8. Subscribe and unsubscribe through the Host repeatedly. Save `evidence/U22/lane-8/scenario.png` and its transcript/assertions. Pass when no subscription leaks past its owning component's lifetime.
- [ ] Lane 9. Read the rejection message for a bypassed Client or Host call. Save `evidence/U22/lane-9/scenario.png` and its transcript/assertions. Pass when it names the supported hook, command, or Host method.
- [ ] Lane 10. Run the existing Client core replay suite alongside the new named-hook suite. Save `evidence/U22/lane-10/scenario.png` and its transcript/assertions. Pass when both pass together with no regression.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Hook re-render count and Host call latency under fixture load.
- [ ] Probe. Run `agora project verify --scenario perf --unit U22 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail unrelated-row re-renders above zero during a scoped update.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Migrate existing work into the Agora application architecture (U23)

**Depends on.** U20, U21, U22. Stage S1. Requirements R21, R25. Acceptance AC16.

**Files.**

- [ ] Own Web, Domain, Client core under the planned roots. Record actual created paths and migration receipts.

Schema and API. No wire schema changes. This unit moves existing files; it does not change any wire contract, database schema, or observable behavior.

Migration and compatibility. Move the portable-contracts consumer wiring, the local-room domain port and its route, and the paused browser-shell fixture into Feature-owned folders with their Entrypoint and Timeline Card files, with no behavior change at any step.

Foundation proofs. None.

**Build.**

- [ ] `U23.B01` Move the existing local-room contracts, domain port, route, and paused browser-shell fixture into their own Feature-owned folder with reserved Entrypoint and Timeline Card files, with every existing test passing unchanged before and after the move.

**You see.**

- [ ] The local-room feature now lives in one discovered Feature folder, its generated inventory entry replaces its old hand-edited rows, and every test that passed before the move still passes after it. Save `evidence/U23/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test that every pre-move passing test still passes post-move with an unchanged assertion, and that the generated inventory now owns the local-room entry. Save `evidence/U23/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U23/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Run the full local-room test suite at parent and head. Save `evidence/U23/lane-1/scenario.png` and its transcript/assertions. Pass when every assertion that passed at parent still passes at head with an unchanged expected value.
- [ ] Lane 2. Diff the moved files' contents against their pre-move contents. Save `evidence/U23/lane-2/scenario.png` and its transcript/assertions. Pass when only their paths and import statements changed.
- [ ] Lane 3. Run the generated Feature inventory over the moved local-room folder. Save `evidence/U23/lane-3/scenario.png` and its transcript/assertions. Pass when it appears with no remaining hand-edited row.
- [ ] Lane 4. Run the widened boundary lint over the moved files. Save `evidence/U23/lane-4/scenario.png` and its transcript/assertions. Pass when the moved renderer fixture now passes U20's rules it previously failed.
- [ ] Lane 5. Run the portable-contracts conformance suite. Save `evidence/U23/lane-5/scenario.png` and its transcript/assertions. Pass when TypeScript and Swift still agree on every golden vector.
- [ ] Lane 6. Run the PostgreSQL-backed storage tests. Save `evidence/U23/lane-6/scenario.png` and its transcript/assertions. Pass when every row-level and migration test still passes.
- [ ] Lane 7. Search the repository for the old hand-edited paths. Save `evidence/U23/lane-7/scenario.png` and its transcript/assertions. Pass when no reference to the pre-move location remains outside historical evidence.
- [ ] Lane 8. Revert the move in an isolated copy and rerun the generated inventory. Save `evidence/U23/lane-8/scenario.png` and its transcript/assertions. Pass when the reverted copy fails discovery, proving the move is what discovery depends on.
- [ ] Lane 9. Inspect the feature map and site inventory. Save `evidence/U23/lane-9/scenario.png` and its transcript/assertions. Pass when both point at the new Feature-owned paths only.
- [ ] Lane 10. Run the complete `pnpm check` suite. Save `evidence/U23/lane-10/scenario.png` and its transcript/assertions. Pass when lint, typecheck, contracts, and tests all pass at head.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Full-suite wall time before and after the move.
- [ ] Probe. Run `agora project verify --scenario perf --unit U23 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. A pure file move fails any regression beyond noise.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Enable conversational agent creation with isolated environments (U24)

**Depends on.** U06, U11, U13, U14. Stage S2. Requirements R04, R06, R08, R09, R14, R16, R26. Acceptance AC27.

**Files.**

- [ ] Own Identity, Policy, Control, Projects, Web under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add agent-proposal, routine-pack version, automation, environment-template, and lifecycle-state records. Add propose/confirm-agent, routine-pack install, and provision/pause/resume/snapshot/reset/archive/destroy commands.

Migration and compatibility. Reuse R08's worker enrollment and R09's environment-definition machinery for the per-agent environment; no separate execution boundary is invented. A routine-pack marketplace source is not part of this unit; installation validates only a locally supplied signed manifest.

Foundation proofs. None.

**Build.**

- [ ] `U24.B01` Implement the propose/confirm agent-creation flow with its exact plan/permission/cost/lifecycle preview, one isolated persistent environment per created agent, explicit provision/pause/resume/snapshot/reset/archive/destroy states, and signed-manifest routine-pack installation that cannot expand a creation approval's granted authority.

**You see.**

- [ ] A maintainer proposes an agent from a room, a second eligible human confirms its exact plan before any spend, the agent receives its own isolated environment, and installing an over-broad or unsigned routine pack is rejected. Save `evidence/U24/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test proposal/confirmation authority, lifecycle-state transitions, environment isolation between two agents, and manifest-scope rejection. Save `evidence/U24/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U24/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Propose and confirm a fixture agent at parent and head. Save `evidence/U24/lane-1/scenario.png` and its transcript/assertions. Pass when head creates one agent identity and trunk's absence of the capability is recorded honestly.
- [ ] Lane 2. Confirm without first viewing the plan preview. Save `evidence/U24/lane-2/scenario.png` and its transcript/assertions. Pass when confirmation is rejected until the preview is shown.
- [ ] Lane 3. Create two agents and inspect their environments. Save `evidence/U24/lane-3/scenario.png` and its transcript/assertions. Pass when neither can reach the other's filesystem, browser, or terminal.
- [ ] Lane 4. Install a routine pack requesting a wider tool or network scope than the agent's approval. Save `evidence/U24/lane-4/scenario.png` and its transcript/assertions. Pass when installation is rejected without a fresh approval.
- [ ] Lane 5. Install an unsigned routine pack. Save `evidence/U24/lane-5/scenario.png` and its transcript/assertions. Pass when installation is rejected.
- [ ] Lane 6. Drive provision, pause, resume, snapshot, reset, archive, and destroy in order. Save `evidence/U24/lane-6/scenario.png` and its transcript/assertions. Pass when each transition is explicit and auditable, with no state inferred from a missing heartbeat.
- [ ] Lane 7. Disable, then re-enable, one automation. Save `evidence/U24/lane-7/scenario.png` and its transcript/assertions. Pass when the disabled automation does not fire and re-enabling restores it visibly.
- [ ] Lane 8. Stop an agent mid-automation. Save `evidence/U24/lane-8/scenario.png` and its transcript/assertions. Pass when the stop takes effect immediately and the environment reaches a recorded state.
- [ ] Lane 9. Attempt to confirm a proposal as the same human who proposed it. Save `evidence/U24/lane-9/scenario.png` and its transcript/assertions. Pass when self-confirmation is rejected.
- [ ] Lane 10. Inspect the recurring-cost figure shown before confirmation against the environment's actual billed rate. Save `evidence/U24/lane-10/scenario.png` and its transcript/assertions. Pass when the shown figure matches the rate exactly.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Proposal-to-preview latency and environment provisioning time.
- [ ] Probe. Run `agora project verify --scenario perf --unit U24 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail preview latency above one second or provisioning above the R09 cold-build budget.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Deliver the built-in Bug Agent role (U25)

**Depends on.** U24. Stage S3. Requirements R04, R11, R14, R16, R26. Acceptance AC33.

**Files.**

- [ ] Own Agents, Evidence, Control under the planned roots. Record actual created paths and schema/API/migration receipts.

Schema and API. Add a Bug Agent principal kind, a finding record (revision, environment, routine version, reproduction, logs, artifact references, severity, confidence), and finding-deduplication keys.

Migration and compatibility. Reuse U24's created-agent environment and R11's task/evidence/review path for a Bug Agent's proposed repair; no new publication or merge authority is added.

Foundation proofs. None.

**Build.**

- [ ] `U25.B01` Implement the Bug Agent's read-only default grant, its cited and deduplicated finding record, and a human-approved bounded repair task that routes through the ordinary R11 evidence and independent-review path with the Bug Agent excluded as approver and reviewer.

**You see.**

- [ ] A Bug Agent reproduces a seeded defect, posts one cited finding, a repeat of the same defect updates that finding instead of duplicating it, and a human-approved repair task closes through the ordinary independent-review path. Save `evidence/U25/outcome.json`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test citation completeness, deduplication matching, denial of administration/production/merge credentials, and approver/reviewer exclusion. Save `evidence/U25/unit.log` and security findings.
- [ ] For each task save `red.log` and `green.log`, run guard/evidence negatives and mechanical contract/import drift checks. Record exact subjects, not only exit status.
- [ ] Maintain the feature map and run affected skill instructions at this head. Save `evidence/U25/feature-map.json`; stale/missing scenarios block.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head is an upstream format annotation only. Run the following ten scenarios through the project runner with approved independent review; no literal model is required.

- [ ] Lane 1. Regression lane against trunk. Reproduce a seeded fixture defect at parent and head. Save `evidence/U25/lane-1/scenario.png` and its transcript/assertions. Pass when head posts one complete cited finding and trunk's absence of the role is recorded honestly.
- [ ] Lane 2. Reproduce the same defect a second time. Save `evidence/U25/lane-2/scenario.png` and its transcript/assertions. Pass when the existing finding updates instead of a duplicate being created.
- [ ] Lane 3. Attempt to grant the Bug Agent an administration, production, merge, or broad GitHub credential. Save `evidence/U25/lane-3/scenario.png` and its transcript/assertions. Pass when the grant is rejected.
- [ ] Lane 4. Attempt to have the Bug Agent approve its own proposed repair task. Save `evidence/U25/lane-4/scenario.png` and its transcript/assertions. Pass when self-approval is rejected.
- [ ] Lane 5. Attempt to have the Bug Agent serve as the repair task's independent reviewer. Save `evidence/U25/lane-5/scenario.png` and its transcript/assertions. Pass when it is rejected as a reviewer.
- [ ] Lane 6. Approve a bounded repair task from a real finding. Save `evidence/U25/lane-6/scenario.png` and its transcript/assertions. Pass when it produces the same evidence manifest shape R11 already requires.
- [ ] Lane 7. Omit one required citation field from a finding. Save `evidence/U25/lane-7/scenario.png` and its transcript/assertions. Pass when the finding is rejected as incomplete.
- [ ] Lane 8. Have the Bug Agent attempt a write outside its read-only default. Save `evidence/U25/lane-8/scenario.png` and its transcript/assertions. Pass when the write is denied.
- [ ] Lane 9. Attempt to suppress or delete a posted finding. Save `evidence/U25/lane-9/scenario.png` and its transcript/assertions. Pass when the attempt is denied and the finding remains visible.
- [ ] Lane 10. Inspect two findings for unrelated defects on the same project. Save `evidence/U25/lane-10/scenario.png` and its transcript/assertions. Pass when both remain distinct and neither is merged incorrectly.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time from reproduction to a posted finding.
- [ ] Probe. Run `agora project verify --scenario perf --unit U25 --json` in five interleaved parent/head batches with equal fixtures and declared instrumentation.
- [ ] Baseline. Measure parent first. If behavior is absent, report absence and compare existing host cost separately from new absolute budgets.
- [ ] Rule. Equivalent behavior fails above 10% p95 regression. Fail finding latency above the R17 read-only answer wall limit.

**Review gate.** The operator reviews before merge.

- [ ] Independently inspect task-scoped screenshot/transcript proof, red/green cause and security findings before that task closes.
- [ ] Inspect all milestone scenarios, relevant screenshot and 30-60 second video, performance samples and feature-map freshness before the unit closes.
- [ ] The operator records an exact-head verdict. Independent reviewers cannot be the implementing owner. Missing tools/proof block, regardless of model name.

**Merge.**

- [ ] For a task, require only its task gate and completed external prerequisites, never its own milestone.
- [ ] For the milestone, require every task plus all integration lanes and security/performance proofs at a compatible reviewed head.
- [ ] Refresh parent, rerun impacted evidence and hand off to the operator. No worker merge authority is granted.

## Close the program

- [ ] Close S1 only after every S1 task/milestone and all S1 acceptance rows pass. Keep later-stage capabilities disabled until separately authorized and qualified.
- [ ] Audit contracts, dependency closure, red/green and guard evidence, feature-map maintenance, independent review and retained resources.
- [ ] Deliver exact heads, stage report, unavailable capabilities and operator gates. No untested result is called verified.

## Appendix A. Prototype evidence

No application prototype, native app, provider call, renderer benchmark or foundation gate ran in this design assignment. No competing framework prototype is planned. Both independent reviews informed the selected implementation and corrected boundaries. U01a-U01d produce the first runtime evidence after separate authorization.

## Appendix B. Alternatives considered

The [research basis](research-basis.md) compares the modular monolith with chat-host sidecar and distributed actors, and records the independent React/Vue/Svelte/Solid/HTMX/Lit/SwiftUI and Node/Bun/Go/Rust/Elixir/Fastify comparisons. React/TypeScript/Node remain selected; popularity is not evidence. C is not a strong fit for this browser-first I/O and authority workload. Go or Rust may replace a worker or measured hot component behind the neutral protocol.

## Appendix C. Risks and gate authority

The project-owned `node scripts/verify-design.mjs` checks design semantics, including combined milestone/task cycles and one-to-one Outcome/Build ownership. It cannot prove runtime behavior. U01a-U01d must create and pass `agora project verify --scenario foundation-ready --json` before features or write-enabled agents. The upstream format checker is retained unchanged and informational; its model literal neither authorizes a provider nor blocks an otherwise qualified independent reviewer.

Trusted CI/reporting, provider approval, real isolation, native token boundaries, E2B conformance and Apple CI each need their named live denials. A missing tool or unsupported target remains unavailable. The two-human workflow can wait indefinitely for the other human; that is visible and never a self-approval fallback. Knowledge/observer accuracy and performance budgets are unmeasured. No benchmark superiority is claimed for the selected renderer or language.

## Appendix D. Reading and dependency reference

Read [technical specification](technical-spec.md), [tasks](task-breakdown.md), [research basis](research-basis.md), and [decisions](decisions.tsv). Use [architect](../.agents/skills/architect/SKILL.md), [technical-writing](../.agents/skills/technical-writing/SKILL.md), [unslop](../.agents/skills/unslop/SKILL.md), [show-me-your-work](../.agents/skills/show-me-your-work/SKILL.md), [tdd](../.agents/skills/tdd/SKILL.md), [test behavior](../.agents/skills/principle-test-behavior-not-implementation/SKILL.md), [prove behavior](../.agents/skills/principle-prove-it-works/SKILL.md), [create verification](../.agents/skills/create-verification-skill/SKILL.md), and [maintain verification](../.agents/skills/maintain-verification-skill/SKILL.md). R22's mandatory test-first policy overrides the vendored TDD fallback. Preserve all upstream bytes.

The following graph is authoritative for external milestone dependencies. Task-local dependencies and owned Build boxes appear in the backlog. Each unit is a milestone over independently gated tasks, not a permission to land an oversized change.

| Unit | External unit gates | Stage |
| --- | --- | --- |
| U01a | None | S1 |
| U01b | U01a | S1 |
| U01c | U01b | S1 |
| U01d | U01b | S1 |
| U20 | U01c, U01d | S1 |
| U21 | U20 | S1 |
| U22 | U20 | S1 |
| U23 | U20, U21, U22 | S1 |
| U02 | U01c, U01d, U20, U21, U22 | S1 |
| U03 | U02, U23 | S1 |
| U04 | U03 | S1 |
| U05 | U04 | S1 |
| U06 | U05 | S1 |
| U07 | U06 | S1 |
| U08 | U07 | S1 |
| U09 | U08 | S1 |
| U10 | U09 | S2 |
| U11 | U10 | S2 |
| U12 | U11 | S2 |
| U13 | U09 | S2 |
| U14 | U12, U13 | S2 |
| U24 | U06, U11, U13, U14 | S2 |
| U25 | U24 | S3 |
| U18 | U09 | S2 |
| U19 | U09 | S2 |
| U15 | U13 | S3 |
| U16 | U09, U10, U12 | S3 |
| U17 | U09 | S3 |

### Establish reproducible development and restore (U01)

This historical anchor is retained for append-only decision citations. The former U01 is superseded by U01a, U01b, U01c and U01d; it is not a schedulable milestone.

U13 depends only on S1, U15 on U13, and U18/U19 on S1. Cloud execution is not a prerequisite of memory, external agent compatibility or the native client. U10 may close at an honest onboarding checkpoint; downstream environment/main-agent qualification gates full project activation, not U10 task completion.
