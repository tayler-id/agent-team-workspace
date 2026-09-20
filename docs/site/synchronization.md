# Client synchronization isolation

## What it is

U01a.B03 separates a framework-free client core from rendering and enforces mechanical import boundaries. It was active at the seeded atlas revision `606cba2`; fixture-only implementation subsequently landed during this documentation change.

## What it does

The core owns deeply immutable snapshots, event deduplication, cursor replay, revision ordering, unread state, drafts and command decisions. `initialState` and `synchronize` are public exports of `@agora/client-core`. A fixture adapter validates neutral wire inputs outside that package; a future React renderer will display its snapshots.

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

An unsupported state-changing event preserves the projection, pauses without acknowledgment and requests upgrade. Gaps buffer at most 1,000 out-of-order entries before requesting a fresh snapshot; acknowledgments cover only the applied contiguous prefix. Decimal revisions compare beyond JavaScript Number precision.

A command receipt settles a known command without advancing the timeline. Retry preserves the original ID/digest, respects denial and rate limits, and refreshes stale state. Unread counts visible message creation positions after explicit last-seen state, not edits or run-card events. Drafts stay unsent through snapshot changes; logout/revocation inputs clear private state.

## Implementation status

**Built after the atlas snapshot, fixture only.** The atlas deliberately retains its requested task-base status of In progress. The newer committed core and TypeScript/Swift replay proof are linked below, separately from that historical snapshot. Import/public-type guards and a no-DOM/no-Node compilation lane enforce current package boundaries. There is no browser transport, React UI, production room schema, authentication or core service route. U01a and the full foundation remain unqualified.

## Verification and proof

Inspect the [implementation](repo:packages/client-core/src/index.ts), [public synchronization assertions](repo:packages/client-core/test/sync.test.ts), [literal cross-language vectors](repo:contracts/fixtures/replay.json), [precise guard negatives](repo:packages/client-core/test/guards.test.ts), and [boundary tests](repo:packages/client-core/test/boundaries.test.ts). The source-owned [feature explanation](repo:docs/features/client-synchronization.md) and [retained core/boundary review](repo:evidence/U01a/agora-s1-isolate-client-core/3-boundaries/review.md) delimit the newer claim. [R07 and R21](repo:docs/technical-spec.md) still own semantics.

Run `pnpm client:replay -- --json --swift`, `pnpm boundaries` and `pnpm check`. The replay driver compares six literal TypeScript and independent Swift outcomes. Boundary fixtures reject forbidden static, type-only, dynamic and re-export edges and transitive public-type leaks. Missing Swift is unavailable, not a passing test.

Next: [portable contracts](contracts.md), [repository ownership](repository.md), and [verification gates](verification.md).
