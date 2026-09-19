# Agora technical specification

Status: final design baseline, 2026-09-19. Implementation is not started.

Audience: product engineers, security reviewers, operators, and managed-project maintainers. MUST, MUST NOT, and REQUIRED are release gates. Defaults are enforceable configuration values, not predictions of measured performance.

This document owns product behavior and system contracts. [The implementation plan](implementation-plan.md) owns delivery order. [The task breakdown](task-breakdown.md) owns transferable work items. [The research basis](research-basis.md) records architecture selection, public evidence, and limits. [The decision trail](decisions.tsv) records choices append-only.

## R01. Product boundary and delivery stages

Agora is an invitation-only communication center where developers talk with each other and visible agents, ask questions, and launch bounded work from a conversation. Agora owns the shared record. GitHub owns repositories and the final merge barrier. A developer's machine or a cloud sandbox executes work but does not own its durable state.

The first audience is a trusted team of two to five developers. One deployment hosts one workspace. Every project has explicit membership, a project room, and a stable project-main agent identity. In S1 that identity displays `not_enabled` and makes no model calls. S2 activates its persistent conversation and coordination role. This preserves the target hierarchy without pretending the first release implements it.

| Stage | Authorized scope | Release boundary |
| --- | --- | --- |
| S1, first runnable release | Hosted browser center, invitations, one workspace, registered existing projects, rooms and threads, search, read-only center agent, bounded task on the launching developer's machine, evidence, approved draft publication, human review and merge | Two real accounts on two real machines complete AC01 through AC12 |
| S2, later stage | Create projects from conversation, GitHub provisioning, declarative image builds, E2B microVM adapter, active persistent project-main agents, reviewed project knowledge, local and cloud parity | AC20 through AC24 |
| S3, later stage | Observer capture and knowledge proposals, cross-project promotion, operational hardening, optional one-way Slack notifications | AC30 through AC32 |

Foundation work is part of S1, not a separate product release. No task after the S1 release gate belongs in the initial queue.

Goals are readable shared conversation, clear human ownership, predictable execution, reviewable evidence, and recovery without duplicate effects. The target remains cloud-first for unattended work. Local execution first proves the common run contract without a sandbox account or remote repository-provisioning authority.

Non-goals are replacing GitHub, building an IDE, hosting arbitrary public tenants, a general agent swarm, automatic merge, production deployment by agents, and a full Slack clone. Direct messages, reactions, rich presence, voice, a desktop client, federation, and user-defined workflow languages are not part of these three stages.

Product principles:

- Conversation is the primary view. A task card opens details without moving the discussion to a second system.
- A person owns every question and task. An agent is a delegate, never the accountable owner.
- Text proposes. A validated human command authorizes. Model confidence is never permission.
- Current state, historical activity, and missing evidence have distinct labels.
- Code owns ordering, leases, permissions, budgets, publication, and recovery. Models own bounded interpretation and generation.
- Each attempt owns its files, processes, ports, and test data. Shared mutable state exists only where the domain requires it.

## R02. Browser experience and user journeys

### Information architecture

The hosted React client has a left navigation rail for rooms, projects, runs, and the attention inbox. The center pane is the selected room timeline. A right pane opens a thread, run, evidence manifest, or approval. On narrow screens the right pane becomes a route with a back button. Deep links address room, message, task, run, and evidence IDs.

General rooms are workspace-readable. Project rooms are visible only to project members. S1 has no private general rooms and no direct messages, which keeps the audience of agent answers explicit. Project membership is not implied by workspace membership. A project room cannot be moved to another project. Its historical record remains with the original project.

The composer supports plain text and a safe Markdown subset, code fences, member mentions, and attachments. Enter sends and Shift+Enter inserts a newline, with a visible preference to reverse the behavior. Drafts survive route changes in session storage and clear at logout. No offline privileged command queue exists. Offline message drafts remain visibly unsent until the person sends them after reconnection.

Human messages allow author edits within 15 minutes and author deletion at any time. Deletion replaces the public body with a tombstone. Revision history and run-pinned revisions remain in restricted audit storage for the retention period. A room maintainer can redact abusive or secret content. That action invalidates affected context and evidence rather than rewriting history silently.

Agent output uses cards for status, action summary, question, result, and error. Raw tool output and verbose logs remain artifacts. Agora never requests or displays hidden model reasoning. A status summary describes observable work, not an internal chain of thought. Stop and recovery actions sit on the run card. The UI shows owner, delegate, placement, last progress, state, and a link to evidence.

In-app unread counts use the last seen room sequence. Mentions and questions create inbox items. Reading acknowledges attention but does not resolve a question, approval, or task. Presence is an ephemeral `last_seen` indicator with a 60-second freshness window, not proof of worker availability. Workers have a separate heartbeat.

### Required journeys

| Journey | User path | Observable completion and authority |
| --- | --- | --- |
| Invitation, S1 | Owner enters an email and workspace role, then sends an invitation. Recipient opens the link, completes email authentication, and accepts. | Exactly one membership exists. Acceptance requires the matching verified email. Project membership needs a separate maintainer grant. |
| Conversation, S1 | Two project members post and reply in the room. One reconnects after going offline. | Both see the same ordered timeline and unread boundary. A retry does not duplicate a message. |
| Agent question, S1 | Member mentions `@center` in a thread or chooses Ask center. A scope preview identifies the thread and any selected records. | The center answers with source links or states that evidence is insufficient. This click authorizes the displayed model cost ceiling, not execution. |
| Task launch, S1 | Contributor chooses Create task from the thread, edits goal and acceptance criteria, selects their own registered machine, and confirms Run on my machine. | A task and first run appear in that thread. The confirmation binds scope, machine, base commit, environment, tool set, provider account, and limits. An imperative mention only opens this proposal. |
| Project registration, S1 | Workspace owner and repository maintainer register an existing GitHub repository, map membership, and run onboarding checks. | The room exists immediately. Coding runs remain disabled until repository identity, environment, verification contract, and branch protection pass. No repository is created. |
| Project creation, S2 | Member asks the center for a project. An owner edits a proposal with repository owner/name, private visibility, members, template, policy, and spend. The owner confirms provisioning. | A project room shows each observed provisioning step. The project activates only after its repository, checks, environment, and main agent pass onboarding. |
| Cloud execution, S2 | Contributor selects Cloud on a task and confirms the displayed data destination and budget. | A fresh microVM executes the same RunSpec as local execution. The result, evidence, and approval card remain in the originating thread. There is no fallback from an unavailable local machine. |
| Local contribution, S1 | Developer registers a checkout, launches an agent run, or claims a manual task and asks the worker to prepare an isolated worktree. | Their normal checkout stays unchanged. Manual work produces the same evidence and publication request as agent work. |
| Review, S1 | Another project maintainer opens the evidence card, reviews intent, diff, exact commits, checks, and UI proof, then approves publication. | The owner separately confirms use of their local Git credential. The worker pushes the approved branch and opens a draft. The other human reviews on GitHub and a human merges. |
| Recovery, S1 | Owner sees a lost, blocked, or failed run, reads the last observed facts, and chooses Retry fresh, Cancel, or Keep for manual recovery. | A fresh run gets a new ID and fence. Old results remain historical and cannot publish. Uncommitted local work is never silently removed. |

## R03. Architecture and component ownership

