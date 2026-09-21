# Research basis and architecture selection

This explanation supports the final [technical specification](technical-spec.md). The revised design baseline is dated 2026-09-20. It synthesizes the original nine reports, two later independent specification reviews, and decisive public-source rechecks. It is not a product benchmark or a tested deployment.

## Accepted product constraints

The product is a purpose-built communication center, not a Slack bot with a separate job dashboard. Developers need shared rooms, visible agents, conversation-linked work, and reviewable evidence. The center owns the durable record. Every project has a stable main-agent identity and room. The first bounded task runs on its launcher's machine through an outbound worker. Project creation and cloud execution follow in S2 under the same contract.

These constraints supersede historical options for Slack-first intake, a laptop-hosted SQLite authority, desktop-first distribution, hosted execution in the first release, and automatic merge. Those options are not unresolved in the final documents. Current project roles are enforced from S1; observer automation is S3. Native client boundaries and multilingual contracts are S1 foundation work, with a native Swift client and one external coding-agent adapter explicitly in S2. Native macOS application execution is a separate capability, not implied by a Mac-hosted Linux container. Named agents are not permission to spawn an open-ended swarm.

## Research coverage

The following complete reports informed this synthesis. Their private storage locations and operational mechanics are deliberately not copied here.

| Report | Contribution retained |
| --- | --- |
| Agent-team architecture, 2026-09-18 | Coded control service, bounded worker, leases, outbox, two verification levels, evidence and knowledge lifecycle |
| Agent-team landscape, 2026-09-18 | Independent precedent comparison, deterministic mechanics around agent judgment, approval before writes |
| Agent-team product definition, 2026-09-19 | Conversation as the product, fixed agent roles, human ownership, project scope and durable context |
| Agent chat-center research, 2026-09-19 | Browser-first stack, Linear sessions, Cursor outbound worker, stage-one local execution, next-stage provisioning |
| Agora architecture deep dive, 2026-09-18 | Typed state, exact-action authority, disposable execution, current-state versus event distinction, operations |
| Agora pattern audit, source revision dated 2026-09-17 | Identity-bound one-use authority, explicit unknown/unavailable, durable delivery and read-back, fail-closed cleanup |
| Agora Jev study, 2026-09-18 | Semantic predictions are advisory, not permissions, memory, evidence authenticity, or merge authority |
| Agora precedent archaeology, 2026-09-18 | Aquifer session/runtime split, Stripe blueprints, Helix checkpoints, human reviewer separation, trust-model limits |
| Agent-hub follow-up, 2026-09-18 | Threat-dependent isolation, exact-head evidence, unavailable checks fail closed, validity before retrieval |

Directly referenced ledgers were read for the architecture, landscape, chat-center, and precedent reports. The other reports contain their decisive ledgers inline. Vendor narratives supplied patterns, not implementation guarantees. The Fable review dated 2026-09-19 and the Astra review dated 2026-09-20 were also read in full. They independently reviewed the earlier committed package and agreed on the transactional core, stronger portability boundaries and an executable verification foundation. Their framework scores are judgment, not benchmarks. No new review agent was launched for this revision. A narrow two-query version check and official documentation/registry reads checked the new contract/auth/version decisions; there was no broad new research, private account access, application implementation or runtime compatibility trial.

## Architecture selection

### Problem and caller experience

A developer must be able to say what they want in a room, review a bounded proposal, and choose a machine or cloud execution without learning a scheduler. Another developer must understand what ran and approve an exact result. A service restart or lost laptop must not erase the conversation or duplicate a push.

The caller experience is:

1. Post a message and receive an ordered, durable receipt.
2. Choose Ask center for a read-only cited answer, or confirm Run on my machine for bounded work.
3. See one task card through execution, evidence, approval, and human review.
4. Recover with a new attempt without losing the old evidence or reusing its authority.

### Structurally distinct candidates

