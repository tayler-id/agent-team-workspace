# Agora implementation plan

Build the communication center for a small developer team, then add governed cloud execution and durable project memory.
Deliver U01 through U09 as S1. Keep U10 through U14 in S2 and U15 through U17 in S3.
A unit is a planned review-sized change, not an existing pull request. No forge identifiers exist yet.
This document plans implementation. It does not authorize this specification task to execute it.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. Check a box only when its evidence exists, as a committed file, test log, screenshot, video, receipt, or exact SHA. The body is a how-to. The appendices explain and record.

For a separately authorized implementation program, use `.agents/skills/poteto-mode/playbooks/autopilot-stack.md`. Deliver a verified linear stack. Only the operator lands changes. No worker receives merge authority from this document. U01 through U17 are all review-gated because each changes a browser, CLI, or operator interaction.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

Use the initial repository shape in Appendix D. Those paths are planned modules, not claims that source code already exists. Preserve module ownership and use the module names below after U01 creates them.

## Program checklist

### Arm the program

- [ ] Obtain a separate explicit implementation go and record its scope and budget. Leave all implementation boxes unchecked in this design delivery.
- [ ] Record the implementation `/goal` as delivery of this plan in dependency order, exact-head unit/live/perf proof, operator-only landing, and S1 completion only after AC01 through AC12 pass.
- [ ] Read the approved trunk versions before execution and at each progress review using `git show origin/main:.agents/skills/poteto-mode/playbooks/autopilot-stack.md`, `git show origin/main:.agents/skills/swarm/SKILL.md`, and the installed architecture, writing, verification, and decision-trail skills. Use local main if no remote exists and record that fact.
- [ ] During an explicitly authorized active implementation session, use a 30-minute audit checkpoint and post a status message with unit, owner, exact head, evidence, review gates, and blockers. This design delivery arms no timer or unattended agent.
- [ ] On an operator hold, stop writes and retain evidence and recovery records.

### Spawn owners

- [ ] Assign one accountable engineer per unit. Do not launch a fleet merely to satisfy this plan. If the operator authorizes agent owners, follow the selected execution playbook and its scoped ownership rules.
- [ ] Follow the dependency graph in Appendix D and the corresponding task prerequisites. Start dependent units only from a verified parent head.
- [ ] Keep code within the named modules for the unit. A shared-contract change must include its consumers and compatibility tests.
- [ ] Hold every unit for operator interaction review with screenshots and video before landing. Do not infer consent from a green check.

### PR mechanics, for every planned unit

- [ ] After implementation is authorized, use the project's forge wrapper for any approved forge operation. Record the exact remote URL returned, never invent a pull-request number or URL.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm docs:check` from the isolated checkout. U01 creates these commands and locks their dependencies.
- [ ] Review the diff for unnecessary abstractions, comments, and AI-style prose before commit. Use installed pstack skills; do not install unrelated plugins implicitly.
- [ ] Keep the append-only decision trail with evidence pointers. Triage every security or review finding against the actual behavior.
- [ ] Rebase onto the current intended parent before exact-head validation. No source diff may inherit evidence from a different patch.

### Verdict and merge, for every planned unit

- [ ] At the exact head, obtain independent gates, ten live scenario reports, performance evidence, and a receipts/diff audit. Keep each lane's identity, environment, revision, and pass predicate.
- [ ] Mark verified only when every lane passes. A new head invalidates affected evidence. Unavailable is not pass.
- [ ] Append the verified change to the review stack in dependency order. Owners do not merge, arm auto-merge, or override a human review.
- [ ] On rebase, compare stable patch IDs and rerun CI/mergeability. Any changed patch gets a new full verdict. Changed base-sensitive behavior also gets a fresh live/performance run even when patch ID is unchanged.

### Boot recipe, for every live lane

Use the project's verified browser/CLI control skill. Before U01 supplies it, drive the actual startup/doctor commands in an isolated terminal and the health page in Playwright. Never replace public user interactions with internal state setters.

- [ ] Provision an isolated lane VM or owned runner instance at the exact unit head and record OS, architecture, runtime, fixture, and configuration digests.
- [ ] Run `pnpm install --frozen-lockfile`, `pnpm verify:boot -- --instance UNIT-LANE`, and `pnpm verify:doctor -- --instance UNIT-LANE`. U01 creates these wrappers with instance-specific ports, database, bucket prefix, email inbox, and cleanup handles.
- [ ] Use the feature map and public browser/CLI boundary. For real email, GitHub, model, and sandbox scenarios, use explicitly approved disposable accounts/resources. Fake failures are labelled fault injection, not external compatibility proof.
- [ ] Save evidence under `evidence/UNIT/lane-N/`, including `scenario.png`, terminal/API transcript, exact-head manifest, and assertions. Screenshots for CLI lanes capture the terminal result, with the textual transcript beside it.
- [ ] Run `pnpm verify:cleanup -- --instance UNIT-LANE` on success or failure. Confirm only lane-owned resources ended and evidence still exists. Do not kill by process name.

## Establish reproducible development and restore (U01)

**Depends on.** None. Stage S1. Requirements R03, R12, R17, R18. Acceptance AC11.

**Files.**

- [ ] Own the Operations, Storage, API, Web, Worker, Verification, Contracts modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Create the initial repository shape in Appendix D with pnpm workspaces, TypeScript strict mode, Vite, Hono, shared Zod contracts, Drizzle, Vitest, Playwright, and lint/format scripts.
- [ ] Add Compose plus Caddy, local SMTP/object-store substitutes, isolated fixture namespaces, and a read-only doctor CLI. Create the small managed-project fixture with the R12 CLI, pinned dual-platform image, and reviewed default-branch evidence/policy checks emitted by a project-dedicated checks-only App. Document human setup of that App, its disposable GitHub repository, and protections before U02 registration, so U06/U07 do not depend on an unbuilt publication broker or bypass readiness. Write a project-local verify-agora skill from the running entry points, not imagined selectors.
- [ ] Add encrypted base backup and WAL archive jobs, a separate-host restore command, epoch rotation, and a recorded operator runbook.
- [ ] Apply schema and API changes. Create schema version, deployment epoch, migration journal, and health contracts. Expose liveness and dependency readiness without provider startup. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Create the initial database and apply the same migrations on empty and restored volumes. Pin Node 22, PostgreSQL 16, package patches, and OCI digests in lockfiles. Save upgrade/rollback observations.

**You see.**

- [ ] An engineer starts a clean checkout, opens the browser health screen, stops it without residue, and restores its database/artifacts on another instance. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test configuration rejection, migration repeatability, doctor outcomes, artifact hashing, and restore integrity. Run `pnpm test -- --unit U01` and the shared lint/type/docs gates. Save `evidence/U01/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U01/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Boot a clean checkout on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U01/lane-1/scenario.png`. Pass when head presents a reachable health page and trunk absence is explicitly recorded.
- [ ] Lane 2. Start two isolated instances and drive the managed-project fixture's doctor/start/verify/evidence/stop contract in each. Read back its disposable repository protections and trusted checks. Save `evidence/U01/lane-2/scenario.png`. Pass when the fixture scenario passes, evidence survives cleanup, protections match, and ports, database names, and objects do not collide.
- [ ] Lane 3. Run doctor with PostgreSQL unavailable. Save `evidence/U01/lane-3/scenario.png`. Pass when exit is nonzero and no dependency is reported healthy.
- [ ] Lane 4. Run help and version with services stopped. Save `evidence/U01/lane-4/scenario.png`. Pass when neither command starts a service or contacts a provider.
- [ ] Lane 5. Migrate an empty database twice. Save `evidence/U01/lane-5/scenario.png`. Pass when second run changes no schema and both report the same version.
- [ ] Lane 6. Restore an encrypted backup into a separate host. Save `evidence/U01/lane-6/scenario.png`. Pass when known rows and artifact hashes match and old epoch grants deny.
- [ ] Lane 7. Interrupt WAL upload then recover. Save `evidence/U01/lane-7/scenario.png`. Pass when backup age alerts and recovery retains the measured loss window.
- [ ] Lane 8. Stop one instance while the other is active. Save `evidence/U01/lane-8/scenario.png`. Pass when only recorded owned processes stop and evidence survives.
- [ ] Lane 9. Inspect Compose networking and secrets. Save `evidence/U01/lane-9/scenario.png`. Pass when database is not publicly exposed and service logs contain no secret.
- [ ] Lane 10. Drive health UI at both viewports with keyboard. Save `evidence/U01/lane-10/scenario.png`. Pass when focus, error state, layout, and readiness are usable.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Startup to usable health page, migration time, and restore RPO/RTO. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U01 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U01/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail startup above 60 seconds, fixture migration above 30 seconds, RPO above 15 minutes, or RTO above four hours. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U01/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U01/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Invite developers into scoped project rooms (U02)

