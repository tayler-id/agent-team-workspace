# Agora task breakdown

These are unstarted durable backlog candidates. Keep slugs unchanged. A task closes after its own Build outcome, acceptance, task-scoped proof and independent review pass. It does not wait for its containing milestone's later tasks or integration verdict. Unit milestones close separately after all tasks and integration lanes pass, as defined in R22.

[Specification](technical-spec.md) owns behavior. [Plan](implementation-plan.md) owns stable modules, schema/API/migration duties and integration scenarios. Every Build box has exactly one task whose Outcome is the same text. Each task also performs the unit's applicable schema/migration work and per-change red-green, guard, feature-map, contract/import and evidence checks. Scenario numbers below are task-local probes of the named behavior; when an integration lane needs later components, use its public fixture now and retain the full integration run for milestone closure. Never claim a future lane already passed.

Prerequisites name earlier task closures. Unit gates name completed external milestones, never the task's own milestone. The combined graph is checked for cycles. Later stages remain outside the S1 dispatch queue. Nothing here authorizes application implementation in this design task.

## S1 initial queue

### agora-s1-bootstrap-repository

- Title: Create the test-first repository.
- Stage: S1.
- Prerequisites: None.
- Unit gates: None.
- Close gate: task.
- Build box: U01a.B01.
- Outcome: Create the repository/package boundaries, strict compiler, lint/type/docs gates, and minimal public health/policy fixture with a behavioral red-before-green test.
- Acceptance: Clean install, literal red assertion at parent, green head, repeatable migration and real PostgreSQL rollback/race/RLS tests pass. No product feature or model call exists.
- Verification evidence: Task-local probes for U01a lanes 1, 2, 3; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U01a/agora-s1-bootstrap-repository/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U01a, establish repository contracts and test-first gates.
- Specification requirements: R03, R05, R07, R12, R21, R22. Release criteria AC00, AC14.

### agora-s1-publish-portable-contracts

- Title: Publish portable wire contracts.
- Stage: S1.
- Prerequisites: `agora-s1-bootstrap-repository`.
- Unit gates: None.
- Close gate: task.
- Build box: U01a.B02.
- Outcome: Author OpenAPI and JSON Schema sources, generate TypeScript/Swift consumers and canonical fixtures, and enforce regeneration drift and protocol compatibility.
- Acceptance: Both consumers agree on values, acceptance, signatures and unknown-state refusal; generated drift or unconstrained conversion fails.
- Verification evidence: Task-local probes for U01a lanes 4, 5, 6; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U01a/agora-s1-publish-portable-contracts/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U01a, establish repository contracts and test-first gates.
- Specification requirements: R03, R05, R07, R12, R21, R22. Release criteria AC00, AC14.

### agora-s1-isolate-client-core

- Title: Isolate client synchronization and imports.
- Stage: S1.
- Prerequisites: `agora-s1-publish-portable-contracts`.
- Unit gates: None.
- Close gate: task.
- Build box: U01a.B03.
- Outcome: Implement framework-free client snapshots, dedupe/replay/receipts and mechanical import/export boundaries with forbidden-import compile negatives.
- Acceptance: Replay vectors converge without DOM; React, Hono, Drizzle, provider and transport leakage rejects, including type-only and re-export paths.
- Verification evidence: Task-local probes for U01a lanes 7, 8; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U01a/agora-s1-isolate-client-core/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U01a, establish repository contracts and test-first gates.
- Specification requirements: R03, R05, R07, R12, R21, R22. Release criteria AC00, AC14.

### agora-s1-enforce-test-first

- Title: Make test-first and guard proof executable.
- Stage: S1.
- Prerequisites: `agora-s1-isolate-client-core`.
- Unit gates: None.
- Close gate: task.
- Build box: U01a.B04.
- Outcome: Create task-level red-green, guard-negative, applicability and semantic prerequisite checks plus the foundation report protocol.
- Acceptance: Disabling a guard makes its assertion fail; malformed red evidence, missing negative fixture and premature feature readiness deny.
- Verification evidence: Task-local probes for U01a lanes 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U01a/agora-s1-enforce-test-first/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U01a, establish repository contracts and test-first gates.
- Specification requirements: R03, R05, R07, R12, R21, R22. Release criteria AC00, AC14.

### agora-s1-isolate-development

- Title: Provide real project-owned verification controls.
- Stage: S1.
- Prerequisites: None.
- Unit gates: U01a.
- Close gate: task.
- Build box: U01b.B01.
- Outcome: Implement Agora and Python fixture doctor/scenarios/start/verify/evidence/stop, isolated instances, project-owned lane runner and a live-validated verify-agora skill with feature-map drift enforcement.
- Acceptance: Two instances have separate ports/database/object/process namespaces; unknown scenarios and foreign cleanup fail; driving the skill literally proves behavior and preserves artifacts.
- Verification evidence: Task-local probes for U01b lanes 1, 2, 3, 4; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U01b/agora-s1-isolate-development/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U01b, qualify isolated verification and trusted evidence.
- Specification requirements: R03, R11, R12, R16, R21, R22. Release criteria AC00, AC08.

### agora-s1-validate-project-evidence

- Title: Reject false project evidence before model writes.
- Stage: S1.
- Prerequisites: `agora-s1-isolate-development`.
- Unit gates: U01a.
- Close gate: task.
- Build box: U01b.B02.
- Outcome: Implement the general evidence validator and deterministic scripted recorder with exact-head/config/signature/artifact checks and deliberate validator-weakening negatives.
- Acceptance: Wrong head/base/config, stale producer, mutation, missing proof/scenario and exit mismatch reject. Disabling validation cannot make a required gate pass.
- Verification evidence: Task-local probes for U01b lanes 5, 6, 7; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U01b/agora-s1-validate-project-evidence/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U01b, qualify isolated verification and trusted evidence.
- Specification requirements: R03, R11, R12, R16, R21, R22. Release criteria AC00, AC08.

### agora-s1-qualify-trusted-checks

- Title: Protect Agora and fixture verification.
- Stage: S1.
- Prerequisites: `agora-s1-validate-project-evidence`.
- Unit gates: U01a.
- Close gate: task.
- Build box: U01b.B03.
- Outcome: Install and read back trusted CI and project-dedicated checks-only reporting identities for Agora and the fixture, including red-green, guards, contract/import drift and evidence gates.
- Acceptance: Candidate fake reports, wrong App/workflow, stale checks and failing dependencies cannot pass; candidate processes cannot read reporter credentials.
- Verification evidence: Task-local probes for U01b lanes 8, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U01b/agora-s1-qualify-trusted-checks/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U01b, qualify isolated verification and trusted evidence.
- Specification requirements: R03, R11, R12, R16, R21, R22. Release criteria AC00, AC08.

### agora-s1-prove-backup-restore

