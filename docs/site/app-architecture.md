# Application architecture boundaries

## What it is

Agora's application architecture mechanical boundaries: Feature, Client, Host and framework **import ownership** and **renderer foot-guns** enforced through the existing ESLint boundary owner rather than a second lint framework. B1 extends package import rules across guarded source extensions and reserves `apps/web` owners. B2a adds a structured **architecture-exception registry**, the only way to let a named path import a named symbol past a guard. B2b adds renderer foot-gun checks on top of that registry. B3 closes five bypasses an independent re-review found in B2b's checks and one false positive.

## What it does

`agora/import-boundary` rejects renderer imports of storage, domain implementation, server packages, `pg`, Hono and Drizzle, blocks every non-Feature importer (framework/client/host and un-owned `apps/web/src` folders) from importing product Features, requires Feature-to-Feature and Feature-or-other-to-framework/client/host edges to use public `index.ts` entrypoints so a two-hop relay through `apps/web/src/util` cannot bypass owners, keeps portable client-core free of application code, and rejects relative imports that leave `apps/web/src` (so `apps/web/test` or `apps/web/lib` relocation cannot bypass owner rules). It also scans every comment for a JSDoc `@type {import('mod').X}` edge, so a `.js`/`.mjs`/`.cjs` file with no `TSImportType` AST node cannot smuggle a forbidden module past the guard in a type-position comment. `agora/renderer-footgun` allows raw React effect imports (including string-literal import names such as `import { 'useEffect' as ue }`) and default/namespace React surfaces only under `apps/web/src/framework`, while a default/namespace import of the compiler-emitted `react/jsx-runtime` or `react/jsx-dev-runtime` (no effect surface) is allowed everywhere. It treats unresolved browser capabilities from TypeScript's `lib.dom.d.ts` as Host/framework-only value references (ambient `declare` shadows do not hide them), denies DOM-node mutation including computed literal keys and mutator unions such as `'append' | 'prepend'` and `'remove' | 'normalize'` while allowing ordinary writers such as `URLSearchParams.append`, denies the `setAttribute`/`removeAttribute`(`NS`)/`toggleAttribute`/`insertAdjacentText` method family the same receiver-aware way, and denies `innerHTML`/`outerHTML`/`textContent`/`style` property **assignment** on a DOM host plus any property assignment on a `CSSStyleDeclaration` receiver (`el.style.color = x`). Every receiver check also re-checks the pre-cast expression through `as`/`<T>`/`!`/`satisfies`, so wrapping a real DOM element in an unrelated type cannot hide a mutation from the checker. In a `.mjs`/`.cjs` file under `tseslint.configs.disableTypeChecked` (no type checker at all), every named mutator — ambiguous or exclusive — is trusted by name, closing the gap where an ambiguous mutator previously went unchecked for lack of type information. It also forbids `dangerouslySetInnerHTML`, bare `@ts-ignore` and inline ESLint disables. Diagnostics name the supported owner or path. Guarded roots cover `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs` and `.cjs` under packages/contracts/apps src trees and the entire `apps/web/**` tree, including contracts plain JS/CJS. `linterOptions.noInlineConfig` owns disable suppression so a comment cannot silence Agora rules. `pnpm typecheck` includes `apps/web/tsconfig.json` and excludes `apps/web` from the root program so the DOM-aware lane is the only lane that compiles web sources. Exceptions live only in `agora/architecture-exceptions.json`. A row names one exact file path, one exact symbol (a package, a relative target, an ambient global name or `dynamic-import`), one guard (`agora/import-boundary` or `agora/renderer-footgun`), a rationale, an owner, a different approver, a `YYYY-MM-DD` expiry and an existing compensating test. Wildcards, directories, expired rows, unknown guards and self-approval are rejected, and ESLint refuses to load at all while the committed file is invalid. A row covers every literal import form of its symbol on its path and nothing else.

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
Hardening | B3 reproduces each reported bypass through the public CLI first, then closes it: JSDoc import() comments, DOM property/setAttribute mutation, untyped .mjs/.cjs mutators and cast evasion, while allowing the react/jsx-runtime namespace.
```

These slices do not implement Client/Host runtime, Feature discovery, product UI, Pretext or browser-shell migration. Owner paths are reserved in policy constants; extension and adversarial fixtures are generated at test runtime. The committed exception file is empty; the live-rule fixture writes rows into it and restores it byte for byte.

## Implementation status

**Built for import-boundary ownership (B1), the exception registry (B2a), renderer foot-guns (B2b) and the B3 bypass-closing pass.** No product Feature behavior ships here; B3 also relocated two DOM writes from `apps/web/src/main.tsx` into the Host adapter (`renderMountError`) that the newly-checked property-assignment rule correctly flagged, with no change to the rendered output.

## Verification and proof

Inspect [boundary policy](repo:scripts/boundary-policy.ts), [renderer policy](repo:scripts/renderer-policy.ts), [exception validator](repo:scripts/architecture-exceptions.ts), [exceptions file](repo:agora/architecture-exceptions.json) and [fixtures](repo:packages/client-core/test/app-architecture.test.ts). Run `pnpm boundaries` and `pnpm lint`. B1 receipts live under `evidence/U20/agora-s1-lint-application-architecture/`; B2a receipts under its `b2a-exceptions/` folder; B2b receipts under its `b2b-renderer/` folder; B3 receipts under its `b3-hardening/` folder.

Next: [client state boundary](client-state-boundary.md), [system architecture](architecture.md), [client synchronization](synchronization.md), [development runbook](repo:docs/runbooks/development.md), and [the full R25 Feature/Client/Host specification these boundaries enforce](agora-application-architecture.md), including the migration units still ahead.
