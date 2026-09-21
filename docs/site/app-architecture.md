# Application architecture boundaries

## What it is

The first mechanical slice of Agora's application architecture: Feature, Entrypoint, Timeline Card, Client, and Host ownership enforced through the existing ESLint boundary owner rather than a second lint framework. It extends package import rules to `.ts` and `.tsx`, reserves `apps/web` owners, and adds renderer foot-gun checks plus a structured architecture-exception file.

## What it does

`agora/import-boundary` rejects renderer imports of storage, domain implementation, server packages, `pg`, Hono and Drizzle, blocks framework/client/host from importing product Features, requires Feature-to-Feature and Feature-to-framework edges to use public `index.ts` entrypoints, keeps portable client-core free of application code, and rejects relative imports that leave `apps/web/src` (so `apps/web/test` or `apps/web/lib` relocation cannot bypass the renderer). `agora/renderer-footgun` allows raw React effect imports (including string-literal import names such as `import { 'useEffect' as ue }`) and default/namespace React surfaces only under `apps/web/src/framework`, treats unresolved browser capabilities from TypeScript's `lib.dom.d.ts` as Host/framework-only value references (ambient `declare` shadows do not hide them), denies DOM-node mutation including computed literal keys and all-mutator unions such as `'append' | 'prepend'` while allowing ordinary writers such as `URLSearchParams.append`, and forbids `dangerouslySetInnerHTML`, bare `@ts-ignore` and inline ESLint disables. `linterOptions.noInlineConfig` owns disable suppression so a comment cannot silence Agora rules. Diagnostics name the supported owner or path. Guarded roots cover `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs` and `.cjs` under packages/contracts/apps src trees and the entire `apps/web/**` tree, including contracts plain JS/CJS with import-boundary diagnostics rather than type-info loader crashes. `pnpm typecheck` includes `apps/web/tsconfig.json` and excludes `apps/web` from the root program so the DOM-aware lane is the only lane that compiles web sources. Exceptions live only in `agora/architecture-exceptions.json` with exact path, symbol (including scoped packages, relative targets and `dynamic-import`), guard, rationale, owner, independent approver, expiry and compensating test; the committed file is validated when ESLint loads.

## Why it exists

Unsafe renderer shortcuts must fail in lint and tests, not in prose review. Reserved owners keep later Client/Host and Feature discovery slices from inventing a parallel policy. Widening the owner table is a test-visible architecture-policy change.

## How it works

```flow
Authoring | Write Feature, Client, Host or framework code under its reserved apps/web owner.
Lint | ESLint runs agora/import-boundary and agora/renderer-footgun on .ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs under guarded roots.
Diagnostic | A rejection names the supported owner or public entrypoint, not only a rule id.
Exception | Only a reviewed agora/architecture-exceptions.json row can allow a named path and symbol.
Proof | packages/client-core/test/app-architecture.test.ts keeps positive, negative and guard-weakening fixtures.
```

This slice does not implement Client/Host runtime, Feature discovery, product UI, Pretext or browser-shell migration. Reserved owner entrypoint stubs under `apps/web/src/{framework,client,host,features}` exist so lint paths resolve; extension and adversarial fixtures are generated at test runtime and are not product Features.

## Implementation status

**Built for boundary lint only.** Owner folders and public entrypoint stubs are reserved. No product Feature behavior, Entrypoint/Timeline Card discovery or Host adapters ship here. Reconcile living docs with the separate architecture-documentation branch when it lands R25 prose.

## Verification and proof

Inspect [boundary policy](repo:scripts/boundary-policy.ts), [renderer policy](repo:scripts/renderer-policy.ts), [exception validator](repo:scripts/architecture-exceptions.ts), [fixtures](repo:packages/client-core/test/app-architecture.test.ts) and [exceptions file](repo:agora/architecture-exceptions.json). Run `pnpm boundaries` and `pnpm lint`. Retained receipts live under `evidence/U20/agora-s1-lint-application-architecture/`.

Next: [system architecture](architecture.md), [client synchronization](synchronization.md), and [development runbook](repo:docs/runbooks/development.md).
