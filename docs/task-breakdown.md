# Agora task breakdown

These are durable backlog candidates, not started tasks. Transfer the slug unchanged. A task is complete only with its named outcome, acceptance evidence, and the containing plan unit's exact-head review gate.

[Technical specification](technical-spec.md) owns requirements. [Implementation plan](implementation-plan.md) owns module boundaries, migrations, API contracts, live scenarios, security checks, performance probes, and operator-only landing. Each task below inherits that unit's gates. It does not authorize implementation, a provider purchase, a forge write, or a merge in this specification delivery.

Only S1 tasks form the initial queue. S2 and S3 are later-stage work. Conditional capabilities outside R20's authorized baseline are deliberately absent. Evidence paths are future artifacts, not claims of completed tests.

## S1 initial queue

### agora-s1-bootstrap-repository

- Title: Create the reproducible repository.
- Stage: S1.
- Prerequisites: None.
- Outcome: Create the initial repository shape in Appendix D with pnpm workspaces, TypeScript strict mode, Vite, Hono, shared Zod contracts, Drizzle, Vitest, Playwright, and lint/format scripts.
- Acceptance: Clean install, strict build, lint, typecheck, unit and browser smoke pass from the new workspace roots.
- Verification evidence: U01 live lanes 1, 2, 5; `evidence/U01/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U01, establish reproducible development and restore.
- Specification requirements: R03, R12, R17, R18. Release criteria AC11.

### agora-s1-isolate-development

- Title: Provide isolated startup and verified control commands.
- Stage: S1.
- Prerequisites: `agora-s1-bootstrap-repository`.
- Outcome: Add Compose plus Caddy, local SMTP/object-store substitutes, isolated fixture namespaces, and a read-only doctor CLI. Create the managed-project fixture with its R12 CLI, pinned dual-platform image, reviewed evidence/policy CI, and human-owned disposable repository setup. Write a project-local verify-agora skill from the running entry points, not imagined selectors.
- Acceptance: Two instances coexist, doctor reports actual dependencies, help/version have no startup effects, and cleanup preserves evidence. The fixture passes its own real scenario and has verified repository protections before U02 registration; no readiness bypass is needed for later worker tests.
- Verification evidence: U01 live lanes 2, 3, 4, 8, 10; `evidence/U01/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U01, establish reproducible development and restore.
- Specification requirements: R03, R12, R17, R18. Release criteria AC11.

### agora-s1-prove-backup-restore

- Title: Implement encrypted backup and restore.
- Stage: S1.
- Prerequisites: `agora-s1-isolate-development`.
- Outcome: Add encrypted base backup and WAL archive jobs, a separate-host restore command, epoch rotation, and a recorded operator runbook.
- Acceptance: Separate-host restore proves row/object integrity, new epoch fencing, RPO at most 15 minutes, and RTO at most four hours.
- Verification evidence: U01 live lanes 6, 7, 9; `evidence/U01/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U01, establish reproducible development and restore.
- Specification requirements: R03, R12, R17, R18. Release criteria AC11.

### agora-s1-invite-identities

- Title: Implement verified invitation-only identity.
- Stage: S1.
- Prerequisites: `agora-s1-prove-backup-restore`.
- Outcome: Configure Better Auth magic links, strict verified-email invitation acceptance, custom closed roles, SMTP delivery, secure cookies, CSRF/Origin checks, and rate limits.
- Acceptance: Real email acceptance succeeds once; expired, replayed, wrong-email, and public-signup attempts fail.
- Verification evidence: U02 live lanes 1, 2, 3, 4, 5; `evidence/U02/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U02, invite developers into scoped project rooms.
- Specification requirements: R01, R02, R04, R05, R14. Release criteria AC01, AC02.

### agora-s1-scope-project-rooms

- Title: Register projects with explicit room membership.
- Stage: S1.
- Prerequisites: `agora-s1-invite-identities`.
- Outcome: Build project registration and explicit project grants. Create one room and inactive main-agent identity per project. Gate coding readiness on repository/environment checks rather than creating a repository.
- Acceptance: Two projects have separate room/main-agent IDs; workspace membership alone grants no project content; last owner cannot disappear.
- Verification evidence: U02 live lanes 6, 7, 8; `evidence/U02/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U02, invite developers into scoped project rooms.
- Specification requirements: R01, R02, R04, R05, R14. Release criteria AC01, AC02.

### agora-s1-revoke-live-access

- Title: Enforce roles and live revocation.
- Stage: S1.
- Prerequisites: `agora-s1-scope-project-rooms`.
- Outcome: Build navigation, invitation acceptance, room access, and revocation behavior. Disable direct organization-management bypass routes.
- Acceptance: Observer writes, bypass auth routes, stale subscriptions, and revoked-worker grants deny through the real API/UI.
- Verification evidence: U02 live lanes 5, 6, 9, 10; `evidence/U02/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U02, invite developers into scoped project rooms.
- Specification requirements: R01, R02, R04, R05, R14. Release criteria AC01, AC02.