**Depends on.** U01. Stage S1. Requirements R01, R02, R04, R05, R14. Acceptance AC01, AC02.

**Files.**

- [ ] Own the Identity, Policy, Projects, Collaboration, Web modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Configure Better Auth magic links, strict verified-email invitation acceptance, custom closed roles, SMTP delivery, secure cookies, CSRF/Origin checks, and rate limits.
- [ ] Build project registration and explicit project grants. Create one room and inactive main-agent identity per project. Gate coding readiness on repository/environment checks rather than creating a repository.
- [ ] Build navigation, invitation acceptance, room access, and revocation behavior. Disable direct organization-management bypass routes.
- [ ] Apply schema and API changes. Add principal, workspace, invitation, membership, project registration, room, and role revision tables. Add invitation, acceptance, membership, and existing-project registration APIs. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Keep auth-library migrations separate from domain migrations. Bootstrap exactly one owner by a one-use console operation. Add composite project foreign keys and row-level policies before content. Save upgrade/rollback observations.

**You see.**

- [ ] Two invited humans sign in and see only rooms they may read; an owner can revoke a member and see active access end. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test invitation replay/expiry, matching verified email, last-owner protection, role intersection, cross-project references, and direct auth-route bypass denial. Run `pnpm test -- --unit U02` and the shared lint/type/docs gates. Save `evidence/U02/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U02/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Invite and accept a real second email on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U02/lane-1/scenario.png`. Pass when head creates one membership and trunk absence is recorded.
- [ ] Lane 2. Replay the invitation from a second session. Save `evidence/U02/lane-2/scenario.png`. Pass when no second membership or role escalation occurs.
- [ ] Lane 3. Use an expired or revoked invitation. Save `evidence/U02/lane-3/scenario.png`. Pass when acceptance fails with the correct reason.
- [ ] Lane 4. Accept with a different verified email. Save `evidence/U02/lane-4/scenario.png`. Pass when no membership is created.
- [ ] Lane 5. Try public sign-up and direct organization role endpoints. Save `evidence/U02/lane-5/scenario.png`. Pass when no alternative route grants entry or ownership.
- [ ] Lane 6. Grant observer at workspace and contributor at project. Save `evidence/U02/lane-6/scenario.png`. Pass when writes remain denied.
- [ ] Lane 7. Register two existing repositories for different member sets. Save `evidence/U02/lane-7/scenario.png`. Pass when room IDs and inactive main agents are unique and scoped.
- [ ] Lane 8. Access another project by deep link and API ID. Save `evidence/U02/lane-8/scenario.png`. Pass when content and existence-sensitive metadata stay hidden.
- [ ] Lane 9. Revoke a signed-in member during a request/subscription. Save `evidence/U02/lane-9/scenario.png`. Pass when later reads and frames deny without stale access.
- [ ] Lane 10. Use invitation and room navigation by keyboard and screen reader. Save `evidence/U02/lane-10/scenario.png`. Pass when labels, errors, and focus expose the full flow.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Invitation command latency and revocation-to-socket-close delay. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U02 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U02/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail command receipt above one second or connected-session revocation above one second after commit. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U02/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U02/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Deliver durable conversation and ordered reconnection (U03)

**Depends on.** U02. Stage S1. Requirements R02, R05, R07, R18. Acceptance AC02, AC03.

**Files.**

- [ ] Own the Collaboration, Storage, API, Web, Evidence modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Persist messages, thread replies, edits/tombstones, mentions, and unread cursors with one transaction per mutation and optimistic pending UI.
- [ ] Implement snapshot plus ordered committed event pump, replay/gap handling, 1-MiB socket bounds, receipt dedupe, and membership filtering on every delivery.
- [ ] Implement scoped search and bounded attachment quarantine/upload. Add safe Markdown, no external image autoload, and accessible thread panels.
- [ ] Apply schema and API changes. Add message revisions, room stream counters/events, client-message dedupe, thread roots, mentions, inbox cursors, and scoped FTS indexes. Add snapshot, message, edit, search, and WebSocket resume contracts. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Backfill stream counters transactionally; all message revisions remain immutable. Add FTS indexes without widening read scope. Old client protocol gets an explicit unsupported-version response. Save upgrade/rollback observations.

**You see.**

- [ ] Two developers converse and search the same ordered history after reconnecting without duplicate messages or lost edits. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test transaction rollback, concurrent counter allocation, edit window, root scope, duplicate body mismatch, cursor expiry, ACL-before-ranking, and artifact bounds. Run `pnpm test -- --unit U03` and the shared lint/type/docs gates. Save `evidence/U03/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U03/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Send and reply from two browsers on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U03/lane-1/scenario.png`. Pass when head has one matching ordered conversation and regression behavior remains intact.
- [ ] Lane 2. Send 100 simultaneous messages from both accounts. Save `evidence/U03/lane-2/scenario.png`. Pass when both timelines have identical unique sequence order.
- [ ] Lane 3. Drop the HTTP response then resend the same client-message ID. Save `evidence/U03/lane-3/scenario.png`. Pass when one message remains and original receipt returns.
- [ ] Lane 4. Disconnect one socket during edits and replies. Save `evidence/U03/lane-4/scenario.png`. Pass when replay applies every missing revision once.
- [ ] Lane 5. Reconnect below the retained cursor floor. Save `evidence/U03/lane-5/scenario.png`. Pass when snapshot refresh preserves current messages and unread state.
- [ ] Lane 6. Restart the service after database commit before broadcast. Save `evidence/U03/lane-6/scenario.png`. Pass when the event pump delivers the committed message.
- [ ] Lane 7. Run a deliberately slow socket consumer. Save `evidence/U03/lane-7/scenario.png`. Pass when bounded queue closes with a resumable cursor and other clients remain responsive.
- [ ] Lane 8. Search a private project term as an outsider. Save `evidence/U03/lane-8/scenario.png`. Pass when no text, title, count, or snippet leaks.
- [ ] Lane 9. Upload an oversized file and active HTML attachment. Save `evidence/U03/lane-9/scenario.png`. Pass when limits enforce and no active preview executes.
- [ ] Lane 10. Inspect keyboard navigation, both viewports, reduced motion, and screen reader. Save `evidence/U03/lane-10/scenario.png`. Pass when timeline, thread panel, empty states, and errors remain readable.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Message acknowledgment/fan-out, search p95, resume time, and initial JavaScript bytes. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U03 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U03/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail server acknowledgment above 300 ms, fan-out above one second, search above 500 ms, 1000-event resume above two seconds, or compressed initial JavaScript above 350 KiB. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U03/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U03/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Answer questions with visible read-only agent sessions (U04)

**Depends on.** U03. Stage S1. Requirements R02, R04, R05, R06, R16. Acceptance AC04, AC10.

**Files.**

- [ ] Own the Agents, Policy, Collaboration, Web, Control modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Compile explicit thread and selected-record context with audience intersection, trust labels, source revisions, token limits, and visible omissions.
- [ ] Add the workspace-owned OpenAI Responses adapter, exact model configuration, provider/data approval checks, cost reservation, timeout accounting, and read-only record tools.
- [ ] Render agent status/action/question/result/error cards with citations, initial acknowledgment deadline, stop, stale liveness, and plain-text external links.
- [ ] Apply schema and API changes. Add profile/version, context bundle, answer session, provider-call journal, typed activity, and question-budget reservation. Add question, activity snapshot, and cancellation APIs. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Append activity types under protocol v1 with capability negotiation. Existing message records remain unchanged; reference immutable message revisions. Save upgrade/rollback observations.

**You see.**