- Title: Prove backup and separate-host recovery.
- Stage: S1.
- Prerequisites: None.
- Unit gates: U01b.
- Close gate: task.
- Build box: U01c.B01.
- Outcome: Implement encrypted base/WAL backup, separate-host restore, independent key recovery, epoch rotation, integrity proof and an operator runbook.
- Acceptance: A timed VM-loss drill meets RPO 15 minutes/RTO four hours, verifies rows/artifacts and rejects old authority without relying on the lost host.
- Verification evidence: Task-local probes for U01c lanes 1, 2, 3, 4, 5, 6, 7, 8, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U01c/agora-s1-prove-backup-restore/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U01c, prove independently recoverable backup and restore.
- Specification requirements: R12, R15, R17, R22. Release criteria AC00, AC11.

### agora-s1-qualify-react-client

- Title: Qualify React rendering and accessibility.
- Stage: S1.
- Prerequisites: None.
- Unit gates: U01b.
- Close gate: task.
- Build box: U01d.B01.
- Outcome: Build the selected React production fixture over Client core and prove virtualization, reconnect, accessibility, update isolation, bundle, memory, latency and user comprehension.
- Acceptance: All R18/R23 budgets and keyboard/VoiceOver scripts pass, no required defect remains, and two humans identify owner/placement/authority/missing proof/next action.
- Verification evidence: Task-local probes for U01d lanes 1, 2, 3, 4, 5, 6, 7, 8, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U01d/agora-s1-qualify-react-client/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U01d, qualify the selected react production client.
- Specification requirements: R02, R18, R22, R23. Release criteria AC00, AC13.

### agora-s1-invite-identities

- Title: Implement verified invitation-only identity.
- Stage: S1.
- Prerequisites: None.
- Unit gates: U01c, U01d.
- Close gate: task.
- Build box: U02.B01.
- Outcome: Configure Better Auth magic links, strict verified-email invitation acceptance, custom closed roles, SMTP delivery, secure cookies, CSRF/Origin checks, and rate limits.
- Acceptance: Real email acceptance succeeds once; expired, replayed, wrong-email, and public-signup attempts fail.
- Verification evidence: Task-local probes for U02 lanes 1, 2, 3, 4, 5; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U02/agora-s1-invite-identities/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U02, invite developers into scoped project rooms.
- Specification requirements: R01, R02, R04, R05, R14, R21, R22, R24. Release criteria AC01, AC02, AC15.

### agora-s1-scope-project-rooms

- Title: Register projects with explicit room membership.
- Stage: S1.
- Prerequisites: `agora-s1-invite-identities`.
- Unit gates: U01c, U01d.
- Close gate: task.
- Build box: U02.B02.
- Outcome: Build project registration and explicit project grants. Create one room and inactive main-agent identity per project. Gate coding readiness on repository/environment checks rather than creating a repository.
- Acceptance: Two projects have separate room/main-agent IDs; workspace membership alone grants no project content; last owner cannot disappear.
- Verification evidence: Task-local probes for U02 lanes 6, 7, 8; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U02/agora-s1-scope-project-rooms/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U02, invite developers into scoped project rooms.
- Specification requirements: R01, R02, R04, R05, R14, R21, R22, R24. Release criteria AC01, AC02, AC15.

### agora-s1-revoke-live-access

- Title: Enforce roles and live revocation.
- Stage: S1.
- Prerequisites: `agora-s1-scope-project-rooms`.
- Unit gates: U01c, U01d.
- Close gate: task.
- Build box: U02.B03.
- Outcome: Build navigation, invitation acceptance, room access, and revocation behavior. Disable direct organization-management bypass routes.
- Acceptance: Observer writes, bypass auth routes, stale subscriptions, and revoked-worker grants deny through the real API/UI.
- Verification evidence: Task-local probes for U02 lanes 5, 6, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U02/agora-s1-revoke-live-access/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U02, invite developers into scoped project rooms.
- Specification requirements: R01, R02, R04, R05, R14, R21, R22, R24. Release criteria AC01, AC02, AC15.

### agora-s1-authorize-native-client

- Title: Authorize native human clients.
- Stage: S1.
- Prerequisites: `agora-s1-revoke-live-access`.
- Unit gates: U01c, U01d.
- Close gate: task.
- Build box: U02.B04.
- Outcome: Implement native client-device OAuth authorization, scoped token rotation/revocation and exact-action browser step-up, separate from worker enrollment.
- Acceptance: The Swift fixture passes LV15; worker/native token confusion, wrong audience and refreshed-but-old authentication reject.
- Verification evidence: Task-local probes for U02 lanes 5, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U02/agora-s1-authorize-native-client/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U02, invite developers into scoped project rooms.
- Specification requirements: R01, R02, R04, R05, R14, R21, R22, R24. Release criteria AC01, AC02, AC15.

### agora-s1-control-registered-project

- Title: Control registered project lifecycle.
- Stage: S1.
- Prerequisites: `agora-s1-authorize-native-client`.
- Unit gates: U01c, U01d.
- Close gate: task.
- Build box: U02.B05.
- Outcome: Implement registered-project pause/resume/archive before execution, with membership/policy revalidation and readable retained history.
- Acceptance: Pause/archive refuse new claims, resume revalidates prerequisites, and archive never deletes a remote repository.
- Verification evidence: Task-local probes for U02 lanes 7, 8, 9; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U02/agora-s1-control-registered-project/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U02, invite developers into scoped project rooms.
- Specification requirements: R01, R02, R04, R05, R14, R21, R22, R24. Release criteria AC01, AC02, AC15.

### agora-s1-persist-conversation

- Title: Persist message revisions and thread state.
- Stage: S1.
- Prerequisites: None.
- Unit gates: U02.
- Close gate: task.
- Build box: U03.B01.
- Outcome: Persist messages, thread replies, edits/tombstones, mentions, and unread cursors with one transaction per mutation and optimistic pending UI.
- Acceptance: Two humans share one ordered thread; edits pin revisions; duplicate client IDs return one record and matching receipt.
- Verification evidence: Task-local probes for U03 lanes 1, 2, 3; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U03/agora-s1-persist-conversation/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U03, deliver durable conversation and ordered reconnection.
- Specification requirements: R02, R05, R07, R18, R13, R21. Release criteria AC02, AC03.

### agora-s1-resume-realtime

- Title: Deliver cursor-resumable ordered events.
- Stage: S1.
- Prerequisites: `agora-s1-persist-conversation`.
- Unit gates: U02.
- Close gate: task.
- Build box: U03.B02.
- Outcome: Implement snapshot plus ordered committed event pump, replay/gap handling, 1-MiB socket bounds, receipt dedupe, and membership filtering on every delivery.
- Acceptance: Commit-before-broadcast restart, missing cursor range, slow consumers, and socket gaps converge without loss or duplicates.
- Verification evidence: Task-local probes for U03 lanes 4, 5, 6, 7; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U03/agora-s1-resume-realtime/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U03, deliver durable conversation and ordered reconnection.
- Specification requirements: R02, R05, R07, R18, R13, R21. Release criteria AC02, AC03.