### agora-s1-persist-conversation

- Title: Persist message revisions and thread state.
- Stage: S1.
- Prerequisites: `agora-s1-revoke-live-access`.
- Outcome: Persist messages, thread replies, edits/tombstones, mentions, and unread cursors with one transaction per mutation and optimistic pending UI.
- Acceptance: Two humans share one ordered thread; edits pin revisions; duplicate client IDs return one record and matching receipt.
- Verification evidence: U03 live lanes 1, 2, 3; `evidence/U03/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U03, deliver durable conversation and ordered reconnection.
- Specification requirements: R02, R05, R07, R18. Release criteria AC02, AC03.

### agora-s1-resume-realtime

- Title: Deliver cursor-resumable ordered events.
- Stage: S1.
- Prerequisites: `agora-s1-persist-conversation`.
- Outcome: Implement snapshot plus ordered committed event pump, replay/gap handling, 1-MiB socket bounds, receipt dedupe, and membership filtering on every delivery.
- Acceptance: Commit-before-broadcast restart, missing cursor range, slow consumers, and socket gaps converge without loss or duplicates.
- Verification evidence: U03 live lanes 4, 5, 6, 7; `evidence/U03/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U03, deliver durable conversation and ordered reconnection.
- Specification requirements: R02, R05, R07, R18. Release criteria AC02, AC03.

### agora-s1-search-safe-content

- Title: Ship scoped search and safe attachments.
- Stage: S1.
- Prerequisites: `agora-s1-resume-realtime`.
- Outcome: Implement scoped search and bounded attachment quarantine/upload. Add safe Markdown, no external image autoload, and accessible thread panels.
- Acceptance: Private terms never leak through results/counts; oversized or active content stays quarantined; keyboard and both viewports pass.
- Verification evidence: U03 live lanes 8, 9, 10; `evidence/U03/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U03, deliver durable conversation and ordered reconnection.
- Specification requirements: R02, R05, R07, R18. Release criteria AC02, AC03.

### agora-s1-compile-authorized-context

- Title: Compile explicit cited context.
- Stage: S1.
- Prerequisites: `agora-s1-search-safe-content`.
- Outcome: Compile explicit thread and selected-record context with audience intersection, trust labels, source revisions, token limits, and visible omissions.
- Acceptance: Only requester/agent/destination-intersection records enter a bounded bundle; omitted IDs and pinned revisions remain visible.
- Verification evidence: U04 live lanes 1, 2, 3, 4; `evidence/U04/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U04, answer questions with visible read-only agent sessions.
- Specification requirements: R02, R04, R05, R06, R16. Release criteria AC04, AC10.

### agora-s1-run-readonly-center

- Title: Connect the bounded read-only center agent.
- Stage: S1.
- Prerequisites: `agora-s1-compile-authorized-context`.
- Outcome: Add the workspace-owned OpenAI Responses adapter, exact model configuration, provider/data approval checks, cost reservation, timeout accounting, and read-only record tools.
- Acceptance: A real provider question works; role/tool injection denies; timeout never blindly duplicates spend; budgets reserve before calls.
- Verification evidence: U04 live lanes 1, 5, 9; `evidence/U04/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U04, answer questions with visible read-only agent sessions.
- Specification requirements: R02, R04, R05, R06, R16. Release criteria AC04, AC10.

### agora-s1-render-agent-session

- Title: Render typed sessions and safe citations.
- Stage: S1.
- Prerequisites: `agora-s1-run-readonly-center`.
- Outcome: Render agent status/action/question/result/error cards with citations, initial acknowledgment deadline, stop, stale liveness, and plain-text external links.
- Acceptance: Cards expose timing, stop, stale/error state and citation revision; generated links cannot execute or exfiltrate through rendering.
- Verification evidence: U04 live lanes 6, 7, 8, 10; `evidence/U04/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U04, answer questions with visible read-only agent sessions.
- Specification requirements: R02, R04, R05, R06, R16. Release criteria AC04, AC10.

### agora-s1-model-task-ownership

