# Client synchronization isolation

## What it is

U01a.B03 is active work on a framework-free client core and mechanical import boundaries. This page describes the intended boundary, not a shipped package API at the atlas's base revision.

## What it does

The core is intended to own immutable snapshots, event deduplication, cursor replay, revision ordering, unread state, drafts and command receipts. React renders its snapshots. A narrow transport adapter validates incoming wire values before delivering them to the core.

## Why it exists

Replacing a renderer must not replace synchronization rules. A Query cache must not become a second timeline. A native client needs equivalent replay semantics rather than borrowing assumptions embedded in DOM code.

## How it works

```flow
Snapshot | Read authorized state and its committed cursor together.
Replay | Request events strictly after that cursor; deduplicate by stream and sequence.
Gap | Buffer rather than invent missing events; fetch replay or a fresh snapshot.
Projection | Apply only newer aggregate revisions and publish immutable state.
Renderer | Display the projection without authorizing work or owning another timeline.
```

An unsupported state-changing event must pause without acknowledgment and request resync or upgrade. A received HTTP response and an applied durable event are separate facts; retries depend on receipts, not whether a button looked pressed.

## Implementation status

**In progress**, independently of this documentation task. No `packages/client-core` implementation exists in the atlas base `606cba2`. This site does not claim replay vectors, import negatives or Swift replay have passed. The implementation worker must update this page and the atlas with its own committed proof when it lands.

## Verification and proof

The [task breakdown](repo:docs/task-breakdown.md) assigns replay convergence and forbidden imports to U01a.B03. [R07 and R21](repo:docs/technical-spec.md) own semantics. Expected proof includes DOM-free vectors and rejection of type-only, dynamic and re-export leaks from React, Hono, Drizzle, provider and transport code. A specification is not that proof.

Next: [portable contracts](contracts.md), [repository ownership](repository.md), and [verification gates](verification.md).