- [ ] A developer asks the center about a recorded decision and receives a cited answer without giving the agent execution or private-room authority. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test audience intersection, context truncation, citation IDs, provider failure, token/cost caps, activity schemas, timers, and injection deny fixtures. Run `pnpm test -- --unit U04` and the shared lint/type/docs gates. Save `evidence/U04/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U04/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Ask a real-provider question on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U04/lane-1/scenario.png`. Pass when head returns an attributed answer linked to the exact decision revision.
- [ ] Lane 2. Ask from general room for a project-only fact. Save `evidence/U04/lane-2/scenario.png`. Pass when the answer refuses that disclosure and offers the correct project context.
- [ ] Lane 3. Exceed context bounds with a long thread. Save `evidence/U04/lane-3/scenario.png`. Pass when omissions are named and task launch remains blocked until narrowed.
- [ ] Lane 4. Edit a source after the answer. Save `evidence/U04/lane-4/scenario.png`. Pass when the citation still resolves its pinned revision and shows current-source change.
- [ ] Lane 5. Inject a request to launch shell or change roles. Save `evidence/U04/lane-5/scenario.png`. Pass when no consequential tool runs and denial evidence exists.
- [ ] Lane 6. Render a model-generated exfiltration URL and HTML. Save `evidence/U04/lane-6/scenario.png`. Pass when neither becomes active content or auto-loaded network traffic.
- [ ] Lane 7. Delay the provider and send no initial activity. Save `evidence/U04/lane-7/scenario.png`. Pass when unresponsive/stale presentation follows specified timers without fake progress.
- [ ] Lane 8. Cancel during a real streamed answer. Save `evidence/U04/lane-8/scenario.png`. Pass when new provider output is discarded and the session becomes cancelled.
- [ ] Lane 9. Force timeout and unknown billing. Save `evidence/U04/lane-9/scenario.png`. Pass when one call is journaled, no blind repeat occurs, and full reservation remains.
- [ ] Lane 10. Inspect cards and citations with keyboard/screen reader. Save `evidence/U04/lane-10/scenario.png`. Pass when live regions do not narrate every token and stop remains reachable.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Question receipt, first state visibility, and unaffected chat p95 under model streaming. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U04 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U04/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail receipt above one second, initial state above 10 seconds, or chat above R18 limits. Provider generation time is recorded separately, never hidden in the server metric. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U04/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U04/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Create owned tasks with fenced runs and approvals (U05)

**Depends on.** U04. Stage S1. Requirements R05, R06, R07, R14, R17. Acceptance AC05, AC06, AC11.

**Files.**

- [ ] Own the Control, Policy, Storage, Web modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Implement exhaustive state reducers and transactional command receipts, scope-bound approvals, one-use effect claims, lease scanner, and audit events.
- [ ] Build task proposal/launch UI with intent, acceptance, exact placement, payer, environment, scope, and budget preview. Mentions may propose but cannot launch.
- [ ] Add transactional budget reservations, bounded queue/input/wall deadlines, cancellation/retry semantics, and current-state projections separate from history.
- [ ] Apply schema and API changes. Add task DAG, immutable RunSpec, run attempts, leases/fences, approvals, command receipts, effect outbox, and budget ledger. Add task, launch, claim, prompt, cancel, retry, and decision contracts. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Create partial unique indexes for one nonterminal run per task and unique effect keys. Reject cyclic/cross-project task edges at write time. Save upgrade/rollback observations.

**You see.**

- [ ] A human confirms one bounded task; fake competing workers cannot both own it, and expired authority stays unusable. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test every legal/illegal transition, fake-clock deadlines, claim races, late fences, stale approval invalidation, duplicate commands, DAG cycles, and concurrent budget reservations. Run `pnpm test -- --unit U05` and the shared lint/type/docs gates. Save `evidence/U05/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U05/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Launch a confirmed task on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U05/lane-1/scenario.png`. Pass when head creates one task/run and the prior read-only flow stays intact.
- [ ] Lane 2. Post an imperative agent mention. Save `evidence/U05/lane-2/scenario.png`. Pass when only a proposal appears and no lease or provider call starts.
- [ ] Lane 3. Race two eligible fake workers for one task. Save `evidence/U05/lane-3/scenario.png`. Pass when one claim wins and one fence can write.
- [ ] Lane 4. Expire a lease and submit its completion. Save `evidence/U05/lane-4/scenario.png`. Pass when completion is rejected and the task is blocked for human recovery.
- [ ] Lane 5. Change role or head while an approval is pending. Save `evidence/U05/lane-5/scenario.png`. Pass when old approval cannot be consumed.
- [ ] Lane 6. Replay an already consumed approval with a new effect. Save `evidence/U05/lane-6/scenario.png`. Pass when the second effect is denied.
- [ ] Lane 7. Cancel during a leased run. Save `evidence/U05/lane-7/scenario.png`. Pass when capability revokes before cleanup and late events deny.
- [ ] Lane 8. Retry a lost run. Save `evidence/U05/lane-8/scenario.png`. Pass when new run/session/environment identity and fence preserve old history.
- [ ] Lane 9. Launch simultaneous runs near the project budget. Save `evidence/U05/lane-9/scenario.png`. Pass when reservation totals never exceed the approved cap.
- [ ] Lane 10. Read task history and current snapshot after restart. Save `evidence/U05/lane-10/scenario.png`. Pass when current state agrees with committed transitions rather than the last prose activity.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Command/claim latency, scanner lag, and cancellation revocation. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U05 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U05/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail commands above one second, expiry detection above five seconds after deadline, or cancellation revocation above one second. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U05/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U05/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Connect owner-bound workers and prepare clean worktrees (U06)

**Depends on.** U05. Stage S1. Requirements R04, R06, R07, R08, R15. Acceptance AC05, AC06, AC07.

**Files.**

- [ ] Own the Worker, Identity, Execution, Control modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Implement five-minute device enrollment, public-key proof, rotating tokens, owner/repository binding, foreground outbound connection, and read-only doctor.
- [ ] Create private bare mirrors and clean task worktrees at the requested remote SHA, validate paths/remotes, sanitize Git environment/hooks, allocate process/fixture/port namespaces, and maintain run owner locks.
- [ ] Implement heartbeat/spool replay, disconnect stop deadlines, owner-only manual prepare, and non-destructive retained-work recovery.
- [ ] Apply schema and API changes. Add enrollment/device grant, machine registration, repository registration, worker spool cursor, cleanup handles, and publication-capability wire types. Add worker handshake and claim endpoints. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Version worker protocol and reject incompatible capabilities before claim. Existing queued runs keep explicit placement and never migrate automatically. Save upgrade/rollback observations.

**You see.**

- [ ] The launching developer connects a worker without inbound ports and receives an isolated task worktree while their normal checkout stays unchanged. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test challenge replay, refresh reuse, wrong owner/repository, unsafe remote forms, branch collisions, symlink paths, lock ownership, spool dedupe, and process-start identity. Run `pnpm test -- --unit U06` and the shared lint/type/docs gates. Save `evidence/U06/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U06/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Enroll a worker and prepare a task on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U06/lane-1/scenario.png`. Pass when head allocates one owned worktree without changing the normal checkout.
- [ ] Lane 2. Request another person's named machine. Save `evidence/U06/lane-2/scenario.png`. Pass when claim denies with no local process.
- [ ] Lane 3. Request a machine registered for the wrong repository. Save `evidence/U06/lane-3/scenario.png`. Pass when the request fails instead of using another checkout.
- [ ] Lane 4. Launch against a registered but offline machine. Save `evidence/U06/lane-4/scenario.png`. Pass when waiting reason remains visible and expiry never falls back.
- [ ] Lane 5. Replay enrollment and a rotated refresh credential. Save `evidence/U06/lane-5/scenario.png`. Pass when both fail without a new usable device grant.
- [ ] Lane 6. Keep the developer checkout dirty before launch. Save `evidence/U06/lane-6/scenario.png`. Pass when its files and refs remain byte-identical after task preparation.
- [ ] Lane 7. Prepare two tasks and inspect namespaces. Save `evidence/U06/lane-7/scenario.png`. Pass when branches, writable directories, ports, and fixtures do not overlap.
- [ ] Lane 8. Register an unsafe remote or path escape. Save `evidence/U06/lane-8/scenario.png`. Pass when doctor/registration rejects it before Git execution.
- [ ] Lane 9. Drop connectivity during a command and reconnect after expiry. Save `evidence/U06/lane-9/scenario.png`. Pass when worker stops by deadline and late data is historical only.
- [ ] Lane 10. Leave uncommitted work then request cleanup. Save `evidence/U06/lane-10/scenario.png`. Pass when no force deletion occurs and only the owner can export/resolve it.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Enrollment exchange and warm-mirror worktree preparation, plus disconnect stop time. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U06 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U06/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail exchange above one second, warm fixture preparation above 10 seconds, or process shutdown beyond 60 seconds after lost renewal. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U06/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U06/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Execute bounded local work and collect behavior evidence (U07)

**Depends on.** U06. Stage S1. Requirements R08, R09, R11, R12, R16. Acceptance AC07, AC08, AC10.

**Files.**

- [ ] Own the Execution, Worker, Agents, Evidence, Verification modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Implement the restricted Dev Container profile and rootless Linux execution adapter for Linux/macOS hosts, with no host hooks, home/socket/Git mounts, unsafe labels, or default egress.
- [ ] Implement agora-headless-v1 with a host-owned model loop and fixed read/list/patch/environment-exec tools. Provider credentials stay outside execution.
- [ ] Implement project doctor/start/scenarios/verify/evidence/stop, immutable candidate commits, exact-head manifests, artifact scans, signatures, and honest unavailable results.
- [ ] Apply schema and API changes. Add environment versions/instances, registered project commands, evidence manifests, artifact quarantine, signatures, and producer trust classes. Add upload/finalize/complete APIs. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Activate a project only after environment and verification conformance. Manifests use agora.evidence/v1 and unknown required fields reject. Save upgrade/rollback observations.