### agora-s1-search-safe-content

- Title: Ship scoped search and safe attachments.
- Stage: S1.
- Prerequisites: `agora-s1-resume-realtime`.
- Unit gates: U02.
- Close gate: task.
- Build box: U03.B03.
- Outcome: Implement scoped search and bounded attachment quarantine/upload. Add safe Markdown, no external image autoload, and accessible thread panels.
- Acceptance: Private terms never leak through results/counts; oversized or active content stays quarantined; keyboard and both viewports pass.
- Verification evidence: Task-local probes for U03 lanes 8, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U03/agora-s1-search-safe-content/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U03, deliver durable conversation and ordered reconnection.
- Specification requirements: R02, R05, R07, R18, R13, R21. Release criteria AC02, AC03.

### agora-s1-record-human-decisions

- Title: Record exact human decisions.
- Stage: S1.
- Prerequisites: `agora-s1-search-safe-content`.
- Unit gates: U02.
- Close gate: task.
- Build box: U03.B04.
- Outcome: Implement human decision creation from an immutable message revision, exact attributed text, supersession and cited read-back.
- Acceptance: A user creates and supersedes a decision through UI/API; U04 can cite its real revision without an internal fixture bypass.
- Verification evidence: Task-local probes for U03 lanes 1, 4, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U03/agora-s1-record-human-decisions/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U03, deliver durable conversation and ordered reconnection.
- Specification requirements: R02, R05, R07, R18, R13, R21. Release criteria AC02, AC03.

### agora-s1-compile-authorized-context

- Title: Compile explicit cited context.
- Stage: S1.
- Prerequisites: None.
- Unit gates: U03.
- Close gate: task.
- Build box: U04.B01.
- Outcome: Compile explicit thread and selected-record context with audience intersection, trust labels, source revisions, token limits, and visible omissions.
- Acceptance: Only requester/agent/destination-intersection records enter a bounded bundle; omitted IDs and pinned revisions remain visible.
- Verification evidence: Task-local probes for U04 lanes 1, 2, 3, 4; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U04/agora-s1-compile-authorized-context/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U04, answer questions with visible read-only agent sessions.
- Specification requirements: R02, R04, R05, R06, R16, R21, R22, R24. Release criteria AC04, AC10.

### agora-s1-run-readonly-center

- Title: Connect the bounded read-only center agent.
- Stage: S1.
- Prerequisites: `agora-s1-compile-authorized-context`.
- Unit gates: U03.
- Close gate: task.
- Build box: U04.B02.
- Outcome: Implement provider-neutral ModelAdapter with two approved real provider conformance targets, fake external-process events, exact routes, data approval, cost reservations and read-only tools.
- Acceptance: Each of two approved real provider adapters answers through the neutral contract; role/tool injection denies; timeout never blindly duplicates spend; budgets reserve before calls.
- Verification evidence: Task-local probes for U04 lanes 1, 5, 9; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U04/agora-s1-run-readonly-center/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U04, answer questions with visible read-only agent sessions.
- Specification requirements: R02, R04, R05, R06, R16, R21, R22, R24. Release criteria AC04, AC10.

### agora-s1-render-agent-session

- Title: Render typed sessions and safe citations.
- Stage: S1.
- Prerequisites: `agora-s1-run-readonly-center`.
- Unit gates: U03.
- Close gate: task.
- Build box: U04.B03.
- Outcome: Render agent status/action/question/result/error cards with citations, initial acknowledgment deadline, stop, stale liveness, and plain-text external links.
- Acceptance: Cards expose timing, stop, stale/error state and citation revision; generated links cannot execute or exfiltrate through rendering.
- Verification evidence: Task-local probes for U04 lanes 6, 7, 8, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U04/agora-s1-render-agent-session/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U04, answer questions with visible read-only agent sessions.
- Specification requirements: R02, R04, R05, R06, R16, R21, R22, R24. Release criteria AC04, AC10.

### agora-s1-model-task-ownership

- Title: Implement task and run transition contracts.
- Stage: S1.
- Prerequisites: None.
- Unit gates: U04.
- Close gate: task.
- Build box: U05.B01.
- Outcome: Implement task ownership/state and proposal/launch UI with frozen intent, acceptance, target, placement, payer, scope and limits; chat text cannot launch.
- Acceptance: One human owns each task; cyclic/cross-project dependencies reject; mentions create proposals without execution.
- Verification evidence: Task-local probes for U05 lanes 1, 2, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U05/agora-s1-model-task-ownership/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U05, create owned tasks with fenced runs and approvals.
- Specification requirements: R05, R06, R07, R14, R17, R21, R22. Release criteria AC05, AC06, AC11.

### agora-s1-fence-run-leases

- Title: Implement atomic claims and bounded recovery.
- Stage: S1.
- Prerequisites: `agora-s1-model-task-ownership`.
- Unit gates: U04.
- Close gate: task.
- Build box: U05.B02.
- Outcome: Implement atomic claim, leases/fences, scanner expiry, cancellation and fresh retry with deterministic workers and real PostgreSQL races.
- Acceptance: Competing workers get one winner; expired/cancelled fence cannot complete; fresh retry retains history under new IDs.
- Verification evidence: Task-local probes for U05 lanes 3, 4, 7, 8; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U05/agora-s1-fence-run-leases/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U05, create owned tasks with fenced runs and approvals.
- Specification requirements: R05, R06, R07, R14, R17, R21, R22. Release criteria AC05, AC06, AC11.

### agora-s1-bind-approval-budgets

- Title: Bind approvals and budget reservations to exact effects.
- Stage: S1.
- Prerequisites: `agora-s1-fence-run-leases`.
- Unit gates: U04.
- Close gate: task.
- Build box: U05.B03.
- Outcome: Implement exact-action approvals, one-use effect receipts, transactional budget reservations and deadline/current-state projections.
- Acceptance: Role/head/policy races invalidate authority; consumed approval cannot replay; concurrent reservations stay below caps.
- Verification evidence: Task-local probes for U05 lanes 5, 6, 9; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U05/agora-s1-bind-approval-budgets/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U05, create owned tasks with fenced runs and approvals.
- Specification requirements: R05, R06, R07, R14, R17, R21, R22. Release criteria AC05, AC06, AC11.

### agora-s1-enroll-outbound-worker