- Title: Implement task and run transition contracts.
- Stage: S1.
- Prerequisites: `agora-s1-render-agent-session`.
- Outcome: Implement exhaustive state reducers and transactional command receipts, scope-bound approvals, one-use effect claims, lease scanner, and audit events.
- Acceptance: One human owns each task; cyclic/cross-project dependencies reject; mentions create proposals without execution.
- Verification evidence: U05 live lanes 1, 2, 10; `evidence/U05/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U05, create owned tasks with fenced runs and approvals.
- Specification requirements: R05, R06, R07, R14, R17. Release criteria AC05, AC06, AC11.

### agora-s1-fence-run-leases

- Title: Implement atomic claims and bounded recovery.
- Stage: S1.
- Prerequisites: `agora-s1-model-task-ownership`.
- Outcome: Build task proposal/launch UI with intent, acceptance, exact placement, payer, environment, scope, and budget preview. Mentions may propose but cannot launch.
- Acceptance: Competing workers get one winner; expired/cancelled fence cannot complete; fresh retry retains history under new IDs.
- Verification evidence: U05 live lanes 3, 4, 7, 8; `evidence/U05/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U05, create owned tasks with fenced runs and approvals.
- Specification requirements: R05, R06, R07, R14, R17. Release criteria AC05, AC06, AC11.

### agora-s1-bind-approval-budgets

- Title: Bind approvals and budget reservations to exact effects.
- Stage: S1.
- Prerequisites: `agora-s1-fence-run-leases`.
- Outcome: Add transactional budget reservations, bounded queue/input/wall deadlines, cancellation/retry semantics, and current-state projections separate from history.
- Acceptance: Role/head/policy races invalidate authority; consumed approval cannot replay; concurrent reservations stay below caps.
- Verification evidence: U05 live lanes 5, 6, 9; `evidence/U05/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U05, create owned tasks with fenced runs and approvals.
- Specification requirements: R05, R06, R07, R14, R17. Release criteria AC05, AC06, AC11.

### agora-s1-enroll-outbound-worker

- Title: Enroll owner-bound outbound workers.
- Stage: S1.
- Prerequisites: `agora-s1-bind-approval-budgets`.
- Outcome: Implement five-minute device enrollment, public-key proof, rotating tokens, owner/repository binding, foreground outbound connection, and read-only doctor.
- Acceptance: Real device enrollment and registration work without inbound ports; wrong owner/repository, token replay, and incompatible capability fail.
- Verification evidence: U06 live lanes 1, 2, 3, 5; `evidence/U06/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U06, connect owner-bound workers and prepare clean worktrees.
- Specification requirements: R04, R06, R07, R08, R15. Release criteria AC05, AC06, AC07.

### agora-s1-allocate-clean-worktrees

- Title: Allocate worktrees outside developer checkouts.
- Stage: S1.
- Prerequisites: `agora-s1-enroll-outbound-worker`.
- Outcome: Create private bare mirrors and clean task worktrees at the requested remote SHA, validate paths/remotes, sanitize Git environment/hooks, allocate process/fixture/port namespaces, and maintain run owner locks.
- Acceptance: Dirty user checkout remains byte-identical; mirror task branches and namespaces are separate; unsafe remotes/path escapes fail.
- Verification evidence: U06 live lanes 6, 7, 8; `evidence/U06/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U06, connect owner-bound workers and prepare clean worktrees.
- Specification requirements: R04, R06, R07, R08, R15. Release criteria AC05, AC06, AC07.

### agora-s1-recover-worker-disconnect

- Title: Implement worker spool and safe local cleanup.
- Stage: S1.
- Prerequisites: `agora-s1-allocate-clean-worktrees`.
- Outcome: Implement heartbeat/spool replay, disconnect stop deadlines, owner-only manual prepare, and non-destructive retained-work recovery.
- Acceptance: Offline launch never falls back; renewal loss stops processes by deadline; old data cannot publish; dirty work remains retained.
- Verification evidence: U06 live lanes 4, 9, 10; `evidence/U06/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U06, connect owner-bound workers and prepare clean worktrees.
- Specification requirements: R04, R06, R07, R08, R15. Release criteria AC05, AC06, AC07.

### agora-s1-isolate-local-environment

- Title: Enforce the restricted local environment.
- Stage: S1.
- Prerequisites: `agora-s1-recover-worker-disconnect`.
- Outcome: Implement the restricted Dev Container profile and rootless Linux execution adapter for Linux/macOS hosts, with no host hooks, home/socket/Git mounts, unsafe labels, or default egress.
- Acceptance: Effective Dev Container fields including image labels reject host execution/privilege; credential/socket/metadata/egress probes deny.
- Verification evidence: U07 live lanes 2, 3, 4; `evidence/U07/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U07, execute bounded local work and collect behavior evidence.
- Specification requirements: R08, R09, R11, R12, R16. Release criteria AC07, AC08, AC10.

### agora-s1-execute-headless-task

- Title: Run bounded headless agent tasks.
- Stage: S1.
- Prerequisites: `agora-s1-isolate-local-environment`.
- Outcome: Implement agora-headless-v1 with a host-owned model loop and fixed read/list/patch/environment-exec tools. Provider credentials stay outside execution.
- Acceptance: Real model fixes fixture behavior only through fixed tools; provider key stays host-side; cancellation terminates the owned process group.
- Verification evidence: U07 live lanes 1, 2, 8; `evidence/U07/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U07, execute bounded local work and collect behavior evidence.
- Specification requirements: R08, R09, R11, R12, R16. Release criteria AC07, AC08, AC10.