**You see.**

- [ ] One real provider-backed task changes the fixture application, proves its user flow, and returns digest-verified evidence without host credential access. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test effective image metadata policy, tool/path schemas, output caps, exit/outcome consistency, manifest head/digest mismatches, quarantine, and cleanup ownership. Run `pnpm test -- --unit U07` and the shared lint/type/docs gates. Save `evidence/U07/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U07/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Fix a bounded fixture-app behavior on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U07/lane-1/scenario.png`. Pass when head produces the literal requested user result and records exact evidence.
- [ ] Lane 2. Try host home, SSH agent, Docker socket, and shared Git reads. Save `evidence/U07/lane-2/scenario.png`. Pass when all deny and developer checkout stays unchanged.
- [ ] Lane 3. Use initializeCommand or unsafe image-label metadata. Save `evidence/U07/lane-3/scenario.png`. Pass when environment activation fails before host execution.
- [ ] Lane 4. Attempt metadata/private-range and unapproved internet access. Save `evidence/U07/lane-4/scenario.png`. Pass when no application response or destination-side request reaches denied targets.
- [ ] Lane 5. Run a project check on an unavailable platform. Save `evidence/U07/lane-5/scenario.png`. Pass when manifest says unavailable and the run cannot succeed.
- [ ] Lane 6. Mutate the candidate after verification. Save `evidence/U07/lane-6/scenario.png`. Pass when old exact-head evidence cannot satisfy completion.
- [ ] Lane 7. Upload an altered digest, unsafe archive, or active SVG. Save `evidence/U07/lane-7/scenario.png`. Pass when quarantine prevents evidence promotion and active rendering.
- [ ] Lane 8. Cancel the agent during a long child process. Save `evidence/U07/lane-8/scenario.png`. Pass when owned process group exits and cleanup receipt is accurate.
- [ ] Lane 9. Replay signed evidence from another project/fence. Save `evidence/U07/lane-9/scenario.png`. Pass when scope/signature validation denies it.
- [ ] Lane 10. Drive project verification skill end to end and clean up. Save `evidence/U07/lane-10/scenario.png`. Pass when visible result and persisted side effect match while proof files survive.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Tool dispatch overhead, artifact finalization, and chat responsiveness during a run. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U07 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U07/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail local dispatch overhead above 100 ms, 10-MiB fixture artifact finalization above five seconds, or chat above R18 limits. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U07/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U07/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Publish approved drafts and enforce independent review (U08)

**Depends on.** U07. Stage S1. Requirements R07, R11, R12, R14, R15. Acceptance AC09.

**Files.**

- [ ] Own the Control, Policy, Integrations, Worker, Evidence, Web modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Implement changed-path overlap detection, current-base checks, size rationale/exception, risk floors, and stale-evidence invalidation.
- [ ] Add non-author exact-head publication approval and distinct local credential-owner confirmation. Host Git broker pushes only the task branch and opens only a draft.
- [ ] Add trusted default-branch CI evidence/policy gates, exact checks-only App producer and workflow validation, remote reconciliation, review UI, human-merge observation, and post-merge smoke. Keep prepublication checks separate from postpublication CI, and issue publication capabilities independently of the terminal run's released execution lease.
- [ ] Apply schema and API changes. Add publication state/effect receipts, overlap reviews, remote read-back facts, and post-merge scenario references. Add publication request/claim/receipt APIs. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Store immutable repository identity and protection observations at onboarding. Existing evidence remains owner-attested until trusted CI reports exact-head checks. Save upgrade/rollback observations.

**You see.**

- [ ] The second developer approves an exact result, the owner publishes a draft, and GitHub blocks merge until independent review and trusted current-head checks pass. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test self-approval, changed-head/policy races, consumed capability replay, overlap clearance, human takeover, uncertain push/PR creation, and skipped-check failure mapping. Run `pnpm test -- --unit U08` and the shared lint/type/docs gates. Save `evidence/U08/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U08/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Publish an approved fixture draft on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U08/lane-1/scenario.png`. Pass when head records exact remote branch/head/draft and trunk absence is disclosed.
- [ ] Lane 2. Attempt publication without approval and by self-approval. Save `evidence/U08/lane-2/scenario.png`. Pass when no GitHub write occurs.
- [ ] Lane 3. Decline local credential use after maintainer approval. Save `evidence/U08/lane-3/scenario.png`. Pass when no credential is used and no branch is pushed.
- [ ] Lane 4. Change head/base/policy after approval. Save `evidence/U08/lane-4/scenario.png`. Pass when publication blocks until new evidence and approval.
- [ ] Lane 5. Publish overlapping changes from two tasks. Save `evidence/U08/lane-5/scenario.png`. Pass when later publication waits for overlap review and fresh-base verification.
- [ ] Lane 6. Add human commits to the remote branch. Save `evidence/U08/lane-6/scenario.png`. Pass when broker refuses to overwrite or force-push them.
- [ ] Lane 7. Lose response after push and after draft creation. Save `evidence/U08/lane-7/scenario.png`. Pass when reconciliation finds exactly one matching effect without duplicate draft.
- [ ] Lane 8. Make a required check skipped, neutral, unavailable, or wrong-head. Save `evidence/U08/lane-8/scenario.png`. Pass when aggregate fails and protected merge remains blocked.
- [ ] Lane 9. Try to merge as the author or without latest review. Save `evidence/U08/lane-9/scenario.png`. Pass when GitHub requires the independent human and current checks.
- [ ] Lane 10. Perform human merge then run post-merge scenario. Save `evidence/U08/lane-10/scenario.png`. Pass when task completes only after observed merge SHA and passing user behavior.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Publication preflight latency excluding forge calls and reconciliation convergence. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U08 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U08/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail preflight above one second or observed-effect reconciliation above 30 seconds after GitHub becomes available. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U08/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U08/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Prove the first release across two accounts and machines (U09)

**Depends on.** U08. Stage S1. Requirements R01, R12, R15, R16, R17, R18, R19. Acceptance AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10, AC11, AC12.

**Files.**

- [ ] Own the Verification, Operations, Web, Worker, all release owners modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Complete platform feature map and AC01 through AC12 live scenarios with two real verified accounts on two distinct machines and approved disposable repository.
- [ ] Run denial, crash, injection, exact-head, restore, cost, accessibility, and reference-load suites. Repair product gaps rather than documenting false passes.
- [ ] Create the S1 release runbook and evidence index with tested versions, residual trust limits, operator rollback, and explicit stage-two disabled controls.
- [ ] Apply schema and API changes. No new product schema. Add versioned acceptance scenario inventory, fixture identities, release evidence index, and signed gate results. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Rehearse fresh install and upgrade from the prior unit head; test restore and client/worker compatibility. No production data migration during test. Save upgrade/rollback observations.

**You see.**

- [ ] Two developers complete the entire conversation-to-local-task-to-human-reviewed-result workflow and an operator can restore the center. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Run every unit/integration/contract suite plus documentation and scenario-map drift checks; no flaky retry-until-green allowance. Run `pnpm test -- --unit U09` and the shared lint/type/docs gates. Save `evidence/U09/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U09/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Run LV12 complete two-person story on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U09/lane-1/scenario.png`. Pass when all user-visible end states pass and stage-two controls remain disabled.
- [ ] Lane 2. Run LV01 and LV02 with live email/accounts. Save `evidence/U09/lane-2/scenario.png`. Pass when invitation, scope, revocation, room/search and observer denials pass.
- [ ] Lane 3. Run LV03 under concurrent posting and service restart. Save `evidence/U09/lane-3/scenario.png`. Pass when both machines converge without loss or duplicates.
- [ ] Lane 4. Run LV04 and LV10 using real model output and hostile fixtures. Save `evidence/U09/lane-4/scenario.png`. Pass when citations and scope are honest and no authority or active exfiltration link appears.
- [ ] Lane 5. Run LV05 wrong-owner/repository and offline placement. Save `evidence/U09/lane-5/scenario.png`. Pass when no machine or cloud fallback occurs.
- [ ] Lane 6. Run LV06 lease race/loss/cancel/retry on real workers. Save `evidence/U09/lane-6/scenario.png`. Pass when one current fence owns the task and old publication fails.
- [ ] Lane 7. Run LV07 and LV08 against the actual fixture application. Save `evidence/U09/lane-7/scenario.png`. Pass when isolation holds and wrong/unavailable/missing evidence blocks.
- [ ] Lane 8. Run LV09 using approved disposable GitHub resources. Save `evidence/U09/lane-8/scenario.png`. Pass when non-author publication/review and human merge gates hold.
- [ ] Lane 9. Run LV11 with backup restore and concurrent budget exhaustion. Save `evidence/U09/lane-9/scenario.png`. Pass when RPO/RTO pass, old epoch denies, and reservations never exceed caps.
- [ ] Lane 10. Run keyboard/screen-reader/viewports/video and R18 load probes. Save `evidence/U09/lane-10/scenario.png`. Pass when all accessibility and performance budgets pass with retained artifacts.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. All R18 S1 budgets, restore RPO/RTO, and reference-load error rate. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U09 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U09/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail any R18 S1 budget, any authorization error, any lost/duplicate durable record, or any missing live acceptance scenario. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U09/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U09/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Provision a private project from a conversation (U10)

