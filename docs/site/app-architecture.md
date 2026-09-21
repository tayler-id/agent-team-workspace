# Application architecture boundaries

## What it is

The first mechanical slice of Agora's application architecture: Feature, Entrypoint, Timeline Card, Client, and Host ownership enforced through the existing ESLint boundary owner rather than a second lint framework. It extends package import rules to `.ts` and `.tsx`, reserves `apps/web` owners, and adds renderer foot-gun checks plus a structured architecture-exception file.

## What it does

`agora/import-boundary` rejects renderer imports of storage, domain implementation, server packages, `pg`, Hono and Drizzle, blocks framework/client/host from importing product Features, requires Feature-to-Feature and Feature-to-framework edges to use public `index.ts` entrypoints, and keeps portable client-core free of application code. `agora/renderer-footgun` allows raw `useEffect` families only under `apps/web/src/framework`, browser globals and durable storage only under Host/framework adapters, and forbids `dangerouslySetInnerHTML`, inline Agora rule disables and bare `@ts-ignore`. Diagnostics name the supported owner or path. Exceptions live only in `agora/architecture-exceptions.json` with exact path, symbol, guard, rationale, owner, independent approver, expiry and compensating test.

## Why it exists

Unsafe renderer shortcuts must fail in lint and tests, not in prose review. Reserved owners keep later Client/Host and Feature discovery slices from inventing a parallel policy. Widening the owner table is a test-visible architecture-policy change.

## How it works

```flow
Authoring | Write Feature, Client, Host or framework code under its reserved apps/web owner.
Lint | ESLint runs agora/import-boundary and agora/renderer-footgun on .ts and .tsx.
Diagnostic | A rejection names the supported owner or public entrypoint, not only a rule id.
Exception | Only a reviewed agora/architecture-exceptions.json row can allow a named path and symbol.
Proof | packages/client-core/test/app-architecture.test.ts keeps positive, negative and guard-weakening fixtures.
```

This slice does not implement Client/Host runtime, Feature discovery, product UI, Pretext or browser-shell migration. Fixture files under `apps/web/src/features/*` exist so lint paths resolve; they are not product Features.

## Implementation status

**Built for boundary lint only.** Owner folders and public entrypoint stubs are reserved. No product Feature behavior, Entrypoint/Timeline Card discovery or Host adapters ship here. Reconcile living docs with the separate architecture-documentation branch when it lands R25 prose.

## Verification and proof

Inspect [boundary policy](repo:scripts/boundary-policy.ts), [renderer policy](repo:scripts/renderer-policy.ts), [exception validator](repo:scripts/architecture-exceptions.ts), [fixtures](repo:packages/client-core/test/app-architecture.test.ts) and [exceptions file](repo:agora/architecture-exceptions.json). Run `pnpm boundaries` and `pnpm lint`. Retained receipts live under `evidence/U20/agora-s1-lint-application-architecture/`.

Next: [system architecture](architecture.md), [client synchronization](synchronization.md), and [development runbook](repo:docs/runbooks/development.md).