### agora-s1-validate-project-evidence

- Title: Collect and validate exact-head project evidence.
- Stage: S1.
- Prerequisites: `agora-s1-execute-headless-task`.
- Outcome: Implement project doctor/start/scenarios/verify/evidence/stop, immutable candidate commits, exact-head manifests, artifact scans, signatures, and honest unavailable results.
- Acceptance: Project CLI and skill prove public user behavior; unavailable/wrong-head/digest/foreign-fence artifacts block and evidence survives cleanup.
- Verification evidence: U07 live lanes 5, 6, 7, 9, 10; `evidence/U07/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U07, execute bounded local work and collect behavior evidence.
- Specification requirements: R08, R09, R11, R12, R16. Release criteria AC07, AC08, AC10.

### agora-s1-gate-change-publication

- Title: Gate overlap, risk, size, and exact head.
- Stage: S1.
- Prerequisites: `agora-s1-validate-project-evidence`.
- Outcome: Implement changed-path overlap detection, current-base checks, size rationale/exception, risk floors, and stale-evidence invalidation.
- Acceptance: Overlap blocks until review; stale base/head/policy requires fresh proof; hard risk floors cannot be lowered by a model.
- Verification evidence: U08 live lanes 4, 5, 6; `evidence/U08/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U08, publish approved drafts and enforce independent review.
- Specification requirements: R07, R11, R12, R14, R15. Release criteria AC09.

### agora-s1-publish-human-approved-draft

- Title: Publish one approved draft with owner credentials.
- Stage: S1.
- Prerequisites: `agora-s1-gate-change-publication`.
- Outcome: Add non-author exact-head publication approval and distinct local credential-owner confirmation. Host Git broker pushes only the task branch and opens only a draft.
- Acceptance: Non-author approval and owner credential confirmation precede any push; duplicate/uncertain results reconcile to one exact draft.
- Verification evidence: U08 live lanes 1, 2, 3, 7; `evidence/U08/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U08, publish approved drafts and enforce independent review.
- Specification requirements: R07, R11, R12, R14, R15. Release criteria AC09.

### agora-s1-enforce-independent-review

- Title: Enforce trusted checks and human merge.
- Stage: S1.
- Prerequisites: `agora-s1-publish-human-approved-draft`.
- Outcome: Add trusted default-branch CI evidence/policy gates, expected producer validation, remote reconciliation, review UI, human-merge observation, and post-merge smoke.
- Acceptance: Skipped/neutral/unavailable/wrong-head checks fail; author cannot satisfy independent review; task completes only after live merge and post-merge scenario.
- Verification evidence: U08 live lanes 8, 9, 10; `evidence/U08/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U08, publish approved drafts and enforce independent review.
- Specification requirements: R07, R11, R12, R14, R15. Release criteria AC09.

### agora-s1-verify-two-person-story

- Title: Prove the real two-person release story.
- Stage: S1.
- Prerequisites: `agora-s1-enforce-independent-review`.
- Outcome: Complete platform feature map and AC01 through AC12 live scenarios with two real verified accounts on two distinct machines and approved disposable repository.
- Acceptance: Two verified accounts on two distinct machines complete the full S1 flow with real provider, email, artifact storage, and approved GitHub fixture.
- Verification evidence: U09 live lanes 1, 2, 4, 8; `evidence/U09/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U09, prove the first release across two accounts and machines.
- Specification requirements: R01, R12, R15, R16, R17, R18, R19. Release criteria AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10, AC11, AC12.

### agora-s1-verify-release-failures

- Title: Prove denial and recovery end to end.
- Stage: S1.
- Prerequisites: `agora-s1-verify-two-person-story`.
- Outcome: Run denial, crash, injection, exact-head, restore, cost, accessibility, and reference-load suites. Repair product gaps rather than documenting false passes.
- Acceptance: LV03, LV05, LV06, LV07, LV08, and LV10 pass with observed negative effects and no false successes.
- Verification evidence: U09 live lanes 3, 4, 5, 6, 7; `evidence/U09/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U09, prove the first release across two accounts and machines.
- Specification requirements: R01, R12, R15, R16, R17, R18, R19. Release criteria AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10, AC11, AC12.