- Title: Enroll owner-bound outbound workers.
- Stage: S1.
- Prerequisites: None.
- Unit gates: U05.
- Close gate: task.
- Build box: U06.B01.
- Outcome: Ship a standalone signed worker with embedded runtime and generated protocol client, then implement owner-bound enrollment, rotating tokens, outbound transport and doctor without center-internal imports.
- Acceptance: Real device enrollment and registration work without inbound ports; wrong owner/repository, token replay, and incompatible capability fail. Clean Linux/macOS machines without Node install/run/uninstall successfully; doctor identifies Docker prerequisites and unsupported native targets.
- Verification evidence: Task-local probes for U06 lanes 1, 2, 3, 5; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U06/agora-s1-enroll-outbound-worker/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U06, connect owner-bound workers and prepare clean worktrees.
- Specification requirements: R04, R06, R07, R08, R15, R21, R24. Release criteria AC05, AC06, AC07, AC14.

### agora-s1-allocate-clean-worktrees

- Title: Allocate worktrees outside developer checkouts.
- Stage: S1.
- Prerequisites: `agora-s1-enroll-outbound-worker`.
- Unit gates: U05.
- Close gate: task.
- Build box: U06.B02.
- Outcome: Create private bare mirrors and clean task worktrees at the requested remote SHA, validate paths/remotes, sanitize Git environment/hooks, allocate process/fixture/port namespaces, and maintain run owner locks.
- Acceptance: Dirty user checkout remains byte-identical; mirror task branches and namespaces are separate; unsafe remotes/path escapes fail.
- Verification evidence: Task-local probes for U06 lanes 6, 7, 8; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U06/agora-s1-allocate-clean-worktrees/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U06, connect owner-bound workers and prepare clean worktrees.
- Specification requirements: R04, R06, R07, R08, R15, R21, R24. Release criteria AC05, AC06, AC07, AC14.

### agora-s1-recover-worker-disconnect

- Title: Implement worker spool and safe local cleanup.
- Stage: S1.
- Prerequisites: `agora-s1-allocate-clean-worktrees`.
- Unit gates: U05.
- Close gate: task.
- Build box: U06.B03.
- Outcome: Implement heartbeat/spool replay, disconnect stop deadlines, owner-only manual prepare, and non-destructive retained-work recovery.
- Acceptance: Offline launch never falls back; renewal loss stops processes by deadline; old data cannot publish; dirty work remains retained.
- Verification evidence: Task-local probes for U06 lanes 4, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U06/agora-s1-recover-worker-disconnect/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U06, connect owner-bound workers and prepare clean worktrees.
- Specification requirements: R04, R06, R07, R08, R15, R21, R24. Release criteria AC05, AC06, AC07, AC14.

### agora-s1-isolate-local-environment

- Title: Enforce the restricted local environment.
- Stage: S1.
- Prerequisites: None.
- Unit gates: U06.
- Close gate: task.
- Build box: U07.B01.
- Outcome: Implement the restricted Dev Container profile and rootless Linux execution adapter for Linux/macOS hosts, with no host hooks, home/socket/Git mounts, unsafe labels, or default egress.
- Acceptance: Effective Dev Container fields including image labels reject host execution/privilege; credential/socket/metadata/egress probes deny.
- Verification evidence: Task-local probes for U07 lanes 2, 3, 4; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U07/agora-s1-isolate-local-environment/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U07, execute bounded local work and collect behavior evidence.
- Specification requirements: R08, R09, R11, R12, R16, R21, R22, R24. Release criteria AC07, AC08, AC10.

### agora-s1-qualify-scripted-worker

- Title: Qualify isolated execution before model writes.
- Stage: S1.
- Prerequisites: `agora-s1-isolate-local-environment`.
- Unit gates: U06.
- Close gate: task.
- Build box: U07.B02.
- Outcome: Run a deterministic scripted canary through the real worker, Git broker, project CLI and existing evidence validator before enabling the model tool loop.
- Acceptance: Host/credential/egress isolation, exact-head recorder, cancellation, unavailable outcomes and validator negatives pass with no model call.
- Verification evidence: Task-local probes for U07 lanes 2, 3, 4, 5, 6, 7, 8, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U07/agora-s1-qualify-scripted-worker/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U07, execute bounded local work and collect behavior evidence.
- Specification requirements: R08, R09, R11, R12, R16, R21, R22, R24. Release criteria AC07, AC08, AC10.

### agora-s1-execute-headless-task

- Title: Run bounded headless agent tasks.
- Stage: S1.
- Prerequisites: `agora-s1-qualify-scripted-worker`.
- Unit gates: U06.
- Close gate: task.
- Build box: U07.B03.
- Outcome: Enable the bounded headless tool loop only after the scripted-worker gate, using the qualified neutral provider adapters and external credential brokers.
- Acceptance: Real model fixes fixture behavior only through fixed tools; provider key stays host-side; cancellation terminates the owned process group.
- Verification evidence: Task-local probes for U07 lanes 1, 2, 8; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U07/agora-s1-execute-headless-task/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U07, execute bounded local work and collect behavior evidence.
- Specification requirements: R08, R09, R11, R12, R16, R21, R22, R24. Release criteria AC07, AC08, AC10.

### agora-s1-gate-change-publication

- Title: Gate overlap, risk, size, and exact head.
- Stage: S1.
- Prerequisites: None.
- Unit gates: U07.
- Close gate: task.
- Build box: U08.B01.
- Outcome: Implement changed-path overlap detection, current-base checks, size rationale/exception, risk floors, and stale-evidence invalidation.
- Acceptance: Overlap blocks until review; stale base/head/policy requires fresh proof; hard risk floors cannot be lowered by a model.
- Verification evidence: Task-local probes for U08 lanes 4, 5, 6; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U08/agora-s1-gate-change-publication/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U08, publish approved drafts and enforce independent review.
- Specification requirements: R07, R11, R12, R14, R15. Release criteria AC09.

### agora-s1-publish-human-approved-draft

- Title: Publish one approved draft with owner credentials.
- Stage: S1.
- Prerequisites: `agora-s1-gate-change-publication`.
- Unit gates: U07.
- Close gate: task.
- Build box: U08.B02.
- Outcome: Add non-author exact-head publication approval and distinct local credential-owner confirmation. Host Git broker pushes only the task branch and opens only a draft.
- Acceptance: Non-author approval and owner credential confirmation precede any push; duplicate/uncertain results reconcile to one exact draft.
- Verification evidence: Task-local probes for U08 lanes 1, 2, 3, 7; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U08/agora-s1-publish-human-approved-draft/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U08, publish approved drafts and enforce independent review.
- Specification requirements: R07, R11, R12, R14, R15. Release criteria AC09.

### agora-s1-enforce-independent-review

- Title: Enforce trusted checks and human merge.
- Stage: S1.
- Prerequisites: `agora-s1-publish-human-approved-draft`.
- Unit gates: U07.
- Close gate: task.
- Build box: U08.B03.
- Outcome: Integrate the already qualified trusted checker with publication reconciliation, review UI, human-merge observation and post-merge smoke, separating prepublication proof from postpublication CI and fresh publication capabilities from released leases.
- Acceptance: Skipped/neutral/unavailable/wrong-head checks fail; author cannot satisfy independent review; task completes only after live merge and post-merge scenario.
- Verification evidence: Task-local probes for U08 lanes 8, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U08/agora-s1-enforce-independent-review/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U08, publish approved drafts and enforce independent review.
- Specification requirements: R07, R11, R12, R14, R15. Release criteria AC09.