**Depends on.** U09. Stage S2 later-stage. Requirements R02, R04, R07, R10, R14, R15. Acceptance AC20.

**Files.**

- [ ] Own the Projects, Integrations, Policy, Control, Web modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Build the proposal/authorization UI and separately scoped GitHub admin and normal-operation grants with immutable account linking.
- [ ] Implement journaled repository creation, approved template seeding, ruleset/check read-back, named membership, and repair behavior after each external step.
- [ ] Implement signed GitHub webhook ingestion, delivery-ID dedupe, async reconciliation, and project pause/resume/archive. Keep activation blocked until image/verification U11/U12 qualify.
- [ ] Apply schema and API changes. Add project proposals, immutable authorization digests, provisioning steps, integration installations, external IDs/markers, webhook inbox, and repair states. Add propose/authorize/reconcile APIs. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Existing registered projects retain repository IDs and room/main-agent identities. Adopt the App only through an explicit installation/link command; no inferred migration. Save upgrade/rollback observations.

**You see.**

- [ ] An owner authorizes a private project from a thread and sees one repository and room, with truthful onboarding or repair state. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test every provisioning crash boundary, foreign name collision, expired consent, wrong installation, duplicate delivery, signature rejection, and archive write denial. Run `pnpm test -- --unit U10` and the shared lint/type/docs gates. Save `evidence/U10/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U10/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Create a disposable project from chat on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U10/lane-1/scenario.png`. Pass when head produces one proposed/authorized project with linked room and inactive main identity.
- [ ] Lane 2. Send proposal text without clicking authorize. Save `evidence/U10/lane-2/scenario.png`. Pass when no repository or integration write occurs.
- [ ] Lane 3. Crash after GitHub creates repository before receipt storage. Save `evidence/U10/lane-3/scenario.png`. Pass when retry adopts only the matching marker/ID and creates no duplicate.
- [ ] Lane 4. Occupy the requested name with an unrelated repository. Save `evidence/U10/lane-4/scenario.png`. Pass when repair_required appears and no foreign resource changes.
- [ ] Lane 5. Use a wrong GitHub installation or identity link. Save `evidence/U10/lane-5/scenario.png`. Pass when the exact-resource action denies.
- [ ] Lane 6. Expire authorization before an unfinished new effect. Save `evidence/U10/lane-6/scenario.png`. Pass when existing facts reconcile but no new write starts.
- [ ] Lane 7. Replay signed webhook then forge signature. Save `evidence/U10/lane-7/scenario.png`. Pass when one authentic record persists and forgery denies.
- [ ] Lane 8. Remove private ruleset entitlement or required-check support. Save `evidence/U10/lane-8/scenario.png`. Pass when project remains onboarding-blocked.
- [ ] Lane 9. Pause/archive while work is queued. Save `evidence/U10/lane-9/scenario.png`. Pass when new leases stop and record remains readable without repository deletion.
- [ ] Lane 10. Inspect proposal/repair UI with keyboard and both viewports. Save `evidence/U10/lane-10/scenario.png`. Pass when exact names, scopes, costs, errors, and repair actions are understandable.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Proposal/authorization receipt and provisioning reconciliation excluding remote outages. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U10 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U10/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail receipt above one second or reconciliation above 60 seconds after the external resource is observable. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U10/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U10/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Build and qualify declarative project images (U11)

**Depends on.** U10. Stage S2 later-stage. Requirements R09, R10, R12, R16. Acceptance AC21.

**Files.**

- [ ] Own the Projects, Execution, Evidence, Operations modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Implement safe Dev Container effective-config resolution, reviewed Feature/base-image pinning, separate builder VM, and exact build approval.
- [ ] Export immutable OCI images with SBOM, scans, provenance, command receipts, and bounded logs; key caches by all declared inputs.
- [ ] Run lifecycle readiness plus project doctor/scenario against the cold image. Block activation on failed setup rather than continuing degraded.
- [ ] Apply schema and API changes. Add image build operation, environment version, OCI/template mapping, provenance/SBOM and activation approval. Add build/status/activate contracts. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. S1 owner-approved images remain pinned; never mutate an active environment version. New images activate after a cold conformance run. Save upgrade/rollback observations.

**You see.**

- [ ] A maintainer builds an approved project environment and can reproduce it after deleting its cache. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test forbidden host options including labels, unresolved image/Feature digests, build-context escape, cache keys, approval expiry, scan failures, and readiness outcomes. Run `pnpm test -- --unit U11` and the shared lint/type/docs gates. Save `evidence/U11/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U11/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Build fixture OCI from approved definition on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U11/lane-1/scenario.png`. Pass when head emits digest/provenance and trunk missing capability is disclosed.
- [ ] Lane 2. Delete caches and rebuild the same approved inputs. Save `evidence/U11/lane-2/scenario.png`. Pass when required commands and application assertions match.
- [ ] Lane 3. Inject initializeCommand and privileged options through image labels. Save `evidence/U11/lane-3/scenario.png`. Pass when build/activation rejects before host execution.
- [ ] Lane 4. Use unpinned Feature or base image. Save `evidence/U11/lane-4/scenario.png`. Pass when activation fails with a precise validation reason.
- [ ] Lane 5. Escape the repository build context with a symlink. Save `evidence/U11/lane-5/scenario.png`. Pass when builder exports no outside file.
- [ ] Lane 6. Place a secret in the build output. Save `evidence/U11/lane-6/scenario.png`. Pass when scan quarantines the image and no runtime activation occurs.
- [ ] Lane 7. Fail post-create readiness. Save `evidence/U11/lane-7/scenario.png`. Pass when later lifecycle commands and agent start do not run.
- [ ] Lane 8. Change policy or lockfile while build is pending. Save `evidence/U11/lane-8/scenario.png`. Pass when old output cannot activate under the new digest.
- [ ] Lane 9. Crash builder during upload then reconcile. Save `evidence/U11/lane-9/scenario.png`. Pass when one build identity and immutable image mapping survive.
- [ ] Lane 10. Run the project skill on the resulting cold image. Save `evidence/U11/lane-10/scenario.png`. Pass when behavior passes and cleanup preserves evidence.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Fixture cold build duration and warm-cache benefit reported without a required speedup. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U11 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U11/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail cold fixture build above 20 minutes or any cached/cold behavior mismatch. Both revisions report builder host cost and image size. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U11/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U11/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Execute and recover one isolated cloud attempt (U12)

**Depends on.** U11. Stage S2 later-stage. Requirements R06, R07, R09, R15, R16, R17. Acceptance AC21, AC24.

**Files.**

- [ ] Own the Execution, Worker cloud mode, Control, Integrations, Operations modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Implement E2B OCI-to-template mapping and create/inspect/exec/export/destroy adapter with host-owned loop, outside-guest credentials, and account/region conformance.
- [ ] Enforce per-attempt microVM, default-deny external egress, forbidden-range allow-rule rejection, resource/TTL limits, and no public preview ports.
- [ ] Implement allocation timeout reconciliation, provider TTL, cost reconciliation, quarantined exports, and exact-ID reaping with unknown cleanup visible.
- [ ] Apply schema and API changes. Add cloud pool registration, provider resource IDs, allocation operation IDs, desired/observed lifecycle, TTL/cost reservations, and cloud cleanup receipts. Placement union already exists. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Add the e2b capability without changing local RunSpec semantics. Old workers reject unsupported cloud placement rather than guessing. Save upgrade/rollback observations.

**You see.**

