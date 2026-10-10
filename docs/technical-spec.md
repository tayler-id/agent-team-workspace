# Agora technical specification

Status: revised design baseline, 2026-09-20. Implementation is not started. This revision incorporates two independent reviews and supersedes the earlier stack, contract, and delivery-boundary defaults.

Audience: product engineers, security reviewers, operators, and managed-project maintainers. MUST, MUST NOT, and REQUIRED are release gates. Defaults are enforceable configuration values, not predictions of measured performance.

This document owns product behavior and system contracts. [The implementation plan](implementation-plan.md) owns delivery order. [The task breakdown](task-breakdown.md) owns transferable work items. [The research basis](research-basis.md) records architecture selection, public evidence, and limits. [The decision trail](decisions.tsv) records choices append-only.

## R01. Product boundary and delivery stages

Agora is an invitation-only communication center where developers talk with each other and visible agents, ask questions, and launch bounded work from a conversation. Agora owns the shared record. GitHub owns repositories and the final merge barrier. A developer's machine or a cloud sandbox executes work but does not own its durable state.

The first audience is a trusted team of two to five developers. One deployment hosts one workspace. Every project has explicit membership, a project room, and a stable project-main agent identity. In S1 that identity displays `not_enabled` and makes no model calls. S2 activates its persistent conversation and coordination role. This preserves the target hierarchy without pretending the first release implements it.

| Stage | Authorized scope | Release boundary |
| --- | --- | --- |
| S1, first runnable release | Executable test-first foundation, portable contracts, hosted browser center, invitations, registered existing projects, rooms and threads, selected-record answers, bounded owner-machine work, evidence, approved draft publication, human review and merge | AC00 and AC13 through AC15 qualify the foundation/boundaries; AC16 qualifies the Agora application architecture's feature-discovery and Client/Host boundaries; two real accounts on two machines complete AC01 through AC12 |
| S2, later stage | Create projects from conversation, GitHub provisioning, declarative image builds, E2B microVM adapter, active persistent project-main agents, reviewed project knowledge, local/cloud parity, one external coding-agent adapter, native Swift client, conversational agent creation with per-agent isolated environments | AC20 through AC27 |
| S3, later stage | Observer capture and knowledge proposals, cross-project promotion, operational hardening, optional one-way Slack notifications, the built-in Bug Agent role | AC30 through AC33 |

Foundation work is part of S1, not a separate product release. U01a through U01d qualify repository/contracts/gates, fixture/trusted checks, backup/restore, and the selected React client in separate reviewable milestones. No substantive feature or write-enabled agent work starts before the R22 foundation gate passes. Only code needed to build and test this foundation may precede that gate. No task after the S1 release gate belongs in the initial queue.

Goals are readable shared conversation, clear human ownership, predictable execution, reviewable evidence, and recovery without duplicate effects. The target remains cloud-first for unattended work. Local execution first proves the common run contract without a sandbox account or remote repository-provisioning authority.

Non-goals are replacing GitHub, building an IDE, hosting arbitrary public tenants, a general agent swarm, automatic merge, production deployment by agents, and a full Slack clone. Direct messages, reactions, rich presence, voice, federation, and user-defined workflow languages are not part of these three stages. A native Mac client is S2; a general native macOS coding runner is separate deferred work.

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
| Agent question, S1 | Member mentions `@center` in a thread or chooses Ask center. A scope preview lists selected Agora records before spending. This is not general web research or repository investigation. | The center answers with source links or states that evidence is insufficient. This click authorizes the displayed model cost ceiling, not execution. |
| Task launch, S1 | Contributor chooses Create task from the thread, edits goal and acceptance criteria, selects their own registered machine, and confirms Run on my machine. | A task and first run appear in that thread. The confirmation binds scope, machine, base commit, environment, tool set, provider account, and limits. An imperative mention only opens this proposal. |
| Project registration, S1 | Workspace owner and repository maintainer register an existing GitHub repository, map membership, and run onboarding checks. | The room exists immediately. Coding runs remain disabled until repository identity, environment, verification contract, and branch protection pass. No repository is created. |
| Project creation, S2 | Member asks the center for a project. An owner edits a proposal with repository owner/name, private visibility, members, template, policy, and spend. The owner confirms provisioning. | A project room shows each observed provisioning step. The project activates only after its repository, checks, environment, and main agent pass onboarding. |
| Cloud execution, S2 | Contributor selects Cloud on a task and confirms the displayed data destination and budget. | A fresh microVM executes the same RunSpec as local execution. The result, evidence, and approval card remain in the originating thread. There is no fallback from an unavailable local machine. |
| Local contribution, S1 | Developer registers a checkout, launches an agent run, or claims a manual task and asks the worker to prepare an isolated worktree. | Their normal checkout stays unchanged. Manual work produces the same evidence and publication request as agent work. |
| Review, S1 | Another project maintainer opens the evidence card, reviews intent, diff, exact commits, checks, and UI proof, then approves publication. | The owner separately confirms use of their local Git credential. The worker pushes the approved branch and opens a draft. The other human reviews on GitHub and a human merges. |
| Recovery, S1 | Owner sees a lost, blocked, or failed run, reads the last observed facts, and chooses Retry fresh, Cancel, or Keep for manual recovery. | A fresh run gets a new ID and fence. Old results remain historical and cannot publish. Uncommitted local work is never silently removed. |

## R03. Architecture and component ownership

