# Documentation is part of implementation

## What it is

A living two-track field guide: product/user documentation and build/production internals. This static site and its atlas grow with the code, not in a later catch-up project.

## What it does

The build renders authored Markdown to ordinary HTML, checks internal links and required feature structure, and rejects stale atlas mirrors, invalid statuses, undocumented package/script roots or incomplete milestone coverage. Every current and future public capability needs a discoverable explanation and driver reference.

## Why it exists

Agents can parallelize implementation only when people can understand what landed, its purpose, its boundaries and its proof. A generated status badge is not enough. Keeping explanation with the change prevents documentation from promising behavior that the code does not support.

## How it works

```flow
Implementation worker | Add the test and feature-map entry, then implement, explain and visualize the feature in the same change.
Committed candidate | Link exact code, tests and red/green evidence; update availability without claiming a milestone early.
Independent documentation worker | Read the actual committed implementation and receipts, then check clarity, navigation, diagrams and both audience tracks.
Landing review | Require that independent assessment and applicable runtime/documentation gates. No later backfill promise.
```

Parallel means the documentation reviewer can inspect a committed candidate while other bounded tasks progress. It does not mean a reviewer invents status from an uncommitted summary. The implementer remains responsible for the same-change page and visual. The independent worker returns factual or explanatory defects before landing.

## Implementation status

**In progress at this build snapshot.** The initial site backfills only repository bootstrap and portable contracts, once. It records client-core work as active, not complete. Future work must extend this site alongside implementation. This documentation surface is not an Agora runtime feature or foundation qualification.

## Verification and proof

Run `pnpm docs:test`, `pnpm docs:check`, and `pnpm docs:build`. Review browser output at 390x844 and 1440x900, keyboard focus, meaningful link labels, semantic headings, readable diagrams and reduced motion. Record screenshots, observed assertions and limits under `evidence/docs/<task>/`. No script can prove that prose matches behavior; independent source review is mandatory.

## Add a feature

1. Create `docs/site/<feature>.md`, register it in `site.json` under the appropriate track with `kind: feature`, and link it from related pages.
2. Use all six literal headings below, each followed by a substantive paragraph. “TBD” is not an explanation. Keep status scope narrower than product release status when needed.
3. Add a `flow` fenced block with at least two `Title | Explanation` lines. This becomes an ordered, screen-reader-readable visual. Explain forks and authority boundaries in prose; do not hide semantics in color.
4. Document new public tools and flags in `cli.md` or a dedicated reference linked there. Extend package/script inventory and `agora/feature-map.json` with the same change.
5. Add literal tests and retained red/green proof before claiming implementation. Link source with `repo:path/to/file` and site pages with `page.md#heading`.

Required headings:

```text
## What it is
## What it does
## Why it exists
## How it works
## Implementation status
## Verification and proof
```

Example visual source:

```text
Input | Describe the real caller and selected data.
Decision | Explain the enforced boundary, not model confidence.
Result | State the observable effect and proof.
```

Place those lines inside a fence labelled `flow`. Prefer a diagram of real mechanics over a decorative icon.

## Update status once

`docs/site/atlas.json` is the **only progress-data owner**. It owns snapshot date/revision, feature statuses and proof links, system nodes/edges, and all 22 milestone outcomes. `atlas.md` owns explanatory framing. The site render and generated `progress.md` companion derive from the same JSON. Never edit the generated companion manually.

1. Inspect the committed code, tests and receipts first. Set the snapshot revision to the commit actually inspected.
2. Change a feature status only at its documented scope. Built requires committed code, test and evidence links at that snapshot; independent review must judge their content.
3. Keep milestones unqualified until all tasks and integration proof pass. The initial “In progress” docs status intentionally describes the artifact's own build snapshot.
4. Run `pnpm docs:atlas`, then `pnpm docs:build`. The build rejects divergent mirrors and missing/duplicate milestones.

Built, In progress, Planned, Deferred and Not started are the closed status vocabulary. Adding a stage or milestone starts with the authoritative plan, not a silent atlas-only entry.

## Content and deployment ownership

`site.json` owns sidebar groups and inventory homes. Markdown owns prose. `style.css` owns project-local presentation; system fonts and no browser runtime keep output portable. `build.mjs`, `render.mjs` and `validate.mjs` own the pipeline. `serve.mjs` is a local convenience only.

The Design Handoff integration reads the independently owned `docs/design-handoff/` packet; the complete linked landing page follows the initial site shell. Review shareability before adding source links: explicit repository source views are included in production output. Never publish raw private research, credentials, or machine-specific archive locations.

Current fixture/public tools and role prerequisites live in [the development runbook](repo:docs/runbooks/development.md); [verify-agora](repo:.agents/skills/verify-agora/SKILL.md) owns literal Doctor, Drive and Cleanup. Design/handoff validators check document structure, their companion test scripts prove rejection, and the red-green recorder preserves exact revisions. None qualify production readiness. Restart the development server after changing its JavaScript modules; content-only edits rebuild on page requests.