### agora-s1-verify-two-person-story

- Title: Prove the real two-person release story.
- Stage: S1.
- Prerequisites: None.
- Unit gates: U08.
- Close gate: task.
- Build box: U09.B01.
- Outcome: Complete the platform feature map and all S1 live acceptance criteria with two real verified accounts on two machines, including uncoached authority comprehension and absent-reviewer waiting states.
- Acceptance: Two verified accounts on two distinct machines complete the full S1 flow with real provider, email, artifact storage, and approved GitHub fixture.
- Verification evidence: Task-local probes for U09 lanes 1, 2, 4, 8; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U09/agora-s1-verify-two-person-story/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U09, prove the first release across two accounts and machines.
- Specification requirements: R01, R12, R15, R16, R17, R18, R19, R22, R23. Release criteria AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10, AC11, AC12, AC13.

### agora-s1-verify-release-failures

- Title: Prove denial and recovery end to end.
- Stage: S1.
- Prerequisites: `agora-s1-verify-two-person-story`.
- Unit gates: U08.
- Close gate: task.
- Build box: U09.B02.
- Outcome: Run denial, crash, injection, exact-head, restore, cost, accessibility, and reference-load suites. Repair product gaps rather than documenting false passes.
- Acceptance: LV03, LV05, LV06, LV07, LV08, and LV10 pass with observed negative effects and no false successes.
- Verification evidence: Task-local probes for U09 lanes 3, 4, 5, 6, 7; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U09/agora-s1-verify-release-failures/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U09, prove the first release across two accounts and machines.
- Specification requirements: R01, R12, R15, R16, R17, R18, R19, R22, R23. Release criteria AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10, AC11, AC12, AC13.

### agora-s1-qualify-first-release

- Title: Qualify S1 operations, accessibility, and performance.
- Stage: S1.
- Prerequisites: `agora-s1-verify-release-failures`.
- Unit gates: U08.
- Close gate: task.
- Build box: U09.B03.
- Outcome: Create the S1 release runbook and evidence index with tested versions, residual trust limits, operator rollback, and explicit stage-two disabled controls.
- Acceptance: Every AC01-AC12 has retained live evidence; timed restore/budget drill and all R18 S1 budgets pass; later-stage controls remain disabled.
- Verification evidence: Task-local probes for U09 lanes 1, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U09/agora-s1-qualify-first-release/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U09, prove the first release across two accounts and machines.
- Specification requirements: R01, R12, R15, R16, R17, R18, R19, R22, R23. Release criteria AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10, AC11, AC12, AC13.

## S2 later-stage queue

### agora-s2-authorize-project-proposal

- Title: Authorize exact project and integration effects.
- Stage: S2 later-stage.
- Prerequisites: None.
- Unit gates: U09.
- Close gate: task.
- Build box: U10.B01.
- Outcome: Build the proposal/authorization UI and separately scoped GitHub admin and normal-operation grants with immutable account linking.
- Acceptance: Proposal freezes repository, members, image/policy, payer, and scope; absent/expired/wrong-installation authorization cannot write.
- Verification evidence: Task-local probes for U10 lanes 1, 2, 5, 6; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U10/agora-s2-authorize-project-proposal/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U10, provision a private project from a conversation.
- Specification requirements: R02, R04, R07, R10, R14, R15. Release criteria AC20.

### agora-s2-reconcile-provisioning

- Title: Provision and reconcile one private repository.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-authorize-project-proposal`.
- Unit gates: U09.
- Close gate: task.
- Build box: U10.B02.
- Outcome: Implement journaled repository creation, approved template seeding, ruleset/check read-back, named membership, and repair behavior after each external step.
- Acceptance: Crash-after-create resumes one marked resource; occupied foreign name blocks; required protection read-back gates onboarding.
- Verification evidence: Task-local probes for U10 lanes 3, 4, 8; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U10/agora-s2-reconcile-provisioning/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U10, provision a private project from a conversation.
- Specification requirements: R02, R04, R07, R10, R14, R15. Release criteria AC20.

### agora-s2-control-project-lifecycle

- Title: Control signed events and project pause/archive.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-reconcile-provisioning`.
- Unit gates: U09.
- Close gate: task.
- Build box: U10.B03.
- Outcome: Implement signed webhook ingestion, dedupe and asynchronous provisioning reconciliation; extend the existing S1 lifecycle to provisioned resources while activation waits for environment/main-agent prerequisites.
- Acceptance: Webhook signature/dedupe holds; pause stops leases; archive freezes writes without deleting repository; repair UI exposes facts.
- Verification evidence: Task-local probes for U10 lanes 7, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U10/agora-s2-control-project-lifecycle/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U10, provision a private project from a conversation.
- Specification requirements: R02, R04, R07, R10, R14, R15. Release criteria AC20.

### agora-s2-validate-build-definition

- Title: Validate effective declarative environment inputs.
- Stage: S2 later-stage.
- Prerequisites: None.
- Unit gates: U10.
- Close gate: task.
- Build box: U11.B01.
- Outcome: Implement safe Dev Container effective-config resolution, reviewed Feature/base-image pinning, separate builder VM, and exact build approval.
- Acceptance: No host hooks, unsafe metadata, unpinned dependencies, or escaping build context reach the builder.
- Verification evidence: Task-local probes for U11 lanes 3, 4, 5; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U11/agora-s2-validate-build-definition/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U11, build and qualify declarative project images.
- Specification requirements: R09, R10, R12, R16. Release criteria AC21.

### agora-s2-build-attested-oci

- Title: Build immutable OCI with provenance.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-validate-build-definition`.
- Unit gates: U10.
- Close gate: task.
- Build box: U11.B02.
- Outcome: Export immutable OCI images with SBOM, scans, provenance, command receipts, and bounded logs; key caches by all declared inputs.
- Acceptance: Separate builder emits digest, SBOM, scans, logs, and one reconciled operation; secret-bearing outputs cannot activate.
- Verification evidence: Task-local probes for U11 lanes 1, 6, 9; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U11/agora-s2-build-attested-oci/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U11, build and qualify declarative project images.
- Specification requirements: R09, R10, R12, R16. Release criteria AC21.

### agora-s2-qualify-cold-environment

- Title: Qualify cold environment readiness.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-build-attested-oci`.
- Unit gates: U10.
- Close gate: task.
- Build box: U11.B03.
- Outcome: Run lifecycle readiness plus project doctor/scenario against the cold image. Block activation on failed setup rather than continuing degraded.
- Acceptance: Cache deletion still permits repeatable behavior; failed setup blocks; changed lockfile/policy cannot reuse stale activation.
- Verification evidence: Task-local probes for U11 lanes 2, 7, 8, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U11/agora-s2-qualify-cold-environment/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U11, build and qualify declarative project images.
- Specification requirements: R09, R10, R12, R16. Release criteria AC21.

