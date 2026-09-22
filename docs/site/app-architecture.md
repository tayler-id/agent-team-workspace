# Application architecture boundaries

## What it is

Agora's application architecture mechanical boundaries: Feature, Client, Host and framework **import ownership** and **renderer foot-guns** enforced through the existing ESLint boundary owner rather than a second lint framework. B1 extends package import rules across guarded source extensions and reserves `apps/web` owners. B2a adds a structured **architecture-exception registry**, the only way to let a named path import a named symbol past a guard. B2b adds renderer foot-gun checks on top of that registry.

## What it does

`agora/import-boundary` rejects renderer imports of storage, domain implementation, server packages, `pg`, Hono and Drizzle, blocks every non-Feature importer (framework/client/host and un-owned `apps/web/src` folders) from importing product Features, requires Feature-to-Feature and Feature-or-other-to-framework/client/host edges to use public `index.ts` entrypoints so a two-hop relay through `apps/web/src/util` cannot bypass owners, keeps portable client-core free of application code, and rejects relative imports that leave `apps/web/src` (so `apps/web/test` or `apps/web/lib` relocation cannot bypass owner rules). `agora/renderer-footgun` allows raw React effect imports (including string-literal import names such as `import { 'useEffect' as ue }`) and default/namespace React surfaces only under `apps/web/src/framework`, treats unresolved browser capabilities from TypeScript's `lib.dom.d.ts` as Host/framework-only value references (ambient `declare` shadows do not hide them), denies DOM-node mutation including computed literal keys and mutator unions such as `'append' | 'prepend'` and `'remove' | 'normalize'` while allowing ordinary writers such as `URLSearchParams.append`, and forbids `dangerouslySetInnerHTML`, bare `@ts-ignore` and inline ESLint disables. Diagnostics name the supported owner or path. Guarded roots cover `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs` and `.cjs` under packages/contracts/apps src trees and the entire `apps/web/**` tree, including contracts plain JS/CJS. `linterOptions.noInlineConfig` owns disable suppression so a comment cannot silence Agora rules. `pnpm typecheck` includes `apps/web/tsconfig.json` and excludes `apps/web` from the root program so the DOM-aware lane is the only lane that compiles web sources. Exceptions live only in `agora/architecture-exceptions.json`. A row names one exact file path, one exact symbol (a package, a relative target, an ambient global name or `dynamic-import`), one guard (`agora/import-boundary` or `agora/renderer-footgun`), a rationale, an owner, a different approver, a `YYYY-MM-DD` expiry and an existing compensating test. Wildcards, directories, expired rows, unknown guards and self-approval are rejected, and ESLint refuses to load at all while the committed file is invalid. A row covers every literal import form of its symbol on its path and nothing else.

## Why it exists

Unsafe renderer and import shortcuts must fail in lint and tests, not in prose review. Reserved owners keep later Client/Host and Feature discovery slices from inventing a parallel policy. Widening the owner table is a test-visible architecture-policy change.

## How it works

```flow
Authoring | Write Feature, Client, Host or framework code under its reserved apps/web owner.
Load | eslint.config.js validates agora/architecture-exceptions.json before any rule runs and fails closed on a bad row.
Lint | ESLint runs agora/import-boundary and agora/renderer-footgun on .ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs under guarded roots.
Diagnostic | A rejection names the supported owner or public entrypoint, not only a rule id.
Exception | Only a reviewed agora/architecture-exceptions.json row can allow a named path and symbol.
Proof | packages/client-core/test/app-architecture.test.ts keeps positive, negative and guard-weakening fixtures.
```

These slices do not implement Client/Host runtime, Feature discovery, product UI, Pretext or browser-shell migration. Owner paths are reserved in policy constants; extension and adversarial fixtures are generated at test runtime. The committed exception file is empty; the live-rule fixture writes rows into it and restores it byte for byte.

## Implementation status

**Built for import-boundary ownership (B1), the exception registry (B2a) and renderer foot-guns (B2b).** No product Feature behavior ships here.

## Verification and proof

Inspect [boundary policy](repo:scripts/boundary-policy.ts), [renderer policy](repo:scripts/renderer-policy.ts), [exception validator](repo:scripts/architecture-exceptions.ts), [exceptions file](repo:agora/architecture-exceptions.json) and [fixtures](repo:packages/client-core/test/app-architecture.test.ts). Run `pnpm boundaries` and `pnpm lint`. B1 receipts live under `evidence/U20/agora-s1-lint-application-architecture/`; B2a receipts under its `b2a-exceptions/` folder; B2b receipts under its `b2b-renderer/` folder.

Next: [system architecture](architecture.md), [client synchronization](synchronization.md), and [development runbook](repo:docs/runbooks/development.md).
