# Application architecture boundaries

## What it is

The first landable mechanical slice of Agora's application architecture: Feature, Client, Host and framework **import ownership** enforced through the existing ESLint boundary owner rather than a second lint framework. It extends package import rules across guarded source extensions and reserves `apps/web` owners. Renderer foot-guns and structured architecture exceptions land in the follow-up B2 slice.

## What it does

`agora/import-boundary` rejects renderer imports of storage, domain implementation, server packages, `pg`, Hono and Drizzle, blocks framework/client/host from importing product Features, requires Feature-to-Feature and Feature-to-framework edges to use public `index.ts` entrypoints, keeps portable client-core free of application code, and rejects relative imports that leave `apps/web/src` (so `apps/web/test` or `apps/web/lib` relocation cannot bypass owner rules). Diagnostics name the supported owner or path. Guarded roots cover `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs` and `.cjs` under packages/contracts/apps src trees and the entire `apps/web/**` tree, including contracts plain JS/CJS. `linterOptions.noInlineConfig` owns disable suppression so a comment cannot silence Agora import rules. `pnpm typecheck` includes `apps/web/tsconfig.json` and excludes `apps/web` from the root program so the DOM-aware lane is the only lane that compiles web sources.

## Why it exists

Unsafe Feature/Client/Host import shortcuts must fail in lint and tests, not in prose review. Reserved owners keep later Client/Host and Feature discovery slices from inventing a parallel policy. Widening the owner table is a test-visible architecture-policy change.

## How it works

```flow
Authoring | Write Feature, Client, Host or framework code under its reserved apps/web owner.
Lint | ESLint runs agora/import-boundary on .ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs under guarded roots.
Diagnostic | A rejection names the supported owner or public entrypoint, not only a rule id.
Proof | packages/client-core/test/app-architecture.test.ts keeps positive, negative and guard-weakening fixtures.
```

This B1 slice does not implement renderer foot-guns, architecture exceptions, Client/Host runtime, Feature discovery, product UI, Pretext or browser-shell migration. Owner paths are reserved in policy constants; extension and adversarial fixtures are generated at test runtime.

## Implementation status

**Built for import-boundary ownership only.** Renderer foot-gun and exception rows follow in B2. No product Feature behavior ships here.

## Verification and proof

Inspect [boundary policy](repo:scripts/boundary-policy.ts) and [fixtures](repo:packages/client-core/test/app-architecture.test.ts). Run `pnpm boundaries` and `pnpm lint`. Retained receipts live under `evidence/U20/agora-s1-lint-application-architecture/`.

Next: [system architecture](architecture.md), [client synchronization](synchronization.md), and [development runbook](repo:docs/runbooks/development.md).