- [ ] A human launches a cloud task in a fresh microVM and sees evidence and confirmed destruction, or a precise unresolved cleanup state. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test allocation effect keys, ambiguous provider response, capability isolation, TTL/reservation logic, egress policy compilation, and repeated destroy semantics. Run `pnpm test -- --unit U12` and the shared lint/type/docs gates. Save `evidence/U12/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U12/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Launch one approved cloud run on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U12/lane-1/scenario.png`. Pass when head shows one fresh microVM and does not change local placement behavior.
- [ ] Lane 2. Import the pinned OCI image into the selected E2B account/region. Save `evidence/U12/lane-2/scenario.png`. Pass when reported mapping and cold runtime fixture agree with the approved image.
- [ ] Lane 3. Attempt forbidden destinations with application-level probes. Save `evidence/U12/lane-3/scenario.png`. Pass when no HTTP/TLS/protocol response or destination request succeeds.
- [ ] Lane 4. Add an allow rule overlapping a forbidden range or wildcard escape. Save `evidence/U12/lane-4/scenario.png`. Pass when policy rejects despite provider allow-over-deny precedence.
- [ ] Lane 5. Read provider/GitHub/center credentials inside guest. Save `evidence/U12/lane-5/scenario.png`. Pass when no raw credential or administrative capability is available.
- [ ] Lane 6. Allocate two project attempts and write sentinel files. Save `evidence/U12/lane-6/scenario.png`. Pass when neither sees the other's files, processes, or fixtures.
- [ ] Lane 7. Lose allocation response then restart runner. Save `evidence/U12/lane-7/scenario.png`. Pass when reconciler finds one owned external resource or blocks without duplicate allocation.
- [ ] Lane 8. Lose runner while guest runs past lease expiry. Save `evidence/U12/lane-8/scenario.png`. Pass when capability stops and provider hard TTL bounds compute.
- [ ] Lane 9. Make destroy unavailable then restore access. Save `evidence/U12/lane-9/scenario.png`. Pass when UI says unconfirmed and later exact-ID read-back proves destruction.
- [ ] Lane 10. Export malicious paths, oversized logs, and secret-bearing artifacts. Save `evidence/U12/lane-10/scenario.png`. Pass when quarantine blocks release and resource limits preserve center responsiveness.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Built-template sandbox readiness, cancel/reaper latency, and observed cloud cost. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U12 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U12/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail ready p95 above 120 seconds, capability revocation above one second, or live resource beyond hard TTL plus two-minute cleanup grace without an explicit incident. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U12/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U12/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Activate persistent project agents and reviewed knowledge (U13)

**Depends on.** U10, U12. Stage S2 later-stage. Requirements R04, R05, R10, R13, R14. Acceptance AC22.

**Files.**

- [ ] Own the Agents, Knowledge, Projects, Policy, Web modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Implement human knowledge activation with provenance, applicability, regression or non-executable rationale, and 90-day review deadline.
- [ ] Implement deterministic invalidation, conflict exclusion, ACL-before-FTS context compilation, and versioned repository import/export through ordinary contribution workflow.
- [ ] Activate project-main sessions that reconstruct approved context and propose task dependencies without launching or approving.
- [ ] Apply schema and API changes. Activate project-main profile/session context and add knowledge versions, evidence edges, validity, review dates, conflict/supersession links, and human decisions. Add propose/activate/dispute/revoke APIs. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Reuse inactive S1 main-agent identities and existing decision records. Imported repository docs begin proposed, never active automatically. Save upgrade/rollback observations.

**You see.**

- [ ] A project main agent answers after restart with cited approved decisions, and stale/disputed knowledge no longer enters operational context. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test activation roles, immutable versions, applicability filters, conflict precedence, source redaction/deletion, deadline expiry, and prohibited task auto-launch. Run `pnpm test -- --unit U13` and the shared lint/type/docs gates. Save `evidence/U13/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U13/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Ask project main after service restart on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U13/lane-1/scenario.png`. Pass when same stable identity cites approved durable records rather than private process memory.
- [ ] Lane 2. Propose a lesson with no evidence. Save `evidence/U13/lane-2/scenario.png`. Pass when it remains inactive and absent from operational context.
- [ ] Lane 3. Activate with a maintainer and regression receipt. Save `evidence/U13/lane-3/scenario.png`. Pass when the new version appears with its evidence and scope.
- [ ] Lane 4. Change a declared dependency/path/fixture. Save `evidence/U13/lane-4/scenario.png`. Pass when matching knowledge becomes stale before the next context bundle.
- [ ] Lane 5. Expire review date. Save `evidence/U13/lane-5/scenario.png`. Pass when ordinary retrieval excludes the record but history remains.
- [ ] Lane 6. Propose equal-scope contradictory claims. Save `evidence/U13/lane-6/scenario.png`. Pass when both remain visible as disputed and neither silently wins by recency.
- [ ] Lane 7. Redact a source message or evidence artifact. Save `evidence/U13/lane-7/scenario.png`. Pass when dependent records invalidate and new contexts cannot cite removed content.
- [ ] Lane 8. Ask project main to launch on another member's machine. Save `evidence/U13/lane-8/scenario.png`. Pass when it creates at most a proposal and cannot acquire authority.
- [ ] Lane 9. Import repository docs then export an approved change. Save `evidence/U13/lane-9/scenario.png`. Pass when import is proposed and export follows the normal evidence/approval workflow.
- [ ] Lane 10. Search across two project contexts with different memberships. Save `evidence/U13/lane-10/scenario.png`. Pass when no record, snippet, or model answer crosses the audience boundary.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Authorized knowledge retrieval p95 and main-agent context compilation. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U13 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U13/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail retrieval above 500 ms or context compilation above one second on a 10000-record fixture; no cross-scope result is tolerable. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U13/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U13/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Prove local and cloud execution parity (U14)

**Depends on.** U12, U13. Stage S2 later-stage. Requirements R08, R09, R11, R12, R15, R19. Acceptance AC23, AC24.

**Files.**

- [ ] Own the Verification, Execution, Worker, Evidence, Integrations modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Run the same fixture goal/base/policy/context on both placements and compare required assertions, manifest subjects, deny behavior, and approval gates.
- [ ] Complete cloud patch-to-candidate broker, fresh independent verification, approved App publication, current-head read-back, and human review/merge.
- [ ] Exercise cancel/loss/retry, overlapping changes, stale approvals, unavailable checks, and cold recovery without snapshots on both placements.
- [ ] Apply schema and API changes. No new authority model. Add placement conformance scenario records and equivalent assertion/manifest comparison reports. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Validate protocol and manifest compatibility with S1 workers. Any changed contract requires an explicit version, not placement-specific hidden fields. Save upgrade/rollback observations.

**You see.**

- [ ] A developer chooses local or cloud explicitly and receives the same trustworthy review contract, while placement-specific trust and cost remain visible. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test canonical RunSpec compatibility, artifact normalization, broker patch validation, exact candidate verification, and placement-independent policy decisions. Run `pnpm test -- --unit U14` and the shared lint/type/docs gates. Save `evidence/U14/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U14/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Run matching local/cloud fixture tasks on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U14/lane-1/scenario.png`. Pass when required outcomes and manifest subjects agree without claiming identical generated patches.
- [ ] Lane 2. Publish a cloud result through the external broker. Save `evidence/U14/lane-2/scenario.png`. Pass when guest never receives write credential and exact candidate is independently checked.
- [ ] Lane 3. Try local-to-cloud fallback during a disconnect. Save `evidence/U14/lane-3/scenario.png`. Pass when no new placement starts without fresh human launch.
- [ ] Lane 4. Cancel the same long command on each placement. Save `evidence/U14/lane-4/scenario.png`. Pass when revocation and cleanup outcomes follow one contract.
- [ ] Lane 5. Expire lease then retry each placement. Save `evidence/U14/lane-5/scenario.png`. Pass when new environment/fence owns work and old output stays historical.
- [ ] Lane 6. Inject unavailable and wrong-head prepublication checks into both paths, then failing postpublication CI. Save `evidence/U14/lane-6/scenario.png`. Pass when the first case blocks draft publication identically and the second permits the draft but blocks review-ready and merge.
- [ ] Lane 7. Produce overlapping changes from local and cloud. Save `evidence/U14/lane-7/scenario.png`. Pass when overlap and rebase gates treat them equally.
- [ ] Lane 8. Apply a malicious cloud patch with escaping paths. Save `evidence/U14/lane-8/scenario.png`. Pass when broker rejects it without modifying the host checkout.
- [ ] Lane 9. Delete all snapshot caches and recover a task fresh. Save `evidence/U14/lane-9/scenario.png`. Pass when declarative environment plus durable records suffice.
- [ ] Lane 10. Inspect both review screens and cost records. Save `evidence/U14/lane-10/scenario.png`. Pass when trust class, location, evidence, payer, and human gates are explicit.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Shared control-path overhead and per-placement preparation/verification times. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U14 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U14/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail common control path above R18 limits or cloud readiness above 120 seconds. Do not compare unlike local/cloud startup ratios. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U14/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U14/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Capture observer proposals and promote reviewed knowledge (U15)

**Depends on.** U14. Stage S3 later-stage. Requirements R05, R13, R14, R16. Acceptance AC30.

**Files.**

