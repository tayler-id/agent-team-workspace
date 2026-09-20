# Workers and later cloud execution

Execution is outside the center. The first intended coding attempt runs on the launching developer's own explicitly selected machine; cloud placement follows in S2. Neither runtime exists in the current fixture.

## Local worker: planned S1

The standalone worker is intended to enroll outbound over TLS, advertise its capabilities, claim only eligible assigned work and upload facts. It has no database connection or another person's credentials. S1 capacity is one run per machine.

```flow
Human launch | Bind owner, repository, base SHA, target, tools, budget and acceptance.
Worker claim | Server verifies placement and issues the current lease and fence.
Private preparation | Create a task worktree from a managed bare mirror, not the ordinary checkout.
Restricted execution | Run in a rootless Linux container; no home, Docker socket, SSH agent or Git control directory mounted.
Host brokers | Keep model credentials and Git operations outside candidate code.
Evidence and cleanup | Verify the exact commit, preserve proof and retain dirty recovery work.
```

A worker on macOS uses Docker's Linux VM. That does not qualify SwiftUI, AppKit, Keychain or Xcode execution. The planned signed worker bundles a Node runtime and does not install a daemon or login item automatically.

## Cloud runner: planned S2

An E2B adapter will create a fresh microVM for each attempt, using an approved immutable image. The same RunSpec, evidence rules and human authority apply. Secrets remain outside the guest. Egress is denied by default; unknown destruction is shown as unconfirmed, never presumed successful.

An offline laptop must not silently fall back to cloud. Data destination, placement and budget are explicit human choices. The cloud track needs real provider conformance, including image fidelity and application-level denied-egress proof, before enablement.

## External coding agents

S2 U18 qualifies one pinned real external CLI through a neutral AgentAdapter. Structured output must map into bounded text/action/question/result/error events and obey cancellation, tool, credential and publication boundaries. Installing a native agent binary does not grant host-shell authority. Unsupported controls leave the adapter unavailable.

## Recovery and publication

The design uses 15-second heartbeats and 60-second server-time leases. Without renewal acknowledgment, workers stop new commands by 30 seconds and terminate owned processes by 60. These are requirements, not measured implementation today.

A retry creates a new run/environment and fence. A terminal run's released lease does not authorize publication: publication needs a fresh exact-action capability and independent approval. GitHub retains human merge authority. See [roles and workflows](workflows.md), [operations](operations.md), [R08/R09/R11](repo:docs/technical-spec.md), and the [roadmap](atlas.md#roadmap).