| Candidate | Shape and public interface | What it hides | What callers still coordinate |
| --- | --- | --- | --- |
| A. Hosted modular center, selected | Browser and workers call one versioned command API. One Node service commits project/conversation/run state and outbox in PostgreSQL. Execution is external | Transactional ownership, replay, policy, context assembly, evidence, effect reconciliation | Explicit human approvals and placement. Workers implement one fenced RunSpec |
| B. Chat-host extension with a job sidecar | Mattermost supplies chat/auth/search. A plugin forwards launch/approval actions to a separate run service and mirrors status back | Mature general chat mechanics and deployment | Cross-system identity, two ACL models, message/run revision mapping, plugin cards, external evidence and project lifecycle |
| C. Actor-based managed runtime | Browser sessions connect to room/run Durable Objects. Workflow instances coordinate external workers. Shared reporting projects into a separate store | Socket lifecycle, actor serialization, managed wake/replay | Cross-actor transactions, membership revocation across actors, consistent approvals and audit, export/rebuild of multiple state stores |

B is an adopt strategy, not a variant of A's framework choice. C changes the authority and transaction topology, not just the host. Each candidate can produce a chat demo. Their difference appears at revocation, crash-after-effect, evidence review, and project creation.

| Criterion | A | B | C |
| --- | --- | --- | --- |
| Conversation and task remain one record | Native transaction and projection | Plugin/sidecar synchronization required | Cross-actor consistency required |
| Visible agent hierarchy and evidence cards | Native domain objects | Host UI extension constrains objects | Native objects, distributed ownership |
| Human authority bound to current state | One transaction boundary | Identity and version translation | Durable coordination across actors |
| Local/cloud parity | One external worker contract | Possible through sidecar | Possible through workflow adapter |
| Small-team operation and recovery | One service/database plus workers | Chat host, plugin, and sidecar | Managed services but provider-specific recovery/export |
| Interface depth | Small commands hide substantial domain policy | Plugin calls often forward without hiding policy | Actor handles expose topology to cross-scope operations |
| Growth without changing product semantics | Module extraction at measured trigger | Host plugin boundaries remain | Host/runtime choice remains structural |

A wins because it places the product's actual objects and invariants in one authority. It does not win merely because TypeScript is familiar. B is strongest at general chat, but the differentiating behavior still has to be built and synchronized. C is attractive for many distributed sessions, but the current workload gains little from separating state that approvals must compare atomically.

The selected sketch borrows visible sessions and typed activity from Linear, outbound owner/repository matching from Cursor, and disposable runtime with external durable state from Aquifer. It rejects a shared computer as the project security boundary, free agent peer chat, prompt-only closure, and model-based authorization. The interfaces in R03 group domain knowledge rather than chronological phases. Workers cannot reach storage tables or vendor keys through a pass-through facade.

### Accepted tradeoffs

- One VM is not high availability. Backups, a tested restore, and visible outage states are the first reliability boundary.
- Local execution depends on the owner's machine and is not a hostile-tenant security boundary. Cloud microVMs are a required next-stage target, not an optional redesign.
- A small competent chat surface takes real work. Direct messages, reactions, and rich presence are deferred so the shared project conversation can be verified first.
- A device signature identifies the submitting machine; independent CI still verifies agent-produced changes. Each project needs a separately installed checks-only reporting App from S1, because a generic GitHub Actions producer does not distinguish trusted workflows from attacker-controlled ones.
- E2B is selected as the first cloud adapter, not declared universally safest or cheapest. Failed conformance disables cloud placement.
- PostgreSQL and immutable artifacts own knowledge. Repository documents are reviewed inputs/exports, avoiding two competing authorities.
- No automatic merge or production execution is included. Prior suggestions for low-risk auto-merge do not carry into this baseline.

The next implementation step is U01a. U01a-U01d separate contracts/test gates, real fixture/trusted evidence, restore and selected-client qualification. Product features wait for the complete foundation, and model writes additionally wait for a scripted real-worker canary. The task closes on its own outcome and proof; the containing milestone closes later. This corrects the earlier circular completion rule.

### Client, language and contract review

React originally entered through the accepted stack defaults, not a comparative framework trial. The earlier AI SDK/Chat SDK argument did not establish React-only compatibility and no longer described the chosen product. The independent reviews corrected that rationale without establishing a benchmark winner.

Fable considered React, Vue, Svelte, Solid, HTMX, Lit and SwiftUI; its backend comparison covered Node/Hono, Bun, Go, Rust and Elixir. Astra considered React, Vue, Svelte, Node/Hono, Fastify, Go and Elixir, plus schema-first, Zod-export, Protobuf and TypeScript-only contracts. Both retained the modular monolith. Their client scores are shown to expose the disagreement, not to average it away.