### agora-s1-qualify-first-release

- Title: Qualify S1 operations, accessibility, and performance.
- Stage: S1.
- Prerequisites: `agora-s1-verify-release-failures`.
- Outcome: Create the S1 release runbook and evidence index with tested versions, residual trust limits, operator rollback, and explicit stage-two disabled controls.
- Acceptance: Every AC01-AC12 has retained live evidence; timed restore/budget drill and all R18 S1 budgets pass; later-stage controls remain disabled.
- Verification evidence: U09 live lanes 1, 9, 10; `evidence/U09/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U09, prove the first release across two accounts and machines.
- Specification requirements: R01, R12, R15, R16, R17, R18, R19. Release criteria AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10, AC11, AC12.

## S2 later-stage queue

### agora-s2-authorize-project-proposal

- Title: Authorize exact project and integration effects.
- Stage: S2 later-stage.
- Prerequisites: `agora-s1-qualify-first-release`.
- Outcome: Build the proposal/authorization UI and separately scoped GitHub admin and normal-operation grants with immutable account linking.
- Acceptance: Proposal freezes repository, members, image/policy, payer, and scope; absent/expired/wrong-installation authorization cannot write.
- Verification evidence: U10 live lanes 1, 2, 5, 6; `evidence/U10/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U10, provision a private project from a conversation.
- Specification requirements: R02, R04, R07, R10, R14, R15. Release criteria AC20.

### agora-s2-reconcile-provisioning

- Title: Provision and reconcile one private repository.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-authorize-project-proposal`.
- Outcome: Implement journaled repository creation, approved template seeding, ruleset/check read-back, named membership, and repair behavior after each external step.
- Acceptance: Crash-after-create resumes one marked resource; occupied foreign name blocks; required protection read-back gates onboarding.
- Verification evidence: U10 live lanes 3, 4, 8; `evidence/U10/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U10, provision a private project from a conversation.
- Specification requirements: R02, R04, R07, R10, R14, R15. Release criteria AC20.

### agora-s2-control-project-lifecycle

- Title: Control signed events and project pause/archive.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-reconcile-provisioning`.
- Outcome: Implement signed GitHub webhook ingestion, delivery-ID dedupe, async reconciliation, and project pause/resume/archive. Keep activation blocked until image/verification U11/U12 qualify.
- Acceptance: Webhook signature/dedupe holds; pause stops leases; archive freezes writes without deleting repository; repair UI exposes facts.
- Verification evidence: U10 live lanes 7, 9, 10; `evidence/U10/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U10, provision a private project from a conversation.
- Specification requirements: R02, R04, R07, R10, R14, R15. Release criteria AC20.

### agora-s2-validate-build-definition

- Title: Validate effective declarative environment inputs.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-control-project-lifecycle`.
- Outcome: Implement safe Dev Container effective-config resolution, reviewed Feature/base-image pinning, separate builder VM, and exact build approval.
- Acceptance: No host hooks, unsafe metadata, unpinned dependencies, or escaping build context reach the builder.
- Verification evidence: U11 live lanes 3, 4, 5; `evidence/U11/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U11, build and qualify declarative project images.
- Specification requirements: R09, R10, R12, R16. Release criteria AC21.

### agora-s2-build-attested-oci

- Title: Build immutable OCI with provenance.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-validate-build-definition`.
- Outcome: Export immutable OCI images with SBOM, scans, provenance, command receipts, and bounded logs; key caches by all declared inputs.
- Acceptance: Separate builder emits digest, SBOM, scans, logs, and one reconciled operation; secret-bearing outputs cannot activate.
- Verification evidence: U11 live lanes 1, 6, 9; `evidence/U11/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U11, build and qualify declarative project images.
- Specification requirements: R09, R10, R12, R16. Release criteria AC21.

### agora-s2-qualify-cold-environment

- Title: Qualify cold environment readiness.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-build-attested-oci`.
- Outcome: Run lifecycle readiness plus project doctor/scenario against the cold image. Block activation on failed setup rather than continuing degraded.
- Acceptance: Cache deletion still permits repeatable behavior; failed setup blocks; changed lockfile/policy cannot reuse stale activation.
- Verification evidence: U11 live lanes 2, 7, 8, 10; `evidence/U11/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U11, build and qualify declarative project images.
- Specification requirements: R09, R10, R12, R16. Release criteria AC21.

### agora-s2-adapt-e2b-runtime