- [ ] Own the Knowledge, Agents, Control, Web modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Implement opt-in visible observer batches bounded by 20 messages/five minutes and approved budget, with transactional range receipts and cursor advancement.
- [ ] Propose attributed claims, questions, contradictions, and decision/knowledge candidates. Keep human exact words separate from model interpretation.
- [ ] Implement source-edit invalidation, explicit project activation, redacted cross-project promotion with two scope approvals, and recurrence/retrieval metrics.
- [ ] Apply schema and API changes. Add observer opt-in, batch cursor/range, claim/proposal dedupe, source invalidation edges, and promotion approvals. Add enable/disable/review/promote APIs. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Observer defaults disabled for every existing project. Existing active knowledge stays unchanged; promotion creates a new scope/version. Save upgrade/rollback observations.

**You see.**

- [ ] A project conversation produces reviewable, attributed knowledge proposals without automatic truth or cross-project disclosure. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test batch replay, partial model output, unchanged cursor after failure, disable race, false decision promotion, conflicting sources, and promotion ACLs. Run `pnpm test -- --unit U15` and the shared lint/type/docs gates. Save `evidence/U15/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U15/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Enable observer and discuss a decision on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U15/lane-1/scenario.png`. Pass when head shows attributed proposals and a visible opt-in notice.
- [ ] Lane 2. Replay the same processed message range. Save `evidence/U15/lane-2/scenario.png`. Pass when no duplicate candidate is created.
- [ ] Lane 3. Crash after proposal transaction before notification. Save `evidence/U15/lane-3/scenario.png`. Pass when cursor/proposals agree and UI catches up.
- [ ] Lane 4. Fail the provider midway through a batch. Save `evidence/U15/lane-4/scenario.png`. Pass when cursor stays unchanged and no partial claim activates.
- [ ] Lane 5. Edit or redact source after capture. Save `evidence/U15/lane-5/scenario.png`. Pass when dependent proposals invalidate with visible provenance.
- [ ] Lane 6. Have two people disagree in a thread. Save `evidence/U15/lane-6/scenario.png`. Pass when contradiction remains rather than being summarized away.
- [ ] Lane 7. Ask observer to activate policy or launch work. Save `evidence/U15/lane-7/scenario.png`. Pass when the agent cannot acquire either authority.
- [ ] Lane 8. Promote a redacted lesson with source maintainer and workspace owner. Save `evidence/U15/lane-8/scenario.png`. Pass when a new workspace record cites provenance without widening source ACL.
- [ ] Lane 9. Revoke a promoted record and query another project. Save `evidence/U15/lane-9/scenario.png`. Pass when new context excludes it and audit preserves the history.
- [ ] Lane 10. Disable observer and leave project idle. Save `evidence/U15/lane-10/scenario.png`. Pass when no further batches/spend occur and existing proposals remain reviewable.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Batch eligibility-to-proposal time excluding model latency and idle cost. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U15 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U15/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail scheduler lag above five seconds after batch eligibility or any provider call on an inactive/disabled project. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U15/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U15/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Harden operations and prove governed deletion (U16)

**Depends on.** U15. Stage S3 later-stage. Requirements R10, R14, R15, R16, R17, R18. Acceptance AC31.

**Files.**

- [ ] Own the Operations, Projects, Identity, Integrations, Evidence modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Add scoped signed audit exports, budget/reconciliation dashboards, backup age/restore alerts, and operator remediation runbooks.
- [ ] Implement archive/deletion impact preview, export, separate external-repository authority, two-human confirmation, credential revocation, retention/hold handling, and tombstones.
- [ ] Run VM-loss restore, compatible rollback/forward repair, provider outage, disk pressure, key rotation, and abandoned-resource drills.
- [ ] Apply schema and API changes. Add audit export manifests, deletion previews/approvals/tombstones, legal holds, retention execution receipts, and restore-drill records. Preserve effect dedupe minimal identities. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Apply retention classes to existing artifacts without deleting them until dry-run inventory and owner approval. Test expand/contract on a restored production-shaped fixture. Save upgrade/rollback observations.

**You see.**

- [ ] An operator can recover the center and explain every retained, deleted, or unresolved resource without hidden authority. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test deletion approval scope, last owner, legal holds, retention pinning, redaction, audit isolation, replay against tombstones, and old-epoch grants. Run `pnpm test -- --unit U16` and the shared lint/type/docs gates. Save `evidence/U16/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U16/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Export audit and restore the center on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U16/lane-1/scenario.png`. Pass when head yields verifiable scoped export and the restored user journey passes.
- [ ] Lane 2. Simulate total VM loss. Save `evidence/U16/lane-2/scenario.png`. Pass when off-host keys/backups suffice within RPO/RTO and old host cannot act.
- [ ] Lane 3. Deploy additive migration then roll back compatible image. Save `evidence/U16/lane-3/scenario.png`. Pass when data remains readable and no automatic destructive downgrade occurs.
- [ ] Lane 4. Request deletion without second human or fresh auth. Save `evidence/U16/lane-4/scenario.png`. Pass when nothing destructive occurs.
- [ ] Lane 5. Place a legal hold on evidence then run retention. Save `evidence/U16/lane-5/scenario.png`. Pass when held/pinned artifacts remain and blocked deletion is explicit.
- [ ] Lane 6. Approve local project deletion without remote-repository deletion. Save `evidence/U16/lane-6/scenario.png`. Pass when remote repository remains untouched.
- [ ] Lane 7. Approve exact external deletion separately on a disposable fixture. Save `evidence/U16/lane-7/scenario.png`. Pass when only named resources change and read-back receipts match.
- [ ] Lane 8. Replay old webhook/command after tombstone. Save `evidence/U16/lane-8/scenario.png`. Pass when deleted project is not recreated.
- [ ] Lane 9. Fill disk and strand a cloud environment under provider outage. Save `evidence/U16/lane-9/scenario.png`. Pass when alerts, hard TTL, unconfirmed cleanup, and recovery remain truthful.
- [ ] Lane 10. Rotate keys and revoke a member during export. Save `evidence/U16/lane-10/scenario.png`. Pass when new access denies and no cross-project/private payload reaches telemetry.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Restore RPO/RTO, export throughput, retention/reaper completion, and reference-load p95. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U16 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U16/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail RPO above 15 minutes, RTO above four hours, export of 100000 metadata events above two minutes, or R18 regressions. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U16/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U16/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Add an opt-in notification-only Slack bridge (U17)

**Depends on.** U16. Stage S3 later-stage. Requirements R01, R07, R14, R16, R20. Acceptance AC32.

**Files.**

- [ ] Own the Integrations, Policy, Collaboration, Operations modules from Appendix D. Update their contracts, migrations, feature map, and tests in the same change. Record actual created paths in the unit evidence.

**Build.**

- [ ] Add explicit owner-approved Slack bot installation and one-way selected card/notification delivery with links back to Agora.
- [ ] Deduplicate sends, store remote receipts, restrict payload to mapped room audience, and reconcile uninstall/revocation.
- [ ] Document that Slack text, reactions, and buttons carry no launch/approval/merge authority; keep direct messages and inbound conversation sync unsupported.
- [ ] Apply schema and API changes. Add notification subscription, approved room/channel mapping, outbox target, and installation revocation receipt. No Slack-to-command schema exists. Save the schema diff and contract fixtures.
- [ ] Prove migration and compatibility. Disabled by default. Existing workspace/project audiences do not widen. Reauthorization is required for any scope increase. Save upgrade/rollback observations.

**You see.**

- [ ] A requested Slack channel receives one approved notification linking to the authoritative Agora record, without becoming another control plane. Save the user/operator outcome receipt.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test mapping authorization, duplicate outbox receipt, wrong workspace, revocation, no inbound command route, and payload redaction. Run `pnpm test -- --unit U17` and the shared lint/type/docs gates. Save `evidence/U17/unit.log`.
- [ ] Review permissions, secret paths, input validation, denial fixtures, and package changes in the owned modules. Save `evidence/U17/security.md` with findings resolved or explicitly blocking.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, following the installed checker vocabulary. Lane execution is future work and needs the implementation authorization and available approved verifier tooling described in Appendix C.