| Browser option | Fable score, out of 5 | Astra score, out of 100 | Design consequence |
| --- | --- | --- | --- |
| React with framework-free state | 4.3 | 84 | Selected renderer; ordinary production/accessibility tests remain required |
| Vue | 3.8 | 84 | Credible peer, no evidence of a decisive React runtime advantage |
| Svelte | 3.6 | 83 | Considered explicitly; fine-grained updates do not solve authorization or replay |
| Solid | 3.3 | Not scored | Credible fine-grained renderer; less compelling interaction/tooling fit in the review |
| HTMX/server rendering | 3.3 | Not scored | Still needs substantial client state for replay, virtualized cards and native API parity |
| Lit | 3.0 | Not scored | Framework-independent components, but application-state/routing work remains |
| SwiftUI as the first client | 2.5 | Later native option | Does not replace the cross-platform browser release; explicit S2 client instead |

Fable weighted delivery 30%, correctness/accessibility 20%, architecture 20%, runtime 10%, operations 10%, and ecosystem 10%. Its React lead depended partly on an unmeasured belief about agent fluency. Astra weighted correctness 30%, runtime 25%, independence 20%, interaction 15%, delivery 5%, and ecosystem 5%, yielding an effective tie. We give development cost little weight. React fits the required accessible cards and immutable snapshot renderer, while R21 confines that choice to rendering. R23 tests that implementation, not its popularity. A comparative React/Vue prototype gate was considered and withdrawn before implementation. No competing framework prototype is required or claimed.

| Service or worker option | Fable score, out of 5 | Astra score, out of 100 | Decision |
| --- | --- | --- | --- |
| Node/TypeScript/Hono | 4.3 | 92 | Keep; bounded I/O and closed domain states fit the selected authority |
| Node/Fastify | Not scored | 92 | Credible transport alternative; schema defaults still need strict configuration |
| Go | 4.1 | 90 | Viable standalone worker or measured hot component behind the protocol |
| Rust | 3.9 | Not scored | Viable isolated/runtime-sensitive component when concrete requirements justify it |
| Bun service | 4.1 | Not scored | Not selected for the transactional service; bundled pstack tooling still uses Bun |
| Elixir/Phoenix | 3.5 | 74 | Strong live-session model, not a reason to introduce another state authority |

Astra's service weights favored correctness and contract independence; shifting weight toward runtime made Go lead. These scores do not measure Agora throughput. PostgreSQL transactions and a coded authority remain the decisive design, not the service language. C was raised as another-language possibility after the reviews. It is not an efficient first fit for this browser-first, I/O-heavy system: it would still need a browser rendering client, while adding manual memory ownership and protocol/security integration to authority-bearing code. That is a fit/risk judgment, not a C benchmark. A narrow measured CPU requirement could justify a different-language component later without rewriting public contracts.

Fable preferred restricted Zod authoring with checked exports. Astra preferred authoritative OpenAPI/JSON Schema. The latter wins for the stated native/multilingual direction because an internal TypeScript validator must not decide the external contract. Unrepresentable transforms or refinements cannot silently become an unconstrained schema. Swift generation establishes an HTTP path, not replay or authentication; separate vectors and native-session tests cover those.

### Dated foundation compatibility check

On 2026-09-20, Node's official release table identified 24.21.0 as LTS and 26.9.0 as Current. PostgreSQL listed 18.6 as supported through November 2030. Its September 25, 2025 date is the first release of major 18, not the release date of minor 18.6. We selected Node 24 LTS and PostgreSQL 18, not the earlier defaults. Node 22 and PostgreSQL 16 are still supported; they were not rejected as already EOL.

Registry metadata directly checked Hono 4.13.8, Node adapter 2.1.1, pg 8.23.0, Drizzle 0.45.2, Better Auth/OAuth Provider 1.7.5, Zod 4.6.5, React 19.3.0, Vite 8.3.0, Ajv 8.20.0 and openapi-typescript 7.13.0. The declared Node ranges accept 24. Better Auth's declared Drizzle/pg peers match these candidates. openapi-typescript declares TypeScript 5.x, so the foundation selects checked 5.9.3 rather than copying the TypeScript 7 used by unrelated bundled tooling. Swift OpenAPI Generator's current release was 1.13.1, published 2026-09-01. Its release was verified; a Package.swift CLI extraction failed, so no claim of checking its compiler minimum is made.

