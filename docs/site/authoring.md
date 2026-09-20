# Documentation is part of implementation

## What it is

A project-owned static field guide with two explicit audience tracks and one progress-data owner. The first change supplies this engine, guards and truthful shell; the next supplies the complete user and production-internals corpus.

## What it does

Build ordinary HTML with local CSS, validate links and feature explanations/visuals, require feature-map documentation homes, and reject invalid statuses, missing milestone outcomes or a drifting Markdown atlas mirror.

## Why it exists

Parallel implementation must remain understandable. A status badge or task summary cannot replace an explanation of what exists, why it exists, how it works and which committed evidence proves it.

## How it works

```flow
Implementation worker | Write the test and feature mapping first; implement, document and visualize in the same change.
Committed candidate | Link exact code, tests and receipts. Do not qualify an unfinished milestone.
Independent documentation worker | Inspect committed code and evidence; review both tracks, navigation, factual scope and explanatory quality.
Landing review | Require that independent review and affected runtime/docs gates before landing, never a later catch-up promise.
```

## Implementation status

In progress at this artifact's snapshot. Documentation checks are not full Agora verification. The initial corpus backfills only the two already-landed foundation tasks; every future feature documents itself alongside implementation.

## Verification and proof

`pnpm docs:test` proves intended guard failures, including precise isolated guard weakening. `pnpm docs:validate` checks sources; `pnpm docs:build` also validates generated links. Inspect browser output at 390x844 and 1440x900, keyboard focus, accessible labels and reduced motion. Keep receipts under `evidence/docs/<task>/`; an independent reviewer must judge Built claims against actual source and tests.

## Authoring contract

Register a page in `docs/site/site.json` with `kind: feature`. Include these literal substantive sections: **What it is**, **What it does**, **Why it exists**, **How it works**, **Implementation status**, **Verification and proof**. Add a fence labelled `flow` with at least two lines of `Title | Explanation`. It becomes an ordered accessible visual, not a decorative badge.

Every feature-map entry must name its page in `documentation`. Every current package/root script needs a home in `site.json`. Register new public drivers and their flags, output, availability and authority in the reference as they land. Site links use `page.md#heading`; repository links use `repo:path/to/file`.

## One status owner

Edit only `docs/site/atlas.json` for snapshot date/revision, statuses, proof links, diagram nodes/edges and milestones. Run `pnpm docs:atlas` to regenerate `progress.md`; never edit that generated file. Built requires code, tests and evidence committed at the stated snapshot; independent review checks their meaning. Use only Built, In progress, Planned, Deferred and Not started. All 22 outcomes and stages must match the authoritative plan, while qualification stays separate from task completion.

## Commands and ownership

| Command | Purpose |
| --- | --- |
| `pnpm docs:dev` | Loopback development server; `DOCS_PORT` defaults to 4173; Ctrl+C cleanup |
| `pnpm docs:build` | Validated self-contained `.docs-dist/`; deploy only that directory under any static-host subpath |
| `pnpm docs:validate` / `pnpm docs:test` | Source consistency / assertion and guard-weakening proofs |
| `pnpm docs:atlas` | Regenerate the companion from its owner |
| `pnpm docs:check` | Markdown, design, handoff and site gates |

`site.json` owns navigation/inventory, Markdown owns prose, `style.css` owns presentation. `build.mjs`, `render.mjs`, `diagram.mjs`, `output-links.mjs` and `validate.mjs` own the build; `serve.mjs` is development convenience. Page edits rebuild on requests; restart the dev server after editing its JavaScript modules. There are no browser scripts, external fonts or hosted dependencies. Explicit source views are published with the site: never link private reports or secrets. Machine-specific home paths are redacted, not a substitute for disclosure review.

## Current tool homes

```inventory
```

The PostgreSQL wrapper launches only a disposable socket-only cluster. `probe-center.mjs` checks public responses; `require-test-postgres.ts` blocks missing prerequisites. The recorder captures red/green at exact revisions. Design and handoff validators check document structure, their test scripts prove rejection, and none qualify runtime readiness. [Development](repo:docs/runbooks/development.md) and [verify-agora](repo:.agents/skills/verify-agora/SKILL.md) supply literal current fixture and contract instructions. The future `agora project` and worker CLIs are not implemented.