### agora-s2-adapt-e2b-runtime

- Title: Implement the first cloud provider adapter.
- Stage: S2 later-stage.
- Prerequisites: None.
- Unit gates: U11.
- Close gate: task.
- Build box: U12.B01.
- Outcome: Implement E2B OCI-to-template mapping and create/inspect/exec/export/destroy adapter with host-owned loop, outside-guest credentials, and account/region conformance.
- Acceptance: Selected account/region imports the approved image and creates one fresh per-attempt microVM with recorded identity.
- Verification evidence: Task-local probes for U12 lanes 1, 2, 6; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U12/agora-s2-adapt-e2b-runtime/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U12, execute and recover one isolated cloud attempt.
- Specification requirements: R06, R07, R09, R15, R16, R17. Release criteria AC21, AC24.

### agora-s2-enforce-cloud-boundary

- Title: Enforce cloud credentials, network, and resource limits.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-adapt-e2b-runtime`.
- Unit gates: U11.
- Close gate: task.
- Build box: U12.B02.
- Outcome: Enforce per-attempt microVM, default-deny external egress, forbidden-range allow-rule rejection, resource/TTL limits, and no public preview ports.
- Acceptance: Forbidden-range allow rules reject, application-level denied egress has no destination effect, and guest cannot read broker credentials.
- Verification evidence: Task-local probes for U12 lanes 3, 4, 5, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U12/agora-s2-enforce-cloud-boundary/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U12, execute and recover one isolated cloud attempt.
- Specification requirements: R06, R07, R09, R15, R16, R17. Release criteria AC21, AC24.

### agora-s2-reconcile-cloud-resources

- Title: Recover uncertain allocation and destruction.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-enforce-cloud-boundary`.
- Unit gates: U11.
- Close gate: task.
- Build box: U12.B03.
- Outcome: Implement allocation timeout reconciliation, provider TTL, cost reconciliation, quarantined exports, and exact-ID reaping with unknown cleanup visible.
- Acceptance: Allocation timeout never duplicates unknowable resources; lost runner expires; unavailable destroy stays unconfirmed until read-back and cost remains bounded.
- Verification evidence: Task-local probes for U12 lanes 7, 8, 9; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U12/agora-s2-reconcile-cloud-resources/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U12, execute and recover one isolated cloud attempt.
- Specification requirements: R06, R07, R09, R15, R16, R17. Release criteria AC21, AC24.

### agora-s2-activate-reviewed-knowledge

- Title: Activate scoped knowledge with human proof.
- Stage: S2 later-stage.
- Prerequisites: None.
- Unit gates: U09.
- Close gate: task.
- Build box: U13.B01.
- Outcome: Implement human knowledge activation with provenance, applicability, regression or non-executable rationale, and 90-day review deadline.
- Acceptance: Evidence-free claims stay proposed; authorized activation creates immutable version with regression/provenance and review date.
- Verification evidence: Task-local probes for U13 lanes 2, 3, 9; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U13/agora-s2-activate-reviewed-knowledge/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U13, activate persistent project agents and reviewed knowledge.
- Specification requirements: R04, R05, R10, R13, R14, R24. Release criteria AC22.

### agora-s2-invalidate-stale-knowledge

- Title: Invalidate conflicts and stale evidence.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-activate-reviewed-knowledge`.
- Unit gates: U09.
- Close gate: task.
- Build box: U13.B02.
- Outcome: Implement deterministic invalidation, conflict exclusion, ACL-before-FTS context compilation, and versioned repository import/export through ordinary contribution workflow.
- Acceptance: Dependency/source/date changes exclude affected records before retrieval; equal-scope conflict remains visible and unresolved until human decision.
- Verification evidence: Task-local probes for U13 lanes 4, 5, 6, 7, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U13/agora-s2-invalidate-stale-knowledge/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U13, activate persistent project agents and reviewed knowledge.
- Specification requirements: R04, R05, R10, R13, R14, R24. Release criteria AC22.

### agora-s2-activate-project-main

- Title: Activate persistent project-main sessions.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-invalidate-stale-knowledge`.
- Unit gates: U09.
- Close gate: task.
- Build box: U13.B03.
- Outcome: Activate project-main sessions that reconstruct approved context and propose task dependencies without launching or approving.
- Acceptance: Restart preserves identity/context through durable records; cited answers survive and no automatic launch or cross-project access occurs.
- Verification evidence: Task-local probes for U13 lanes 1, 8, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U13/agora-s2-activate-project-main/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U13, activate persistent project agents and reviewed knowledge.
- Specification requirements: R04, R05, R10, R13, R14, R24. Release criteria AC22.

### agora-s2-verify-placement-parity

- Title: Prove shared local/cloud run semantics.
- Stage: S2 later-stage.
- Prerequisites: None.
- Unit gates: U12, U13.
- Close gate: task.
- Build box: U14.B01.
- Outcome: Run the same fixture goal/base/policy/context on both placements and compare required assertions, manifest subjects, deny behavior, and approval gates.
- Acceptance: Both placements pass equivalent assertions, scope/authority gates, manifest subjects, and unavailable-check handling.
- Verification evidence: Task-local probes for U14 lanes 1, 3, 6, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U14/agora-s2-verify-placement-parity/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U14, prove local and cloud execution parity.
- Specification requirements: R08, R09, R11, R12, R15, R19. Release criteria AC23, AC24.

### agora-s2-publish-cloud-evidence

- Title: Publish cloud results through the external broker.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-verify-placement-parity`.
- Unit gates: U12, U13.
- Close gate: task.
- Build box: U14.B02.
- Outcome: Complete cloud patch-to-candidate broker, fresh independent verification, approved App publication, current-head read-back, and human review/merge.
- Acceptance: Fresh host candidate and independent verification bind exact patch; guest lacks write credential; escaping patch/human takeover blocks.
- Verification evidence: Task-local probes for U14 lanes 2, 7, 8; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U14/agora-s2-publish-cloud-evidence/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U14, prove local and cloud execution parity.
- Specification requirements: R08, R09, R11, R12, R15, R19. Release criteria AC23, AC24.

### agora-s2-verify-cloud-recovery

- Title: Prove fresh recovery and cancellation parity.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-publish-cloud-evidence`.
- Unit gates: U12, U13.
- Close gate: task.
- Build box: U14.B03.
- Outcome: Exercise cancel/loss/retry, overlapping changes, stale approvals, unavailable checks, and cold recovery without snapshots on both placements.
- Acceptance: Cancel, lease loss, retry, overlap, and snapshot-free recovery preserve one run contract and no stale publication.
- Verification evidence: Task-local probes for U14 lanes 4, 5, 7, 9; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U14/agora-s2-verify-cloud-recovery/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U14, prove local and cloud execution parity.
- Specification requirements: R08, R09, R11, R12, R15, R19. Release criteria AC23, AC24.