These are dated support and declared-dependency checks, not an executed compatibility matrix. U01a must resolve and lock the remaining compiler/generator/test packages and OCI digests, then compile both consumers and run real PostgreSQL 18 integration tests. Only a reproduced incompatibility may supersede the chosen majors. No package or application prototype was installed for this check.

### Agora application architecture provenance

R25's five nouns, Feature, Entrypoint, Timeline Card, Client, and Host, are Agora's own names for a shape independently observed once, in a private, unpublished internal framework built for an unrelated company's desktop chat client. That framework's own name and its host company are not repeated here because they are not public: the framework has no public repository, package, or documentation, its author states on the record that it will not be open-sourced, and only a single conference talk's screen-share and a handful of first-party social posts are recoverable. E30 records what was recoverable and its limits.

The independently observed shape and Agora's already-enforced import guard agree on two general points: forbidden dependencies should fail mechanically, and a framework layer should never import application code. R21's table already enforces both today for `.ts` server and core code. What Agora lacked, and what R25 now names, is the product-feature side: an owned Feature folder, discovery from reserved files instead of a hand-maintained registry, and a named one-writer Client and typed Host for the renderer. Agora's nouns, file conventions, and every mechanical rule in R25 are specified independently in this document; the observed talk supplied a research prompt, not a design to copy, and its own internal codename is not Agora's name for anything.