- Title: Implement the first cloud provider adapter.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-qualify-cold-environment`.
- Outcome: Implement E2B OCI-to-template mapping and create/inspect/exec/export/destroy adapter with host-owned loop, outside-guest credentials, and account/region conformance.
- Acceptance: Selected account/region imports the approved image and creates one fresh per-attempt microVM with recorded identity.
- Verification evidence: U12 live lanes 1, 2, 6; `evidence/U12/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U12, execute and recover one isolated cloud attempt.
- Specification requirements: R06, R07, R09, R15, R16, R17. Release criteria AC21, AC24.

### agora-s2-enforce-cloud-boundary

- Title: Enforce cloud credentials, network, and resource limits.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-adapt-e2b-runtime`.
- Outcome: Enforce per-attempt microVM, default-deny external egress, forbidden-range allow-rule rejection, resource/TTL limits, and no public preview ports.
- Acceptance: Forbidden-range allow rules reject, application-level denied egress has no destination effect, and guest cannot read broker credentials.
- Verification evidence: U12 live lanes 3, 4, 5, 10; `evidence/U12/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U12, execute and recover one isolated cloud attempt.
- Specification requirements: R06, R07, R09, R15, R16, R17. Release criteria AC21, AC24.

### agora-s2-reconcile-cloud-resources

- Title: Recover uncertain allocation and destruction.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-enforce-cloud-boundary`.
- Outcome: Implement allocation timeout reconciliation, provider TTL, cost reconciliation, quarantined exports, and exact-ID reaping with unknown cleanup visible.
- Acceptance: Allocation timeout never duplicates unknowable resources; lost runner expires; unavailable destroy stays unconfirmed until read-back and cost remains bounded.
- Verification evidence: U12 live lanes 7, 8, 9; `evidence/U12/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U12, execute and recover one isolated cloud attempt.
- Specification requirements: R06, R07, R09, R15, R16, R17. Release criteria AC21, AC24.

### agora-s2-activate-reviewed-knowledge

- Title: Activate scoped knowledge with human proof.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-control-project-lifecycle`, `agora-s2-reconcile-cloud-resources`.
- Outcome: Implement human knowledge activation with provenance, applicability, regression or non-executable rationale, and 90-day review deadline.
- Acceptance: Evidence-free claims stay proposed; authorized activation creates immutable version with regression/provenance and review date.
- Verification evidence: U13 live lanes 2, 3, 9; `evidence/U13/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U13, activate persistent project agents and reviewed knowledge.
- Specification requirements: R04, R05, R10, R13, R14. Release criteria AC22.

### agora-s2-invalidate-stale-knowledge

- Title: Invalidate conflicts and stale evidence.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-activate-reviewed-knowledge`.
- Outcome: Implement deterministic invalidation, conflict exclusion, ACL-before-FTS context compilation, and versioned repository import/export through ordinary contribution workflow.
- Acceptance: Dependency/source/date changes exclude affected records before retrieval; equal-scope conflict remains visible and unresolved until human decision.
- Verification evidence: U13 live lanes 4, 5, 6, 7, 10; `evidence/U13/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U13, activate persistent project agents and reviewed knowledge.
- Specification requirements: R04, R05, R10, R13, R14. Release criteria AC22.

### agora-s2-activate-project-main

- Title: Activate persistent project-main sessions.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-invalidate-stale-knowledge`.
- Outcome: Activate project-main sessions that reconstruct approved context and propose task dependencies without launching or approving.
- Acceptance: Restart preserves identity/context through durable records; cited answers survive and no automatic launch or cross-project access occurs.
- Verification evidence: U13 live lanes 1, 8, 10; `evidence/U13/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U13, activate persistent project agents and reviewed knowledge.
- Specification requirements: R04, R05, R10, R13, R14. Release criteria AC22.

### agora-s2-verify-placement-parity

- Title: Prove shared local/cloud run semantics.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-reconcile-cloud-resources`, `agora-s2-activate-project-main`.
- Outcome: Run the same fixture goal/base/policy/context on both placements and compare required assertions, manifest subjects, deny behavior, and approval gates.
- Acceptance: Both placements pass equivalent assertions, scope/authority gates, manifest subjects, and unavailable-check handling.
- Verification evidence: U14 live lanes 1, 3, 6, 10; `evidence/U14/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U14, prove local and cloud execution parity.
- Specification requirements: R08, R09, R11, R12, R15, R19. Release criteria AC23, AC24.

### agora-s2-publish-cloud-evidence