### agora-s2-contract-external-agent

- Title: Map external agent protocol.
- Stage: S2 later-stage.
- Prerequisites: None.
- Unit gates: U09.
- Close gate: task.
- Build box: U18.B01.
- Outcome: Implement the external process adapter with pinned distribution, capability negotiation and closed event mappings against deterministic contract fixtures.
- Acceptance: Malformed/duplicate/unknown events cannot produce success or new authority.
- Verification evidence: Task-local probes for U18 lanes 1, 2, 3; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U18/agora-s2-contract-external-agent/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U18, qualify a real external coding-agent adapter.
- Specification requirements: R08, R11, R12, R16, R21, R24. Release criteria AC25.

### agora-s2-isolate-external-agent

- Title: Enforce external agent isolation.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-contract-external-agent`.
- Unit gates: U09.
- Close gate: task.
- Build box: U18.B02.
- Outcome: Qualify the real CLI inside the execution boundary with outside-guest credential brokerage, bounded tools/network, cancellation and process cleanup.
- Acceptance: Host, credential, delegation, network and publication bypass tests deny; a missing safe authentication mode leaves the adapter unavailable.
- Verification evidence: Task-local probes for U18 lanes 4, 5, 6, 7; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U18/agora-s2-isolate-external-agent/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U18, qualify a real external coding-agent adapter.
- Specification requirements: R08, R11, R12, R16, R21, R24. Release criteria AC25.

### agora-s2-prove-external-agent-work

- Title: Prove one external-agent contribution.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-isolate-external-agent`.
- Unit gates: U09.
- Close gate: task.
- Build box: U18.B03.
- Outcome: Run a real bounded fixture change through the qualified CLI and the unchanged exact-head evidence/publication review path.
- Acceptance: LV25 passes with preserved proof, human approvals and independent CI; no model assertion substitutes for a check.
- Verification evidence: Task-local probes for U18 lanes 8, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U18/agora-s2-prove-external-agent-work/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U18, qualify a real external coding-agent adapter.
- Specification requirements: R08, R11, R12, R16, R21, R24. Release criteria AC25.

### agora-s2-build-native-session

- Title: Build native sign-in and synchronization.
- Stage: S2 later-stage.
- Prerequisites: None.
- Unit gates: U09.
- Close gate: task.
- Build box: U19.B01.
- Outcome: Implement SwiftUI navigation, system-browser device authorization, Keychain storage and a Swift replay/core using shared conformance vectors.
- Acceptance: Two-account login/revoke, token separation and snapshot/replay match browser semantics without sharing cookies or a JavaScript engine.
- Verification evidence: Task-local probes for U19 lanes 1, 2, 3, 4; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U19/agora-s2-build-native-session/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U19, deliver the native swift client without worker authority.
- Specification requirements: R02, R04, R07, R12, R18, R21, R24. Release criteria AC26.

### agora-s2-drive-native-workflow

- Title: Deliver native human workflows.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-build-native-session`.
- Unit gates: U09.
- Close gate: task.
- Build box: U19.B02.
- Outcome: Implement native conversation, evidence and subject-bound approval flows with keyboard/VoiceOver behavior and no host-execution bridge.
- Acceptance: LV26 user actions match browser authority; remote text cannot enroll a worker, launch host commands or merge.
- Verification evidence: Task-local probes for U19 lanes 5, 6, 7; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U19/agora-s2-drive-native-workflow/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U19, deliver the native swift client without worker authority.
- Specification requirements: R02, R04, R07, R12, R18, R21, R24. Release criteria AC26.

### agora-s2-qualify-native-release

- Title: Qualify native client packaging and proof.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-drive-native-workflow`.
- Unit gates: U09.
- Close gate: task.
- Build box: U19.B03.
- Outcome: Run actual native UI/build/packaging scenarios on pinned Apple CI, measure performance and isolate human signing/notarization from candidate processes.
- Acceptance: Native evidence names macOS/Xcode/hardware, unsupported Linux checks cannot pass it, and signed test builds pass two-account usability/revocation.
- Verification evidence: Task-local probes for U19 lanes 8, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U19/agora-s2-qualify-native-release/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U19, deliver the native swift client without worker authority.
- Specification requirements: R02, R04, R07, R12, R18, R21, R24. Release criteria AC26.

## S3 later-stage queue

### agora-s3-observe-attributed-conversation

- Title: Capture bounded observer proposals.
- Stage: S3 later-stage.
- Prerequisites: None.
- Unit gates: U13.
- Close gate: task.
- Build box: U15.B01.
- Outcome: Implement opt-in visible observer batches bounded by 20 messages/five minutes and approved budget, with transactional range receipts and cursor advancement.
- Acceptance: Opt-in notice and budget exist; proposals attribute sources and disagreement without automatic decisions or execution.
- Verification evidence: Task-local probes for U15 lanes 1, 6, 7; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U15/agora-s3-observe-attributed-conversation/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U15, capture observer proposals and promote reviewed knowledge.
- Specification requirements: R05, R13, R14, R16. Release criteria AC30.

### agora-s3-checkpoint-observer-ranges

- Title: Checkpoint observer ranges and invalidation.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-observe-attributed-conversation`.
- Unit gates: U13.
- Close gate: task.
- Build box: U15.B02.
- Outcome: Propose attributed claims, questions, contradictions, and decision/knowledge candidates. Keep human exact words separate from model interpretation.
- Acceptance: Replay/crash yields no duplicate candidate; provider failure leaves cursor; source edits invalidate; disable/idle spends nothing.
- Verification evidence: Task-local probes for U15 lanes 2, 3, 4, 5, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U15/agora-s3-checkpoint-observer-ranges/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U15, capture observer proposals and promote reviewed knowledge.
- Specification requirements: R05, R13, R14, R16. Release criteria AC30.

### agora-s3-promote-reviewed-memory

- Title: Promote redacted knowledge across projects.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-checkpoint-observer-ranges`.
- Unit gates: U13.
- Close gate: task.
- Build box: U15.B03.
- Outcome: Implement source-edit invalidation, explicit project activation, redacted cross-project promotion with two scope approvals, and recurrence/retrieval metrics.
- Acceptance: Source maintainer and workspace owner approve a new scoped record; source ACL stays unchanged; revocation removes new-context use.
- Verification evidence: Task-local probes for U15 lanes 8, 9; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U15/agora-s3-promote-reviewed-memory/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U15, capture observer proposals and promote reviewed knowledge.
- Specification requirements: R05, R13, R14, R16. Release criteria AC30.

### agora-s3-export-operational-audit