- [ ] Lane 1. Regression lane against trunk. Enable a mapped notification on trunk and head. Record missing trunk capability and gate the added behavior plus final user outcome rather than inventing a comparison. Save `evidence/U17/lane-1/scenario.png`. Pass when head sends one scoped card/link and Agora remains authoritative.
- [ ] Lane 2. Replay the same outbox effect. Save `evidence/U17/lane-2/scenario.png`. Pass when no duplicate authoritative outcome or extra work occurs.
- [ ] Lane 3. Map the wrong Slack workspace or channel. Save `evidence/U17/lane-3/scenario.png`. Pass when installation/mapping denies.
- [ ] Lane 4. Attempt a private-project notification without audience approval. Save `evidence/U17/lane-4/scenario.png`. Pass when no project content leaves Agora.
- [ ] Lane 5. Reply with a launch or approval instruction in Slack. Save `evidence/U17/lane-5/scenario.png`. Pass when no task/approval state changes.
- [ ] Lane 6. Click an approval-looking link while unauthenticated. Save `evidence/U17/lane-6/scenario.png`. Pass when Agora requires authentication and exact-action review.
- [ ] Lane 7. Uninstall the bot during pending sends. Save `evidence/U17/lane-7/scenario.png`. Pass when grants revoke and pending delivery cannot revive installation.
- [ ] Lane 8. Increase requested Slack scopes. Save `evidence/U17/lane-8/scenario.png`. Pass when new explicit authorization is required.
- [ ] Lane 9. Take Slack offline during a task. Save `evidence/U17/lane-9/scenario.png`. Pass when task/evidence proceeds and notification failure is separate.
- [ ] Lane 10. Inspect the notification on narrow/wide clients and audit export. Save `evidence/U17/lane-10/scenario.png`. Pass when readable status has a valid authoritative link and no secret/raw logs.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Outbox-to-notification latency and unaffected room delivery. Measure existing host/control cost at trunk and head, and separately report added behavior if trunk lacks it.
- [ ] Probe. Run `pnpm verify:perf -- --unit U17 --revision trunk` first, then five interleaved trunk/head batches on equal fixture snapshots and runner shapes. Save raw samples and `evidence/U17/perf.json`.
- [ ] Baseline. Record the measured trunk p50/p95, errors, environment, and sample count before head. State absent feature capability instead of manufacturing a feature baseline.
- [ ] Rule. Equivalent behavior fails above a 10% p95 regression. Fail delivery above 30 seconds when Slack is available or any regression beyond R18 message budgets; no unavailable notification may change task state. New behavior uses its absolute budget, never a ratio against an absent feature.

**Review gate.** The operator reviews before merge.

- [ ] Collect lane screenshots, security and performance evidence, and the exact-head manifest in `evidence/U17/review/`.
- [ ] Record a 30 to 60 second video of the changed interaction in `evidence/U17/review/demo.mp4`.
- [ ] Present the screenshot set and video to the operator. Wait for explicit approval of this exact change.

**Merge.**

- [ ] Record independent clean verdicts at the exact head and complete review-finding triage.
- [ ] Refresh the intended parent, compare patch ID, and rerun base-sensitive checks. Attach all evidence to the final head.
- [ ] Deliver the verified unit for operator-only landing. Keep dependent work blocked on a failed gate.

## Close the program

- [ ] For S1, check every U01 through U09 box with evidence and complete every AC01 through AC12 live scenario. Leave later-stage boxes unchecked.
- [ ] For each later stage, obtain its explicit execution authorization and satisfy its acceptance rows before calling it released.
- [ ] Audit specification, task prerequisites, migrations, API compatibility, decision trail, evidence links, and remaining resources. Do not call a claimed result verified.
- [ ] Deliver the verified stack and stage report to the operator. Include exact heads, review gates, tested outcomes, unavailable capabilities, and retained resources. Only the operator lands it.

## Appendix A. Prototype evidence

No application prototype was built in this specification-only assignment. No screenshots, live product results, or performance baselines are claimed. Architecture selection used the nine completed reports and decisive public-source rechecks in [research basis](research-basis.md).

U01 proves stack startup/restore. U04 proves provider and citation behavior. U07 proves local isolation. U09 proves the two-person product loop. U11/U12 prove OCI import and cloud boundaries. Those are implementation release gates, not unanswered product choices. A failed experiment changes implementation or blocks its stage; it does not authorize weaker policy.

## Appendix B. Alternatives rejected

The [architecture selection](research-basis.md#architecture-selection) compares the chosen modular center with a Mattermost plugin plus sidecar and a Durable Object/workflow topology. The plugin splits membership and domain authority. The actor design splits state that approvals need atomically. Both add coordination the caller would have to understand.

Desktop distribution, direct messages, a workflow engine, vector search, an open agent swarm, and automatic merge are outside the baseline. R20 owns their promotion triggers. Local-first execution is only the first delivery step; the cloud target remains fully specified.

## Appendix C. Risks

- U01 must create real test/drive commands and the verify-agora skill before downstream units use them. The repository currently has documents and upstream skills, not a running application.
- The bundled pstack checker requires ten named live lanes and its literal default verifier model. That requirement is preserved unchanged. This task runs no lanes or alternate models. A future executor must obtain approved available verifier tooling before using that model. A missing tool/model is an explicit execution prerequisite, not evidence and not permission to weaken the ten scenarios, independence, live behavior, or performance gates.
- The unrelated cursor-team-kit control-ui/control-cli/deslop plugin is not installed. U01 supplies and proves project-local controls using Playwright and isolated CLI driving. No lane may claim to have used an absent control skill.
- U02 needs deliverable email and GitHub identity/protection access for the fixture. Wrong entitlement leaves onboarding blocked rather than faking safety.
- U07 local containers protect a trusted owner from mistakes; they are not a hostile tenant boundary. The worker/model process is trusted host code. U12 must prove the stronger microVM and egress boundary before shared cloud execution.
- U08 must separate owner-attested evidence from trusted CI. A compromised developer machine can sign lies; signature validation alone is not a merge gate.
- U12 cannot infer network denial from socket-connect success. Test protocol responses and destination observations. E2B allow precedence must not override Agora's forbidden ranges.
- U09/U14 require real external end-to-end trials. Portable fakes only prove the behaviors represented by the fake.
- U15 observer accuracy is unmeasured. Human activation and invalidation remain mandatory even when summaries look convincing.
- U16 single-host deployment has an outage window. RPO/RTO are targets until a timed restore proves them.

## Appendix D. Links and reading list

Read [technical specification](technical-spec.md), [task breakdown](task-breakdown.md), [research basis](research-basis.md), and [decisions](decisions.tsv). Before domain changes use [architect](../.agents/skills/architect/SKILL.md) through a type/interface sketch. For existing-code changes in U02 onward, trace the affected subsystem with [how](../.agents/skills/how/SKILL.md). For security or contested design in U05, U07, U08, U10, U12, and U16, use [interrogate](../.agents/skills/interrogate/SKILL.md) under the implementation program's approved review resources. No additional models are launched by this document.

Use [technical-writing](../.agents/skills/technical-writing/SKILL.md), [unslop](../.agents/skills/unslop/SKILL.md), [show-me-your-work](../.agents/skills/show-me-your-work/SKILL.md), [create-verification-skill](../.agents/skills/create-verification-skill/SKILL.md), and [maintain-verification-skill](../.agents/skills/maintain-verification-skill/SKILL.md). Keep the append-only decision trail in `docs/decisions.tsv`. The local checker command is `node .agents/skills/poteto-mode/scripts/check-plan.mjs docs/implementation-plan.md`.

### Initial repository shape created by U01

| Planned module name | Planned ownership root | Responsibility |
| --- | --- | --- |
| Web | `apps/web` | Browser routes, accessible timeline/cards, query cache |
| API | `apps/center` | Hono entrypoint, authenticated command and socket transport |
| Worker | `apps/worker` | Outbound CLI and local/cloud worker modes |
| Contracts | `packages/contracts` | Versioned Zod wire schemas and error vocabulary |
| Identity, Policy, Collaboration, Control, Agents, Projects, Knowledge, Integrations, Evidence | `packages/domain` with one named directory per module | Domain rules and narrow interfaces from R03, not temporal load/save layers |
| Storage | `packages/storage` | Drizzle tables, migrations, repositories, transactions, FTS |
| Execution | `packages/execution` | Local and cloud adapters, Git broker, process/resource isolation |
| Verification | `packages/verification`, `tests` | Project CLI contract, fixtures, e2e/denial/performance drivers and evidence validators |
| Operations | `infra`, `docs/runbooks` | Compose/Caddy, release, backups, restore, observability |
| Project control skill | `.agents/skills/verify-agora` | Proven launch/doctor/drive/evidence/cleanup and feature map |

U01 establishes package scripts `lint`, `typecheck`, `test`, `docs:check`, `verify:boot`, `verify:doctor`, `verify:cleanup`, and `verify:perf`. The unit selector is an intentional interface created there, not a claim that a test runner currently accepts it. Later units own actual module files under these roots and must record them in evidence. No filenames for unimplemented functions are fabricated here.

### Dependency graph

```text
U01 -> U02 -> U03 -> U04 -> U05 -> U06 -> U07 -> U08 -> U09
U09 -> U10 -> U11 -> U12 -> U13 -> U14 -> U15 -> U16 -> U17
U10 --------------------> U13
U12 ----------------------------> U14
```

The main sequence is intentionally serial until the invariants have a tested implementation. Independent scenario/test work may run in isolated instances against the same verified head. Shared schema and stack topology have one writer.