- Title: Publish cloud results through the external broker.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-verify-placement-parity`.
- Outcome: Complete cloud patch-to-candidate broker, fresh independent verification, approved App publication, current-head read-back, and human review/merge.
- Acceptance: Fresh host candidate and independent verification bind exact patch; guest lacks write credential; escaping patch/human takeover blocks.
- Verification evidence: U14 live lanes 2, 7, 8; `evidence/U14/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U14, prove local and cloud execution parity.
- Specification requirements: R08, R09, R11, R12, R15, R19. Release criteria AC23, AC24.

### agora-s2-verify-cloud-recovery

- Title: Prove fresh recovery and cancellation parity.
- Stage: S2 later-stage.
- Prerequisites: `agora-s2-publish-cloud-evidence`.
- Outcome: Exercise cancel/loss/retry, overlapping changes, stale approvals, unavailable checks, and cold recovery without snapshots on both placements.
- Acceptance: Cancel, lease loss, retry, overlap, and snapshot-free recovery preserve one run contract and no stale publication.
- Verification evidence: U14 live lanes 4, 5, 7, 9; `evidence/U14/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U14, prove local and cloud execution parity.
- Specification requirements: R08, R09, R11, R12, R15, R19. Release criteria AC23, AC24.

## S3 later-stage queue

### agora-s3-observe-attributed-conversation

- Title: Capture bounded observer proposals.
- Stage: S3 later-stage.
- Prerequisites: `agora-s2-verify-cloud-recovery`.
- Outcome: Implement opt-in visible observer batches bounded by 20 messages/five minutes and approved budget, with transactional range receipts and cursor advancement.
- Acceptance: Opt-in notice and budget exist; proposals attribute sources and disagreement without automatic decisions or execution.
- Verification evidence: U15 live lanes 1, 6, 7; `evidence/U15/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U15, capture observer proposals and promote reviewed knowledge.
- Specification requirements: R05, R13, R14, R16. Release criteria AC30.

### agora-s3-checkpoint-observer-ranges

- Title: Checkpoint observer ranges and invalidation.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-observe-attributed-conversation`.
- Outcome: Propose attributed claims, questions, contradictions, and decision/knowledge candidates. Keep human exact words separate from model interpretation.
- Acceptance: Replay/crash yields no duplicate candidate; provider failure leaves cursor; source edits invalidate; disable/idle spends nothing.
- Verification evidence: U15 live lanes 2, 3, 4, 5, 10; `evidence/U15/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U15, capture observer proposals and promote reviewed knowledge.
- Specification requirements: R05, R13, R14, R16. Release criteria AC30.

### agora-s3-promote-reviewed-memory

- Title: Promote redacted knowledge across projects.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-checkpoint-observer-ranges`.
- Outcome: Implement source-edit invalidation, explicit project activation, redacted cross-project promotion with two scope approvals, and recurrence/retrieval metrics.
- Acceptance: Source maintainer and workspace owner approve a new scoped record; source ACL stays unchanged; revocation removes new-context use.
- Verification evidence: U15 live lanes 8, 9; `evidence/U15/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U15, capture observer proposals and promote reviewed knowledge.
- Specification requirements: R05, R13, R14, R16. Release criteria AC30.

### agora-s3-export-operational-audit

- Title: Export scoped audit and operational health.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-promote-reviewed-memory`.
- Outcome: Add scoped signed audit exports, budget/reconciliation dashboards, backup age/restore alerts, and operator remediation runbooks.
- Acceptance: Export verifies scope/digests without secret payloads; budget, backup, cleanup, and disk alerts show actual state.
- Verification evidence: U16 live lanes 1, 9, 10; `evidence/U16/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U16, harden operations and prove governed deletion.
- Specification requirements: R10, R14, R15, R16, R17, R18. Release criteria AC31.

### agora-s3-delete-with-recorded-authority

- Title: Implement governed retention and deletion.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-export-operational-audit`.
- Outcome: Implement archive/deletion impact preview, export, separate external-repository authority, two-human confirmation, credential revocation, retention/hold handling, and tombstones.
- Acceptance: Fresh two-human exact approval, export/hold checks, separate remote consent, revocation, and replay tombstones prevent accidental loss.
- Verification evidence: U16 live lanes 4, 5, 6, 7, 8; `evidence/U16/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U16, harden operations and prove governed deletion.
- Specification requirements: R10, R14, R15, R16, R17, R18. Release criteria AC31.

### agora-s3-drill-host-recovery

- Title: Rehearse host loss and compatible upgrade recovery.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-delete-with-recorded-authority`.
- Outcome: Run VM-loss restore, compatible rollback/forward repair, provider outage, disk pressure, key rotation, and abandoned-resource drills.
- Acceptance: Off-host keys/backups restore within targets; old epoch fails; compatible rollback retains data; key rotation revokes old access.
- Verification evidence: U16 live lanes 2, 3, 10; `evidence/U16/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U16, harden operations and prove governed deletion.
- Specification requirements: R10, R14, R15, R16, R17, R18. Release criteria AC31.