Rust is closed as an alternative for this architecture, and not because of anything in that talk. [The client, language and contract review](#client-language-and-contract-review) already retained Rust only as a viable narrow, isolated component for a later, concretely justified case (D51). R25 restates that for the application layer specifically: it is React, TypeScript, and Node; no Rust application layer exists or is planned.

## Public evidence ledger

Source dates are publication/update dates only when available. All sources below were inspected through the supplied ledgers. The Recheck column distinguishes pages fetched again on 2026-09-19 from ledger-only evidence. Short quoted passages are exact excerpts, not alternate-model summaries.

| ID | Public source and date | Load-bearing evidence | Limit and recheck |
| --- | --- | --- | --- |
| E01 | [Linear agent interaction](https://linear.app/developers/agent-interaction), undated; [design rationale](https://linear.app/now/our-approach-to-building-the-agent-interaction-sdk), 2025-08-01 | Sessions have visible states, validated activity types, and an expected activity within 10 seconds. Rationale assigns accountability to humans | Interaction page rechecked. Preview API, not Agora implementation proof. Agora uses status summaries rather than hidden reasoning |
| E02 | [Cursor My Machines](https://cursor.com/docs/cloud-agent/self-hosted-guides/my-machines), undated | "A worker on your machine opens an outbound connection"; owner, machine name, and registered repository must match; a missing match fails rather than falls back | Rechecked. Cursor's model loop is cloud-hosted. Agora borrows the connection/placement rule, not that topology |
| E03 | [Shopify, Under the River](https://shopify.engineering/under-the-river), 2026-05-28 | "Append-only event log. Postgres-backed." "The harness lives outside the sandbox" | Rechecked. Company report, no public lease schema or credential-proxy implementation |
| E04 | [Stripe Minions Part 2](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents-part-2), 2026-02-19 | Blueprints mix deterministic code and scoped agent nodes. CI repair is bounded | Full passages in supplied ledger. Fresh extraction returned only a short page, so the ledger supports detail. No throughput claim adopted |
| E05 | [Git worktree](https://git-scm.com/docs/git-worktree.html), undated | Worktrees share refs/configuration; `lock` protects against pruning/move/removal; dirty removal needs force | Rechecked. This corrects the tempting but false inference that worktree lock is an execution mutex or security boundary |
| E06 | [Better Auth organization plugin](https://www.better-auth.com/docs/plugins/organization), undated | Invitations and roles exist. "Set `requireEmailVerificationOnInvitation` to `true` for the stricter posture" | Rechecked. Invitation email is application-supplied. Agora custom roles and project authorization are additional work |
| E07 | [Dev Container metadata](https://containers.dev/implementors/json_reference/), undated; [templates](https://containers.dev/implementors/templates/), undated | `initializeCommand` runs on the host. Image labels can carry metadata. Privilege/mount options exist. Templates are declarative and OCI-distributed | Metadata rechecked to close the earlier report's gap. The standard is not a security policy; Agora rejects unsafe fields |
| E08 | [E2B snapshots](https://docs.e2b.dev/sandbox/snapshots), undated; [template quickstart](https://docs.e2b.dev/template/quickstart), undated | Templates define known base state; snapshots capture current filesystem/memory. E2B recommends templates for repeatable environments | Rechecked. No Agora cold-start or portability benchmark. Snapshots are disposable caches |
| E09 | [E2B Template API](https://docs.e2b.dev/sdk-reference/js-sdk/latest/template), undated; [internet access](https://docs.e2b.dev/sandbox/internet-access), undated | `fromImage` starts from a custom Docker image. Internet is enabled by default; allow rules take precedence over deny. Blocked TCP connect can appear successful without application bytes | Rechecked through a narrow follow-up to resolve image/egress integration. Digest import and chosen-region behavior still require live conformance. Raw socket success is not a network-denial test |
| E10 | [GitHub required checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks), undated | Checks require latest SHA; GitHub treats `success`, `skipped`, and `neutral` as successful; expected-App checks are supported | Rechecked. Agora must emit failure for unavailable evidence, not skipped/neutral |
| E11 | [GitHub App tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app), undated; [App permissions](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app), undated | Installation tokens can narrow repository access. Apps start without permissions | Ledger rechecked. Plan entitlement and actual scopes are onboarding tests, not guaranteed for every repository |
| E12 | [PromptArmor Slack AI disclosure](https://www.promptarmor.com/resources/data-exfiltration-from-slack-ai-via-indirect-prompt-injection), 2024-08-20 | Demonstrates untrusted public text causing private data to appear in an attacker-controlled link | Rechecked. Historical vendor disclosure, not a claim of a current Slack vulnerability. Supports audience filtering and non-active generated links |
| E13 | [Mattermost Agents guide](https://docs.mattermost.com/administration-guide/configure/agents-admin-guide.html), undated | Named agents, channel restrictions, allowed tools, and unsafe-links disabled by default | Ledger rechecked. Strong adopt alternative, not proof of Agora-specific run/project support |
| E14 | [Cloudflare long-running agents](https://developers.cloudflare.com/agents/concepts/agentic-patterns/long-running-agents/), updated 2026-08-20 | "Agents are durable identities, not always-on processes" | Ledger rechecked. Supports candidate C and persistent identity without a permanent process |
| E15 | [Shopify Helix](https://shopify.engineering/back-to-native), 2026-09-10 | Ordered checkpoints with behavior tests, visual comparison, review, and a headless application CLI | Ledger rechecked. Company report; no published error rate or reusable Helix architecture |
| E16 | [Shopify River remediation](https://shopify.engineering/river-vulnerability-remediation), 2026-09-02 | Ledger entries are claims to recheck; rebase invalidates old-head CI; closure rules belong in code | Ledger rechecked. Does not establish exactly-once external effects |
| E17 | [gVisor security model](https://gvisor.dev/docs/architecture_guide/security/), undated; [Firecracker production host guidance](https://github.com/firecracker-microvm/firecracker/blob/HEAD/docs/prod-host-setup.md), undated | Isolation still requires resource/network controls and patched hosts | Ledger rechecked. Boundary guidance, not certification of the chosen provider/account |
| E18 | [TypeSafe confidence](https://docs.typesafe.ai/confidence), undated; [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13), reviewed 2026-09-17 | Distribution concentration is not individual correctness; semantic, ordering, and context failures remain | Detailed supplied study and inline ledger read. No Jev API tested or adopted |
| E19 | [Anthropic memory docs](https://platform.claude.com/docs/en/managed-agents/memory), undated | Versioned memory and read-only scope; writable shared memory can carry prompt injection | Ledger rechecked. Agora uses human activation and invalidation, not an asserted learning guarantee |
| E20 | [GitHub webhook practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks), undated | Validate signatures, acknowledge promptly, process asynchronously, dedupe delivery IDs | Ledger rechecked. Delivery identity is not authority to change project policy |
| E21 | [Official Cursor pstack](https://github.com/cursor/plugins/tree/main/pstack), observed revision `032be146865d973682535de75f2287da438550bf` on 2026-09-19 | Installed architecture, writing, decision-trail, verification, and multi-phase planning instructions | Installed and read locally. The lockfile records skill hashes. Moving upstream main may differ later |
| E22 | [Node release table](https://nodejs.org/en/about/previous-releases), current table read 2026-09-20 | Production uses Active or Maintenance LTS; 24.21.0 listed LTS, 26 Current | Fresh direct page. Search index also returned an older latest-directory result; direct release table takes precedence. No application compatibility trial |
| E23 | [PostgreSQL versioning](https://www.postgresql.org/support/versioning/), read 2026-09-20 | 18.6 supported, major 18 final support November 14, 2030; current minor recommended | Fresh page. First-release column is for the major, not the current minor |
| E24 | [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html), [JSON Schema 2020-12](https://json-schema.org/draft/2020-12), schema publication 2022-06-16 | OAS Schema Objects use 2020-12; format defaults to annotation rather than assertion | Fresh relevant specification passages. R21 requires explicit format validation and generator-subset conformance |
| E25 | [Swift OpenAPI 1.0](https://www.swift.org/blog/swift-openapi-generator-1.0/), 2024-01-31; [generator 1.13.1](https://github.com/apple/swift-openapi-generator/releases/tag/1.13.1), 2026-09-01 | OpenAPI 3.0/3.1 support, streaming bodies and HTTP-framework-independent generated clients | Announcement read and current release checked 2026-09-20. Does not generate replay, native UI or prove current compiler compatibility |
| E26 | [Better Auth device authorization](https://www.better-auth.com/docs/plugins/device-authorization), undated | Distinguishes bare session-token polling from OAuth Provider access tokens with audience/scopes; requires explicit secure approval and client validation | Fresh security/token passages read 2026-09-20. R04 selects OAuth integration and adds Agora role, device and recent-auth enforcement |
| E27 | [Hono registry](https://registry.npmjs.org/hono/latest), [Node adapter](https://registry.npmjs.org/@hono/node-server/latest), [pg](https://registry.npmjs.org/pg/latest), [Drizzle](https://registry.npmjs.org/drizzle-orm/latest), [Better Auth](https://registry.npmjs.org/better-auth/latest), [OpenAPI TypeScript](https://registry.npmjs.org/openapi-typescript/latest) | Dated engines/peer metadata recorded above; openapi-typescript requires TypeScript 5.x | Read 2026-09-20. Metadata compatibility, not runtime proof. Moving latest URLs require new dated locks at implementation |
| E28 | [React external store](https://react.dev/reference/react/useSyncExternalStore), [Vue performance](https://vuejs.org/guide/best-practices/performance), [Svelte practices](https://svelte.dev/docs/svelte/best-practices), undated | Immutable external snapshots, shallow/large-list state and fine-grained update caveats respectively | Inspected in Astra's supplied source-backed review, not fetched again here. No comparative performance measurement |
| E29 | [Zod JSON Schema](https://zod.dev/json-schema), undated | Some conversions are unrepresentable; permissive conversion can yield an unconstrained schema | Both reviews used this evidence. Supports schema-first authority, not an alleged Agora bug |
| E30 | Private conference talk screen-share and first-party social posts, 2026-08-11 to 2026-08-17 (no public repository, package, or documentation exists; not linked here because there is no public source) | Five framework nouns, five stated rules, and a closed package boundary where the framework never imports application code; a later post refines an outright ban into a hook-mediated allowlist | First-party assertion and a primary screen-share record, not a specification; the reserved-file discovery mechanism and its error text were never shown on screen; Agora's names, file locations, and every specific mechanical rule in R25 are independent choices, not a copy |

The initial fresh research beyond decisive rechecks covered Dev Container metadata and E2B custom-image/egress. This revision additionally checked the official Node/PostgreSQL support tables, public package metadata, Swift generation, OpenAPI/JSON Schema and native-device authentication. An attempted E2B `/template/from-image` URL returned 404. The linked Template API supplied the contract instead. No claim relies on that failed route.

## Contrary evidence and design consequences

Git worktrees are not a sandbox, and Git's lock is not a write lock. The local worker therefore owns a private mirror, allocates separate task directories, isolates executed commands, and serializes only host Git metadata operations.

E2B defaults do not match Agora's policy. Its network allow rules override deny rules, and blocked connections can look connected. Agora must reject allow rules that intersect forbidden ranges, omit broad wildcards, use an external proxy for stricter method/byte rules, and test application-level responses plus destination-side observations. A provider capability flag is insufficient evidence.

Vendor agent products often retain editable comments, shared sandboxes, or model-based action review. Those are useful UX precedents but weaker authority boundaries than this product needs. Agora stores frozen activity and explicit human commands separately.

GitHub's successful status vocabulary includes skipped and neutral. A check that merely exists can therefore fail to enforce the intended result. Agora's required aggregate check treats missing or unavailable required scenarios as failure.

Jev's bounded outputs do not establish calibrated decisions on Agora data. Memory products likewise do not establish that accumulated records reduce recurrence. The baseline keeps rules/FTS first and requires human activation, validity filters, and measured outcomes.

## Application of pstack

The [installed skills](../.agents/skills/) are the official `cursor/plugins/pstack` source, not a port. The exact requested project-local installer command ran with `--all --copy`. It created 47 unique skills in 55 agent-specific trees, with installer-specific metadata differences. All installer output and `skills-lock.json` are retained unchanged. `setup-pstack` was not run. No unrelated plugin was installed.

The architect process stopped at design selection. The independent reports supplied contrasting perspectives instead of a new model swarm. Greenfield grounding used the product journeys and explicit contracts because no application code existed. No implementation prototype or live product evidence is claimed.

The applied principles changed concrete choices:

- Foundational thinking put shared schemas, migration/restore tests, and capability boundaries before chat features.
- Modeling the domain separated task, run, session, lease, environment, approval, and publication rather than encoding them as flags.
- Redesign from first principles made conversation the primary object and the bug-to-draft workflow one conversation action.
- Experience-first design selected the browser plus worker and a small readable timeline over a desktop shell and terminal panes.
- Separate shared state gave each attempt its own worktree, process group, fixture namespace, and branch. Only stream counters and ownership need transactional serialization.
- Idempotent operations added receipts, external reconciliation, and fresh attempts rather than replaying uncertain side effects.
- Sequencing verifiable units gives every plan unit a user/operator outcome, ten live scenarios, performance evidence, and a review boundary.
- Proving behavior requires two real accounts and machines, independent project checks, negative cases, and retained evidence.

Technical writing separates this explanation from the normative reference and the execution how-to. The decision trail is append-only. The installed plan checker runs unchanged at its project-local path. Tool-specific execution playbooks describe future implementation only; this delivery starts no agents, schedules, runtime, push, or merge. The earlier package had only self-review and automated checks. This revision incorporates the supplied independent Fable and Astra reviews without launching more agents. Their contrary recommendations, particularly contract authority and framework ranking, are resolved above. The current author still works without delegation.

## Limits and implementation risks

No selected stack component, sandbox, model API, email setup, GitHub protection, image build, or backup has been exercised as an Agora deployment. All performance numbers are release budgets. R17/R21 record dated candidate versions. Full package/image/toolchain locks and selected model IDs must be doctor-validated when U01a/U04 initialize code and configuration. That is ordinary configuration and compatibility verification, not an open product choice.

Current source documents can change, especially preview agent APIs. Agora copies stable interaction patterns rather than depending on those APIs. S2 must prove E2B image fidelity, hard timeouts, selected-region data handling, and egress on a real disposable sandbox. If any required behavior is unavailable, S2 cannot ship by weakening it.

The full official skill installation contains upstream examples, placeholder syntax, long dashes, and links to files outside the installed skill subset. Authored-document checks exclude those upstream bytes and report that scope explicitly. Vendored scripts are tested from the canonical copy; duplicate agent trees are not separate application implementations.