Selected design: one hosted modular Node service with PostgreSQL, an S3-compatible artifact store, a browser client, and outbound workers. [Architecture selection](research-basis.md#architecture-selection) compares this with a chat-host extension and a distributed actor service. The browser requires no privileged local APIs. The worker supplies the local execution boundary. React is the selected initial browser renderer after independent review of framework and framework-free alternatives. It is not the client synchronization architecture. A separate native Swift client follows in S2; it does not require replacing the service or embedding JavaScript. There is no competing-framework prototype prerequisite.

```text
Browser -- HTTPS commands + resumable WebSocket events --> Center service
                                                         | PostgreSQL 18
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
| Web | React 19, TypeScript, Vite, TanStack Router and Query; accessible projections of Client core snapshots | Authorization, synchronization rules, raw secrets, workflow transitions |
| Client core | Framework-free immutable state, cursor replay, dedupe, revision ordering, unread/drafts, command receipts and retry decisions | React, DOM, router/query cache, transport or server imports |
| API | Hono on Node 24 LTS, authoritative JSON Schema validation, auth middleware, versioned HTTP and `ws` transport | Repository code execution or public schemas defined by framework types |
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
| Storage | Private Drizzle adapter and reviewed SQL migrations, FTS, object metadata; explicit SQL for claims, counters, budgets, outbox and snapshots | Public database access, exported row/query-builder types |
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

These are specification signatures, not source files. Each interface hides the transaction, credential, retry, or process mechanics it owns. Callers do not orchestrate a sequence of load, validate, and save wrappers. External SDK and database row types stay inside their adapter modules. OpenAPI 3.1 and JSON Schema 2020-12 are the authoritative wire contracts in R21. Generated TypeScript/Swift consumers are separate from domain types. Zod 4 may validate internal non-wire values only, never establish a second public contract. Mechanical import rules reject React/TanStack, Hono, Drizzle, transport, and provider SDK types across domain or contract boundaries.

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
| Native client device | Revocable public-client session of a human, separate from worker identity | Same human actions and current-role checks as browser, with scoped tokens and recent-auth proof; no execution authority from client installation |
| Created agent | Stable identity scoped to one project/room, with its own isolated environment, S2 | Run its approved routine packs and automations inside its granted tools, network policy, and credentials; no authority beyond its creation approval |
| Bug Agent | Built-in created-agent role, read-only by default, S3 | Reproduce and report defects with cited evidence; propose a bounded repair task; cannot approve, merge, or authorize its own fix |

R26 defines the conversational creation flow, per-agent environment, and the Bug Agent role in full; this table only fixes their principal identity and boundary.

An agent has an audit identity but no interactive login and no independent ambient authority. Effective reads are the intersection of caller access, agent grants, selected scope, and the destination room audience. A center answer posted in a general room cannot reveal project-only records, even if its requester can read those records. Such a question must move to the project room.

S1 includes the native-client authentication boundary, tested with the generated Swift conformance client before a native UI exists. Register first-party public client IDs and use Better Auth's OAuth Provider device-authorization integration, RFC 8628, through the system browser. The approval page shows the client, API audience, scopes, code match, and device-possession warning. Codes expire in five minutes; polling begins at five seconds and honors `slow_down`. Use `/oauth2/token` for audience-scoped access/refresh tokens, not the plugin's bare `/device/token` session-token route. Access lasts 15 minutes; refresh rotates, expires at 30 days, and reuse revokes the device. Tokens live in Keychain, never a browser-cookie copy or embedded client secret.

A `client_device` token cannot enroll or impersonate a worker, and a worker token cannot approve as a human. Sensitive approvals still require authentication within ten minutes. A system-browser step-up produces a one-use 60-second approval challenge bound to device, human, action, and subject digest. Refreshing an access token does not refresh authentication age. Logout/revocation closes subscriptions and erases local private caches. Native sockets authenticate with a bearer header on their dedicated endpoint, not URL tokens; browser cookies remain subject to Origin checks.

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

The immutable `agora.run-spec/v1` contains `task_id`, `attempt_ordinal`, `human_owner_id`, `project_id`, `repository_id`, `origin_message_revision_id`, `intent`, `acceptance_criteria`, `allowed_paths`, `base_sha`, `context_digest`, `profile_digest`, `policy_digest`, `environment_version`, `placement`, `execution_target`, `required_capabilities`, `adapter_id`, `model_route_id`, `payer_id`, `limits`, and `required_prepublication_scenarios`. The server resolves references and produces its digest before launch. An empty acceptance list, unknown scenario, unresolved price, or scope that cannot be enforced rejects launch. Follow-up text cannot change this object.

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

HTTP mutations use `/api/v1`, JSON, a `command_id`, and an expected aggregate revision for state-sensitive operations. The server derives actor from authentication. It rejects actor IDs offered as authority by a client. The pinned JSON Schema validator rejects unknown fields and bounds strings, arrays, durations, paths, and numeric ranges without coercion, default insertion, or property removal. R21 defines cross-language and version conformance. Malformed input is 400, unauthenticated is 401, unauthorized is 403, absent or inaccessible object reads are 404, stale revision or mismatched duplicate body is 409, expired lease is 410, and budget/rate denial is 429. Errors include a stable reason code and correlation ID, never secret values.

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
| Native client | Device-code issuance, `/oauth2/token`, revocation, `/client-devices/{id}/step-up` | Registered public client, fixed API audience/scopes, browser human consent, refresh rotation, one-use subject-bound recent-auth challenge |
| Worker | `POST /worker/enrollments`, `/worker/enrollments/{id}/exchange` | Human-approved device code challenge, public key proof, own machine only; not human-client tokens |
| Worker | `POST /worker/runs/{id}/claim`, `/heartbeat`, `/events`, `/complete` | Assigned RunSpec and current fence; server generates authoritative order |
| Worker | `POST /artifacts/uploads`, `/artifacts/{id}/finalize` | Scope, digest, length, allowed type, lease; server verifies content before promotion |
| Worker | `POST /publications/{id}/claim`, `/publications/{id}/receipt` | Live owner credential confirmation and single publication capability; exact effect ID |
| GitHub, S2 | `POST /integrations/github/webhooks` | HMAC over raw body, delivery-ID dedupe, installation and repository binding |

Better Auth's internal auth routes are mounted separately. Agora does not expose permissive organization-management endpoints as an alternative to its policy checks.

### WebSocket protocol

Browser, native-client, and worker connections use separate endpoints. Client core consumes transport-neutral events from a narrow adapter; sockets and HTTP caches cannot own a second timeline. Browsers authenticate with the session cookie and strict Origin validation. Workers use short-lived bearer tokens and device-key proof. Tokens never appear in a URL. `hello` negotiates protocol version 1 and the server rejects unsupported versions before accepting commands.

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

The TypeScript worker is a standalone protocol client. It imports only its own execution modules, generated public contracts, and libraries allowed by R21, never center/domain/storage internals. Ship signed, checksummed executables with an embedded Node 24 runtime for Linux x86_64 and macOS arm64. Installation requires no preinstalled Node, npm, or Bun and creates no daemon. U06 qualifies the Node single-executable build, included assets, keychain helper, clean-machine install/uninstall, and protocol upgrade behavior. A failed packaging test blocks distribution, not permission to require a developer runtime. Go, Rust, Swift, or another implementation can replace it by passing the same protocol suite.

The TypeScript CLI provides `agora worker enroll`, `agora worker register`, `agora worker doctor`, `agora worker start`, `agora worker revoke`, `agora worktree prepare`, `agora verify`, and `agora publish`. Commands provide `--help`, `--version`, and versioned `--json` without application startup for help/version. CLI installation does not install a daemon, alter login items, or auto-update. A human explicitly starts the foreground worker.

Enrollment uses a five-minute device-code challenge opened in the authenticated browser. The worker generates an Ed25519 device key, proves possession, and receives a 15-minute access token with a rotating, revocable 30-day refresh credential. Tokens and the private key remain in OS credential storage, with a 0600 file fallback explicitly reported by doctor. They are not inherited by executed commands. Refresh-token reuse revokes the device. A machine has capacity one in S1.

Repository registration records immutable GitHub repository ID, canonical HTTPS remote, default branch, and an owner-approved local source path. It rejects local-file remotes, Git external helpers, credential-bearing URLs, unsafe protocols, path escapes, and unexpected submodule URLs. The worker uses a private managed bare mirror and its own task worktrees. It never attaches task worktrees to the developer's ordinary checkout. This avoids shared mutable refs with active human work while retaining worktree efficiency.

Prepare fetches the recorded default branch and compares the requested base to the advertised remote commit. It creates branch `agora/{task-id}/{run-id}` at that exact SHA. It proves canonical working directory differs from every registered user checkout and lives inside the worker's run root. The new worktree must start clean. Git's worktree lock prevents accidental pruning, not concurrent edits or malicious access. An OS lock plus an owner record protects host Git metadata changes. Task writes do not share a directory, branch, cache-write key, port allocation, fixture database, or process group.

The source worktree is mounted into a rootless Linux container on Linux, or into the Docker Linux VM on macOS. Only source is writable. The `.git` control file and common Git directory are not accessible inside execution. The host Git broker owns all commits, refs, fetches, and publication, with hooks disabled and a sanitized Git config/environment. No developer home, SSH agent, Docker socket, host network, credential directory, or other checkout is mounted. The execution user is non-root, capabilities are dropped, seccomp is enabled, and CPU, memory, PIDs, file size, output, and wall time are bounded. Local containers are a trusted-owner boundary, not safe hostile multi-tenancy.

S1 supports Linux x86_64 and macOS arm64 hosts through the Linux execution profile. Linux requires rootless Docker Engine. macOS requires Docker Desktop with its Linux VM running; other Docker-compatible VM providers are not qualified initially. Doctor names the missing prerequisite instead of installing it implicitly. The fixture and pinned image support linux/amd64 and linux/arm64. Host OS is an observed machine fact, separate from RunSpec's execution target, placement and required capabilities. A Mac host executing Linux is not native macOS/Xcode evidence. R24's capability matrix governs selection; Windows, native managed-app builds, GPUs, and hardware checks remain unavailable until qualified. Local execution refuses if isolation is unavailable; it never silently runs directly in the host shell.

The initial headless executor is `agora-headless-v1`, a bounded TypeScript tool loop over a provider-neutral ModelAdapter. Requests contain an explicit model route, data classification, bounded input, registered tool schemas, token/cost limits, and cancellation identity. Responses are closed text/tool-request/usage/finish/error variants, never vendor SDK objects. Conformance targets include OpenAI Responses and Anthropic Messages plus deterministic and external-CLI fakes. At least two real provider adapters must pass approved read-only conformance before model-backed capabilities enable; the launching developer selects one exact approved model and credential. There is no silent fallback or unsupported tool emulation. Providers without approved data terms remain unavailable.

The center uses a separately configured workspace-owned provider account. The neutral suite covers streaming fragmentation, duplicate tool IDs, malformed arguments, unsupported capabilities, cancellation, uncertain billing, timeout, rate denial, and finish reasons. Provider-specific event handling stays inside each adapter. A bounded external coding-agent CLI adapter is an explicit S2 deliverable in R24, not an indefinite deferral.

The adapter exposes only `read_file`, `list_files`, `apply_patch`, and `exec_in_environment`. It cannot call host shell, forge writes, agent spawn, or arbitrary HTTP. Tool schemas bound paths and output. Shell is allowed inside the isolated attempt, subject to network and resource policy. The model loop and provider key stay outside the container. No raw provider credential enters a prompt, run bundle, or artifact. The first external coding-agent CLI adapter is S2 U18 and must pass the same execution-boundary and evidence tests. Merely accepting a command string is not adapter conformance.

Manual contributions use `agora worktree prepare` and the same RunSpec and evidence contract. The developer may edit the allocated worktree in an editor. That makes its evidence `owner_attested`, not independent. Trusted CI remains the review/merge gate. Manual work never writes into an active agent run's worktree.

On disconnect, the worker spools bounded facts to a private run directory. It stops under the lease deadlines in R06 rather than continuing unbounded offline work. Reconnection uploads historical diagnostics only if the fence expired. It offers manual salvage or a fresh run. It never republishes a stale result.

## R09. Environments and cloud execution

Every executable managed project declares `agora/project.json`, dependency/toolchain locks, an execution target, and required capabilities. The initially enabled Linux profile also requires `.devcontainer/devcontainer.json`; Dev Containers and OCI images are that profile's environment truth. They are not a universal format for native macOS projects. A future native profile instead pins macOS, Xcode/SDK, Apple hardware/VM isolation, and process ownership while retaining the same run/evidence/CLI semantics. S1 accepts an owner-approved immutable OCI image and a restricted Dev Container definition. S2 builds images from approved repository definitions. Snapshots are disposable caches, never project state or a recovery prerequisite.

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

Every task attempt gets a new microVM with a full isolated source snapshot and task branch identity. No live guest is shared between projects, people, or attempts. This attempt-scoped, disposable microVM is not [a created agent's own persistent environment under R26](#r26-conversational-agent-creation-and-the-bug-agent-role): that environment belongs to one agent identity across many attempts and is provisioned, paused, and destroyed explicitly, never replaced per attempt the way this one is. The default shape is 2 vCPU, 4 GiB RAM, 10 GiB disk, 256 PIDs, a 30-minute hard lifetime, and five-minute idle timeout. Project requests above these defaults require approval within platform maxima. Control and provider-side timeout both enforce the lifetime.

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

Registered projects have minimal pause/resume/archive in S1 before tasks can execute. S2 extends those controls to provisioned/cloud resources; S3 alone adds governed deletion. Pause revokes new leases and requests cancellation of active work. Reads, diagnostics, and cleanup remain available. Resume revalidates policy, image, membership, credentials, and budget. Archive makes the room read-only, cancels work, destroys cloud environments, disables integration writes and spending, and preserves evidence. Archive does not delete a remote repository.

Deletion is later S3 operational scope. It requires an export option, retention/legal-hold check, impact preview, recent authentication, workspace-owner confirmation, and project-maintainer confirmation by another human. The deletion plan separately lists local data, artifacts, credentials, and any external repository. Remote repository deletion is never inferred from project deletion and requires a distinct exact-resource approval. Tombstones prevent replayed webhooks or old commands from recreating deleted objects. Credentials revoke before data purge. The audit stores the receipt and unresolved external cleanup, not deleted content.

## R11. Git, evidence, publication, review, and merge

The contribution path is task, isolated worktree/environment, exact candidate commit, verification, evidence, publication approval, draft, independent review, and human merge. CLI convenience is not enforcement. GitHub protection and the evidence check enforce managed-project delivery.

`allowed_paths` bounds the publishable change, not a claim that a shell cannot create temporary files inside its disposable environment. File-edit tools validate scope before writes; the Git broker rejects every tracked or untracked source change outside it. Required verification starts from the exact candidate tree. The recorder checks source-tree integrity before and after each scenario. Undeclared source mutation invalidates that scenario's evidence, even when its command exits zero. Declared build, fixture, and artifact output directories are separate from candidate source.

Before publication, compare changed paths with active and recently published tasks on the same repository. Any overlap produces `overlap_detected` and blocks publication until a maintainer records the overlap review. A stale base requires rebase in a fresh attempt and full re-verification. Even a clean Git merge can have semantic conflicts; overlap clearance does not waive combined-base checks. The broker never overwrites commits added by a human. It exports a new branch or blocks for manual handoff.

Default size policy targets one logical change, at most 200 meaningful lines and eight source files. Crossing either threshold requires a scope rationale. At 1,000 lines or 25 source files, publication blocks until the change is split or a non-author maintainer approves a size exception. Generated, vendored, and lockfile counts remain visible even when excluded from meaningful-line counts. No size exception lowers risk or waives checks.

Risk is a deterministic floor computed from actual changes. R0 is documentation or declared mechanical work. R1 is bounded behavior. R2 includes authentication, permissions, secrets, dependencies, migrations, data, billing, public contracts, CI, and verification policy. R3 includes releases, destructive actions, signing, and security-boundary changes. Unknown change classification is R2. A model may raise a concern, never lower the floor. All classes require a non-author human review and human merge in every stage here. R3 execution outside the development environment is forbidden; its result is a proposal for a separate human-operated change.

### Evidence manifest

A deterministic recorder in the worker or trusted CI, never the model, writes `agora.evidence/v1`. A manifest contains:

- A closed purpose/subject union. `product_run` requires workspace, project, task, run and session references plus worker key, deployment epoch and fence. `ci_verification` requires project, repository, exact base/head and approved CI job/run identity, with an optional linked product run. `foundation_fixture` requires a non-production fixture namespace and cannot satisfy a product publication gate. All variants record producer identity and timestamps.
- Human owner and tool/configuration/policy versions. Model-backed product runs also require adapter/provider/model, context and profile digests; CI or fixture records must not invent a model call.
- Repository immutable ID, base SHA, candidate head SHA, tree hash, patch digest, changed paths, size counts, and risk facts.
- Target-specific environment attestation: definition/image/template for Linux or pinned macOS/Xcode/hardware for qualified native CI. Include host and execution target, fixture versions, registered command IDs/digests, arguments with secrets redacted, start/end times, exits, and bounded log digests.
- Required scenario inventory, each outcome, assertions, coverage, known omissions, and unsupported capabilities.
- Artifacts with digest, media type, byte length, capture method, and retention class. UI work includes before/after screenshots at declared viewports, accessibility results, and a short interaction video.
- Side-effect requests and receipts, egress grants used, budget usage, knowledge versions cited, and cleanup outcome.
- Producer signature over canonical manifest JSON and an explicit trust class `owner_attested` or `trusted_ci`.

The producer discriminator determines authority validation. Worker evidence binds the current execution lease/fence. Independent CI evidence instead binds the approved repository, workflow revision, CI job/run identity, exact head/base and trusted reporting receipt; it does not borrow a terminal worker lease. Its project-bound Ed25519 reporting key is enrolled by the maintainer during trusted-check onboarding and held only by the trusted report step. The center requires both its signature and the expected App/workflow read-back; candidate jobs receive neither reporting key nor App credential. Foundation fixture evidence is explicitly non-production and cannot authorize product publication.

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

Every public or operator capability, in Agora and in each managed project, has a stable scriptable driver: a registered CLI command or a public API operation, with structured JSON wherever a machine reads the result, and a feature-map entry. A browser or native UI renders and invokes the same authority and is never the only way to execute or verify a capability. The CLI passes the same authentication, authorization and state transitions as the UI and derives actor from credentials exactly as R07 requires; it is not a bypass. Presentation behavior may still need Playwright or a qualified native driver, but setup, doctor, drive, evidence capture and cleanup stay CLI-operable.

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
| Propose/confirm new agent | Project maintainer proposes; a second eligible human within the requested scope confirms | Exact routine packs, automations, tools, network policy, credential references, limits, and recurring cost preview under R26; no provisioning or spend before confirmation |
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

System-managed credential values MUST NOT enter content tables, model context, telemetry, URLs, or evidence. Arbitrary user text and source may contain pasted or unrecognized secrets; scanners cannot guarantee their absence. Prevention warnings, bounded secret scans, quarantine, restricted redaction, and dependent-context/evidence invalidation reduce that risk. The UI discloses the residual risk before external provider submission. The center stores encrypted secret blobs outside PostgreSQL under references, with a host-held encryption key and off-host encrypted backup. Workers use OS credential storage. Runtime grant scopes and secrets are distinct. Local Git and model credentials stay local. Cloud Git and model credentials stay in their external brokers. Secret entry occurs in a dedicated masked form and is never sent as a message. Redaction reduces accidental leaks but does not make private data safe for an unapproved provider.

Provider configuration MUST record permitted data classes, retention/training terms, approved region when offered, payer, exact model, pricing version, and timeout. A provider without approved handling for project-confidential data is unavailable for that project. No cross-provider fallback exists by default.

## R17. Deployment, operations, retention, and budgets

S1 deploys the browser assets and one Node 24 LTS service behind Caddy on one cloud VM with Docker Compose. PostgreSQL 18 has a private network and persistent volume. Artifact storage is an external S3-compatible private bucket. SMTP sends invitations and login links. A 2-vCPU, 4-GiB VM is the initial center capacity, not a tested sizing claim. No project execution or image build runs there.

Use immutable versioned container images and dependency lockfiles. The operator reviews security updates monthly and urgent patches promptly. Runtime major upgrades occur before upstream end-of-support through the same compatibility suite. The dated 2026-09-20 foundation pins are Node 24.21.0 and PostgreSQL 18.6. Reviewed registry engine/peer ranges accept the selected Node and adapter versions, but are not runtime integration proof. U01a must lock every package/image and run the compatibility matrix, including real PostgreSQL 18 RLS, migrations, concurrent claims, streaming, and clean install. Only a reproduced direct incompatibility can justify a recorded downgrade. R21 and the research basis record the supporting versions and limits.

The service uses a dedicated unprivileged user, read-only filesystem except explicit state, no container-management socket, minimal inbound ports 443 and operator-only SSH, and separate database/backup credentials. Caddy terminates TLS. Health endpoints separate liveness from database, object storage, email, provider, and reconciliation readiness. A provider outage must not fail chat health. Hashing, scanning, archive handling, and image decoding use streaming limits and bounded helper processes outside the request/event-loop path. Those helpers share the same deployment and authority; they cannot execute repository code or become a second business service.

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

S1 concurrency is one coding run per machine, two per project, four per workspace, and two center questions per workspace. Default caps are USD 1 per question, USD 5 per coding attempt, USD 20 per project/day, and USD 100 per project/month. These and the turn/wall limits are uncalibrated safety defaults. U07/U09 measure fixture and initial-task sufficiency and record any reviewed adjustment. The UI shows execution and reserved verification time/cost separately; budget exhaustion never waives a required check. Cloud execution adds compute to the same reservation in S2. Template builds cap at USD 10 and 30 minutes by default. A launch reserves the maximum allowed charge atomically; completion reconciles actual usage and releases unused reservation. Unknown or unpriced usage consumes the full reservation and blocks further work until reconciled. Provider billing may lag, so limits bound new calls rather than promise exact final invoices. Humans must approve increases before new work, not after exceeding a cap.

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
| AC00 | Executable test-first foundation blocks premature feature work | LV00. Run foundation-ready with FG01-FG08; remove each proof, disable a guard, forge evidence, drop a feature-map entry and try to enable a feature/model write; every missing or invalid proof denies | U01a, U01b, U01c, U01d |
| AC01 | Only invited verified humans enter, with correct roles and revocation | LV01. Owner invites second real email; accept once, replay/expire invitation, deny outsider, revoke a signed-in member and observe subscription closure | U02, U09 |
| AC02 | Shared rooms, threads, edits, unread, and search preserve scope | LV02. Two browsers on different machines converse, edit and search; observer cannot post; project outsider sees no message, title, count, or artifact | U02, U03, U09 |
| AC03 | Ordering and replay survive duplicate sends and restart | LV03. Concurrent sends, lost HTTP receipt, duplicate client ID, socket gap and service restart produce exactly one ordered shared record | U03, U09 |
| AC04 | Center answers from explicit context with citations and visible state | LV04. Ask a real provider-backed question about a recorded decision; verify citation revision, partial-context disclosure, no private-project answer in a general room, and no hidden reasoning | U04, U09 |
| AC05 | Chat cannot execute; approved owner placement can | LV05. Imperative mention produces only proposal; confirm Run on my machine; wrong-owner/repo denies, offline machine waits then fails without fallback | U05, U06, U09 |
| AC06 | One fenced run owns one task and stops safely | LV06. Competing workers, killed worker, lease expiry, late event, cancellation, and fresh retry prove one accepted fence and rejected stale publication | U05, U06, U09 |
| AC07 | Local work cannot mutate the user's checkout or access credentials | LV07. Real task edits fixture app in isolated environment; compare user checkout before/after; attempt host path, socket, metadata egress and credential reads; all deny | U06, U07, U09 |
| AC08 | Evidence proves the project's behavior and fails closed | LV08. First use a scripted canary before any model write, then drive the real fixture through browser and CLI; preserve artifacts; wrong head/base/config, altered digest, stale producer, unavailable target and missing upload/scenario all block | U01b, U07, U09 |
| AC09 | Publication and merge have separate human gates | LV09. Attempt publication without approval, self-approval, stale head, reused approval, and denied credential use; then approve exact draft, verify remote receipt, independent GitHub review, human merge, and post-merge scenario | U08, U09 |
| AC10 | Injection cannot widen authority or produce active exfiltration links | LV10. Put hostile instructions in thread, file, and tool result; inspect denied tools, scope filters, rendered links, audit, and no forbidden network effects | U04, U07, U09 |
| AC11 | Center survives restore and bounds cost | LV11. Reserve concurrent budgets, exhaust a cap, simulate unpriced usage; restore backup on separate host, fence old worker, replay an uncertain effect once | U01c, U05, U09 |
| AC12 | The complete two-person workflow is usable and measurable | LV12. Developer A and B on two machines complete invitation, conversation, center question, local task, evidence, independent publication approval and review; keyboard/screen-reader pass, both viewports, video, and R18 load probes | U09 |
| AC13 | Selected React client meets ordinary production fitness budgets | LV13. Run the R23 fixture with virtualization, keyboard, VoiceOver, both viewports, reconnect, memory/update-isolation and production bundle/latency probes; retain defect counts and fix all gate failures | U01d, U09 |
| AC14 | Language-neutral contracts and standalone worker are real boundaries | LV14. Generate/compile TypeScript and Swift consumers, run golden HTTP/event/CLI/signature vectors and drift negatives; install worker on clean supported hosts without Node and reject a forbidden center import | U01a, U06 |
| AC15 | Native human sessions cannot borrow worker authority | LV15. Use the Swift client fixture to authorize through the system browser, poll/slow-down, refresh/replay, revoke, reject wrong audience and worker token approval, then require fresh exact-action step-up | U02 |
| AC16 | The Agora application architecture's feature-discovery and Client/Host boundaries are mechanical | LV16. Add a Feature outside its owned directory, hand-edit the generated Entrypoint/Timeline Card inventory instead of adding the reserved file, import one Feature from another without a declared contract, write durable timeline state from a component, and call a browser global outside the Host; each attempt fails at lint or compile with an error naming the supported owner, then disabling the guard turns the same assertion red | U20, U21, U22, U23 |
| AC20 | Project creation converges under crash and least privilege | LV20. Approve disposable private project; interrupt after remote create; resume to one repository/room/main-agent; wrong installation and occupied name fail closed | U10 |
| AC21 | Declarative environment cold build and sandbox isolation work | LV21. Cold-build OCI, run in fresh E2B guest, deny host hooks/secrets/egress, destroy guest, delete snapshot cache and rebuild | U11, U12 |
| AC22 | Persistent main agent reconstructs approved project context | LV22. Create decision and active lesson, restart service, ask project main agent for cited rationale; dispute/invalidate lesson and prove it is absent from new context | U13 |
| AC23 | Cloud and local runs have equivalent contract and review gates | LV23. Same fixture/base/RunSpec semantics on each placement produce equivalent assertions and manifest fields; test stale fence, cancel, overlap, and unavailable check on both | U14 |
| AC24 | Cloud recovery has no abandoned authority or unlimited bill | LV24. Interrupt allocation, lose runner, expire budget, and make destroy unavailable; reconcile exact IDs, show unconfirmed resources, enforce provider TTL and fresh-run recovery | U12, U14 |
| AC25 | A real external coding agent obeys the common contract | LV25. Complete a bounded fixture change through the pinned external CLI; force cancellation, malformed events, attempted host/credential/network bypass and stale evidence; require denials, preserved proof and unchanged publication approval | U18 |
| AC26 | Native client delivers the human workflow without host authority | LV26. Two accounts use signed test SwiftUI builds on Apple hardware for login, conversation/replay, evidence and subject-bound approval; verify keyboard/VoiceOver, revoke, bridge denial, packaging and parity against browser vectors | U19 |
| AC27 | Conversational agent creation previews its plan and isolates each agent | LV27. Propose an agent from a room, confirm with a second eligible human, and inspect the exact permissions/provider/cost/lifecycle preview before any spend; two agents never share a mutable environment; pause/resume/snapshot/reset/archive/destroy each leave an auditable state; installing an unsigned or over-broad locally supplied routine pack denies | U24 |
| AC30 | Observer and promotion preserve provenance and human authority | LV30. Enable observer, replay batch, edit source, preserve disagreement, activate with human review, promote a redacted multi-project lesson, revoke and prove retrieval exclusion | U15 |
| AC31 | Operations and deletion are recoverable and auditable | LV31. Restore, migrate/rollback-compatible deploy, export audit, archive, delete approved fixture data with hold test, reconcile external resources, verify tombstones and alerts | U16 |
| AC32 | Optional bridge is a notification path, never authority | LV32. Explicitly install Slack bot, mirror one approved card/link, duplicate delivery, revoke installation, and prove Slack text/buttons cannot launch, approve, or expose another project | U17 |
| AC33 | The Bug Agent finds and cites defects without gaining write authority | LV33. Reproduce a seeded defect and post a finding citing exact revision, environment, routine version, reproduction steps, logs, a screenshot, affected path, severity and confidence; repeat the same defect and observe deduplication; confirm no administration, production, merge or broad GitHub credential is held; a human approves a bounded repair task through the ordinary evidence and review path with the Bug Agent excluded as approver and reviewer | U25 |

## R20. Deferred capabilities and promotion triggers

These are outside the implementation queue unless the stated trigger produces a separately reviewed specification amendment. They are not unresolved choices in this baseline.

| Deferred capability | Promotion trigger |
| --- | --- |
| PWA/offline cache or a Tauri packaging variant | A documented offline or packaging need has a reviewed private-cache/update/bridge design. The separate S2 Swift client is already planned and does not depend on this trigger |
| General native macOS build execution | Qualify a separately reviewed Apple-hardware runner profile with macOS/Xcode pins, isolation, cancellation, UI/packaging proof, and human-only signing credentials. Linux cannot satisfy it |
| Direct messages, reactions, push, rich presence | S1 usage shows a repeated communication gap; audience and observer privacy tests are specified first |
| Browser IDE, terminal attach, computer takeover | A project cannot complete a required human recovery step through artifacts and local tooling; control handoff and secret-entry tests exist |
| Additional external headless agent CLI adapters | After S2's first real CLI adapter, each additional runtime must pass the same authority, credential, cancellation, event, and evidence suite |
| More repositories per project | A real task needs atomic cross-repository delivery; dependency, approval, and rollback contracts are designed first |
| Other cloud providers or self-hosted microVM fleet | E2B fails a required conformance gate or measured cost/residency need justifies replacement; same RunSpec suite must pass without policy changes |
| Embeddings, rerankers, Jev | At least 100 reviewed retrieval misses or 500 labelled advisory classification cases show FTS/rules inadequate; privacy approval and frozen evaluation beat the baseline. Never authorization |
| Automatic draft publication | At least 100 human-reviewed low-risk runs with no unauthorized or stale publication and an explicit policy amendment; human merge remains mandatory |
| Automatic merge or production execution | Not authorized by this specification. Requires a new product/security decision, not a usage threshold |
| General peer agent messaging or nested delegation | Measured tasks fail under one-level task-scoped coordination and a bounded protocol experiment proves ownership, budget, and recovery |
| Multiple service replicas/managed workflow engine | Sustained R18 failure after query/index tuning, or repeated demonstrated reconciliation complexity; partition/ordering and failover proof precede migration |
| Public tenants, federation, high availability | Contractual isolation or availability requirement, independent security review, and tested tenant/host failure boundaries |
| Voice or two-way chat bridges | Proven accessibility or team adoption need, explicit data-sharing approval, and typed human identity/command contracts |
| Scheduled autonomous work with no created-agent approval behind it | A named project owner grants a bounded schedule, spend, cancellation, and review policy in a separate amendment. [R26](#r26-conversational-agent-creation-and-the-bug-agent-role) already specifies bounded scheduled automation inside a created agent's own creation approval; this trigger governs only scheduled work that has no such approval |
| Routine-pack marketplace: discovery, distribution, and third-party publication | Local signed-pack installation under R26 is qualified, and a separately reviewed design specifies provenance, discovery, and publication review. R26's locally supplied signed-pack installation does not wait on this trigger |

The optional one-way Slack bridge is already authorized as S3 U17 but remains disabled until an owner requests and approves its scopes. None of these triggers authorizes this design task to implement, deploy, purchase, publish, or merge anything.

## R21. Portable contracts and mechanical boundaries

OpenAPI 3.1.1 describes HTTP operations and references authoritative JSON Schema 2020-12 definitions for commands, responses, events, worker messages, RunSpec, evidence, project configuration, CLI reports, and stable reason codes. Reviewed source artifacts live in the proposed Contracts module. There is no handwritten Zod or TypeScript wire source. Generated files are regenerated, never edited. Schema changes, generated consumers, compatibility fixtures, and migration notes land together; CI regenerates into a clean directory and rejects drift.

Use openapi-typescript 7.13.0 for TypeScript HTTP types, Swift OpenAPI Generator 1.13.1 for Swift HTTP clients/types, and generation from the shared schema components for non-HTTP payload types in both languages. OpenAPI generation does not implement WebSocket replay. The framework-free TypeScript core and a small Swift conformance consumer run the same sequence/command vectors independently. Schemas must stay within the tested common subset. A generator that cannot represent a required closed union or constraint blocks that contract rather than replacing it with an unconstrained object. Runtime validation remains required even when generated types compile.

Use Ajv 8.20.0 in 2020-12 mode with coercion, removal, and defaults disabled, explicit format assertion, and no network reference resolution. TypeScript 5.9.3 is the initial compiler pin because the selected openapi-typescript declares a 5.x peer range. Hono 4.13.8, its Node adapter 2.1.1, Drizzle 0.45.2, pg 8.23.0, Better Auth/OAuth Provider 1.7.5, internal-only Zod 4.6.5, React 19.3.0, and Vite 8.3.0 are the dated candidate package pins. U01a records the remaining exact build/test/Swift toolchain versions and image digests in lockfiles after a clean compatibility run. Metadata checks support these choices but do not prove the application works.

Commands and authority-bearing variants reject unknown fields and unsupported enum variants. Required fields are never synthesized. Response extension metadata may be ignored only in a schema-declared extension object. Version negotiation advertises a major/minor and capabilities. Serve the current and previous compatible minor; a new required field, changed meaning, or new state-changing event requires negotiated support or a new major. Unknown state-changing events pause the client without acknowledgment and request resync/upgrade. Never advance its cursor by dropping an event. New optional display metadata cannot carry authority. Verify signatures/digests over the original canonical payload, not a generated typed object that may have discarded fields.

Golden vectors cover decimal 64-bit strings, integer limits, absent versus null, Unicode and canonical JSON, timestamps, unknown fields/variants, duplicate commands, expired grants, signature bytes, and ordered snapshot/replay. TypeScript and Swift must agree on acceptance, decoded values, canonical digests, and projected state. A Python managed fixture uses the same CLI/evidence contract and an independent JSON Schema validator. This is protocol proof, not an S1 native application.

The proposed module import rules are executable from U01a:

| Consumer | Allowed local dependencies | Forbidden examples |
| --- | --- | --- |
| Contracts source/generated types | Schema tooling and generated neutral value types | React, Hono, Drizzle, provider SDKs, domain/storage rows |
| Domain | Private domain values, pure interfaces, standard library | React/TanStack, Hono, Drizzle, ws, provider SDKs, raw database/HTTP clients |
| Client core | Generated contract values and pure state utilities | React, DOM, TanStack, HTTP/WebSocket implementation, domain/server packages |
| Web renderer | Client core and narrow HTTP/socket/cache adapters | Storage/domain imports, direct timeline ownership in Query |
| Worker | Published generated contracts and worker-owned execution/adapters | Center, domain, storage, API internals |
| Storage, transport and provider adapters | Their private SDK plus explicit domain ports | Exported SDK/ORM/transport types in public interfaces |

Dependency lint checks imports, type-only imports, dynamic imports and re-exports. Package export maps prevent private-path imports. Compile tests deliberately import a forbidden type and require rejection. Client core owns timeline, run cards, unread and pending-command projection; Query owns only independent request caches. A transport translates bytes to validated values before the core sees them. Domain authorization is never delegated to a shared client library. Critical SQL paths have real PostgreSQL tests under the non-owner service role, including RLS, rollback, partial uniqueness, races and query plans.

## R22. Executable test-first foundation

Agora is its own first managed project. `agora project doctor|scenarios|start|verify|evidence|stop --json` implements R12's reports, exit codes and cleanup rules. `pnpm verify:*` commands are thin aliases, not a competing protocol. U01a begins with a walking contract/health fixture and deterministic tests. U01b adds the real database/browser fixture, isolated runner, verified skill, general evidence validator and trusted CI. No invitation/chat feature or model-backed write task may precede the full foundation gate. Building these mechanisms themselves is allowed and must be test-first. An empty repository may first create a test-only harness/stub revision that starts correctly; its subsequent red must be a literal behavior assertion, not missing infrastructure. Foundation qualification uses namespaced non-production fixtures and does not require the finished invitation system or scheduler. Fixture authority can never authorize a production operation; each real operation passes its own conformance before enablement.

This project policy overrides the installed TDD skill's optional-test fallback without modifying that skill. For every behavior change, add the behavioral test and public scenario mapping before the implementation. Record `red.log` and `green.log` with exact parent/head, test-patch, fixture, configuration, toolchain, expected assertion, and observed exit. CI applies the same test patch to the parent or a test-only parent revision and requires the intended behavior assertion to fail, then requires the head to pass. Missing test drivers/runners, an unreachable baseline service, syntax errors, or dependency failures are not valid behavioral red. Build the missing verification route first. Absence of the new product behavior can be valid red, including a new endpoint returning 404, only after the same driver proves an existing baseline operation and the intended public assertion fails for that absence. Expensive integration/UI setup is not an exception. Prose-only or mechanically proven non-behavioral changes may use an explicit independently reviewed applicability record and the relevant validation command. CI checks observable evidence; it cannot prove chronology or test adequacy, so independent review remains necessary.

Every guard registers a negative fixture. `agora project verify --scenario guards --json` executes the normally denied input, then repeats it in an isolated test-only copy with precisely that guard disabled. The assertion must turn red; if it still passes, the guard proof fails. Guard-disable hooks are never exposed in production artifacts. Evidence-validator negatives cover wrong head/base/config, altered bytes, missing artifact/scenario, stale producer/fence/epoch, candidate source mutation, unsupported target, and exit/outcome mismatch. Weakening a validator or dropping a feature-map entry must also make the foundation gate fail.

`agora project lanes --unit UNIT --json` is the project-owned live runner. A reviewed manifest names each scenario, public driver, input, literal pass predicate, target, evidence path, timeout, and cleanup. It drives Playwright, CLI, or a qualified native driver, not a model prompt pretending to be a test. Ten distinct scenarios per milestone are coverage, not ten required model sessions. Independent reviewers may be approved people or tools; their identity and available capabilities are recorded. A literal model name is never a quality gate. Missing live tooling or unavailable required scenarios block readiness.

The runtime authority is `agora project verify --scenario foundation-ready --json`, with `pnpm verify:foundation -- --json` as an alias. It executes fresh probes or verifies correctly bound trusted receipts for all mandatory proofs below. It validates identity, digests, revisions, inputs, outcomes, applicability, cleanup and reviewer separation, not file existence. Output `agora.foundation/v1` lists every proof as pass/fail/blocked/unavailable, exact subjects and artifacts. It exits nonzero unless every mandatory proof passes. A changed relevant code, test, contract, policy, feature map or fixture invalidates its proof. Unrelated changes may reuse a reviewed content-addressed prerequisite, but their task gate still reruns impact/drift checks.

| Proof | Required behavior | Owning foundation unit |
| --- | --- | --- |
| FG01 | Behavioral red then green, guard disabled then red, strict build/lint, real transaction rollback/race/RLS and migration repeatability | U01a |
| FG02 | Authoritative schema drift rejection and TypeScript/Swift canonical and protocol conformance | U01a |
| FG03 | Forbidden imports rejected and framework-free core replay tested without DOM | U01a |
| FG04 | Agora and Python fixture CLI, two isolated instances, verified skill, public driving, feature-map drift and owned cleanup | U01b |
| FG05 | General evidence validator and its weakening/missing-proof negatives pass before any write-enabled model | U01b |
| FG06 | Protected Agora and disposable fixture repositories, project-dedicated reporting identities, candidate-report forgery and credential-isolation denials | U01b |
| FG07 | Separate-host encrypted restore, independently recoverable keys, row/object integrity, old-epoch rejection and timed RPO/RTO | U01c |
| FG08 | Selected React production build passes accessibility, replay, rendering, memory and latency budgets | U01d |

The machine-readable feature map binds changed paths, public commands/routes/selectors, contracts, permissions, fixtures, environment, target capabilities, owner, scenarios and last verified subject. Every task runs drift detection and the affected verification-skill instructions literally against its own head. Missing mapping, deleted required scenario, stale instructions, or cleanup that removes proof blocks the task. Full maintenance passes also run at release or major restructuring; this authorizes no unattended schedule.

Each task is an independently reviewed change, normally one pull request under R11's size/risk rules. Its own declared checks close it; it MUST NOT wait for all tasks in its containing milestone. A unit milestone closes after all its tasks and the unit's integration scenarios pass. Tasks may depend on prior tasks or on completed external unit milestones, never their own milestone. The combined task/milestone graph must be acyclic. This removes the earlier completion deadlock. Until trusted forge reporting is installed in U01b, foundation-only changes use the same local exact-head tests and independent human review; no features or agent writes may use that bootstrap allowance.

The current `scripts/verify-design.mjs` is the authoritative semantic gate for this design package only. It checks task/Build ownership, combined dependency readiness and foundation proof coverage. The unchanged pstack checker remains an informational authoring check. Neither script certifies runtime foundation readiness, which does not exist before implementation.

## R23. Selected browser renderer qualification

React is selected after independent consideration of React, Vue, Svelte, Solid, server-rendered/HTMX, Lit and native alternatives. No React-versus-Vue bake-off or competing framework prototype is required. The selection is a fit judgment, not a measured framework victory. U01d qualifies the selected React production build before product UI expands; a failing check means fix the selected implementation or record a separately reviewed architecture change, not silently bypass its budget.

Use a versioned deterministic fixture with 50,000 messages, four concurrently updating run cards, long code blocks, safe Markdown, threads, edit/tombstone cases, 100 new messages and 1,000 missed events. The fixture server uses the published protocol and has no model calls. Use the same recorded input, network shaping, reference laptop, browser builds and five interleaved parent/head batches for every run. Record exact tool/driver/reviewer identity; agent fluency and vendor popularity are not pass predicates.

Test production builds on Chrome and Safari, 390x844 and 1440x900, plus keyboard-only navigation and VoiceOver on macOS. R18's 350-KiB compressed initial JavaScript, 2.5-second usable room and two-second replay limits apply. Also require p95 input-to-visible-state at most 100 ms, p95 scrolling frame interval at most 20 ms, and retained JavaScript heap at most 200 MiB after a ten-minute update/reconnect cycle on an Apple M2/16-GiB reference laptop. Record heap trend; growth over 10% across the last five identical cycles fails. Browser-specific memory tools and their limitations must be named, not mixed into one invented metric.

Virtualization preserves message semantics, loading older content, focus, selected text and scroll anchor. Zero critical/serious accessibility findings and complete keyboard/screen-reader scripts are required. During 200 run-only updates there must be no DOM mutation in unrelated message rows; report component commit counts and affected-card latency to expose broad subscriptions. Record defects by reproducible failure and severity, fix all required-scenario defects, and retain before/after evidence. A two-person comprehension test must identify owner, placement, current authority, missing proof and safe next action for proposed, failed, stale-approval and recovery cards without an engineer explaining them. Measure approval waits, including the honest blocked state when the other reviewer is absent.

## R24. Native clients, execution targets, and external agents

A native Agora client and a native application build are different capabilities. S1 supplies the protocol, Swift conformance consumer and native human-auth boundary. S2 U19 supplies the S1 human workflows in a SwiftUI client with AppKit where needed, generated HTTP types and a Swift synchronization implementation tested against the same vectors. It uses the system browser and Keychain, not shared web cookies. A Tauri wrapper would retain web rendering and need a reviewed narrow bridge; it does not automatically satisfy native interaction or native execution requirements.

| Client | Stage and capabilities | Boundary |
| --- | --- | --- |
| Browser, React | S1 conversation, evidence, human commands | No local execution API or offline privileged queue |
| Swift conformance CLI | S1 contracts, login/revocation and replay tests only | Not a shipped native UI; cannot use worker credentials |
| Native SwiftUI Mac client | S2 equivalent human workflows, native navigation/accessibility and notifications | No automatic worker enrollment, host shell, merge or signing authority |
| Tauri/PWA packaging variants | Deferred under R20 | No authority gained by installing a shell |

| Host and placement | Execution target | Qualified capability |
| --- | --- | --- |
| Linux x86_64 local worker | linux/amd64 container | S1 Linux CLI, HTTP and browser verification |
| macOS arm64 local worker with Docker Desktop | linux/arm64 container | S1 Linux verification only; not Keychain, SwiftUI, AppKit or Xcode proof |
| E2B cloud pool | Qualified Linux microVM architecture | S2 same Linux scenarios plus microVM isolation suite |
| Approved Apple CI for Agora's native client | Pinned macOS/Xcode and Apple hardware | S2 native-client build, accessibility/UI and packaging tests; not a selectable general managed-project coding runner |
| General managed native macOS app | Native macOS/Xcode profile | Unavailable until the R20 runner qualification; no Linux fallback or skipped-success translation |

Worker claims match every `required_capabilities` entry and exact `execution_target` before issuing a lease. Doctor and scenario inventory publish target/capability requirements. Evidence records host, target, toolchain, driver and unavailable checks independently. Native-client release uses a qualified Apple CI lane for actual UI/packaging proof; headless model tests alone cannot pass it. Signing/notarization credentials stay in a separate human-operated release step and never enter worker or candidate processes.

S2 U18 qualifies one real external coding-agent CLI through a process adapter, starting with Codex CLI's structured noninteractive stream. The public contract is AgentAdapter, not that vendor's output format. U01a/U04 test a fake external process against the same adapter semantics before model writes. Map versioned text/action/elicitation/result/error events, require bounded tools and output, cooperative cancellation plus forced process-tree cleanup, exact-head evidence and explicit capability negotiation. The conformance suite must prove no host-shell, credential, delegation, network or publication bypass. An external CLI may run only inside a qualified environment using a run-scoped outside-guest credential broker; if its supported authentication/tool controls cannot satisfy this, the adapter remains unavailable and AC25 blocks rather than weakening policy. User-configured native CLI paths and automatic updates are forbidden. Pin and verify the exact distribution before each enrollment/upgrade.

Knowledge U13 depends on S1 conversation/decisions and review, not a cloud account or newly provisioned repository. Observer U15 depends on U13, with separate S3 authorization. Provisioning/cloud U10-U12/U14 and knowledge/native/adapters can advance on separate later-stage tracks. Local and cloud execution still share one human-owned RunSpec and evidence authority.

## R25. Agora application architecture

Agora's product code follows one application architecture with five owned nouns: Feature, Entrypoint, Timeline Card, Client, and Host. This section is the mechanical contract those nouns satisfy. It governs `apps/web`, `apps/center` route composition, and any future renderer; it does not replace R21's package-level import table, which still governs Contracts, Domain, Client core, Worker, and Storage. [The research basis](research-basis.md#agora-application-architecture-provenance) records where the five-noun shape came from and why Rust is not part of it.

### The five nouns

| Noun | Owns | Discovered from | Must not own |
| --- | --- | --- | --- |
| Feature | One directory holding everything that implements one product capability | Nothing outside its own directory; a Feature is a filesystem fact, not a registry row | Another Feature's files; a direct Host or transport call |
| Entrypoint | One reserved file naming how its Feature is reached: a route, a command, or an agent-mention target | A build-time scan for the reserved filename inside each Feature directory | A hand-edited router or command table outside the Feature |
| Timeline Card | One reserved file naming how its Feature renders into the room timeline | The same build-time scan, a separate reserved filename | Durable writes; direct DOM or browser-global access |
| Client | The one writer of durable browser-side state for the whole application, exposed only through named hooks and named commands | Not discovered; there is exactly one, outside any Feature directory | A second copy of the same durable value held in component-local state |
| Host | The one typed boundary wrapping every browser global and transport call the application makes | Not discovered; there is exactly one, outside any Feature directory | Feature code calling `fetch`, a WebSocket, `document`, or `window` directly |

A Feature is the unit R11 sizes a change against and the unit R22's feature map already requires paths and scenarios for. Entrypoint and Timeline Card make that map generatable instead of hand-maintained: a task that adds a Feature without its reserved files fails discovery before it fails review.

### Mechanical contract

- Feature paths follow one conventional shape, package-relative `src/features/<name>/` inside whichever app or package owns that Feature's runtime surface (`features/<name>/` at the package root for a package with no `src/` layout); a Feature outside that shape is a build error, not a style comment. Discovery runs per package: `apps/web` and `apps/center` each scan their own `src/features/` root, and a Feature that spans both keeps the same directory name under each.
- Entrypoints and Timeline Cards are discovered at build time from each Feature's reserved filenames. A generated, drift-checked inventory replaces hand-edited per-feature rows in the site inventory and feature map; a manually added row that disagrees with the generated inventory fails the same way schema drift already fails under R21.
- A Feature declares an allowed Feature-to-Feature dependency in a reserved `dependencies.json` file inside its own directory, one entry per declared Feature name; the same build-time scan that reads Entrypoints reads it. An import naming a Feature absent from that file fails the same way an undeclared package import already fails under R21.
- The framework layer (Client, Host, and shared rendering primitives) and the package layer under R21 never import a Feature. A Feature may import the framework layer, generated contracts, and its own declared dependencies on another Feature; an undeclared Feature-to-Feature import, or a framework-layer file importing any Feature, fails the same mechanical check that already rejects a domain-to-Hono import.
- A component cannot write durable timeline state directly or call a browser global or the transport layer directly. Both paths run only through the Client's named hooks and commands, or through the Host's one typed interface.
- `.ts` and `.tsx` files receive the same import-boundary coverage; a renderer file is not exempt because it has no server counterpart.
- Every check above fails with an error naming the file's supported owner and the sanctioned alternative, not only the violated rule ID.
- An exception is a narrow, explicit record naming the exact path and symbol, its rationale, its owner, an approver who did not author the change, an expiry date, and a compensating test that fails if the exception is silently widened. It is reviewed as an architecture change, not merged as an ordinary diff.
- Every rule above registers a guard-negative fixture under R22: the denied input must turn red when its guard is disabled, the same evidence R22 already requires for existing boundaries.
- These checks run at the exact head under CI, not only on a contributor's machine; a stale local pass does not satisfy the contract.
- A Bugbot-class reviewer may flag a violation but is a non-author reviewer like any other under R11. It cannot waive the compiler, lint, tests, CI, or the human merge authority in R14.

### Illustrative shapes

The Client and Host are the two singular nouns; sketch their shape the way R03 sketches `Control` and `ExecutionAdapter`. These are specification signatures, not source files.

```ts
interface Client {
	useRoom(id: RoomId): RoomSnapshot;      // named hook, read-only projection
	useDraft(id: RoomId): DraftState;
	sendMessage(command: SendMessage): Promise<CommandReceipt>; // named command, the only write path
}
interface Host {
	fetch(request: HostRequest): Promise<HostResponse>;
	subscribe(topic: HostTopic, handler: HostEventHandler): HostUnsubscribe;
	now(): HostClock;
}
```

A concrete Feature directory example and the reserved filenames themselves belong in the living documentation site, so a developer sees real names next to the rule; this section fixes the contract those names must satisfy.

### Ownership map for existing work

Moving a capability into a Feature folder relocates its consumer wiring, never its schema or domain authority. R21's table already fixes who owns what; this map names where each existing local-room artifact lands under R25's convention without changing that ownership:

| Existing artifact | R21 owner (unchanged) | R25 destination |
| --- | --- | --- |
| `contracts/schemas/local-room.schema.json` and its generated types | Contracts | Stays in Contracts. A Feature imports only the generated public types, the same dependency R21's table already grants a Web renderer or Worker; Contracts never becomes, and never contains, a Feature directory |
| `packages/domain/src/local-room/port.ts` | Domain | Stays in Domain. A browser Feature does not import it at all, matching R21's existing Web-renderer row; `apps/center`'s composition root imports it, the same direction the table already allows |
| The one explicit adapter-selection line in `apps/center/src/app.ts` | Framework/composition root | Becomes `apps/center`'s Feature-owned Entrypoint, `apps/center/src/features/local-room/entrypoint.ts`; the composition root mounts the generated Entrypoint inventory instead of hand-wiring the route, the same discovery U21 already specifies |
| The paused browser-shell fixture | Not yet owned; `apps/web` does not exist yet | Becomes `apps/web/src/features/local-room/`, with its Timeline Card and rendering components calling Contracts and the Client's named hooks only, never Domain or a browser global directly |

A Feature's own files (its Entrypoint, Timeline Card, and rendering or route-handler components) are the only files R25 relocates. The authoritative schema and the domain port keep their R21 package homes and reach a Feature only through the dependency directions R21's table already permits; an import running the other way, a Feature owning wire authority, or a package importing a Feature, fails the same mechanical check R21's existing boundary lint already enforces.

Not every one of these moves is a pure rename. The contracts and domain-port call sites change only their importing path, a mechanical relocation. The paused browser-shell fixture, by contrast, predates this architecture and holds the direct browser-global and unmediated-effect calls R25 now forbids; moving it into its Feature folder requires rewriting those calls onto the Client's named hooks and the Host's typed interface, not just moving the file. [U23](implementation-plan.md#migrate-existing-work-into-the-agora-application-architecture-u23) keeps these two kinds of change as separately provable lanes rather than promising every migration is only an import edit.

### Current state and stack

U20 boundary lint is implemented: `.ts` and `.tsx` import boundaries, the framework/package-never-imports-application rule, and renderer foot-guns are enforced across `apps/web` (see [Application architecture boundaries](site/app-architecture.md)). [The application architecture page](site/agora-application-architecture.md#implementation-status) owns the build status of Feature/Entrypoint/Timeline Card discovery, the Client's one-writer boundary, the typed Host interface, and migrating existing work (U21-U23). Naming this architecture, closing its stack choice, and sequencing its migration was this design task's whole scope; the migration units in [the reading and dependency reference](implementation-plan.md#appendix-d-reading-and-dependency-reference) build the rest.

This architecture is built in React 19, TypeScript, and Node 24, over the existing PostgreSQL 18 record and the R21 portable contracts; the wider system already selects these and this section selects nothing new for them. Rust is not part of the application architecture and none is planned. [The research basis](research-basis.md#client-language-and-contract-review) records Rust as a viable narrow component for a later, concretely justified case, not a rejected or disparaged option.

## R26. Conversational agent creation and the Bug Agent role

This is a named, specified S2/S3 capability with its own acceptance criteria, not an open-ended R20 deferred trigger. No part of it is implemented.

### Conversational agent creation

From a room, a human proposes a new agent and a second eligible human confirms it, following R14's approval pattern. A proposal fixes a stable identity, its role, project and room scope, one or more selected versioned routine packs, its automations (manual, event-triggered, or scheduled), an environment template, its tool allowlist, network policy, credential references, resource and spend limits, a persistence/lifetime policy, and a notification policy. Before provisioning or spending anything, Agora shows the exact plan: permissions granted, the resource provider, recurring cost, and any destructive lifecycle effect, the same explicit confirmation R14 already requires for cloud execution and project creation.

Every created agent receives its own isolated, persistent environment, a Linux desktop VM or an equivalent dedicated environment, with its own browser, filesystem, terminal, and only its approved tools. Agents never share a mutable computer, the same rule R08 already applies to human worker machines. Provision, pause, resume, snapshot, reset, archive, and destroy are explicit, auditable states on that environment, following the same state-machine discipline as R06's other lifecycles: no state is inferred from a missing heartbeat.

A human can inspect, edit, disable, and immediately stop every routine and automation assigned to an agent. An automation cannot expand the agent's authority beyond what its creation approval granted; a routine that requests a wider tool, network, or credential scope requires a fresh approval under R14, not a silent grant at run time. Every routine pack, whatever its source, carries signed provenance and a permission manifest diffed against the agent's current grant before installation; an unsigned or over-broad pack is rejected the same way an unapproved provider is rejected under R16.

There are two distinct routine-pack sources, and they do not share a milestone. A **locally supplied signed pack** is a file and its signature a human provides directly, with no catalog, search, or third-party publication path; this is what U24 implements, and it needs nothing beyond the provenance/manifest check above. A **hosted marketplace** for discovering and distributing routine packs is a separate, deferred capability listed under [R20](#r20-deferred-capabilities-and-promotion-triggers); it has no milestone yet, and U24 does not depend on it. Recording that gap honestly, rather than scheduling a capability that has not been specified, is preferable to inventing a marketplace milestone this baseline does not need.

This depends on the existing worker (R08), environment (R09), and agent-identity (R04) work, plus the S2 cloud/local execution parity (R09, U14), none of which exist yet.

### The Bug Agent role

The Bug Agent is a built-in created-agent role, distinct from the trusted CI reviewer already defined in R11 and R22: CI proves a candidate's own checks; the Bug Agent looks for defects nobody asked it to find. It is read-only by default. It receives no central-administration, production, merge, or broad GitHub credential; the creation contract above already forbids granting authority beyond an approval, and this role's default approval grants none of those.

Every finding cites the exact revision, environment, and routine version it ran against, its reproduction steps, its logs, and a screenshot or recording of the affected user path, plus its own severity and confidence. A finding is deduplicated against prior findings for the same project before it is posted; a repeated report of the same defect updates the existing record instead of creating a duplicate one. The Bug Agent cannot hide a failure it observed or authorize its own fix. A human may approve a bounded repair task from a Bug Agent's finding; that task follows the ordinary R11 evidence and independent-review path like any other task, with the Bug Agent barred from being that task's approver or its independent reviewer.

This depends on conversational agent creation above and the same worker/environment/agent-identity/parity milestones, none of which include the deferred marketplace, and is not scheduled ahead of them.