- Title: Export scoped audit and operational health.
- Stage: S3 later-stage.
- Prerequisites: None.
- Unit gates: U09, U10, U12.
- Close gate: task.
- Build box: U16.B01.
- Outcome: Add scoped signed audit exports, budget/reconciliation dashboards, backup age/restore alerts, and operator remediation runbooks.
- Acceptance: Export verifies scope/digests without secret payloads; budget, backup, cleanup, and disk alerts show actual state.
- Verification evidence: Task-local probes for U16 lanes 1, 9, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U16/agora-s3-export-operational-audit/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U16, harden operations and prove governed deletion.
- Specification requirements: R10, R14, R15, R16, R17, R18. Release criteria AC31.

### agora-s3-delete-with-recorded-authority

- Title: Implement governed retention and deletion.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-export-operational-audit`.
- Unit gates: U09, U10, U12.
- Close gate: task.
- Build box: U16.B02.
- Outcome: Implement archive/deletion impact preview, export, separate external-repository authority, two-human confirmation, credential revocation, retention/hold handling, and tombstones.
- Acceptance: Fresh two-human exact approval, export/hold checks, separate remote consent, revocation, and replay tombstones prevent accidental loss.
- Verification evidence: Task-local probes for U16 lanes 4, 5, 6, 7, 8; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U16/agora-s3-delete-with-recorded-authority/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U16, harden operations and prove governed deletion.
- Specification requirements: R10, R14, R15, R16, R17, R18. Release criteria AC31.

### agora-s3-drill-host-recovery

- Title: Rehearse host loss and compatible upgrade recovery.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-delete-with-recorded-authority`.
- Unit gates: U09, U10, U12.
- Close gate: task.
- Build box: U16.B03.
- Outcome: Run VM-loss restore, compatible rollback/forward repair, provider outage, disk pressure, key rotation, and abandoned-resource drills.
- Acceptance: Off-host keys/backups restore within targets; old epoch fails; compatible rollback retains data; key rotation revokes old access.
- Verification evidence: Task-local probes for U16 lanes 2, 3, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U16/agora-s3-drill-host-recovery/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U16, harden operations and prove governed deletion.
- Specification requirements: R10, R14, R15, R16, R17, R18. Release criteria AC31.

### agora-s3-authorize-slack-notifications

- Title: Authorize notification-only room mappings.
- Stage: S3 later-stage.
- Prerequisites: None.
- Unit gates: U09.
- Close gate: task.
- Build box: U17.B01.
- Outcome: Add explicit owner-approved Slack bot installation and one-way selected card/notification delivery with links back to Agora.
- Acceptance: Bridge defaults off; explicit workspace/channel/audience/scopes approval precedes any external content.
- Verification evidence: Task-local probes for U17 lanes 1, 3, 4, 8; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U17/agora-s3-authorize-slack-notifications/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U17, add an opt-in notification-only slack bridge.
- Specification requirements: R01, R07, R14, R16, R20. Release criteria AC32.

### agora-s3-deliver-reconciled-notifications

- Title: Deliver and revoke deduplicated notifications.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-authorize-slack-notifications`.
- Unit gates: U09.
- Close gate: task.
- Build box: U17.B02.
- Outcome: Deduplicate sends, store remote receipts, restrict payload to mapped room audience, and reconcile uninstall/revocation.
- Acceptance: Outbox receipt handles duplicate/failed sends; uninstall revokes; Slack outage cannot change task or evidence state.
- Verification evidence: Task-local probes for U17 lanes 2, 7, 9; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U17/agora-s3-deliver-reconciled-notifications/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U17, add an opt-in notification-only slack bridge.
- Specification requirements: R01, R07, R14, R16, R20. Release criteria AC32.

### agora-s3-prove-bridge-is-not-authority

- Title: Prove bridge messages cannot authorize work.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-deliver-reconciled-notifications`.
- Unit gates: U09.
- Close gate: task.
- Build box: U17.B03.
- Outcome: Document that Slack text, reactions, and buttons carry no launch/approval/merge authority; keep direct messages and inbound conversation sync unsupported.
- Acceptance: Slack replies and links never bypass Agora authentication or exact-action approval; notifications remain readable and secret-free.
- Verification evidence: Task-local probes for U17 lanes 5, 6, 10; red.log, green.log, guard/feature-map/contract/evidence results, public transcript/artifacts, security/performance and independent exact-head review under `evidence/U17/agora-s3-prove-bridge-is-not-authority/`. These task receipts do not claim the later milestone verdict.
- Plan unit: U17, add an opt-in notification-only slack bridge.
- Specification requirements: R01, R07, R14, R16, R20. Release criteria AC32.

## Coverage index

| Unit | Stage | Requirements | Criteria | Tasks |
| --- | --- | --- | --- | --- |
| U01a | S1 | R03, R05, R07, R12, R21, R22 | AC00, AC14 | 4 |
| U01b | S1 | R03, R11, R12, R16, R21, R22 | AC00, AC08 | 3 |
| U01c | S1 | R12, R15, R17, R22 | AC00, AC11 | 1 |
| U01d | S1 | R02, R18, R22, R23 | AC00, AC13 | 1 |
| U02 | S1 | R01, R02, R04, R05, R14, R21, R22, R24 | AC01, AC02, AC15 | 5 |
| U03 | S1 | R02, R05, R07, R18, R13, R21 | AC02, AC03 | 4 |
| U04 | S1 | R02, R04, R05, R06, R16, R21, R22, R24 | AC04, AC10 | 3 |
| U05 | S1 | R05, R06, R07, R14, R17, R21, R22 | AC05, AC06, AC11 | 3 |
| U06 | S1 | R04, R06, R07, R08, R15, R21, R24 | AC05, AC06, AC07, AC14 | 3 |
| U07 | S1 | R08, R09, R11, R12, R16, R21, R22, R24 | AC07, AC08, AC10 | 3 |
| U08 | S1 | R07, R11, R12, R14, R15 | AC09 | 3 |
| U09 | S1 | R01, R12, R15, R16, R17, R18, R19, R22, R23 | AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10, AC11, AC12, AC13 | 3 |
| U10 | S2 | R02, R04, R07, R10, R14, R15 | AC20 | 3 |
| U11 | S2 | R09, R10, R12, R16 | AC21 | 3 |
| U12 | S2 | R06, R07, R09, R15, R16, R17 | AC21, AC24 | 3 |
| U13 | S2 | R04, R05, R10, R13, R14, R24 | AC22 | 3 |
| U14 | S2 | R08, R09, R11, R12, R15, R19 | AC23, AC24 | 3 |
| U18 | S2 | R08, R11, R12, R16, R21, R24 | AC25 | 3 |
| U19 | S2 | R02, R04, R07, R12, R18, R21, R24 | AC26 | 3 |
| U15 | S3 | R05, R13, R14, R16 | AC30 | 3 |
| U16 | S3 | R10, R14, R15, R16, R17, R18 | AC31 | 3 |
| U17 | S3 | R01, R07, R14, R16, R20 | AC32 | 3 |