### agora-s3-authorize-slack-notifications

- Title: Authorize notification-only room mappings.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-drill-host-recovery`.
- Outcome: Add explicit owner-approved Slack bot installation and one-way selected card/notification delivery with links back to Agora.
- Acceptance: Bridge defaults off; explicit workspace/channel/audience/scopes approval precedes any external content.
- Verification evidence: U17 live lanes 1, 3, 4, 8; `evidence/U17/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U17, add an opt-in notification-only slack bridge.
- Specification requirements: R01, R07, R14, R16, R20. Release criteria AC32.

### agora-s3-deliver-reconciled-notifications

- Title: Deliver and revoke deduplicated notifications.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-authorize-slack-notifications`.
- Outcome: Deduplicate sends, store remote receipts, restrict payload to mapped room audience, and reconcile uninstall/revocation.
- Acceptance: Outbox receipt handles duplicate/failed sends; uninstall revokes; Slack outage cannot change task or evidence state.
- Verification evidence: U17 live lanes 2, 7, 9; `evidence/U17/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U17, add an opt-in notification-only slack bridge.
- Specification requirements: R01, R07, R14, R16, R20. Release criteria AC32.

### agora-s3-prove-bridge-is-not-authority

- Title: Prove bridge messages cannot authorize work.
- Stage: S3 later-stage.
- Prerequisites: `agora-s3-deliver-reconciled-notifications`.
- Outcome: Document that Slack text, reactions, and buttons carry no launch/approval/merge authority; keep direct messages and inbound conversation sync unsupported.
- Acceptance: Slack replies and links never bypass Agora authentication or exact-action approval; notifications remain readable and secret-free.
- Verification evidence: U17 live lanes 5, 6, 10; `evidence/U17/unit.log`, `security.md`, `perf.json`, lane screenshots/transcripts, and the exact-head review manifest. Record the task slug in that manifest.
- Plan unit: U17, add an opt-in notification-only slack bridge.
- Specification requirements: R01, R07, R14, R16, R20. Release criteria AC32.

## Transfer and completion rules

1. Preserve dependency slugs, stage, requirement IDs, and plan unit when importing.
2. Keep schema/API/compatibility work with its owning task and unit, not an untracked follow-up.
3. Keep S2/S3 tasks out of S1 dispatch. A verified S1 release does not automatically authorize later-stage execution or spending.
4. Attach exact-head evidence before closing a task. A generated skill, screenshot, model claim, or green unit test alone is insufficient.
5. A failed unit gate blocks dependent work. Do not close tasks by creating vague cleanup tasks outside the specification.
6. The operator owns release review and landing. Human authorization boundaries in R14 apply to implementation trials using real external resources.

## Coverage index

| Plan unit | Stage | Specification requirements | Release criteria | Task count |
| --- | --- | --- | --- | --- |
| U01 | S1 | R03, R12, R17, R18 | AC11 | 3 |
| U02 | S1 | R01, R02, R04, R05, R14 | AC01, AC02 | 3 |
| U03 | S1 | R02, R05, R07, R18 | AC02, AC03 | 3 |
| U04 | S1 | R02, R04, R05, R06, R16 | AC04, AC10 | 3 |
| U05 | S1 | R05, R06, R07, R14, R17 | AC05, AC06, AC11 | 3 |
| U06 | S1 | R04, R06, R07, R08, R15 | AC05, AC06, AC07 | 3 |
| U07 | S1 | R08, R09, R11, R12, R16 | AC07, AC08, AC10 | 3 |
| U08 | S1 | R07, R11, R12, R14, R15 | AC09 | 3 |
| U09 | S1 | R01, R12, R15, R16, R17, R18, R19 | AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10, AC11, AC12 | 3 |
| U10 | S2 later-stage | R02, R04, R07, R10, R14, R15 | AC20 | 3 |
| U11 | S2 later-stage | R09, R10, R12, R16 | AC21 | 3 |
| U12 | S2 later-stage | R06, R07, R09, R15, R16, R17 | AC21, AC24 | 3 |
| U13 | S2 later-stage | R04, R05, R10, R13, R14 | AC22 | 3 |
| U14 | S2 later-stage | R08, R09, R11, R12, R15, R19 | AC23, AC24 | 3 |
| U15 | S3 later-stage | R05, R13, R14, R16 | AC30 | 3 |
| U16 | S3 later-stage | R10, R14, R15, R16, R17, R18 | AC31 | 3 |
| U17 | S3 later-stage | R01, R07, R14, R16, R20 | AC32 | 3 |