Selected design: one hosted modular Node service with PostgreSQL, an S3-compatible artifact store, a browser client, and outbound workers. [Architecture selection](research-basis.md#architecture-selection) compares this with a chat-host extension and a distributed actor service. The browser requires no privileged local APIs. The worker supplies the local execution boundary. A desktop shell adds distribution and update risk without improving this first shared workflow.

```text
Browser -- HTTPS commands + resumable WebSocket events --> Center service
                                                         | PostgreSQL 16
                                                         | S3-compatible storage
                                                         | SMTP and model API
                                                         | GitHub API; webhook inbox in S2
Local worker -- outbound TLS control + uploads ---------->|
  | host-owned Git broker and model adapter                |
  | fresh task worktree + rootless execution container     |
                                                         |
Cloud runner, S2 -- same worker protocol ---------------->|
  | E2B lifecycle adapter                                  |
  | fresh microVM, no center or GitHub credentials          |
```

| Component or module | Exact responsibility | Must not own |
| --- | --- | --- |
| Web | React 19, TypeScript, Vite, TanStack Router and Query, accessible cards and timeline, optimistic pending messages | Authorization, raw secrets, workflow transitions |
| API | Hono on Node 22, Zod boundary parsing, auth middleware, versioned HTTP and `ws` transport | Repository code execution |
| Identity | Better Auth magic links and organization plugin, invitation delivery, membership and device grants | Project workflow decisions from chat |
| Collaboration | Rooms, message revisions, threads, mentions, search and inbox projections | Task execution |
| Control | Tasks, runs, leases, transition reducer, budgets, command receipts, scanner and outbox | Model interpretation of authority |
| Policy | Pure typed decisions over role, scope, state, policy digest, evidence, and approval | Network calls or model scoring |
| Agents | Context compiler, profiles, center and project-main sessions, provider adapters | Arbitrary host shell or raw SQL tools |
| Evidence | Upload quarantine, manifests, hashes, exact-head validation, review projection | Trusting a model's claimed test result |
| Projects | Registration, provisioning journal, environments, project lifecycle | Silent adoption or deletion of external repositories |
| Knowledge | Versioned claims, decisions, validity, reviewed knowledge and later observer checkpoints | Automatic policy changes |
| Integrations | GitHub and email effects, webhook inbox, later Slack notification adapter | Authorizing an effect from its payload |
| Worker | Outbound enrollment, run acceptance, local spool, host-owned model loop, isolated execution, process evidence | Database access or another person's credential |
| Cloud runner | S2 mode of the worker with E2B lifecycle and short-lived run capabilities | Permanent source of project state |
| Storage | Drizzle schema/migrations, transactions, FTS, object metadata | Public database access |
| Operations | Compose, Caddy TLS, backups, OpenTelemetry, health and reconciliation reports | Model-driven operations |

The API, modules, scanner, and outbox run in one service process. There is no Redis, queue broker, workflow engine, vector database, or microservice split. Local workers and cloud runners are execution processes, not new sources of business authority. The center never runs repository hooks, Docker builds, or project tests.

Internal capability boundaries are small and domain-owned:

```ts
interface Control {
	launch(actor: HumanActor, command: LaunchTask): Promise<CommandReceipt>;
	claim(worker: WorkerActor, request: ClaimRun): Promise<LeaseGrant>;
	record(worker: WorkerActor, event: WorkerEvent): Promise<EventReceipt>;
	decide(actor: HumanActor, command: DecideApproval): Promise<CommandReceipt>;
}
interface ContextCompiler {
	compile(scope: AuthorizedScope, request: ContextRequest): Promise<ContextBundle>;
}
interface ExecutionAdapter {
	prepare(spec: RunSpec): Promise<EnvironmentReceipt>;
	execute(spec: RunSpec, lease: LeaseGrant): AsyncIterable<WorkerEvent>;
	stop(handle: CleanupHandle): Promise<CleanupReceipt>;
}
interface SandboxProvider {
	create(spec: SandboxSpec, operationId: OperationId): Promise<SandboxReceipt>;
	inspect(id: EnvironmentId): Promise<ObservedEnvironment>;
	exec(id: EnvironmentId, command: RegisteredCommand): Promise<CommandResult>;
	export(id: EnvironmentId, request: ExportRequest): Promise<ExportManifest>;
	destroy(id: EnvironmentId, operationId: OperationId): Promise<CleanupReceipt>;
}
```

These are specification signatures, not source files. Each interface hides the transaction, credential, retry, or process mechanics it owns. Callers do not orchestrate a sequence of load, validate, and save wrappers. External SDK and database row types stay inside their adapter modules. Shared Zod wire schemas are separate from private domain types.

## R04. Identity, authorization, and agent hierarchy

Better Auth handles human sessions and invitation plumbing. Agora defines closed workspace roles `owner`, `member`, and `observer`, and project roles `maintainer`, `contributor`, and `observer`. They are custom roles, not aliases for the library's default admin role. Workspace owners manage workspace membership and project creation. Project maintainers manage that project's roles and policies. Contributors talk, ask, propose, and run work. Observers read only. Workspace observer status prevents writes even with a contributor project grant.

A workspace owner is not automatically a project content reader. They can grant themselves project membership only through an audited membership command visible to existing project maintainers. The deployment operator necessarily has infrastructure access. That operational trust is disclosed, not disguised as application isolation.

An operator bootstraps the first workspace owner through a one-use command on the server console. Public sign-up and self-service organization creation/deletion are disabled. Invitation IDs are opaque, expire in 72 hours, and accept once through a transaction. Email verification is REQUIRED. Login magic links expire in 10 minutes. HTTPS cookies use Secure, HttpOnly, SameSite=Lax, a 12-hour idle lifetime, and seven-day absolute lifetime. Consequential approvals require authentication within the last 10 minutes.

| Principal | Lifetime and scope | Allowed behavior |
| --- | --- | --- |
| Human | Stable workspace identity with explicit project grants | Accountable owner, launch, steer, approve when eligible |
| Center agent | One workspace service principal, S1 | Read authorized records, answer status questions, propose tasks/projects. No shell, repository writes, assignment, or self-approval |
| Project-main agent | Exactly one stable principal per project, inactive S1, active S2 | Answer from reviewed project context, propose a task DAG, request human launches, follow outcomes. It cannot approve or acquire a person's machine |
| Local agent profile | Owned by one human, addressable for that human's registered projects | Advertise a verified headless adapter and accept that human's explicitly authorized run |
| Task agent | One execution identity per run | Use the fixed RunSpec tools until lease or budget expires |
| Observer | Project-scoped service principal, S3 | Read opted-in project conversations and propose claims/knowledge. No task execution or knowledge activation |
| Worker machine | Device principal bound to one human, or a cloud pool service principal | Claim only eligible assigned runs, upload evidence, report facts |

An agent has an audit identity but no interactive login and no independent ambient authority. Effective reads are the intersection of caller access, agent grants, selected scope, and the destination room audience. A center answer posted in a general room cannot reveal project-only records, even if its requester can read those records. Such a question must move to the project room.

All authorization runs on every HTTP command, WebSocket subscription and event delivery, upload, download, search, provider call, and worker write. Every database reference carries workspace and project scope where applicable. Composite foreign keys prevent cross-project references. PostgreSQL row-level policies provide defense in depth for content tables with transaction-local scope; the service role cannot bypass them. Control-only administration uses separate audited transactions. There is no security reliance on UUID obscurity.

Membership removal invalidates sessions, subscriptions, worker grants, affected leases, pending approvals, and provider spending grants in one transaction. New calls are denied immediately after commit. A connected client receives a revoke event and clears its memory and session-storage drafts. Agora cannot erase screenshots or files already downloaded to a person's machine.

## R05. Authoritative records and access paths

Identifiers are opaque UUIDs. Revisions and fences are nonnegative 64-bit integers serialized as decimal strings in JSON. Times are UTC RFC 3339. Digests are algorithm-tagged SHA-256. Hash and signature inputs use UTF-8 JSON Canonicalization Scheme, RFC 8785, with the signature field omitted from its own signed payload. Large integers and monetary micro-units use decimal strings rather than floating-point values. Immutable records receive new versions rather than in-place content replacement. Materialized current state and its event append commit together. Full event-sourcing replay is not required for auth-library tables; their audit events are not a substitute for backups.

| Record | Required fields and constraints | Main read path |
| --- | --- | --- |
| Workspace/membership | Workspace ID, principal ID, role, revision, accepted/revoked times. One active grant per pair | Current actor permissions |
| Invitation | Workspace, verified target email, role, opaque ID, inviter, expiry, pending/accepted/revoked/expired state | Accept by ID and authenticated recipient |
| Project | Workspace, slug, lifecycle/revision, repository ID, room ID, main-agent ID, policy version, environment version | Project list, exact ID. One repository in S1/S2 |
| Room/thread/message | Room scope, sequence, root message ID, author, immutable revision, body, attachments, mentions, client-message ID, timestamps | `(room_id, seq)` and `(thread_root_id, seq)` |
| Context bundle | Requester, audience, selected message revision IDs, decisions, active knowledge versions, source digests, omissions, policy/profile versions, byte/token bounds, digest | Exact immutable bundle per session/run |
| Agent profile | Kind, owner scope, version, instructions digest, model route, tool allowlist, limits | Active profile for scope |
| Session | Agent, human owner, origin thread, context digest, state/version, last activity, provider call journal | One session per question or run. Project identity persists across sessions |
| Task | Human owner, project, origin message, intent, acceptance criteria, scope, dependency IDs, version, task state, current run ID | Project backlog and dependency-ready tasks |
| Run | Task ID, attempt ordinal, session ID, immutable RunSpec digest, placement, state/version, current fence, outcome, terminal reason | Task attempts and active-run scanner |
| Lease | Run, fence, deployment epoch, machine, issued/expiry/revoked times | Unique current lease for run |
| Activity | Run or answer session, stream sequence, typed payload, producer-event ID, actor, lease reference where required | Ordered immutable progress and human prompts |
| Machine | Human owner or pool owner, public key, name, repository registrations, capabilities, adapter versions, OS, last heartbeat, revoked time | Eligible explicit placement |
| Environment definition | Repository commit, Dev Container config digest, policy-filtered config, lockfile digests, OCI digest, build attestation, supported platform | Exact version selected by RunSpec |
| Environment instance | Run, provider, external ID, allocation operation ID, desired/observed state, resource caps, cleanup receipt | Reconcile and garbage collection |
| Evidence | Manifest digest, run, producer class/key, base/head/tree/patch, checks, artifact references, validation state | Exact-head review |
| Artifact | Scope, digest, byte size, media type, quarantine status, producing run, retention class, verified upload time | Authorized signed download |
| Approval | Action, subject digest, policy digest, required role, proposer, eligible decider, decision, expiry, consumed effect ID | Exact action gate |
| Decision | Project or workspace, human's exact words, source message revision, actor, scope, effective date, supersession links | Decision history and context |
| Knowledge | Atomic claim, scope, evidence, owner, version applicability, tested revision, review date, status, conflicts, supersession, regression | Active applicability filters before FTS |
| Audit | Actor and initiating human, action, subject, before/after versions, reason code, correlation ID, time | Scoped audit export |
| Command/effect receipts | Actor, command ID, request hash, response; effect key, target, desired request, observed remote ID, state, attempts | Dedupe and crash reconciliation |
| Budget ledger | Project, payer, period, reservation, usage, release, unpriced flag | Transactional launch/call admission |

Message search uses PostgreSQL `tsvector` with the `simple` configuration, exact term matching for code identifiers, and GIN indexes. It covers current non-redacted messages, final agent responses, task titles, evidence titles, decisions, and active knowledge. Search applies access filters before ranking and snippets. Raw logs, private provider payloads, and inactive knowledge do not enter ordinary search. Pagination uses stable score/ID cursors, 50 results maximum.

The immutable `agora.run-spec/v1` contains `task_id`, `attempt_ordinal`, `human_owner_id`, `project_id`, `repository_id`, `origin_message_revision_id`, `intent`, `acceptance_criteria`, `allowed_paths`, `base_sha`, `context_digest`, `profile_digest`, `policy_digest`, `environment_version`, `placement`, `adapter_id`, `model_route_id`, `payer_id`, `limits`, and `required_prepublication_scenarios`. The server resolves references and produces its digest before launch. An empty acceptance list, unknown scenario, unresolved price, or scope that cannot be enforced rejects launch. Follow-up text cannot change this object.

Activity kinds are closed. `status` carries an observable summary; `action` carries registered tool ID, redacted argument digest, start/end, and outcome; `elicitation` carries question ID and deadline; `response` carries text, citation IDs, and optional evidence ID; `error` carries stable reason code and diagnostic artifact IDs; `prompt` carries the authenticated human's frozen input; `state` carries aggregate revision and typed old/new states. A worker can report activity but only Control emits authoritative state transitions. A provider's unsupported event is retained as a bounded diagnostic, never silently interpreted as success.

Context is compiled from records rather than an unlabelled transcript. S1 includes the selected thread's message revisions and explicitly selected records. Each is quoted data with author, trust class, timestamp, source ID, and audience. It includes at most 100 messages, 64 KiB of extracted attachment text, and 24,000 input tokens. Overflow lists omitted IDs and requires narrowing for task launch. An answer may proceed with a visible partial-coverage label. The compiler never silently upgrades a summary to a decision or treats repository text as system policy.

## R06. State machines and invariants

### Types

The implementation MUST use discriminated unions and exhaustive reducers. `unknown` is an observation result, not a successful workflow state. Optional fields cannot encode mutually dependent booleans.

```ts
type Placement =
	| { kind: 'local'; machineId: MachineId; ownerId: HumanId }
	| { kind: 'cloud'; poolId: PoolId; provider: 'e2b'; region: string };
type CheckOutcome = 'pass' | 'fail' | 'blocked' | 'unavailable' | 'infrastructure_error';
type ProjectState =
	| { tag: 'proposed'; proposalDigest: Digest }
	| { tag: 'authorized'; approvalId: ApprovalId }
	| { tag: 'provisioning' | 'onboarding'; operationId: OperationId }
	| { tag: 'repair_required'; operationId: OperationId; resumePhase: 'provisioning' | 'onboarding'; reason: ReasonCode }
	| { tag: 'active'; policyDigest: Digest; environmentVersion: EnvironmentVersion }
	| { tag: 'paused' | 'archived'; reason: ReasonCode }
	| { tag: 'deletion_pending'; previewDigest: Digest; approvalIds: ApprovalId[] }
	| { tag: 'deleted'; tombstoneId: TombstoneId };
type SessionState =
	| { tag: 'pending' | 'active' }
	| { tag: 'awaiting_input'; questionId: ActivityId; deadline: Timestamp }
	| { tag: 'complete'; responseId: ActivityId }
	| { tag: 'error' | 'cancelled'; reason: ReasonCode };
type LeaseState =
	| { tag: 'issued'; runId: RunId; fence: Fence; epoch: Epoch; machineId: MachineId; expiresAt: Timestamp }
	| { tag: 'released' | 'expired' | 'revoked'; runId: RunId; fence: Fence; epoch: Epoch; endedAt: Timestamp };
type StreamCursor = { streamId: StreamId; committedSeq: DecimalInt64 };
type EffectState =
	| { tag: 'pending'; key: EffectKey; attempts: number; retryAt: Timestamp }
	| { tag: 'claimed'; key: EffectKey; capabilityExpiresAt: Timestamp }
	| { tag: 'reconciling'; key: EffectKey; observation: 'uncertain' }
	| { tag: 'succeeded'; key: EffectKey; receiptId: ReceiptId }
	| { tag: 'needs_attention'; key: EffectKey; reason: ReasonCode };
type PublicationState =
	| { tag: 'unpublished' }
	| { tag: 'awaiting_approval'; subjectDigest: Digest }
	| { tag: 'authorized' | 'pushing' | 'reconciling'; effectId: EffectId; subjectDigest: Digest }
	| { tag: 'draft_open'; receiptId: ReceiptId; head: CommitId; ci: 'pending' | 'passed' | 'failed' }
	| { tag: 'blocked'; reason: ReasonCode; subjectDigest: Digest };
type RunState =
	| { tag: 'queued'; deadline: Timestamp; reason: 'ready' | 'waiting_for_machine' }
	| { tag: 'leased' | 'preparing' | 'running' | 'verifying'; lease: LeaseRef }
	| { tag: 'awaiting_input'; lease: LeaseRef; questionId: ActivityId; deadline: Timestamp }
	| { tag: 'cancelling'; revokedFence: Fence; cleanup: CleanupState }
	| { tag: 'succeeded'; evidenceId: EvidenceId }
	| { tag: 'failed' | 'lost' | 'cancelled'; reason: ReasonCode; cleanup: CleanupState };
type ApprovalState =
	| { tag: 'pending'; expiresAt: Timestamp }
	| { tag: 'granted'; humanId: HumanId; expiresAt: Timestamp }
	| { tag: 'consumed'; effectId: EffectId; humanId: HumanId; authorizationExpiresAt: Timestamp }
	| { tag: 'denied' | 'expired' | 'invalidated'; reason: ReasonCode };
type CleanupState = 'not_needed' | 'pending' | 'confirmed' | 'failed' | 'unconfirmed';
```

### Legal transitions

| Aggregate | Transitions and guards |
| --- | --- |
| Project | `proposed -> authorized -> provisioning -> onboarding -> active`. A proposal edit produces a new digest and returns to proposed. Failed provisioning/onboarding enters `repair_required`, with a recorded resume phase. Only observed reconciliation plus still-valid authorization returns to that phase. `active -> paused -> active`; `active/paused -> archived`; `archived -> deletion_pending -> deleted`. No undelete. |
| Registered project, S1 | Starts at onboarding after explicit registration, skips repository creation, then follows the same active/pause/archive rules. |
| Task | `proposed -> ready -> executing -> review -> completed`. Blocked preconditions use `blocked` with a reason and prior state. Failed/lost run returns task to blocked, not ready automatically. Human retry sets ready. Human cancel leads to cancelled. Completion requires observed GitHub merge plus post-merge scenario, or human acceptance of a non-code result. |
| Run | `queued -> leased -> preparing -> running -> verifying -> succeeded`. Running can enter awaiting_input then return to running. Preparing/running/verifying/input can fail or lose lease. Any nonterminal state can enter cancelling then cancelled after bounded cleanup observation. Queue deadline expiry fails with `machine_unavailable`. No terminal run reopens. |
| Session | `pending -> active -> awaiting_input -> active -> complete`; pending/active/input can end error or cancelled. Liveness is a separate `responsive/unresponsive/stale` projection. A terminal session never resumes. Retry creates a new session. |
| Lease | issued, renewed, then released/expired/revoked. Only the current fence and epoch can renew. Expired or revoked leases never resurrect. |
| Approval | pending can grant, deny, expire, or invalidate. Granted can consume once, expire, or invalidate. A consumed approval belongs to one reconciled effect and cannot authorize another. |
| Publication | `unpublished -> awaiting_approval -> authorized -> pushing -> draft_open`. Uncertain external outcome enters `reconciling`; stale head/policy/role enters blocked. A changed head needs new evidence and approval. |
| Environment | `requested -> allocating -> ready -> stopping -> destroyed`. Allocation failure enters failed. Unknown provider state is `unconfirmed`, blocks reuse, and triggers reconciliation. Cleanup failure does not imply destruction. |

Task `review` means a result exists, not that all checks passed or a draft exists. A succeeded coding run means the required prepublication project checks passed and uploaded evidence validated. It does not mean publication, trusted CI, review, or merge succeeded.

Invariants:

1. A task has one human owner and at most one nonterminal coding run. A partial unique index enforces it. Dependency graphs are acyclic and same-project. An agent cannot recursively create executing children.
2. Claim is an atomic compare-and-set under a row lock. It verifies placement, owner, repository, role, budget, run version, and queue deadline. It increments the fence and creates one lease.
3. Heartbeats occur every 15 seconds. Lease TTL is 60 seconds on server time. A worker stops new commands after 30 seconds without a renewal acknowledgment and terminates its own process group by 60 seconds. The scanner runs every five seconds.
4. All execution activity, artifacts, provider gateway calls, and completion bind run, machine, execution fence, and deployment epoch. Expiry denies authoritative execution writes. Diagnostic late uploads use a separate historical channel and cannot satisfy a gate. Publication after a terminal run uses a new effect capability, not its released execution lease. That capability binds the accepted result's final fence, head, evidence, epoch, and current approval.
5. The center emits a queued/starting card within 10 seconds. Ten seconds without initial acknowledgment marks unresponsive. Thirty minutes without semantic progress marks stale. Awaiting-input and offline-machine states show their explicit reason instead. Heartbeats prove liveness, not progress.
6. Queue wait is at most 15 minutes. Task wall time is at most 30 minutes by default, including up to 10 minutes awaiting input. A retry always creates a fresh run/environment. S1 permits two attempts per task; another attempt requires a new explicit limit approval.
7. A required prepublication check not equal to pass blocks run success and draft publication. Required postpublication CI checks block review-ready and merge, not the earlier push needed to run CI. No `skipped` or `neutral` translation is allowed.
8. Approval validity requires live role, exact action and subject, unchanged head/base/policy, and unexpired deadline. One approval covers one effect only. Cancelling work invalidates unused approvals.
9. One project has one room and one main-agent identity. Persistent identity never implies a persistent VM or an always-running model.
10. Events are immutable facts. A fresh authorized snapshot is the current state. Missing process or provider observations never become idle, dead, or done by inference.

## R07. Ordered API, event, and retry contracts

HTTP mutations use `/api/v1`, JSON, a `command_id`, and an expected aggregate revision for state-sensitive operations. The server derives actor from authentication. It rejects actor IDs offered as authority by a client. Zod rejects unknown fields and bounds strings, arrays, durations, paths, and numeric ranges. Malformed input is 400, unauthenticated is 401, unauthorized is 403, absent or inaccessible object reads are 404, stale revision or mismatched duplicate body is 409, expired lease is 410, and budget/rate denial is 429. Errors include a stable reason code and correlation ID, never secret values.

A successful mutation returns `{command_id, aggregate_id, revision, event_cursors, receipt_id}`. The transaction writes its current-state row, immutable domain event, audit event, command receipt, and any outbox effect together. A duplicate `(actor_id, command_id)` with the same request digest returns the original receipt without effects. Reusing it with different input returns 409. Command receipts remain at least 90 days. Irreversible effect keys and deletion tombstones persist for the life of the deployment.

### Public operations

| Caller | Operation | Required body/result and authorization |
| --- | --- | --- |
| Browser | `POST /invitations`, `POST /invitations/{id}/accept`, `PATCH /memberships/{id}` | Owner invitation, matching authenticated recipient, owner or scoped maintainer role change |
| Browser | `GET /rooms/{id}/snapshot`, `GET /rooms/{id}/messages`, `POST /rooms/{id}/messages` | Current authorized audience, client-message ID, parent/root, body, selected attachment IDs |
| Browser | `PATCH /messages/{id}`, `DELETE /messages/{id}` | Author window or maintainer redaction; expected message revision |
| Browser | `GET /search`, `POST /sessions/questions` | Query or explicit context selection, allowed room, route and question budget |
| Browser | `POST /tasks`, `POST /tasks/{id}/runs` | Versioned proposal, immutable RunSpec, explicit human launch and own machine or approved cloud pool |
| Browser | `POST /runs/{id}/prompts`, `POST /runs/{id}/cancel`, `POST /tasks/{id}/retry` | Owner or maintainer; prompts cannot expand scope, tools, payer, or placement |
| Browser | `POST /approvals/{id}/decision`, `POST /publications` | Recent human authentication, exact preview digest, eligible non-author publication approver |
| Browser | `POST /projects/register`, S2 `POST /projects/proposals`, `POST /projects/{id}/authorize` | Owner plus verified repository administration authority; no external effect on proposal |
| Browser | `POST /projects/{id}/pause`, `/resume`, `/archive`, `/delete-preview`, `/confirm-delete` | Maintainer for pause/resume; workspace owner for archive/delete; separate deletion confirmation |
| Browser | `POST /decisions`, S2 `POST /knowledge/proposals`, `/knowledge/{id}/activate` | Human decision author; project maintainer activation |
| Worker | `POST /worker/enrollments`, `/worker/enrollments/{id}/exchange` | Human-approved device code challenge, public key proof, own machine only |
| Worker | `POST /worker/runs/{id}/claim`, `/heartbeat`, `/events`, `/complete` | Assigned RunSpec and current fence; server generates authoritative order |
| Worker | `POST /artifacts/uploads`, `/artifacts/{id}/finalize` | Scope, digest, length, allowed type, lease; server verifies content before promotion |
| Worker | `POST /publications/{id}/claim`, `/publications/{id}/receipt` | Live owner credential confirmation and single publication capability; exact effect ID |
| GitHub, S2 | `POST /integrations/github/webhooks` | HMAC over raw body, delivery-ID dedupe, installation and repository binding |

Better Auth's internal auth routes are mounted separately. Agora does not expose permissive organization-management endpoints as an alternative to its policy checks.

### WebSocket protocol

Browser and worker connections use separate endpoints. Browsers authenticate with the session cookie and strict Origin validation. Workers use short-lived bearer tokens and device-key proof. Tokens never appear in a URL. `hello` negotiates protocol version 1 and the server rejects unsupported versions before accepting commands.

Browser frames are `subscribe`, `unsubscribe`, `ack`, and `ping`. Mutations use HTTP, which keeps replay semantics independent of socket reconnection. Worker notifications announce assignments and cancellation; the worker must fetch and claim the durable run. A notification is not the assignment record.

Streams are per room, per run/session, and per principal inbox. An event is `{schema_version, stream_id, seq, event_id, kind, actor, occurred_at, payload}`. Sequence allocation locks a per-stream counter row within the same transaction as the event. PostgreSQL sequence gaps and timestamps are not used as ordering. No global order across streams is promised. The run card in a room includes `run_revision`; older projections cannot overwrite a newer card.

A snapshot returns state and cursor from one repeatable-read transaction. Subscription starts strictly after that cursor. The event pump reads committed rows ordered by sequence and may redeliver. The client deduplicates by stream and sequence, acknowledges only after applying, and buffers a gap until replay fills it. A cursor below the 30-day replay floor receives `resync_required`; the client fetches a new snapshot. It does not invent missing events. Durable messages and activities remain queryable after event-feed compaction.

Worker events include `producer_event_id` and contiguous `producer_seq`. Retrying the same event returns its receipt. A gap returns the last accepted producer sequence; the worker retransmits from its spool. Server sequences order accepted events. Provider streaming deltas are non-authoritative transient previews. Final responses and typed activities persist before broadcast.

A message body is at most 16 KiB with at most 20 mentions and ten attachment references. An HTTP control body is at most 128 KiB, excluding direct object uploads and the worker event-upload endpoint. Worker event batches have a separate limit of 100 events and 256 KiB. User rate limits default to 60 messages and ten consequential commands per minute, with a burst of ten. Authentication requests are limited by account and IP, with five magic links per email per hour. Limit denial returns a retry interval and creates no partial command.

The server bounds a socket send queue to 1 MiB. Slow consumers receive a resume cursor and close rather than exhausting memory. Membership revocation checks run before each batch. Snapshot plus replay races, two tabs, and disconnect during receipt delivery have mandatory tests.

### End-to-end task sequence

1. Human sends a message. Collaboration stores its revision and room event.
2. Human confirms a task proposal. Control freezes intent, scope, context, policy, payer, placement, base SHA, and acceptance criteria in RunSpec.
3. Control queues a run and posts a room card. The selected worker fetches and claims it. A different worker receives a denial.
4. Worker prepares the environment and runs doctor. Failure produces a blocked/unavailable check and no model execution.
5. Host-owned agent adapter calls the configured model. Typed tools read or modify only the attempt environment. Every tool result becomes bounded activity or an artifact.
6. Worker captures an immutable candidate commit with its Git broker, runs checks on that exact commit, then uploads artifacts and a manifest.
7. Evidence verifies scope, digest, producer, policy, exact base/head, completeness, and check outcomes. Control closes the run and updates task review state.
8. Another maintainer approves exact-head draft publication. The launching developer confirms local credential use. The worker rechecks live remote state, obtains a short publication capability, pushes the task branch, opens a draft, and submits a remote read-back receipt.
9. The center reads the draft and current head using a scoped read credential or S2 GitHub App. It marks draft_open only after the read-back agrees. A human promotes, reviews, and merges on GitHub. Agora never calls the merge API.
10. A post-merge project scenario records the merged revision. Only then does a coding task become completed. Failure opens an incident and leaves completion blocked.

### External effects and retries

Outbox states are pending, claimed, reconciling, succeeded, and needs_attention. Effect keys are typed tuples of project, subject digest, action, and target. Retries use exponential delays of 1, 2, 4, 8, then 30 seconds, jittered, at most five automatic attempts within 15 minutes. Pure reads and uploads may retry. A timeout on a non-idempotent provider or forge action first enters reconciling.

GitHub does not promise a universal idempotency header. Reconciliation reads immutable repository ID, branch head, draft head/base, and an Agora effect marker before repeating creation. A matching foreign resource without the marker is a conflict, never something to adopt silently. If the remote result cannot be proved, stop in needs_attention. Model calls record request ID and billable uncertainty. A timed-out generation never triggers a blind automatic second billable call. Human retry uses a fresh session.

## R08. Local worker and headless execution

The first bounded task MUST run on the launching developer's machine. Machine choice is explicit. Only that owner can launch there. There are no standing delegation policies in S1 through S3. An offline registered machine queues visibly for up to 15 minutes. Wrong owner or wrong repository rejects immediately. No local-to-cloud or machine-to-machine fallback occurs.

The TypeScript CLI provides `agora worker enroll`, `agora worker register`, `agora worker doctor`, `agora worker start`, `agora worker revoke`, `agora worktree prepare`, `agora verify`, and `agora publish`. Commands provide `--help`, `--version`, and versioned `--json` without application startup for help/version. CLI installation does not install a daemon, alter login items, or auto-update. A human explicitly starts the foreground worker.

Enrollment uses a five-minute device-code challenge opened in the authenticated browser. The worker generates an Ed25519 device key, proves possession, and receives a 15-minute access token with a rotating, revocable 30-day refresh credential. Tokens and the private key remain in OS credential storage, with a 0600 file fallback explicitly reported by doctor. They are not inherited by executed commands. Refresh-token reuse revokes the device. A machine has capacity one in S1.

Repository registration records immutable GitHub repository ID, canonical HTTPS remote, default branch, and an owner-approved local source path. It rejects local-file remotes, Git external helpers, credential-bearing URLs, unsafe protocols, path escapes, and unexpected submodule URLs. The worker uses a private managed bare mirror and its own task worktrees. It never attaches task worktrees to the developer's ordinary checkout. This avoids shared mutable refs with active human work while retaining worktree efficiency.

Prepare fetches the recorded default branch and compares the requested base to the advertised remote commit. It creates branch `agora/{task-id}/{run-id}` at that exact SHA. It proves canonical working directory differs from every registered user checkout and lives inside the worker's run root. The new worktree must start clean. Git's worktree lock prevents accidental pruning, not concurrent edits or malicious access. An OS lock plus an owner record protects host Git metadata changes. Task writes do not share a directory, branch, cache-write key, port allocation, fixture database, or process group.

The source worktree is mounted into a rootless Linux container on Linux, or into the Docker Linux VM on macOS. Only source is writable. The `.git` control file and common Git directory are not accessible inside execution. The host Git broker owns all commits, refs, fetches, and publication, with hooks disabled and a sanitized Git config/environment. No developer home, SSH agent, Docker socket, host network, credential directory, or other checkout is mounted. The execution user is non-root, capabilities are dropped, seccomp is enabled, and CPU, memory, PIDs, file size, output, and wall time are bounded. Local containers are a trusted-owner boundary, not safe hostile multi-tenancy.

S1 supports Linux x86_64 and macOS arm64 hosts through this Linux execution contract. The fixture project and pinned image must support both. Windows, native iOS/Android tests, GPUs, and hardware checks are unavailable until a supported runner is added. Local execution refuses if isolation is unavailable; it never silently runs directly in the host shell.

The initial headless adapter is `agora-headless-v1`, a bounded TypeScript tool loop using the OpenAI Responses API from the worker host. The developer configures an exact supported model ID and their own API credential during enrollment. The center's read-only agent uses a separately configured workspace-owned API account. No default model alias is silently substituted. Model names, pricing versions, and provider contract approval are deployment configuration validated by doctor, not unresolved architecture choices.

The adapter exposes only `read_file`, `list_files`, `apply_patch`, and `exec_in_environment`. It cannot call host shell, forge writes, agent spawn, or arbitrary HTTP. Tool schemas bound paths and output. Shell is allowed inside the isolated attempt, subject to network and resource policy. The model loop and provider key stay outside the container. No raw provider credential enters a prompt, run bundle, or artifact. Adapters for existing coding-agent CLIs are deferred until they can pass the same execution-boundary and evidence tests. Merely accepting a command string is not adapter conformance.

Manual contributions use `agora worktree prepare` and the same RunSpec and evidence contract. The developer may edit the allocated worktree in an editor. That makes its evidence `owner_attested`, not independent. Trusted CI remains the review/merge gate. Manual work never writes into an active agent run's worktree.

On disconnect, the worker spools bounded facts to a private run directory. It stops under the lease deadlines in R06 rather than continuing unbounded offline work. Reconnection uploads historical diagnostics only if the fence expired. It offers manual salvage or a fresh run. It never republishes a stale result.

## R09. Environments and cloud execution

Every executable managed project declares `.devcontainer/devcontainer.json`, dependency lockfiles, and `agora/project.json`. Dev Containers and OCI images are the source of environment truth. S1 accepts an owner-approved immutable OCI image and a restricted Dev Container definition. S2 builds images from approved repository definitions. Snapshots are disposable caches, never project state or a recovery prerequisite.

`agora/project.json` is strict versioned JSON. It declares project identity, supported platforms, registered lifecycle commands, scenario selection, sensitive path classes, resource ceilings, egress allowlist, retention, and verification policy. Platform maxima constrain it. A project can narrow but never widen platform authority. Runs pin canonical configuration and policy digests. Unknown fields and unresolved references fail validation. A changed environment or verification policy needs a non-author maintainer review before activation.

Agora implements a restricted Dev Container profile rather than accepting every standard option:

- Allow an immutable image or repository-contained Dockerfile/build context, explicit non-root user, fixed environment names without secrets, and approved in-container lifecycle commands.
- Reject `initializeCommand` because it executes on the host. Reject privileged mode, added capabilities, arbitrary `securityOpt` or `runArgs`, host mounts, host networking, local environment interpolation, and credential forwarding.
- Resolve image metadata as well as repository JSON before validating the effective definition. Image labels cannot reintroduce forbidden options.
- Pin Feature dependencies and base images by digest. S2 permits Features only from a reviewed allowlist. Docker Compose project environments are deferred; the product's own Compose deployment is separate.
- Run approved on-create, update-content, and post-create commands in order inside the isolated environment. Readiness waits for all required commands and project doctor. Any failure blocks the run. Attach hooks are disabled for agents.

S2 image builds run on a separate disposable builder VM, not the center host. A human approval binds definition digest, build context, external package destinations, maximum spend, and image destination. A restricted build service exports an OCI image, SBOM, dependency and secret scan, provenance, and logs. Runtime images contain no private checkout, runtime credential, or persisted task output. Private source enters each environment after allocation through a read-only archive prepared by the repository broker. Cache keys include definition, base image, architecture, lockfiles, and policy. Cold rebuild must pass before an environment version activates.

E2B is the first cloud adapter. The adapter turns a pinned OCI image into an E2B template and records both digests/IDs. This is a selected integration, not a claim that its defaults meet Agora's security policy. Stage-two release is blocked unless the chosen account and region pass the conformance suite, including image import, egress denial, deletion, hard resource limits, and credential isolation. A failed conformance test disables cloud placement. It does not weaken policy or silently select a different vendor.

A cloud runner is a trusted worker deployment with no repository shell on its host. Its model loop and lifecycle credentials stay outside the guest. The guest receives a run capability that cannot call administration, publication, or arbitrary model routes. Forge credentials remain in the external broker. Cloud machine identity is a service principal with a project allowlist, not a borrowed human login. The RunSpec still names the launching human and payer.

Every task attempt gets a new microVM with a full isolated source snapshot and task branch identity. No live guest is shared between projects, people, or attempts. The default shape is 2 vCPU, 4 GiB RAM, 10 GiB disk, 256 PIDs, a 30-minute hard lifetime, and five-minute idle timeout. Project requests above these defaults require approval within platform maxima. Control and provider-side timeout both enforce the lifetime.

Egress defaults to deny and is enforced outside the guest. Allow rules bind exact host, port, method where supported, purpose, and byte budget. S1/S2 permit at most ten exact destination hosts and no wildcard domains. Policy compilation rejects any allow rule that can reach a forbidden destination, even when the provider gives allow rules precedence. Private network ranges, link-local/metadata endpoints, the center administration API, and other environments are always denied. Dependency access uses approved package destinations. Models are called by the host loop, not directly from the guest. DNS rebinding and redirect chains must be checked at the proxy. Use an Agora-controlled external proxy when provider filtering cannot enforce method, byte, or address rules. Denial tests require missing application-level responses and destination-side observations, not socket-connect failure. If the combined provider/proxy path cannot enforce the required rule, that tool is unavailable.

The cloud publication broker applies a validated patch to a fresh host-owned clone, rejects escaping symlinks, hooks, submodule changes outside policy, and undeclared paths, then creates the exact candidate commit. Verification runs against that commit in a fresh environment without write credentials. After human approval, the broker pushes and opens a draft with a repository-scoped GitHub App token. The sandbox never pushes.

## R10. Project provisioning and lifecycle

S2 project creation is a deterministic, journaled operation following R06. The approved proposal freezes the charter, origin conversation, private repository owner/name, initial maintainers, room name, template/version, default branch, effective policy, environment, provider destination, data class, and budget. Public repositories are not supported by the creation flow in these stages.

The workspace owner and a GitHub organization administrator authorize the exact repository creation and App installation. These can be the same person if they hold both roles. GitHub OAuth linking proves immutable account ID, not just a matching email. The provisioning credential is a short-lived, separately stored administrative grant. Ordinary repository operation uses a distinct App permission set with metadata/checks read, contents write, pull requests write, and repository administration only during approved onboarding. The provisioning grant separately authorizes seeding the approved workflow and named CI secret. Checks-writing authority stays with the project-dedicated reporting App, whose human setup is an explicit onboarding prerequisite. No App has a branch-ruleset bypass. Workflow-file modifications require a separate reviewed permission grant.

The journal advances through these idempotent steps:

1. Create the project record, project room, main-agent identity, and proposal receipt in a transaction. These are visible in proposed state.
2. Record human authorization and reserve the provisioning budget.
3. Create the private GitHub repository using the proposal's name and a unique Agora marker. After timeout, query by owner/name and verify marker plus immutable repository ID before retry.
4. Seed the approved template commit, project policy, minimal contributor pointers, verification CLI contract, CODEOWNERS, and CI. No unreviewed script runs on the center host.
5. Configure and read back required pull-request reviews, strict current-base checks, no force push/deletion, expected-App checks, and no App bypass. Missing plan entitlement leaves onboarding blocked.
6. Install/link only the named repositories, bind people by GitHub ID, and apply explicit project roles. The proposal does not grant membership to every workspace member.
7. Build and qualify the environment. Run project doctor and one real scenario on a cold image. Activate the version only after evidence passes.
8. Activate the project-main profile and publish an onboarding receipt with resource IDs, policy, environment, checks, and costs. Mark active.

A crash after any step resumes by reading the remote resource and journal. There is no blind rollback that deletes a repository. An unrelated repository occupying the name produces repair_required. Adoption requires a separate human command with an impact preview. An expired authorization may reconcile an already-created resource but cannot start a new external effect.

Pause revokes new leases and requests cancellation of active work. Reads, diagnostics, and cleanup remain available. Resume revalidates policy, image, membership, credentials, and budget. Archive makes the room read-only, cancels work, destroys cloud environments, disables integration writes and spending, and preserves evidence. Archive does not delete a remote repository.

Deletion is later S3 operational scope. It requires an export option, retention/legal-hold check, impact preview, recent authentication, workspace-owner confirmation, and project-maintainer confirmation by another human. The deletion plan separately lists local data, artifacts, credentials, and any external repository. Remote repository deletion is never inferred from project deletion and requires a distinct exact-resource approval. Tombstones prevent replayed webhooks or old commands from recreating deleted objects. Credentials revoke before data purge. The audit stores the receipt and unresolved external cleanup, not deleted content.

## R11. Git, evidence, publication, review, and merge

The contribution path is task, isolated worktree/environment, exact candidate commit, verification, evidence, publication approval, draft, independent review, and human merge. CLI convenience is not enforcement. GitHub protection and the evidence check enforce managed-project delivery.

`allowed_paths` bounds the publishable change, not a claim that a shell cannot create temporary files inside its disposable environment. File-edit tools validate scope before writes; the Git broker rejects every tracked or untracked source change outside it. Required verification starts from the exact candidate tree. The recorder checks source-tree integrity before and after each scenario. Undeclared source mutation invalidates that scenario's evidence, even when its command exits zero. Declared build, fixture, and artifact output directories are separate from candidate source.

Before publication, compare changed paths with active and recently published tasks on the same repository. Any overlap produces `overlap_detected` and blocks publication until a maintainer records the overlap review. A stale base requires rebase in a fresh attempt and full re-verification. Even a clean Git merge can have semantic conflicts; overlap clearance does not waive combined-base checks. The broker never overwrites commits added by a human. It exports a new branch or blocks for manual handoff.

Default size policy targets one logical change, at most 200 meaningful lines and eight source files. Crossing either threshold requires a scope rationale. At 1,000 lines or 25 source files, publication blocks until the change is split or a non-author maintainer approves a size exception. Generated, vendored, and lockfile counts remain visible even when excluded from meaningful-line counts. No size exception lowers risk or waives checks.

Risk is a deterministic floor computed from actual changes. R0 is documentation or declared mechanical work. R1 is bounded behavior. R2 includes authentication, permissions, secrets, dependencies, migrations, data, billing, public contracts, CI, and verification policy. R3 includes releases, destructive actions, signing, and security-boundary changes. Unknown change classification is R2. A model may raise a concern, never lower the floor. All classes require a non-author human review and human merge in every stage here. R3 execution outside the development environment is forbidden; its result is a proposal for a separate human-operated change.

### Evidence manifest

The worker's deterministic recorder, not the model, writes `agora.evidence/v1`. A manifest contains:

- Workspace, project, task, run, session, producer machine/key, deployment epoch, fence, and timestamps.
- Human owner, adapter and tool versions, provider/model identifier, context digest, policy/profile/configuration digests.
- Repository immutable ID, base SHA, candidate head SHA, tree hash, patch digest, changed paths, size counts, and risk facts.
- Environment definition/image/template, host and execution platform, fixture versions, registered command IDs/digests, arguments with secrets redacted, start/end times, exits, and bounded log digests.
- Required scenario inventory, each outcome, assertions, coverage, known omissions, and unsupported capabilities.
- Artifacts with digest, media type, byte length, capture method, and retention class. UI work includes before/after screenshots at declared viewports, accessibility results, and a short interaction video.
- Side-effect requests and receipts, egress grants used, budget usage, knowledge versions cited, and cleanup outcome.
- Producer signature over canonical manifest JSON and an explicit trust class `owner_attested` or `trusted_ci`.

A device signature proves which enrolled device submitted bytes. It does not prove that a compromised owner machine ran honest tests. The center verifies hashes, identity, scope, lease, exact revisions, declared checks, and artifact availability. Trusted CI independently runs the required checks on the exact head and combined base after the approved draft is pushed, with no publication credential. The project policy declares separate prepublication and postpublication check sets. Local behavior, secret scans, artifact validation, and scope/risk checks are prepublication requirements. Independent CI and combined-base checks are postpublication requirements. The UI labels the draft `CI pending` until they pass. An owner-attested manifest alone never authorizes merge.

Uploads land in quarantine. Finalization verifies SHA-256, length, supported media type, secret scan, and path-safe archive entries. HTML and SVG are downloads, not active previews. Raster previews are decoded/re-encoded. Object keys are scope-prefixed digests, preventing cross-project existence probing. Signed URLs expire in five minutes and follow an authorization check. Human attachments are at most 25 MiB each. Evidence artifacts are at most 100 MiB each and 500 MiB per run. Larger proof requires an approved policy change, not silent truncation. Multipart parts are 5 MiB except the final part, and partial blobs cannot satisfy an evidence gate. Evidence references missing or quarantined blobs fail closed.

### Publication boundaries

A draft-publication approval binds repository ID, branch, base/head, patch and evidence digests, policy, and intended draft action. It expires in 30 minutes. Its approver MUST differ from the task owner and the owner of the authoring agent. The local credential owner separately authorizes use of that credential. In a two-developer team, one person launches and confirms their credential, while the other approves publication and reviews. The approved capability expires after five minutes and permits one branch push and one draft creation, reconciled as one publication effect. The service checks current role, head, policy, cancellation, and effect identity before each external write. Capability expiry permits read-only reconciliation, not another write. A failed publication can reacquire a capability for the same effect only after these checks and a still-valid approval; uncertain completed effects are never repeated blindly. It does not permit protected-branch writes, ready-for-review promotion, deployment, or merge.

S1 publication uses the launching developer's host-side GitHub credential, never the container. The center uses a maintainer-provided fine-grained GitHub token restricted to the selected repository with metadata, contents, pull-request, check, and administration read permissions to verify repository ID, head, checks, and draft state. Onboarding also requires human installation of a separate checks-only reporting App dedicated to that project and installed only on its repository. Its metadata-read/checks-write credential is held only by trusted default-branch CI, not the center, worker, or test job. It cannot write code, create repositories, or bypass branch protection. It rejects classic broad-scope tokens for this service read path. S2 replaces that read credential with the scoped App and adds cloud-broker publication. Credentials are references in records, not payloads. A human can bypass the worker by using their own Git tools; the server-side rules remain the protection.

GitHub requires pull requests, another human review, dismissal of stale approvals, strict up-to-date checks, sensitive-path CODEOWNERS, and `agora/evidence` plus `agora/policy` from the exact reporting App ID. The generic GitHub Actions App is not an adequate producer binding because another workflow can use that same identity. Reviewed default-branch CI runs a fixed test driver against the candidate with read-only credentials. A separate default-branch reporting workflow validates repository, head, base, workflow identity/revision, and evidence, then publishes checks with the checks-only App. It never checks out or executes candidate code with that credential. S2 retains this reporting identity separately from its code-writing provisioning/publication App. Pull-request code cannot replace the authoritative policy or checker. Required jobs run even when a dependent job fails. Missing, unavailable, skipped, neutral, malformed, or wrong-head evidence yields a failing aggregate result.

GitHub's combined-revision check and strict base freshness gate the merge. The human performs the merge in GitHub. Agora observes remote merge SHA through an authenticated read, or S2 signed webhook followed by read-back. A green run card is never merge authority. No automatic merge, bypass endpoint, or agent emergency override exists.

## R12. Verification contract for Agora and managed projects

Agora has two verification levels. The platform suite proves its identity, conversations, leases, permissions, execution boundaries, evidence, and recovery. Each managed project proves its own real application behavior. Neither substitutes for the other.

Every managed project exposes a versioned CLI contract through registered commands:

```text
project doctor --json
project scenarios --json
project start --profile verify --instance RUN_ID --json
project verify --scenario SCENARIO_ID --instance RUN_ID --artifacts DIRECTORY --json
project evidence --instance RUN_ID --json
project stop --instance RUN_ID --json
```

Names above are CLI argument metavariables. The project manifest records the concrete executable and argv. The runner never evaluates command text received from chat. `doctor` is read-only. `start` waits for readiness and returns instance identity, allocated ports, fixture identity, and cleanup handle. `verify` drives the public HTTP, browser, CLI, or native boundary and asserts literal visible values and persisted effects. `stop` acts only on the recorded process tree/resource IDs and proves removal. It preserves evidence.

JSON reports schema version, scenario/run ID, code/config/fixture versions, outcome, diagnostics, artifact list, timestamps, and cleanup receipt. Exit meanings are 0 pass, 1 observed failure, 2 blocked prerequisite, 3 unavailable capability, 64 usage error, and 70 infrastructure failure. Exit 0 with a non-pass outcome, or nonzero with pass, is invalid evidence.

The project feature map relates paths/components to required scenarios and supported platforms. A model can add scenarios but cannot remove required ones. Routes, startup commands, selectors, fixtures, permissions, and environment changes invalidate their mapped verification entries until a live pass. Every new verification skill has Launch, Doctor, Drive, Evidence, Cleanup, and a feature map. It becomes active only after its own instructions run end to end and evidence survives cleanup.

Agora uses Vitest for pure reducers and policy, PostgreSQL integration tests, contract tests with fake providers/workers, and Playwright for the browser. Fakes prove fault handling, not real external compatibility. Release verification additionally uses real accounts, machines, provider calls, artifact storage, email delivery, and GitHub on an approved disposable fixture repository. Guard tests must demonstrate a denial or failure, including a controlled negative fixture that would pass incorrectly if the guard were removed.

UI changes require keyboard-only navigation, screen-reader inspection, contrast/accessibility checks, 390x844 and 1440x900 screenshots, and a 30-60 second video. Reviewers inspect alignment, wrapping, focus order, loading/error/empty states, and reduced motion. A pixel-diff alone does not establish visual quality.

## R13. Durable decisions, knowledge, and observer lifecycle

S1 supports human decision records and immutable task evidence. Agent answers cite those records, but there is no autonomous memory activation. S2 adds reviewed knowledge and persistent project-main context. The durable record is PostgreSQL plus immutable evidence, not a model context window or sandbox disk. Reviewed repository docs may be imported as knowledge candidates with commit provenance. An approved export back to repository documentation uses the normal contribution workflow; it does not create a competing source of authority.

Knowledge states are `proposed`, `active`, `disputed`, `stale`, `superseded`, `revoked`, and `rejected`. Activation requires a project maintainer, evidence, explicit applicability, review date, and either a regression scenario or a reason the claim is not executable. A product decision stores the deciding human's exact words separately from an agent summary. Revisions create new records. A knowledge item can advise but cannot alter tools, budget, roles, egress, or checks.

Deterministic invalidation marks records stale when named code, dependency, fixture, environment, or policy versions change, when evidence disappears or is redacted, when review date expires, or when the regression fails. Default review date is 90 days. Equal-scope contradictions mark both records disputed for operational retrieval until a maintainer resolves them. Recency alone does not win. The UI preserves the conflict and history.

Retrieval first filters caller/audience access, active status, project, version applicability, paths, and task kind. Then it uses FTS. Each context bundle records chosen versions and omissions. Platform rules are separate enforced configuration, not retrieved prose. Cross-project promotion in S3 creates a new redacted workspace-level candidate. It requires the source project's maintainer and a workspace owner, plus a reproducible platform test or evidence from two projects. Promotion never widens the source record's ACL.

The S2 project-main agent is a stable identity and versioned profile. Its sessions are short-lived and reconstruct context from the project record. It has no permanent worktree and cannot retain unreviewed private scratch memory as authority. It proposes dependencies and checks task outcomes, but each execution still requires the named human's launch confirmation. Inter-agent communication is limited to task-scoped request/result records through Control. There is no peer network, broadcast, nested delegation, or automatic task spawning.

S3 observer operation is opt-in per project by a maintainer, visible to every room member. Enabling it authorizes bounded summarization spending but not work execution. The observer reads immutable room revisions after its durable cursor, once per 20 new messages or five minutes while activity exists. It proposes attributed claims, source links, open questions, contradictions, decision candidates, and knowledge candidates. Its transaction records the processed range, proposals, model version, and new cursor. Replaying a range cannot duplicate proposals. Edits and redactions append invalidation events for affected proposals.

The observer never promotes a suggestion to a human decision, activates knowledge, hides dissent, launches tasks, or reads other projects. Disabling it stops new batches and keeps existing proposals. Provider failure leaves the cursor unchanged and records needs_attention after the bounded retry policy. Inactive projects spend nothing. Corrections follow reproduce, evidence, regression, proposed knowledge, human activation, then measured outcomes. No automatic self-modification or instruction rewrite is authorized in these stages.

Measure recurrence by reviewed failure fingerprint, applicable-record retrieval recall, false retrieval, human rejection, stale/conflict age, and citation rate. Stored memory is not a promise that a model has learned. Embeddings and semantic judges remain deferred until a labelled miss set demonstrates a need.

## R14. Human authorization matrix

This matrix owns consequential-action boundaries. Chat text, agent messages, webhook content, and retrieved records cannot substitute for these commands.

| Operation | Human authority | Binding and refusal |
| --- | --- | --- |
| Invite, role change, revoke | Workspace owner, or project maintainer within that project | Exact subject and role. No last-owner removal |
| Ask center | Workspace member/owner with destination-room access; project contributor/maintainer for a project room | Selected context, payer, answer budget. Observers cannot spend or post. No hidden project reads |
| Launch local or manual run | Task owner who owns selected machine | RunSpec digest, repository, scope, cost and isolation preview |
| Launch cloud run | Project contributor with project spending grant | Same RunSpec plus cloud data destination and budget |
| Steer or answer | Task owner or project maintainer | Immutable prompt. Scope/tool/placement expansion needs a fresh approved RunSpec |
| Cancel run | Task owner or project maintainer | Revokes capability immediately. Cleanup state remains separately visible |
| Retry | Task owner | New attempt, explicit same placement, current context and budget |
| Publish draft | Non-author project maintainer, plus local credential owner for local publication | Exact head/base/evidence/policy and 30-minute expiry |
| Promote draft, review, merge | Authorized human in GitHub, independent required reviewer | Protected branch, latest head and combined-base checks. Agora never merges |
| Register existing repository | Workspace owner and verified repository maintainer | Exact immutable repository identity and policy read-back |
| Create repository/install App | Workspace owner and GitHub organization administrator | Exact proposal and permission set, separate integration consent |
| Change policy, egress, template, provider, secret, or budget | Project maintainer within platform caps; workspace owner for platform changes; credential owner for their account | Versioned preview. R2 review for code/config changes. No agent activation |
| Activate knowledge | Project maintainer | Evidence, scope, version, conflicts, review date |
| Enable observer | Project maintainer | Room audience, budget, stop behavior, visible notice |
| Cross-project promotion | Source maintainer and workspace owner | New redacted record and target audience |
| Archive/delete/export sensitive data | Workspace owner; deletion also another project maintainer | Impact preview, retention/legal hold, fresh authentication, exact external-resource confirmation |
| Restore/promote host, rotate service keys | Deployment operator | Runbook, restore proof, new deployment epoch, old host fenced |
| Execute production change, bypass checks, automatic merge | Not authorized | No endpoint, tool, or standing grant |

## R15. Failure recovery

| Failure | Required behavior | Proof before continuing |
| --- | --- | --- |
| Browser disconnect or lost receipt | Reconnect by cursor. Re-send same command ID if necessary | One command receipt, one message/effect |
| Duplicate delivery | Unique command, producer-event, effect, and webhook keys | Existing matching receipt returned; differing body refused |
| Stale or duplicate worker | Reject stale fence/epoch, revoke capabilities, mark lost | Old worker cannot publish or satisfy evidence |
| Service restart | Reload database state, retain valid leases, replay outbox, scan deadlines | Same run/effect IDs; no duplicate model call or push |
| Worker crash during execution | Mark lost at expiry, keep owner worktree and bounded logs | Human chooses retry fresh or manual salvage |
| Cancel during long command | Revoke lease, stop process group, inspect cleanup | Cancelled state plus confirmed or explicitly unconfirmed cleanup |
| Provider timeout or unavailable model | Record incomplete answer/run and billable uncertainty | Human retry; no silent route/account switch |
| Partial project provisioning | Reconcile journal against immutable external resource identity | Match marker, configuration, authority, and resource ID |
| Conflicting commits or stale base | Block publication and create a fresh rebase attempt | New exact-head evidence and new approval |
| Check unavailable or artifact missing | Fail aggregate gate; preserve diagnostic evidence | Supported runner and real pass, never a success override |
| Approval races with policy/head/role change | Invalidate before effect claim under transaction lock | Fresh approval for the changed subject |
| Push succeeds but response is lost | Reconcile remote branch, draft, and effect marker | Live read-back agrees before retry or success |
| Cloud deletion uncertain | Keep environment unconfirmed and count its cost/capacity | Provider inspect proves destroyed or operator resolves |
| Abandoned local worktree | Never force-delete. Mark retained and show path only to owner | Owner export/cleanup command and clean worktree proof |
| Abandoned cloud environment | Reaper every minute uses desired state, run ownership, epoch, and hard TTL | Export bounded evidence, destroy exact ID, read back |
| Database restored from backup | Do not start workers automatically | Rotate worker/publication grants, advance epoch, reconcile remote effects and provider resources |
| Object-store outage | Chat continues without attachments. Evidence stays upload_pending | Digest-verified upload before review eligibility |

Cleanup identity includes resource ID, run ID, path root, process start identity, and deployment epoch. Neither PID alone nor a display name licenses deletion. A run may be terminal with cleanup_failed, but that environment is never reused and capacity remains reserved until resolved. Local dirty work is retained until the owner decides; cloud task disks expire after bounded evidence export because the RunSpec explicitly authorizes disposable compute.

## R16. Threat model and security requirements

Protected assets are project conversations/source, credentials, invitation/session tokens, task authority, evidence integrity, budgets, and developer machines. Adversaries include an uninvited network client, a malicious or compromised member, prompt-injected repository/message/attachment content, compromised dependencies, a dishonest worker, and a hostile execution guest. The deployment operator, host kernel, selected cloud provider, and model processor remain trusted infrastructure with explicit disclosure. The system does not claim resistance to a malicious administrator or full host compromise.

| Threat | Required control and negative test |
| --- | --- |
| Cross-project read or confused deputy | Access before query/ranking, audience-intersection context, composite scope references, revocation on delivery. Ask from general room for a private project fact and prove no disclosure |
| Prompt injection | Fixed system/profile instructions, quoted source data, read-only center tools, no model-granted authority, bounded execution tools. Inject role changes and exfiltration requests into text and files |
| Browser XSS and secret-link exfiltration | Safe Markdown renderer, no raw HTML, no external image autoload, CSP, no unsafe URL schemes. Agent-produced external URLs remain plain text; trusted source citations are generated from stored IDs |
| Session theft/CSRF/WebSocket hijack | Secure cookies, Origin and CSRF checks, login/invite rate limits, one-use tokens, recent-auth gate, session revocation |
| Host escape or credential exposure | Isolated task environment, no host mounts/socket/home/Git credentials, sanitized argv/env, external egress control, export validation |
| Forged or stale evidence | Signature and lease checks, exact head/config, immutable blobs, independent CI with no write credential |
| Approval replay | Subject/policy digest, actor eligibility, expiry, single effect consumption, live recheck |
| Supply-chain and malicious Dev Container | Digest-pinned builds, reject host lifecycle hooks and privilege options including image metadata, reviewed Features, SBOM and scan |
| SSRF and network exfiltration | No generic fetch tool in center; exact broker destinations; DNS/redirect checks; deny metadata/private ranges; bounded bytes |
| Resource exhaustion/cost attack | Per-user rate limits, socket/output/artifact bounds, transactional budgets, host and provider resource caps |
| Log/artifact poisoning | Bounded structured metadata, no evaluation of embedded commands, escaped previews, quarantine and scans |
| Worker impersonation | Device-key enrollment, short tokens, repo/owner binding, fencing and epoch rotation |

Secret values never enter the database, model context, telemetry, URLs, or evidence. The center stores encrypted secret blobs outside PostgreSQL under references, with a host-held encryption key and off-host encrypted backup. Workers use OS credential storage. Runtime grant scopes and secrets are distinct. Local Git and model credentials stay local. Cloud Git and model credentials stay in their external brokers. Secret entry occurs in a dedicated masked form and is never sent as a message. Redaction reduces accidental leaks but does not make private data safe for an unapproved provider.

Provider configuration MUST record permitted data classes, retention/training terms, approved region when offered, payer, exact model, pricing version, and timeout. A provider without approved handling for project-confidential data is unavailable for that project. No cross-provider fallback exists by default.

## R17. Deployment, operations, retention, and budgets

S1 deploys the browser assets and one Node 22 service behind Caddy on one cloud VM with Docker Compose. PostgreSQL 16 has a private network and persistent volume. Artifact storage is an external S3-compatible private bucket. SMTP sends invitations and login links. A 2-vCPU, 4-GiB VM is the initial center capacity, not a tested sizing claim. No project execution or image build runs there.

Use immutable versioned container images and dependency lockfiles. The operator reviews security updates monthly and urgent patches promptly. Runtime major upgrades occur before upstream end-of-support through the same compatibility suite. Node 22 and PostgreSQL 16 are the baseline, not a permanent version freeze.

The service uses a dedicated unprivileged user, read-only filesystem except explicit state, no container-management socket, minimal inbound ports 443 and operator-only SSH, and separate database/backup credentials. Caddy terminates TLS. Health endpoints separate liveness from database, object storage, email, provider, and reconciliation readiness. A provider outage must not fail chat health.

Migrations run as a one-shot deployment command under a database advisory lock after an encrypted backup. Use additive expand/migrate/contract changes. Support server wire version 1 and its previous compatible minor during a rolling client cache transition. Unknown required fields fail closed, not ignored. Destructive schema contraction waits one release and a restore drill. Rollback uses the prior image for compatible changes, otherwise a forward repair or tested restore. No automatic schema downgrade touches user data.

Backups include daily encrypted database base backups, continuous WAL archive with a five-minute upload ceiling, versioned artifacts, and separately encrypted configuration/secret references. Keep 30 daily recovery points. S1 targets RPO at most 15 minutes and RTO at most four hours under VM loss, proved by restore to a separate host before release. Monthly restore drills verify database integrity, artifact samples, permissions, epoch fencing, and a user journey. Key recovery material must not exist only on the lost VM. S3 adds automated backup auditing and restore evidence export, not the first backup implementation.

OpenTelemetry carries request, workspace, project, task, run, lease, approval, effect, and deployment correlation. Logs contain metadata, outcomes, and digests rather than message/prompt contents. Metrics include queue age, active leases, expiries, duplicate suppression, event lag, outbox lag, model cost, unpriced usage, denied egress, quarantine failures, disk pressure, backup age, and restore age. Alert on backup/WAL lag over 15 minutes, outbox age over five minutes, repeated lease loss, disk usage over 80%, and leaked cloud resources beyond TTL. S1 includes operator-visible alerts; S3 adds audit export and longer operational drills.

Default retention:

| Data | Retention |
| --- | --- |
| Active-room messages, decisions, activated knowledge | Project lifetime, subject to owner deletion/redaction and legal hold |
| Event replay rows | 30 days; durable activities/messages remain |
| Run metadata, approvals, audit, publication/effect receipts | One year; irreversible dedupe tombstones retain minimal identity indefinitely |
| Successful evidence and artifacts | 180 days; evidence supporting active knowledge is pinned until superseded |
| Failed-run artifacts | 30 days |
| Raw provider payloads | Not retained by default; approved diagnostic capture seven days with restricted access |
| Partial/quarantined uploads | 24 hours unless an incident hold exists |
| Worker local spool | Seven days after acknowledged upload; dirty source retained until owner action |
| Cloud environments | Destroy after run termination/export, at most hard TTL plus a two-minute cleanup grace |
| Backups | 30 days; deleted content can remain only until those backups expire |

Read-only answers have a 120-second wall limit, at most eight tool calls, and at most 4,096 output tokens. Coding attempts allow at most 24 model turns and 64 tool calls within the 30-minute wall limit. Ordinary commands time out after 120 seconds; registered verification commands may run up to ten minutes within the same wall budget. Capture at most 1 MiB of output per command and 10 MiB per run, with explicit truncation markers. Missing required proof caused by truncation is unavailable, never pass.

S1 concurrency is one coding run per machine, two per project, four per workspace, and two center questions per workspace. Default caps are USD 1 per question, USD 5 per coding attempt, USD 20 per project/day, and USD 100 per project/month. Cloud execution adds compute to the same reservation in S2. Template builds cap at USD 10 and 30 minutes by default. A launch reserves the maximum allowed charge atomically; completion reconciles actual usage and releases unused reservation. Unknown or unpriced usage consumes the full reservation and blocks further work until reconciled. Provider billing may lag, so limits bound new calls rather than promise exact final invoices. Humans must approve increases before new work, not after exceeding a cap.

## R18. Accessibility and performance budgets

Target WCAG 2.2 AA. Every action is keyboard-accessible, focus returns to the trigger after a panel closes, status is not color-only, reduced motion is honored, and live announcements batch progress rather than reading every streamed token. Virtualized timelines expose semantic message groups and a Load older messages control. Approval previews have readable action, audience, cost, and consequence text.

Release budgets use a seeded workspace of 50,000 messages, five projects, 20 browser connections, and four active runs. Unless stated otherwise, measure p95 over at least 100 operations after warm-up on the reference VM with 100-ms client round-trip latency.

- Persisted message acknowledgment at most 300 ms server time and other-browser visibility at most one second end to end.
- Search first page at most 500 ms server time with ACL filtering.
- Room usable at most 2.5 seconds on a 10-Mbps connection; initial compressed JavaScript at most 350 KiB.
- Resume 1,000 missed events within two seconds without duplicates or gaps.
- User command receipt at most one second, excluding provider work. Initial agent state visible within 10 seconds.
- Center event-loop p95 lag below 50 ms under reference load. Logs/artifacts cannot starve chat.
- Cancellation capability revocation within one second server time; process shutdown within 60 seconds including worker disconnect.
- S2 ready cloud sandbox p95 at most 120 seconds from an already-built template; cold image build at most 20 minutes for the fixture project.

Each delivery unit measures its named metric on trunk first, then interleaves five trunk/head probe batches. Equivalent scenarios fail above a 10% p95 regression or the absolute budget. When trunk lacks a feature, measure the existing host cost on both revisions and the added feature separately against its absolute budget. Do not claim a ratio between unlike scenarios.

## R19. Acceptance criteria and mandatory live scenarios

No criterion is currently claimed as passed. Each row is a future release gate. Evidence includes exact revision, environment, inputs, observed outcomes, screenshots/transcripts, negative-case receipts, cleanup, and a reviewer. Plan unit and task traceability appear in the companion documents.

| ID | Acceptance criterion | Mandatory live scenario | Plan units |
| --- | --- | --- | --- |
| AC01 | Only invited verified humans enter, with correct roles and revocation | LV01. Owner invites second real email; accept once, replay/expire invitation, deny outsider, revoke a signed-in member and observe subscription closure | U02, U09 |
| AC02 | Shared rooms, threads, edits, unread, and search preserve scope | LV02. Two browsers on different machines converse, edit and search; observer cannot post; project outsider sees no message, title, count, or artifact | U02, U03, U09 |
| AC03 | Ordering and replay survive duplicate sends and restart | LV03. Concurrent sends, lost HTTP receipt, duplicate client ID, socket gap and service restart produce exactly one ordered shared record | U03, U09 |
| AC04 | Center answers from explicit context with citations and visible state | LV04. Ask a real provider-backed question about a recorded decision; verify citation revision, partial-context disclosure, no private-project answer in a general room, and no hidden reasoning | U04, U09 |
| AC05 | Chat cannot execute; approved owner placement can | LV05. Imperative mention produces only proposal; confirm Run on my machine; wrong-owner/repo denies, offline machine waits then fails without fallback | U05, U06, U09 |
| AC06 | One fenced run owns one task and stops safely | LV06. Competing workers, killed worker, lease expiry, late event, cancellation, and fresh retry prove one accepted fence and rejected stale publication | U05, U06, U09 |
| AC07 | Local work cannot mutate the user's checkout or access credentials | LV07. Real task edits fixture app in isolated environment; compare user checkout before/after; attempt host path, socket, metadata egress and credential reads; all deny | U06, U07, U09 |
| AC08 | Evidence proves the project's behavior and fails closed | LV08. Drive fixture app through browser and project CLI; preserve artifacts; unavailable command, wrong SHA, altered digest, and missing upload all block | U07, U09 |
| AC09 | Publication and merge have separate human gates | LV09. Attempt publication without approval, self-approval, stale head, reused approval, and denied credential use; then approve exact draft, verify remote receipt, independent GitHub review, human merge, and post-merge scenario | U08, U09 |
| AC10 | Injection cannot widen authority or produce active exfiltration links | LV10. Put hostile instructions in thread, file, and tool result; inspect denied tools, scope filters, rendered links, audit, and no forbidden network effects | U04, U07, U09 |
| AC11 | Center survives restore and bounds cost | LV11. Reserve concurrent budgets, exhaust a cap, simulate unpriced usage; restore backup on separate host, fence old worker, replay an uncertain effect once | U01, U05, U09 |
| AC12 | The complete two-person workflow is usable and measurable | LV12. Developer A and B on two machines complete invitation, conversation, center question, local task, evidence, independent publication approval and review; keyboard/screen-reader pass, both viewports, video, and R18 load probes | U09 |
| AC20 | Project creation converges under crash and least privilege | LV20. Approve disposable private project; interrupt after remote create; resume to one repository/room/main-agent; wrong installation and occupied name fail closed | U10 |
| AC21 | Declarative environment cold build and sandbox isolation work | LV21. Cold-build OCI, run in fresh E2B guest, deny host hooks/secrets/egress, destroy guest, delete snapshot cache and rebuild | U11, U12 |
| AC22 | Persistent main agent reconstructs approved project context | LV22. Create decision and active lesson, restart service, ask project main agent for cited rationale; dispute/invalidate lesson and prove it is absent from new context | U13 |
| AC23 | Cloud and local runs have equivalent contract and review gates | LV23. Same fixture/base/RunSpec semantics on each placement produce equivalent assertions and manifest fields; test stale fence, cancel, overlap, and unavailable check on both | U14 |
| AC24 | Cloud recovery has no abandoned authority or unlimited bill | LV24. Interrupt allocation, lose runner, expire budget, and make destroy unavailable; reconcile exact IDs, show unconfirmed resources, enforce provider TTL and fresh-run recovery | U12, U14 |
| AC30 | Observer and promotion preserve provenance and human authority | LV30. Enable observer, replay batch, edit source, preserve disagreement, activate with human review, promote a redacted multi-project lesson, revoke and prove retrieval exclusion | U15 |
| AC31 | Operations and deletion are recoverable and auditable | LV31. Restore, migrate/rollback-compatible deploy, export audit, archive, delete approved fixture data with hold test, reconcile external resources, verify tombstones and alerts | U16 |
| AC32 | Optional bridge is a notification path, never authority | LV32. Explicitly install Slack bot, mirror one approved card/link, duplicate delivery, revoke installation, and prove Slack text/buttons cannot launch, approve, or expose another project | U17 |

## R20. Deferred capabilities and promotion triggers

These are outside the implementation queue unless the stated trigger produces a separately reviewed specification amendment. They are not unresolved choices in this baseline.

| Deferred capability | Promotion trigger |
| --- | --- |
| Desktop shell or PWA/offline cache | Two documented user workflows require native integration or offline access that browser plus worker cannot provide; a security/update design and usability trial pass |
| Direct messages, reactions, push, rich presence | S1 usage shows a repeated communication gap; audience and observer privacy tests are specified first |
| Browser IDE, terminal attach, computer takeover | A project cannot complete a required human recovery step through artifacts and local tooling; control handoff and secret-entry tests exist |
| External headless agent CLI adapters | A requested runtime proves shell isolation, credential separation, typed events, cancellation, and evidence under the existing adapter suite |
| More repositories per project | A real task needs atomic cross-repository delivery; dependency, approval, and rollback contracts are designed first |
| Other cloud providers or self-hosted microVM fleet | E2B fails a required conformance gate or measured cost/residency need justifies replacement; same RunSpec suite must pass without policy changes |
| Embeddings, rerankers, Jev | At least 100 reviewed retrieval misses or 500 labelled advisory classification cases show FTS/rules inadequate; privacy approval and frozen evaluation beat the baseline. Never authorization |
| Automatic draft publication | At least 100 human-reviewed low-risk runs with no unauthorized or stale publication and an explicit policy amendment; human merge remains mandatory |
| Automatic merge or production execution | Not authorized by this specification. Requires a new product/security decision, not a usage threshold |
| General peer agent messaging or nested delegation | Measured tasks fail under one-level task-scoped coordination and a bounded protocol experiment proves ownership, budget, and recovery |
| Multiple service replicas/managed workflow engine | Sustained R18 failure after query/index tuning, or repeated demonstrated reconciliation complexity; partition/ordering and failover proof precede migration |
| Public tenants, federation, high availability | Contractual isolation or availability requirement, independent security review, and tested tenant/host failure boundaries |
| Voice or two-way chat bridges | Proven accessibility or team adoption need, explicit data-sharing approval, and typed human identity/command contracts |
| Scheduled autonomous work | A named project owner grants a bounded schedule, spend, cancellation, and review policy in a separate amendment |

The optional one-way Slack bridge is already authorized as S3 U17 but remains disabled until an owner requests and approves its scopes. None of these triggers authorizes this design task to implement, deploy, purchase, publish, or merge anything.
